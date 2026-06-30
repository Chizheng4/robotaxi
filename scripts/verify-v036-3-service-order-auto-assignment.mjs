import assert from "node:assert/strict";

import * as businessActionService from "../src/services/businessActionService.js";
import { valueDictionary, fieldValueDictionary } from "../src/domain/fieldDictionary.js";

let state = createState();

const callResult = businessActionService.callRobotaxi({
  state,
  objectId: "SO-AUTO-001",
  runtime: createRuntime({ seconds: 0 }),
});
assert.equal(callResult.success, true, callResult.message);
state = applyUpdates(state, callResult.updates);

let order = getOrder(state, "SO-AUTO-001");
let operation = state.timedOperations[0];
assert.equal(order.order_status, "WAITING_ROBOTAXI_ASSIGNMENT");
assert.equal(order.assignment_status, "ASSIGNING");
assert.equal(order.assignment_attempt_count, 0);
assert.equal(operation.operation_type, "ORDER_AUTO_ASSIGNMENT");
assert.equal(operation.action_type, "ORDER_AUTO_ASSIGNMENT_TICK");
assert.equal(operation.operation_payload.next_attempt_seconds, 0);
assert.equal(operation.duration_seconds, 5);

const firstAttempt = businessActionService.advanceOrderAutoAssignment({
  state,
  objectId: "SO-AUTO-001",
  runtime: createRuntime({
    seconds: 0,
    action: { timedOperationId: operation.timed_operation_id },
  }),
});
assert.equal(firstAttempt.success, true, firstAttempt.message);
assert.equal(firstAttempt.resultType, "AUTO_ASSIGNMENT_CONTINUES");
state = applyUpdates(state, firstAttempt.updates);
order = getOrder(state, "SO-AUTO-001");
operation = state.timedOperations[0];
assert.equal(order.assignment_attempt_count, 1);
assert.equal(order.matching_retry_pending, true);
assert.equal(order.next_matching_retry_seconds, 1);
assert.equal(operation.operation_payload.next_attempt_seconds, 1);

state = {
  ...state,
  robotaxis: [{
    robotaxi_id: "RT-AUTO-001",
    availability_status: "AVAILABLE",
    current_order_id: null,
    current_task_id: null,
    current_cell_id: "C-00-00",
    battery_percent: 90,
  }],
};
state = { ...state, data: { ...state.data, robotaxis: state.robotaxis } };

const secondAttempt = businessActionService.advanceOrderAutoAssignment({
  state,
  objectId: "SO-AUTO-001",
  runtime: createRuntime({
    seconds: 1,
    simulationTimestamp: "Day 1 00:00:01",
    action: { timedOperationId: operation.timed_operation_id },
  }),
});
assert.equal(secondAttempt.success, true, secondAttempt.message);
assert.equal(secondAttempt.resultType, "AUTO_ASSIGNMENT_COMPLETED");
state = applyUpdates(state, secondAttempt.updates);
order = getOrder(state, "SO-AUTO-001");
operation = state.timedOperations[0];
assert.equal(order.order_status, "ON_THE_WAY_PICKUP");
assert.equal(order.assignment_status, "ASSIGNED");
assert.equal(order.assignment_attempt_count, 2);
assert.equal(order.assignment_elapsed_seconds, 1);
assert.equal(operation.operation_status, "COMPLETED");
assert.equal(operation.elapsed_seconds, 1);
assert.equal(state.trips.length, 1);

const timeoutState = applyUpdates(createState("SO-AUTO-TIMEOUT"), businessActionService.callRobotaxi({
  state: createState("SO-AUTO-TIMEOUT"),
  objectId: "SO-AUTO-TIMEOUT",
  runtime: createRuntime({ seconds: 0 }),
}).updates);
const timeoutOperation = timeoutState.timedOperations[0];
const timeoutResult = businessActionService.advanceOrderAutoAssignment({
  state: timeoutState,
  objectId: "SO-AUTO-TIMEOUT",
  runtime: createRuntime({
    seconds: 5,
    simulationTimestamp: "Day 1 00:00:05",
    action: { timedOperationId: timeoutOperation.timed_operation_id },
  }),
});
assert.equal(timeoutResult.success, true, timeoutResult.message);
assert.equal(timeoutResult.resultType, "AUTO_ASSIGNMENT_TIMEOUT_CANCELLED");
const timedOutOrder = timeoutResult.updates.serviceOrders[0];
assert.equal(timedOutOrder.order_status, "CANCELLED");
assert.equal(timedOutOrder.assignment_status, "TIMEOUT_CANCELLED");
assert.equal(timeoutResult.updates.timedOperations[0].operation_status, "COMPLETED");

assert.equal(fieldValueDictionary.operation_status.CANCELLED, "已撤销");
assert.equal(valueDictionary.ORDER_AUTO_ASSIGNMENT, "订单自动分配");
assert.equal(valueDictionary.ORDER_AUTO_ASSIGNMENT_TICK, "推进自动分配");

console.log("v036.3 服务订单自动限时分配验证通过");

function applyUpdates(current, updates = {}) {
  const next = { ...current };
  for (const [key, value] of Object.entries(updates)) {
    next[key] = value;
  }
  next.data = {
    ...next.data,
    serviceOrders: next.serviceOrders,
    trips: next.trips,
    routes: next.routes,
    routePlanningRuns: next.routePlanningRuns,
    robotaxis: next.robotaxis,
    orderMatchingRuns: next.orderMatchingRuns,
    orderMatchingDecisions: next.orderMatchingDecisions,
    timedOperations: next.timedOperations,
  };
  return next;
}

function getOrder(current, id) {
  return current.serviceOrders.find((item) => item.service_order_id === id);
}

function createRuntime({ seconds = 0, simulationTimestamp = "Day 1 00:00:00", action = null } = {}) {
  let sequence = 0;
  return {
    nextId: (prefix) => {
      sequence += 1;
      return `${prefix}-V0363-${String(sequence).padStart(3, "0")}`;
    },
    now: () => "2026-06-30T00:00:00.000Z",
    simulationTime: () => simulationTimestamp,
    randomSeed: () => "v0363",
    audit: (options = {}) => ({
      record_source: "SIMULATION",
      simulation_run_id: "SIM-RUN-V0363",
      simulation_updated_at: simulationTimestamp,
      simulation_global_tick: seconds,
      ...(options.created ? { simulation_created_at: simulationTimestamp } : {}),
      ...(options.completed ? { simulation_completed_at: simulationTimestamp } : {}),
    }),
    timeContext: {
      time_mode: "SIMULATION",
      simulation_run_id: "SIM-RUN-V0363",
      simulation_seconds: seconds,
      simulation_timestamp: simulationTimestamp,
    },
    policySnapshot: {
      execution_time_config: {
        assignment_max_wait_seconds: 5,
        assignment_retry_interval_seconds: 1,
      },
    },
    workflowTimingProfile: null,
    context: { action },
  };
}

function createState(serviceOrderId = "SO-AUTO-001") {
  const baseData = {
    maps: [{ map_id: "MAP-VERIFY", cell_size_m: 100 }],
    cells: Array.from({ length: 3 }, (_, col) => ({ cell_id: `C-00-0${col}`, row: 0, col })),
    roadNodes: Array.from({ length: 3 }, (_, col) => ({ road_node_id: `RN-00-0${col}`, cell_id: `C-00-0${col}` })),
    roadSegments: [{
      road_segment_id: "RS-VERIFY-001",
      cell_sequence: ["C-00-00", "C-00-01", "C-00-02"],
      allowed_direction: "BIDIRECTIONAL",
      segment_status: "ACTIVE",
    }],
    serviceAreas: [{
      service_area_id: "SA-PICKUP",
      cell_ids: ["C-00-02"],
      pickup_cell_ids: ["C-00-02"],
      dropoff_cell_ids: ["C-00-02"],
      standby_cell_ids: ["C-00-02"],
      vehicle_capabilities: { can_stage: true },
    }],
    orderMatchingStrategies: [{
      order_matching_strategy_id: "OMS-VERIFY",
      strategy_status: "ACTIVE",
      matching_algorithm: "NEAREST_AVAILABLE_ROBOTAXI",
      min_battery_threshold: 20,
    }],
    routes: [],
    routePlanningRuns: [],
    robotaxis: [],
  };
  return {
    serviceOrders: [{
      service_order_id: serviceOrderId,
      order_status: "WAITING_ROBOTAXI_CALL",
      pickup_service_area_id: "SA-PICKUP",
      pickup_cell_id: "C-00-02",
      dropoff_service_area_id: "SA-PICKUP",
      dropoff_cell_id: "C-00-02",
      payment_status: "UNPAID",
      created_at: "2026-06-30T00:00:00.000Z",
    }],
    trips: [],
    routes: baseData.routes,
    routePlanningRuns: baseData.routePlanningRuns,
    robotaxis: baseData.robotaxis,
    orderMatchingRuns: [],
    orderMatchingDecisions: [],
    timedOperations: [],
    data: baseData,
  };
}
