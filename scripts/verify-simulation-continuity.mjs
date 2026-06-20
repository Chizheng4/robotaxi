import assert from "node:assert/strict";

import { initializeDefaultSimulationPolicy } from "../src/data/simulationInitialization.js";
import { advanceTick, computeTimeContext, formatSimulationTimestamp, getSimulationPosition } from "../src/data/simulationClock.js";
import { completeTick, initSimulationRun, resetSimulationCounters, startSimulationRun } from "../src/data/simulationEngine.js";
import { executeTick } from "../src/data/simulationLoop.js";
import { handleReadinessTaskCreate, handleServiceOrderCreate } from "../src/services/simulationHandlers.js";

const policy = initializeDefaultSimulationPolicy();

assert.equal(formatSimulationTimestamp(0), "Day 1 00:00:00");
assert.equal(formatSimulationTimestamp(86399), "Day 1 23:59:59");
assert.equal(formatSimulationTimestamp(86401), "Day 2 00:00:01");

const position = getSimulationPosition(86399, 2);
const crossedMidnight = advanceTick({
  current_simulation_seconds: position.simulationSeconds,
  current_global_tick: 12,
  current_run_tick: 12,
  trigger_ticks_completed: 12,
  drain_ticks: 0,
  tick_seconds: 2,
}, { tickSeconds: 2, phase: "RUNNING" });
assert.equal(crossedMidnight.current_time, "Day 2 00:00:01");
assert.equal(crossedMidnight.current_global_tick, 13);

resetSimulationCounters();
const first = initSimulationRun({ simulationName: "连续运行 1", simulationPolicy: policy }).simulationRun;
const firstCompleted = {
  ...first,
  simulation_status: "COMPLETED",
  current_simulation_seconds: 90000,
  simulation_end_seconds: 90000,
  simulation_end_at: "Day 2 01:00:00",
  current_global_tick: 150,
};
const second = initSimulationRun({
  simulationName: "连续运行 2",
  simulationPolicy: policy,
  previousSimulationRun: firstCompleted,
}).simulationRun;
assert.equal(second.previous_simulation_run_id, first.simulation_run_id);
assert.equal(second.simulation_start_at, "Day 2 01:00:00");
assert.equal(second.current_time, "Day 2 01:00:00");
assert.equal(second.current_global_tick, 150);

const oneTickRun = initSimulationRun({
  simulationName: "单 Tick 时间验证",
  simulationPolicy: policy,
  totalDays: 1 / 144,
}).simulationRun;
const running = startSimulationRun(oneTickRun).simulationRun;
const context = computeTimeContext({
  currentSimulationSeconds: running.current_simulation_seconds,
  currentTime: running.current_time,
  currentDay: running.current_day,
  dayTick: running.current_day_tick,
  globalTick: running.current_global_tick,
  runTick: running.current_run_tick,
  tickSeconds: running.tick_seconds,
  policySnapshot: running.simulation_policy_snapshot,
});
const tickResult = completeTick(running, context, { triggered_event_count: 0, no_action_count: 0 }, { order_count: 0 }, [], {}, {
  phase: "RUNNING",
  workflowActionCount: 0,
});
const tickCompletedEvent = tickResult.events.find((event) => event.event_type === "SIMULATION_TICK_COMPLETED");
assert.equal(tickCompletedEvent.simulation_time, "Day 1 00:00:00");
assert.equal(tickResult.simulationRun.simulation_status, "DRAINING");
assert.equal(tickResult.simulationRun.simulation_end_at, null);

const drainingRun = tickResult.simulationRun;
const drainTick = executeTick({
  simulationRun: drainingRun,
  policySnapshot: drainingRun.simulation_policy_snapshot,
  businessData: {
    serviceOrders: [], trips: [], readinessTasks: [], deploymentTasks: [], routeExecutions: [],
  },
});
assert.equal(drainTick.phase, "DRAINING");
assert.equal(drainTick.supplyResult.triggered_event_count, 0);
assert.equal(drainTick.demandResult.order_count, 0);
assert.equal(drainTick.workflowActionCount, 0);

const drained = completeTick(
  drainingRun,
  drainTick.tickContext,
  drainTick.supplyResult,
  drainTick.demandResult,
  drainTick.executionResults,
  drainTick.tickEventSummary,
  { phase: drainTick.phase, workflowActionCount: drainTick.workflowActionCount },
);
assert.equal(drained.simulationRun.simulation_status, "COMPLETED");
assert.equal(drained.simulationRun.simulation_end_at, "Day 1 00:20:00");
assert.equal(drained.simulationRun.drain_ticks, 1);

const stalled = completeTick(
  { ...drainingRun, max_drain_ticks: 1 },
  drainTick.tickContext,
  drainTick.supplyResult,
  drainTick.demandResult,
  [{ success: false, actionType: "TEST_STALLED" }],
  drainTick.tickEventSummary,
  { phase: "DRAINING", workflowActionCount: 1 },
);
assert.equal(stalled.simulationRun.simulation_status, "FAILED");
assert.match(stalled.simulationRun.failure_reason, /未收敛/);

const auditContext = {
  simulationRunId: "SIM-RUN-AUDIT",
  globalTick: 17,
  tickContext: { current_time: "Day 3 12:34:56", global_tick: 17 },
};
let readinessTasks = [];
let robotaxis = [{ robotaxi_id: "RTX-AUDIT", availability_status: "PENDING_INSPECTION", current_task_id: null }];
handleReadinessTaskCreate({
  context: auditContext,
  data: {
    robotaxis,
    setReadinessTasks: (updater) => { readinessTasks = updater(readinessTasks); },
    setRobotaxis: (updater) => { robotaxis = updater(robotaxis); },
  },
});
assert.equal(readinessTasks[0].record_source, "SIMULATION");
assert.equal(readinessTasks[0].simulation_created_at, "Day 3 12:34:56");
assert.equal(readinessTasks[0].simulation_run_id, "SIM-RUN-AUDIT");
assert.equal(readinessTasks[0].simulation_global_tick, 18);

let demandRuns = [];
let serviceOrders = [];
handleServiceOrderCreate({
  context: auditContext,
  data: {
    demandSimulationEngine: {
      runDemandSimulation: () => ({
        simulation_result: "SUCCESS",
        demand_simulation_run_id: "DSR-AUDIT",
        demand_simulation_result_id: "DSR-RESULT-AUDIT",
        order_channel: "OWN_APP_SIMULATED_ORDER",
        customer_id: "C-AUDIT",
        customer_origin_location_type: "PLACE",
        customer_origin_cell_id: "CELL-1",
        pickup_service_area_id: "SA-1",
        pickup_cell_id: "CELL-1",
        dropoff_service_area_id: "SA-2",
        dropoff_cell_id: "CELL-2",
      }),
    },
    data: { demandSimulationStrategies: [{}], customers: [] },
    setDemandSimulationRuns: (updater) => { demandRuns = updater(demandRuns); },
    setServiceOrders: (updater) => { serviceOrders = updater(serviceOrders); },
  },
});
assert.equal(demandRuns[0].simulation_created_at, "Day 3 12:34:56");
assert.equal(serviceOrders[0].record_source, "SIMULATION");
assert.equal(serviceOrders[0].simulation_created_at, "Day 3 12:34:56");

console.log("连续模拟时间轴代码级验证通过");
