export const TimedOperationStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
};

export const TimedOperationType = {
  TRAVEL: "TRAVEL",
  ARRIVAL_DETECTION: "ARRIVAL_DETECTION",
  WORKER_CHECK: "WORKER_CHECK",
  ORDER_AUTO_ASSIGNMENT: "ORDER_AUTO_ASSIGNMENT",
  ORDER_MATCH_RETRY: "ORDER_MATCH_RETRY",
  ORDER_ASSIGNMENT_TIMEOUT: "ORDER_ASSIGNMENT_TIMEOUT",
  GENERIC_ACTION: "GENERIC_ACTION",
};

export function createTimedOperation({
  timedOperationId,
  simulationRunId = null,
  timeMode,
  operationType,
  objectType,
  objectId,
  actionType = null,
  startedAt = null,
  plannedCompletedAt = null,
  simulationStartedAt = null,
  simulationPlannedCompletedAt = null,
  startSeconds = 0,
  durationSeconds = 0,
  payload = null,
  createdAt = new Date().toISOString(),
}) {
  const normalizedDuration = Math.max(0, Number(durationSeconds) || 0);
  const normalizedStart = Math.max(0, Number(startSeconds) || 0);
  return {
    timed_operation_id: timedOperationId,
    simulation_run_id: simulationRunId,
    time_mode: timeMode,
    operation_type: operationType,
    operation_status: TimedOperationStatus.PENDING,
    object_type: objectType,
    object_id: objectId,
    action_type: actionType,
    started_at: startedAt,
    planned_completed_at: plannedCompletedAt,
    completed_at: null,
    simulation_started_at: simulationStartedAt,
    simulation_planned_completed_at: simulationPlannedCompletedAt,
    simulation_completed_at: null,
    start_seconds: normalizedStart,
    planned_completed_seconds: normalizedStart + normalizedDuration,
    duration_seconds: normalizedDuration,
    elapsed_seconds: 0,
    remaining_seconds: normalizedDuration,
    progress_percent: normalizedDuration > 0 ? 0 : 100,
    failure_reason: null,
    operation_payload: payload,
    created_at: createdAt,
  };
}
