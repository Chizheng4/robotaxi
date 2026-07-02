import { TimedOperationStatus, TimedOperationType } from "../domain/timedOperationTypes.js";

export const simulationRuntimeObjectContracts = {
  serviceOrders: {
    idField: "service_order_id",
    statusField: "order_status",
    terminalStatuses: new Set(["CANCELLED", "COMPLETED", "FAILED", "MATCH_FAILED", "MATCHING_FAILED", "PAYMENT_FAILED"]),
    participatesInWorkflowScan: true,
  },
  trips: {
    idField: "trip_id",
    statusField: "trip_status",
    terminalStatuses: new Set(["COMPLETED", "FAILED", "CANCELLED"]),
    participatesInWorkflowScan: true,
  },
  readinessTasks: {
    idField: "task_id",
    statusField: "task_status",
    terminalStatuses: new Set(["COMPLETED", "FAILED", "CANCELLED"]),
    participatesInWorkflowScan: true,
  },
  deploymentTasks: {
    idField: "task_id",
    statusField: "task_status",
    terminalStatuses: new Set(["COMPLETED", "FAILED", "CANCELLED"]),
    participatesInWorkflowScan: true,
  },
  routeExecutions: {
    idField: "route_execution_id",
    statusField: "execution_status",
    terminalStatuses: new Set(["COMPLETED", "FAILED", "CANCELLED"]),
    participatesInWorkflowScan: true,
    includeInWorkflowScan: (item) => !item?.task_type || item.task_type === "DEPLOYMENT" || Boolean(item.deployment_task_id),
  },
};

const timedOperationTerminalStatuses = new Set([
  TimedOperationStatus.COMPLETED,
  TimedOperationStatus.FAILED,
  TimedOperationStatus.CANCELLED,
]);

export function createSimulationRuntimeScope({ simulationRun, businessData = {}, tickContext = null, includeTravelProgress = false } = {}) {
  const runId = simulationRun?.simulation_run_id;
  const activeTimedOperations = filterActiveTimedOperations(businessData.timedOperations || [], runId);
  return {
    runId,
    workflowScope: createWorkflowScope(runId, businessData),
    activeTimedOperations,
    timedOperationCandidates: selectTimedOperationAdvanceCandidates(activeTimedOperations, {
      currentSeconds: tickContext?.current_simulation_seconds ?? simulationRun?.current_simulation_seconds,
      includeTravelProgress,
    }),
  };
}

export function countActiveWorkflowObjects(workflowScope = {}) {
  return Object.values(workflowScope || {}).reduce((total, items) => total + ((items || []).length), 0);
}

export function createWorkflowScope(runId, businessData = {}) {
  return Object.fromEntries(Object.entries(simulationRuntimeObjectContracts)
    .filter(([, contract]) => contract.participatesInWorkflowScan)
    .map(([collectionKey, contract]) => [
    collectionKey,
    filterActiveBusinessObjects(businessData[collectionKey] || [], runId, contract),
  ]));
}

export function filterActiveBusinessObjects(items = [], runId, contract) {
  return (items || []).filter((item) => isCurrentRunObject(item, runId) && isActiveBusinessObject(item, contract));
}

export function filterActiveTimedOperations(timedOperations = [], runId) {
  return (timedOperations || []).filter((operation) =>
    isCurrentRunObject(operation, runId) && !timedOperationTerminalStatuses.has(operation.operation_status)
  );
}

export function selectTimedOperationAdvanceCandidates(timedOperations = [], { currentSeconds = 0, includeTravelProgress = false } = {}) {
  const normalizedCurrentSeconds = Number(currentSeconds) || 0;
  return (timedOperations || []).filter((operation) =>
    shouldAdvanceTimedOperation(operation, normalizedCurrentSeconds, includeTravelProgress)
  );
}

export function shouldAdvanceTimedOperation(operation, currentSeconds = 0, includeTravelProgress = false) {
  if (!operation || timedOperationTerminalStatuses.has(operation.operation_status)) return false;
  const plannedCompletedSeconds = Number(operation.planned_completed_seconds);
  const startSeconds = Number(operation.start_seconds) || 0;
  const nextAttemptSeconds = Number(operation.operation_payload?.next_attempt_seconds);
  const isDue = Number.isFinite(plannedCompletedSeconds) && plannedCompletedSeconds <= currentSeconds;
  const isAutoAssignmentAttemptDue = operation.operation_type === TimedOperationType.ORDER_AUTO_ASSIGNMENT
    && Number.isFinite(nextAttemptSeconds)
    && nextAttemptSeconds <= currentSeconds;
  const shouldMarkRunning = operation.operation_status === TimedOperationStatus.PENDING && startSeconds <= currentSeconds;
  const shouldRefreshTravel = includeTravelProgress && operation.operation_type === TimedOperationType.TRAVEL;
  return isDue || isAutoAssignmentAttemptDue || shouldMarkRunning || shouldRefreshTravel;
}

export function mergeTimedOperationUpdates(allTimedOperations = [], scopedTimedOperations = []) {
  if (!scopedTimedOperations.length) return allTimedOperations;
  const scopedById = new Map(scopedTimedOperations.map((operation) => [operation.timed_operation_id, operation]));
  return (allTimedOperations || []).map((operation) => scopedById.get(operation.timed_operation_id) || operation);
}

export function getSimulationRuntimeScopeDiagnostics({ simulationRun, businessData = {} } = {}) {
  const scope = createSimulationRuntimeScope({ simulationRun, businessData });
  return {
    simulation_run_id: scope.runId,
    active_service_orders: scope.workflowScope.serviceOrders.length,
    active_trips: scope.workflowScope.trips.length,
    active_readiness_tasks: scope.workflowScope.readinessTasks.length,
    active_deployment_tasks: scope.workflowScope.deploymentTasks.length,
    active_route_executions: scope.workflowScope.routeExecutions.length,
    active_workflow_objects: countActiveWorkflowObjects(scope.workflowScope),
    active_timed_operations: scope.activeTimedOperations.length,
    timed_operation_candidates: scope.timedOperationCandidates.length,
  };
}

function isCurrentRunObject(item, runId) {
  return Boolean(runId) && item?.simulation_run_id === runId;
}

function isActiveBusinessObject(item, contract) {
  if (!item || !contract) return false;
  if (typeof contract.includeInWorkflowScan === "function" && !contract.includeInWorkflowScan(item)) return false;
  return !contract.terminalStatuses.has(item[contract.statusField]);
}
