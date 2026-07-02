import {
  FleetOperationDispatchDecisionResult,
  FleetOperationDispatchRunStatus,
  createFleetOperationDispatchDecision,
  createFleetOperationDispatchRun,
  createFleetOperationDispatchStrategy,
} from "../domain/fleetOperationDispatchTypes.js";

const CAPABILITY_MAP = {
  CLEANING: "can_clean_robotaxi",
  CHARGING: "can_charge_robotaxi",
  MAINTENANCE: "can_repair_robotaxi",
  FAILURE_HANDLING: "can_repair_robotaxi",
  RETIREMENT: "can_receive_robotaxi",
};

export function initializeDefaultFleetOperationDispatchStrategies() {
  return [
    createFleetOperationDispatchStrategy({
      fleet_operation_dispatch_strategy_id: "FODS-STANDARD-001",
      strategy_name: "最近可用运维中心",
      dispatch_algorithm: "NEAREST_AVAILABLE",
      strategy_status: "ACTIVE",
      created_at: "2026-07-02T00:00:00.000Z",
    }),
  ];
}

export function dispatchFleetOperationDestination({
  task,
  robotaxi,
  opsCenters = [],
  strategy = null,
  context = {},
} = {}) {
  if (!task?.task_type || !robotaxi?.robotaxi_id) {
    return createFailedDispatch({ reason: "INVALID_DISPATCH_INPUT" });
  }

  const capabilityKey = CAPABILITY_MAP[task.task_type];
  if (!capabilityKey) {
    return createFailedDispatch({ reason: "UNKNOWN_TASK_TYPE_FOR_DISPATCH" });
  }

  const eligibleCenters = (opsCenters || []).filter((oc) => oc[capabilityKey]);
  if (!eligibleCenters.length) {
    return createNoEligibleCenterDispatch({ task, robotaxi, strategy, reason: "NO_MATCHING_CAPABILITY" });
  }

  const originCellId = robotaxi.current_cell_id || null;
  const ranked = eligibleCenters.map((center) => ({
    center,
    targetCellId: center.cell_ids?.[0] || null,
    distanceM: 0,
  }));

  const best = ranked[0];
  const now = resolveNow(context);
  const runId = resolveDispatchRunId(context);
  const decisionId = resolveDispatchDecisionId(context);

  const run = createFleetOperationDispatchRun({
    fleet_operation_dispatch_run_id: runId,
    fleet_operation_dispatch_strategy_id: strategy?.fleet_operation_dispatch_strategy_id || "FODS-STANDARD-001",
    task_id: task.task_id,
    task_type: task.task_type,
    robotaxi_id: robotaxi.robotaxi_id,
    origin_cell_id: originCellId,
    run_status: FleetOperationDispatchRunStatus.SUCCEEDED,
    decision_count: 1,
    created_at: now,
  });

  const decision = createFleetOperationDispatchDecision({
    fleet_operation_dispatch_decision_id: decisionId,
    fleet_operation_dispatch_run_id: runId,
    fleet_operation_dispatch_strategy_id: run.fleet_operation_dispatch_strategy_id,
    task_id: task.task_id,
    task_type: task.task_type,
    robotaxi_id: robotaxi.robotaxi_id,
    selected_ops_center_id: best.center.ops_center_id,
    target_cell_id: best.targetCellId,
    decision_result: FleetOperationDispatchDecisionResult.DISPATCHED,
    distance_m: best.distanceM,
    total_distance_km: best.distanceM ? best.distanceM / 1000 : null,
    reason: "NEAREST_AVAILABLE",
    created_at: now,
  });

  return { run, decision, targetOpsCenterId: best.center.ops_center_id, targetCellId: best.targetCellId };
}

function createFailedDispatch({ reason }) {
  const now = new Date().toISOString();
  const run = createFleetOperationDispatchRun({
    fleet_operation_dispatch_run_id: null,
    run_status: FleetOperationDispatchRunStatus.FAILED,
    created_at: now,
  });
  const decision = createFleetOperationDispatchDecision({
    decision_result: FleetOperationDispatchDecisionResult.NO_CAPACITY,
    reason,
    created_at: now,
  });
  return { run, decision, targetOpsCenterId: null, targetCellId: null };
}

function createNoEligibleCenterDispatch({ task, robotaxi, strategy, reason }) {
  const now = new Date().toISOString();
  const run = createFleetOperationDispatchRun({
    fleet_operation_dispatch_run_id: null,
    fleet_operation_dispatch_strategy_id: strategy?.fleet_operation_dispatch_strategy_id || null,
    task_id: task?.task_id || null,
    task_type: task?.task_type || null,
    robotaxi_id: robotaxi?.robotaxi_id || null,
    origin_cell_id: robotaxi?.current_cell_id || null,
    run_status: FleetOperationDispatchRunStatus.NO_ELIGIBLE_CENTER,
    decision_count: 0,
    created_at: now,
  });
  const decision = createFleetOperationDispatchDecision({
    decision_result: FleetOperationDispatchDecisionResult.NO_MATCHING_CAPABILITY,
    reason,
    created_at: now,
  });
  return { run, decision, targetOpsCenterId: null, targetCellId: null };
}

function resolveNow(context) {
  if (typeof context.now === "function") return context.now();
  return context.now || new Date().toISOString();
}

function resolveDispatchRunId(context) {
  if (typeof context.nextDispatchRunId === "function") return context.nextDispatchRunId();
  return `FODR-${String(Date.now()).slice(-6)}`;
}

function resolveDispatchDecisionId(context) {
  if (typeof context.nextDispatchDecisionId === "function") return context.nextDispatchDecisionId();
  return `FODD-${String(Date.now()).slice(-6)}`;
}
