import { clockTimeToSeconds, SECONDS_PER_DAY } from "../domain/simulationTime.js";
import { computeTimeContext } from "./simulationClock.js";
import { createSimulationRuntimeScope } from "./simulationRuntimeScope.js";
import { queryAllWorkflowRules } from "./simulationWorkflowEngine.js";

export function resolveIdleJumpTargetSeconds({ simulationRun, policySnapshot = {}, businessData = {} } = {}) {
  if (!simulationRun || !["RUNNING", "DRAINING"].includes(simulationRun.simulation_status)) return null;
  const currentSeconds = Math.floor(Number(simulationRun.current_simulation_seconds) || 0);
  const tickContext = computeTimeContext({
    currentSimulationSeconds: currentSeconds,
    currentTime: simulationRun.current_time,
    currentDay: simulationRun.current_day,
    dayTick: simulationRun.current_day_tick,
    globalTick: simulationRun.current_global_tick,
    runTick: simulationRun.current_run_tick,
    tickSeconds: simulationRun.tick_seconds,
    policySnapshot,
  });
  const performanceConfig = policySnapshot?.simulation_performance_config || {};
  const includeTravelProgress = isUiSnapshotSecond(currentSeconds, performanceConfig);
  const scope = createSimulationRuntimeScope({ simulationRun, businessData, tickContext, includeTravelProgress });
  if (hasImmediateWorkflowActions(scope, policySnapshot) || scope.timedOperationCandidates.length > 0) return null;

  const isDraining = simulationRun.simulation_status === "DRAINING";
  const demandSecond = isDraining ? Infinity : nextDemandTriggerSecond(policySnapshot, currentSeconds);
  const readinessSecond = isDraining ? Infinity : nextSupplyTriggerSecond(policySnapshot, currentSeconds, "readiness");
  const deploymentSecond = isDraining ? Infinity : nextSupplyTriggerSecond(policySnapshot, currentSeconds, "deployment");
  const plannedEndSeconds = Number(simulationRun.planned_simulation_end_seconds);
  if ([demandSecond, readinessSecond, deploymentSecond, plannedEndSeconds].some((value) => value === currentSeconds)) {
    return null;
  }

  const candidates = [
    nextTimedOperationSecond(scope.activeTimedOperations, currentSeconds),
    nextTravelSnapshotSecond(scope.activeTimedOperations, currentSeconds, performanceConfig),
    demandSecond,
    readinessSecond,
    deploymentSecond,
    plannedEndSeconds,
  ].filter((value) => Number.isFinite(value) && value > currentSeconds);

  if (!candidates.length) return null;
  return Math.min(...candidates);
}

function hasImmediateWorkflowActions(scope, policySnapshot = {}) {
  const actions = queryAllWorkflowRules({
    serviceOrders: scope.workflowScope.serviceOrders,
    trips: scope.workflowScope.trips,
    readinessTasks: scope.workflowScope.readinessTasks,
    deploymentTasks: scope.workflowScope.deploymentTasks,
    routeExecutions: scope.workflowScope.routeExecutions,
    autoConfig: policySnapshot.service_order_auto_config || {},
    defaultCompletionConfig: policySnapshot.default_completion_config || {},
  });
  return actions.length > 0;
}

function nextTimedOperationSecond(timedOperations = [], currentSeconds = 0) {
  return Math.min(...(timedOperations || [])
    .map((operation) => Number(operation.planned_completed_seconds))
    .filter((value) => Number.isFinite(value) && value > currentSeconds));
}

function nextTravelSnapshotSecond(timedOperations = [], currentSeconds = 0, performanceConfig = {}) {
  const hasTravelOperation = (timedOperations || []).some((operation) => operation?.operation_type === "TRAVEL");
  if (!hasTravelOperation) return Infinity;
  const interval = Math.max(1, Number(performanceConfig.ui_snapshot_interval_seconds) || 30);
  return currentSeconds + (interval - (currentSeconds % interval || interval));
}

function nextDemandTriggerSecond(policySnapshot = {}, currentSeconds = 0) {
  const config = policySnapshot.demand_generation_config || {};
  if (!config.demand_generation_enabled) return Infinity;
  const interval = Math.max(1, Math.floor(Number(config.demand_generation_interval_seconds) || 600));
  return nextIntervalSecond(currentSeconds, interval, 0);
}

function nextSupplyTriggerSecond(policySnapshot = {}, currentSeconds = 0, type) {
  const config = policySnapshot.supply_trigger_config || {};
  if (!config.supply_trigger_enabled) return Infinity;
  if (type === "readiness" && !config.readiness_trigger_enabled) return Infinity;
  if (type === "deployment" && !config.deployment_trigger_enabled) return Infinity;

  const interval = Math.max(1, Math.floor(Number(
    type === "readiness"
      ? config.readiness_trigger_interval_seconds
      : config.deployment_trigger_interval_seconds
  ) || 600));
  const workerStart = policySnapshot.worker_work_start_time || "00:00:00";
  const workerEnd = policySnapshot.worker_work_end_time || "24:00:00";
  if (type === "readiness") {
    return nextWindowIntervalSecond(currentSeconds, interval, workerStart, workerEnd);
  }
  const robotaxiStart = policySnapshot.robotaxi_operating_start_time || "00:00:00";
  const robotaxiEnd = policySnapshot.robotaxi_operating_end_time || "24:00:00";
  const start = Math.max(clockTimeToSeconds(workerStart), clockTimeToSeconds(robotaxiStart));
  const end = Math.min(clockTimeToSeconds(workerEnd), clockTimeToSeconds(robotaxiEnd));
  return nextWindowIntervalSecond(currentSeconds, interval, secondsToClock(start), secondsToClock(end));
}

function nextWindowIntervalSecond(currentSeconds, intervalSeconds, startTime, endTime) {
  const dayBase = Math.floor(currentSeconds / SECONDS_PER_DAY) * SECONDS_PER_DAY;
  const secondsOfDay = positiveModulo(currentSeconds, SECONDS_PER_DAY);
  const start = clockTimeToSeconds(startTime || "00:00:00");
  const end = clockTimeToSeconds(endTime || "24:00:00");
  const candidateOfDay = secondsOfDay <= start
    ? start
    : start + Math.ceil((secondsOfDay - start) / intervalSeconds) * intervalSeconds;
  if (candidateOfDay < end) return dayBase + candidateOfDay;
  return dayBase + SECONDS_PER_DAY + start;
}

function nextIntervalSecond(currentSeconds, intervalSeconds, offsetSeconds = 0) {
  const offset = Number(offsetSeconds) || 0;
  if (currentSeconds <= offset) return offset;
  return offset + Math.ceil((currentSeconds - offset) / intervalSeconds) * intervalSeconds;
}

function isUiSnapshotSecond(currentSeconds = 0, performanceConfig = {}) {
  const interval = Math.max(1, Number(performanceConfig.ui_snapshot_interval_seconds) || 30);
  return currentSeconds % interval === 0;
}

function secondsToClock(seconds) {
  if (seconds >= SECONDS_PER_DAY) return "24:00:00";
  const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function positiveModulo(value, modulo) {
  return ((value % modulo) + modulo) % modulo;
}
