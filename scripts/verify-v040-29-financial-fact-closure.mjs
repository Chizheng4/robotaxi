import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as businessActionService from "../src/services/businessActionService.js";
import * as businessTimingCalculator from "../src/data/businessTimingCalculator.js";
import * as costModelCalculator from "../src/data/costModelCalculator.js";
import * as revenueCalculator from "../src/data/revenueCalculator.js";
import { workflowTransitionRegistry } from "../src/domain/workflowTransitionRegistry.js";

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function createRuntime() {
  let sequence = 1;
  const profile = businessTimingCalculator.initializeDefaultWorkflowTimingProfile();
  return {
    nextId(prefix = "ID") {
      return `${prefix}-${String(sequence++).padStart(4, "0")}`;
    },
    timeContext: { time_mode: "SIMULATION", simulation_run_id: "SIM-VERIFY", simulation_timeline_id: "TL-VERIFY", simulation_seconds: 3600 },
    now: () => "2026-07-06T00:00:00.000Z",
    simulationTime: () => "Day 1 01:00:00",
    randomSeed: () => "VERIFY",
    audit: (options = {}) => ({
      record_source: "VERIFY",
      updated_at: "2026-07-06T00:00:00.000Z",
      ...(options.created ? { created_at: "2026-07-06T00:00:00.000Z" } : {}),
      ...(options.completed ? { completed_at: "2026-07-06T00:00:00.000Z" } : {}),
    }),
    workflowTimingProfile: profile,
    context: { trigger_source: "VERIFY" },
  };
}

function verifyReadinessCostProjection() {
  const runtime = createRuntime();
  const state = {
    data: { robotaxis: [] },
    costModelProfiles: [costModelCalculator.initializeDefaultCostModelProfile()],
    costRecords: [],
    readinessTasks: [{
      task_id: "TASK-RC-VERIFY",
      task_type: "READINESS_CHECK",
      task_status: "CHECKING",
      robotaxi_id: "RTX-VERIFY",
      worker_id: "WK-VERIFY",
      simulation_status_transition_history: [{
        status_transition_id: "ST-0001",
        transition_sequence: 1,
        business_object_type: "readinessTask",
        business_object_id: "TASK-RC-VERIFY",
        from_status: "WAITING_CHECK",
        action_type: "READINESS_TASK_START",
        to_status: "CHECKING",
        simulation_status_changed_at: "Day 1 00:59:30",
        configured_duration_seconds: 30,
      }],
    }],
    robotaxis: [{
      robotaxi_id: "RTX-VERIFY",
      availability_status: "PENDING_ADMISSION",
      current_task_id: "TASK-RC-VERIFY",
      current_task_type: "READINESS_CHECK",
      current_task_status: "CHECKING",
    }],
  };
  const result = businessActionService.passReadinessTask({ state, objectId: "TASK-RC-VERIFY", runtime });
  assert.equal(result.success, true);
  assert.ok(result.updates.costRecords.length > 0, "准入任务完成必须生成成本记录");
  assert.ok(Number(result.updates.readinessTasks[0].total_cost_amount) > 0, "准入任务对象必须回填成本摘要");
  assert.ok(result.updates.readinessTasks[0].cost_calculation_run_id, "准入任务对象必须回填成本计算批次");
}

function verifyRouteExecutionCostProjection() {
  const runtime = createRuntime();
  const routeExecution = {
    route_execution_id: "REX-VERIFY",
    execution_status: "ARRIVED",
    task_id: "TASK-DP-VERIFY",
    deployment_task_id: "TASK-DP-VERIFY",
    task_type: "DEPLOYMENT",
    robotaxi_id: "RTX-VERIFY",
    route_id: "DRT-VERIFY",
    current_cell_id: "C-1-2",
    target_cell_id: "C-1-2",
    distance_traveled_km: 1.2,
    battery_consumed_kwh: 0.2,
    simulation_status_transition_history: [{
      status_transition_id: "ST-0001",
      transition_sequence: 1,
      business_object_type: "routeExecution",
      business_object_id: "REX-VERIFY",
      from_status: "MOVING",
      action_type: "ROUTE_EXECUTION_STEP",
      to_status: "ARRIVED",
      simulation_status_changed_at: "Day 1 00:59:56",
      configured_duration_seconds: 4,
    }],
  };
  const state = {
    data: { routes: [{ route_id: "DRT-VERIFY", total_distance_m: 1200 }] },
    costModelProfiles: [costModelCalculator.initializeDefaultCostModelProfile()],
    costRecords: [],
    routeExecutions: [routeExecution],
    deploymentTasks: [{
      task_id: "TASK-DP-VERIFY",
      task_type: "DEPLOYMENT",
      task_status: "ARRIVED",
      robotaxi_id: "RTX-VERIFY",
      route_execution_id: "REX-VERIFY",
      simulation_status_transition_history: routeExecution.simulation_status_transition_history,
    }],
    robotaxis: [{ robotaxi_id: "RTX-VERIFY", current_cell_id: "C-1-1", motion_status: "MOVING" }],
    routes: [{ route_id: "DRT-VERIFY", total_distance_m: 1200 }],
  };
  const result = businessActionService.confirmRouteExecutionArrival({ state, objectId: "REX-VERIFY", runtime });
  assert.equal(result.success, true);
  const projectedExecution = result.updates.routeExecutions.find((item) => item.route_execution_id === "REX-VERIFY");
  assert.ok(Number(projectedExecution.total_cost_amount) > 0, "运营行驶记录必须回填成本摘要");
  assert.ok(Number(result.updates.deploymentTasks[0].total_cost_amount) > 0, "投放任务必须聚合自身和行驶成本");
  assert.ok(
    Number(result.updates.deploymentTasks[0].total_cost_amount) >= Number(projectedExecution.total_cost_amount),
    "父任务单成本摘要不得小于关联运营行驶记录成本",
  );
}

function verifyRevenueProjection() {
  const simulationRun = { simulation_run_id: "SIM-VERIFY", simulation_timeline_id: "TL-VERIFY", simulation_status: "COMPLETED" };
  const order = {
    service_order_id: "SO-VERIFY",
    customer_id: "CU-VERIFY",
    matched_robotaxi_id: "RTX-VERIFY",
    order_status: "COMPLETED",
    final_price: 88,
    paid_amount: 88,
    simulation_payment_completed_at: "Day 1 01:00:00",
  };
  const result = revenueCalculator.createRevenueCalculation({
    simulationRun,
    scope: { serviceOrders: [order] },
    calculationRunId: "RCR-VERIFY",
  });
  assert.equal(result.revenueRecords.length, 2);
  assert.equal(result.businessData.serviceOrders[0].total_collected_revenue_amount, 88);
  assert.equal(result.businessData.serviceOrders[0].total_receivable_revenue_amount, 88);
}

function verifyWorkflowTransitions() {
  const required = [
    "CLEANING_DESTINATION_ASSIGN",
    "CLEANING_ROUTE_PLAN",
    "CLEANING_ROUTE_MOVE",
    "CLEANING_ROUTE_ARRIVAL",
    "CHARGING_DESTINATION_ASSIGN",
    "CHARGING_ROUTE_PLAN",
    "CHARGING_ROUTE_MOVE",
    "CHARGING_ROUTE_ARRIVAL",
    "MAINTENANCE_DESTINATION_ASSIGN",
    "MAINTENANCE_ROUTE_PLAN",
    "MAINTENANCE_ROUTE_MOVE",
    "MAINTENANCE_ROUTE_ARRIVAL",
  ];
  const ids = new Set(workflowTransitionRegistry.map((item) => item.workflow_transition_definition_id));
  required.forEach((id) => assert.ok(ids.has(id), `缺少工作流状态边 ${id}`));
}

function verifyStaticContracts() {
  const main = read("src/main.jsx");
  assert.match(main, /function summarizeCostRecords/, "前端展示必须从成本记录兜底聚合成本摘要");
  assert.match(main, /function attachRevenueRecords/, "前端展示必须从收入记录兜底聚合收入摘要");
  const actionService = read("src/services/businessActionService.js");
  assert.match(actionService, /replaceFinancialSourceInUpdates/, "业务动作服务必须把成本收入事实回填到来源对象");
  const fieldDictionary = read("src/domain/fieldDictionary.js");
  ["CLEANING_ROUTE_ARRIVAL", "CHARGING_ROUTE_ARRIVAL", "MAINTENANCE_ROUTE_ARRIVAL", "revenue_calculated_at", "cost_records", "revenue_records"].forEach((token) => {
    assert.ok(fieldDictionary.includes(token), `字段字典缺少 ${token}`);
  });
}

verifyReadinessCostProjection();
verifyRouteExecutionCostProjection();
verifyRevenueProjection();
verifyWorkflowTransitions();
verifyStaticContracts();

console.log("v040.29 business financial fact closure verification passed");
