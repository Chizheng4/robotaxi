/**
 * WorkflowEngine：工作流规则引擎
 *
 * 维护业务单据的闭环流转规则表。
 * SimulationLoop 每 Tick 查询此表，获取应触发的动作列表。
 *
 * 参考文档：doc/09-simulation-system/02-workflow-engine/
 */

import { getExecutableTransitions } from "../domain/workflowTransitionRegistry.js";

// ============================================================================
// 流转规则表
// ============================================================================

/**
 * ServiceOrder 流转规则
 * 格式：{ fromState, actionType, conditions }
 */
// ============================================================================
// 查询接口
// ============================================================================

/**
 * 查询所有匹配的流转规则
 *
 * @param {string} objectType - "serviceOrder" | "trip" | "readinessTask" | "routeExecution"
 * @param {string} currentState - 当前状态
 * @param {Object} autoConfig - service_order_auto_config 或其他配置
 * @param {Object} defaultCompletionConfig - default_completion_config
 * @returns {Object[]} 匹配的规则列表 [{ actionType, fromState }]
 */
export function queryWorkflowRules(objectType, currentState, autoConfig = {}, defaultCompletionConfig = {}) {
  const allConfig = { ...autoConfig, ...defaultCompletionConfig };

  const rules = getExecutableTransitions(objectType, currentState);

  return rules
    .filter((rule) => {
      if (!rule.condition) return true;
      return allConfig[rule.condition] === true;
    })
    .map((rule) => ({
      actionType: rule.action_type,
      fromState: rule.from_status,
      toState: rule.to_status,
      transitionDefinitionId: rule.workflow_transition_definition_id,
      transitionMode: rule.transition_mode,
    }));
}

/**
 * 批量查询所有业务对象的流转规则
 *
 * @param {Object} params
 * @param {Object[]} params.serviceOrders - 服务订单列表
 * @param {Object[]} params.trips - Trip 列表
 * @param {Object[]} params.readinessTasks - 准入任务列表
 * @param {Object[]} params.routeExecutions - 行驶记录列表
 * @param {Object} params.autoConfig - 自动化配置
 * @param {Object} params.defaultCompletionConfig - 默认完成配置
 * @returns {Object[]} 所有应触发的动作 [{ objectType, objectId, actionType, fromState }]
 */
export function queryAllWorkflowRules({
  serviceOrders = [],
  trips = [],
  readinessTasks = [],
  deploymentTasks = [],
  routeExecutions = [],
  autoConfig = {},
  defaultCompletionConfig = {},
}) {
  const actions = [];

  for (const order of serviceOrders) {
    const rules = queryWorkflowRules("serviceOrder", order.order_status, autoConfig, defaultCompletionConfig);
    for (const rule of rules) {
      if (isWaitingForTimedRetry(order, rule.actionType)) continue;
      actions.push({ objectType: "serviceOrder", objectId: order.service_order_id, actionType: rule.actionType, fromState: rule.fromState });
    }
  }

  for (const trip of trips) {
    const rules = queryWorkflowRules("trip", trip.trip_status, autoConfig, defaultCompletionConfig);
    for (const rule of rules) {
      if (isTimedOperationManagedAction("trip", rule.actionType)) continue;
      actions.push({ objectType: "trip", objectId: trip.trip_id, actionType: rule.actionType, fromState: rule.fromState });
    }
  }

  for (const task of readinessTasks) {
    const rules = queryWorkflowRules("readinessTask", task.task_status, autoConfig, defaultCompletionConfig);
    for (const rule of rules) {
      if (isTimedOperationManagedAction("readinessTask", rule.actionType)) continue;
      actions.push({ objectType: "readinessTask", objectId: task.task_id, actionType: rule.actionType, fromState: rule.fromState });
    }
  }

  for (const dt of deploymentTasks) {
    const rules = queryWorkflowRules("deploymentTask", dt.task_status, autoConfig, defaultCompletionConfig);
    for (const rule of rules) {
      if (isTimedOperationManagedAction("deploymentTask", rule.actionType)) continue;
      actions.push({ objectType: "deploymentTask", objectId: dt.task_id, actionType: rule.actionType, fromState: rule.fromState });
    }
  }

  for (const exec of routeExecutions) {
    const rules = queryWorkflowRules("routeExecution", exec.execution_status, autoConfig, defaultCompletionConfig);
    for (const rule of rules) {
      if (isTimedOperationManagedAction("routeExecution", rule.actionType)) continue;
      actions.push({ objectType: "routeExecution", objectId: exec.route_execution_id, actionType: rule.actionType, fromState: rule.fromState });
    }
  }

  return actions;
}

function isWaitingForTimedRetry(order, actionType) {
  return actionType === "ORDER_MATCHING_EXECUTE" && order?.matching_retry_pending === true;
}

function isTimedOperationManagedAction(objectType, actionType) {
  if (objectType === "readinessTask") return actionType === "READINESS_TASK_PASS";
  if (objectType === "deploymentTask") return actionType === "ARRIVAL_CONFIRM";
  if (objectType === "routeExecution") return ["ROUTE_EXECUTION_STEP", "ARRIVAL_CONFIRM"].includes(actionType);
  if (objectType === "trip") return actionType === "TRIP_STEP_EXECUTE";
  return false;
}
