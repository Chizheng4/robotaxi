export const RobotaxiLifecycleStage = {
  PRE_OPERATION: "PRE_OPERATION",
  IN_OPERATION: "IN_OPERATION",
  RETIRED: "RETIRED",
};

export const RobotaxiOperationPhase = {
  FIRST_ADMISSION: "FIRST_ADMISSION",
  ADMISSION_REMEDIATION: "ADMISSION_REMEDIATION",
  READY_NOT_DEPLOYED: "READY_NOT_DEPLOYED",
  ACTIVE_OPERATION: "ACTIVE_OPERATION",
  RETIRED: "RETIRED",
};

export const RobotaxiAssignmentState = {
  NONE: "NONE",
  READINESS_TASK: "READINESS_TASK",
  DEPLOYMENT_TASK: "DEPLOYMENT_TASK",
  SERVICE_ORDER: "SERVICE_ORDER",
  FLEET_OPERATION_TASK: "FLEET_OPERATION_TASK",
};

export const TaskPlanningDecision = {
  CREATE_NOW: "CREATE_NOW",
  QUEUE: "QUEUE",
  REJECT: "REJECT",
  MERGE: "MERGE",
  UPGRADE: "UPGRADE",
  INTERRUPT: "INTERRUPT",
};

export const TaskPlanningAssignmentType = {
  READINESS_TASK: "READINESS_TASK",
  DEPLOYMENT_TASK: "DEPLOYMENT_TASK",
  SERVICE_ORDER: "SERVICE_ORDER",
  FLEET_OPERATION_TASK: "FLEET_OPERATION_TASK",
  RETIREMENT_ACTION: "RETIREMENT_ACTION",
};

export const TaskPlanningRunStatus = {
  SUCCEEDED: "SUCCEEDED",
  REJECTED: "REJECTED",
  FAILED: "FAILED",
};

export const TaskPlanningResultStatus = {
  PLANNING_ALLOWED: "PLANNING_ALLOWED",
  PLANNING_QUEUED: "PLANNING_QUEUED",
  PLANNING_REJECTED: "PLANNING_REJECTED",
  PLANNING_FAILED: "PLANNING_FAILED",
};

export function createRobotaxiTaskPlanningStrategy(strategy = {}) {
  return {
    robotaxi_task_planning_strategy_id: null,
    strategy_name: "",
    strategy_status: "ACTIVE",
    planning_algorithm: "ROBOTAXI_STATE_TASK_PLANNING",
    priority_rank: {
      FAILURE_HANDLING: 100,
      RETIREMENT: 90,
      MAINTENANCE: 80,
      CHARGING: 70,
      CLEANING: 60,
      DEPLOYMENT: 40,
      SERVICE_ORDER: 30,
      READINESS_CHECK: 20,
    },
    queue_policy: {
      allow_queue_when_service_order_active: true,
      allow_queue_when_deployment_active: true,
      allow_queue_when_fleet_operation_active: true,
      max_queue_size: 5,
    },
    phase_rules: {
      FIRST_ADMISSION: ["READINESS_CHECK"],
      ADMISSION_REMEDIATION: ["CLEANING", "CHARGING", "MAINTENANCE"],
      READY_NOT_DEPLOYED: ["DEPLOYMENT", "SERVICE_ORDER"],
      ACTIVE_OPERATION: ["DEPLOYMENT", "SERVICE_ORDER", "CLEANING", "CHARGING", "MAINTENANCE", "FAILURE_HANDLING", "RETIREMENT"],
      RETIRED: [],
    },
    compatibility_rules: {
      CLEANING: ["CHARGING", "MAINTENANCE"],
      CHARGING: ["CLEANING", "MAINTENANCE"],
      MAINTENANCE: ["CLEANING", "CHARGING"],
      FAILURE_HANDLING: [],
      RETIREMENT: [],
    },
    failure_trigger_policy: "MOVING_ONLY",
    external_assignment_queue_policy: "INTERNAL_QUEUE_FIRST",
    created_at: null,
    updated_at: null,
    ...strategy,
  };
}

export function createRobotaxiTaskPlanningRun(run = {}) {
  return {
    robotaxi_task_planning_run_id: run.robotaxi_task_planning_run_id || null,
    robotaxi_task_planning_strategy_id: run.robotaxi_task_planning_strategy_id || null,
    strategy_name: run.strategy_name || null,
    robotaxi_id: run.robotaxi_id || null,
    requested_assignment_type: run.requested_assignment_type || null,
    requested_task_type: run.requested_task_type || null,
    trigger_source: run.trigger_source || null,
    trigger_object_type: run.trigger_object_type || null,
    trigger_object_id: run.trigger_object_id || null,
    run_status: run.run_status || TaskPlanningRunStatus.SUCCEEDED,
    planning_decision: run.planning_decision || null,
    decision_reason: run.decision_reason || null,
    composite_state: run.composite_state || null,
    strategy_snapshot: run.strategy_snapshot || null,
    input_snapshot: run.input_snapshot || null,
    output_snapshot: run.output_snapshot || null,
    created_at: run.created_at || null,
  };
}

export function createRobotaxiTaskPlanningResult(result = {}) {
  return {
    robotaxi_task_planning_result_id: result.robotaxi_task_planning_result_id || null,
    robotaxi_task_planning_run_id: result.robotaxi_task_planning_run_id || null,
    robotaxi_task_planning_strategy_id: result.robotaxi_task_planning_strategy_id || null,
    robotaxi_id: result.robotaxi_id || null,
    requested_assignment_type: result.requested_assignment_type || null,
    requested_task_type: result.requested_task_type || null,
    decision_result: result.decision_result || TaskPlanningResultStatus.PLANNING_ALLOWED,
    planning_decision: result.planning_decision || null,
    decision_reason: result.decision_reason || null,
    message: result.message || null,
    queue_sequence: result.queue_sequence || result.queue_entry?.queue_sequence || null,
    queue_entry: result.queue_entry || null,
    queue_snapshot: result.queue_snapshot || null,
    composite_state: result.composite_state || null,
    created_at: result.created_at || null,
  };
}
