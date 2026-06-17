/**
 * WorkflowEngine：工作流规则引擎
 *
 * 维护业务单据的闭环流转规则表。
 * SimulationLoop 每 Tick 查询此表，获取应触发的动作列表。
 *
 * 参考文档：doc/08-simulation-system/02-workflow-engine/
 */

import {
  ServiceOrderStatus as SO,
} from "../domain/serviceOrderTypes.js";

import {
  TripStatus as T,
} from "../domain/tripTypes.js";

import {
  ReadinessTaskStatus as RT,
  DeploymentTaskStatus as DT,
  RouteExecutionStatus as RE,
} from "../domain/taskTypes.js";

// ============================================================================
// 流转规则表
// ============================================================================

/**
 * ServiceOrder 流转规则
 * 格式：{ fromState, actionType, conditions }
 */
const SERVICE_ORDER_RULES = [
  { fromState: SO.WAITING_PRICE_ESTIMATE, actionType: "PRICING_EXECUTE", condition: "auto_pricing_enabled" },
  { fromState: SO.CREATED, actionType: "PRICING_EXECUTE", condition: "auto_pricing_enabled" },
  { fromState: SO.WAITING_ROBOTAXI_CALL, actionType: "ROBOTAXI_CALL", condition: null },
  { fromState: SO.WAITING_ROBOTAXI_ASSIGNMENT, actionType: "ORDER_MATCHING_EXECUTE", condition: "auto_order_matching_enabled" },
  { fromState: SO.ROBOTAXI_ASSIGNMENT_FAILED, actionType: "ORDER_MATCHING_EXECUTE", condition: "auto_order_matching_enabled" },
  { fromState: SO.VEHICLE_ASSIGNED, actionType: "TRIP_STEP_EXECUTE", condition: "auto_trip_creation_enabled" },
  { fromState: SO.ARRIVED_DESTINATION, actionType: "SETTLEMENT_EXECUTE", condition: null },
  { fromState: SO.SETTLING, actionType: "PAYMENT_EXECUTE", condition: "auto_payment_enabled" },
  { fromState: SO.WAITING_PAYMENT, actionType: "PAYMENT_EXECUTE", condition: "auto_payment_enabled" },
];

/**
 * Trip 流转规则
 */
const TRIP_RULES = [
  { fromState: T.WAITING_ROUTE, actionType: "TRIP_STEP_EXECUTE", condition: "auto_trip_progress_enabled" },
  { fromState: T.PENDING, actionType: "TRIP_STEP_EXECUTE", condition: "auto_trip_progress_enabled" },
  { fromState: T.ASSIGNED, actionType: "TRIP_STEP_EXECUTE", condition: "auto_trip_progress_enabled" },
  { fromState: T.ON_THE_WAY_PICKUP, actionType: "TRIP_STEP_EXECUTE", condition: "auto_trip_progress_enabled" },
  { fromState: T.ARRIVED_PICKUP, actionType: "TRIP_STEP_EXECUTE", condition: "auto_trip_progress_enabled" },
  { fromState: T.WAITING_CUSTOMER_BOARDING, actionType: "TRIP_STEP_EXECUTE", condition: "auto_trip_progress_enabled" },
  { fromState: T.CUSTOMER_ONBOARD, actionType: "TRIP_STEP_EXECUTE", condition: "auto_trip_progress_enabled" },
  { fromState: T.PASSENGER_ONBOARD, actionType: "TRIP_STEP_EXECUTE", condition: "auto_trip_progress_enabled" },
  { fromState: T.ON_THE_WAY_DESTINATION, actionType: "TRIP_STEP_EXECUTE", condition: "auto_trip_progress_enabled" },
];

/**
 * ReadinessTask 流转规则
 */
const READINESS_TASK_RULES = [
  { fromState: RT.WAITING_ASSIGNMENT, actionType: "READINESS_TASK_ASSIGN", condition: null },
  { fromState: RT.WAITING_CHECK, actionType: "READINESS_TASK_START", condition: null },
  { fromState: RT.CHECKING, actionType: "READINESS_TASK_PASS", condition: "default_readiness_passed" },
];

/**
 * DeploymentTask / RouteExecution 流转规则
 */
const ROUTE_EXECUTION_RULES = [
  { fromState: RE.WAITING_ROUTE, actionType: "ROUTE_PLAN", condition: null },
  { fromState: RE.MOVING, actionType: "ROUTE_EXECUTION_STEP", condition: null },
  { fromState: RE.ARRIVED, actionType: "ARRIVAL_CONFIRM", condition: "default_deployment_arrival_normal" },
];

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

  let rules;
  switch (objectType) {
    case "serviceOrder":
      rules = SERVICE_ORDER_RULES;
      break;
    case "trip":
      rules = TRIP_RULES;
      break;
    case "readinessTask":
      rules = READINESS_TASK_RULES;
      break;
    case "routeExecution":
      rules = ROUTE_EXECUTION_RULES;
      break;
    default:
      return [];
  }

  return rules
    .filter((rule) => rule.fromState === currentState)
    .filter((rule) => {
      if (!rule.condition) return true;
      return allConfig[rule.condition] === true;
    });
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
  routeExecutions = [],
  autoConfig = {},
  defaultCompletionConfig = {},
}) {
  const actions = [];

  for (const order of serviceOrders) {
    const rules = queryWorkflowRules("serviceOrder", order.order_status, autoConfig, defaultCompletionConfig);
    for (const rule of rules) {
      actions.push({ objectType: "serviceOrder", objectId: order.service_order_id, actionType: rule.actionType, fromState: rule.fromState });
    }
  }

  for (const trip of trips) {
    const rules = queryWorkflowRules("trip", trip.trip_status, autoConfig, defaultCompletionConfig);
    for (const rule of rules) {
      actions.push({ objectType: "trip", objectId: trip.trip_id, actionType: rule.actionType, fromState: rule.fromState });
    }
  }

  for (const task of readinessTasks) {
    const rules = queryWorkflowRules("readinessTask", task.task_status, autoConfig, defaultCompletionConfig);
    for (const rule of rules) {
      actions.push({ objectType: "readinessTask", objectId: task.task_id, actionType: rule.actionType, fromState: rule.fromState });
    }
  }

  for (const exec of routeExecutions) {
    const rules = queryWorkflowRules("routeExecution", exec.execution_status, autoConfig, defaultCompletionConfig);
    for (const rule of rules) {
      actions.push({ objectType: "routeExecution", objectId: exec.route_execution_id, actionType: rule.actionType, fromState: rule.fromState });
    }
  }

  return actions;
}
