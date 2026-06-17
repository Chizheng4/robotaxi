/**
 * SupplyTrigger：供给侧事件触发
 *
 * 根据模拟时间上下文和配置快照，判断是否触发供给侧业务事件。
 * 本模块只判断"是否触发"，不执行具体业务逻辑（由 ExecutionEngine 分发）。
 *
 * 参考文档：doc/08-simulation-system/01-simulation-runtime/05-supply-trigger.md
 */

import { EventSource, EventResult, EventType } from "../domain/simulationTypes.js";

/**
 * 执行供给侧触发判断
 *
 * @param {Object} params
 * @param {Object} params.timeContext - computeTimeContext 的返回值
 * @param {Object} params.policySnapshot - simulation_policy_snapshot
 * @returns {Object} 供给侧触发摘要
 */
export function runSupplyTrigger({ timeContext, policySnapshot }) {
  const config = policySnapshot.supply_trigger_config || {};
  const results = {
    readiness_trigger_result: "NOT_ENABLED",
    deployment_trigger_result: "NOT_ENABLED",
    route_execution_trigger_result: "NOT_ENABLED",
    triggered_actions: [],
    no_action_count: 0,
  };

  if (!config.supply_trigger_enabled) {
    return results;
  }

  // 1. 运营准入触发
  if (config.readiness_trigger_enabled && timeContext.is_worker_working_time) {
    results.readiness_trigger_result = "TRIGGERED";
    results.triggered_actions.push({
      action_type: "READINESS_CHECK_TRIGGER",
      trigger_condition: "worker_working_time",
    });
  } else if (config.readiness_trigger_enabled) {
    results.readiness_trigger_result = "OUTSIDE_WORKING_HOURS";
    results.no_action_count++;
  }

  // 2. 运营投放触发
  if (config.deployment_trigger_enabled && timeContext.is_robotaxi_operating_time) {
    results.deployment_trigger_result = "TRIGGERED";
    results.triggered_actions.push({
      action_type: "DEPLOYMENT_TRIGGER",
      trigger_condition: "robotaxi_operating_time",
    });
  } else if (config.deployment_trigger_enabled) {
    results.deployment_trigger_result = "OUTSIDE_OPERATING_HOURS";
    results.no_action_count++;
  }

  // 3. RouteExecution 推进触发
  if (config.route_execution_trigger_enabled) {
    results.route_execution_trigger_result = "TRIGGERED";
    results.triggered_actions.push({
      action_type: "ROUTE_EXECUTION_TRIGGER",
      trigger_condition: "always",
    });
  }

  results.triggered_event_count = results.triggered_actions.length;

  return results;
}

/**
 * 判断是否应触发准入任务创建
 */
export function shouldCreateReadinessTasks(supplyResult) {
  return supplyResult.readiness_trigger_result === "TRIGGERED";
}

/**
 * 判断是否应触发投放任务创建
 */
export function shouldCreateDeploymentTasks(supplyResult) {
  return supplyResult.deployment_trigger_result === "TRIGGERED";
}

/**
 * 判断是否应推进 RouteExecution
 */
export function shouldTriggerRouteExecution(supplyResult) {
  return supplyResult.route_execution_trigger_result === "TRIGGERED";
}
