import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as businessActionService from "../src/services/businessActionService.js";
import * as fleetOperationTaskService from "../src/services/fleetOperationTaskService.js";
import { initializeMapSpace } from "../src/data/mapInitialization.js";
import { initializeOperationsCenter } from "../src/data/operationsCenterInitialization.js";
import { initializeDemandSimulation } from "../src/data/demandSimulationInitialization.js";
import { initializeCustomers } from "../src/data/customerInitialization.js";
import { initializePricing } from "../src/data/pricingInitialization.js";
import { initializeOrderMatching } from "../src/data/orderMatchingInitialization.js";
import { initializeDefaultWorkflowTimingProfile } from "../src/data/businessTimingCalculator.js";
import * as costModelCalculator from "../src/data/costModelCalculator.js";
import { getCurrentNormalStatusValues, getLegacyCompatStatusValues } from "../src/domain/statusRegistry.js";
import { TaskType } from "../src/domain/taskTypes.js";
import * as robotaxiTaskPlanningService from "../src/services/robotaxiTaskPlanningService.js";

const root = process.cwd();
const now = "2026-07-06T00:00:00.000Z";

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function context(extra = {}) {
  let sequence = 1;
  return {
    now,
    audit: (options = {}) => ({
      record_source: "VERIFY",
      updated_at: now,
      ...(options.created ? { created_at: now } : {}),
    }),
    nextId: (prefix = "ID") => `${prefix}-${String(sequence++).padStart(4, "0")}`,
    costModelProfile: costModelCalculator.initializeDefaultCostModelProfile(),
    costRecords: [],
    businessData: {},
    ...extra,
  };
}

function actionRuntime(extra = {}) {
  let sequence = 1;
  return {
    nextId: (prefix = "ID") => `${prefix}-${String(sequence++).padStart(4, "0")}`,
    timeContext: { time_mode: "REAL_TIME", simulation_run_id: null, simulation_timeline_id: null, simulation_seconds: 0 },
    now: () => now,
    simulationTime: () => now,
    randomSeed: () => "VERIFY-SEED",
    audit: (options = {}) => ({
      record_source: "VERIFY",
      updated_at: now,
      ...(options.created ? { created_at: now } : {}),
      ...(options.completed ? { completed_at: now } : {}),
    }),
    workflowTimingProfile: initializeDefaultWorkflowTimingProfile(),
    context: { trigger_source: "VERIFY", ...(extra.context || {}) },
    ...extra,
  };
}

function createBaseBusinessState() {
  const mapData = initializeMapSpace();
  const opsData = initializeOperationsCenter();
  return {
    data: {
      ...mapData,
      ...opsData,
      ...initializeDemandSimulation(),
      ...initializeCustomers(),
      ...initializePricing(),
      ...initializeOrderMatching(),
      robotaxiTaskPlanningStrategies: robotaxiTaskPlanningService.initializeDefaultRobotaxiTaskPlanningStrategies(now),
      costModelProfiles: [costModelCalculator.initializeDefaultCostModelProfile()],
      routes: [],
    },
    ...opsData,
    routes: [],
    readinessTasks: [],
    deploymentTasks: [],
    routeExecutions: [],
    serviceOrders: [],
    trips: [],
    demandSimulationRuns: [],
    pricingStrategyRuns: [],
    pricingDecisions: [],
    orderMatchingRuns: [],
    orderMatchingDecisions: [],
    robotaxiTaskPlanningRuns: [],
    robotaxiTaskPlanningResults: [],
    timedOperations: [],
    costModelProfiles: [costModelCalculator.initializeDefaultCostModelProfile()],
    costRecords: [],
    revenueRecords: [],
    workflowTimingProfiles: [initializeDefaultWorkflowTimingProfile()],
  };
}

function applyUpdates(state, updates = {}) {
  return {
    ...state,
    ...updates,
    data: {
      ...(state.data || {}),
      ...(updates.robotaxis ? { robotaxis: updates.robotaxis } : {}),
      ...(updates.workers ? { workers: updates.workers } : {}),
      ...(updates.routes ? { routes: updates.routes } : {}),
      ...(updates.readinessTasks ? { readinessTasks: updates.readinessTasks } : {}),
      ...(updates.deploymentTasks ? { deploymentTasks: updates.deploymentTasks } : {}),
      ...(updates.routeExecutions ? { routeExecutions: updates.routeExecutions } : {}),
      ...(updates.serviceOrders ? { serviceOrders: updates.serviceOrders } : {}),
      ...(updates.trips ? { trips: updates.trips } : {}),
      ...(updates.costRecords ? { costRecords: updates.costRecords } : {}),
      ...(updates.revenueRecords ? { revenueRecords: updates.revenueRecords } : {}),
    },
  };
}

function assertHasInitialTimeline(object, statusField, expectedStatus, objectType) {
  assert.equal(object[statusField], expectedStatus);
  const first = object.simulation_status_transition_history?.[0];
  assert.ok(first, `${objectType} 必须有首态时间线`);
  assert.equal(first.from_status, null, `${objectType} 首态 from_status 必须为空`);
  assert.equal(first.to_status, expectedStatus, `${objectType} 首态 to_status 不正确`);
}

const opsCenters = [{
  ops_center_id: "OC-VERIFY",
  service_area_ids: ["SA-VERIFY"],
  can_receive_robotaxi: true,
  can_repair_robotaxi: true,
  cell_ids: ["C-RETIRE-1", "C-REPAIR-1"],
  operation_capability_zones: [
    { task_type: TaskType.RETIREMENT, work_cell_ids: ["C-RETIRE-1"], parking_cell_ids: [] },
    { task_type: TaskType.FAILURE_HANDLING, work_cell_ids: ["C-REPAIR-1"], parking_cell_ids: [] },
  ],
}];

function robotaxi(fields = {}) {
  return {
    robotaxi_id: "RTX-VERIFY",
    current_cell_id: "C-RETIRE-1",
    availability_status: "IN_FLEET_OPERATION",
    available_for_dispatch: false,
    current_task_id: "TASK-RET-VERIFY",
    current_task_type: TaskType.RETIREMENT,
    current_task_status: "WAITING_RETIREMENT_APPROVAL",
    fleet_operation_status: "IN_RETIREMENT",
    ...fields,
  };
}

function retirementTask(fields = {}) {
  return {
    task_id: "TASK-RET-VERIFY",
    task_type: TaskType.RETIREMENT,
    task_status: "WAITING_RETIREMENT_APPROVAL",
    robotaxi_id: "RTX-VERIFY",
    approval_status: "PENDING",
    simulation_status_transition_history: [],
    ...fields,
  };
}

function verifyRetirementApproveAtCenter() {
  const result = fleetOperationTaskService.confirmRetirementTask({
    task: retirementTask(),
    robotaxi: robotaxi(),
    opsCenters,
    context: context(),
  });
  assert.equal(result.succeeded, true);
  assert.equal(result.task.task_status, "PROCESSING_RETIREMENT");
  assert.equal(result.task.approval_status, "APPROVED");
  assert.equal(result.robotaxi.availability_status, "IN_FLEET_OPERATION");
  assert.equal(result.robotaxi.fleet_operation_status, "IN_RETIREMENT");
  assert.equal(result.task.simulation_status_transition_history.at(-1).action_type, "FLEET_OPERATION_RETIREMENT_APPROVE");
}

function verifyRetirementApproveNeedsDestination() {
  const result = fleetOperationTaskService.confirmRetirementTask({
    task: retirementTask(),
    robotaxi: robotaxi({ current_cell_id: "C-OUTSIDE" }),
    opsCenters,
    context: context(),
  });
  assert.equal(result.succeeded, true);
  assert.equal(result.task.task_status, "WAITING_DESTINATION_ASSIGNMENT");
  assert.equal(result.task.approval_status, "APPROVED");
  assert.equal(result.task.target_cell_id, null);
}

function verifyRetirementRejectRestoresRobotaxi() {
  const result = fleetOperationTaskService.rejectRetirementTask({
    task: retirementTask(),
    robotaxi: robotaxi(),
    context: context(),
  });
  assert.equal(result.succeeded, true);
  assert.equal(result.task.task_status, "CANCELLED");
  assert.equal(result.task.approval_status, "REJECTED");
  assert.equal(result.robotaxi.availability_status, "AVAILABLE");
  assert.equal(result.robotaxi.available_for_dispatch, true);
  assert.equal(result.task.simulation_status_transition_history.at(-1).action_type, "FLEET_OPERATION_RETIREMENT_REJECT");
}

function verifyRetirementCompleteRetiresRobotaxi() {
  const task = retirementTask({ task_status: "PROCESSING_RETIREMENT", approval_status: "APPROVED" });
  const result = fleetOperationTaskService.completeFleetOperationWork({
    task,
    robotaxi: robotaxi({ current_task_status: "PROCESSING_RETIREMENT" }),
    context: context({ businessData: { routes: [] } }),
  });
  assert.equal(result.succeeded, true);
  assert.equal(result.task.task_status, "COMPLETED");
  assert.equal(result.robotaxi.availability_status, "RETIRED");
  assert.equal(result.robotaxi.fleet_operation_status, "RETIRED");
}

function verifyFailureCompletesToAvailableWithCost() {
  const task = {
    task_id: "TASK-FHL-VERIFY",
    task_type: TaskType.FAILURE_HANDLING,
    task_status: "DIAGNOSING",
    robotaxi_id: "RTX-VERIFY",
    worker_id: "WK-VERIFY",
    simulation_status_transition_history: [{
      status_transition_id: "ST-VERIFY",
      transition_sequence: 1,
      business_object_type: "failureHandlingTask",
      business_object_id: "TASK-FHL-VERIFY",
      from_status: "WAITING_DIAGNOSIS_ASSIGNMENT",
      action_type: "FLEET_OPERATION_WORKER_ASSIGN",
      to_status: "DIAGNOSING",
      configured_duration_seconds: 900,
    }],
  };
  const result = fleetOperationTaskService.completeFleetOperationWork({
    task,
    robotaxi: robotaxi({
      current_task_id: task.task_id,
      current_task_type: TaskType.FAILURE_HANDLING,
      current_task_status: "DIAGNOSING",
      fleet_operation_status: "BROKEN",
    }),
    context: context(),
  });
  assert.equal(result.succeeded, true);
  assert.equal(result.task.task_status, "COMPLETED");
  assert.equal(result.robotaxi.availability_status, "AVAILABLE");
  assert.ok(Array.isArray(result.costRecords) && result.costRecords.length > 0, "故障处理完成必须生成成本记录");
}

function verifyReadinessServiceLifecycle() {
  let state = createBaseBusinessState();
  const runtime = actionRuntime({ context: { trigger_type: "MANUAL" } });
  const created = businessActionService.createReadinessTask({ state, runtime });
  assert.equal(created.success, true);
  state = applyUpdates(state, created.updates);
  const taskId = created.data.objectId;
  assertHasInitialTimeline(state.readinessTasks[0], "task_status", "WAITING_ASSIGNMENT", "readinessTask");

  const assigned = businessActionService.assignReadinessTask({ state, objectId: taskId, runtime });
  assert.equal(assigned.success, true);
  state = applyUpdates(state, assigned.updates);
  assert.equal(state.workers.find((item) => item.current_task_id === taskId)?.worker_status, "BUSY", "准入分配必须由服务层占用 Worker");

  const started = businessActionService.startReadinessTask({ state, objectId: taskId, runtime });
  assert.equal(started.success, true);
  state = applyUpdates(state, started.updates);
  assert.equal(state.readinessTasks.find((item) => item.task_id === taskId).task_status, "CHECKING");

  const passed = businessActionService.passReadinessTask({ state, objectId: taskId, runtime });
  assert.equal(passed.success, true);
  state = applyUpdates(state, passed.updates);
  const completedTask = state.readinessTasks.find((item) => item.task_id === taskId);
  assert.equal(completedTask.task_status, "COMPLETED");
  assert.ok(Number(completedTask.total_cost_amount) > 0, "准入任务完成必须回填成本摘要");
  assert.equal(state.workers.find((item) => item.worker_id === completedTask.worker_id)?.worker_status, "IDLE", "准入完成必须释放 Worker");
}

function verifyDeploymentCreationServiceLifecycle() {
  let state = createBaseBusinessState();
  state.robotaxis = state.robotaxis.map((item, index) => index === 0 ? {
    ...item,
    availability_status: "AVAILABLE",
    available_for_dispatch: true,
    current_task_id: null,
    current_task_type: null,
    current_task_status: null,
  } : item);
  state.data = { ...state.data, robotaxis: state.robotaxis };
  const result = businessActionService.createDeploymentTask({
    state,
    runtime: actionRuntime({ context: { trigger_type: "MANUAL", source_type: "MANUAL_OPERATION" } }),
  });
  assert.equal(result.success, true);
  const task = result.updates.deploymentTasks[0];
  const execution = result.updates.routeExecutions[0];
  assertHasInitialTimeline(task, "task_status", "WAITING_START", "deploymentTask");
  assertHasInitialTimeline(execution, "execution_status", "WAITING_ROUTE", "routeExecution");
  assert.equal(execution.task_id, task.task_id, "投放任务必须关联同一运营行驶记录");
}

function createDeploymentActionState() {
  let state = createBaseBusinessState();
  state.robotaxis = state.robotaxis.map((item, index) => index === 0 ? {
    ...item,
    availability_status: "AVAILABLE",
    available_for_dispatch: true,
    current_task_id: null,
    current_task_type: null,
    current_task_status: null,
  } : item);
  state.data = { ...state.data, robotaxis: state.robotaxis };
  return state;
}

function verifyRouteExecutionServiceLifecycle() {
  let state = createDeploymentActionState();
  const runtime = actionRuntime({ context: { trigger_type: "MANUAL", source_type: "MANUAL_OPERATION" } });
  const created = businessActionService.createDeploymentTask({ state, runtime });
  assert.equal(created.success, true);
  state = applyUpdates(state, created.updates);
  const executionId = created.data.routeExecutionId;

  const planned = businessActionService.executeRoutePlanning({ state, objectType: "routeExecution", objectId: executionId, runtime });
  assert.equal(planned.success, true);
  state = applyUpdates(state, planned.updates);
  const movingExecution = state.routeExecutions.find((item) => item.route_execution_id === executionId);
  assert.equal(movingExecution.execution_status, "MOVING");
  assert.ok(movingExecution.simulation_status_transition_history.some((item) => item.action_type === "ROUTE_PLAN"), "运营行驶记录路径规划必须写入状态时间线");

  const arrived = businessActionService.completeRouteExecutionTravel({ state, objectId: executionId, runtime });
  assert.equal(arrived.success, true);
  state = applyUpdates(state, arrived.updates);
  const arrivedExecution = state.routeExecutions.find((item) => item.route_execution_id === executionId);
  assert.equal(arrivedExecution.execution_status, "ARRIVED");
  assert.ok(Number(arrivedExecution.battery_consumed_kwh) >= 0, "运营行驶记录必须记录已耗电千瓦时");
  assert.ok(Number(state.robotaxis.find((item) => item.robotaxi_id === arrivedExecution.robotaxi_id).lifetime_distance_km || 0) >= Number(arrivedExecution.distance_traveled_km || 0), "运营行驶必须反馈 Robotaxi 累计行驶距离");

  const abnormal = businessActionService.confirmRouteExecutionAbnormalArrival({
    state,
    objectId: executionId,
    runtime,
    arrivalResult: "BLOCKED_BY_OBSTACLE",
  });
  assert.equal(abnormal.success, true);
  state = applyUpdates(state, abnormal.updates);
  const abnormalExecution = state.routeExecutions.find((item) => item.route_execution_id === executionId);
  const abnormalTask = state.deploymentTasks.find((item) => item.task_id === abnormalExecution.task_id);
  assert.equal(abnormalExecution.execution_status, "ARRIVAL_ABNORMAL");
  assert.equal(abnormalTask.task_status, "ARRIVAL_ABNORMAL");
  assert.ok(abnormalExecution.simulation_status_transition_history.some((item) => item.result_type === "ARRIVAL_ABNORMAL_CONFIRMED"), "异常到达必须由服务层写入行驶记录状态时间线");
}

function verifyServiceOrderCreationPricingAndCall() {
  let state = createBaseBusinessState();
  const runtime = actionRuntime({ context: { order_channel: "OWN_APP_SIMULATED_ORDER" } });
  const created = businessActionService.createServiceOrder({ state, runtime });
  assert.equal(created.success, true);
  state = applyUpdates(state, created.updates);
  const orderId = created.data.objectId;
  assertHasInitialTimeline(state.serviceOrders[0], "order_status", "WAITING_PRICE_ESTIMATE", "serviceOrder");

  const priced = businessActionService.executePricing({ state, objectId: orderId, runtime });
  assert.equal(priced.success, true);
  state = applyUpdates(state, priced.updates);
  const pricedOrder = state.serviceOrders.find((item) => item.service_order_id === orderId);
  assert.equal(pricedOrder.order_status, "WAITING_ROBOTAXI_CALL");
  assert.ok(pricedOrder.simulation_status_transition_history.some((item) => item.action_type === "PRICING_EXECUTE"), "定价必须写入服务订单状态时间线");

  const called = businessActionService.callRobotaxi({ state, objectId: orderId, runtime });
  assert.equal(called.success, true);
  state = applyUpdates(state, called.updates);
  const calledOrder = state.serviceOrders.find((item) => item.service_order_id === orderId);
  assert.equal(calledOrder.order_status, "WAITING_ROBOTAXI_ASSIGNMENT");
  assert.ok(calledOrder.simulation_status_transition_history.some((item) => item.action_type === "ROBOTAXI_CALL"), "呼叫 Robotaxi 必须写入状态时间线");
}

function verifyStaticContracts() {
  const main = read("src/main.jsx");
  assert.doesNotMatch(main, /function createTask\(/, "页面层不得保留准入任务对象拼装 helper");
  assert.doesNotMatch(main, /function createDeploymentTask\(/, "页面层不得保留投放任务对象拼装 helper");
  assert.doesNotMatch(main, /function createDeploymentRouteExecution\(/, "页面层不得保留运营行驶记录对象拼装 helper");
  assert.match(main, /businessActionService\.createReadinessTask/, "准入创建入口必须调用业务服务");
  assert.match(main, /businessActionService\.assignReadinessTask/, "准入 Worker 分配必须调用业务服务");
  assert.match(main, /businessActionService\.startReadinessTask/, "准入开始检查必须调用业务服务");
  assert.match(main, /businessActionService\.passReadinessTask/, "准入通过必须调用业务服务");
  assert.match(main, /businessActionService\.failReadinessTask/, "准入不通过必须调用业务服务");
  assert.match(main, /businessActionService\.createDeploymentTask/, "投放任务创建必须调用业务服务");
  assert.match(main, /businessActionService\.createServiceOrder/, "服务订单创建必须调用业务服务");
  assert.match(main, /businessActionService\.executePricing/, "服务订单定价必须调用业务服务");
  assert.match(main, /businessActionService\.callRobotaxi/, "服务订单呼叫必须调用业务服务");
  assert.match(main, /businessActionService\.advanceRouteExecution/, "运营行驶继续行驶必须调用业务服务");
  assert.match(main, /businessActionService\.completeRouteExecutionTravel/, "运营行驶自动到达必须调用业务服务");
  assert.match(main, /businessActionService\.confirmRouteExecutionArrival/, "运营行驶正常到达必须调用业务服务");
  assert.match(main, /businessActionService\.confirmRouteExecutionAbnormalArrival/, "运营行驶异常到达必须调用业务服务");
  assert.match(main, /approveRetirementTask/, "页面必须提供退役确认动作");
  assert.match(main, /rejectRetirementTask/, "页面必须提供退役驳回动作");
  assert.match(main, /退役完成/, "退役处理中必须显示退役完成动作");
  const workflow = read("src/domain/workflowTransitionRegistry.js");
  ["RETIREMENT_APPROVE_TO_DESTINATION", "RETIREMENT_APPROVE_AT_CENTER", "RETIREMENT_REJECT"].forEach((token) => {
    assert.ok(workflow.includes(token), `工作流状态边缺少 ${token}`);
  });
  const dictionary = read("src/domain/fieldDictionary.js");
  ["READINESS_TASK_FAIL", "READINESS_FAILED", "ARRIVAL_ABNORMAL_CONFIRMED", "ARRIVAL_ABNORMAL_CONFIRM_FAILED", "ROUTE_ARRIVAL_ABNORMAL", "DEPLOYMENT_ARRIVAL_ABNORMAL", "FLEET_OPERATION_RETIREMENT_APPROVE", "FLEET_OPERATION_RETIREMENT_REJECT", "IN_RETIREMENT", "APPROVED"].forEach((token) => {
    assert.ok(dictionary.includes(token), `字段字典缺少 ${token}`);
  });
  const failureNormalStatuses = getCurrentNormalStatusValues("failureHandlingTask");
  assert.deepEqual(failureNormalStatuses, [
    "WAITING_ROBOTAXI_AVAILABLE",
    "WAITING_DIAGNOSIS_ASSIGNMENT",
    "DIAGNOSING",
    "COMPLETED",
  ]);
  ["WAITING_DISPOSITION", "TRANSFERRED_TO_MAINTENANCE", "TRANSFERRED_TO_RETIREMENT", "RESOLVED_NO_ACTION"].forEach((status) => {
    assert.ok(getLegacyCompatStatusValues("failureHandlingTask").includes(status), `故障兼容状态缺少 ${status}`);
  });
}

verifyRetirementApproveAtCenter();
verifyRetirementApproveNeedsDestination();
verifyRetirementRejectRestoresRobotaxi();
verifyRetirementCompleteRetiresRobotaxi();
verifyFailureCompletesToAvailableWithCost();
verifyReadinessServiceLifecycle();
verifyDeploymentCreationServiceLifecycle();
verifyRouteExecutionServiceLifecycle();
verifyServiceOrderCreationPricingAndCall();
verifyStaticContracts();

console.log("v040.30 business document closure verification passed");
