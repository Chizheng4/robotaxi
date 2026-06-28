/**
 * SupplyTrigger：供给侧点火
 *
 * 根据模拟时间上下文和配置快照，判断是否点火创建准入任务和投放任务。
 * 本模块只产出 Action，不执行具体业务逻辑（由 ExecutionEngine 分发）。
 * RouteExecution 推进不属于 SupplyTrigger 范围，由 WorkflowEngine 负责。
 *
 * 参考文档：doc/08-simulation-system/01-simulation-runtime/05-supply-trigger.md
 */

/**
 * 执行供给侧点火判断
 *
 * @param {Object} params
 * @param {Object} params.timeContext - computeTimeContext 的返回值
 * @param {Object} params.policySnapshot - simulation_policy_snapshot
 * @returns {Object} 供给侧点火结果 { actions, triggered_event_count, no_action_count, readiness_triggered, deployment_triggered }
 */
export function runSupplyTrigger({ timeContext, policySnapshot }) {
  const config = policySnapshot.supply_trigger_config || {};
  const actions = [];
  let noActionCount = 0;
  let readinessTriggered = false;
  let deploymentTriggered = false;

  if (!config.supply_trigger_enabled) {
    return { actions, triggered_event_count: 0, no_action_count: 0, readiness_triggered: false, deployment_triggered: false };
  }

  // 1. 运营准入点火
  if (config.readiness_trigger_enabled
    && timeContext.is_worker_working_time
    && isTriggerSecond(timeContext.current_simulation_seconds, config.readiness_trigger_interval_seconds ?? 600)) {
    actions.push({ actionType: "READINESS_TASK_CREATE", objectId: null, triggeredBy: "SUPPLY_TRIGGER" });
    readinessTriggered = true;
  } else if (config.readiness_trigger_enabled) {
    noActionCount++;
  }

  // 2. 运营投放点火
  if (config.deployment_trigger_enabled
    && timeContext.is_worker_working_time
    && timeContext.is_robotaxi_operating_time
    && isTriggerSecond(timeContext.current_simulation_seconds, config.deployment_trigger_interval_seconds ?? 600)) {
    actions.push({ actionType: "DEPLOYMENT_TASK_CREATE", objectId: null, triggeredBy: "SUPPLY_TRIGGER" });
    deploymentTriggered = true;
  } else if (config.deployment_trigger_enabled) {
    noActionCount++;
  }

  return {
    actions,
    triggered_event_count: actions.length,
    no_action_count: noActionCount,
    readiness_triggered: readinessTriggered,
    deployment_triggered: deploymentTriggered,
  };
}

function isTriggerSecond(currentSeconds, intervalSeconds) {
  const interval = Math.max(1, Math.floor(Number(intervalSeconds) || 600));
  const seconds = Math.floor(Number(currentSeconds) || 0);
  return seconds % interval === 0;
}
