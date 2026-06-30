import { TimedOperationStatus } from "../domain/timedOperationTypes.js";

const businessObjectContracts = {
  serviceOrders: {
    idField: "service_order_id",
    statusField: "order_status",
    terminalStatuses: new Set(["CANCELLED", "COMPLETED", "FAILED", "MATCH_FAILED", "MATCHING_FAILED", "PAYMENT_FAILED"]),
  },
  trips: {
    idField: "trip_id",
    statusField: "trip_status",
    terminalStatuses: new Set(["COMPLETED", "FAILED", "CANCELLED"]),
  },
  readinessTasks: {
    idField: "task_id",
    statusField: "task_status",
    terminalStatuses: new Set(["COMPLETED", "FAILED", "CANCELLED"]),
  },
  deploymentTasks: {
    idField: "task_id",
    statusField: "task_status",
    terminalStatuses: new Set(["COMPLETED", "FAILED", "CANCELLED"]),
  },
  routeExecutions: {
    idField: "route_execution_id",
    statusField: "execution_status",
    terminalStatuses: new Set(["COMPLETED", "FAILED", "CANCELLED"]),
  },
};

const timedOperationTerminalStatuses = new Set([
  TimedOperationStatus.COMPLETED,
  TimedOperationStatus.FAILED,
  TimedOperationStatus.CANCELLED,
]);

export function createSimulationRuntimeScope({ simulationRun, businessData = {} } = {}) {
  const runId = simulationRun?.simulation_run_id;
  return {
    runId,
    workflowScope: createWorkflowScope(runId, businessData),
    activeTimedOperations: filterActiveTimedOperations(businessData.timedOperations || [], runId),
  };
}

export function createWorkflowScope(runId, businessData = {}) {
  return Object.fromEntries(Object.entries(businessObjectContracts).map(([collectionKey, contract]) => [
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
    active_timed_operations: scope.activeTimedOperations.length,
  };
}

function isCurrentRunObject(item, runId) {
  return Boolean(runId) && item?.simulation_run_id === runId;
}

function isActiveBusinessObject(item, contract) {
  if (!item || !contract) return false;
  return !contract.terminalStatuses.has(item[contract.statusField]);
}
