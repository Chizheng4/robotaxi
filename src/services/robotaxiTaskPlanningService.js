import {
  RobotaxiAssignmentState,
  RobotaxiLifecycleStage,
  RobotaxiOperationPhase,
  TaskPlanningAssignmentType,
  TaskPlanningDecision,
  TaskPlanningResultStatus,
  TaskPlanningRunStatus,
  createRobotaxiTaskPlanningResult,
  createRobotaxiTaskPlanningRun,
  createRobotaxiTaskPlanningStrategy,
} from "../domain/robotaxiTaskPlanningTypes.js";
import { TaskType } from "../domain/taskTypes.js";

const TERMINAL_STATUSES = new Set(["COMPLETED", "CANCELLED", "FAILED"]);

export function initializeDefaultRobotaxiTaskPlanningStrategies(now = defaultNow()) {
  return [
    createRobotaxiTaskPlanningStrategy({
      robotaxi_task_planning_strategy_id: "RTPS-STANDARD-001",
      strategy_name: "Robotaxi 标准任务规划",
      created_at: now,
      updated_at: now,
    }),
  ];
}

export function getActiveRobotaxiTaskPlanningStrategy(strategies = []) {
  return (strategies || []).find((item) => item.strategy_status === "ACTIVE")
    || (strategies || [])[0]
    || initializeDefaultRobotaxiTaskPlanningStrategies()[0];
}

export function resolveTaskPriorityConfig(strategy = null) {
  const activeStrategy = strategy || getActiveRobotaxiTaskPlanningStrategy();
  return {
    config_id: activeStrategy.robotaxi_task_planning_strategy_id || "RTPS-STANDARD-001",
    config_status: activeStrategy.strategy_status || "ACTIVE",
    priority_rank: { ...(activeStrategy.priority_rank || {}) },
    interrupt_policy: { FAILURE_HANDLING: true },
    allow_queuing: activeStrategy.queue_policy?.allow_queue_when_service_order_active !== false
      || activeStrategy.queue_policy?.allow_queue_when_deployment_active !== false
      || activeStrategy.queue_policy?.allow_queue_when_fleet_operation_active !== false,
    max_queue_size: Number(activeStrategy.queue_policy?.max_queue_size || 5),
    source_strategy_name: activeStrategy.strategy_name || null,
  };
}

export function resolveRobotaxiCompositeState({
  robotaxi,
  readinessTasks = [],
  deploymentTasks = [],
  serviceOrders = [],
  fleetOperationTasks = [],
} = {}) {
  const hasDeploymentHistory = (deploymentTasks || []).some((task) => task.robotaxi_id === robotaxi?.robotaxi_id);
  const hasServiceHistory = (serviceOrders || []).some((order) =>
    order.matched_robotaxi_id === robotaxi?.robotaxi_id || order.robotaxi_id === robotaxi?.robotaxi_id
  );
  const hasReadinessHistory = (readinessTasks || []).some((task) => task.robotaxi_id === robotaxi?.robotaxi_id);
  const hasOperationalHistory = hasDeploymentHistory || hasServiceHistory || Boolean(robotaxi?.current_order_id) || robotaxi?.current_task_type === TaskType.DEPLOYMENT;
  const currentAssignmentState = resolveCurrentAssignmentState(robotaxi);
  const lifecycleStage = robotaxi?.availability_status === "RETIRED" || robotaxi?.retirement_status === "RETIRED"
    ? RobotaxiLifecycleStage.RETIRED
    : hasOperationalHistory ? RobotaxiLifecycleStage.IN_OPERATION : RobotaxiLifecycleStage.PRE_OPERATION;
  const operationPhase = resolveOperationPhase({ robotaxi, lifecycleStage, hasReadinessHistory, hasOperationalHistory });
  const openFleetTaskCount = (fleetOperationTasks || []).filter((task) =>
    task.robotaxi_id === robotaxi?.robotaxi_id && !TERMINAL_STATUSES.has(task.task_status)
  ).length;

  return {
    lifecycle_stage: lifecycleStage,
    operation_phase: operationPhase,
    operation_status: robotaxi?.availability_status === "AVAILABLE" ? "AVAILABLE" : "UNAVAILABLE",
    vehicle_motion_state: robotaxi?.motion_status || "UNKNOWN",
    current_assignment_state: currentAssignmentState,
    has_operational_history: hasOperationalHistory,
    has_readiness_history: hasReadinessHistory,
    open_fleet_task_count: openFleetTaskCount,
    pending_queue_size: Array.isArray(robotaxi?.pending_task_queue) ? robotaxi.pending_task_queue.length : 0,
  };
}

export function planRobotaxiTask({
  robotaxi,
  requestedAssignmentType,
  requestedTaskType = null,
  triggerSource = null,
  readinessTasks = [],
  deploymentTasks = [],
  serviceOrders = [],
  fleetOperationTasks = [],
  strategy = null,
} = {}) {
  if (!robotaxi?.robotaxi_id) return reject("INVALID_ROBOTAXI", "Robotaxi 不存在");
  const activeStrategy = strategy || getActiveRobotaxiTaskPlanningStrategy();
  const compositeState = resolveRobotaxiCompositeState({
    robotaxi,
    readinessTasks,
    deploymentTasks,
    serviceOrders,
    fleetOperationTasks,
  });
  const taskType = requestedTaskType || requestedAssignmentType;
  const openFleetTasks = (fleetOperationTasks || []).filter((task) =>
    task.robotaxi_id === robotaxi.robotaxi_id && !TERMINAL_STATUSES.has(task.task_status)
  );

  if (compositeState.lifecycle_stage === RobotaxiLifecycleStage.RETIRED) {
    return reject("ROBOTAXI_RETIRED", "Robotaxi 已退役，不能再分配任务", compositeState, activeStrategy);
  }

  if (requestedAssignmentType === TaskPlanningAssignmentType.READINESS_TASK) {
    return planReadinessTask({ robotaxi, readinessTasks, compositeState, strategy: activeStrategy });
  }

  if ([TaskPlanningAssignmentType.SERVICE_ORDER, TaskPlanningAssignmentType.DEPLOYMENT_TASK].includes(requestedAssignmentType)) {
    return planExternalAssignment({ robotaxi, requestedAssignmentType, compositeState, openFleetTasks, strategy: activeStrategy });
  }

  if (requestedAssignmentType === TaskPlanningAssignmentType.RETIREMENT_ACTION || taskType === TaskType.RETIREMENT) {
    return reject("RETIREMENT_IS_LIFECYCLE_ACTION", "退役是生命周期动作，不进入普通任务规划队列", compositeState, activeStrategy);
  }

  if (requestedAssignmentType === TaskPlanningAssignmentType.FLEET_OPERATION_TASK) {
    return planFleetOperationTask({ robotaxi, requestedTaskType: taskType, triggerSource, compositeState, openFleetTasks, strategy: activeStrategy });
  }

  return reject("UNKNOWN_ASSIGNMENT_TYPE", "未知任务分配类型", compositeState, activeStrategy);
}

export function executeRobotaxiTaskPlanning({
  context = {},
  ...planningInput
} = {}) {
  const decision = planRobotaxiTask(planningInput);
  const now = resolveNow(context);
  const runId = resolveRunId(context);
  const resultId = resolveResultId(context);
  const strategySnapshot = decision.strategy_snapshot || createStrategySnapshot(planningInput.strategy || getActiveRobotaxiTaskPlanningStrategy());
  const requestedAssignmentType = planningInput.requestedAssignmentType || null;
  const requestedTaskType = planningInput.requestedTaskType || requestedAssignmentType;
  const runStatus = decision.allowed ? TaskPlanningRunStatus.SUCCEEDED : TaskPlanningRunStatus.REJECTED;
  const resultStatus = decision.allowed
    ? decision.decision === TaskPlanningDecision.QUEUE ? TaskPlanningResultStatus.PLANNING_QUEUED : TaskPlanningResultStatus.PLANNING_ALLOWED
    : TaskPlanningResultStatus.PLANNING_REJECTED;
  const run = createRobotaxiTaskPlanningRun({
    robotaxi_task_planning_run_id: runId,
    robotaxi_task_planning_strategy_id: strategySnapshot?.robotaxi_task_planning_strategy_id || null,
    strategy_name: strategySnapshot?.strategy_name || null,
    robotaxi_id: planningInput.robotaxi?.robotaxi_id || null,
    requested_assignment_type: requestedAssignmentType,
    requested_task_type: requestedTaskType,
    trigger_source: planningInput.triggerSource || null,
    trigger_object_type: context.trigger_object_type || null,
    trigger_object_id: context.trigger_object_id || null,
    run_status: runStatus,
    planning_decision: decision.decision,
    decision_reason: decision.reason,
    composite_state: decision.composite_state,
    strategy_snapshot: strategySnapshot,
    input_snapshot: {
      robotaxi_id: planningInput.robotaxi?.robotaxi_id || null,
      requested_assignment_type: requestedAssignmentType,
      requested_task_type: requestedTaskType,
      trigger_source: planningInput.triggerSource || null,
    },
    output_snapshot: {
      allowed: decision.allowed,
      decision: decision.decision,
      reason: decision.reason,
      message: decision.message,
      queue_entry: decision.queue_entry || null,
    },
    created_at: now,
  });
  const result = createRobotaxiTaskPlanningResult({
    robotaxi_task_planning_result_id: resultId,
    robotaxi_task_planning_run_id: runId,
    robotaxi_task_planning_strategy_id: strategySnapshot?.robotaxi_task_planning_strategy_id || null,
    robotaxi_id: planningInput.robotaxi?.robotaxi_id || null,
    requested_assignment_type: requestedAssignmentType,
    requested_task_type: requestedTaskType,
    decision_result: resultStatus,
    planning_decision: decision.decision,
    decision_reason: decision.reason,
    message: decision.message,
    queue_entry: decision.queue_entry || null,
    composite_state: decision.composite_state,
    created_at: now,
  });
  return { ...decision, planningRun: run, planningResult: result };
}

export function getAvailableRobotaxiActions(params = {}) {
  const taskTypes = [TaskType.CLEANING, TaskType.CHARGING, TaskType.MAINTENANCE, TaskType.FAILURE_HANDLING];
  return taskTypes.map((taskType) => ({
    task_type: taskType,
    ...planRobotaxiTask({
      ...params,
      requestedAssignmentType: TaskPlanningAssignmentType.FLEET_OPERATION_TASK,
      requestedTaskType: taskType,
      triggerSource: "ROBOTAXI_MANAGEMENT",
    }),
  })).filter((item) => item.allowed);
}

function planReadinessTask({ robotaxi, readinessTasks, compositeState, strategy }) {
  const hasOpenReadiness = (readinessTasks || []).some((task) =>
    task.robotaxi_id === robotaxi.robotaxi_id && !TERMINAL_STATUSES.has(task.task_status)
  );
  if (hasOpenReadiness || robotaxi.current_task_id) {
    return reject("ROBOTAXI_ALREADY_HAS_READINESS_TASK", "Robotaxi 已有准入任务", compositeState, strategy);
  }
  if (!["PENDING_INSPECTION", "IN_INSPECTION"].includes(robotaxi.availability_status)) {
    return reject("ROBOTAXI_NOT_IN_ADMISSION_PHASE", "Robotaxi 不在准入阶段", compositeState, strategy);
  }
  return allow(TaskPlanningDecision.CREATE_NOW, "FIRST_ADMISSION_ALLOWED", "允许创建运营准入任务", compositeState, strategy);
}

function planExternalAssignment({ robotaxi, requestedAssignmentType, compositeState, openFleetTasks, strategy }) {
  if (robotaxi.availability_status !== "AVAILABLE" || robotaxi.available_for_dispatch === false) {
    return reject("ROBOTAXI_NOT_OPERATIONALLY_AVAILABLE", "Robotaxi 当前不可运营", compositeState, strategy);
  }
  if (robotaxi.current_order_id || robotaxi.current_task_id) {
    return reject("ROBOTAXI_ALREADY_ASSIGNED", "Robotaxi 当前已有执行中的业务对象", compositeState, strategy);
  }
  if ((robotaxi.pending_task_queue || []).length > 0 || openFleetTasks.length > 0) {
    return reject("ROBOTAXI_INTERNAL_TASK_QUEUE_FIRST", "Robotaxi 已有内部任务队列，不能分配外部运营任务", compositeState, strategy);
  }
  const blockingNeed = resolveExternalAssignmentBlockingNeed(robotaxi);
  if (blockingNeed) {
    return reject(blockingNeed, "Robotaxi 存在待处理运维状态，不能分配外部运营任务", compositeState, strategy);
  }
  if (requestedAssignmentType === TaskPlanningAssignmentType.SERVICE_ORDER && compositeState.operation_phase === RobotaxiOperationPhase.FIRST_ADMISSION) {
    return reject("ROBOTAXI_NOT_ADMITTED_FOR_SERVICE_ORDER", "Robotaxi 尚未完成运营准入", compositeState, strategy);
  }
  return allow(TaskPlanningDecision.CREATE_NOW, "ROBOTAXI_READY_FOR_EXTERNAL_ASSIGNMENT", "允许分配外部运营任务", compositeState, strategy);
}

function resolveExternalAssignmentBlockingNeed(robotaxi) {
  if (robotaxi?.needs_cleaning === true || robotaxi?.cleanliness_status === "NEEDS_CLEANING") return "ROBOTAXI_NEEDS_CLEANING";
  if (robotaxi?.needs_charging === true || ["LOW", "CRITICAL"].includes(robotaxi?.battery_operation_status)) return "ROBOTAXI_NEEDS_CHARGING";
  if (robotaxi?.needs_maintenance === true || ["DUE", "IN_MAINTENANCE"].includes(robotaxi?.maintenance_status)) return "ROBOTAXI_NEEDS_MAINTENANCE";
  if (["ALERTED", "REMOTE_HANDLING", "BROKEN"].includes(robotaxi?.failure_status)) return "ROBOTAXI_HAS_FAILURE";
  return null;
}

function planFleetOperationTask({ robotaxi, requestedTaskType, triggerSource, compositeState, openFleetTasks, strategy }) {
  if (!requestedTaskType) return reject("MISSING_FLEET_OPERATION_TASK_TYPE", "缺少运维任务类型", compositeState, strategy);
  if (compositeState.operation_phase === RobotaxiOperationPhase.FIRST_ADMISSION) {
    return reject("FIRST_ADMISSION_ONLY_ALLOWS_READINESS", "首次不可运营阶段只能创建运营准入任务", compositeState, strategy);
  }
  if (compositeState.operation_phase === RobotaxiOperationPhase.READY_NOT_DEPLOYED) {
    return reject("READY_NOT_DEPLOYED_HAS_NO_FLEET_OPERATION_NEED", "准入后未运营车辆不应创建清洁、充电或维修任务", compositeState, strategy);
  }
  if (!isTaskAllowedInPhase(strategy, compositeState.operation_phase, requestedTaskType)) {
    return reject("TASK_TYPE_NOT_ALLOWED_IN_PHASE", "当前运营阶段不允许该任务类型", compositeState, strategy);
  }
  const sameOpenTask = openFleetTasks.find((task) => task.task_type === requestedTaskType);
  if (sameOpenTask) {
    return reject("ROBOTAXI_ALREADY_HAS_OPEN_FLEET_OPERATION_TASK", "Robotaxi 已有同类型未完成运维任务", compositeState, strategy);
  }
  if (requestedTaskType === TaskType.FAILURE_HANDLING && !isFailureTriggerAllowed(robotaxi, triggerSource, strategy)) {
    return reject("FAILURE_HANDLING_REQUIRES_ACTIVE_OPERATION_EXCEPTION", "故障处理任务只能由行驶或运营异常触发", compositeState, strategy);
  }
  const incompatible = openFleetTasks.find((task) => !isTaskCompatible(strategy, requestedTaskType, task.task_type));
  if (incompatible) {
    return reject("INCOMPATIBLE_FLEET_OPERATION_TASK_EXISTS", `Robotaxi 已有不兼容任务 ${incompatible.task_id}`, compositeState, strategy);
  }
  if (robotaxi.current_order_id || robotaxi.current_task_id) {
    const queue = Array.isArray(robotaxi.pending_task_queue) ? robotaxi.pending_task_queue : [];
    const maxQueueSize = Number(strategy.queue_policy?.max_queue_size || 5);
    if (queue.length >= maxQueueSize) return reject("QUEUE_FULL", "Robotaxi 待执行任务队列已满", compositeState, strategy);
    return allow(TaskPlanningDecision.QUEUE, "WAIT_CURRENT_ASSIGNMENT_COMPLETION", "允许进入 Robotaxi 待执行任务队列", compositeState, strategy, {
      queue_entry: {
        task_type: requestedTaskType,
        priority: Number(strategy.priority_rank?.[requestedTaskType] || 0),
      },
    });
  }
  return allow(TaskPlanningDecision.CREATE_NOW, "ROBOTAXI_READY_FOR_FLEET_OPERATION_TASK", "允许创建并执行运维任务", compositeState, strategy);
}

function resolveCurrentAssignmentState(robotaxi) {
  if (robotaxi?.current_order_id) return RobotaxiAssignmentState.SERVICE_ORDER;
  if (robotaxi?.current_task_type === TaskType.READINESS_CHECK) return RobotaxiAssignmentState.READINESS_TASK;
  if (robotaxi?.current_task_type === TaskType.DEPLOYMENT) return RobotaxiAssignmentState.DEPLOYMENT_TASK;
  if (robotaxi?.current_task_id) return RobotaxiAssignmentState.FLEET_OPERATION_TASK;
  return RobotaxiAssignmentState.NONE;
}

function resolveOperationPhase({ robotaxi, lifecycleStage, hasReadinessHistory, hasOperationalHistory }) {
  if (lifecycleStage === RobotaxiLifecycleStage.RETIRED) return RobotaxiOperationPhase.RETIRED;
  if (["PENDING_INSPECTION", "IN_INSPECTION"].includes(robotaxi?.availability_status) && !hasReadinessHistory) return RobotaxiOperationPhase.FIRST_ADMISSION;
  if (robotaxi?.availability_status === "UNAVAILABLE" && !hasOperationalHistory) return RobotaxiOperationPhase.ADMISSION_REMEDIATION;
  if (robotaxi?.availability_status === "AVAILABLE" && !hasOperationalHistory) return RobotaxiOperationPhase.READY_NOT_DEPLOYED;
  return RobotaxiOperationPhase.ACTIVE_OPERATION;
}

function isTaskAllowedInPhase(strategy, phase, taskType) {
  return (strategy.phase_rules?.[phase] || []).includes(taskType);
}

function isTaskCompatible(strategy, requestedTaskType, existingTaskType) {
  return (strategy.compatibility_rules?.[requestedTaskType] || []).includes(existingTaskType);
}

function isFailureTriggerAllowed(robotaxi, triggerSource, strategy) {
  if (strategy.failure_trigger_policy !== "MOVING_ONLY") return true;
  return robotaxi?.motion_status === "MOVING"
    || Boolean(robotaxi?.current_route_id || robotaxi?.current_route_execution_id)
    || ["ROUTE_EXCEPTION", "TRIP_EXCEPTION", "DEPLOYMENT_EXCEPTION", "SERVICE_ORDER_EXCEPTION"].includes(triggerSource);
}

function allow(decision, reason, message, compositeState, strategy, extra = {}) {
  return {
    allowed: true,
    decision,
    reason,
    message,
    composite_state: compositeState,
    strategy_snapshot: createStrategySnapshot(strategy),
    ...extra,
  };
}

function reject(reason, message, compositeState = null, strategy = null) {
  return {
    allowed: false,
    decision: TaskPlanningDecision.REJECT,
    reason,
    message,
    composite_state: compositeState,
    strategy_snapshot: strategy ? createStrategySnapshot(strategy) : null,
  };
}

function createStrategySnapshot(strategy) {
  return {
    robotaxi_task_planning_strategy_id: strategy.robotaxi_task_planning_strategy_id,
    strategy_name: strategy.strategy_name,
    planning_algorithm: strategy.planning_algorithm,
    priority_rank: strategy.priority_rank,
    queue_policy: strategy.queue_policy,
    phase_rules: strategy.phase_rules,
    compatibility_rules: strategy.compatibility_rules,
    failure_trigger_policy: strategy.failure_trigger_policy,
    external_assignment_queue_policy: strategy.external_assignment_queue_policy,
  };
}

function defaultNow() {
  return new Date().toISOString();
}

function resolveNow(context = {}) {
  if (typeof context.now === "function") return context.now();
  return context.now || defaultNow();
}

function resolveRunId(context = {}) {
  if (typeof context.nextTaskPlanningRunId === "function") return context.nextTaskPlanningRunId();
  return `TPR-${String(Date.now()).slice(-6)}`;
}

function resolveResultId(context = {}) {
  if (typeof context.nextTaskPlanningResultId === "function") return context.nextTaskPlanningResultId();
  return `TPRS-${String(Date.now()).slice(-6)}`;
}

export {
  RobotaxiAssignmentState,
  RobotaxiLifecycleStage,
  RobotaxiOperationPhase,
  TaskPlanningAssignmentType,
  TaskPlanningDecision,
  TaskPlanningResultStatus,
  TaskPlanningRunStatus,
};
