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
import * as robotaxiTaskPlanningService from "./robotaxiTaskPlanningService.js";
import * as costModelCalculator from "../data/costModelCalculator.js";
import {
  applyChargingDelta,
  getCompletedCounterKeyForFleetTask,
  getBatteryKwhFromPercent,
  getCurrentBatteryKwh,
  incrementCompletedCounter,
  markAvailable,
  markInFleetOperation,
  markRetired,
} from "./robotaxiStateService.js";

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

function findFleetOperationTask(tasksByType = {}, taskId) {
  if (!taskId) return null;
  return [
    ...(tasksByType.cleaningTasks || []),
    ...(tasksByType.chargingTasks || []),
    ...(tasksByType.maintenanceTasks || []),
    ...(tasksByType.failureHandlingTasks || []),
    ...(tasksByType.retirementTasks || []),
  ].find((task) => task.task_id === taskId) || null;
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
  const planningInput = {
    robotaxi,
    requestedAssignmentType: robotaxiTaskPlanningService.TaskPlanningAssignmentType.FLEET_OPERATION_TASK,
    requestedTaskType: taskType,
    triggerSource: trigger.trigger_source,
    readinessTasks: context.readinessTasks || [],
    deploymentTasks: context.deploymentTasks || [],
    serviceOrders: context.serviceOrders || [],
    fleetOperationTasks: existingTasks,
    strategy: context.robotaxiTaskPlanningStrategy,
  };
  const planningDecision = context.recordTaskPlanningAudit
    ? robotaxiTaskPlanningService.executeRobotaxiTaskPlanning({
      ...planningInput,
      context: {
        now,
        nextTaskPlanningRunId: context.nextTaskPlanningRunId,
        nextTaskPlanningResultId: context.nextTaskPlanningResultId,
        trigger_object_type: trigger.task_fields?.trigger_object_type || null,
        trigger_object_id: trigger.task_fields?.trigger_object_id || null,
      },
    })
    : robotaxiTaskPlanningService.planRobotaxiTask(planningInput);
  if (!planningDecision.allowed) {
    return {
      created: false,
      reason: planningDecision.reason,
      planningDecision,
      planningRun: planningDecision.planningRun || null,
      planningResult: planningDecision.planningResult || null,
    };
  }
  if (planningDecision.decision === robotaxiTaskPlanningService.TaskPlanningDecision.QUEUE) {
    const taskId = resolveNextId(context, config.idPrefix);
    const task = withFleetOperationLifecycleStatus(config.factory({
      task_id: taskId,
      task_type: taskType,
      task_status: config.waitingStatus,
      task_priority: trigger.task_priority || TaskPriority.NORMAL,
      trigger_type: trigger.trigger_type || TriggerType.TASK_RESULT,
      trigger_source: trigger.trigger_source || null,
      source_task_id: trigger.source_task_id || null,
      robotaxi_id: robotaxi.robotaxi_id,
      origin_cell_id: robotaxi.current_cell_id || null,
      target_ops_center_id: null,
      target_cell_id: null,
      route_execution_id: null,
      pending_since_at: now,
      operation_created_at: now,
      created_at: now,
      ...createChargingEnergySnapshotFields(robotaxi, taskType),
      ...trigger.task_fields,
      ...createChargingTargetFields(taskType),
      ...resolveAudit(context, { created: true }),
    }), {
      context,
      objectType: getFleetOperationObjectType(taskType),
      statusField: "task_status",
      fromStatus: null,
      toStatus: config.waitingStatus,
      actionType: "FLEET_OPERATION_TASK_CREATE",
      resultType: "FLEET_OPERATION_TASK_QUEUED",
    });
    const robotaxiWithQueue = robotaxiTaskPriorityService.enqueueTask(robotaxi, {
      ...(planningDecision.queue_entry || {}),
      task_id: task.task_id,
      task_type: taskType,
      trigger_type: trigger.trigger_type || TriggerType.TASK_RESULT,
      trigger_source: trigger.trigger_source || null,
      trigger_object_type: trigger.task_fields?.trigger_object_type || null,
      trigger_object_id: trigger.task_fields?.trigger_object_id || null,
      queued_at: now,
    });
    const queuedEntry = (robotaxiWithQueue.pending_task_queue || []).find((item) => item.task_id === task.task_id) || null;
    const planningResult = planningDecision.planningResult ? {
      ...planningDecision.planningResult,
      queue_sequence: queuedEntry?.queue_sequence || planningDecision.planningResult.queue_sequence || null,
      queue_entry: queuedEntry,
      queue_snapshot: robotaxiWithQueue.pending_task_queue || [],
    } : null;
    const planningRun = planningDecision.planningRun ? {
      ...planningDecision.planningRun,
      output_snapshot: {
        ...(planningDecision.planningRun.output_snapshot || {}),
        queue_entry: queuedEntry,
        queue_snapshot: robotaxiWithQueue.pending_task_queue || [],
      },
    } : null;
    return {
      created: true,
      queued: true,
      reason: planningDecision.reason || "FLEET_OPERATION_TASK_QUEUED",
      planningDecision,
      planningRun,
      planningResult,
      task,
      collectionKey: config.collectionKey,
      robotaxi: {
        ...robotaxiWithQueue,
        pending_fleet_task_type: taskType,
        pending_fleet_task_id: task.task_id,
        updated_at: now,
      },
    };
  }

  const taskId = resolveNextId(context, config.idPrefix);
  const isOccupied = Boolean(robotaxi.current_order_id || robotaxi.current_task_id);
  const currentOpsCenter = !isOccupied ? findMatchingOpsCenterForRobotaxiTask(robotaxi, taskType, context.opsCenters) : null;
  const nextTaskStatus = currentOpsCenter && config.directAssignmentStatus
    ? config.directAssignmentStatus
    : config.defaultStatus;
  const task = withFleetOperationLifecycleStatus(config.factory({
    task_id: taskId,
    task_type: taskType,
    task_status: nextTaskStatus,
    task_priority: trigger.task_priority || TaskPriority.NORMAL,
    trigger_type: trigger.trigger_type || TriggerType.TASK_RESULT,
    trigger_source: trigger.trigger_source || null,
    source_task_id: trigger.source_task_id || null,
    robotaxi_id: robotaxi.robotaxi_id,
    origin_cell_id: robotaxi.current_cell_id || null,
    target_ops_center_id: currentOpsCenter?.ops_center_id || null,
    target_cell_id: currentOpsCenter ? robotaxi.current_cell_id || null : null,
    actual_target_cell_id: currentOpsCenter ? robotaxi.current_cell_id || null : null,
    actual_target_service_area_id: currentOpsCenter?.service_area_ids?.[0] || null,
    route_execution_id: null,
    pending_since_at: null,
    operation_created_at: now,
    created_at: now,
    ...createChargingEnergySnapshotFields(robotaxi, taskType),
    ...trigger.task_fields,
    ...createChargingTargetFields(taskType),
    ...resolveAudit(context, { created: true }),
  }), {
    context,
    objectType: getFleetOperationObjectType(taskType),
    statusField: "task_status",
    fromStatus: null,
    toStatus: nextTaskStatus,
    actionType: "FLEET_OPERATION_TASK_CREATE",
    resultType: currentOpsCenter ? "FLEET_OPERATION_ALREADY_AT_CAPABLE_CENTER" : "FLEET_OPERATION_TASK_CREATED",
  });

  return {
    created: true,
    planningDecision,
    planningRun: planningDecision.planningRun || null,
    planningResult: planningDecision.planningResult || null,
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
  const currentOpsCenter = findMatchingOpsCenterForRobotaxiTask(robotaxi, task.task_type, opsCenters);
  const nextStatus = currentOpsCenter && config.directAssignmentStatus
    ? config.directAssignmentStatus
    : config.defaultStatus;
  const activatedTask = withFleetOperationLifecycleStatus({
    ...task,
    task_status: nextStatus,
    origin_cell_id: robotaxi.current_cell_id || task.origin_cell_id || null,
    target_ops_center_id: currentOpsCenter?.ops_center_id || (currentOpsCenter ? task.target_ops_center_id || null : null),
    target_cell_id: currentOpsCenter ? robotaxi.current_cell_id || task.target_cell_id || null : null,
    actual_target_cell_id: currentOpsCenter ? robotaxi.current_cell_id || task.actual_target_cell_id || null : null,
    actual_target_service_area_id: currentOpsCenter?.service_area_ids?.[0] || task.actual_target_service_area_id || null,
    ...createChargingEnergySnapshotFields(robotaxi, task.task_type, task),
    activated_at: now,
    updated_at: now,
  }, {
    context,
    objectType: getFleetOperationObjectType(task.task_type),
    statusField: "task_status",
    fromStatus: task.task_status,
    toStatus: nextStatus,
    actionType: "FLEET_OPERATION_TASK_ACTIVATE",
    resultType: currentOpsCenter ? "FLEET_OPERATION_ALREADY_AT_CAPABLE_CENTER" : "FLEET_OPERATION_WAITING_DESTINATION",
  });
  return {
    succeeded: true,
    alreadyAtCapableCenter: Boolean(currentOpsCenter),
    opsCenter: currentOpsCenter,
    task: activatedTask,
    robotaxi: {
      ...applyFleetOperationTaskReference(robotaxi, { task: activatedTask, shouldWait: false, now }),
      pending_task_queue: robotaxiTaskPriorityService.getQueuedTasksSorted((robotaxi.pending_task_queue || []).filter((item) => item.task_id !== task.task_id)),
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
  const currentOpsCenter = findMatchingOpsCenterForRobotaxiTask(robotaxi, task.task_type, opsCenters);
  if (currentOpsCenter && TASK_CONFIG[task.task_type]?.directAssignmentStatus) {
    const now = resolveNow(context);
    const nextStatus = TASK_CONFIG[task.task_type].directAssignmentStatus;
    const nextTask = withFleetOperationLifecycleStatus({
      ...task,
      target_ops_center_id: currentOpsCenter.ops_center_id,
      target_cell_id: robotaxi.current_cell_id || null,
      actual_target_cell_id: robotaxi.current_cell_id || null,
      actual_target_service_area_id: currentOpsCenter.service_area_ids?.[0] || task.actual_target_service_area_id || null,
      task_status: nextStatus,
      destination_assigned_at: now,
      updated_at: now,
    }, {
      context,
      objectType: getFleetOperationObjectType(task.task_type),
      statusField: "task_status",
      fromStatus: task.task_status,
      toStatus: nextStatus,
      actionType: "FLEET_OPERATION_DESTINATION_ASSIGN",
      resultType: "FLEET_OPERATION_ALREADY_AT_CAPABLE_CENTER",
    });
    return {
      succeeded: true,
      alreadyAtCapableCenter: true,
      dispatchSkipped: true,
      reason: "ROBOTAXI_ALREADY_AT_CAPABLE_OPS_CENTER",
      targetOpsCenterId: currentOpsCenter.ops_center_id,
      targetCellId: robotaxi.current_cell_id || null,
      run: null,
      decision: null,
      task: nextTask,
      robotaxi: {
        ...markInFleetOperation(robotaxi, { task, now }),
        current_task_id: task.task_id,
        current_task_type: task.task_type,
        current_task_status: nextStatus,
        current_cell_id: robotaxi.current_cell_id || null,
        updated_at: now,
      },
    };
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
    task: withFleetOperationLifecycleStatus({
      ...task,
      target_ops_center_id: result.targetOpsCenterId,
      target_cell_id: result.targetCellId,
      task_status: getWaitingRouteStatus(task.task_type),
      destination_assigned_at: now,
      updated_at: now,
    }, {
      context,
      objectType: getFleetOperationObjectType(task.task_type),
      statusField: "task_status",
      fromStatus: task.task_status,
      toStatus: getWaitingRouteStatus(task.task_type),
      actionType: "FLEET_OPERATION_DESTINATION_ASSIGN",
      resultType: "FLEET_OPERATION_DESTINATION_ASSIGNED",
    }),
    robotaxi: {
      ...markInFleetOperation(robotaxi, { task, now }),
      current_task_id: task.task_id,
      current_task_type: task.task_type,
      current_task_status: getWaitingRouteStatus(task.task_type),
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
      task: withFleetOperationLifecycleStatus({
        ...task,
        task_status: "FAILED",
        failure_reason: route.failure_reason,
        updated_at: now,
      }, {
        context,
        objectType: getFleetOperationObjectType(task.task_type),
        statusField: "task_status",
        fromStatus: task.task_status,
        toStatus: "FAILED",
        actionType: "ROUTE_PLAN",
        resultType: "ROUTE_PLAN_FAILED",
      }),
    };
  }
  const routeCellIds = routePlanningService.getRouteExecutionCells(route, data.roadSegments || [], originCellId, targetCellId);
  const movingStatus = getFleetOperationMovingStatus(task.task_type);
  const execution = withFleetOperationLifecycleStatus(routePlanningService.applyTravelMetrics({
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
      battery_consumed_kwh: 0,
      battery_consumed_percent: 0,
      simulation_run_id: task.simulation_run_id || null,
      created_at: now,
      operation_created_at: now,
      ...resolveAudit(context, { created: true }),
    },
    routes: [route],
    currentRouteId: route.route_id,
    currentStepIndex: 0,
  }), {
    context,
    objectType: "routeExecution",
    statusField: "execution_status",
    fromStatus: null,
    toStatus: "MOVING",
    actionType: "ROUTE_EXECUTION_CREATE",
    resultType: "ROUTE_EXECUTION_TRIGGERED",
  });
  return {
    succeeded: true,
    route,
    routePlanningRun,
    routeExecution: execution,
    task: withFleetOperationLifecycleStatus({
      ...task,
      task_status: movingStatus,
      origin_cell_id: originCellId,
      route_execution_id: routeExecutionId,
      route_id: route.route_id,
      route_strategy_id: route.route_strategy_id,
      started_at: now,
      updated_at: now,
    }, {
      context,
      objectType: getFleetOperationObjectType(task.task_type),
      statusField: "task_status",
      fromStatus: task.task_status,
      toStatus: movingStatus,
      actionType: "ROUTE_PLAN",
      resultType: "ROUTE_PLANNED",
    }),
    robotaxi: {
      ...markInFleetOperation(robotaxi, { task, now }),
      current_task_id: task.task_id,
      current_task_type: task.task_type,
      current_task_status: movingStatus,
      current_route_id: route.route_id,
      current_route_execution_id: routeExecutionId,
      motion_status: "MOVING",
      updated_at: now,
    },
  };
}

export function replanFleetOperationRouteAfterAbnormalArrival({
  execution,
  task,
  robotaxi,
  data = {},
  context = {},
} = {}) {
  if (!execution?.route_execution_id || !task?.task_id || !robotaxi?.robotaxi_id || !task?.target_cell_id) {
    return { succeeded: false, reason: "INVALID_FLEET_OPERATION_ROUTE_REPLAN_INPUT" };
  }
  if (execution.execution_status !== "ARRIVAL_ABNORMAL") {
    return { succeeded: false, reason: "FLEET_OPERATION_ROUTE_NOT_ABNORMAL" };
  }
  const now = resolveNow(context);
  const routeId = resolveNextId(context, "DRT");
  const routePlanningRunId = resolveNextId(context, "RPR");
  const originCellId = execution.current_cell_id || robotaxi.current_cell_id || task.origin_cell_id;
  const targetCellId = task.target_cell_id;
  const targetServiceAreaId = task.target_service_area_id || task.planned_target_service_area_id || execution.target_service_area_id || null;
  const route = routePlanningService.createDeploymentRouteForOperation({
    task,
    data,
    routeId,
    routePlanningRunId,
    routeExecutionId: execution.route_execution_id,
    originCellId,
    targetCellId,
    targetServiceAreaId,
    strategyId: RoutePlanningStrategy.ABNORMAL_SAME_SERVICE_AREA,
  });
  const routePlanningRun = routePlanningService.createRoutePlanningRun({
    routePlanningRunId,
    routeStrategyId: route.route_strategy_id,
    planningAlgorithm: route.planning_algorithm,
    taskId: task.task_id,
    routeExecutionId: execution.route_execution_id,
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
      task: withFleetOperationLifecycleStatus({
        ...task,
        task_status: "ARRIVAL_ABNORMAL",
        failure_reason: route.failure_reason,
        updated_at: now,
      }, {
        context,
        objectType: getFleetOperationObjectType(task.task_type),
        statusField: "task_status",
        fromStatus: task.task_status,
        toStatus: "ARRIVAL_ABNORMAL",
        actionType: "ROUTE_PLAN",
        resultType: "ROUTE_PLAN_FAILED",
      }),
    };
  }
  const routeCellIds = routePlanningService.getRouteExecutionCells(route, data.roadSegments || [], originCellId, targetCellId);
  const movingStatus = getFleetOperationMovingStatus(task.task_type);
  const nextExecution = withFleetOperationLifecycleStatus(routePlanningService.applyTravelMetrics({
    record: {
      ...execution,
      route_id: route.route_id,
      route_strategy_id: route.route_strategy_id,
      execution_status: "MOVING",
      origin_cell_id: originCellId,
      target_cell_id: targetCellId,
      target_service_area_id: targetServiceAreaId,
      actual_target_service_area_id: null,
      actual_target_cell_id: null,
      current_step_index: 0,
      total_step_count: Math.max(0, routeCellIds.length - 1),
      route_cell_ids: routeCellIds,
      current_target_service_area_id: targetServiceAreaId,
      route_history: [
        ...(execution.route_history || []),
        routePlanningService.createRouteHistoryEntry(route, RouteChangeReason.ABNORMAL_ARRIVAL_REPLAN, execution.arrival_execution_result || task.arrival_execution_result || null),
      ],
      time_elapsed: "0",
      battery_consumed_kwh: 0,
      battery_consumed_percent: 0,
      completed_at: null,
      failure_reason: null,
      updated_at: now,
    },
    routes: [route],
    currentRouteId: route.route_id,
    currentStepIndex: 0,
  }), {
    context,
    objectType: "routeExecution",
    statusField: "execution_status",
    fromStatus: execution.execution_status,
    toStatus: "MOVING",
    actionType: "ROUTE_PLAN",
    resultType: "ROUTE_PLANNED",
  });
  return {
    succeeded: true,
    route,
    routePlanningRun,
    routeExecution: nextExecution,
    task: withFleetOperationLifecycleStatus({
      ...task,
      task_status: movingStatus,
      route_id: route.route_id,
      route_strategy_id: route.route_strategy_id,
      actual_target_service_area_id: null,
      actual_target_cell_id: null,
      failure_reason: null,
      updated_at: now,
    }, {
      context,
      objectType: getFleetOperationObjectType(task.task_type),
      statusField: "task_status",
      fromStatus: task.task_status,
      toStatus: movingStatus,
      actionType: "ROUTE_PLAN",
      resultType: "ROUTE_PLANNED",
    }),
    robotaxi: {
      ...markInFleetOperation(robotaxi, { task, now }),
      current_task_id: task.task_id,
      current_task_type: task.task_type,
      current_task_status: movingStatus,
      current_route_id: route.route_id,
      current_route_execution_id: execution.route_execution_id,
      motion_status: "MOVING",
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
  const nextTaskStatus = arrived ? arrivedStatus : movingStatus;
  return {
    succeeded: true,
    routeExecution: withFleetOperationLifecycleStatus({
      ...step.execution,
      updated_at: now,
    }, {
      context,
      objectType: "routeExecution",
      statusField: "execution_status",
      fromStatus: execution.execution_status,
      toStatus: step.execution.execution_status,
      actionType: "ROUTE_EXECUTION_STEP",
      resultType: arrived ? "ROUTE_TRAVEL_COMPLETED" : "ROUTE_STEPPED",
      movementStepCount: route?.route_step_count || execution.total_step_count || null,
      secondsPerCell: routePlanningService.DEFAULT_CELL_TRAVEL_SECONDS,
    }),
    task: task ? withFleetOperationLifecycleStatus({
      ...task,
      task_status: nextTaskStatus,
      arrival_confirmed_at: arrived ? now : task.arrival_confirmed_at || null,
      actual_target_cell_id: arrived ? step.execution.current_cell_id : task.actual_target_cell_id || null,
      actual_target_service_area_id: arrived ? step.execution.target_service_area_id || step.execution.current_target_service_area_id || null : task.actual_target_service_area_id || null,
      updated_at: now,
    }, {
      context,
      objectType: getFleetOperationObjectType(task.task_type),
      statusField: "task_status",
      fromStatus: task.task_status,
      toStatus: nextTaskStatus,
      actionType: "ROUTE_EXECUTION_STEP",
      resultType: arrived ? "ROUTE_TRAVEL_COMPLETED" : "ROUTE_STEPPED",
      movementStepCount: route?.route_step_count || execution.total_step_count || null,
      secondsPerCell: routePlanningService.DEFAULT_CELL_TRAVEL_SECONDS,
    }) : null,
    robotaxi: step.robotaxi ? {
      ...step.robotaxi,
      current_task_status: nextTaskStatus,
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
  const result = {
    succeeded: true,
    routeExecution: withFleetOperationLifecycleStatus({
      ...execution,
      execution_status: "COMPLETED",
      arrival_confirmed: true,
      arrival_execution_result: "NORMAL_ARRIVAL",
      actual_target_cell_id: execution.current_cell_id,
      actual_target_service_area_id: execution.target_service_area_id || execution.current_target_service_area_id || null,
      completed_at: now,
      updated_at: now,
    }, {
      context,
      objectType: "routeExecution",
      statusField: "execution_status",
      fromStatus: execution.execution_status,
      toStatus: "COMPLETED",
      actionType: "ARRIVAL_CONFIRM",
      resultType: "ARRIVAL_CONFIRMED",
    }),
    task: withFleetOperationLifecycleStatus({
      ...task,
      task_status: nextTaskStatus,
      arrival_confirmed_at: now,
      actual_target_cell_id: execution.current_cell_id,
      actual_target_service_area_id: execution.target_service_area_id || execution.current_target_service_area_id || null,
      updated_at: now,
    }, {
      context,
      objectType: getFleetOperationObjectType(task.task_type),
      statusField: "task_status",
      fromStatus: task.task_status,
      toStatus: nextTaskStatus,
      actionType: "ARRIVAL_CONFIRM",
      resultType: "ARRIVAL_CONFIRMED",
    }),
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
  return withFleetOperationRouteCostFacts(result, { context, sourceExecution: result.routeExecution });
}

export function confirmFleetOperationAbnormalArrival({ execution, task, robotaxi, arrivalResult, context = {} } = {}) {
  if (!execution || !task || execution.execution_status !== "ARRIVED") {
    return { succeeded: false, reason: "FLEET_OPERATION_ABNORMAL_ARRIVAL_NOT_READY" };
  }
  const now = resolveNow(context);
  return {
    succeeded: true,
    routeExecution: withFleetOperationLifecycleStatus({
      ...execution,
      execution_status: "ARRIVAL_ABNORMAL",
      arrival_execution_result: arrivalResult || "ARRIVED_WITH_TARGET_OCCUPIED",
      actual_target_cell_id: execution.current_cell_id,
      actual_target_service_area_id: execution.target_service_area_id || execution.current_target_service_area_id || null,
      failure_reason: arrivalResult || "ARRIVED_WITH_TARGET_OCCUPIED",
      updated_at: now,
    }, {
      context,
      objectType: "routeExecution",
      statusField: "execution_status",
      fromStatus: execution.execution_status,
      toStatus: "ARRIVAL_ABNORMAL",
      actionType: "ARRIVAL_CONFIRM",
      resultType: "ARRIVAL_CONFIRM_FAILED",
    }),
    task: withFleetOperationLifecycleStatus({
      ...task,
      task_status: "ARRIVAL_ABNORMAL",
      arrival_execution_result: arrivalResult || "ARRIVED_WITH_TARGET_OCCUPIED",
      actual_target_cell_id: execution.current_cell_id,
      actual_target_service_area_id: execution.target_service_area_id || execution.current_target_service_area_id || null,
      failure_reason: arrivalResult || "ARRIVED_WITH_TARGET_OCCUPIED",
      updated_at: now,
    }, {
      context,
      objectType: getFleetOperationObjectType(task.task_type),
      statusField: "task_status",
      fromStatus: task.task_status,
      toStatus: "ARRIVAL_ABNORMAL",
      actionType: "ARRIVAL_CONFIRM",
      resultType: "ARRIVAL_CONFIRM_FAILED",
    }),
    robotaxi: robotaxi ? {
      ...robotaxi,
      current_cell_id: execution.current_cell_id,
      current_route_id: null,
      current_route_execution_id: null,
      current_task_status: "ARRIVAL_ABNORMAL",
      motion_status: "PARKED",
      updated_at: now,
    } : null,
  };
}

export function activateNextQueuedFleetOperationTask({ robotaxi, tasksByType = {}, opsCenters = [], context = {} } = {}) {
  const queue = robotaxiTaskPriorityService.getQueuedTasksSorted(robotaxi?.pending_task_queue || []);
  if (!robotaxi?.robotaxi_id || queue.length === 0) return { activated: false, robotaxi, task: null };
  const nextEntry = queue[0];
  const task = findFleetOperationTask(tasksByType, nextEntry.task_id);
  if (!task) {
    return {
      activated: false,
      reason: "QUEUED_TASK_NOT_FOUND",
      missingTaskId: nextEntry.task_id || null,
      robotaxi: {
        ...robotaxi,
        pending_task_queue: robotaxiTaskPriorityService.getQueuedTasksSorted(queue.slice(1)),
      },
      task: null,
    };
  }
  const activation = activateQueuedFleetOperationTask({ task, robotaxi, opsCenters, context });
  if (!activation.succeeded) return { activated: false, reason: activation.reason, robotaxi, task: null };
  return {
    activated: true,
    task: activation.task,
    robotaxi: {
      ...activation.robotaxi,
      pending_task_queue: robotaxiTaskPriorityService.getQueuedTasksSorted(activation.robotaxi.pending_task_queue || []),
    },
  };
}

export function assignFleetOperationWorker({ task, robotaxi, workers = [], context = {} } = {}) {
  if (!task?.task_id || !robotaxi?.robotaxi_id) return { succeeded: false, reason: "INVALID_FLEET_OPERATION_WORKER_INPUT" };
  if (!isFleetOperationWaitingWorkerStatus(task)) return { succeeded: false, reason: "FLEET_OPERATION_WORKER_NOT_READY" };
  const now = resolveNow(context);
  const worker = (workers || []).find((item) =>
    item.worker_status === "IDLE"
    && item.current_task_id == null
    && (!task.target_ops_center_id || item.ops_center_id === task.target_ops_center_id)
  );
  if (!worker) return { succeeded: false, reason: "NO_IDLE_WORKER" };
  const nextStatus = getFleetOperationReadyToStartStatus(task);
  return {
    succeeded: true,
    worker,
    task: withFleetOperationLifecycleStatus({
      ...task,
      worker_id: worker.worker_id,
      assigned_worker_id: worker.worker_id,
      task_status: nextStatus,
      assigned_at: now,
      updated_at: now,
    }, {
      context,
      objectType: getFleetOperationObjectType(task.task_type),
      statusField: "task_status",
      fromStatus: task.task_status,
      toStatus: nextStatus,
      actionType: "FLEET_OPERATION_WORKER_ASSIGN",
      resultType: "FLEET_OPERATION_WORKER_ASSIGNED",
    }),
    robotaxi: {
      ...robotaxi,
      current_task_id: task.task_id,
      current_task_type: task.task_type,
      current_task_status: nextStatus,
      updated_at: now,
    },
    workerRecord: {
      ...worker,
      worker_status: "BUSY",
      current_task_id: task.task_id,
      current_task_type: task.task_type,
      current_task_status: nextStatus,
      updated_at: now,
    },
  };
}

export function startFleetOperationWork({ task, robotaxi, context = {} } = {}) {
  if (!task?.task_id || !robotaxi?.robotaxi_id) return { succeeded: false, reason: "INVALID_FLEET_OPERATION_WORK_INPUT" };
  const now = resolveNow(context);
  if (task.task_type === TaskType.CHARGING && task.task_status === ChargingTaskStatus.READY_TO_CHARGE) {
    return completeChargingWork({ task, robotaxi, now, context });
  }
  const nextStatus = getFleetOperationWorkStatus(task);
  if (!nextStatus) return { succeeded: false, reason: "FLEET_OPERATION_WORK_NOT_READY" };
  return {
    succeeded: true,
    task: withFleetOperationLifecycleStatus({
      ...task,
      task_status: nextStatus,
      work_started_at: task.work_started_at || now,
      charging_phase: nextStatus === ChargingTaskStatus.CONNECTING_CHARGER
        ? "CONNECTING"
        : nextStatus === ChargingTaskStatus.DISCONNECTING_CHARGER
          ? "DISCONNECTING"
          : task.charging_phase || null,
      updated_at: now,
    }, {
      context,
      objectType: getFleetOperationObjectType(task.task_type),
      statusField: "task_status",
      fromStatus: task.task_status,
      toStatus: nextStatus,
      actionType: "FLEET_OPERATION_WORK_START",
      resultType: "FLEET_OPERATION_WORK_STARTED",
    }),
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
  let result = null;
  if (task.task_type === TaskType.CHARGING) {
    result = completeChargingWork({ task, robotaxi, now, context });
  } else {
    if (!isCompletableWorkStatus(task)) return { succeeded: false, reason: "FLEET_OPERATION_WORK_NOT_COMPLETABLE" };
    result = completeFleetOperationTask({ task, robotaxi, now, context });
  }
  if (result?.succeeded && result.task?.task_status === "COMPLETED") {
    return withFleetOperationCostFacts(result, { context, sourceTask: result.task });
  }
  return result;
}

export function applyFleetOperationTaskReference(robotaxi, { task, shouldWait, now } = {}) {
  if (!task) return robotaxi;
  if (shouldWait) {
    return {
      ...robotaxi,
      pending_fleet_task_type: task.task_type,
      pending_fleet_task_id: task.task_id,
      updated_at: now || robotaxi.updated_at,
    };
  }
  return {
    ...markInFleetOperation(robotaxi, { task, now }),
    current_task_id: task.task_id,
    current_task_type: task.task_type,
    current_task_status: task.task_status,
    fleet_operation_status: resolveFleetOperationStatusForTask(task.task_type),
    operation_blocking_reason: task.task_type,
    updated_at: now || robotaxi.updated_at,
  };
}

export function getTagUpdatesForTaskType(taskType) {
  void taskType;
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
  if (task.task_type === TaskType.CLEANING && task.task_status === FleetOperationTaskStatus.READY_TO_START) {
    return FleetOperationTaskStatus.CLEANING_IN_PROGRESS;
  }
  if (task.task_type === TaskType.MAINTENANCE && task.task_status === MaintenanceTaskStatus.READY_TO_START) {
    return MaintenanceTaskStatus.MAINTENANCE_IN_PROGRESS;
  }
  if (task.task_type === TaskType.CHARGING && task.task_status === ChargingTaskStatus.READY_TO_CHARGE) {
    return ChargingTaskStatus.CHARGING;
  }
  if (task.task_type === TaskType.FAILURE_HANDLING && task.task_status === FailureHandlingTaskStatus.WAITING_DIAGNOSIS_ASSIGNMENT) {
    return FailureHandlingTaskStatus.DIAGNOSING;
  }
  if (task.task_type === TaskType.RETIREMENT && task.task_status === RetirementTaskStatus.PROCESSING_RETIREMENT) {
    return RetirementTaskStatus.PROCESSING_RETIREMENT;
  }
  return null;
}

function isFleetOperationWaitingWorkerStatus(task) {
  return [
    FleetOperationTaskStatus.WAITING_WORKER_ASSIGNMENT,
    FleetOperationTaskStatus.WAITING_RESOURCE_ASSIGNMENT,
    ChargingTaskStatus.WAITING_CHARGER_ASSIGNMENT,
    MaintenanceTaskStatus.WAITING_RESOURCE_ASSIGNMENT,
    FailureHandlingTaskStatus.WAITING_DIAGNOSIS_ASSIGNMENT,
  ].includes(task.task_status);
}

function getFleetOperationReadyToStartStatus(task) {
  if (task.task_type === TaskType.CHARGING && task.charging_phase === "DISCONNECT_REQUIRED") return ChargingTaskStatus.READY_TO_DISCONNECT;
  if (task.task_type === TaskType.CHARGING) return ChargingTaskStatus.READY_TO_CHARGE;
  if (task.task_type === TaskType.MAINTENANCE) return MaintenanceTaskStatus.READY_TO_START;
  if (task.task_type === TaskType.FAILURE_HANDLING) return FailureHandlingTaskStatus.DIAGNOSING;
  return FleetOperationTaskStatus.READY_TO_START;
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

function completeChargingWork({ task, robotaxi, now, context = {} }) {
  if (task.task_status === ChargingTaskStatus.READY_TO_CHARGE) {
    return {
      succeeded: true,
      task: withFleetOperationLifecycleStatus({
        ...task,
        task_status: ChargingTaskStatus.CHARGING,
        worker_id: null,
        assigned_worker_id: null,
        charging_phase: "CHARGING",
        charging_started_at: now,
        updated_at: now,
      }, {
        context,
        objectType: getFleetOperationObjectType(task.task_type),
        statusField: "task_status",
        fromStatus: task.task_status,
        toStatus: ChargingTaskStatus.CHARGING,
        actionType: "FLEET_OPERATION_WORK_START",
        resultType: "FLEET_OPERATION_WORK_STARTED",
        durationSeconds: 60,
      }),
      robotaxi: {
        ...robotaxi,
        current_task_status: ChargingTaskStatus.CHARGING,
        battery_operation_status: BatteryOperationStatus.CHARGING,
        fleet_operation_status: "IN_CHARGING",
        updated_at: now,
      },
      worker: task.worker_id ? {
        worker_id: task.worker_id,
        worker_status: "IDLE",
        current_task_id: null,
        current_task_type: null,
        current_task_status: null,
        updated_at: now,
      } : null,
    };
  }
  if (task.task_status === ChargingTaskStatus.CHARGING) {
    const targetBatteryPercent = 100;
    const batteryPercentBefore = Number(task.battery_percent_before ?? robotaxi.battery_percent ?? 0);
    const robotaxiBatteryCapacityKwh = Number(task.robotaxi_battery_capacity_kwh || robotaxi.battery_capacity_kwh || 0);
    const targetBatteryKwh = robotaxiBatteryCapacityKwh || getBatteryKwhFromPercent(robotaxi, targetBatteryPercent);
    const currentBatteryKwh = Number(task.robotaxi_current_battery_kwh ?? getCurrentBatteryKwh(robotaxi));
    const chargedEnergyKwh = Number(Math.max(0, targetBatteryKwh - currentBatteryKwh).toFixed(2));
    const nextRobotaxi = applyChargingDelta(robotaxi, {
      chargedEnergyKwh,
      targetBatteryKwh,
      targetBatteryPercent,
      now,
    });
    return {
      succeeded: true,
      task: withFleetOperationLifecycleStatus({
        ...task,
        task_status: ChargingTaskStatus.WAITING_CHARGER_ASSIGNMENT,
        worker_id: null,
        assigned_worker_id: null,
        charging_phase: "DISCONNECT_REQUIRED",
        robotaxi_current_battery_kwh: currentBatteryKwh,
        robotaxi_battery_capacity_kwh: robotaxiBatteryCapacityKwh || targetBatteryKwh,
        battery_percent_before: batteryPercentBefore,
        target_battery_percent: targetBatteryPercent,
        battery_percent_after: targetBatteryPercent,
        charged_energy_kwh: chargedEnergyKwh,
        charging_completed_at: now,
        updated_at: now,
      }, {
        context,
        objectType: getFleetOperationObjectType(task.task_type),
        statusField: "task_status",
        fromStatus: task.task_status,
        toStatus: ChargingTaskStatus.WAITING_CHARGER_ASSIGNMENT,
        actionType: "FLEET_OPERATION_CHARGING_COMPLETE",
        resultType: "FLEET_OPERATION_CHARGING_COMPLETED",
        durationSeconds: 1800,
      }),
      robotaxi: {
        ...nextRobotaxi,
        current_task_status: ChargingTaskStatus.WAITING_CHARGER_ASSIGNMENT,
        battery_operation_status: BatteryOperationStatus.ENOUGH,
        updated_at: now,
      },
    };
  }
  if (task.task_status === ChargingTaskStatus.READY_TO_DISCONNECT) {
    return completeFleetOperationTask({ task, robotaxi, now, context });
  }
  return { succeeded: false, reason: "CHARGING_WORK_NOT_COMPLETABLE" };
}

function completeFleetOperationTask({ task, robotaxi, now, context = {} }) {
  return {
    succeeded: true,
    task: withFleetOperationLifecycleStatus({
      ...task,
      task_status: "COMPLETED",
      operation_completed_at: now,
      completed_at: now,
      updated_at: now,
    }, {
      context,
      objectType: getFleetOperationObjectType(task.task_type),
      statusField: "task_status",
      fromStatus: task.task_status,
      toStatus: "COMPLETED",
      actionType: "FLEET_OPERATION_WORK_COMPLETE",
      resultType: "FLEET_OPERATION_WORK_COMPLETED",
      durationSeconds: getDefaultFleetOperationWorkDurationSeconds(task.task_type),
    }),
    robotaxi: restoreRobotaxiAfterFleetOperation(robotaxi, task, now),
    worker: task.worker_id ? {
      worker_id: task.worker_id,
      worker_status: "IDLE",
      current_task_id: null,
      current_task_type: null,
      current_task_status: null,
      updated_at: now,
    } : null,
  };
}

function withFleetOperationCostFacts(result, { context = {}, sourceTask } = {}) {
  const profile = context.costModelProfile || context.costModelProfiles?.find((item) => item.profile_status === "ACTIVE")
    || costModelCalculator.initializeDefaultCostModelProfile?.();
  const objectType = getFleetOperationObjectType(sourceTask.task_type);
  const calculation = costModelCalculator.createIncrementalCostRecords({
    simulationRun: {
      simulation_run_id: sourceTask.simulation_run_id || context.simulation_run_id || "BUSINESS-RUNTIME",
      simulation_timeline_id: sourceTask.simulation_timeline_id || context.simulation_timeline_id || null,
      simulation_status: "COMPLETED",
    },
    profile,
    businessData: context.businessData || {},
    sourceObject: sourceTask,
    sourceObjectType: objectType,
    calculationRunId: typeof context.nextCostFactRunId === "function"
      ? context.nextCostFactRunId()
      : resolveNextId(context, "CFR"),
  });
  const previousRecords = context.costRecords || [];
  return {
    ...result,
    task: calculation.sourceObject || result.task,
    costRecords: [
      ...calculation.costRecords,
      ...previousRecords.filter((record) => !(record.source_object_type === objectType && record.source_object_id === sourceTask.task_id)),
    ],
    generatedCostRecords: calculation.costRecords,
  };
}

function withFleetOperationRouteCostFacts(result, { context = {}, sourceExecution } = {}) {
  if (!sourceExecution?.route_execution_id) return result;
  const profile = context.costModelProfile || context.costModelProfiles?.find((item) => item.profile_status === "ACTIVE")
    || costModelCalculator.initializeDefaultCostModelProfile?.();
  const calculation = costModelCalculator.createIncrementalCostRecords({
    simulationRun: {
      simulation_run_id: sourceExecution.simulation_run_id || context.simulation_run_id || "BUSINESS-RUNTIME",
      simulation_timeline_id: sourceExecution.simulation_timeline_id || context.simulation_timeline_id || null,
      simulation_status: "COMPLETED",
    },
    profile,
    businessData: context.businessData || {},
    sourceObject: sourceExecution,
    sourceObjectType: "routeExecution",
    calculationRunId: typeof context.nextCostFactRunId === "function"
      ? context.nextCostFactRunId()
      : resolveNextId(context, "CFR"),
  });
  const previousRecords = context.costRecords || [];
  return {
    ...result,
    routeExecution: calculation.sourceObject || result.routeExecution,
    costRecords: [
      ...calculation.costRecords,
      ...previousRecords.filter((record) => !(record.source_object_type === "routeExecution" && record.source_object_id === sourceExecution.route_execution_id)),
    ],
    generatedCostRecords: calculation.costRecords,
  };
}

function withFleetOperationLifecycleStatus(item, {
  context = {},
  objectType,
  statusField,
  fromStatus,
  toStatus,
  actionType,
  resultType,
  durationSeconds = 0,
  movementStepCount = null,
  secondsPerCell = null,
  sourceTransitionId = null,
} = {}) {
  if (!item || !statusField || !actionType) return item;
  const previousStatus = fromStatus !== undefined ? fromStatus : item[statusField] || null;
  const nextStatus = toStatus !== undefined ? toStatus : item[statusField] || null;
  const history = Array.isArray(item.simulation_status_transition_history) ? item.simulation_status_transition_history : [];
  if (history.length > 0 && previousStatus === nextStatus) return item;
  const occurredAt = resolveNow(context);
  const simulationAt = resolveSimulationTime(context, item, occurredAt);
  const transition = {
    status_transition_id: typeof context.nextStatusTransitionId === "function"
      ? context.nextStatusTransitionId()
      : resolveNextId(context, "ST"),
    transition_sequence: history.length + 1,
    business_object_type: objectType || null,
    business_object_id: resolveLifecycleObjectId(item, objectType),
    from_status: previousStatus,
    action_type: actionType,
    result_type: resultType || null,
    to_status: nextStatus,
    occurred_at: occurredAt,
    simulation_occurred_at: simulationAt,
    time_mode: context.timeContext?.time_mode || context.time_mode || "REAL_TIME",
    trigger_source: context.trigger_source || (context.action ? "SIMULATION_TIMED_OPERATION" : "MANUAL_OR_SERVICE"),
    simulation_action_started_at: simulationAt,
    calculated_simulation_action_started_at: simulationAt,
    configured_duration_seconds: Math.max(0, Number(durationSeconds) || 0),
    movement_step_count: movementStepCount,
    seconds_per_cell: secondsPerCell,
    simulation_status_changed_at: simulationAt,
    calculated_simulation_status_changed_at: simulationAt,
    workflow_timing_rule_id: context.workflow_timing_rule_id || null,
    source_transition_id: sourceTransitionId,
    business_timing_calculation_run_id: null,
  };
  return {
    ...item,
    simulation_status_transition_history: [...history, transition],
  };
}

function resolveSimulationTime(context, item, fallback) {
  if (typeof context.simulationTime === "function") return context.simulationTime();
  return context.simulation_time
    || item.simulation_updated_at
    || item.simulation_created_at
    || item.simulation_completed_at
    || fallback;
}

function resolveLifecycleObjectId(item, objectType) {
  if (objectType === "routeExecution") return item.route_execution_id || null;
  if (objectType === "trip") return item.trip_id || null;
  if (objectType === "serviceOrder") return item.service_order_id || null;
  if (objectType === "robotaxi") return item.robotaxi_id || null;
  return item.task_id || item.route_execution_id || item.robotaxi_id || null;
}

function getFleetOperationObjectType(taskType) {
  if (taskType === TaskType.CHARGING) return "chargingTask";
  if (taskType === TaskType.MAINTENANCE) return "maintenanceTask";
  if (taskType === TaskType.FAILURE_HANDLING) return "failureHandlingTask";
  if (taskType === TaskType.RETIREMENT) return "retirementTask";
  return "cleaningTask";
}

function restoreRobotaxiAfterFleetOperation(robotaxi, task, now) {
  const baseStatus = task.task_type === TaskType.RETIREMENT
    ? markRetired(robotaxi, { now })
    : markAvailable(robotaxi, { now });
  const counterKey = getCompletedCounterKeyForFleetTask(task.task_type);
  const restored = incrementCompletedCounter({
    ...baseStatus,
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
  }, counterKey, { now });
  if (task.task_type === TaskType.CLEANING) {
    return { ...restored, needs_cleaning: false, cleanliness_status: CleanlinessStatus.CLEAN };
  }
  if (task.task_type === TaskType.CHARGING) {
    const targetBatteryKwh = Number(task.robotaxi_battery_capacity_kwh || robotaxi.battery_capacity_kwh || robotaxi.current_battery_kwh || 0);
    const chargedRobotaxi = applyChargingDelta(restored, {
      chargedEnergyKwh: 0,
      targetBatteryKwh,
      targetBatteryPercent: 100,
      now,
    });
    return {
      ...chargedRobotaxi,
      needs_charging: false,
      battery_operation_status: BatteryOperationStatus.ENOUGH,
    };
  }
  if (task.task_type === TaskType.MAINTENANCE) {
    return { ...restored, needs_maintenance: false, maintenance_status: MaintenanceStatus.NORMAL };
  }
  return restored;
}

function createChargingEnergySnapshotFields(robotaxi, taskType, existingTask = {}) {
  if (taskType !== TaskType.CHARGING) return {};
  const currentBatteryKwh = Number(existingTask.robotaxi_current_battery_kwh ?? getCurrentBatteryKwh(robotaxi));
  const batteryCapacityKwh = Number(existingTask.robotaxi_battery_capacity_kwh ?? robotaxi?.battery_capacity_kwh ?? 0);
  return {
    robotaxi_current_battery_kwh: currentBatteryKwh,
    robotaxi_battery_capacity_kwh: batteryCapacityKwh,
    battery_percent_before: existingTask.battery_percent_before ?? robotaxi?.battery_percent ?? null,
    target_battery_percent: 100,
  };
}

function createChargingTargetFields(taskType) {
  return taskType === TaskType.CHARGING ? { target_battery_percent: 100 } : {};
}

function getDefaultFleetOperationWorkDurationSeconds(taskType) {
  if (taskType === TaskType.CHARGING) return 60;
  if (taskType === TaskType.MAINTENANCE) return 900;
  if (taskType === TaskType.FAILURE_HANDLING) return 900;
  if (taskType === TaskType.RETIREMENT) return 600;
  return 600;
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

function findMatchingOpsCenterForRobotaxiTask(robotaxi, taskType, opsCenters = []) {
  if (!robotaxi?.current_cell_id || !Array.isArray(opsCenters) || !opsCenters.length) return null;
  const capabilityMap = {
    [TaskType.CLEANING]: "can_clean_robotaxi",
    [TaskType.CHARGING]: "can_charge_robotaxi",
    [TaskType.MAINTENANCE]: "can_repair_robotaxi",
    [TaskType.FAILURE_HANDLING]: "can_repair_robotaxi",
    [TaskType.RETIREMENT]: "can_receive_robotaxi",
  };
  const capabilityKey = capabilityMap[taskType];
  if (!capabilityKey) return null;
  return opsCenters.find((oc) =>
    oc[capabilityKey] && isCellInOperationCapabilityZone(oc, taskType, robotaxi.current_cell_id)
  ) || null;
}

function isCellInOperationCapabilityZone(opsCenter, taskType, cellId) {
  if (!cellId) return false;
  if ((opsCenter.cell_ids || []).includes(cellId)) return true;
  const zone = (opsCenter.operation_capability_zones || []).find((item) =>
    item.task_type === taskType || item.capability_type === taskType
  );
  if (!zone) return opsCenter.cell_ids?.includes(cellId);
  return [
    ...(zone.work_cell_ids || []),
    ...(zone.parking_cell_ids || []),
    ...(zone.dispatch_target_cell_ids || []),
  ].includes(cellId);
}
