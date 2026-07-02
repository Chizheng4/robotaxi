export const FleetOperationDispatchStrategyStatus = {
  ACTIVE: "ACTIVE",
  DRAFT: "DRAFT",
  ARCHIVED: "ARCHIVED",
};

export const FleetOperationDispatchRunStatus = {
  SUCCEEDED: "SUCCEEDED",
  NO_ELIGIBLE_CENTER: "NO_ELIGIBLE_CENTER",
  FAILED: "FAILED",
};

export const FleetOperationDispatchDecisionResult = {
  DISPATCHED: "DISPATCHED",
  NO_CAPACITY: "NO_CAPACITY",
  NO_MATCHING_CAPABILITY: "NO_MATCHING_CAPABILITY",
};

export function createFleetOperationDispatchStrategy(strategy) {
  return {
    fleet_operation_dispatch_strategy_id: null,
    strategy_name: "",
    dispatch_algorithm: "NEAREST_AVAILABLE",
    strategy_status: FleetOperationDispatchStrategyStatus.ACTIVE,
    created_at: null,
    updated_at: null,
    ...strategy,
  };
}

export function createFleetOperationDispatchRun(run) {
  return {
    fleet_operation_dispatch_run_id: null,
    fleet_operation_dispatch_strategy_id: null,
    task_id: null,
    task_type: null,
    robotaxi_id: null,
    origin_cell_id: null,
    run_status: null,
    decision_count: 0,
    created_at: null,
    ...run,
  };
}

export function createFleetOperationDispatchDecision(decision) {
  return {
    fleet_operation_dispatch_decision_id: null,
    fleet_operation_dispatch_run_id: null,
    fleet_operation_dispatch_strategy_id: null,
    task_id: null,
    task_type: null,
    robotaxi_id: null,
    selected_ops_center_id: null,
    target_cell_id: null,
    decision_result: null,
    distance_m: null,
    total_distance_km: null,
    reason: null,
    created_at: null,
    ...decision,
  };
}
