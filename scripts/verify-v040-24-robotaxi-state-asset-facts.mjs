import assert from "node:assert/strict";

import { initializeOperationsCenter } from "../src/data/operationsCenterInitialization.js";
import { AvailabilityStatus } from "../src/domain/operationsCenterTypes.js";
import {
  FleetOperationTaskStatus,
  MaintenanceTaskStatus,
  MaintenanceStatus,
  RetirementTaskStatus,
  RouteExecutionStatus,
  TaskType,
} from "../src/domain/taskTypes.js";
import * as fleetOperationTaskService from "../src/services/fleetOperationTaskService.js";
import * as routePlanningService from "../src/services/routePlanningService.js";
import * as robotaxiTaskPlanningService from "../src/services/robotaxiTaskPlanningService.js";

const opsData = initializeOperationsCenter();
const now = "2026-07-06T00:00:00.000Z";
let sequence = 1;
const context = {
  now,
  opsCenters: opsData.opsCenters,
  nextId(prefix) {
    return `${prefix}-${String(sequence++).padStart(4, "0")}`;
  },
};

const initialRobotaxi = opsData.robotaxis[0];
assert.equal(initialRobotaxi.availability_status, AvailabilityStatus.PENDING_ADMISSION);
assert.equal(initialRobotaxi.lifetime_distance_km, 0);
assert.equal(initialRobotaxi.completed_service_order_count, 0);

const readinessDecision = robotaxiTaskPlanningService.planRobotaxiTask({
  robotaxi: initialRobotaxi,
  requestedAssignmentType: robotaxiTaskPlanningService.TaskPlanningAssignmentType.READINESS_TASK,
});
assert.equal(readinessDecision.allowed, true);

const availableRobotaxi = {
  ...initialRobotaxi,
  availability_status: AvailabilityStatus.AVAILABLE,
  available_for_dispatch: true,
  current_task_id: null,
  current_task_type: null,
  current_task_status: null,
};
const operationalHistory = [{ task_id: "TASK-DP-HISTORY", robotaxi_id: availableRobotaxi.robotaxi_id, task_status: "COMPLETED" }];
const serviceDecision = robotaxiTaskPlanningService.planRobotaxiTask({
  robotaxi: availableRobotaxi,
  requestedAssignmentType: robotaxiTaskPlanningService.TaskPlanningAssignmentType.SERVICE_ORDER,
});
assert.equal(serviceDecision.allowed, true);

const cleaningCreate = fleetOperationTaskService.createFleetOperationTask({
  robotaxi: {
    ...availableRobotaxi,
    current_cell_id: "C-34-32",
    cleanliness_status: "CLEAN",
  },
  taskType: TaskType.CLEANING,
  existingTasks: [],
  trigger: { trigger_source: "ROBOTAXI_MANAGEMENT" },
  context: { ...context, deploymentTasks: operationalHistory },
});
assert.equal(cleaningCreate.created, true);
assert.equal(cleaningCreate.robotaxi.availability_status, AvailabilityStatus.IN_FLEET_OPERATION);
assert.equal(cleaningCreate.task.task_status, FleetOperationTaskStatus.WAITING_WORKER_ASSIGNMENT);
assert.equal(cleaningCreate.robotaxi.needs_cleaning, false);

const queuedMaintenance = fleetOperationTaskService.createFleetOperationTask({
  robotaxi: {
    ...cleaningCreate.robotaxi,
    maintenance_status: MaintenanceStatus.NORMAL,
  },
  taskType: TaskType.MAINTENANCE,
  existingTasks: [cleaningCreate.task],
  trigger: { trigger_source: "ROBOTAXI_MANAGEMENT" },
  context: { ...context, deploymentTasks: operationalHistory },
});
assert.equal(queuedMaintenance.created, true);
assert.equal(queuedMaintenance.queued, true);
assert.equal(queuedMaintenance.robotaxi.availability_status, AvailabilityStatus.IN_FLEET_OPERATION);
assert.deepEqual((queuedMaintenance.robotaxi.pending_task_queue || []).map((item) => item.queue_sequence), [1]);

const cleaningDone = fleetOperationTaskService.completeFleetOperationWork({
  task: {
    ...cleaningCreate.task,
    worker_id: "WK-001",
    task_status: FleetOperationTaskStatus.CLEANING,
  },
  robotaxi: queuedMaintenance.robotaxi,
  context,
});
assert.equal(cleaningDone.succeeded, true);
assert.equal(cleaningDone.robotaxi.availability_status, AvailabilityStatus.AVAILABLE);
assert.equal(cleaningDone.robotaxi.completed_cleaning_count, 1);

const activatedMaintenance = fleetOperationTaskService.activateNextQueuedFleetOperationTask({
  robotaxi: cleaningDone.robotaxi,
  tasksByType: { maintenanceTasks: [queuedMaintenance.task] },
  opsCenters: opsData.opsCenters,
  context,
});
assert.equal(activatedMaintenance.activated, true);
assert.equal(activatedMaintenance.robotaxi.completed_cleaning_count, 1, "激活下一排队任务时不得丢失上一任务完成次数");

const maintenanceDone = fleetOperationTaskService.completeFleetOperationWork({
  task: {
    ...activatedMaintenance.task,
    worker_id: "WK-001",
    task_status: MaintenanceTaskStatus.REPAIRING,
  },
  robotaxi: activatedMaintenance.robotaxi,
  context,
});
assert.equal(maintenanceDone.succeeded, true);
assert.equal(maintenanceDone.robotaxi.completed_cleaning_count, 1);
assert.equal(maintenanceDone.robotaxi.completed_maintenance_count, 1);

const retirementCreate = fleetOperationTaskService.createFleetOperationTask({
  robotaxi: availableRobotaxi,
  taskType: TaskType.RETIREMENT,
  existingTasks: [],
  trigger: { trigger_source: "RETIREMENT_REVIEW" },
  context: { ...context, deploymentTasks: operationalHistory },
});
assert.equal(retirementCreate.created, true);
assert.equal(retirementCreate.robotaxi.availability_status, AvailabilityStatus.IN_FLEET_OPERATION);
const retirementDone = fleetOperationTaskService.completeFleetOperationWork({
  task: {
    ...retirementCreate.task,
    task_status: RetirementTaskStatus.PROCESSING_RETIREMENT,
  },
  robotaxi: retirementCreate.robotaxi,
  context,
});
assert.equal(retirementDone.succeeded, true);
assert.equal(retirementDone.robotaxi.availability_status, AvailabilityStatus.RETIRED);

const route = {
  route_id: "ROUTE-TEST-001",
  route_steps: [{ cell_id: "C-34-32" }, { cell_id: "C-34-33" }, { cell_id: "C-35-33" }],
  route_step_count: 2,
  total_step_count: 2,
  total_distance_m: 100,
  total_distance_km: 0.1,
};
const execution = routePlanningService.applyTravelMetrics({
  record: {
    route_execution_id: "REX-TEST-001",
    task_id: "TASK-DP-TEST",
    robotaxi_id: availableRobotaxi.robotaxi_id,
    execution_status: RouteExecutionStatus.MOVING,
    route_id: route.route_id,
    origin_cell_id: "C-34-32",
    current_cell_id: "C-34-32",
    target_cell_id: "C-35-33",
    route_cell_ids: ["C-34-32", "C-34-33", "C-35-33"],
    current_step_index: 0,
    total_step_count: 2,
    battery_consumed_percent: 0,
  },
  routes: [route],
  currentRouteId: route.route_id,
  currentStepIndex: 0,
});
const step = routePlanningService.advanceRouteExecution({
  execution,
  task: { task_id: "TASK-DP-TEST" },
  route,
  robotaxi: availableRobotaxi,
});
assert.equal(step.execution.execution_status, RouteExecutionStatus.MOVING);
assert.ok(step.robotaxi.lifetime_distance_km > availableRobotaxi.lifetime_distance_km);
assert.ok(step.robotaxi.lifetime_battery_consumed_percent > availableRobotaxi.lifetime_battery_consumed_percent);
assert.ok(step.robotaxi.battery_percent < availableRobotaxi.battery_percent);

console.log("v040.24 Robotaxi 状态与资产事实闭环验证通过");
