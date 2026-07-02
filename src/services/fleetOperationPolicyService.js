import {
  BatteryOperationStatus,
  CleanlinessStatus,
  FailureStatus,
  MaintenanceStatus,
  RetirementStatus,
  TaskPriority,
  TaskType,
  TriggerType,
} from "../domain/taskTypes.js";
import { createFleetOperationTask, getFleetOperationCollectionKey } from "./fleetOperationTaskService.js";

export const FleetOperationPolicyStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  DISABLED: "DISABLED",
  ARCHIVED: "ARCHIVED",
};

export const FleetOperationPolicyRunStatus = {
  SUCCEEDED: "SUCCEEDED",
  PARTIALLY_SUCCEEDED: "PARTIALLY_SUCCEEDED",
  NO_ACTION: "NO_ACTION",
  FAILED: "FAILED",
};

export const FleetOperationPolicyResultStatus = {
  TASK_CREATED: "TASK_CREATED",
  SKIPPED: "SKIPPED",
  FAILED: "FAILED",
};

const DEFAULT_POLICY_CONFIGS = [
  {
    id: "FOP-CLEANING-001",
    name: "低峰清洁策略",
    taskType: TaskType.CLEANING,
    parameters: {
      low_peak_start_time: "10:00",
      low_peak_end_time: "16:00",
      service_order_count_threshold: 8,
      service_duration_minutes_threshold: 360,
    },
  },
  {
    id: "FOP-CHARGING-001",
    name: "低电补能策略",
    taskType: TaskType.CHARGING,
    parameters: {
      battery_percent_threshold: 25,
      target_battery_percent: 90,
    },
  },
  {
    id: "FOP-MAINTENANCE-001",
    name: "周期维修策略",
    taskType: TaskType.MAINTENANCE,
    parameters: {
      maintenance_due_days_threshold: 7,
      maintenance_type: "SCHEDULED_SERVICE",
    },
  },
  {
    id: "FOP-FAILURE-001",
    name: "故障处置策略",
    taskType: TaskType.FAILURE_HANDLING,
    parameters: {
      failure_severity_threshold: "MEDIUM",
      allow_current_service_completion: true,
    },
  },
  {
    id: "FOP-RETIREMENT-001",
    name: "退役评估策略",
    taskType: TaskType.RETIREMENT,
    parameters: {
      retirement_score_threshold: 80,
    },
  },
];

export function initializeDefaultFleetOperationPolicies(now = defaultNow()) {
  return DEFAULT_POLICY_CONFIGS.map((config) => createFleetOperationPolicy({
    fleet_operation_policy_id: config.id,
    policy_name: config.name,
    policy_type: config.taskType,
    target_task_type: config.taskType,
    policy_parameters: config.parameters,
    created_at: now,
    updated_at: now,
  }));
}

export function createFleetOperationPolicy(policy = {}) {
  const parameters = { ...(policy.policy_parameters || {}) };
  return {
    fleet_operation_policy_id: policy.fleet_operation_policy_id,
    policy_name: policy.policy_name,
    policy_type: policy.policy_type,
    target_task_type: policy.target_task_type,
    policy_status: policy.policy_status || FleetOperationPolicyStatus.ACTIVE,
    policy_version: policy.policy_version || "1.0.0",
    policy_parameters: parameters,
    execution_scope: policy.execution_scope || "ALL_ROBOTAXI",
    low_peak_start_time: parameters.low_peak_start_time || null,
    low_peak_end_time: parameters.low_peak_end_time || null,
    service_order_count_threshold: parameters.service_order_count_threshold || null,
    service_duration_minutes_threshold: parameters.service_duration_minutes_threshold || null,
    battery_percent_threshold: parameters.battery_percent_threshold || null,
    maintenance_due_days_threshold: parameters.maintenance_due_days_threshold || null,
    failure_severity_threshold: parameters.failure_severity_threshold || null,
    retirement_score_threshold: parameters.retirement_score_threshold || null,
    created_at: policy.created_at || defaultNow(),
    updated_at: policy.updated_at || policy.created_at || defaultNow(),
  };
}

export function executeFleetOperationPolicy({
  policy,
  robotaxis = [],
  existingTasks = [],
  triggerType = TriggerType.MANUAL,
  context = {},
} = {}) {
  if (!policy?.fleet_operation_policy_id || !policy?.target_task_type) {
    return createFailedRun({ policy, triggerType, context, reason: "INVALID_FLEET_OPERATION_POLICY" });
  }

  const startedAt = resolveNow(context);
  const policySnapshot = createPolicySnapshot(policy);
  const candidates = findFleetOperationPolicyCandidates(policy, robotaxis);
  const taskResults = [];
  const policyResults = [];
  let updatedRobotaxis = robotaxis;
  const runId = resolveRunId(context);

  for (const robotaxi of candidates) {
    const currentExistingTasks = [
      ...existingTasks,
      ...taskResults.filter((item) => item.created).map((item) => item.task),
    ];
    const result = createFleetOperationTask({
      robotaxi,
      taskType: policy.target_task_type,
      existingTasks: currentExistingTasks,
      trigger: {
        trigger_type: triggerType,
        trigger_source: "FLEET_OPERATION_POLICY",
        task_priority: resolveTaskPriority(policy.target_task_type),
        task_fields: {
          ...resolveTaskFields(policy, robotaxi),
          fleet_operation_policy_run_id: runId,
          trigger_object_type: "fleetOperationPolicy",
          trigger_object_id: policy.fleet_operation_policy_id,
        },
      },
      context,
    });
    taskResults.push(result);
    policyResults.push(createFleetOperationPolicyResult({
      resultId: resolveResultId(context),
      runId,
      policy,
      robotaxi,
      task: result.task || null,
      status: result.created ? FleetOperationPolicyResultStatus.TASK_CREATED : FleetOperationPolicyResultStatus.SKIPPED,
      reason: result.created ? "TASK_CREATED" : result.reason,
      snapshot: createRobotaxiSnapshot(robotaxi),
      occurredAt: startedAt,
    }));
    if (result.created && result.robotaxi) {
      updatedRobotaxis = updatedRobotaxis.map((item) => item.robotaxi_id === result.robotaxi.robotaxi_id ? result.robotaxi : item);
    }
  }

  const generatedTasks = taskResults.filter((item) => item.created).map((item) => item.task);
  const skippedCount = taskResults.filter((item) => !item.created).length;
  const runStatus = resolveRunStatus({ candidates, generatedTasks, skippedCount });
  const completedAt = resolveNow(context);
  const run = createFleetOperationPolicyRun({
    runId,
    policy,
    policySnapshot,
    triggerType,
    runStatus,
    startedAt,
    completedAt,
    candidateRobotaxiIds: candidates.map((item) => item.robotaxi_id),
    generatedTaskIds: generatedTasks.map((task) => task.task_id),
    noActionReason: candidates.length ? null : "NO_CANDIDATE_ROBOTAXI",
    resultSummary: createResultSummary({ policy, candidates, generatedTasks, skippedCount }),
  });

  return {
    run,
    policyResults,
    tasks: generatedTasks,
    collectionKey: getFleetOperationCollectionKey(policy.target_task_type),
    robotaxis: updatedRobotaxis,
    policy_snapshot: policySnapshot,
  };
}

export function createDirectFleetOperationTask({
  taskType,
  robotaxi,
  existingTasks = [],
  context = {},
  taskFields = {},
  triggerType = TriggerType.MANUAL,
} = {}) {
  return createFleetOperationTask({
    robotaxi,
    taskType,
    existingTasks,
    trigger: {
      trigger_type: triggerType,
      trigger_source: "DIRECT_ROBOTAXI_OPERATION",
      task_priority: resolveTaskPriority(taskType),
      task_fields: taskFields,
    },
    context,
  });
}

export function createFleetOperationPolicyResult({
  resultId,
  runId,
  policy,
  robotaxi,
  task,
  status,
  reason,
  snapshot,
  occurredAt,
} = {}) {
  return {
    fleet_operation_policy_result_id: resultId,
    fleet_operation_policy_run_id: runId,
    fleet_operation_policy_id: policy?.fleet_operation_policy_id || null,
    policy_type: policy?.policy_type || null,
    target_task_type: policy?.target_task_type || null,
    robotaxi_id: robotaxi?.robotaxi_id || null,
    task_id: task?.task_id || null,
    task_type: task?.task_type || policy?.target_task_type || null,
    result_status: status,
    result_reason: reason || null,
    robotaxi_snapshot: snapshot || null,
    created_at: occurredAt || defaultNow(),
  };
}

export function findFleetOperationPolicyCandidates(policy, robotaxis = []) {
  const taskType = policy?.target_task_type;
  const parameters = policy?.policy_parameters || {};
  return (robotaxis || []).filter((robotaxi) => {
    if (!robotaxi?.robotaxi_id) return false;
    if (taskType === TaskType.CLEANING) return isCleaningCandidate(robotaxi, parameters);
    if (taskType === TaskType.CHARGING) return isChargingCandidate(robotaxi, parameters);
    if (taskType === TaskType.MAINTENANCE) return isMaintenanceCandidate(robotaxi);
    if (taskType === TaskType.FAILURE_HANDLING) return isFailureCandidate(robotaxi);
    if (taskType === TaskType.RETIREMENT) return isRetirementCandidate(robotaxi);
    return false;
  });
}

function isCleaningCandidate(robotaxi, parameters) {
  const orderCountThreshold = Number(parameters.service_order_count_threshold || 0);
  const durationThreshold = Number(parameters.service_duration_minutes_threshold || 0);
  return robotaxi.cleanliness_status === CleanlinessStatus.NEEDS_CLEANING
    || robotaxi.fleet_operation_status === "NEED_CLEANING"
    || Number(robotaxi.service_order_count || 0) >= orderCountThreshold
    || Number(robotaxi.service_duration_minutes || 0) >= durationThreshold;
}

function isChargingCandidate(robotaxi, parameters) {
  const threshold = Number(parameters.battery_percent_threshold || 25);
  return Number(robotaxi.battery_percent || 0) <= threshold
    || [BatteryOperationStatus.LOW, BatteryOperationStatus.CRITICAL].includes(robotaxi.battery_operation_status);
}

function isMaintenanceCandidate(robotaxi) {
  return [MaintenanceStatus.DUE, MaintenanceStatus.IN_MAINTENANCE].includes(robotaxi.maintenance_status)
    || robotaxi.fleet_operation_status === "NEED_MAINTENANCE";
}

function isFailureCandidate(robotaxi) {
  return [FailureStatus.ALERTED, FailureStatus.REMOTE_HANDLING, FailureStatus.BROKEN].includes(robotaxi.failure_status)
    || robotaxi.fleet_operation_status === "BROKEN";
}

function isRetirementCandidate(robotaxi) {
  return robotaxi.retirement_status === RetirementStatus.RETIREMENT_CANDIDATE
    || robotaxi.availability_status === "RETIRED";
}

function createFleetOperationPolicyRun({
  runId,
  policy,
  policySnapshot,
  triggerType,
  runStatus,
  startedAt,
  completedAt,
  candidateRobotaxiIds,
  generatedTaskIds,
  noActionReason,
  resultSummary,
}) {
  return {
    fleet_operation_policy_run_id: runId,
    fleet_operation_policy_id: policy.fleet_operation_policy_id,
    policy_version: policy.policy_version,
    policy_type: policy.policy_type,
    target_task_type: policy.target_task_type,
    run_status: runStatus,
    trigger_type: triggerType,
    execution_scope: policy.execution_scope || "ALL_ROBOTAXI",
    policy_snapshot: policySnapshot,
    candidate_robotaxi_ids: candidateRobotaxiIds,
    generated_task_ids: generatedTaskIds,
    generated_task_count: generatedTaskIds.length,
    skipped_robotaxi_count: Math.max(0, candidateRobotaxiIds.length - generatedTaskIds.length),
    no_action_reason: noActionReason,
    result_summary: resultSummary,
    started_at: startedAt,
    completed_at: completedAt,
    created_at: startedAt,
  };
}

function createFailedRun({ policy, triggerType, context, reason }) {
  const now = resolveNow(context);
  return {
    run: createFleetOperationPolicyRun({
      runId: resolveRunId(context),
      policy: policy || {},
      policySnapshot: policy ? createPolicySnapshot(policy) : null,
      triggerType,
      runStatus: FleetOperationPolicyRunStatus.FAILED,
      startedAt: now,
      completedAt: now,
      candidateRobotaxiIds: [],
      generatedTaskIds: [],
      noActionReason: reason,
      resultSummary: reason,
    }),
    tasks: [],
    collectionKey: null,
    robotaxis: [],
  };
}

function createPolicySnapshot(policy) {
  return JSON.parse(JSON.stringify({
    fleet_operation_policy_id: policy.fleet_operation_policy_id,
    policy_name: policy.policy_name,
    policy_type: policy.policy_type,
    target_task_type: policy.target_task_type,
    policy_status: policy.policy_status,
    policy_version: policy.policy_version,
    execution_scope: policy.execution_scope,
    policy_parameters: policy.policy_parameters || {},
    low_peak_start_time: policy.low_peak_start_time,
    low_peak_end_time: policy.low_peak_end_time,
    service_order_count_threshold: policy.service_order_count_threshold,
    service_duration_minutes_threshold: policy.service_duration_minutes_threshold,
    battery_percent_threshold: policy.battery_percent_threshold,
    maintenance_due_days_threshold: policy.maintenance_due_days_threshold,
    failure_severity_threshold: policy.failure_severity_threshold,
    retirement_score_threshold: policy.retirement_score_threshold,
  }));
}

function createRobotaxiSnapshot(robotaxi) {
  return {
    robotaxi_id: robotaxi.robotaxi_id,
    availability_status: robotaxi.availability_status,
    current_order_id: robotaxi.current_order_id || null,
    current_task_id: robotaxi.current_task_id || null,
    fleet_operation_status: robotaxi.fleet_operation_status || null,
    cleanliness_status: robotaxi.cleanliness_status || null,
    battery_percent: robotaxi.battery_percent ?? null,
    battery_operation_status: robotaxi.battery_operation_status || null,
    maintenance_status: robotaxi.maintenance_status || null,
    failure_status: robotaxi.failure_status || null,
    retirement_status: robotaxi.retirement_status || null,
  };
}

function resolveTaskFields(policy, robotaxi) {
  const taskType = policy.target_task_type;
  if (taskType === TaskType.CLEANING) {
    return { clean_level_before: robotaxi.cleanliness_status || CleanlinessStatus.NEEDS_CLEANING, clean_level_after: CleanlinessStatus.CLEAN };
  }
  if (taskType === TaskType.CHARGING) {
    return {
      battery_percent_before: robotaxi.battery_percent || null,
      target_battery_percent: policy.policy_parameters?.target_battery_percent || 90,
    };
  }
  if (taskType === TaskType.MAINTENANCE) {
    return { maintenance_type: policy.policy_parameters?.maintenance_type || "SCHEDULED_SERVICE" };
  }
  if (taskType === TaskType.FAILURE_HANDLING) {
    return {
      failure_type: robotaxi.failure_type || "UNKNOWN",
      failure_severity: robotaxi.failure_severity || policy.policy_parameters?.failure_severity_threshold || "MEDIUM",
      allow_current_service_completion: policy.policy_parameters?.allow_current_service_completion ?? true,
    };
  }
  if (taskType === TaskType.RETIREMENT) {
    return { retirement_reason: robotaxi.retirement_reason || "RETIREMENT_CANDIDATE", approval_status: "PENDING" };
  }
  return {};
}

function resolveTaskPriority(taskType) {
  if (taskType === TaskType.FAILURE_HANDLING) return TaskPriority.URGENT;
  if (taskType === TaskType.RETIREMENT) return TaskPriority.HIGH;
  return TaskPriority.NORMAL;
}

function resolveRunStatus({ candidates, generatedTasks, skippedCount }) {
  if (!candidates.length) return FleetOperationPolicyRunStatus.NO_ACTION;
  if (generatedTasks.length && skippedCount) return FleetOperationPolicyRunStatus.PARTIALLY_SUCCEEDED;
  if (generatedTasks.length) return FleetOperationPolicyRunStatus.SUCCEEDED;
  return FleetOperationPolicyRunStatus.NO_ACTION;
}

function createResultSummary({ policy, candidates, generatedTasks, skippedCount }) {
  if (!candidates.length) return `未发现需要${policy.target_task_type}的 Robotaxi`;
  return `发现 ${candidates.length} 台候选 Robotaxi，生成 ${generatedTasks.length} 个任务，跳过 ${skippedCount} 个`;
}

function resolveRunId(context) {
  if (typeof context.nextRunId === "function") return context.nextRunId();
  const sequence = String(context.runSequence || 1).padStart(4, "0");
  return `FOP-RUN-${sequence}`;
}

function resolveResultId(context) {
  if (typeof context.nextResultId === "function") return context.nextResultId();
  const sequence = String(context.resultSequence || 1).padStart(4, "0");
  return `FOP-RESULT-${sequence}`;
}

function resolveNow(context) {
  if (typeof context.now === "function") return context.now();
  return context.now || defaultNow();
}

function defaultNow() {
  return new Date(0).toISOString();
}
