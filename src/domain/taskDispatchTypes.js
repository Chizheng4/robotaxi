export const TaskDispatchStrategyStatus = {
  ACTIVE: "ACTIVE",
  DRAFT: "DRAFT",
  ARCHIVED: "ARCHIVED",
};

export const TaskDispatchRunStatus = {
  SUCCEEDED: "SUCCEEDED",
  NO_ACTION: "NO_ACTION",
  FAILED: "FAILED",
};

export const TaskDispatchCandidateType = {
  FLEET_OPERATION_TASK: "FLEET_OPERATION_TASK",
  SERVICE_ORDER: "SERVICE_ORDER",
  DEPLOYMENT_TASK: "DEPLOYMENT_TASK",
};

export const TaskDispatchDecisionResult = {
  SELECTED: "SELECTED",
  SKIPPED: "SKIPPED",
  NO_CANDIDATE: "NO_CANDIDATE",
};

export function createTaskDispatchStrategy(strategy) {
  return {
    task_dispatch_strategy_id: null,
    strategy_name: "",
    dispatch_algorithm: "RELEASED_ROBOTAXI_PRIORITY",
    strategy_status: TaskDispatchStrategyStatus.ACTIVE,
    fleet_operation_priority: 80,
    service_order_priority: 60,
    deployment_task_priority: 40,
    created_at: null,
    updated_at: null,
    ...strategy,
  };
}

export function createTaskDispatchRun(run) {
  return {
    task_dispatch_run_id: null,
    task_dispatch_strategy_id: null,
    strategy_name: null,
    robotaxi_id: null,
    trigger_object_type: null,
    trigger_object_id: null,
    run_status: null,
    candidate_count: 0,
    selected_candidate_type: null,
    selected_object_id: null,
    no_action_reason: null,
    strategy_snapshot: null,
    created_at: null,
    ...run,
  };
}

export function createTaskDispatchResult(result) {
  return {
    task_dispatch_result_id: null,
    task_dispatch_run_id: null,
    task_dispatch_strategy_id: null,
    robotaxi_id: null,
    candidate_type: null,
    candidate_object_id: null,
    candidate_status: null,
    candidate_priority: null,
    decision_result: null,
    decision_reason: null,
    created_at: null,
    ...result,
  };
}
