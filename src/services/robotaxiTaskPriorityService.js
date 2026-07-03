import { TaskType } from "../domain/taskTypes.js";

// 优先级数值越高越优先
const DEFAULT_PRIORITY_RANK = {
  [TaskType.FAILURE_HANDLING]: 100,
  [TaskType.RETIREMENT]: 90,
  [TaskType.MAINTENANCE]: 80,
  [TaskType.CHARGING]: 70,
  [TaskType.CLEANING]: 60,
};

const DECISION = {
  EXECUTE_NOW: "EXECUTE_NOW",
  QUEUE_AFTER_CURRENT: "QUEUE_AFTER_CURRENT",
  REJECTED: "REJECTED",
};

// 默认中断策略：高优先级任务是否可中断低优先级
const DEFAULT_INTERRUPT_POLICY = {
  [TaskType.FAILURE_HANDLING]: true,
  [TaskType.RETIREMENT]: true,
};

export function initializeDefaultPriorityConfig() {
  return {
    config_id: "ROBOTAXI_TASK_PRIORITY_DEFAULT",
    config_status: "ACTIVE",
    priority_rank: { ...DEFAULT_PRIORITY_RANK },
    interrupt_policy: { ...DEFAULT_INTERRUPT_POLICY },
    allow_queuing: true,
    max_queue_size: 5,
  };
}

export function resolveTaskDecision({ robotaxi, newTaskType, config, context = {} } = {}) {
  const priorityConfig = config || initializeDefaultPriorityConfig();
  const newPriority = priorityConfig.priority_rank[newTaskType] || 0;
  const canInterrupt = priorityConfig.interrupt_policy[newTaskType] || false;
  const isInService = Boolean(robotaxi?.current_order_id);
  const currentTaskType = robotaxi?.current_task_type || null;
  const queue = Array.isArray(robotaxi?.pending_task_queue) ? robotaxi.pending_task_queue : [];
  const isOccupied = Boolean(robotaxi?.current_task_id) && currentTaskType;
  const isRetired = robotaxi?.availability_status === "RETIRED";

  // 退役的特殊处理：不受任何约束
  if (newTaskType === TaskType.RETIREMENT) {
    return {
      decision: DECISION.EXECUTE_NOW,
      requires_confirmation: true,
      cancel_existing_tasks: true,
      reason: "RETIREMENT_IS_TERMINAL",
    };
  }

  if (isRetired) {
    return { decision: DECISION.REJECTED, reason: "ROBOTAXI_ALREADY_RETIRED" };
  }

  // 高优先级故障处理可以在服务中中断
  if (newTaskType === TaskType.FAILURE_HANDLING && canInterrupt) {
    return { decision: DECISION.EXECUTE_NOW, reason: "CRITICAL_FAILURE_INTERRUPTS" };
  }

  // 在服务中且不能中断：排队
  if (isInService) {
    if (!priorityConfig.allow_queuing) {
      return { decision: DECISION.REJECTED, reason: "ROBOTAXI_IN_SERVICE_QUEUING_DISABLED" };
    }
    if (queue.length >= (priorityConfig.max_queue_size || 5)) {
      return { decision: DECISION.REJECTED, reason: "QUEUE_FULL" };
    }
    return { decision: DECISION.QUEUE_AFTER_CURRENT, reason: "WAIT_CURRENT_SERVICE_COMPLETION", queue_entry: { task_type: newTaskType, priority: newPriority } };
  }

  // 已被占用：排队（除非新任务优先级更高且可中断）
  if (isOccupied) {
    const currentPriority = priorityConfig.priority_rank[currentTaskType] || 0;
    if (newPriority > currentPriority && canInterrupt) {
      return { decision: DECISION.EXECUTE_NOW, reason: "HIGHER_PRIORITY_INTERRUPTS" };
    }
    if (!priorityConfig.allow_queuing) {
      return { decision: DECISION.REJECTED, reason: "ROBOTAXI_OCCUPIED_QUEUING_DISABLED" };
    }
    if (queue.length >= (priorityConfig.max_queue_size || 5)) {
      return { decision: DECISION.REJECTED, reason: "QUEUE_FULL" };
    }
    return { decision: DECISION.QUEUE_AFTER_CURRENT, reason: "WAIT_CURRENT_TASK_COMPLETION", queue_entry: { task_type: newTaskType, priority: newPriority } };
  }

  // 空闲：立即执行
  return { decision: DECISION.EXECUTE_NOW, reason: "ROBOTAXI_AVAILABLE" };
}

export function getQueuedTasksSorted(queue = []) {
  return [...queue].sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

export function enqueueTask(robotaxi, taskEntry) {
  const queue = Array.isArray(robotaxi?.pending_task_queue) ? [...robotaxi.pending_task_queue] : [];
  queue.push(taskEntry);
  return { ...robotaxi, pending_task_queue: getQueuedTasksSorted(queue) };
}

export function dequeueNextTask(robotaxi) {
  const queue = Array.isArray(robotaxi?.pending_task_queue) ? [...robotaxi.pending_task_queue] : [];
  if (queue.length === 0) return { robotaxi, nextTask: null };
  const sorted = getQueuedTasksSorted(queue);
  const nextTask = sorted[0];
  const remaining = sorted.slice(1);
  return {
    robotaxi: { ...robotaxi, pending_task_queue: remaining },
    nextTask,
  };
}

export { DECISION };
