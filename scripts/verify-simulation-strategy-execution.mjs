import assert from "node:assert/strict";

import { executeActions, registerActionHandlers } from "../src/data/simulationExecutionEngine.js";
import * as serviceOrderService from "../src/services/serviceOrderService.js";
import * as tripService from "../src/services/tripService.js";
import {
  handleArrivalConfirm,
  handleDeploymentTaskCreate,
  handleOrderMatchingExecute,
  handlePaymentExecute,
  handlePricingExecute,
  handleRobotaxiCall,
  handleRouteExecutionStep,
  handleRoutePlan,
  handleSettlementExecute,
  handleTripStepExecute,
} from "../src/services/simulationHandlers.js";

registerActionHandlers({
  PRICING_EXECUTE: handlePricingExecute,
  ROBOTAXI_CALL: handleRobotaxiCall,
  ORDER_MATCHING_EXECUTE: handleOrderMatchingExecute,
  TRIP_STEP_EXECUTE: handleTripStepExecute,
  PASSENGER_BOARD: handleTripStepExecute,
  PASSENGER_DROPOFF: handleTripStepExecute,
  SETTLEMENT_EXECUTE: handleSettlementExecute,
  PAYMENT_EXECUTE: handlePaymentExecute,
  DEPLOYMENT_TASK_CREATE: handleDeploymentTaskCreate,
  ROUTE_PLAN: handleRoutePlan,
  ROUTE_EXECUTION_STEP: handleRouteExecutionStep,
  ARRIVAL_CONFIRM: handleArrivalConfirm,
});

const businessData = createBusinessData();
const context = {
  simulationRunId: "SIM-RUN-VERIFY-STRATEGY",
  globalTick: 8,
  tickContext: { current_time: "Day 1 00:01:20", global_tick: 8 },
};

runAction({ actionType: "PRICING_EXECUTE", objectId: "SO-VERIFY-001" });
const pricedOrder = getOrder();
assert.equal(pricedOrder.order_status, "WAITING_ROBOTAXI_CALL");
assert.ok(pricedOrder.price_estimation_route_id);
assert.ok(businessData.routes.some((route) => route.route_id === pricedOrder.price_estimation_route_id && route.route_usage_type === "PRICE_ESTIMATION"));
assert.ok(businessData.routePlanningRuns.some((run) => run.service_order_id === "SO-VERIFY-001" && run.planning_result === "SUCCESS"));

runAction({ actionType: "ROBOTAXI_CALL", objectId: "SO-VERIFY-001" });
runAction({ actionType: "ORDER_MATCHING_EXECUTE", objectId: "SO-VERIFY-001" });
const matchedOrder = getOrder();
const trip = businessData.trips.find((item) => item.trip_id === matchedOrder.trip_id);
const matchedRobotaxi = businessData.robotaxis.find((item) => item.robotaxi_id === matchedOrder.matched_robotaxi_id);
assert.ok(trip);
assert.equal(trip.current_cell_id, matchedRobotaxi.current_cell_id);
assert.equal(trip.pickup_cell_id, "C-00-02");

runAction({ actionType: "ROUTE_PLAN", objectType: "trip", objectId: trip.trip_id });
let plannedPickupTrip = getTrip(trip.trip_id);
assert.equal(plannedPickupTrip.trip_status, "ON_THE_WAY_PICKUP");
assert.ok(plannedPickupTrip.route_id);
assert.ok(businessData.routes.some((route) => route.route_id === plannedPickupTrip.route_id && route.route_usage_type === "SERVICE_PICKUP"));

while (getTrip(trip.trip_id).trip_status === "ON_THE_WAY_PICKUP") {
  runAction({ actionType: "TRIP_STEP_EXECUTE", objectId: trip.trip_id });
}
const arrivedPickupTrip = getTrip(trip.trip_id);
assert.equal(arrivedPickupTrip.trip_status, "WAITING_CUSTOMER_BOARDING");
assert.equal(arrivedPickupTrip.current_cell_id, "C-00-02");

runAction({ actionType: "PASSENGER_BOARD", objectId: trip.trip_id });
runAction({ actionType: "ROUTE_PLAN", objectType: "trip", objectId: trip.trip_id });
const plannedDestinationTrip = getTrip(trip.trip_id);
assert.equal(plannedDestinationTrip.trip_status, "ON_THE_WAY_DESTINATION");
assert.ok(plannedDestinationTrip.route_id);
assert.ok(businessData.routes.some((route) => route.route_id === plannedDestinationTrip.route_id && route.route_usage_type === "SERVICE_DROPOFF"));
assert.ok((plannedDestinationTrip.route_history || []).length >= 2);

while (getTrip(trip.trip_id).trip_status === "ON_THE_WAY_DESTINATION") {
  runAction({ actionType: "TRIP_STEP_EXECUTE", objectId: trip.trip_id });
}
runAction({ actionType: "PASSENGER_DROPOFF", objectId: trip.trip_id });
assert.equal(getTrip(trip.trip_id).trip_status, "COMPLETED");
assert.equal(getOrder().order_status, "SETTLING");

runAction({ actionType: "SETTLEMENT_EXECUTE", objectId: "SO-VERIFY-001" });
assert.equal(getOrder().order_status, "WAITING_PAYMENT");
assert.ok(getOrder().final_price > 0);
assert.ok(businessData.pricingDecisions.some((decision) => decision.service_order_id === "SO-VERIFY-001" && decision.pricing_stage === "FINAL"));

runAction({ actionType: "PAYMENT_EXECUTE", objectId: "SO-VERIFY-001" });
assert.equal(getOrder().order_status, "COMPLETED");

runAction({ actionType: "DEPLOYMENT_TASK_CREATE", objectId: null });
const deploymentTask = businessData.deploymentTasks[0];
const routeExecution = businessData.routeExecutions[0];
assert.equal(deploymentTask.task_status, "WAITING_ROUTE");
assert.equal(routeExecution.execution_status, "WAITING_ROUTE");
assert.equal(deploymentTask.planned_target_cell_id, "C-00-04");

runAction({ actionType: "ROUTE_PLAN", objectId: routeExecution.route_execution_id });
let plannedExecution = getRouteExecution(routeExecution.route_execution_id);
assert.equal(plannedExecution.execution_status, "MOVING");
assert.ok(plannedExecution.route_id);
assert.ok(plannedExecution.route_cell_ids.length > 1);
assert.ok(businessData.routes.some((route) => route.route_id === plannedExecution.route_id && route.route_usage_type === "OPERATIONAL_EXECUTION"));

while (getRouteExecution(routeExecution.route_execution_id).execution_status === "MOVING") {
  runAction({ actionType: "ROUTE_EXECUTION_STEP", objectId: routeExecution.route_execution_id });
}
plannedExecution = getRouteExecution(routeExecution.route_execution_id);
assert.equal(plannedExecution.execution_status, "ARRIVED");
assert.equal(plannedExecution.current_cell_id, "C-00-04");

runAction({ actionType: "ARRIVAL_CONFIRM", objectId: routeExecution.route_execution_id });
assert.equal(getRouteExecution(routeExecution.route_execution_id).execution_status, "COMPLETED");
assert.equal(getDeploymentTask(deploymentTask.task_id).task_status, "COMPLETED");

console.log("自动模拟业务策略执行验证通过");

function runAction(action) {
  const [result] = executeActions([action], businessData, context);
  assert.equal(result.success, true, result.message);
  return result;
}

function getOrder() {
  return businessData.serviceOrders.find((order) => order.service_order_id === "SO-VERIFY-001");
}

function getTrip(tripId) {
  return businessData.trips.find((item) => item.trip_id === tripId);
}

function getRouteExecution(routeExecutionId) {
  return businessData.routeExecutions.find((item) => item.route_execution_id === routeExecutionId);
}

function getDeploymentTask(taskId) {
  return businessData.deploymentTasks.find((item) => item.task_id === taskId);
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
        robotaxi_id: "RT-ORDER-001",
        availability_status: "AVAILABLE",
        current_order_id: null,
        current_task_id: null,
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
    pricingStrategies: [
      {
        pricing_strategy_id: "DPS-VERIFY-EST",
        strategy_status: "ACTIVE",
        pricing_algorithm: "BASIC_RULE_BASED_DYNAMIC_PRICING",
        base_fare: 8,
        distance_unit_price: 2,
        time_unit_price: 0.5,
        supply_demand_multiplier: 1,
        time_period_multiplier: 1,
        service_area_multiplier: 1,
        channel_multiplier: 1,
      },
      {
        pricing_strategy_id: "DPS-VERIFY-FINAL",
        strategy_status: "ACTIVE",
        pricing_algorithm: "BASIC_FINAL_FARE_CALCULATION",
        base_fare: 8,
        distance_unit_price: 2,
        time_unit_price: 0.5,
        supply_demand_multiplier: 1,
        time_period_multiplier: 1,
        service_area_multiplier: 1,
        channel_multiplier: 1,
      },
    ],
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
      service_order_id: "SO-VERIFY-001",
      order_channel: "OWN_APP_SIMULATED_ORDER",
      customer_id: "CUS-VERIFY-001",
      customer_origin_cell_id: "C-00-00",
      pickup_service_area_id: "SA-PICKUP",
      pickup_cell_id: "C-00-02",
      dropoff_service_area_id: "SA-006",
      dropoff_cell_id: "C-00-04",
      order_status: "WAITING_PRICE_ESTIMATE",
      payment_status: "UNPAID",
      created_at: "2026-06-25T00:00:00.000Z",
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
    taskEventLogs: [],
    data,
    serviceOrderService,
    tripService,
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
      pricingStrategyRuns: businessData.pricingStrategyRuns,
      pricingDecisions: businessData.pricingDecisions,
      orderMatchingRuns: businessData.orderMatchingRuns,
      orderMatchingDecisions: businessData.orderMatchingDecisions,
      taskEventLogs: businessData.taskEventLogs,
    };
  };
  const bindSetter = (key) => (updater) => {
    businessData[key] = typeof updater === "function" ? updater(businessData[key]) : updater;
    refresh();
  };
  businessData.setServiceOrders = bindSetter("serviceOrders");
  businessData.setTrips = bindSetter("trips");
  businessData.setDeploymentTasks = bindSetter("deploymentTasks");
  businessData.setRouteExecutions = bindSetter("routeExecutions");
  businessData.setRoutes = bindSetter("routes");
  businessData.setRoutePlanningRuns = bindSetter("routePlanningRuns");
  businessData.setRobotaxis = bindSetter("robotaxis");
  businessData.setPricingStrategyRuns = bindSetter("pricingStrategyRuns");
  businessData.setPricingDecisions = bindSetter("pricingDecisions");
  businessData.setOrderMatchingRuns = bindSetter("orderMatchingRuns");
  businessData.setOrderMatchingDecisions = bindSetter("orderMatchingDecisions");
  refresh();
  return businessData;
}
