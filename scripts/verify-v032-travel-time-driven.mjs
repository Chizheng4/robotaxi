import assert from "node:assert/strict";

import { executeActions, registerActionHandlers } from "../src/data/simulationExecutionEngine.js";
import { executeTick } from "../src/data/simulationLoop.js";
import * as routePlanningService from "../src/services/routePlanningService.js";
import {
  handleArrivalConfirm,
  handleDeploymentTaskCreate,
  handleRouteExecutionTravelComplete,
  handleRoutePlan,
  handleTripStepExecute,
  handleTripTravelComplete,
} from "../src/services/simulationHandlers.js";

registerActionHandlers({
  DEPLOYMENT_TASK_CREATE: handleDeploymentTaskCreate,
  ROUTE_PLAN: handleRoutePlan,
  ROUTE_EXECUTION_STEP: handleRouteExecutionTravelComplete,
  ROUTE_EXECUTION_TRAVEL_COMPLETE: handleRouteExecutionTravelComplete,
  ARRIVAL_CONFIRM: handleArrivalConfirm,
  TRIP_STEP_EXECUTE: handleTripStepExecute,
  TRIP_TRAVEL_COMPLETE: handleTripTravelComplete,
});

const businessData = createBusinessData();
const context = createContext(0);

runAction({ actionType: "DEPLOYMENT_TASK_CREATE", objectId: null }, context);
const routeExecutionId = businessData.routeExecutions[0].route_execution_id;
runAction({ actionType: "ROUTE_PLAN", objectId: routeExecutionId }, context);

const routeTravelOperation = businessData.timedOperations.find((operation) =>
  operation.object_type === "routeExecution" &&
  operation.object_id === routeExecutionId &&
  operation.action_type === "ROUTE_EXECUTION_STEP"
);
assert.ok(routeTravelOperation, "运营行驶路径规划后必须生成行驶时间作业");
assert.ok(routeTravelOperation.duration_seconds > 0);

executeTick({
  simulationRun: createRun(routeTravelOperation.duration_seconds),
  policySnapshot: createPolicy(),
  businessData,
});
assert.equal(getRouteExecution(routeExecutionId).execution_status, "ARRIVED");
assert.equal(getRouteExecution(routeExecutionId).distance_traveled_km, getRouteExecution(routeExecutionId).total_distance_km);
assert.equal(getRouteExecution(routeExecutionId).distance_remaining_km, 0);
assert.ok(businessData.timedOperations.some((operation) =>
  operation.object_type === "routeExecution" &&
  operation.object_id === routeExecutionId &&
  operation.action_type === "ARRIVAL_CONFIRM"
), "运营行驶到达后必须生成到达识别时间作业");

runAction({ actionType: "TRIP_STEP_EXECUTE", objectId: "TRIP-VERIFY-001" }, context);
const pickupRoute = businessData.routes.find((route) => route.trip_id === "TRIP-VERIFY-001");
const tripTravelOperation = businessData.timedOperations.find((operation) =>
  operation.object_type === "trip" &&
  operation.object_id === "TRIP-VERIFY-001" &&
  operation.action_type === "TRIP_TRAVEL_COMPLETE"
);
assert.ok(pickupRoute);
assert.ok(pickupRoute.route_step_count > 0);
assert.equal(pickupRoute.total_distance_km, 0.2);
assert.ok(tripTravelOperation, "履约路径规划后必须生成行驶时间作业");

executeTick({
  simulationRun: createRun(tripTravelOperation.duration_seconds),
  policySnapshot: createPolicy(),
  businessData,
});
const pickupTrip = getTrip();
assert.equal(pickupTrip.trip_status, "WAITING_CUSTOMER_BOARDING");
assert.equal(pickupTrip.current_cell_id, pickupTrip.pickup_cell_id);
assert.equal(pickupTrip.distance_traveled_km, pickupTrip.total_distance_km);
assert.equal(pickupTrip.distance_remaining_km, 0);

console.log("v032.3 行驶时间驱动闭环验证通过");

function runAction(action, runContext) {
  const [result] = executeActions([action], businessData, runContext);
  assert.equal(result.success, true, result.message);
  return result;
}

function createContext(seconds) {
  return {
    simulationRunId: "SIM-RUN-V032-TRAVEL",
    globalTick: Math.floor(seconds / 6),
    tickContext: {
      current_time: `Day 1 00:00:${String(seconds).padStart(2, "0")}`,
      current_simulation_seconds: seconds,
      global_tick: Math.floor(seconds / 6),
    },
  };
}

function createRun(seconds) {
  return {
    simulation_run_id: "SIM-RUN-V032-TRAVEL",
    simulation_status: "RUNNING",
    current_simulation_seconds: seconds,
    current_time: `Day 1 00:00:${String(seconds).padStart(2, "0")}`,
    current_day: 1,
    current_day_tick: Math.floor(seconds / 6),
    current_global_tick: Math.floor(seconds / 6),
    current_run_tick: Math.floor(seconds / 6),
    tick_seconds: 6,
    total_ticks: 100,
    simulation_policy_snapshot: createPolicy(),
  };
}

function createPolicy() {
  return {
    tick_seconds: 6,
    tick_minutes: 0.1,
    supply_trigger_enabled: false,
    demand_generation_enabled: false,
    service_order_auto_config: {},
    default_completion_config: {},
    worker_work_start_time: "00:00:00",
    worker_work_end_time: "23:59:59",
    robotaxi_operating_start_time: "00:00:00",
    robotaxi_operating_end_time: "23:59:59",
  };
}

function getRouteExecution(routeExecutionId) {
  return businessData.routeExecutions.find((item) => item.route_execution_id === routeExecutionId);
}

function getTrip() {
  return businessData.trips.find((item) => item.trip_id === "TRIP-VERIFY-001");
}

function createBusinessData() {
  const data = {
    maps: [{ map_id: "MAP-VERIFY", cell_size_m: 100 }],
    cells: Array.from({ length: 5 }, (_, col) => ({ cell_id: `C-00-0${col}`, row: 0, col })),
    roadNodes: Array.from({ length: 5 }, (_, col) => ({ road_node_id: `RN-00-0${col}`, cell_id: `C-00-0${col}` })),
    roadSegments: [{
      road_segment_id: "RS-VERIFY-001",
      cell_sequence: ["C-00-00", "C-00-01", "C-00-02", "C-00-03", "C-00-04"],
      allowed_direction: "BIDIRECTIONAL",
      segment_status: "ACTIVE",
    }],
    zones: [{ zone_id: "ZONE-VERIFY", service_area_ids: ["SA-PICKUP", "SA-006"] }],
    serviceAreas: [
      {
        service_area_id: "SA-PICKUP",
        zone_id: "ZONE-VERIFY",
        cell_ids: ["C-00-02"],
        pickup_cell_ids: ["C-00-02"],
        dropoff_cell_ids: ["C-00-02"],
        standby_cell_ids: ["C-00-02"],
        vehicle_capabilities: { can_stage: true },
      },
      {
        service_area_id: "SA-006",
        zone_id: "ZONE-VERIFY",
        cell_ids: ["C-00-04"],
        pickup_cell_ids: ["C-00-04"],
        dropoff_cell_ids: ["C-00-04"],
        standby_cell_ids: ["C-00-04"],
        parking_cell_ids: ["C-00-04"],
        vehicle_capabilities: { can_stage: true, can_short_wait: true },
      },
    ],
    robotaxis: [
      {
        robotaxi_id: "RT-TRIP-001",
        availability_status: "IN_SERVICE",
        current_order_id: "SO-VERIFY-001",
        current_cell_id: "C-00-00",
        battery_percent: 90,
        estimated_range_km: 300,
        max_range_km: 300,
        motion_status: "PARKED",
      },
      {
        robotaxi_id: "RT-DEPLOY-001",
        availability_status: "AVAILABLE",
        current_order_id: null,
        current_task_id: null,
        current_cell_id: "C-00-01",
        battery_percent: 88,
        estimated_range_km: 280,
        max_range_km: 300,
        motion_status: "PARKED",
      },
    ],
    routes: [],
    routePlanningRuns: [],
  };
  const businessData = {
    serviceOrders: [{
      service_order_id: "SO-VERIFY-001",
      order_status: "IN_SERVICE",
      trip_id: "TRIP-VERIFY-001",
      pickup_service_area_id: "SA-PICKUP",
      pickup_cell_id: "C-00-02",
      dropoff_service_area_id: "SA-006",
      dropoff_cell_id: "C-00-04",
      payment_status: "UNPAID",
    }],
    trips: [{
      trip_id: "TRIP-VERIFY-001",
      service_order_id: "SO-VERIFY-001",
      robotaxi_id: "RT-TRIP-001",
      trip_status: "WAITING_ROUTE",
      trip_phase: "PICKUP",
      pickup_service_area_id: "SA-PICKUP",
      pickup_cell_id: "C-00-02",
      dropoff_service_area_id: "SA-006",
      dropoff_cell_id: "C-00-04",
      current_cell_id: "C-00-00",
      current_step_index: 0,
      total_step_count: 0,
      distance_traveled_km: 0,
      distance_remaining_km: 0,
      time_elapsed: "0",
      route_history: [],
    }],
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
    taskEventLogs: [],
    timedOperations: [],
    data,
  };
  const refresh = () => {
    businessData.data = {
      ...businessData.data,
      serviceOrders: businessData.serviceOrders,
      trips: businessData.trips,
      deploymentTasks: businessData.deploymentTasks,
      routeExecutions: businessData.routeExecutions,
      routes: businessData.routes,
      routePlanningRuns: businessData.routePlanningRuns,
      robotaxis: businessData.robotaxis,
      timedOperations: businessData.timedOperations,
    };
  };
  const bindSetter = (key) => (updater) => {
    businessData[key] = typeof updater === "function" ? updater(businessData[key]) : updater;
    refresh();
  };
  [
    "serviceOrders",
    "trips",
    "deploymentTasks",
    "routeExecutions",
    "routes",
    "routePlanningRuns",
    "robotaxis",
    "timedOperations",
  ].forEach((key) => {
    businessData[`set${key[0].toUpperCase()}${key.slice(1)}`] = bindSetter(key);
  });
  businessData.setRouteExecutions = bindSetter("routeExecutions");
  businessData.setRoutePlanningRuns = bindSetter("routePlanningRuns");
  businessData.setTimedOperations = bindSetter("timedOperations");
  refresh();
  assert.equal(routePlanningService.DEFAULT_CELL_TRAVEL_SECONDS, 6);
  return businessData;
}
