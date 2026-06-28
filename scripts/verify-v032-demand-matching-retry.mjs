import assert from "node:assert/strict";

import { executeActions, registerActionHandlers } from "../src/data/simulationExecutionEngine.js";
import { executeTick } from "../src/data/simulationLoop.js";
import {
  handleOrderMatchingExecute,
} from "../src/services/simulationHandlers.js";

registerActionHandlers({
  ORDER_MATCHING_EXECUTE: handleOrderMatchingExecute,
});

const businessData = createBusinessData();

runAction({ actionType: "ORDER_MATCHING_EXECUTE", objectId: "SO-RETRY-001" }, createContext(0));
let order = getOrder();
assert.equal(order.order_status, "WAITING_ROBOTAXI_ASSIGNMENT");
assert.equal(order.matching_retry_pending, true);
assert.equal(order.matching_attempt_count, 1);
assert.equal(order.last_matching_failure_reason, "NO_AVAILABLE_ROBOTAXI");
assert.ok(businessData.timedOperations.some((operation) =>
  operation.object_type === "serviceOrder" &&
  operation.object_id === "SO-RETRY-001" &&
  operation.operation_type === "ORDER_MATCH_RETRY" &&
  operation.action_type === "ORDER_MATCHING_EXECUTE"
));

businessData.setRobotaxis(() => [{
  robotaxi_id: "RT-RETRY-001",
  availability_status: "AVAILABLE",
  current_order_id: null,
  current_task_id: null,
  current_cell_id: "C-00-00",
  battery_percent: 90,
}]);

executeTick({
  simulationRun: createRun(10),
  policySnapshot: createPolicy(),
  businessData,
});

order = getOrder();
assert.equal(order.order_status, "ON_THE_WAY_PICKUP");
assert.equal(order.matching_retry_pending, false);
assert.equal(order.matching_attempt_count, 2);
assert.equal(order.last_matching_failure_reason, null);
assert.ok(order.trip_id);
assert.equal(businessData.trips.length, 1);
assert.equal(businessData.trips[0].robotaxi_id, "RT-RETRY-001");

console.log("v032.5 需求侧匹配等待重试验证通过");

function runAction(action, runContext) {
  const [result] = executeActions([action], businessData, runContext);
  assert.equal(result.success, true, result.message);
  return result;
}

function getOrder() {
  return businessData.serviceOrders.find((item) => item.service_order_id === "SO-RETRY-001");
}

function createContext(seconds) {
  return {
    simulationRunId: "SIM-RUN-V032-DEMAND",
    globalTick: Math.floor(seconds / 5),
    tickContext: {
      current_time: `Day 1 00:00:${String(seconds).padStart(2, "0")}`,
      current_simulation_seconds: seconds,
      global_tick: Math.floor(seconds / 5),
    },
    policySnapshot: createPolicy(),
  };
}

function createRun(seconds) {
  return {
    simulation_run_id: "SIM-RUN-V032-DEMAND",
    simulation_status: "RUNNING",
    current_simulation_seconds: seconds,
    current_time: `Day 1 00:00:${String(seconds).padStart(2, "0")}`,
    current_day: 1,
    current_day_tick: Math.floor(seconds / 5),
    current_global_tick: Math.floor(seconds / 5),
    current_run_tick: Math.floor(seconds / 5),
    tick_seconds: 5,
    total_ticks: 100,
    simulation_policy_snapshot: createPolicy(),
  };
}

function createPolicy() {
  return {
    tick_seconds: 5,
    tick_minutes: 0.083,
    supply_trigger_config: { supply_trigger_enabled: false },
    demand_generation_enabled: false,
    service_order_auto_config: { auto_order_matching_enabled: true },
    default_completion_config: {},
    execution_time_config: {
      order_matching_retry_seconds: 10,
      order_matching_max_retry_count: 3,
    },
    worker_work_start_time: "00:00:00",
    worker_work_end_time: "23:59:59",
    robotaxi_operating_start_time: "00:00:00",
    robotaxi_operating_end_time: "23:59:59",
  };
}

function createBusinessData() {
  const data = {
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
    robotaxis: [],
    orderMatchingStrategies: [{
      order_matching_strategy_id: "OMS-VERIFY",
      strategy_status: "ACTIVE",
      matching_algorithm: "NEAREST_AVAILABLE_ROBOTAXI",
      min_battery_threshold: 20,
    }],
    routes: [],
    routePlanningRuns: [],
  };
  const businessData = {
    serviceOrders: [{
      service_order_id: "SO-RETRY-001",
      order_status: "WAITING_ROBOTAXI_ASSIGNMENT",
      pickup_service_area_id: "SA-PICKUP",
      pickup_cell_id: "C-00-02",
      dropoff_service_area_id: "SA-PICKUP",
      dropoff_cell_id: "C-00-02",
      payment_status: "UNPAID",
      created_at: "2026-06-28T00:00:00.000Z",
    }],
    trips: [],
    readinessTasks: [],
    deploymentTasks: [],
    routeExecutions: [],
    routes: data.routes,
    routePlanningRuns: data.routePlanningRuns,
    robotaxis: data.robotaxis,
    pricingStrategyRuns: [],
    pricingDecisions: [],
    orderMatchingRuns: [],
    orderMatchingDecisions: [],
    timedOperations: [],
    data,
  };
  const refresh = () => {
    businessData.data = {
      ...businessData.data,
      serviceOrders: businessData.serviceOrders,
      trips: businessData.trips,
      routes: businessData.routes,
      routePlanningRuns: businessData.routePlanningRuns,
      robotaxis: businessData.robotaxis,
      orderMatchingRuns: businessData.orderMatchingRuns,
      orderMatchingDecisions: businessData.orderMatchingDecisions,
      timedOperations: businessData.timedOperations,
    };
  };
  const bindSetter = (key) => (updater) => {
    businessData[key] = typeof updater === "function" ? updater(businessData[key]) : updater;
    refresh();
  };
  businessData.setServiceOrders = bindSetter("serviceOrders");
  businessData.setTrips = bindSetter("trips");
  businessData.setRoutes = bindSetter("routes");
  businessData.setRoutePlanningRuns = bindSetter("routePlanningRuns");
  businessData.setRobotaxis = bindSetter("robotaxis");
  businessData.setOrderMatchingRuns = bindSetter("orderMatchingRuns");
  businessData.setOrderMatchingDecisions = bindSetter("orderMatchingDecisions");
  businessData.setTimedOperations = bindSetter("timedOperations");
  refresh();
  return businessData;
}
