import {
  OrderMatchingFailureReason,
  OrderMatchingResult,
  createOrderMatchingDecision,
  createOrderMatchingRun,
} from "../domain/orderMatchingTypes.js?v=20260611-v019-5-order-matching";

export function runOrderMatching({ strategy, serviceOrder, data, orderMatchingRunId, orderMatchingDecisionId, createdAt }) {
  if (!strategy || strategy.strategy_status !== "ACTIVE") {
    return createFailedResult({ strategy, serviceOrder, orderMatchingRunId, orderMatchingDecisionId, createdAt, failureReason: OrderMatchingFailureReason.NO_AVAILABLE_ROBOTAXI });
  }

  const candidates = (data.robotaxis || []).filter((robotaxi) =>
    robotaxi.availability_status === "AVAILABLE" &&
    !robotaxi.current_order_id &&
    !robotaxi.current_task_id &&
    !hasFleetOperationBlocker(robotaxi)
  );
  const eligible = candidates
    .filter((robotaxi) => Number(robotaxi.battery_percent) >= Number(strategy.min_battery_threshold || 20))
    .map((robotaxi) => createCandidateScore(robotaxi, serviceOrder, data))
    .filter((candidate) => Number.isFinite(candidate.estimated_pickup_distance_km));

  if (eligible.length === 0) {
    const failureReason = candidates.length === 0
      ? OrderMatchingFailureReason.NO_AVAILABLE_ROBOTAXI
      : OrderMatchingFailureReason.BATTERY_NOT_ENOUGH;
    return createFailedResult({
      strategy,
      serviceOrder,
      orderMatchingRunId,
      orderMatchingDecisionId,
      createdAt,
      failureReason,
      candidateRobotaxiCount: candidates.length,
      eligibleRobotaxiCount: 0,
      candidateSnapshot: candidates.map(snapshotRobotaxi),
    });
  }

  const selected = eligible.sort((left, right) =>
    left.estimated_pickup_distance_km - right.estimated_pickup_distance_km ||
    right.battery_percent - left.battery_percent ||
    left.robotaxi_id.localeCompare(right.robotaxi_id)
  )[0];
  const run = createOrderMatchingRun({
    order_matching_run_id: orderMatchingRunId,
    order_matching_strategy_id: strategy.order_matching_strategy_id,
    matching_algorithm: strategy.matching_algorithm,
    service_order_id: serviceOrder.service_order_id,
    pickup_cell_id: serviceOrder.pickup_cell_id,
    pickup_service_area_id: serviceOrder.pickup_service_area_id,
    candidate_robotaxi_count: candidates.length,
    eligible_robotaxi_count: eligible.length,
    selected_robotaxi_id: selected.robotaxi_id,
    input_snapshot: {
      service_order_id: serviceOrder.service_order_id,
      pickup_cell_id: serviceOrder.pickup_cell_id,
      pickup_service_area_id: serviceOrder.pickup_service_area_id,
      min_battery_threshold: strategy.min_battery_threshold,
    },
    candidate_snapshot: eligible.map(snapshotCandidate),
    output_snapshot: selected,
    run_result: OrderMatchingResult.SUCCESS,
    failure_reason: null,
    created_at: createdAt,
  });
  const decision = createOrderMatchingDecision({
    order_matching_decision_id: orderMatchingDecisionId,
    order_matching_run_id: orderMatchingRunId,
    order_matching_strategy_id: strategy.order_matching_strategy_id,
    matching_algorithm: strategy.matching_algorithm,
    service_order_id: serviceOrder.service_order_id,
    selected_robotaxi_id: selected.robotaxi_id,
    pickup_cell_id: serviceOrder.pickup_cell_id,
    pickup_service_area_id: serviceOrder.pickup_service_area_id,
    estimated_pickup_distance_km: selected.estimated_pickup_distance_km,
    estimated_pickup_duration_min: selected.estimated_pickup_duration_min,
    matching_score: selected.matching_score,
    decision_result: OrderMatchingResult.SUCCESS,
    failure_reason: null,
    decision_reason: `选择距离上车点最近的可用 Robotaxi：${selected.robotaxi_id}`,
    created_at: createdAt,
  });
  return { run, decision };
}

function hasFleetOperationBlocker(robotaxi) {
  return Boolean(
    (robotaxi?.fleet_operation_status && robotaxi.fleet_operation_status !== "NONE") ||
    robotaxi?.pending_fleet_task_id ||
    robotaxi?.needs_cleaning === true ||
    robotaxi?.needs_charging === true ||
    robotaxi?.needs_maintenance === true ||
    robotaxi?.cleanliness_status === "NEEDS_CLEANING" ||
    ["LOW", "CRITICAL"].includes(robotaxi?.battery_operation_status) ||
    ["DUE", "IN_MAINTENANCE"].includes(robotaxi?.maintenance_status) ||
    ["ALERTED", "REMOTE_HANDLING", "BROKEN"].includes(robotaxi?.failure_status)
  );
}

function createFailedResult({ strategy, serviceOrder, orderMatchingRunId, orderMatchingDecisionId, createdAt, failureReason, candidateRobotaxiCount = 0, eligibleRobotaxiCount = 0, candidateSnapshot = [] }) {
  const run = createOrderMatchingRun({
    order_matching_run_id: orderMatchingRunId,
    order_matching_strategy_id: strategy?.order_matching_strategy_id || null,
    matching_algorithm: strategy?.matching_algorithm || null,
    service_order_id: serviceOrder?.service_order_id || null,
    pickup_cell_id: serviceOrder?.pickup_cell_id || null,
    pickup_service_area_id: serviceOrder?.pickup_service_area_id || null,
    candidate_robotaxi_count: candidateRobotaxiCount,
    eligible_robotaxi_count: eligibleRobotaxiCount,
    selected_robotaxi_id: null,
    input_snapshot: serviceOrder ? {
      service_order_id: serviceOrder.service_order_id,
      pickup_cell_id: serviceOrder.pickup_cell_id,
      pickup_service_area_id: serviceOrder.pickup_service_area_id,
      min_battery_threshold: strategy?.min_battery_threshold || 20,
    } : null,
    candidate_snapshot: candidateSnapshot,
    output_snapshot: null,
    run_result: OrderMatchingResult.FAILED,
    failure_reason: failureReason,
    created_at: createdAt,
  });
  const decision = createOrderMatchingDecision({
    order_matching_decision_id: orderMatchingDecisionId,
    order_matching_run_id: orderMatchingRunId,
    order_matching_strategy_id: strategy?.order_matching_strategy_id || null,
    matching_algorithm: strategy?.matching_algorithm || null,
    service_order_id: serviceOrder?.service_order_id || null,
    selected_robotaxi_id: null,
    pickup_cell_id: serviceOrder?.pickup_cell_id || null,
    pickup_service_area_id: serviceOrder?.pickup_service_area_id || null,
    estimated_pickup_distance_km: null,
    estimated_pickup_duration_min: null,
    matching_score: null,
    decision_result: OrderMatchingResult.FAILED,
    failure_reason: failureReason,
    decision_reason: "没有找到满足条件的可用 Robotaxi",
    created_at: createdAt,
  });
  return { run, decision };
}

function createCandidateScore(robotaxi, serviceOrder, data) {
  const robotaxiCell = getCell(robotaxi.current_cell_id, data);
  const pickupCell = getCell(serviceOrder.pickup_cell_id, data);
  const cellSizeM = data.maps?.[0]?.cell_size_m || 50;
  const cellDistance = manhattanDistance(robotaxiCell, pickupCell);
  const estimatedPickupDistanceKm = Number(((cellDistance * cellSizeM) / 1000).toFixed(2));
  return {
    robotaxi_id: robotaxi.robotaxi_id,
    current_cell_id: robotaxi.current_cell_id,
    battery_percent: robotaxi.battery_percent,
    estimated_pickup_distance_km: estimatedPickupDistanceKm,
    estimated_pickup_duration_min: Math.max(1, Math.ceil((estimatedPickupDistanceKm / 24) * 60)),
    matching_score: Number((1 / (1 + estimatedPickupDistanceKm)).toFixed(4)),
  };
}

function snapshotCandidate(candidate) {
  return {
    robotaxi_id: candidate.robotaxi_id,
    current_cell_id: candidate.current_cell_id,
    battery_percent: candidate.battery_percent,
    estimated_pickup_distance_km: candidate.estimated_pickup_distance_km,
    matching_score: candidate.matching_score,
  };
}

function snapshotRobotaxi(robotaxi) {
  return {
    robotaxi_id: robotaxi.robotaxi_id,
    current_cell_id: robotaxi.current_cell_id,
    battery_percent: robotaxi.battery_percent,
    availability_status: robotaxi.availability_status,
    current_task_id: robotaxi.current_task_id || null,
    current_order_id: robotaxi.current_order_id || null,
  };
}

function getCell(cellId, data) {
  return (data.cells || []).find((cell) => cell.cell_id === cellId);
}

function manhattanDistance(left, right) {
  if (!left || !right) return Infinity;
  return Math.abs(left.row - right.row) + Math.abs(left.col - right.col);
}
