import assert from "node:assert/strict";
import fs from "node:fs";

import { createBusinessTimingCalculation, initializeDefaultWorkflowTimingProfile } from "../src/data/businessTimingCalculator.js";
import { createCostCalculation, initializeDefaultCostModelProfile } from "../src/data/costModelCalculator.js";
import { createRevenueCalculation } from "../src/data/revenueCalculator.js";
import { createSimulationRunBusinessScope } from "../src/data/simulationRunBusinessScope.js";
import { validateFieldDisplayContract } from "../src/domain/fieldDisplayService.js";

const mainSource = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");

const fields = new Set();
const valueContexts = [];

collectArrayStringLiterals(/columns:\s*\[([^\]]*)\]/g, mainSource, fields);
collectArrayStringLiterals(/keys:\s*\[([^\]]*)\]/g, mainSource, fields);
collectArrayStringLiterals(/summaryItems\s*=\s*\[([^\]]*)\]/g, mainSource, fields);

const businessData = createSampleBusinessData();
const simulationRun = {
  simulation_run_id: "SIM-RUN-DISPLAY",
  simulation_timeline_id: "SIM-TL-DISPLAY",
  simulation_status: "COMPLETED",
  current_day: 1,
  current_time: "Day 1 00:20:00",
  current_day_tick: 20,
  current_global_tick: 20,
};
const scope = createSimulationRunBusinessScope(simulationRun, businessData);
const timingResult = createBusinessTimingCalculation({
  simulationRun,
  profile: initializeDefaultWorkflowTimingProfile(),
  businessData,
  scope,
  calculationRunId: "BTCR-DISPLAY",
});
const costResult = createCostCalculation({
  simulationRun,
  profile: initializeDefaultCostModelProfile(),
  businessData: { ...businessData, ...timingResult.businessData },
  scope: createSimulationRunBusinessScope(simulationRun, { ...businessData, ...timingResult.businessData }),
  calculationRunId: "CCR-DISPLAY",
});
const revenueResult = createRevenueCalculation({ simulationRun, scope, calculationRunId: "RCR-DISPLAY" });

[
  simulationRun,
  businessData,
  scope,
  timingResult.calculationRun,
  timingResult.businessData,
  costResult.calculationRun,
  costResult.costRecords,
  costResult.businessData,
  revenueResult.calculationRun,
  revenueResult.revenueRecords,
].forEach((value) => collectObjectKeys(value, fields, valueContexts));

const contract = validateFieldDisplayContract({
  fields: [...fields],
  values: valueContexts,
});

assert.deepEqual(contract.missingFields, [], `字段字典缺少中文字段名：\n${contract.missingFields.join("\n")}`);
assert.deepEqual(contract.missingValues, [], `值字典缺少中文枚举值：\n${contract.missingValues.join("\n")}`);
assert.match(mainSource, /fieldDisplayService\.js\?v=20260625-v029-2/, "主页面必须通过字段展示服务接入字段字典");
assert.doesNotMatch(mainSource, /import\("\.\/domain\/fieldDictionary\.js/, "主页面不得直接接入字段字典实现");

console.log("字段展示合同验证通过");

function collectArrayStringLiterals(pattern, source, target) {
  for (const match of source.matchAll(pattern)) {
    const values = match[1].match(/"([^"]+)"/g) || [];
    values.forEach((item) => target.add(item.slice(1, -1)));
  }
}

function collectObjectKeys(value, fieldTarget, valueTarget, parentKey = null) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectObjectKeys(item, fieldTarget, valueTarget, parentKey));
    return;
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "string") valueTarget.push({ field: parentKey, value });
    return;
  }
  Object.entries(value).forEach(([key, itemValue]) => {
    fieldTarget.add(key);
    if (typeof itemValue === "string") valueTarget.push({ field: key, value: itemValue });
    collectObjectKeys(itemValue, fieldTarget, valueTarget, key);
  });
}

function createSampleBusinessData() {
  const audit = {
    simulation_run_id: "SIM-RUN-DISPLAY",
    simulation_created_at: "Day 1 00:00:00",
  };
  return {
    routes: [
      { route_id: "R-OPS-DISPLAY", total_distance_m: 1200, route_usage_type: "OPERATIONAL_EXECUTION", route_steps: [{ cell_id: "C-1" }, { cell_id: "C-2" }, { cell_id: "C-3" }] },
      { route_id: "R-PICKUP-DISPLAY", total_distance_m: 800, route_usage_type: "SERVICE_PICKUP", route_steps: [{ cell_id: "C-3" }, { cell_id: "C-4" }] },
      { route_id: "R-DROP-DISPLAY", total_distance_m: 1600, route_usage_type: "SERVICE_DROPOFF", route_steps: [{ cell_id: "C-4" }, { cell_id: "C-5" }, { cell_id: "C-6" }] },
    ],
    readinessTasks: [{ task_id: "RC-DISPLAY", task_status: "COMPLETED", robotaxi_id: "RT-001", worker_id: "WK-001", ...audit }],
    deploymentTasks: [{ task_id: "DP-DISPLAY", task_status: "COMPLETED", route_execution_id: "RE-DISPLAY", robotaxi_id: "RT-002", worker_id: "WK-002", ...audit }],
    routeExecutions: [{ route_execution_id: "RE-DISPLAY", execution_status: "COMPLETED", deployment_task_id: "DP-DISPLAY", task_id: "DP-DISPLAY", robotaxi_id: "RT-002", route_id: "R-OPS-DISPLAY", total_step_count: 2, ...audit }],
    serviceOrders: [{ service_order_id: "SO-DISPLAY", order_status: "COMPLETED", trip_id: "TRIP-DISPLAY", customer_id: "CU-001", matched_robotaxi_id: "RT-003", final_price: 36, paid_amount: 30, simulation_completed_at: "Day 1 00:19:00", simulation_payment_completed_at: "Day 1 00:20:00", ...audit }],
    trips: [{ trip_id: "TRIP-DISPLAY", trip_status: "COMPLETED", service_order_id: "SO-DISPLAY", robotaxi_id: "RT-003", route_history: [{ route_id: "R-PICKUP-DISPLAY" }, { route_id: "R-DROP-DISPLAY" }], total_step_count: 3, ...audit }],
    pricingStrategyRuns: [],
    pricingDecisions: [],
    orderMatchingRuns: [],
    orderMatchingDecisions: [],
    routePlanningRuns: [],
    demandSimulationRuns: [],
    robotaxis: [{
      robotaxi_id: "RT-FLEET-DISPLAY",
      fleet_operation_status: "NEED_CLEANING",
      cleanliness_status: "NEEDS_CLEANING",
      battery_operation_status: "LOW",
      maintenance_status: "DUE_SOON",
      failure_status: "ALERTED",
      retirement_status: "RETIREMENT_CANDIDATE",
      operation_blocking_reason: "CLEANING_REQUIRED",
      pending_fleet_task_type: "CLEANING",
      pending_fleet_task_id: "CLN-DISPLAY",
      last_health_check_at: "2026-06-30T10:00:00.000Z",
    }],
    cleaningTasks: [{
      task_id: "CLN-DISPLAY",
      task_type: "CLEANING",
      task_status: "WAITING_WORKER_ASSIGNMENT",
      trigger_type: "TASK_RESULT",
      trigger_source: "FLEET_OPERATION_POLICY",
      trigger_object_type: "fleetOperationPolicy",
      trigger_object_id: "FOP-CLEANING-DISPLAY",
      fleet_operation_policy_run_id: "FOP-RUN-DISPLAY",
      robotaxi_id: "RT-FLEET-DISPLAY",
      target_ops_center_id: "OC-001",
      pending_since_at: "2026-06-30T10:00:00.000Z",
      clean_level_before: "NEEDS_CLEANING",
      clean_level_after: "CLEAN",
      operation_created_at: "2026-06-30T10:00:00.000Z",
      operation_completed_at: null,
    }],
    chargingTasks: [{
      task_id: "CHG-DISPLAY",
      task_type: "CHARGING",
      task_status: "READY_TO_CHARGE",
      robotaxi_id: "RT-FLEET-DISPLAY",
      battery_percent_before: 18,
      target_battery_percent: 90,
      battery_percent_after: null,
      charger_id: "CHARGER-001",
      charging_started_at: null,
      charging_completed_at: null,
    }],
    maintenanceTasks: [{
      task_id: "MNT-DISPLAY",
      task_type: "MAINTENANCE",
      task_status: "IN_PROGRESS",
      robotaxi_id: "RT-FLEET-DISPLAY",
      maintenance_type: "SENSOR",
      failure_source_task_id: "FAIL-DISPLAY",
      maintenance_bay_id: "BAY-001",
      diagnosis_summary: "传感器校准异常",
      repair_result: "PARTIALLY_REPAIRED",
      requires_readiness_check: true,
    }],
    failureHandlingTasks: [{
      task_id: "FAIL-DISPLAY",
      task_type: "FAILURE_HANDLING",
      task_status: "WAITING_DISPOSITION",
      robotaxi_id: "RT-FLEET-DISPLAY",
      failure_event_id: "FE-001",
      failure_type: "SENSOR",
      failure_severity: "MEDIUM",
      allow_current_service_completion: true,
      diagnosis_result: "NEEDS_MAINTENANCE",
      disposition_result: "NEEDS_MAINTENANCE",
      maintenance_task_id: "MNT-DISPLAY",
      retirement_task_id: null,
    }],
    retirementTasks: [{
      task_id: "RET-DISPLAY",
      task_type: "RETIREMENT",
      task_status: "WAITING_RETIREMENT_APPROVAL",
      robotaxi_id: "RT-FLEET-DISPLAY",
      retirement_reason: "NOT_REPAIRABLE",
      approval_status: "PENDING",
      asset_exit_result: "WAIT_MANUAL_DECISION",
      operation_completed_at: null,
    }],
    fleetOperationPolicies: [{
      fleet_operation_policy_id: "FOP-CLEANING-DISPLAY",
      policy_name: "低峰清洁策略",
      policy_type: "CLEANING",
      target_task_type: "CLEANING",
      policy_status: "ACTIVE",
      policy_version: "1.0.0",
      execution_scope: "ALL_ROBOTAXI",
      policy_parameters: {
        low_peak_start_time: "10:00",
        low_peak_end_time: "16:00",
        service_order_count_threshold: 8,
        service_duration_minutes_threshold: 360,
      },
      low_peak_start_time: "10:00",
      low_peak_end_time: "16:00",
      service_order_count_threshold: 8,
      service_duration_minutes_threshold: 360,
      battery_percent_threshold: null,
      maintenance_due_days_threshold: null,
      failure_severity_threshold: null,
      retirement_score_threshold: null,
    }],
    fleetOperationPolicyRuns: [{
      fleet_operation_policy_run_id: "FOP-RUN-DISPLAY",
      fleet_operation_policy_id: "FOP-CLEANING-DISPLAY",
      policy_version: "1.0.0",
      policy_type: "CLEANING",
      target_task_type: "CLEANING",
      run_status: "NO_ACTION",
      trigger_type: "MANUAL",
      execution_scope: "ALL_ROBOTAXI",
      policy_snapshot: {
        fleet_operation_policy_id: "FOP-CLEANING-DISPLAY",
        policy_type: "CLEANING",
        target_task_type: "CLEANING",
        policy_parameters: { service_order_count_threshold: 8 },
      },
      candidate_robotaxi_ids: [],
      generated_task_ids: [],
      generated_task_count: 0,
      skipped_robotaxi_count: 0,
      no_action_reason: "NO_CANDIDATE_ROBOTAXI",
      result_summary: "当前无符合条件的 Robotaxi",
    }],
    fleetOperationPolicyResults: [{
      fleet_operation_policy_result_id: "FOP-RESULT-DISPLAY",
      fleet_operation_policy_run_id: "FOP-RUN-DISPLAY",
      fleet_operation_policy_id: "FOP-CLEANING-DISPLAY",
      policy_type: "CLEANING",
      target_task_type: "CLEANING",
      robotaxi_id: "RT-FLEET-DISPLAY",
      result_status: "TASK_CREATED",
      result_reason: "TASK_CREATED",
      task_id: "CLN-DISPLAY",
      task_type: "CLEANING",
      robotaxi_snapshot: { robotaxi_id: "RT-FLEET-DISPLAY", cleanliness_status: "NEEDS_CLEANING" },
      created_at: "2026-06-30T10:00:00.000Z",
    }],
    robotaxiTaskPlanningStrategies: [{
      robotaxi_task_planning_strategy_id: "RTPS-DISPLAY",
      strategy_name: "标准任务规划",
      strategy_status: "ACTIVE",
      planning_algorithm: "ROBOTAXI_STATE_TASK_PLANNING",
      priority_rank: { CLEANING: 60, CHARGING: 70, MAINTENANCE: 80 },
      queue_policy: {
        allow_queue_when_service_order_active: true,
        allow_queue_when_deployment_active: true,
        allow_queue_when_fleet_operation_active: true,
        max_queue_size: 5,
      },
      phase_rules: {
        FIRST_ADMISSION: ["READINESS_CHECK"],
        READY_NOT_DEPLOYED: ["DEPLOYMENT", "SERVICE_ORDER"],
        ACTIVE_OPERATION: ["DEPLOYMENT", "SERVICE_ORDER", "CLEANING", "CHARGING", "MAINTENANCE"],
      },
      compatibility_rules: { CLEANING: ["CHARGING"], CHARGING: ["CLEANING"] },
      failure_trigger_policy: "MOVING_ONLY",
      external_assignment_queue_policy: "INTERNAL_QUEUE_FIRST",
    }],
    robotaxiTaskPlanningRuns: [{
      robotaxi_task_planning_run_id: "TPR-DISPLAY",
      robotaxi_task_planning_strategy_id: "RTPS-DISPLAY",
      strategy_name: "标准任务规划",
      robotaxi_id: "RT-FLEET-DISPLAY",
      requested_assignment_type: "FLEET_OPERATION_TASK",
      requested_task_type: "CLEANING",
      trigger_source: "DIRECT_ROBOTAXI_OPERATION",
      trigger_object_type: "robotaxi",
      trigger_object_id: "RT-FLEET-DISPLAY",
      run_status: "SUCCEEDED",
      planning_decision: "QUEUE",
      decision_reason: "WAIT_CURRENT_ASSIGNMENT_COMPLETION",
      composite_state: {
        lifecycle_stage: "IN_OPERATION",
        operation_phase: "ACTIVE_OPERATION",
        operation_status: "UNAVAILABLE",
        vehicle_motion_state: "MOVING",
        current_assignment_state: "SERVICE_ORDER",
        has_operational_history: true,
        has_readiness_history: true,
        open_fleet_task_count: 0,
        pending_queue_size: 1,
      },
      strategy_snapshot: {
        robotaxi_task_planning_strategy_id: "RTPS-DISPLAY",
        planning_algorithm: "ROBOTAXI_STATE_TASK_PLANNING",
        queue_policy: {
          allow_queue_when_service_order_active: true,
          allow_queue_when_deployment_active: true,
          allow_queue_when_fleet_operation_active: true,
          max_queue_size: 5,
        },
      },
      input_snapshot: {
        robotaxi_id: "RT-FLEET-DISPLAY",
        requested_assignment_type: "FLEET_OPERATION_TASK",
        requested_task_type: "CLEANING",
        trigger_source: "DIRECT_ROBOTAXI_OPERATION",
      },
      output_snapshot: {
        allowed: true,
        decision: "QUEUE",
        reason: "WAIT_CURRENT_ASSIGNMENT_COMPLETION",
        queue_entry: { task_type: "CLEANING", priority: 60 },
      },
    }],
    robotaxiTaskPlanningResults: [{
      robotaxi_task_planning_result_id: "TPRS-DISPLAY",
      robotaxi_task_planning_run_id: "TPR-DISPLAY",
      robotaxi_task_planning_strategy_id: "RTPS-DISPLAY",
      robotaxi_id: "RT-FLEET-DISPLAY",
      requested_assignment_type: "FLEET_OPERATION_TASK",
      requested_task_type: "CLEANING",
      decision_result: "PLANNING_QUEUED",
      planning_decision: "QUEUE",
      decision_reason: "WAIT_CURRENT_ASSIGNMENT_COMPLETION",
      queue_entry: { task_type: "CLEANING", priority: 60 },
      composite_state: {
        lifecycle_stage: "IN_OPERATION",
        operation_phase: "ACTIVE_OPERATION",
        operation_status: "UNAVAILABLE",
        vehicle_motion_state: "MOVING",
        current_assignment_state: "SERVICE_ORDER",
      },
    }],
  };
}
