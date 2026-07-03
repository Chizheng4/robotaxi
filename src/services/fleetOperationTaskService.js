import {
  BatteryOperationStatus,
  ChargingTaskStatus,
  CleanlinessStatus,
  FailureHandlingTaskStatus,
  FleetOperationTaskStatus,
  MaintenanceTaskStatus,
  MaintenanceStatus,
  RetirementTaskStatus,
  RouteChangeReason,
  RoutePlanningFailureReason,
  RoutePlanningResult,
  RoutePlanningStrategy,
  TaskPriority,
  TaskType,
  TriggerType,
  createChargingTask,
  createCleaningTask,
  createFailureHandlingTask,
  createMaintenanceTask,
  createRetirementTask,
} from "../domain/taskTypes.js";
import * as routePlanningService from "./routePlanningService.js";
import * as robotaxiTaskPriorityService from "./robotaxiTaskPriorityService.js";
import * as fleetOperationDispatchService from "./fleetOperationDispatchService.js";

const TASK_CONFIG = {
  [TaskType.CLEANING]: {
    collectionKey: "cleaningTasks",
    idPrefix: "TASK-CLN",
    defaultStatus: FleetOperationTaskStatus.WAITING_DESTINATION_ASSIGNMENT,
    waitingStatus: FleetOperationTaskStatus.WAITING_ROBOTAXI_AVAILABLE,
    directAssignmentStatus: FleetOperationTaskStatus.WAITING_WORKER_ASSIGNMENT,
    factory: createCleaningTask,
  },
  [TaskType.CHARGING]: {
    collectionKey: "chargingTasks",
    idPrefix: "TASK-CHG",
    defaultStatus: ChargingTaskStatus.WAITING_CHARGING_DESTINATION_ASSIGNMENT,
    waitingStatus: ChargingTaskStatus.WAITING_ROBOTAXI_AVAILABLE,
    directAssignmentStatus: ChargingTaskStatus.WAITING_CHARGER_ASSIGNMENT,
    factory: createChargingTask,
  },
  [TaskType.MAINTENANCE]: {
    collectionKey: "maintenanceTasks",
    idPrefix: "TASK-MNT",
    defaultStatus: MaintenanceTaskStatus.WAITING_MAINTENANCE_DESTINATION_ASSIGNMENT,
    waitingStatus: MaintenanceTaskStatus.WAITING_ROBOTAXI_AVAILABLE,
    directAssignmentStatus: MaintenanceTaskStatus.WAITING_RESOURCE_ASSIGNMENT,
    factory: createMaintenanceTask,
  },
  [TaskType.FAILURE_HANDLING]: {
    collectionKey: "failureHandlingTasks",
    idPrefix: "TASK-FHL",
    defaultStatus: FailureHandlingTaskStatus.WAITING_DIAGNOSIS_ASSIGNMENT,
    waitingStatus: FailureHandlingTaskStatus.WAITING_ROBOTAXI_AVAILABLE,
    directAssignmentStatus: FailureHandlingTaskStatus.WAITING_DIAGNOSIS_ASSIGNMENT,
    factory: createFailureHandlingTask,
  },
  [TaskType.RETIREMENT]: {
    collectionKey: "retirementTasks",
    idPrefix: "TASK-RET",
    defaultStatus: RetirementTaskStatus.WAITING_RETIREMENT_APPROVAL,
    waitingStatus: RetirementTaskStatus.WAITING_ROBOTAXI_AVAILABLE,
    directAssignmentStatus: RetirementTaskStatus.WAITING_RETIREMENT_APPROVAL,
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

  const now = resolveNow(context);
  const decision = robotaxiTaskPriorityService.resolveTaskDecision({
    robotaxi,
    newTaskType: taskType,
    config: context.taskPriorityConfig,
  });
  if (decision.decision === robotaxiTaskPriorityService.DECISION.REJECTED) {
    return { created: false, reason: decision.reason };
  }
  if (decision.decision === robotaxiTaskPriorityService.DECISION.QUEUE_AFTER_CURRENT) {
    const taskId = resolveNextId(context, config.idPrefix);
    const task = config.factory({
      task_id: taskId,
      task_type: taskType,
      task_status: config.waitingStatus,
      task_priority: trigger.task_priority || TaskPriority.NORMAL,
      trigger_type: trigger.trigger_type || TriggerType.TASK_RESULT,
      trigger_source: trigger.trigger_source || null,
      source_task_id: trigger.source_task_id || null,
      robotaxi_id: robotaxi.robotaxi_id,
      target_ops_center_id: null,
      target_cell_id: null,
      route_execution_id: null,
      pending_since_at: now,
      operation_created_at: now,
      created_at: now,
      ...trigger.task_fields,
      ...resolveAudit(context, { created: true }),
    });
    const robotaxiWithQueue = robotaxiTaskPriorityService.enqueueTask(robotaxi, {
      ...(decision.queue_entry || {}),
      task_id: task.task_id,
      task_type: taskType,
      trigger_type: trigger.trigger_type || TriggerType.TASK_RESULT,
      trigger_source: trigger.trigger_source || null,
      trigger_object_type: trigger.task_fields?.trigger_object_type || null,
      trigger_object_id: trigger.task_fields?.trigger_object_id || null,
      queued_at: now,
    });
    return {
      created: true,
      queued: true,
      reason: decision.reason || "FLEET_OPERATION_TASK_QUEUED",
      task,
      collectionKey: config.collectionKey,
      robotaxi: {
        ...robotaxiWithQueue,
        ...getTagUpdatesForTaskType(taskType),
        pending_fleet_task_type: taskType,
        pending_fleet_task_id: task.task_id,
        availability_status: taskType === TaskType.RETIREMENT ? "RETIRED" : "UNAVAILABLE",
        available_for_dispatch: false,
        fleet_operation_status: "WAITING_SERVICE_COMPLETION",
        operation_blocking_reason: taskType,
        updated_at: now,
      },
    };
  }

  const taskId = resolveNextId(context, config.idPrefix);
  const isOccupied = Boolean(robotaxi.current_order_id || robotaxi.current_task_id);
  const isAtOpsCenterWithCapability = !isOccupied && isRobotaxiAtMatchingOpsCenter(robotaxi, taskType, context.opsCenters);
  const task = config.factory({
    task_id: taskId,
    task_type: taskType,
    task_status: isAtOpsCenterWithCapability && config.directAssignmentStatus
        ? config.directAssignmentStatus
        : config.defaultStatus,
    task_priority: trigger.task_priority || TaskPriority.NORMAL,
    trigger_type: trigger.trigger_type || TriggerType.TASK_RESULT,
    trigger_source: trigger.trigger_source || null,
    source_task_id: trigger.source_task_id || null,
    robotaxi_id: robotaxi.robotaxi_id,
    target_ops_center_id: null,
    target_cell_id: null,
    route_execution_id: null,
    pending_since_at: null,
    operation_created_at: now,
    created_at: now,
    ...trigger.task_fields,
    ...resolveAudit(context, { created: true }),
  });

  return {
    created: true,
    task,
    collectionKey: config.collectionKey,
    robotaxi: applyFleetOperationTaskReference(robotaxi, { task, shouldWait: false, now }),
  };
}

export function activateQueuedFleetOperationTask({ task, robotaxi, opsCenters = [], context = {} } = {}) {
  if (!task?.task_id || !robotaxi?.robotaxi_id) return { succeeded: false, reason: "INVALID_QUEUED_FLEET_OPERATION_TASK" };
  const config = TASK_CONFIG[task.task_type];
  if (!config) return { succeeded: false, reason: "UNKNOWN_FLEET_OPERATION_TASK_TYPE" };
  const now = resolveNow(context);
  const isAtOpsCenterWithCapability = isRobotaxiAtMatchingOpsCenter(robotaxi, task.task_type, opsCenters);
  const nextStatus = isAtOpsCenterWithCapability && config.directAssignmentStatus
    ? config.directAssignmentStatus
    : config.defaultStatus;
  return {
    succeeded: true,
    task: {
      ...task,
      task_status: nextStatus,
      activated_at: now,
      updated_at: now,
    },
    robotaxi: {
      ...applyFleetOperationTaskReference(robotaxi, { task: { ...task, task_status: nextStatus }, shouldWait: false, now }),
      pending_task_queue: (robotaxi.pending_task_queue || []).filter((item) => item.task_id !== task.task_id),
      pending_fleet_task_id: robotaxi.pending_fleet_task_id === task.task_id ? null : robotaxi.pending_fleet_task_id,
      pending_fleet_task_type: robotaxi.pending_fleet_task_id === task.task_id ? null : robotaxi.pending_fleet_task_type,
    },
  };
}

export function dispatchFleetOperationTaskDestination({
  task,
  robotaxi,
  opsCenters = [],
  cells = [],
  strategy = null,
  context = {},
} = {}) {
  if (!task?.task_id || !robotaxi?.robotaxi_id) {
    return { succeeded: false, reason: "INVALID_DISPATCH_INPUT" };
  }
  if (task.target_cell_id && task.task_status === "WAITING_ROUTE") {
    return {
      succeeded: true,
      alreadyAssigned: true,
      task,
      robotaxi,
      run: null,
      decision: null,
    };
  }
  if (!isDestinationAssignmentStatus(task.task_status)) {
    return { succeeded: false, reason: "FLEET_OPERATION_TASK_NOT_READY_FOR_DESTINATION" };
  }
  const result = fleetOperationDispatchService.dispatchFleetOperationDestination({
    task,
    robotaxi,
    opsCenters,
    cells,
    strategy,
    context,
  });
  const now = resolveNow(context);
  if (!result.targetOpsCenterId || !result.targetCellId) {
    return {
      ...result,
      succeeded: false,
      reason: result.decision?.reason || result.run?.run_status || "FLEET_OPERATION_DISPATCH_FAILED",
      task: {
        ...task,
        updated_at: now,
      },
      robotaxi,
    };
  }
  return {
    ...result,
    succeeded: true,
    task: {
      ...task,
      target_ops_center_id: result.targetOpsCenterId,
      target_cell_id: result.targetCellId,
      task_status: getWaitingRouteStatus(task.task_type),
      destination_assigned_at: now,
      updated_at: now,
    },
    robotaxi: {
      ...robotaxi,
      current_task_id: task.task_id,
      current_task_type: task.task_type,
      current_task_status: getWaitingRouteStatus(task.task_type),
      availability_status: task.task_type === TaskType.RETIREMENT ? "RETIRED" : "UNAVAILABLE",
      available_for_dispatch: false,
      updated_at: now,
    },
  };
}

export function planFleetOperationRoute({
  task,
  robotaxi,
  data = {},
  context = {},
} = {}) {
  if (!task?.task_id || !task?.robotaxi_id || !robotaxi?.robotaxi_id || !task?.target_cell_id) {
    return { succeeded: false, reason: "INVALID_FLEET_OPERATION_ROUTE_INPUT" };
  }
  const now = resolveNow(context);
  const routeExecutionId = task.route_execution_id || resolveNextId(context, "REX");
  const routeId = resolveNextId(context, "DRT");
  const routePlanningRunId = resolveNextId(context, "RPR");
  const originCellId = robotaxi.current_cell_id || task.origin_cell_id;
  const targetCellId = task.target_cell_id;
  const targetServiceAreaId = task.target_service_area_id || task.planned_target_service_area_id || null;
  const route = routePlanningService.createDeploymentRouteForOperation({
    task,
    data,
    routeId,
    routePlanningRunId,
    routeExecutionId,
    originCellId,
    targetCellId,
    targetServiceAreaId,
    strategyId: RoutePlanningStrategy.INITIAL_DEPLOYMENT,
  });
  const routePlanningRun = routePlanningService.createRoutePlanningRun({
    routePlanningRunId,
    routeStrategyId: route.route_strategy_id,
    planningAlgorithm: route.planning_algorithm,
    taskId: task.task_id,
    routeExecutionId,
    robotaxiId: task.robotaxi_id,
    originCellId,
    targetCellId,
    resultRouteId: route.route_steps.length > 0 ? route.route_id : null,
    planningResult: route.route_steps.length > 0 ? RoutePlanningResult.SUCCESS : RoutePlanningResult.FAILED,
    failureReason: route.route_steps.length > 0 ? RoutePlanningFailureReason.NONE : route.failure_reason,
    routeStepCount: route.route_step_count,
    totalDistanceKm: route.total_distance_km,
    createdAt: now,
  });
  if (route.route_steps.length === 0) {
    return {
      succeeded: false,
      reason: route.failure_reason,
      routePlanningRun,
      task: {
        ...task,
        task_status: "FAILED",
        failure_reason: route.failure_reason,
        updated_at: now,
      },
    };
  }
  const routeCellIds = routePlanningService.getRouteExecutionCells(route, data.roadSegments || [], originCellId, targetCellId);
  const movingStatus = getFleetOperationMovingStatus(task.task_type);
  const execution = routePlanningService.applyTravelMetrics({
    record: {
      route_execution_id: routeExecutionId,
      task_id: task.task_id,
      task_type: task.task_type,
      source_task_id: task.task_id,
      robotaxi_id: task.robotaxi_id,
      execution_status: "MOVING",
      route_id: route.route_id,
      route_strategy_id: route.route_strategy_id,
      origin_cell_id: originCellId,
      current_cell_id: originCellId,
      target_ops_center_id: task.target_ops_center_id || null,
      target_service_area_id: targetServiceAreaId,
      target_cell_id: targetCellId,
      current_target_service_area_id: targetServiceAreaId,
      route_cell_ids: routeCellIds,
      current_step_index: 0,
      total_step_count: Math.max(0, routeCellIds.length - 1),
      route_history: [routePlanningService.createRouteHistoryEntry(route, RouteChangeReason.INITIAL_PLANNING, null)],
      time_elapsed: "0",
      battery_consumed_percent: 0,
      simulation_run_id: task.simulation_run_id || null,
      created_at: now,
      operation_created_at: now,
      ...resolveAudit(context, { created: true }),
    },
    routes: [route],
    currentRouteId: route.route_id,
    currentStepIndex: 0,
  });
  return {
    succeeded: true,
    route,
    routePlanningRun,
    routeExecution: execution,
    task: {
      ...task,
      task_status: movingStatus,
      route_execution_id: routeExecutionId,
      route_id: route.route_id,
      route_strategy_id: route.route_strategy_id,
      started_at: now,
      updated_at: now,
    },
    robotaxi: {
      ...robotaxi,
      current_task_id: task.task_id,
      current_task_type: task.task_type,
      current_task_status: movingStatus,
      current_route_id: route.route_id,
      current_route_execution_id: routeExecutionId,
      motion_status: "MOVING",
      availability_status: "UNAVAILABLE",
      available_for_dispatch: false,
      updated_at: now,
    },
  };
}

export function advanceFleetOperationRouteExecution({ execution, task, route, robotaxi, context = {} } = {}) {
  const step = routePlanningService.advanceRouteExecution({ execution, task, route, robotaxi });
  if (!step) return { succeeded: false, reason: "FLEET_OPERATION_ROUTE_STEP_UNAVAILABLE" };
  const now = resolveNow(context);
  const arrived = step.execution.execution_status === "ARRIVED";
  const arrivedStatus = getFleetOperationArrivedStatus(task?.task_type);
  const movingStatus = getFleetOperationMovingStatus(task?.task_type);
  return {
    succeeded: true,
    routeExecution: {
      ...step.execution,
      updated_at: now,
    },
    task: task ? {
      ...task,
      task_status: arrived ? arrivedStatus : movingStatus,
      updated_at: now,
    } : null,
    robotaxi: step.robotaxi ? {
      ...step.robotaxi,
      current_task_status: arrived ? arrivedStatus : movingStatus,
      updated_at: now,
    } : null,
    arrived,
  };
}

export function confirmFleetOperationArrival({ execution, task, robotaxi, context = {} } = {}) {
  if (!execution || !task || execution.execution_status !== "ARRIVED") {
    return { succeeded: false, reason: "FLEET_OPERATION_ARRIVAL_NOT_READY" };
  }
  const now = resolveNow(context);
  const nextTaskStatus = getFleetOperationAfterArrivalStatus(task.task_type);
  return {
    succeeded: true,
    routeExecution: {
      ...execution,
      execution_status: "COMPLETED",
      arrival_confirmed: true,
      arrival_execution_result: "NORMAL_ARRIVAL",
      actual_target_cell_id: execution.current_cell_id,
      actual_target_service_area_id: execution.target_service_area_id || execution.current_target_service_area_id || null,
      completed_at: now,
      updated_at: now,
    },
    task: {
      ...task,
      task_status: nextTaskStatus,
      arrival_confirmed_at: now,
      actual_target_cell_id: execution.current_cell_id,
      actual_target_service_area_id: execution.target_service_area_id || execution.current_target_service_area_id || null,
      updated_at: now,
    },
    robotaxi: robotaxi ? {
      ...robotaxi,
      current_cell_id: execution.current_cell_id,
      current_route_id: null,
      current_route_execution_id: null,
      current_task_status: nextTaskStatus,
      motion_status: "PARKED",
      updated_at: now,
    } : null,
  };
}

export function startFleetOperationWork({ task, robotaxi, context = {} } = {}) {
  if (!task?.task_id || !robotaxi?.robotaxi_id) return { succeeded: false, reason: "INVALID_FLEET_OPERATION_WORK_INPUT" };
  const now = resolveNow(context);
  const nextStatus = getFleetOperationWorkStatus(task);
  if (!nextStatus) return { succeeded: false, reason: "FLEET_OPERATION_WORK_NOT_READY" };
  return {
    succeeded: true,
    task: {
      ...task,
      task_status: nextStatus,
      work_started_at: task.work_started_at || now,
      charging_phase: nextStatus === ChargingTaskStatus.CONNECTING_CHARGER
        ? "CONNECTING"
        : nextStatus === ChargingTaskStatus.DISCONNECTING_CHARGER
          ? "DISCONNECTING"
          : task.charging_phase || null,
      updated_at: now,
    },
    robotaxi: {
      ...robotaxi,
      current_task_id: task.task_id,
      current_task_type: task.task_type,
      current_task_status: nextStatus,
      fleet_operation_status: getFleetOperationInProgressStatus(task.task_type, robotaxi.fleet_operation_status),
      updated_at: now,
    },
  };
}

export function completeFleetOperationWork({ task, robotaxi, context = {} } = {}) {
  if (!task?.task_id || !robotaxi?.robotaxi_id) return { succeeded: false, reason: "INVALID_FLEET_OPERATION_WORK_INPUT" };
  const now = resolveNow(context);
  if (task.task_type === TaskType.CHARGING) {
    return completeChargingWork({ task, robotaxi, now });
  }
  if (!isCompletableWorkStatus(task)) return { succeeded: false, reason: "FLEET_OPERATION_WORK_NOT_COMPLETABLE" };
  return completeFleetOperationTask({ task, robotaxi, now });
}

export function applyFleetOperationTaskReference(robotaxi, { task, shouldWait, now } = {}) {
  if (!task) return robotaxi;
  if (shouldWait) {
    return {
      ...robotaxi,
      ...getTagUpdatesForTaskType(task.task_type),
      pending_fleet_task_type: task.task_type,
      pending_fleet_task_id: task.task_id,
      availability_status: task.task_type === TaskType.RETIREMENT ? "RETIRED" : "UNAVAILABLE",
      available_for_dispatch: false,
      fleet_operation_status: "WAITING_SERVICE_COMPLETION",
      operation_blocking_reason: task.task_type,
      updated_at: now || robotaxi.updated_at,
    };
  }
  return {
    ...robotaxi,
    ...getTagUpdatesForTaskType(task.task_type),
    current_task_id: task.task_id,
    current_task_type: task.task_type,
    current_task_status: task.task_status,
    availability_status: task.task_type === TaskType.RETIREMENT ? "RETIRED" : "UNAVAILABLE",
    retirement_status: task.task_type === TaskType.RETIREMENT ? "RETIRED" : robotaxi.retirement_status,
    available_for_dispatch: false,
    fleet_operation_status: resolveFleetOperationStatusForTask(task.task_type),
    operation_blocking_reason: task.task_type,
    updated_at: now || robotaxi.updated_at,
  };
}

export function getTagUpdatesForTaskType(taskType) {
  if (taskType === "CLEANING") return { needs_cleaning: true, cleanliness_status: CleanlinessStatus.NEEDS_CLEANING };
  if (taskType === "CHARGING") return { needs_charging: true, battery_operation_status: BatteryOperationStatus.LOW };
  if (taskType === "MAINTENANCE") return { needs_maintenance: true, maintenance_status: MaintenanceStatus.DUE };
  return {};
}

export function resolveFleetOperationStatusForTask(taskType) {
  if (taskType === TaskType.CLEANING) return "NEED_CLEANING";
  if (taskType === TaskType.CHARGING) return "NEED_CHARGING";
  if (taskType === TaskType.MAINTENANCE) return "NEED_MAINTENANCE";
  if (taskType === TaskType.FAILURE_HANDLING) return "BROKEN";
  if (taskType === TaskType.RETIREMENT) return "RETIRED";
  return "NONE";
}

export function getFleetOperationMovingStatus(taskType) {
  if (taskType === TaskType.CHARGING) return ChargingTaskStatus.MOVING_TO_CHARGER;
  if (taskType === TaskType.MAINTENANCE) return MaintenanceTaskStatus.MOVING_TO_MAINTENANCE_CENTER;
  if (taskType === TaskType.RETIREMENT) return RetirementTaskStatus.MOVING_TO_RETIREMENT_CENTER;
  return FleetOperationTaskStatus.MOVING_TO_OPS_CENTER;
}

export function getFleetOperationArrivedStatus(taskType) {
  if (taskType === TaskType.CHARGING) return ChargingTaskStatus.ARRIVED_CHARGER;
  if (taskType === TaskType.MAINTENANCE) return MaintenanceTaskStatus.ARRIVED_MAINTENANCE_CENTER;
  if (taskType === TaskType.RETIREMENT) return RetirementTaskStatus.ARRIVED_RETIREMENT_CENTER;
  return FleetOperationTaskStatus.ARRIVED_OPS_CENTER;
}

export function getFleetOperationAfterArrivalStatus(taskType) {
  if (taskType === TaskType.CHARGING) return ChargingTaskStatus.WAITING_CHARGER_ASSIGNMENT;
  if (taskType === TaskType.MAINTENANCE) return MaintenanceTaskStatus.WAITING_RESOURCE_ASSIGNMENT;
  if (taskType === TaskType.RETIREMENT) return RetirementTaskStatus.PROCESSING_RETIREMENT;
  if (taskType === TaskType.FAILURE_HANDLING) return FailureHandlingTaskStatus.WAITING_DIAGNOSIS_ASSIGNMENT;
  return FleetOperationTaskStatus.WAITING_WORKER_ASSIGNMENT;
}

function isDestinationAssignmentStatus(status) {
  return [
    FleetOperationTaskStatus.WAITING_DESTINATION_ASSIGNMENT,
    ChargingTaskStatus.WAITING_CHARGING_DESTINATION_ASSIGNMENT,
    MaintenanceTaskStatus.WAITING_MAINTENANCE_DESTINATION_ASSIGNMENT,
    RetirementTaskStatus.WAITING_DESTINATION_ASSIGNMENT,
  ].includes(status);
}

function getWaitingRouteStatus() {
  return "WAITING_ROUTE";
}

function getFleetOperationWorkStatus(task) {
  if (task.task_type === TaskType.CLEANING && task.task_status === FleetOperationTaskStatus.WAITING_WORKER_ASSIGNMENT) {
    return FleetOperationTaskStatus.CLEANING_IN_PROGRESS;
  }
  if (task.task_type === TaskType.MAINTENANCE && task.task_status === MaintenanceTaskStatus.WAITING_RESOURCE_ASSIGNMENT) {
    return MaintenanceTaskStatus.MAINTENANCE_IN_PROGRESS;
  }
  if (task.task_type === TaskType.CHARGING && task.task_status === ChargingTaskStatus.WAITING_CHARGER_ASSIGNMENT) {
    return task.charging_phase === "DISCONNECT_REQUIRED"
      ? ChargingTaskStatus.DISCONNECTING_CHARGER
      : ChargingTaskStatus.CONNECTING_CHARGER;
  }
  if (task.task_type === TaskType.FAILURE_HANDLING && task.task_status === FailureHandlingTaskStatus.WAITING_DIAGNOSIS_ASSIGNMENT) {
    return FailureHandlingTaskStatus.DIAGNOSING;
  }
  if (task.task_type === TaskType.RETIREMENT && task.task_status === RetirementTaskStatus.PROCESSING_RETIREMENT) {
    return RetirementTaskStatus.PROCESSING_RETIREMENT;
  }
  return null;
}

function getFleetOperationInProgressStatus(taskType, fallback) {
  if (taskType === TaskType.CLEANING) return "IN_CLEANING";
  if (taskType === TaskType.CHARGING) return "IN_CHARGING";
  if (taskType === TaskType.MAINTENANCE) return "IN_MAINTENANCE";
  return fallback || "NONE";
}

function isCompletableWorkStatus(task) {
  return [
    FleetOperationTaskStatus.CLEANING_IN_PROGRESS,
    MaintenanceTaskStatus.MAINTENANCE_IN_PROGRESS,
    RetirementTaskStatus.PROCESSING_RETIREMENT,
    FailureHandlingTaskStatus.DIAGNOSING,
  ].includes(task.task_status);
}

function completeChargingWork({ task, robotaxi, now }) {
  if (task.task_status === ChargingTaskStatus.CONNECTING_CHARGER) {
    return {
      succeeded: true,
      task: {
        ...task,
        task_status: ChargingTaskStatus.CHARGING,
        charging_phase: "CHARGING",
        charging_started_at: now,
        updated_at: now,
      },
      robotaxi: {
        ...robotaxi,
        current_task_status: ChargingTaskStatus.CHARGING,
        battery_operation_status: BatteryOperationStatus.CHARGING,
        fleet_operation_status: "IN_CHARGING",
        updated_at: now,
      },
    };
  }
  if (task.task_status === ChargingTaskStatus.CHARGING) {
    return {
      succeeded: true,
      task: {
        ...task,
        task_status: ChargingTaskStatus.WAITING_CHARGER_ASSIGNMENT,
        charging_phase: "DISCONNECT_REQUIRED",
        charging_completed_at: now,
        updated_at: now,
      },
      robotaxi: {
        ...robotaxi,
        current_task_status: ChargingTaskStatus.WAITING_CHARGER_ASSIGNMENT,
        battery_percent: Number(task.target_battery_percent || 90),
        battery_operation_status: BatteryOperationStatus.ENOUGH,
        updated_at: now,
      },
    };
  }
  if (task.task_status === ChargingTaskStatus.DISCONNECTING_CHARGER) {
    return completeFleetOperationTask({ task, robotaxi, now });
  }
  return { succeeded: false, reason: "CHARGING_WORK_NOT_COMPLETABLE" };
}

function completeFleetOperationTask({ task, robotaxi, now }) {
  return {
    succeeded: true,
    task: {
      ...task,
      task_status: "COMPLETED",
      operation_completed_at: now,
      completed_at: now,
      updated_at: now,
    },
    robotaxi: restoreRobotaxiAfterFleetOperation(robotaxi, task, now),
  };
}

function restoreRobotaxiAfterFleetOperation(robotaxi, task, now) {
  const restored = {
    ...robotaxi,
    availability_status: task.task_type === TaskType.RETIREMENT ? "RETIRED" : "AVAILABLE",
    available_for_dispatch: task.task_type !== TaskType.RETIREMENT,
    current_task_id: null,
    current_task_type: null,
    current_task_status: null,
    current_route_id: null,
    current_route_execution_id: null,
    motion_status: "PARKED",
    fleet_operation_status: task.task_type === TaskType.RETIREMENT ? "RETIRED" : "NONE",
    operation_blocking_reason: task.task_type === TaskType.RETIREMENT ? "RETIREMENT" : null,
    pending_fleet_task_type: null,
    pending_fleet_task_id: null,
    updated_at: now,
  };
  if (task.task_type === TaskType.CLEANING) {
    return { ...restored, needs_cleaning: false, cleanliness_status: CleanlinessStatus.CLEAN };
  }
  if (task.task_type === TaskType.CHARGING) {
    return {
      ...restored,
      needs_charging: false,
      battery_percent: Number(task.target_battery_percent || robotaxi.battery_percent || 90),
      battery_operation_status: BatteryOperationStatus.ENOUGH,
    };
  }
  if (task.task_type === TaskType.MAINTENANCE) {
    return { ...restored, needs_maintenance: false, maintenance_status: MaintenanceStatus.NORMAL };
  }
  return restored;
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
function resolvePriorityLevel(priority) {
  if (priority === TaskPriority.URGENT) return 4;
  if (priority === TaskPriority.HIGH) return 3;
  if (priority === TaskPriority.NORMAL) return 2;
  if (priority === TaskPriority.LOW) return 1;
  return 2;
}

function isRobotaxiAtMatchingOpsCenter(robotaxi, taskType, opsCenters = []) {
  if (!robotaxi?.current_cell_id || !Array.isArray(opsCenters) || !opsCenters.length) return false;
  const capabilityMap = {
    [TaskType.CLEANING]: "can_clean_robotaxi",
    [TaskType.CHARGING]: "can_charge_robotaxi",
    [TaskType.MAINTENANCE]: "can_repair_robotaxi",
    [TaskType.FAILURE_HANDLING]: "can_repair_robotaxi",
    [TaskType.RETIREMENT]: "can_receive_robotaxi",
  };
  const capabilityKey = capabilityMap[taskType];
  if (!capabilityKey) return false;
  return opsCenters.some((oc) =>
    oc.cell_ids?.includes(robotaxi.current_cell_id) && oc[capabilityKey]
  );
}
