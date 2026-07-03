import {
  TaskDispatchCandidateType,
  TaskDispatchDecisionResult,
  TaskDispatchRunStatus,
  createTaskDispatchResult,
  createTaskDispatchRun,
  createTaskDispatchStrategy,
} from "../domain/taskDispatchTypes.js";

export function initializeDefaultTaskDispatchStrategies() {
  return [
    createTaskDispatchStrategy({
      task_dispatch_strategy_id: "TDS-STANDARD-001",
      strategy_name: "释放后任务调度",
      dispatch_algorithm: "RELEASED_ROBOTAXI_PRIORITY",
      strategy_status: "ACTIVE",
      created_at: "2026-07-03T00:00:00.000Z",
    }),
  ];
}

export function resolveTaskPriorityConfig(strategy = null) {
  const activeStrategy = strategy || initializeDefaultTaskDispatchStrategies()[0];
  return {
    config_id: activeStrategy.task_dispatch_strategy_id || "TDS-STANDARD-001",
    config_status: activeStrategy.strategy_status || "ACTIVE",
    priority_rank: { ...(activeStrategy.priority_rank || {}) },
    interrupt_policy: { ...(activeStrategy.interrupt_policy || {}) },
    allow_queuing: activeStrategy.allow_queuing !== false,
    max_queue_size: Number(activeStrategy.max_queue_size || 5),
    source_strategy_name: activeStrategy.strategy_name || null,
  };
}

export function executeTaskDispatchStrategy({
  strategy = null,
  robotaxi = null,
  pendingFleetTasks = [],
  serviceOrders = [],
  deploymentTasks = [],
  context = {},
} = {}) {
  const activeStrategy = strategy || initializeDefaultTaskDispatchStrategies()[0];
  const now = resolveNow(context);
  const runId = resolveRunId(context);
  const isReady = isReleasedRobotaxiReady(robotaxi);

  if (!activeStrategy || activeStrategy.strategy_status !== "ACTIVE") {
    return createNoActionResult({ strategy: activeStrategy, robotaxi, context, runId, now, reason: "TASK_DISPATCH_STRATEGY_INACTIVE" });
  }
  if (!isReady) {
    return createNoActionResult({ strategy: activeStrategy, robotaxi, context, runId, now, reason: "ROBOTAXI_NOT_RELEASED_FOR_DISPATCH" });
  }

  const candidates = [
    ...buildFleetOperationCandidates({ robotaxi, tasks: pendingFleetTasks, strategy: activeStrategy }),
    ...buildServiceOrderCandidates({ robotaxi, serviceOrders, strategy: activeStrategy }),
    ...buildDeploymentTaskCandidates({ robotaxi, deploymentTasks, strategy: activeStrategy }),
  ].sort(compareCandidates);

  if (!candidates.length) {
    return createNoActionResult({ strategy: activeStrategy, robotaxi, context, runId, now, reason: "NO_DISPATCH_CANDIDATE" });
  }

  const selected = candidates[0];
  const run = createTaskDispatchRun({
    task_dispatch_run_id: runId,
    task_dispatch_strategy_id: activeStrategy.task_dispatch_strategy_id,
    strategy_name: activeStrategy.strategy_name,
    robotaxi_id: robotaxi.robotaxi_id,
    trigger_object_type: context.trigger_object_type || null,
    trigger_object_id: context.trigger_object_id || null,
    run_status: TaskDispatchRunStatus.SUCCEEDED,
    candidate_count: candidates.length,
    selected_candidate_type: selected.candidate_type,
    selected_object_id: selected.candidate_object_id,
    no_action_reason: null,
    strategy_snapshot: createStrategySnapshot(activeStrategy),
    created_at: now,
  });
  const results = candidates.map((candidate) => createTaskDispatchResult({
    task_dispatch_result_id: resolveResultId(context),
    task_dispatch_run_id: runId,
    task_dispatch_strategy_id: activeStrategy.task_dispatch_strategy_id,
    robotaxi_id: robotaxi.robotaxi_id,
    candidate_type: candidate.candidate_type,
    candidate_object_id: candidate.candidate_object_id,
    candidate_status: candidate.candidate_status,
    candidate_priority: candidate.candidate_priority,
    decision_result: candidate === selected ? TaskDispatchDecisionResult.SELECTED : TaskDispatchDecisionResult.SKIPPED,
    decision_reason: candidate === selected ? selected.decision_reason : "优先级低于已选候选",
    created_at: now,
  }));

  return {
    succeeded: true,
    run,
    results,
    selected,
  };
}

function createNoActionResult({ strategy, robotaxi, context, runId, now, reason }) {
  const resultId = resolveResultId(context);
  const run = createTaskDispatchRun({
    task_dispatch_run_id: runId,
    task_dispatch_strategy_id: strategy?.task_dispatch_strategy_id || null,
    strategy_name: strategy?.strategy_name || null,
    robotaxi_id: robotaxi?.robotaxi_id || null,
    trigger_object_type: context.trigger_object_type || null,
    trigger_object_id: context.trigger_object_id || null,
    run_status: TaskDispatchRunStatus.NO_ACTION,
    candidate_count: 0,
    no_action_reason: reason,
    strategy_snapshot: strategy ? createStrategySnapshot(strategy) : null,
    created_at: now,
  });
  return {
    succeeded: false,
    reason,
    run,
    results: [createTaskDispatchResult({
      task_dispatch_result_id: resultId,
      task_dispatch_run_id: runId,
      task_dispatch_strategy_id: strategy?.task_dispatch_strategy_id || null,
      robotaxi_id: robotaxi?.robotaxi_id || null,
      decision_result: TaskDispatchDecisionResult.NO_CANDIDATE,
      decision_reason: reason,
      created_at: now,
    })],
    selected: null,
  };
}

function buildFleetOperationCandidates({ robotaxi, tasks, strategy }) {
  const pendingTaskIds = new Set((robotaxi?.pending_task_queue || []).map((item) => item.task_id).filter(Boolean));
  if (robotaxi?.pending_fleet_task_id) pendingTaskIds.add(robotaxi.pending_fleet_task_id);
  return (tasks || [])
    .filter((task) => task.robotaxi_id === robotaxi.robotaxi_id)
    .filter((task) => task.task_status === "WAITING_ROBOTAXI_AVAILABLE" || pendingTaskIds.has(task.task_id))
    .map((task) => ({
      candidate_type: TaskDispatchCandidateType.FLEET_OPERATION_TASK,
      candidate_object_id: task.task_id,
      candidate_status: task.task_status,
      candidate_priority: Number(strategy.fleet_operation_priority || 80) + resolvePriorityBoost(task.task_priority),
      created_at: task.created_at || task.operation_created_at || null,
      decision_reason: `选择排队运维任务 ${task.task_id}`,
      payload: task,
    }));
}

function buildServiceOrderCandidates({ serviceOrders, strategy }) {
  return (serviceOrders || [])
    .filter((order) => order.order_status === "WAITING_ROBOTAXI_ASSIGNMENT")
    .map((order) => ({
      candidate_type: TaskDispatchCandidateType.SERVICE_ORDER,
      candidate_object_id: order.service_order_id,
      candidate_status: order.order_status,
      candidate_priority: Number(strategy.service_order_priority || 60),
      created_at: order.created_at || null,
      decision_reason: `选择待分配服务订单 ${order.service_order_id}`,
      payload: order,
    }));
}

function buildDeploymentTaskCandidates({ deploymentTasks, strategy }) {
  return (deploymentTasks || [])
    .filter((task) => task.task_status === "WAITING_START" || task.task_status === "WAITING_ROUTE")
    .map((task) => ({
      candidate_type: TaskDispatchCandidateType.DEPLOYMENT_TASK,
      candidate_object_id: task.task_id,
      candidate_status: task.task_status,
      candidate_priority: Number(strategy.deployment_task_priority || 40) + resolvePriorityBoost(task.task_priority),
      created_at: task.created_at || null,
      decision_reason: `选择运营投放任务 ${task.task_id}`,
      payload: task,
    }));
}

function isReleasedRobotaxiReady(robotaxi) {
  return Boolean(robotaxi?.robotaxi_id)
    && robotaxi.availability_status === "AVAILABLE"
    && !robotaxi.current_order_id
    && !robotaxi.current_task_id;
}

function compareCandidates(left, right) {
  return right.candidate_priority - left.candidate_priority
    || String(left.created_at || "").localeCompare(String(right.created_at || ""))
    || String(left.candidate_object_id || "").localeCompare(String(right.candidate_object_id || ""));
}

function resolvePriorityBoost(priority) {
  if (priority === "URGENT") return 20;
  if (priority === "HIGH") return 10;
  if (priority === "LOW") return -10;
  return 0;
}

function createStrategySnapshot(strategy) {
  return {
    task_dispatch_strategy_id: strategy.task_dispatch_strategy_id,
    strategy_name: strategy.strategy_name,
    dispatch_algorithm: strategy.dispatch_algorithm,
    fleet_operation_priority: strategy.fleet_operation_priority,
    service_order_priority: strategy.service_order_priority,
    deployment_task_priority: strategy.deployment_task_priority,
    priority_rank: strategy.priority_rank,
    interrupt_policy: strategy.interrupt_policy,
    allow_queuing: strategy.allow_queuing,
    max_queue_size: strategy.max_queue_size,
    invocation_rules: strategy.invocation_rules,
  };
}

function resolveNow(context) {
  if (typeof context.now === "function") return context.now();
  return context.now || new Date().toISOString();
}

function resolveRunId(context) {
  if (typeof context.nextTaskDispatchRunId === "function") return context.nextTaskDispatchRunId();
  return `TDR-${String(Date.now()).slice(-6)}`;
}

function resolveResultId(context) {
  if (typeof context.nextTaskDispatchResultId === "function") return context.nextTaskDispatchResultId();
  return `TDRS-${String(Date.now()).slice(-6)}`;
}
