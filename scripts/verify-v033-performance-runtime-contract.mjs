import assert from "node:assert/strict";

import { completeTick } from "../src/data/simulationEngine.js";
import { advanceTimedOperations } from "../src/data/timedOperationScheduler.js";
import { createTimedOperation } from "../src/domain/timedOperationTypes.js";
import { createDefaultSimulationPolicy } from "../src/domain/simulationTypes.js";
import { validateFieldDisplayContract } from "../src/domain/fieldDisplayService.js";

const policy = createDefaultSimulationPolicy();
assert.equal(policy.simulation_performance_config.event_recording_mode, "BUSINESS_AND_CHECKPOINT");
assert.equal(policy.simulation_performance_config.checkpoint_interval_seconds, 600);
assert.equal(policy.simulation_performance_config.max_events_in_memory, 2000);
assert.equal(policy.simulation_performance_config.debug_log_enabled, false);

const quietTick = completeTick(
  createRun(1),
  createTickContext(1),
  { triggered_event_count: 0, no_action_count: 2 },
  { order_count: 0 },
  [],
  {},
  {
    phase: "RUNNING",
    workflowActionCount: 0,
    performanceConfig: policy.simulation_performance_config,
  },
);
assert.equal(quietTick.events.length, 0, "高速模式下空 Tick 不应记录事件");

const checkpointTick = completeTick(
  createRun(600),
  createTickContext(600),
  { triggered_event_count: 0, no_action_count: 2 },
  { order_count: 0 },
  [],
  {},
  {
    phase: "RUNNING",
    workflowActionCount: 0,
    performanceConfig: policy.simulation_performance_config,
  },
);
assert.ok(checkpointTick.events.some((event) => event.event_type === "SIMULATION_TICK_COMPLETED"), "检查点 Tick 应记录聚合事件");

const verboseTick = completeTick(
  createRun(1),
  createTickContext(1),
  { triggered_event_count: 0, no_action_count: 2 },
  { order_count: 0 },
  [],
  {},
  {
    phase: "RUNNING",
    workflowActionCount: 0,
    performanceConfig: { event_recording_mode: "VERBOSE_TICK", checkpoint_interval_seconds: 600 },
  },
);
assert.ok(verboseTick.events.length >= 3, "详细模式保留 Tick 级诊断事件");

const completedOperation = {
  ...createTimedOperation({
    timedOperationId: "TOP-V033",
    timeMode: "SIMULATION",
    operationType: "GENERIC_ACTION",
    objectType: "serviceOrder",
    objectId: "SO-V033",
    actionType: "ORDER_MATCHING_EXECUTE",
    startSeconds: 0,
    durationSeconds: 1,
  }),
  operation_status: "COMPLETED",
  elapsed_seconds: 1,
  remaining_seconds: 0,
  progress_percent: 100,
};
const unchanged = advanceTimedOperations({
  timedOperations: [completedOperation],
  timeContext: { current_simulation_seconds: 100 },
});
assert.equal(unchanged.changed, false, "终态时间作业不应触发无意义 state 写入");
assert.equal(unchanged.timedOperations[0], completedOperation);

const displayContract = validateFieldDisplayContract({
  fields: [
    "simulation_performance_config",
    "event_recording_mode",
    "checkpoint_interval_seconds",
    "ui_snapshot_interval_seconds",
    "max_events_in_memory",
    "persistence_debounce_ms",
    "debug_log_enabled",
    "debug_log_limit",
  ],
  values: [
    { field: "event_recording_mode", value: "BUSINESS_AND_CHECKPOINT" },
    { field: "event_recording_mode", value: "VERBOSE_TICK" },
  ],
});
assert.deepEqual(displayContract.missingFields, []);
assert.deepEqual(displayContract.missingValues, []);

console.log("v033 高性能模拟运行合同验证通过");

function createRun(seconds) {
  return {
    simulation_run_id: "SIM-RUN-V033",
    simulation_status: "RUNNING",
    current_simulation_seconds: seconds,
    current_day: 1,
    current_time: `Day 1 00:${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`,
    current_day_tick: seconds,
    current_global_tick: seconds,
    current_run_tick: seconds,
    tick_seconds: 1,
    total_ticks: 86400,
    simulation_policy_snapshot: createDefaultSimulationPolicy(),
  };
}

function createTickContext(seconds) {
  return {
    current_simulation_seconds: seconds,
    current_day: 1,
    current_time: `Day 1 00:${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`,
    day_tick: seconds,
    global_tick: seconds,
    tick_seconds: 1,
  };
}
