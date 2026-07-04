import assert from "node:assert/strict";

import {
  BatteryOperationStatus,
  CleanlinessStatus,
  TaskType,
} from "../src/domain/taskTypes.js";
import {
  completeFleetOperationWork,
  createFleetOperationTask,
  dispatchFleetOperationTaskDestination,
  startFleetOperationWork,
} from "../src/services/fleetOperationTaskService.js";
import { canAcceptDeploymentTask, canAcceptServiceOrder } from "../src/services/robotaxiService.js";

const cells = [
  { cell_id: "C-1-1", row: 1, col: 1, cell_size_m: 50 },
  { cell_id: "C-1-2", row: 1, col: 2, cell_size_m: 50 },
  { cell_id: "C-1-3", row: 1, col: 3, cell_size_m: 50 },
];

const opsCenters = [
  {
    ops_center_id: "OPS-CLEAN-001",
    cell_ids: ["C-1-3"],
    can_clean_robotaxi: true,
    can_charge_robotaxi: true,
    can_repair_robotaxi: true,
    can_receive_robotaxi: true,
  },
];

const availableRobotaxi = {
  robotaxi_id: "RT-V0408-001",
  availability_status: "AVAILABLE",
  available_for_dispatch: true,
  motion_status: "PARKED",
  current_order_id: null,
  current_task_id: null,
  current_cell_id: "C-1-1",
  fleet_operation_status: "NONE",
  cleanliness_status: CleanlinessStatus.NEEDS_CLEANING,
  battery_operation_status: BatteryOperationStatus.ENOUGH,
  maintenance_status: "NORMAL",
  failure_status: "NONE",
  retirement_status: "ACTIVE",
};

const created = createFleetOperationTask({
  robotaxi: availableRobotaxi,
  taskType: TaskType.CLEANING,
  existingTasks: [],
  context: { ...fixedContext(), opsCenters },
});
assert.equal(created.created, true);
assert.equal(created.task.task_status, "WAITING_DESTINATION_ASSIGNMENT");
assert.equal(created.robotaxi.current_task_id, created.task.task_id);
assert.equal(created.robotaxi.available_for_dispatch, false);
assert.equal(canAcceptServiceOrder(created.robotaxi), false);
assert.equal(canAcceptDeploymentTask(created.robotaxi), false);

const dispatched = dispatchFleetOperationTaskDestination({
  task: created.task,
  robotaxi: created.robotaxi,
  opsCenters,
  cells,
  context: { ...fixedContext(), opsCenters },
});
assert.equal(dispatched.succeeded, true);
assert.equal(dispatched.task.task_status, "WAITING_ROUTE");
assert.equal(dispatched.task.target_ops_center_id, "OPS-CLEAN-001");
assert.equal(dispatched.task.target_cell_id, "C-1-3");

const repeatedDispatch = dispatchFleetOperationTaskDestination({
  task: dispatched.task,
  robotaxi: dispatched.robotaxi,
  opsCenters,
  cells,
  context: { ...fixedContext(), opsCenters },
});
assert.equal(repeatedDispatch.succeeded, true);
assert.equal(repeatedDispatch.alreadyAssigned, true);
assert.equal(repeatedDispatch.run, null);
assert.equal(repeatedDispatch.decision, null);

const atOpsCenterRobotaxi = {
  ...availableRobotaxi,
  robotaxi_id: "RT-V0408-002",
  current_cell_id: "C-1-3",
};
const directWork = createFleetOperationTask({
  robotaxi: atOpsCenterRobotaxi,
  taskType: TaskType.CLEANING,
  existingTasks: [],
  context: { ...fixedContext(), opsCenters },
});
assert.equal(directWork.task.task_status, "WAITING_WORKER_ASSIGNMENT");

const cleaningStarted = startFleetOperationWork({
  task: directWork.task,
  robotaxi: directWork.robotaxi,
  context: { ...fixedContext(), opsCenters },
});
assert.equal(cleaningStarted.succeeded, true);
assert.equal(cleaningStarted.task.task_status, "CLEANING_IN_PROGRESS");

const cleaningCompleted = completeFleetOperationWork({
  task: cleaningStarted.task,
  robotaxi: cleaningStarted.robotaxi,
  context: fixedContext(),
});
assert.equal(cleaningCompleted.succeeded, true);
assert.equal(cleaningCompleted.task.task_status, "COMPLETED");
assert.equal(cleaningCompleted.robotaxi.availability_status, "AVAILABLE");
assert.equal(cleaningCompleted.robotaxi.available_for_dispatch, true);
assert.equal(cleaningCompleted.robotaxi.needs_cleaning, false);
assert.equal(cleaningCompleted.robotaxi.cleanliness_status, CleanlinessStatus.CLEAN);

const chargingTask = createFleetOperationTask({
  robotaxi: {
    ...availableRobotaxi,
    robotaxi_id: "RT-V0408-003",
    current_cell_id: "C-1-3",
    battery_operation_status: BatteryOperationStatus.LOW,
    cleanliness_status: CleanlinessStatus.CLEAN,
  },
  taskType: TaskType.CHARGING,
  existingTasks: [],
  trigger: { task_fields: { target_battery_percent: 90 } },
  context: { ...fixedContext(), opsCenters },
});
assert.equal(chargingTask.task.task_status, "WAITING_CHARGER_ASSIGNMENT");

const connecting = startFleetOperationWork({
  task: chargingTask.task,
  robotaxi: chargingTask.robotaxi,
  context: fixedContext(),
});
assert.equal(connecting.task.task_status, "CONNECTING_CHARGER");

const charging = completeFleetOperationWork({
  task: connecting.task,
  robotaxi: connecting.robotaxi,
  context: fixedContext(),
});
assert.equal(charging.task.task_status, "CHARGING");
assert.equal(charging.robotaxi.battery_operation_status, BatteryOperationStatus.CHARGING);

const waitDisconnect = completeFleetOperationWork({
  task: charging.task,
  robotaxi: charging.robotaxi,
  context: fixedContext(),
});
assert.equal(waitDisconnect.task.task_status, "WAITING_CHARGER_ASSIGNMENT");
assert.equal(waitDisconnect.task.charging_phase, "DISCONNECT_REQUIRED");

const disconnecting = startFleetOperationWork({
  task: waitDisconnect.task,
  robotaxi: waitDisconnect.robotaxi,
  context: fixedContext(),
});
assert.equal(disconnecting.task.task_status, "DISCONNECTING_CHARGER");

const charged = completeFleetOperationWork({
  task: disconnecting.task,
  robotaxi: disconnecting.robotaxi,
  context: fixedContext(),
});
assert.equal(charged.task.task_status, "COMPLETED");
assert.equal(charged.robotaxi.availability_status, "AVAILABLE");
assert.equal(charged.robotaxi.needs_charging, false);
assert.equal(charged.robotaxi.battery_operation_status, BatteryOperationStatus.ENOUGH);

console.log("v040.8 Fleet Operations 生命周期合同验证通过");

function fixedContext() {
  return {
    now: () => "2026-07-03T10:00:00.000Z",
    nextId: (prefix) => `${prefix}-V0408`,
    nextDispatchRunId: () => "FODR-V0408",
    nextDispatchDecisionId: () => "FODD-V0408",
    audit: () => ({ record_source: "TEST" }),
    serviceOrders: [
      { service_order_id: "SO-HISTORY-1", matched_robotaxi_id: "RT-V0408-001" },
      { service_order_id: "SO-HISTORY-2", matched_robotaxi_id: "RT-V0408-002" },
      { service_order_id: "SO-HISTORY-3", matched_robotaxi_id: "RT-V0408-003" },
    ],
  };
}
