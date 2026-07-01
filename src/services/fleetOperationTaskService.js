import {
  ChargingTaskStatus,
  FailureHandlingTaskStatus,
  FleetOperationTaskStatus,
  MaintenanceTaskStatus,
  RetirementTaskStatus,
  TaskPriority,
  TaskType,
  TriggerType,
  createChargingTask,
  createCleaningTask,
  createFailureHandlingTask,
  createMaintenanceTask,
  createRetirementTask,
} from "../domain/taskTypes.js";

const TASK_CONFIG = {
  [TaskType.CLEANING]: {
    collectionKey: "cleaningTasks",
    idPrefix: "TASK-CLN",
    defaultStatus: FleetOperationTaskStatus.WAITING_DESTINATION_ASSIGNMENT,
    waitingStatus: FleetOperationTaskStatus.WAITING_ROBOTAXI_AVAILABLE,
    factory: createCleaningTask,
  },
  [TaskType.CHARGING]: {
    collectionKey: "chargingTasks",
    idPrefix: "TASK-CHG",
    defaultStatus: ChargingTaskStatus.WAITING_CHARGING_DESTINATION_ASSIGNMENT,
    waitingStatus: ChargingTaskStatus.WAITING_ROBOTAXI_AVAILABLE,
    factory: createChargingTask,
  },
  [TaskType.MAINTENANCE]: {
    collectionKey: "maintenanceTasks",
    idPrefix: "TASK-MNT",
    defaultStatus: MaintenanceTaskStatus.WAITING_MAINTENANCE_DESTINATION_ASSIGNMENT,
    waitingStatus: MaintenanceTaskStatus.WAITING_ROBOTAXI_AVAILABLE,
    factory: createMaintenanceTask,
  },
  [TaskType.FAILURE_HANDLING]: {
    collectionKey: "failureHandlingTasks",
    idPrefix: "TASK-FHL",
    defaultStatus: FailureHandlingTaskStatus.WAITING_DIAGNOSIS_ASSIGNMENT,
    waitingStatus: FailureHandlingTaskStatus.WAITING_ROBOTAXI_AVAILABLE,
    factory: createFailureHandlingTask,
  },
  [TaskType.RETIREMENT]: {
    collectionKey: "retirementTasks",
    idPrefix: "TASK-RET",
    defaultStatus: RetirementTaskStatus.WAITING_RETIREMENT_APPROVAL,
    waitingStatus: RetirementTaskStatus.WAITING_ROBOTAXI_AVAILABLE,
    factory: createRetirementTask,
  },
};

const TERMINAL_STATUSES = new Set(["COMPLETED", "CANCELLED", "FAILED"]);

export function getFleetOperationCollectionKey(taskType) {
  return TASK_CONFIG[taskType]?.collectionKey || null;
}

export function hasOpenFleetOperationTask({ robotaxiId, taskType, existingTasks = [] }) {
  return (existingTasks || []).some((task) =>
    task.robotaxi_id === robotaxiId
    && task.task_type === taskType
    && !TERMINAL_STATUSES.has(task.task_status)
  );
}

export function createFleetOperationTask({
  robotaxi,
  taskType,
  existingTasks = [],
  trigger = {},
  context = {},
} = {}) {
  const config = TASK_CONFIG[taskType];
  if (!robotaxi?.robotaxi_id || !config) {
    return { created: false, reason: "INVALID_FLEET_OPERATION_TASK_INPUT" };
  }
  if (hasOpenFleetOperationTask({ robotaxiId: robotaxi.robotaxi_id, taskType, existingTasks })) {
    return { created: false, reason: "ROBOTAXI_ALREADY_HAS_OPEN_FLEET_OPERATION_TASK" };
  }

  const taskId = resolveNextId(context, config.idPrefix);
  const shouldWait = Boolean(robotaxi.current_order_id || robotaxi.current_task_id);
  const now = resolveNow(context);
  const task = config.factory({
    task_id: taskId,
    task_type: taskType,
    task_status: shouldWait ? config.waitingStatus : config.defaultStatus,
    task_priority: trigger.task_priority || TaskPriority.NORMAL,
    trigger_type: trigger.trigger_type || TriggerType.TASK_RESULT,
    trigger_source: trigger.trigger_source || null,
    source_task_id: trigger.source_task_id || null,
    robotaxi_id: robotaxi.robotaxi_id,
    target_ops_center_id: null,
    target_cell_id: null,
    route_execution_id: null,
    pending_since_at: shouldWait ? now : null,
    operation_created_at: now,
    created_at: now,
    ...trigger.task_fields,
    ...resolveAudit(context, { created: true }),
  });

  return {
    created: true,
    task,
    collectionKey: config.collectionKey,
    robotaxi: applyFleetOperationTaskReference(robotaxi, { task, shouldWait, now }),
  };
}

export function applyFleetOperationTaskReference(robotaxi, { task, shouldWait, now } = {}) {
  if (!task) return robotaxi;
  if (shouldWait) {
    return {
      ...robotaxi,
      pending_fleet_task_type: task.task_type,
      pending_fleet_task_id: task.task_id,
      fleet_operation_status: "WAITING_SERVICE_COMPLETION",
      operation_blocking_reason: task.task_type,
      updated_at: now || robotaxi.updated_at,
    };
  }
  return {
    ...robotaxi,
    current_task_id: task.task_id,
    current_task_type: task.task_type,
    current_task_status: task.task_status,
    availability_status: "UNAVAILABLE",
    available_for_dispatch: false,
    fleet_operation_status: resolveFleetOperationStatusForTask(task.task_type),
    operation_blocking_reason: task.task_type,
    updated_at: now || robotaxi.updated_at,
  };
}

export function resolveFleetOperationStatusForTask(taskType) {
  if (taskType === TaskType.CLEANING) return "NEED_CLEANING";
  if (taskType === TaskType.CHARGING) return "NEED_CHARGING";
  if (taskType === TaskType.MAINTENANCE) return "NEED_MAINTENANCE";
  if (taskType === TaskType.FAILURE_HANDLING) return "BROKEN";
  if (taskType === TaskType.RETIREMENT) return "RETIRED";
  return "NONE";
}

function resolveNextId(context, prefix) {
  if (typeof context.nextId === "function") return context.nextId(prefix);
  const suffix = String((context.sequence || 1)).padStart(4, "0");
  return `${prefix}-${suffix}`;
}

function resolveNow(context) {
  if (typeof context.now === "function") return context.now();
  return context.now || new Date(0).toISOString();
}

function resolveAudit(context, options) {
  if (typeof context.audit === "function") return context.audit(options);
  return {};
}
