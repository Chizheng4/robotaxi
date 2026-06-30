import assert from "node:assert/strict";

import { completeTick } from "../src/data/simulationEngine.js";
import { executeTick } from "../src/data/simulationLoop.js";
import {
  createSimulationRuntimeScope,
  filterActiveTimedOperations,
  mergeTimedOperationUpdates,
} from "../src/data/simulationRuntimeScope.js";
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

const activeScope = createSimulationRuntimeScope({
  simulationRun: createRun(120),
  businessData: {
    serviceOrders: [
      { service_order_id: "SO-HISTORY", simulation_run_id: "SIM-RUN-HISTORY", order_status: "WAITING_PRICE_ESTIMATE" },
      { service_order_id: "SO-DONE", simulation_run_id: "SIM-RUN-V033", order_status: "COMPLETED" },
      { service_order_id: "SO-ACTIVE", simulation_run_id: "SIM-RUN-V033", order_status: "WAITING_PRICE_ESTIMATE" },
    ],
    trips: [
      { trip_id: "TRIP-HISTORY", simulation_run_id: "SIM-RUN-HISTORY", trip_status: "WAITING_ROUTE" },
      { trip_id: "TRIP-ACTIVE", simulation_run_id: "SIM-RUN-V033", trip_status: "WAITING_ROUTE" },
    ],
    readinessTasks: [
      { task_id: "RC-HISTORY", simulation_run_id: "SIM-RUN-HISTORY", task_status: "WAITING_ASSIGNMENT" },
      { task_id: "RC-ACTIVE", simulation_run_id: "SIM-RUN-V033", task_status: "WAITING_ASSIGNMENT" },
    ],
    deploymentTasks: [
      { task_id: "DP-DONE", simulation_run_id: "SIM-RUN-V033", task_status: "COMPLETED" },
      { task_id: "DP-ACTIVE", simulation_run_id: "SIM-RUN-V033", task_status: "WAITING_ROUTE" },
    ],
    routeExecutions: [
      { route_execution_id: "RE-HISTORY", simulation_run_id: "SIM-RUN-HISTORY", execution_status: "WAITING_ROUTE" },
      { route_execution_id: "RE-ACTIVE", simulation_run_id: "SIM-RUN-V033", execution_status: "WAITING_ROUTE" },
    ],
    timedOperations: [
      { timed_operation_id: "TOP-HISTORY", simulation_run_id: "SIM-RUN-HISTORY", operation_status: "RUNNING" },
      { timed_operation_id: "TOP-DONE", simulation_run_id: "SIM-RUN-V033", operation_status: "COMPLETED" },
      { timed_operation_id: "TOP-ACTIVE", simulation_run_id: "SIM-RUN-V033", operation_status: "RUNNING" },
    ],
  },
});
assert.deepEqual(activeScope.workflowScope.serviceOrders.map((item) => item.service_order_id), ["SO-ACTIVE"], "当前运行只扫描当前运行的非终态服务订单");
assert.deepEqual(activeScope.workflowScope.trips.map((item) => item.trip_id), ["TRIP-ACTIVE"], "当前运行只扫描当前运行的非终态履约记录");
assert.deepEqual(activeScope.workflowScope.readinessTasks.map((item) => item.task_id), ["RC-ACTIVE"], "当前运行只扫描当前运行的非终态准入任务");
assert.deepEqual(activeScope.workflowScope.deploymentTasks.map((item) => item.task_id), ["DP-ACTIVE"], "当前运行只扫描当前运行的非终态投放任务");
assert.deepEqual(activeScope.workflowScope.routeExecutions.map((item) => item.route_execution_id), ["RE-ACTIVE"], "当前运行只扫描当前运行的非终态行驶记录");
assert.deepEqual(activeScope.activeTimedOperations.map((item) => item.timed_operation_id), ["TOP-ACTIVE"], "当前运行只推进当前运行的非终态时间作业");

const activeTimedOperations = filterActiveTimedOperations([
  completedOperation,
  {
    ...createTimedOperation({
      timedOperationId: "TOP-V035-ACTIVE",
      timeMode: "SIMULATION",
      operationType: "GENERIC_ACTION",
      objectType: "serviceOrder",
      objectId: "SO-V035",
      actionType: "ORDER_MATCHING_EXECUTE",
      startSeconds: 100,
      durationSeconds: 10,
      simulationRunId: "SIM-RUN-V033",
    }),
    simulation_run_id: "SIM-RUN-V033",
  },
], "SIM-RUN-V033");
const advancedActiveTimedOperations = advanceTimedOperations({
  timedOperations: activeTimedOperations,
  timeContext: { current_simulation_seconds: 110, current_time: "Day 1 00:01:50" },
});
const mergedTimedOperations = mergeTimedOperationUpdates([completedOperation, ...activeTimedOperations], advancedActiveTimedOperations.timedOperations);
assert.equal(advancedActiveTimedOperations.dueOperations[0].timed_operation_id, "TOP-V035-ACTIVE", "当前运行到期时间作业仍应按模拟秒准确触发");
assert.equal(mergedTimedOperations[0], completedOperation, "历史终态时间作业不应被重写");
assert.equal(mergedTimedOperations[1].operation_status, "COMPLETED", "活跃时间作业完成后必须合并回完整业务数据");

const tickScopeRun = createRun(0);
let observedWorkflowIds = [];
const tickResult = executeTick({
  simulationRun: tickScopeRun,
  policySnapshot: {
    ...policy,
    service_order_auto_config: { auto_pricing_enabled: true },
    default_completion_config: {},
  },
  businessData: {
    timedOperations: [],
    serviceOrders: [
      { service_order_id: "SO-HISTORY-WF", simulation_run_id: "SIM-RUN-HISTORY", order_status: "WAITING_PRICE_ESTIMATE" },
      { service_order_id: "SO-CURRENT-WF", simulation_run_id: "SIM-RUN-V033", order_status: "WAITING_PRICE_ESTIMATE" },
      { service_order_id: "SO-CURRENT-DONE", simulation_run_id: "SIM-RUN-V033", order_status: "COMPLETED" },
    ],
    trips: [],
    readinessTasks: [],
    deploymentTasks: [],
    routeExecutions: [],
    setTimedOperations: () => {},
  },
});
observedWorkflowIds = tickResult.workflowActions.map((action) => action.objectId);
assert.deepEqual(observedWorkflowIds, ["SO-CURRENT-WF"], "Tick 工作流查询不得扫描历史运行或终态业务对象");

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

console.log("v033/v035 高性能模拟运行合同验证通过");

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
