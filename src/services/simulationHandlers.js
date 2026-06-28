/**
 * Simulation Handlers：自动模拟动作适配层
 *
 * handler 只负责三件事：
 * 1. 把 ExecutionEngine 的 action 转成业务动作服务入参；
 * 2. 应用业务动作服务返回的对象更新；
 * 3. 返回模拟执行结果。
 *
 * 业务创建、策略执行、状态推进和路径规划闭环必须在 businessActionService 中完成。
 */

import * as businessActionService from "./businessActionService.js";
import { createSimulationTimeContext, resolveRuntimeNow, resolveSimulationTimestamp } from "../domain/timeContext.js";

let simulationBusinessSequence = 0;

function nextSimulationBusinessId(prefix, context = {}) {
  simulationBusinessSequence += 1;
  const tick = String((context.globalTick || 0) + 1).padStart(4, "0");
  return `${prefix}-SIM-${tick}-${String(simulationBusinessSequence).padStart(4, "0")}`;
}

function getSimulationAudit(context, { created = false, completed = false } = {}) {
  const simulationTime = context?.tickContext?.current_time;
  if (!context?.simulationRunId || !simulationTime) return {};
  const audit = {
    record_source: "SIMULATION",
    simulation_run_id: context.simulationRunId,
    simulation_updated_at: simulationTime,
    simulation_global_tick: (Number(context.tickContext?.global_tick ?? context.globalTick) || 0) + 1,
  };
  if (created) audit.simulation_created_at = simulationTime;
  if (completed) audit.simulation_completed_at = simulationTime;
  return audit;
}

function createRuntime(context) {
  const timeContext = createSimulationTimeContext({
    simulationRunId: context?.simulationRunId,
    simulationTimelineId: context?.simulationTimelineId,
    tickContext: context?.tickContext,
    globalTick: context?.globalTick,
  });
  return {
    nextId: (prefix) => nextSimulationBusinessId(prefix, context),
    timeContext,
    now: () => resolveRuntimeNow(timeContext),
    simulationTime: () => resolveSimulationTimestamp(timeContext),
    randomSeed: () => `${context?.simulationRunId || "SIM"}-${context?.globalTick || 0}-${context?.actionIndex || 0}`,
    audit: (options = {}) => getSimulationAudit(context, options),
  };
}

function createState(data) {
  return {
    data: data.data || {},
    demandSimulationEngine: data.demandSimulationEngine,
    demandSimulationRuns: data.demandSimulationRuns || [],
    serviceOrders: data.serviceOrders || [],
    trips: data.trips || [],
    readinessTasks: data.readinessTasks || [],
    deploymentTasks: data.deploymentTasks || [],
    routeExecutions: data.routeExecutions || [],
    routes: data.routes || data.data?.routes || [],
    routePlanningRuns: data.routePlanningRuns || [],
    robotaxis: data.robotaxis || data.data?.robotaxis || [],
    pricingStrategyRuns: data.pricingStrategyRuns || [],
    pricingDecisions: data.pricingDecisions || [],
    orderMatchingRuns: data.orderMatchingRuns || [],
    orderMatchingDecisions: data.orderMatchingDecisions || [],
    taskEventLogs: data.taskEventLogs || [],
    timedOperations: data.timedOperations || [],
  };
}

function applyBusinessResult(result, data) {
  const updates = result?.updates || {};
  const setters = {
    demandSimulationRuns: data.setDemandSimulationRuns,
    serviceOrders: data.setServiceOrders,
    trips: data.setTrips,
    readinessTasks: data.setReadinessTasks,
    deploymentTasks: data.setDeploymentTasks,
    routeExecutions: data.setRouteExecutions,
    routes: data.setRoutes,
    routePlanningRuns: data.setRoutePlanningRuns,
    robotaxis: data.setRobotaxis,
    pricingStrategyRuns: data.setPricingStrategyRuns,
    pricingDecisions: data.setPricingDecisions,
    orderMatchingRuns: data.setOrderMatchingRuns,
    orderMatchingDecisions: data.setOrderMatchingDecisions,
    taskEventLogs: data.setTaskEventLogs,
    timedOperations: data.setTimedOperations,
  };
  Object.entries(updates).forEach(([key, value]) => {
    if (typeof setters[key] === "function") setters[key](() => value);
  });
}

function runBusinessAction(action, data, context) {
  const result = action({ state: createState(data), runtime: createRuntime(context) });
  applyBusinessResult(result, data);
  return {
    success: result.success,
    resultType: result.resultType,
    message: result.message,
    data: result.data,
  };
}

export function handleServiceOrderCreate({ data, context }) {
  return runBusinessAction((params) => businessActionService.createServiceOrder(params), data, context);
}

export function handlePricingExecute({ objectId, data, context }) {
  return runBusinessAction((params) => businessActionService.executePricing({ ...params, objectId }), data, context);
}

export function handleRobotaxiCall({ objectId, data, context }) {
  return runBusinessAction((params) => businessActionService.callRobotaxi({ ...params, objectId }), data, context);
}

export function handleOrderMatchingExecute({ objectId, data, context }) {
  return runBusinessAction((params) => businessActionService.executeOrderMatching({ ...params, objectId }), data, context);
}

export function handleTripStepExecute({ objectId, data, context }) {
  return runBusinessAction((params) => businessActionService.advanceTrip({ ...params, objectId }), data, context);
}

export function handleSettlementExecute({ objectId, data, context }) {
  return runBusinessAction((params) => businessActionService.settleServiceOrder({ ...params, objectId }), data, context);
}

export function handlePaymentExecute({ objectId, data, context }) {
  return runBusinessAction((params) => businessActionService.payServiceOrder({ ...params, objectId }), data, context);
}

export function handleReadinessTaskCreate({ data, context }) {
  return runBusinessAction((params) => businessActionService.createReadinessTask(params), data, context);
}

export function handleReadinessTaskAssign({ objectId, data, context }) {
  return runBusinessAction((params) => businessActionService.assignReadinessTask({ ...params, objectId }), data, context);
}

export function handleReadinessTaskStart({ objectId, data, context }) {
  return runBusinessAction((params) => businessActionService.startReadinessTask({ ...params, objectId }), data, context);
}

export function handleReadinessTaskPass({ objectId, data, context }) {
  return runBusinessAction((params) => businessActionService.passReadinessTask({ ...params, objectId }), data, context);
}

export function handleDeploymentTaskCreate({ data, context }) {
  return runBusinessAction((params) => businessActionService.createDeploymentTask(params), data, context);
}

export function handleRoutePlan({ objectId, data, context }) {
  const objectType = context?.action?.objectType === "trip" ? "trip" : "routeExecution";
  return runBusinessAction((params) => businessActionService.executeRoutePlanning({ ...params, objectType, objectId }), data, context);
}

export function handleRouteExecutionStep({ objectId, data, context }) {
  return runBusinessAction((params) => businessActionService.advanceRouteExecution({ ...params, objectId }), data, context);
}

export function handleArrivalConfirm({ objectId, data, context }) {
  return runBusinessAction((params) => businessActionService.confirmRouteExecutionArrival({ ...params, objectId }), data, context);
}
