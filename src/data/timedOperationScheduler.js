import { TimedOperationStatus, TimedOperationType } from "../domain/timedOperationTypes.js";

export function advanceTimedOperations({
  timedOperations = [],
  timeContext = {},
}) {
  const currentSeconds = Number(timeContext.current_simulation_seconds ?? timeContext.simulation_seconds ?? 0);
  const dueOperations = [];
  let changed = false;
  const nextTimedOperations = timedOperations.map((operation) => {
    const next = advanceTimedOperation(operation, currentSeconds, timeContext);
    if (isNewlyCompleted(operation, next) || isAutoAssignmentAttemptDue(operation, next, currentSeconds)) dueOperations.push(next);
    if (next !== operation) changed = true;
    return next;
  });

  return {
    timedOperations: nextTimedOperations,
    dueOperations,
    summary: summarizeTimedOperations(nextTimedOperations, dueOperations),
    changed,
  };
}

function isAutoAssignmentAttemptDue(previous, next, currentSeconds) {
  if (!next || next.operation_type !== TimedOperationType.ORDER_AUTO_ASSIGNMENT) return false;
  if (![TimedOperationStatus.RUNNING, TimedOperationStatus.COMPLETED].includes(next.operation_status)) return false;
  if (previous?.operation_status === TimedOperationStatus.PENDING && next.operation_status === TimedOperationStatus.RUNNING) return true;
  if (next.operation_status === TimedOperationStatus.COMPLETED && previous?.operation_status !== TimedOperationStatus.COMPLETED) return true;
  const nextAttemptSeconds = Number(next.operation_payload?.next_attempt_seconds);
  const lastTriggeredSeconds = Number(next.operation_payload?.last_triggered_attempt_seconds);
  return Number.isFinite(nextAttemptSeconds)
    && nextAttemptSeconds <= currentSeconds
    && lastTriggeredSeconds !== nextAttemptSeconds;
}

export function advanceTimedOperation(operation, currentSeconds, timeContext = {}) {
  if (!operation || isTerminalStatus(operation.operation_status)) return operation;
  const startSeconds = Number(operation.start_seconds) || 0;
  const durationSeconds = Math.max(0, Number(operation.duration_seconds) || 0);
  const elapsedSeconds = Math.max(0, currentSeconds - startSeconds);
  const progressPercent = durationSeconds > 0
    ? Math.min(100, Number(((elapsedSeconds / durationSeconds) * 100).toFixed(2)))
    : 100;
  const completed = durationSeconds === 0 || elapsedSeconds >= durationSeconds;
  if (
    operation.operation_status === (completed ? TimedOperationStatus.COMPLETED : TimedOperationStatus.RUNNING)
    && operation.elapsed_seconds === Number(elapsedSeconds.toFixed(2))
    && operation.remaining_seconds === Number(Math.max(0, durationSeconds - elapsedSeconds).toFixed(2))
    && operation.progress_percent === progressPercent
  ) {
    return operation;
  }
  return {
    ...operation,
    operation_status: completed ? TimedOperationStatus.COMPLETED : TimedOperationStatus.RUNNING,
    elapsed_seconds: Number(elapsedSeconds.toFixed(2)),
    remaining_seconds: Number(Math.max(0, durationSeconds - elapsedSeconds).toFixed(2)),
    progress_percent: progressPercent,
    completed_at: completed ? operation.completed_at || timeContext.now || new Date().toISOString() : operation.completed_at,
    simulation_completed_at: completed ? operation.simulation_completed_at || timeContext.current_time || timeContext.simulation_timestamp || null : operation.simulation_completed_at,
  };
}

export function summarizeTimedOperations(timedOperations = [], dueOperations = []) {
  const counts = timedOperations.reduce((summary, operation) => {
    const status = operation.operation_status || "UNKNOWN";
    summary[status] = (summary[status] || 0) + 1;
    return summary;
  }, {});
  return {
    total_timed_operations: timedOperations.length,
    due_timed_operations: dueOperations.length,
    pending_timed_operations: counts[TimedOperationStatus.PENDING] || 0,
    running_timed_operations: counts[TimedOperationStatus.RUNNING] || 0,
    completed_timed_operations: counts[TimedOperationStatus.COMPLETED] || 0,
    failed_timed_operations: counts[TimedOperationStatus.FAILED] || 0,
    cancelled_timed_operations: counts[TimedOperationStatus.CANCELLED] || 0,
  };
}

function isTerminalStatus(status) {
  return [
    TimedOperationStatus.COMPLETED,
    TimedOperationStatus.FAILED,
    TimedOperationStatus.CANCELLED,
  ].includes(status);
}

function isNewlyCompleted(previous, next) {
  return previous?.operation_status !== TimedOperationStatus.COMPLETED
    && next?.operation_status === TimedOperationStatus.COMPLETED;
}
