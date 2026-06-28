import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  createTimedOperation,
  TimedOperationStatus,
  TimedOperationType,
} from "../src/domain/timedOperationTypes.js";
import { advanceTimedOperations } from "../src/data/timedOperationScheduler.js";

const operation = createTimedOperation({
  timedOperationId: "TO-VERIFY-001",
  timeMode: "SIMULATION",
  operationType: TimedOperationType.GENERIC_ACTION,
  objectType: "serviceOrder",
  objectId: "SO-VERIFY-001",
  actionType: "ORDER_MATCHING_EXECUTE",
  simulationStartedAt: "Day 1 00:00:00",
  simulationPlannedCompletedAt: "Day 1 00:00:10",
  startSeconds: 0,
  durationSeconds: 10,
});

assert.equal(operation.operation_status, TimedOperationStatus.PENDING);
assert.equal(operation.planned_completed_seconds, 10);
assert.equal(operation.progress_percent, 0);

const halfway = advanceTimedOperations({
  timedOperations: [operation],
  timeContext: {
    current_simulation_seconds: 5,
    current_time: "Day 1 00:00:05",
    now: "2026-06-28T00:00:05.000Z",
  },
});

assert.equal(halfway.timedOperations[0].operation_status, TimedOperationStatus.RUNNING);
assert.equal(halfway.timedOperations[0].elapsed_seconds, 5);
assert.equal(halfway.timedOperations[0].remaining_seconds, 5);
assert.equal(halfway.timedOperations[0].progress_percent, 50);
assert.equal(halfway.dueOperations.length, 0);

const completed = advanceTimedOperations({
  timedOperations: halfway.timedOperations,
  timeContext: {
    current_simulation_seconds: 10,
    current_time: "Day 1 00:00:10",
    now: "2026-06-28T00:00:10.000Z",
  },
});

assert.equal(completed.timedOperations[0].operation_status, TimedOperationStatus.COMPLETED);
assert.equal(completed.timedOperations[0].remaining_seconds, 0);
assert.equal(completed.timedOperations[0].progress_percent, 100);
assert.equal(completed.timedOperations[0].simulation_completed_at, "Day 1 00:00:10");
assert.equal(completed.dueOperations.length, 1);
assert.equal(completed.summary.completed_timed_operations, 1);
assert.equal(completed.summary.due_timed_operations, 1);

const schedulerSource = readFileSync(new URL("../src/data/timedOperationScheduler.js", import.meta.url), "utf8");
assert.doesNotMatch(
  schedulerSource,
  /(order_status|trip_status|task_status|execution_status)\s*:/,
  "时间作业调度器不得直接写业务对象复杂状态",
);

console.log("v032.2 时间作业调度合同验证通过");
