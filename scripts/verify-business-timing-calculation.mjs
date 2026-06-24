import assert from "node:assert/strict";

import {
  createBusinessTimingCalculation,
  initializeDefaultWorkflowTimingProfile,
  updateWorkflowTimingRule,
} from "../src/data/businessTimingCalculator.js";

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

const trip = result.businessData.trips[0];
const orderArrival = order.simulation_status_transition_history.find((item) => item.to_status === "ARRIVED_DESTINATION");
const tripArrival = trip.simulation_status_transition_history.find((item) => item.to_status === "ARRIVED_DESTINATION");
assert.equal(orderArrival.calculated_simulation_status_changed_at, tripArrival.calculated_simulation_status_changed_at);

const fixedRule = profile.timing_rules.find((item) => item.workflow_timing_rule_id === "WTR-001");
const updatedProfile = updateWorkflowTimingRule(profile, fixedRule.workflow_timing_rule_id, 9);
assert.equal(updatedProfile.profile_version, 2);
assert.equal(updatedProfile.timing_rules[0].configured_duration_seconds, 9);
assert.equal(profile.timing_rules[0].configured_duration_seconds, 3);

console.log("业务时效配置、跨单据依赖和状态时间线验证通过");
