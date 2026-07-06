import assert from "node:assert/strict";

import { BatteryOperationStatus, CleanlinessStatus, TaskType } from "../src/domain/taskTypes.js";
import { createFleetOperationTask } from "../src/services/fleetOperationTaskService.js";
import {
  canAcceptDeploymentTask,
  canAcceptServiceOrder,
  createFleetOperationTaskIfNeeded,
  getOperationalHealth,
  markAvailableAfterFleetOperation,
  needsCharging,
  needsCleaning,
} from "../src/services/robotaxiService.js";

const availableRobotaxi = {
  robotaxi_id: "RT-V037-001",
  availability_status: "AVAILABLE",
  motion_status: "PARKED",
  current_order_id: null,
  current_task_id: null,
  fleet_operation_status: "NONE",
  cleanliness_status: "CLEAN",
  battery_operation_status: "ENOUGH",
  maintenance_status: "NORMAL",
  failure_status: "NONE",
  retirement_status: "ACTIVE",
  available_for_dispatch: true,
};

assert.equal(canAcceptServiceOrder(availableRobotaxi), true);
assert.equal(canAcceptDeploymentTask(availableRobotaxi), true);
assert.equal(getOperationalHealth(availableRobotaxi).can_accept_service_order, true);

const dirtyRobotaxi = {
  ...availableRobotaxi,
  cleanliness_status: CleanlinessStatus.NEEDS_CLEANING,
};
assert.equal(needsCleaning(dirtyRobotaxi), true);
assert.equal(canAcceptServiceOrder(dirtyRobotaxi), true);

const lowBatteryRobotaxi = {
  ...availableRobotaxi,
  battery_operation_status: BatteryOperationStatus.LOW,
};
assert.equal(needsCharging(lowBatteryRobotaxi), true);
assert.equal(canAcceptDeploymentTask(lowBatteryRobotaxi), true);

const waitingResult = createFleetOperationTask({
  robotaxi: { ...dirtyRobotaxi, current_order_id: "SO-V037-001" },
  taskType: TaskType.CLEANING,
  existingTasks: [],
  context: fixedContext(),
});
assert.equal(waitingResult.created, true);
assert.equal(waitingResult.queued, true);
assert.equal(waitingResult.task.task_status, "WAITING_ROBOTAXI_AVAILABLE");
assert.equal(waitingResult.robotaxi.current_task_id, null);
assert.equal(waitingResult.robotaxi.pending_fleet_task_id, waitingResult.task.task_id);
assert.equal(waitingResult.robotaxi.pending_task_queue[0].task_type, TaskType.CLEANING);
assert.equal(waitingResult.robotaxi.pending_task_queue[0].task_id, waitingResult.task.task_id);
assert.equal(waitingResult.robotaxi.fleet_operation_status, "NONE");
assert.equal(waitingResult.robotaxi.availability_status, "AVAILABLE");

const immediateResult = createFleetOperationTaskIfNeeded({
  robotaxi: dirtyRobotaxi,
  existingTasks: [],
  context: fixedContext(),
});
assert.equal(immediateResult.created, true);
assert.equal(immediateResult.task.task_type, TaskType.CLEANING);
assert.equal(immediateResult.robotaxi.current_task_id, immediateResult.task.task_id);
assert.equal(immediateResult.robotaxi.availability_status, "IN_FLEET_OPERATION");

const duplicateResult = createFleetOperationTask({
  robotaxi: dirtyRobotaxi,
  taskType: TaskType.CLEANING,
  existingTasks: [immediateResult.task],
  context: fixedContext(),
});
assert.equal(duplicateResult.created, false);
assert.equal(duplicateResult.reason, "ROBOTAXI_ALREADY_HAS_OPEN_FLEET_OPERATION_TASK");

const restored = markAvailableAfterFleetOperation(immediateResult.robotaxi, {
  cleanliness_status: CleanlinessStatus.CLEAN,
  battery_operation_status: BatteryOperationStatus.ENOUGH,
});
assert.equal(restored.availability_status, "AVAILABLE");
assert.equal(restored.available_for_dispatch, true);
assert.equal(restored.fleet_operation_status, "NONE");
assert.equal(restored.current_task_id, null);
assert.equal(restored.cleanliness_status, "CLEAN");

console.log("v037.2 Fleet Operations 服务合同验证通过");

function fixedContext() {
  return {
    now: () => "2026-06-30T10:00:00.000Z",
    nextId: (prefix) => `${prefix}-V037`,
    audit: () => ({ record_source: "TEST" }),
    serviceOrders: [{ service_order_id: "SO-HISTORY", matched_robotaxi_id: "RT-V037-001" }],
  };
}
