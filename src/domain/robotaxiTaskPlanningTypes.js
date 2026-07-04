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

export function createRobotaxiTaskPlanningStrategy(strategy = {}) {
  return {
    robotaxi_task_planning_strategy_id: null,
    strategy_name: "",
    strategy_status: "ACTIVE",
    planning_algorithm: "ROBOTAXI_STATE_TASK_PLANNING",
    priority_rank: {
      FAILURE_HANDLING: 100,
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
      ACTIVE_OPERATION: ["DEPLOYMENT", "SERVICE_ORDER", "CLEANING", "CHARGING", "MAINTENANCE", "FAILURE_HANDLING"],
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
