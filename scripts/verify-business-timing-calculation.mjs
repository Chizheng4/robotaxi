import assert from "node:assert/strict";
import fs from "node:fs";

import {
  createBusinessTimingCalculation,
  initializeDefaultWorkflowTimingProfile,
  normalizeWorkflowTimingProfile,
  updateWorkflowTimingRule,
} from "../src/data/businessTimingCalculator.js";
import {
  getExecutableTransitions,
  getTimingTransitions,
  preservedWorkflowTransitions,
} from "../src/domain/workflowTransitionRegistry.js";
import { createOperatingSimulationTimeCalculationEvent, resetSimulationCounters } from "../src/data/simulationEngine.js";

const simulationRun = {
  simulation_run_id: "SIM-RUN-TIMING",
  simulation_timeline_id: "SIM-TIMELINE-001",
  simulation_status: "COMPLETED",
};
const audit = {
  simulation_run_id: simulationRun.simulation_run_id,
  simulation_created_at: "Day 2 10:00:00",
};
const businessData = {
  readinessTasks: [{ task_id: "RC-1", task_status: "COMPLETED", ...audit }],
  deploymentTasks: [{ task_id: "DP-1", task_status: "COMPLETED", route_execution_id: "RE-1", ...audit }],
  routeExecutions: [{ route_execution_id: "RE-1", deployment_task_id: "DP-1", execution_status: "COMPLETED", total_step_count: 3, ...audit }],
  serviceOrders: [{ service_order_id: "SO-1", order_status: "COMPLETED", trip_id: "TRIP-1", ...audit }],
  trips: [{ trip_id: "TRIP-1", service_order_id: "SO-1", trip_status: "ARRIVED_DESTINATION", total_step_count: 6, ...audit }],
  routes: [],
  pricingStrategyRuns: [],
  pricingDecisions: [],
  orderMatchingRuns: [],
  orderMatchingDecisions: [],
  routePlanningRuns: [],
  demandSimulationRuns: [],
};

const profile = initializeDefaultWorkflowTimingProfile();
resetSimulationCounters();
const calculationEvent = createOperatingSimulationTimeCalculationEvent({
  simulationRun: { ...simulationRun, current_day: 2, current_time: "Day 2 10:00:00", current_day_tick: 10, current_global_tick: 154 },
  eventType: "OPERATING_SIMULATION_TIME_CALCULATION_STARTED",
  message: "开始计算运营模拟时间",
  calculationRunId: "BTCR-TEST-001",
  profile,
});
assert.equal(calculationEvent.simulation_event_id, "SE-0001");
assert.equal(calculationEvent.related_object_type, "simulationRun");
assert.equal(calculationEvent.event_payload.business_timing_calculation_run_id, "BTCR-TEST-001");
assert.equal(calculationEvent.simulation_time, "Day 2 10:00:00");
const migratedProfile = normalizeWorkflowTimingProfile({
  workflow_timing_profile_id: "WTP-001",
  profile_version: 3,
  timing_rules: [{ business_object_type: "routeExecution", from_status: "WAITING_ROUTE", action_type: "ROUTE_PLAN", configured_duration_seconds: 11 }],
});
assert.equal(migratedProfile.profile_version, 4);
assert.equal(migratedProfile.timing_rules.find((rule) => rule.workflow_transition_definition_id === "ROUTE_PLAN").configured_duration_seconds, 11);
assert.equal(migratedProfile.timing_rules.find((rule) => rule.workflow_transition_definition_id === "DEPLOYMENT_PLAN").configured_duration_seconds, 11);
assert.equal(profile.timing_rules.length, getTimingTransitions().length);
assert.ok(profile.timing_rules.some((rule) => rule.business_object_type === "deploymentTask"));
assert.deepEqual(getExecutableTransitions("deploymentTask", "WAITING_START"), []);
assert.equal(getExecutableTransitions("routeExecution", "WAITING_ROUTE")[0].action_type, "ROUTE_PLAN");
assert.equal(getExecutableTransitions("trip", "WAITING_ROUTE")[0].action_type, "ROUTE_PLAN");
assert.equal(getExecutableTransitions("trip", "WAITING_CUSTOMER_BOARDING")[0].action_type, "PASSENGER_BOARD");
assert.equal(getExecutableTransitions("trip", "ARRIVED_DESTINATION")[0].action_type, "PASSENGER_DROPOFF");
assert.ok(preservedWorkflowTransitions.some((rule) => rule.transition_mode === "EXCEPTION"));
const result = createBusinessTimingCalculation({
  simulationRun,
  profile,
  businessData,
  calculationRunId: "BTCR-TEST-001",
});

assert.equal(result.calculationRun.calculation_status, "SUCCEEDED");
assert.equal(result.calculationRun.total_object_count, 5);

const deployment = result.businessData.deploymentTasks[0];
const execution = result.businessData.routeExecutions[0];
const deploymentMoving = deployment.simulation_status_transition_history.find((item) => item.to_status === "MOVING");
const executionMoving = execution.simulation_status_transition_history.find((item) => item.to_status === "MOVING");
assert.equal(deploymentMoving.calculated_simulation_status_changed_at, executionMoving.calculated_simulation_status_changed_at);

const routeTravel = execution.simulation_status_transition_history.find((item) => item.action_type === "ROUTE_EXECUTION_STEP");
assert.equal(routeTravel.movement_step_count, 3);
assert.equal(routeTravel.configured_duration_seconds, 12);

const order = result.businessData.serviceOrders[0];
assert.ok(order.calculated_simulation_matched_at);
assert.ok(order.calculated_simulation_payment_completed_at);
assert.equal(order.simulation_status_transition_history.at(-1).to_status, "COMPLETED");
assert.deepEqual(order.simulation_status_transition_history.map((item) => item.to_status), [
  "WAITING_PRICE_ESTIMATE",
  "WAITING_ROBOTAXI_CALL",
  "WAITING_ROBOTAXI_ASSIGNMENT",
  "ON_THE_WAY_PICKUP",
  "WAITING_CUSTOMER_BOARDING",
  "CUSTOMER_ONBOARD",
  "ON_THE_WAY_DESTINATION",
  "ARRIVED_DESTINATION",
  "SETTLING",
  "WAITING_PAYMENT",
  "COMPLETED",
]);

const trip = result.businessData.trips[0];
assert.deepEqual(trip.simulation_status_transition_history.map((item) => item.to_status), [
  "WAITING_ROUTE",
  "ON_THE_WAY_PICKUP",
  "WAITING_CUSTOMER_BOARDING",
  "CUSTOMER_ONBOARD",
  "ON_THE_WAY_DESTINATION",
  "ARRIVED_DESTINATION",
  "COMPLETED",
]);
const orderArrival = order.simulation_status_transition_history.find((item) => item.to_status === "ARRIVED_DESTINATION");
const tripArrival = trip.simulation_status_transition_history.find((item) => item.to_status === "ARRIVED_DESTINATION");
assert.equal(orderArrival.calculated_simulation_status_changed_at, tripArrival.calculated_simulation_status_changed_at);

const fixedRule = profile.timing_rules.find((item) => item.workflow_transition_definition_id === "ROUTE_PLAN");
const updatedProfile = updateWorkflowTimingRule(profile, fixedRule.workflow_timing_rule_id, 9);
assert.equal(updatedProfile.profile_version, 2);
const updatedGroup = updatedProfile.timing_rules.filter((item) => item.timing_rule_group_id === fixedRule.timing_rule_group_id);
assert.equal(updatedGroup.length, 2);
assert.ok(updatedGroup.every((item) => item.configured_duration_seconds === 9));
assert.equal(fixedRule.configured_duration_seconds, 8);

const mainSource = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
assert.match(mainSource, /row\.duration_source_type === "INHERITED"\s*\? renderViewDetailAction/);
assert.match(mainSource, /if \(rule\.duration_source_type === "INHERITED"\) return;/);
assert.doesNotMatch(mainSource, /key: "timing", label: "时效计算"/);
assert.match(mainSource, /重算运营模拟时间/);
assert.match(mainSource, /OPERATING_SIMULATION_TIME_CALCULATION_COMPLETED/);

console.log("业务时效配置、跨单据依赖和状态时间线验证通过");
