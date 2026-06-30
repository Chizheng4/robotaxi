export const TERMINAL_TIMED_OPERATION_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
export const ACTIVE_SIMULATION_RUN_STATUSES = new Set(["RUNNING", "DRAINING", "PAUSED"]);

export function clearEndedTimedOperations(timedOperations = []) {
  return (timedOperations || []).filter((operation) => !TERMINAL_TIMED_OPERATION_STATUSES.has(operation?.operation_status));
}

export function pruneSuccessfulTimedOperationsForRun(timedOperations = [], simulationRunId) {
  return (timedOperations || []).filter((operation) => {
    if (!simulationRunId || operation?.simulation_run_id !== simulationRunId) return true;
    return operation?.operation_status !== "COMPLETED";
  });
}

export function canClearAllTimedOperations(simulationRuns = []) {
  return !(simulationRuns || []).some((run) => ACTIVE_SIMULATION_RUN_STATUSES.has(run?.simulation_status));
}

export function getActiveSimulationRunForTimedOperationClear(simulationRuns = []) {
  return (simulationRuns || []).find((run) => ACTIVE_SIMULATION_RUN_STATUSES.has(run?.simulation_status)) || null;
}

export function filterTimedOperationsByObjectType(timedOperations = [], objectType = null) {
  if (!objectType) return timedOperations || [];
  return (timedOperations || []).filter((operation) => operation?.object_type === objectType);
}

export function getTimedOperationObjectTypeOptions(timedOperations = []) {
  return [...new Set((timedOperations || []).map((operation) => operation?.object_type).filter(Boolean))];
}
