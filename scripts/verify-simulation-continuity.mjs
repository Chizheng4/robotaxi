import assert from "node:assert/strict";

import { initializeDefaultSimulationPolicy } from "../src/data/simulationInitialization.js";
import { advanceTick, computeTimeContext, formatSimulationTimestamp, getSimulationPosition } from "../src/data/simulationClock.js";
import { completeTick, initSimulationRun, resetSimulationCounters, startSimulationRun, synchronizeSimulationCounters } from "../src/data/simulationEngine.js";
import { executeTick } from "../src/data/simulationLoop.js";
import { handleDeploymentTaskCreate, handlePaymentExecute, handleReadinessTaskCreate, handleServiceOrderCreate, handleTripStepExecute } from "../src/services/simulationHandlers.js";
import { registerActionHandlers } from "../src/data/simulationExecutionEngine.js";
import * as serviceOrderService from "../src/services/serviceOrderService.js";

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
assert.equal(second.simulation_start_seconds, first.planned_simulation_end_seconds);
assert.equal(second.simulation_start_at, "Day 2 00:00:00");
assert.equal(second.current_time, "Day 2 00:00:00");
assert.equal(second.current_global_tick, 86400);

const legacyCompleted = {
  ...firstCompleted,
  planned_simulation_end_seconds: undefined,
};
const legacySecond = initSimulationRun({
  simulationName: "连续运行兼容",
  simulationPolicy: policy,
  previousSimulationRun: legacyCompleted,
}).simulationRun;
assert.equal(legacySecond.simulation_start_at, "Day 2 01:00:00");

resetSimulationCounters();
const windowRun = initSimulationRun({ simulationName: "窗口连续运行 1", simulationPolicy: policy }).simulationRun;
const drainedAfterWindow = {
  ...windowRun,
  simulation_status: "COMPLETED",
  current_simulation_seconds: windowRun.planned_simulation_end_seconds + 30,
  simulation_end_seconds: windowRun.planned_simulation_end_seconds + 30,
  simulation_end_at: formatSimulationTimestamp(windowRun.planned_simulation_end_seconds + 30),
  current_global_tick: windowRun.planned_simulation_end_seconds + 30,
};
const nextWindowRun = initSimulationRun({
  simulationName: "窗口连续运行 2",
  simulationPolicy: policy,
  previousSimulationRun: drainedAfterWindow,
}).simulationRun;
assert.equal(nextWindowRun.previous_simulation_run_id, windowRun.simulation_run_id);
assert.equal(nextWindowRun.simulation_start_seconds, windowRun.planned_simulation_end_seconds);
assert.equal(nextWindowRun.simulation_start_at, windowRun.planned_simulation_end_at);
assert.equal(nextWindowRun.current_global_tick, Math.floor(windowRun.planned_simulation_end_seconds / nextWindowRun.tick_seconds));
assert.notEqual(nextWindowRun.simulation_start_seconds, drainedAfterWindow.simulation_end_seconds);

const oneTickRun = initSimulationRun({
  simulationName: "单 Tick 时间验证",
  simulationPolicy: policy,
  totalDays: 1 / 86400,
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
assert.equal(drained.simulationRun.simulation_end_at, "Day 1 00:00:02");
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
assert.ok(readinessTasks[0].created_at);
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
assert.ok(serviceOrders[0].created_at);
assert.equal(serviceOrders[0].record_source, "SIMULATION");
assert.equal(serviceOrders[0].simulation_created_at, "Day 3 12:34:56");

let deploymentTasks = [];
let routeExecutions = [];
let deploymentRobotaxis = [{ robotaxi_id: "RTX-DEPLOY", availability_status: "AVAILABLE", current_task_id: null, current_order_id: null, current_cell_id: "CELL-1" }];
handleDeploymentTaskCreate({
  context: auditContext,
  data: {
    robotaxis: deploymentRobotaxis,
    deploymentTasks,
    routeExecutions,
    data: {
      robotaxis: deploymentRobotaxis,
      serviceAreas: [{ service_area_id: "SA-006", standby_cell_ids: ["CELL-2"], vehicle_capabilities: { can_stage: true } }],
      zones: [{ zone_id: "ZONE-AUDIT", service_area_ids: ["SA-006"] }],
    },
    setDeploymentTasks: (updater) => { deploymentTasks = updater(deploymentTasks); },
    setRouteExecutions: (updater) => { routeExecutions = updater(routeExecutions); },
    setRobotaxis: (updater) => { deploymentRobotaxis = updater(deploymentRobotaxis); },
  },
});
assert.ok(deploymentTasks[0].created_at);
assert.equal(deploymentTasks[0].simulation_created_at, "Day 3 12:34:56");
assert.ok(routeExecutions[0].created_at);
assert.equal(routeExecutions[0].simulation_created_at, "Day 3 12:34:56");

let createdTrips = [];
let tripOrders = [{ ...serviceOrders[0], matched_robotaxi_id: "RTX-TRIP", trip_id: null }];
handleTripStepExecute({
  objectId: tripOrders[0].service_order_id,
  context: auditContext,
  data: {
    data: {},
    serviceOrders: tripOrders,
    trips: createdTrips,
    setServiceOrders: (updater) => { tripOrders = updater(tripOrders); },
    setTrips: (updater) => { createdTrips = updater(createdTrips); },
    setRobotaxis: () => {},
  },
});
assert.ok(createdTrips[0].created_at);
assert.equal(createdTrips[0].simulation_created_at, "Day 3 12:34:56");

registerActionHandlers({ PAYMENT_EXECUTE: handlePaymentExecute });
let drainBusinessData = {
  serviceOrderService,
  serviceOrders: [{
    service_order_id: "SO-LAST-TICK",
    simulation_run_id: drainingRun.simulation_run_id,
    order_status: "WAITING_PAYMENT",
    payment_status: "UNPAID",
    final_price: 28,
    matched_robotaxi_id: null,
  }],
  trips: [],
  readinessTasks: [],
  deploymentTasks: [],
  routeExecutions: [],
  robotaxis: [],
};
drainBusinessData.setServiceOrders = (updater) => {
  drainBusinessData.serviceOrders = updater(drainBusinessData.serviceOrders);
};
drainBusinessData.setTrips = (updater) => {
  drainBusinessData.trips = updater(drainBusinessData.trips);
};
drainBusinessData.setRobotaxis = (updater) => {
  drainBusinessData.robotaxis = updater(drainBusinessData.robotaxis);
};

const pendingDrainRun = {
  ...drainingRun,
  simulation_status: "DRAINING",
  current_time: "Day 1 00:10:00",
  current_clock_time: "00:10:00",
  current_simulation_seconds: 600,
};
const paymentDrainTick = executeTick({
  simulationRun: pendingDrainRun,
  policySnapshot: pendingDrainRun.simulation_policy_snapshot,
  businessData: drainBusinessData,
});
assert.equal(paymentDrainTick.workflowActionCount, 1);
assert.equal(paymentDrainTick.demandResult.order_count, 0);
assert.equal(drainBusinessData.serviceOrders[0].order_status, "COMPLETED");
assert.equal(drainBusinessData.serviceOrders[0].simulation_completed_at, "Day 1 00:10:00");

const afterPayment = completeTick(
  pendingDrainRun,
  paymentDrainTick.tickContext,
  paymentDrainTick.supplyResult,
  paymentDrainTick.demandResult,
  paymentDrainTick.executionResults,
  paymentDrainTick.tickEventSummary,
  { phase: "DRAINING", workflowActionCount: paymentDrainTick.workflowActionCount },
).simulationRun;
assert.equal(afterPayment.simulation_status, "DRAINING");

const settledDrainTick = executeTick({
  simulationRun: afterPayment,
  policySnapshot: afterPayment.simulation_policy_snapshot,
  businessData: drainBusinessData,
});
assert.equal(settledDrainTick.workflowActionCount, 0);
const fullyDrained = completeTick(
  afterPayment,
  settledDrainTick.tickContext,
  settledDrainTick.supplyResult,
  settledDrainTick.demandResult,
  settledDrainTick.executionResults,
  settledDrainTick.tickEventSummary,
  { phase: "DRAINING", workflowActionCount: 0 },
).simulationRun;
assert.equal(fullyDrained.simulation_status, "COMPLETED");

synchronizeSimulationCounters(
  [{ simulation_run_id: "SIM-RUN-009" }],
  [{ simulation_event_id: "SE-0042" }],
);
const synchronized = initSimulationRun({ simulationName: "计数器恢复", simulationPolicy: policy });
assert.equal(synchronized.simulationRun.simulation_run_id, "SIM-RUN-010");
assert.equal(synchronized.event.simulation_event_id, "SE-0043");

console.log("连续模拟时间轴代码级验证通过");
