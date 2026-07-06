import assert from "node:assert/strict";
import fs from "node:fs";
import { initializeDefaultWorkflowTimingProfile } from "../src/data/businessTimingCalculator.js";
import { TaskType, FleetOperationTaskStatus } from "../src/domain/taskTypes.js";
import * as fleetOperationTaskService from "../src/services/fleetOperationTaskService.js";

const mainSource = fs.readFileSync("src/main.jsx", "utf8");
const businessActionSource = fs.readFileSync("src/services/businessActionService.js", "utf8");
const fleetOperationSource = fs.readFileSync("src/services/fleetOperationTaskService.js", "utf8");
const workflowRegistrySource = fs.readFileSync("src/domain/workflowTransitionRegistry.js", "utf8");

[
  'import("./services/businessActionService.js?v=20260706-v040-28")',
  "function runManualBusinessAction(action)",
  "businessActionService.executeOrderMatching",
  "businessActionService.advanceTrip",
  "businessActionService.completeTripTravel",
  "businessActionService.settleServiceOrder",
  "businessActionService.payServiceOrder",
  "businessActionService.executeRoutePlanning",
  "businessActionService.advanceRouteExecution",
  "businessActionService.completeRouteExecutionTravel",
  "businessActionService.confirmRouteExecutionArrival",
  "completeTripTravelNow",
].forEach((snippet) => {
  assert.ok(mainSource.includes(snippet), `主页面必须通过服务层闭环接入：${snippet}`);
});

assert.ok(
  mainSource.includes("<RowActionButton type=\"default\" onClick={() => actions.completeTripTravelNow(row.trip_id)}>自动到达</RowActionButton>"),
  "履约行驶记录必须和运营行驶记录一样提供自动到达入口",
);

assert.ok(
  businessActionSource.includes("nextTaskPlanningRunId: () => runtime.nextId(\"TPR\")")
    && businessActionSource.includes("nextTaskPlanningResultId: () => runtime.nextId(\"TPRS\")"),
  "服务订单人工匹配必须保留任务规划执行与结果复盘",
);

assert.ok(
  fleetOperationSource.includes("resolveTimingRuleDuration")
    && fleetOperationSource.includes("workflowTimingProfile: context.workflowTimingProfile"),
  "运维任务生命周期必须从工作流时效配置解析动作耗时",
);

[
  "CLEANING_WORK_COMPLETE",
  "CHARGING_COMPLETE",
  "CHARGING_DISCONNECT",
  "MAINTENANCE_WORK_COMPLETE",
  "FAILURE_DIAGNOSIS_COMPLETE",
  "RETIREMENT_PROCESS_COMPLETE",
].forEach((transitionId) => {
  assert.ok(workflowRegistrySource.includes(transitionId), `工作流时效配置缺少运维动作：${transitionId}`);
});

const workflowTimingProfile = initializeDefaultWorkflowTimingProfile();
const cleaningRule = workflowTimingProfile.timing_rules.find((rule) =>
  rule.business_object_type === "cleaningTask"
  && rule.from_status === FleetOperationTaskStatus.CLEANING_IN_PROGRESS
  && rule.action_type === "FLEET_OPERATION_WORK_COMPLETE"
);
assert.ok(cleaningRule, "默认工作流时效配置必须包含清洁完成规则");
assert.equal(cleaningRule.configured_duration_seconds, 600);

const task = {
  task_id: "TASK-FOP-V04028",
  task_type: TaskType.CLEANING,
  task_status: FleetOperationTaskStatus.CLEANING_IN_PROGRESS,
  robotaxi_id: "RTX-V04028",
  worker_id: "WK-V04028",
  simulation_status_transition_history: [],
};
const robotaxi = {
  robotaxi_id: "RTX-V04028",
  availability_status: "MAINTENANCE",
  operation_status: "IN_FLEET_OPERATION",
  current_task_id: task.task_id,
  current_task_type: task.task_type,
  current_task_status: task.task_status,
};

const completed = fleetOperationTaskService.completeFleetOperationWork({
  task,
  robotaxi,
  context: {
    now: () => "2026-07-06T00:00:00.000Z",
    workflowTimingProfile,
    businessData: {},
    costRecords: [],
    nextCostFactRunId: () => "CFR-V04028",
  },
});

assert.equal(completed.succeeded, true);
const transition = completed.task.simulation_status_transition_history.at(-1);
assert.equal(transition.workflow_timing_rule_id, cleaningRule.workflow_timing_rule_id);
assert.equal(transition.configured_duration_seconds, cleaningRule.configured_duration_seconds);

console.log("v040.28 业务单据底层闭环与工作流时效合同验证通过");
