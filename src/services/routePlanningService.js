import * as taskTypes from "../domain/taskTypes.js";
import * as tripTypes from "../domain/tripTypes.js";
import { createRoutePlanningStrategySnapshot } from "../domain/routePlanningStrategies.js";

export const DEFAULT_CELL_TRAVEL_SECONDS = 6;

export function createPriceEstimationRoute({ serviceOrder, data, routeId, routePlanningRunId }) {
  const originCellId = serviceOrder.customer_origin_cell_id;
  const pickupCellId = serviceOrder.pickup_cell_id;
  const targetCellId = serviceOrder.dropoff_cell_id;
  const pickupPlan = originCellId === pickupCellId
    ? { road_segment_sequence: [], route_steps: createSingleCellRouteSteps(data, originCellId) }
    : createBfsRoutePlan(data, originCellId, pickupCellId);
  const dropoffPlan = createBfsRoutePlan(data, pickupCellId, targetCellId);
  const routeSteps = mergeRouteStepPlans([pickupPlan.route_steps, dropoffPlan.route_steps], data);
  const roadSegmentSequence = [
    ...pickupPlan.road_segment_sequence,
    ...dropoffPlan.road_segment_sequence,
  ].filter((segmentId, index, list) => segmentId && list.indexOf(segmentId) === index);
  const totalDistance = Math.max(0, routeSteps.length - 1) * (data.maps?.[0]?.cell_size_m || 50);
  const valid = routeSteps.length > 0 && routeSteps[0]?.cell_id === originCellId && routeSteps[routeSteps.length - 1]?.cell_id === targetCellId;

  return withRouteFacts({
    route_id: routeId,
    route_version: 1,
    route_name: `${serviceOrder.service_order_id} 价格预估路径`,
    route_usage_type: taskTypes.RouteUsageType.PRICE_ESTIMATION,
    route_segments: [
      { segment_type: "CUSTOMER_TO_PICKUP", origin_cell_id: originCellId, target_cell_id: pickupCellId, step_count: Math.max(0, pickupPlan.route_steps.length - 1) },
      { segment_type: "PICKUP_TO_DROPOFF", origin_cell_id: pickupCellId, target_cell_id: targetCellId, step_count: Math.max(0, dropoffPlan.route_steps.length - 1) },
    ],
    map_id: data.maps?.[0]?.map_id || null,
    start_cell_id: originCellId,
    end_cell_id: targetCellId,
    origin_cell_id: originCellId,
    target_cell_id: targetCellId,
    task_id: null,
    service_order_id: serviceOrder.service_order_id,
    trip_id: null,
    route_execution_id: null,
    route_planning_run_id: routePlanningRunId,
    robotaxi_id: null,
    route_strategy_id: taskTypes.RoutePlanningStrategy.SERVICE_PRICE_ESTIMATION,
    planning_algorithm: taskTypes.RoutePlanningAlgorithm.BFS_CELL_GRAPH,
    road_segment_sequence: roadSegmentSequence,
    route_steps: routeSteps,
    total_step_count: Math.max(0, routeSteps.length - 1),
    related_service_area_ids: [serviceOrder.pickup_service_area_id, serviceOrder.dropoff_service_area_id].filter(Boolean),
    total_distance_m: totalDistance,
    route_status: valid ? "Active" : "Failed",
    failure_reason: valid ? null : taskTypes.RoutePlanningFailureReason.NO_CONNECTED_ROAD_SEGMENT,
  });
}

export function planDeploymentRoute({ execution, task, data, routeId, routePlanningRunId }) {
  const originCellId = execution.current_cell_id || task.origin_cell_id;
  const targetCellId = execution.planned_target_cell_id || task.planned_target_cell_id || task.target_cell_id;
  const targetServiceAreaId = execution.planned_target_service_area_id || task.planned_target_service_area_id || task.target_service_area_id;
  const route = createDeploymentRoute({
    task,
    data,
    routeId,
    routePlanningRunId,
    originCellId,
    targetCellId,
    targetServiceAreaId,
    routeExecutionId: execution.route_execution_id,
    strategyId: taskTypes.RoutePlanningStrategy.INITIAL_DEPLOYMENT,
  });
  const routePlanningRun = createRoutePlanningRun({
    routePlanningRunId,
    routeStrategyId: route.route_strategy_id,
    planningAlgorithm: route.planning_algorithm,
    taskId: task.task_id,
    routeExecutionId: execution.route_execution_id,
    robotaxiId: task.robotaxi_id,
    originCellId,
    targetCellId,
    resultRouteId: route.route_steps.length > 0 ? route.route_id : null,
    planningResult: route.route_steps.length > 0 ? taskTypes.RoutePlanningResult.SUCCESS : taskTypes.RoutePlanningResult.FAILED,
    failureReason: route.route_steps.length > 0 ? taskTypes.RoutePlanningFailureReason.NONE : route.failure_reason,
    routeStepCount: route.route_step_count,
    totalDistanceKm: route.total_distance_km,
    createdAt: new Date().toISOString(),
  });
  if (route.route_steps.length === 0) {
    return {
      route: null,
      routePlanningRun,
      execution: {
        ...execution,
        execution_status: taskTypes.RouteExecutionStatus.FAILED,
        failure_reason: route.failure_reason,
      },
      task: {
        ...task,
        task_status: taskTypes.DeploymentTaskStatus.FAILED,
        failure_reason: route.failure_reason,
      },
    };
  }
  const routeCells = getRouteExecutionCells(route, data.roadSegments, originCellId, targetCellId);
  const nextExecution = applyTravelMetrics({
    record: {
      ...execution,
      route_id: route.route_id,
      route_strategy_id: route.route_strategy_id,
      execution_status: taskTypes.RouteExecutionStatus.MOVING,
      origin_cell_id: originCellId,
      target_cell_id: targetCellId,
      target_service_area_id: targetServiceAreaId,
      actual_target_service_area_id: null,
      actual_target_cell_id: null,
      current_step_index: 0,
      total_step_count: Math.max(0, routeCells.length - 1),
      route_cell_ids: routeCells,
      current_target_service_area_id: targetServiceAreaId,
      route_history: [createRouteHistoryEntry(route, taskTypes.RouteChangeReason.INITIAL_PLANNING, null)],
      time_elapsed: "0",
      battery_consumed_percent: 0,
      started_at: new Date().toISOString(),
      completed_at: null,
      failure_reason: null,
    },
    routes: [route],
    currentRouteId: route.route_id,
    currentStepIndex: 0,
  });
  return {
    route,
    routePlanningRun,
    execution: nextExecution,
    task: {
      ...task,
      task_status: taskTypes.DeploymentTaskStatus.MOVING,
      route_id: route.route_id,
      route_strategy_id: route.route_strategy_id,
      started_at: new Date().toISOString(),
    },
  };
}

export function createDeploymentRouteForOperation({
  task,
  data,
  routeId,
  routePlanningRunId,
  routeExecutionId,
  originCellId,
  targetCellId,
  targetServiceAreaId,
  strategyId,
}) {
  return createDeploymentRoute({
    task,
    data,
    routeId,
    routePlanningRunId,
    originCellId,
    targetCellId,
    targetServiceAreaId,
    routeExecutionId,
    strategyId,
  });
}

export function advanceRouteExecution({ execution, task, route, robotaxi }) {
  if (!execution || !task || !route || execution.execution_status !== taskTypes.RouteExecutionStatus.MOVING) return null;
  const routeCellIds = execution.route_cell_ids?.length
    ? execution.route_cell_ids
    : getRouteExecutionCells(route, [], execution.origin_cell_id, execution.target_cell_id);
  const totalStepCount = Math.max(0, execution.total_step_count || routeCellIds.length - 1);
  const nextStepIndex = Math.min(Number(execution.current_step_index || 0) + 1, totalStepCount);
  const nextCellId = routeCellIds[nextStepIndex] || execution.target_cell_id;
  const completed = nextStepIndex >= totalStepCount;
  const nextExecution = applyTravelMetrics({
    record: {
      ...execution,
      execution_status: completed ? taskTypes.RouteExecutionStatus.ARRIVED : taskTypes.RouteExecutionStatus.MOVING,
      current_cell_id: nextCellId,
      current_step_index: nextStepIndex,
      total_step_count: totalStepCount,
      time_elapsed: addElapsedMinutes(execution.time_elapsed, DEFAULT_CELL_TRAVEL_SECONDS / 60),
    },
    routes: [route],
    currentRouteId: execution.route_id,
    currentStepIndex: nextStepIndex,
  });
  const distanceDeltaKm = roundDistance(Math.max(0, Number(nextExecution.distance_traveled_km || 0) - Number(execution.distance_traveled_km || 0)));
  const batteryDeltaPercent = robotaxi?.max_range_km
    ? Number((distanceDeltaKm / robotaxi.max_range_km * 100).toFixed(2))
    : 0;
  const batteryConsumedPercent = Number((Number(execution.battery_consumed_percent || 0) + batteryDeltaPercent).toFixed(2));
  return {
    execution: {
      ...execution,
      ...nextExecution,
      battery_consumed_percent: batteryConsumedPercent,
    },
    task: completed ? { ...task, task_status: taskTypes.DeploymentTaskStatus.ARRIVED } : task,
    robotaxi: robotaxi ? {
      ...robotaxi,
      current_cell_id: nextCellId,
      current_route_id: execution.route_id,
      current_task_id: execution.task_id || task.task_id,
      motion_status: completed ? "STOPPED" : "MOVING",
      battery_percent: Number(Math.max(0, Number(robotaxi.battery_percent || 0) - batteryDeltaPercent).toFixed(2)),
      estimated_range_km: Number(Math.max(0, Number(robotaxi.estimated_range_km || 0) - distanceDeltaKm).toFixed(2)),
    } : null,
  };
}

export function projectRouteExecutionTravelProgress({ execution, route, elapsedSeconds = 0, cellTravelSeconds = DEFAULT_CELL_TRAVEL_SECONDS }) {
  if (!execution || !route) return null;
  const routeCellIds = execution.route_cell_ids?.length
    ? execution.route_cell_ids
    : getRouteExecutionCells(route, [], execution.origin_cell_id, execution.target_cell_id);
  const totalStepCount = Math.max(0, execution.total_step_count || routeCellIds.length - 1);
  const secondsPerCell = Math.max(1, Number(cellTravelSeconds) || DEFAULT_CELL_TRAVEL_SECONDS);
  const elapsedStepIndex = Math.floor(Math.max(0, Number(elapsedSeconds) || 0) / secondsPerCell);
  const currentStepIndex = Math.min(elapsedStepIndex, totalStepCount);
  const currentCellId = routeCellIds[currentStepIndex] || execution.current_cell_id || execution.origin_cell_id;
  return applyTravelMetrics({
    record: {
      ...execution,
      current_cell_id: currentCellId,
      current_step_index: currentStepIndex,
      total_step_count: totalStepCount,
      time_elapsed: String(roundDuration((Number(elapsedSeconds) || 0) / 60)),
    },
    routes: [route],
    currentRouteId: execution.route_id,
    currentStepIndex,
  });
}

export function completeRouteExecutionTravel({ execution, task, route, robotaxi, cellTravelSeconds = DEFAULT_CELL_TRAVEL_SECONDS }) {
  const secondsPerCell = Math.max(1, Number(cellTravelSeconds) || DEFAULT_CELL_TRAVEL_SECONDS);
  const projected = projectRouteExecutionTravelProgress({
    execution,
    route,
    elapsedSeconds: Math.max(0, Number(route.route_step_count || route.total_step_count || 0) * secondsPerCell),
    cellTravelSeconds: secondsPerCell,
  });
  const nextExecution = {
    ...execution,
    ...projected,
    execution_status: taskTypes.RouteExecutionStatus.ARRIVED,
    current_cell_id: execution.target_cell_id || projected?.current_cell_id,
    current_step_index: projected?.total_step_count ?? execution.total_step_count,
    distance_traveled_km: projected?.total_distance_km ?? execution.total_distance_km,
    distance_remaining_km: 0,
  };
  return {
    execution: nextExecution,
    task: task ? { ...task, task_status: taskTypes.DeploymentTaskStatus.ARRIVED } : task,
    robotaxi: robotaxi ? {
      ...robotaxi,
      current_cell_id: nextExecution.current_cell_id,
      current_route_id: execution.route_id,
      current_task_id: execution.task_id || task?.task_id,
      motion_status: "STOPPED",
    } : null,
  };
}

export function confirmRouteExecutionArrival({ execution, task, robotaxi }) {
  return {
    execution: {
      ...execution,
      execution_status: taskTypes.RouteExecutionStatus.COMPLETED,
      completed_at: new Date().toISOString(),
      arrival_execution_result: taskTypes.ArrivalExecutionResult.NORMAL_ARRIVAL,
      actual_target_service_area_id: execution.target_service_area_id || execution.current_target_service_area_id,
      actual_target_cell_id: execution.current_cell_id,
    },
    task: {
      ...task,
      task_status: taskTypes.DeploymentTaskStatus.COMPLETED,
      actual_target_service_area_id: task.target_service_area_id || execution.target_service_area_id,
      actual_target_cell_id: execution.current_cell_id,
      arrival_execution_result: taskTypes.ArrivalExecutionResult.NORMAL_ARRIVAL,
      completed_at: new Date().toISOString(),
    },
    robotaxi: robotaxi ? {
      ...robotaxi,
      current_cell_id: execution.current_cell_id,
      current_route_id: null,
      current_task_id: null,
      motion_status: "PARKED",
    } : null,
  };
}

export function createTripRouteUpdate({ trip, nextTrip, data, routeId, routePlanningRunId }) {
  const routeRequest = getTripRouteRequest(trip);
  if (!routeRequest) return null;
  const route = createTripRoute({
    trip,
    data,
    routeId,
    routePlanningRunId,
    ...routeRequest,
  });
  const routePlanningRun = createRoutePlanningRun({
    routePlanningRunId,
    routeStrategyId: route.route_strategy_id,
    planningAlgorithm: route.planning_algorithm,
    taskId: null,
    serviceOrderId: trip.service_order_id,
    tripId: trip.trip_id,
    routeExecutionId: null,
    robotaxiId: trip.robotaxi_id,
    originCellId: route.origin_cell_id,
    targetCellId: route.target_cell_id,
    resultRouteId: route.route_steps.length > 0 ? route.route_id : null,
    planningResult: route.route_steps.length > 0 ? taskTypes.RoutePlanningResult.SUCCESS : taskTypes.RoutePlanningResult.FAILED,
    failureReason: route.route_steps.length > 0 ? taskTypes.RoutePlanningFailureReason.NONE : route.failure_reason,
    routeStepCount: route.route_step_count,
    totalDistanceKm: route.total_distance_km,
    createdAt: new Date().toISOString(),
  });
  if (route.route_steps.length === 0) {
    return {
      routePlanningRun,
      failedTrip: {
        ...trip,
        trip_status: tripTypes.TripStatus.FAILED,
        failure_reason: route.failure_reason,
      },
    };
  }
  const routeHistory = [
    ...(Array.isArray(trip.route_history) ? trip.route_history : []),
    createRouteHistoryEntry(route, routeRequest.routeChangeReason, null),
  ];
  const nextTripWithRoute = {
    ...nextTrip,
    route_id: route.route_id,
    route_planning_run_id: routePlanningRun.route_planning_run_id,
    route_history: routeHistory,
    current_step_index: 0,
    total_step_count: Math.max(0, route.route_steps.length - 1),
  };
  return {
    route,
    routePlanningRun,
    nextTrip: applyTravelMetrics({
      record: nextTripWithRoute,
      routes: [...(data.routes || []), route],
      currentRouteId: route.route_id,
      currentStepIndex: 0,
    }),
  };
}

export function createTripRouteForOperation({
  trip,
  data,
  routeId,
  routePlanningRunId,
  originCellId,
  targetCellId,
  targetServiceAreaId,
  strategyId,
}) {
  return createTripRoute({
    trip,
    data,
    routeId,
    routePlanningRunId,
    originCellId,
    targetCellId,
    targetServiceAreaId,
    strategyId,
  });
}

export function createRoutePlanningRun(options) {
  const planningResult = options.planningResult;
  const resultRouteId = options.resultRouteId || null;
  return taskTypes.createRoutePlanningRun({
    route_planning_run_id: options.routePlanningRunId,
    route_strategy_id: options.routeStrategyId,
    planning_algorithm: options.planningAlgorithm || taskTypes.RoutePlanningAlgorithm.BFS_CELL_GRAPH,
    task_id: options.taskId || null,
    service_order_id: options.serviceOrderId || null,
    trip_id: options.tripId || null,
    route_execution_id: options.routeExecutionId || null,
    robotaxi_id: options.robotaxiId || null,
    origin_cell_id: options.originCellId || null,
    target_cell_id: options.targetCellId || null,
    result_route_id: resultRouteId,
    planning_result: planningResult,
    failure_reason: options.failureReason,
    strategy_snapshot: createRoutePlanningStrategySnapshot(options.routeStrategyId),
    input_snapshot: {
      route_strategy_id: options.routeStrategyId,
      planning_algorithm: options.planningAlgorithm || taskTypes.RoutePlanningAlgorithm.BFS_CELL_GRAPH,
      task_id: options.taskId || null,
      service_order_id: options.serviceOrderId || null,
      trip_id: options.tripId || null,
      route_execution_id: options.routeExecutionId || null,
      robotaxi_id: options.robotaxiId || null,
      origin_cell_id: options.originCellId || null,
      target_cell_id: options.targetCellId || null,
    },
    output_snapshot: {
      planning_result: planningResult,
      result_route_id: resultRouteId,
      route_step_count: options.routeStepCount ?? null,
      total_distance_km: options.totalDistanceKm ?? null,
      failure_reason: options.failureReason,
    },
    created_at: options.createdAt || new Date().toISOString(),
  });
}

export function getDefaultDeploymentTarget(data, options = {}) {
  const originCellId = options.originCellId || null;
  const candidates = getDeploymentTargetCandidates(data, originCellId);
  if (candidates.length === 0) return null;
  return candidates[stableIndex(options.seed || originCellId || candidates.length, candidates.length)];
}

export function getRebalanceDeploymentTarget(data, options = {}) {
  const originCellId = options.originCellId || null;
  const candidates = getDeploymentTargetCandidates(data, originCellId);
  if (candidates.length === 0) return null;
  const serviceAreaVehicleCounts = countAvailableVehiclesByServiceArea(data, options.robotaxiId);
  const scored = candidates.map((candidate) => {
    const vehicleCount = serviceAreaVehicleCounts.get(candidate.target_service_area_id) || 0;
    const distanceSteps = estimateCellDistance(data, originCellId, candidate.target_cell_id);
    const stableTieBreaker = stableIndex(`${options.seed || ""}-${candidate.target_cell_id}`, 1000) / 1000;
    return {
      ...candidate,
      rebalance_score: Number((vehicleCount * 100 + distanceSteps + stableTieBreaker).toFixed(3)),
      rebalance_reason: "LOW_DENSITY_NEARBY_SERVICE_AREA",
      service_area_vehicle_count: vehicleCount,
      estimated_distance_steps: distanceSteps,
    };
  });
  return scored.sort((left, right) => left.rebalance_score - right.rebalance_score)[0];
}

export function getRandomDeploymentTarget(data, options = {}) {
  const originCellId = options.originCellId || null;
  const candidates = getDeploymentTargetCandidates(data, originCellId);
  if (candidates.length === 0) return null;
  const byServiceArea = candidates.reduce((map, candidate) => {
    const list = map.get(candidate.target_service_area_id) || [];
    list.push(candidate);
    map.set(candidate.target_service_area_id, list);
    return map;
  }, new Map());
  const serviceAreaIds = [...byServiceArea.keys()].sort();
  const selectedServiceAreaId = serviceAreaIds[stableIndex(`${options.seed || ""}-service-area`, serviceAreaIds.length)];
  const serviceAreaCandidates = byServiceArea.get(selectedServiceAreaId) || [];
  const selected = serviceAreaCandidates[stableIndex(`${options.seed || ""}-${selectedServiceAreaId}-cell`, serviceAreaCandidates.length)];
  const distanceSteps = estimateCellDistance(data, originCellId, selected?.target_cell_id);
  return selected ? {
    ...selected,
    deployment_target_model: "TEMPORARY_RANDOM_SERVICE_AREA",
    rebalance_reason: "RANDOM_SERVICE_AREA_DISPATCH",
    service_area_vehicle_count: countAvailableVehiclesByServiceArea(data, options.robotaxiId).get(selected.target_service_area_id) || 0,
    estimated_distance_steps: distanceSteps,
  } : null;
}

export function getRouteExecutionCells(route, roadSegments, originCellId, targetCellId) {
  const cells = route.route_steps?.map((step) => step.cell_id) || routeCellIds(route, roadSegments);
  return [...new Set([originCellId, ...cells, targetCellId].filter(Boolean))];
}

export function createRouteHistoryEntry(route, routeChangeReason, arrivalExecutionResult) {
  return createRouteHistoryEntryWithOptions(route, routeChangeReason, arrivalExecutionResult);
}

export function createRouteHistoryEntryWithOptions(route, routeChangeReason, arrivalExecutionResult, options = {}) {
  return {
    route_id: route.route_id,
    route_strategy_id: route.route_strategy_id,
    origin_cell_id: route.start_cell_id,
    target_cell_id: route.end_cell_id,
    started_at: options.createdAt || new Date().toISOString(),
    ended_at: null,
    route_change_reason: routeChangeReason,
    arrival_execution_result: arrivalExecutionResult || null,
    trigger_type: options.triggerType || taskTypes.TriggerType.AUTO,
  };
}

export function withRouteFacts(route) {
  const routeStepCount = getRouteStepCount(route);
  const totalDistanceM = Number(route.total_distance_m ?? routeStepCount * 50);
  return {
    ...route,
    route_step_count: routeStepCount,
    total_step_count: route.total_step_count ?? routeStepCount,
    total_distance_m: totalDistanceM,
    total_distance_km: roundDistance(totalDistanceM / 1000),
  };
}

export function calculateTravelDistanceMetrics(record, routes = []) {
  const routeById = new Map((routes || []).map((route) => [route.route_id, withRouteFacts(route)]));
  const historyRouteIds = Array.from(new Set((record?.route_history || []).map((item) => item.route_id).filter(Boolean)));
  const routeIds = historyRouteIds.length > 0
    ? historyRouteIds
    : [record?.route_id].filter(Boolean);
  const currentRouteId = record?.route_id || routeIds[routeIds.length - 1] || null;
  const currentRouteIndex = Math.max(0, routeIds.lastIndexOf(currentRouteId));
  const totalDistanceKm = routeIds.reduce((sum, routeId) => sum + getRouteDistanceKm(routeById.get(routeId)), 0);
  const completedDistanceKm = routeIds.slice(0, currentRouteIndex).reduce((sum, routeId) => sum + getRouteDistanceKm(routeById.get(routeId)), 0);
  const currentRoute = routeById.get(currentRouteId);
  const currentStepCount = getRouteStepCount(currentRoute);
  const currentStepIndex = Math.min(Math.max(0, Number(record?.current_step_index || 0)), currentStepCount);
  const currentDistanceKm = getRouteDistanceKm(currentRoute);
  const currentTraveledKm = currentStepCount > 0
    ? roundDistance((currentDistanceKm / currentStepCount) * currentStepIndex)
    : 0;
  return {
    total_distance_km: roundDistance(totalDistanceKm),
    distance_traveled_km: roundDistance(completedDistanceKm + currentTraveledKm),
    distance_remaining_km: roundDistance(Math.max(0, currentDistanceKm - currentTraveledKm)),
  };
}

export function applyTravelMetrics({ record, routes = [], currentRouteId = null, currentStepIndex = null }) {
  const nextRecord = {
    ...record,
    route_id: currentRouteId || record.route_id,
    current_step_index: currentStepIndex ?? record.current_step_index ?? 0,
  };
  return {
    ...nextRecord,
    ...calculateTravelDistanceMetrics(nextRecord, routes),
  };
}

export function calculateRouteEstimatedDurationMin(route, options = {}) {
  const cellTravelSeconds = Number(options.cellTravelSeconds || DEFAULT_CELL_TRAVEL_SECONDS);
  const routeStepCount = getRouteStepCount(route);
  const durationSeconds = Math.max(0, routeStepCount) * cellTravelSeconds;
  return Math.max(1, Math.ceil(durationSeconds / 60));
}

function createDeploymentRoute({ task, data, routeId, routePlanningRunId, originCellId, targetCellId, targetServiceAreaId, routeExecutionId, strategyId }) {
  const routePlan = createBfsRoutePlan(data, originCellId, targetCellId);
  const routeSteps = routePlan.route_steps;
  const totalDistance = Math.max(0, routeSteps.length - 1) * (data.maps?.[0]?.cell_size_m || 50);
  return withRouteFacts({
    route_id: routeId,
    route_version: 1,
    route_name: `${task.robotaxi_id} 投放到 ${targetServiceAreaId}`,
    route_usage_type: taskTypes.RouteUsageType.OPERATIONAL_EXECUTION,
    map_id: data.maps?.[0]?.map_id || null,
    start_cell_id: originCellId,
    end_cell_id: targetCellId,
    origin_cell_id: originCellId,
    target_cell_id: targetCellId,
    task_id: task.task_id,
    route_execution_id: routeExecutionId || null,
    route_planning_run_id: routePlanningRunId || null,
    robotaxi_id: task.robotaxi_id,
    route_strategy_id: strategyId,
    planning_algorithm: taskTypes.RoutePlanningAlgorithm.BFS_CELL_GRAPH,
    road_segment_sequence: routePlan.road_segment_sequence,
    route_steps: routeSteps,
    total_step_count: Math.max(0, routeSteps.length - 1),
    related_service_area_ids: targetServiceAreaId ? [targetServiceAreaId] : [],
    total_distance_m: totalDistance,
    route_status: routeSteps.length > 0 ? "Active" : "Failed",
    failure_reason: routeSteps.length > 0 ? null : taskTypes.RoutePlanningFailureReason.NO_CONNECTED_ROAD_SEGMENT,
  });
}

function getRouteStepCount(route) {
  if (!route) return 0;
  if (Number.isFinite(Number(route.route_step_count))) return Math.max(0, Number(route.route_step_count));
  if (Array.isArray(route.route_steps)) return Math.max(0, route.route_steps.length - 1);
  return Math.max(0, Number(route.total_step_count || 0));
}

function getRouteDistanceKm(route) {
  if (!route) return 0;
  if (Number.isFinite(Number(route.total_distance_km))) return Number(route.total_distance_km);
  return Number(route.total_distance_m || 0) / 1000;
}

function createTripRoute({ trip, data, routeId, routePlanningRunId, originCellId, targetCellId, targetServiceAreaId, strategyId }) {
  const routePlan = createBfsRoutePlan(data, originCellId, targetCellId);
  const routeSteps = routePlan.route_steps;
  const totalDistance = Math.max(0, routeSteps.length - 1) * (data.maps?.[0]?.cell_size_m || 50);
  return withRouteFacts({
    route_id: routeId,
    route_version: 1,
    route_name: `${trip.robotaxi_id} 履约行驶 ${originCellId} 到 ${targetCellId}`,
    route_usage_type: getServiceRouteUsageType(strategyId),
    map_id: data.maps?.[0]?.map_id || null,
    start_cell_id: originCellId,
    end_cell_id: targetCellId,
    origin_cell_id: originCellId,
    target_cell_id: targetCellId,
    task_id: null,
    service_order_id: trip.service_order_id,
    trip_id: trip.trip_id,
    route_execution_id: null,
    route_planning_run_id: routePlanningRunId || null,
    robotaxi_id: trip.robotaxi_id,
    route_strategy_id: strategyId,
    planning_algorithm: taskTypes.RoutePlanningAlgorithm.BFS_CELL_GRAPH,
    road_segment_sequence: routePlan.road_segment_sequence,
    route_steps: routeSteps,
    total_step_count: Math.max(0, routeSteps.length - 1),
    related_service_area_ids: targetServiceAreaId ? [targetServiceAreaId] : [],
    total_distance_m: totalDistance,
    route_status: routeSteps.length > 0 ? "Active" : "Failed",
    failure_reason: routeSteps.length > 0 ? null : taskTypes.RoutePlanningFailureReason.NO_CONNECTED_ROAD_SEGMENT,
  });
}

function getTripRouteRequest(trip) {
  if (["WAITING_ROUTE", "PENDING", "ASSIGNED"].includes(trip.trip_status)) {
    return {
      originCellId: trip.current_cell_id,
      targetCellId: trip.pickup_cell_id,
      targetServiceAreaId: trip.pickup_service_area_id,
      strategyId: taskTypes.RoutePlanningStrategy.SERVICE_ORDER_PICKUP,
      routeChangeReason: taskTypes.RouteChangeReason.SERVICE_ORDER_PICKUP_PLANNING,
    };
  }
  if (["CUSTOMER_ONBOARD", "PASSENGER_ONBOARD"].includes(trip.trip_status)) {
    return {
      originCellId: trip.current_cell_id || trip.pickup_cell_id,
      targetCellId: trip.dropoff_cell_id,
      targetServiceAreaId: trip.dropoff_service_area_id,
      strategyId: taskTypes.RoutePlanningStrategy.SERVICE_ORDER_DESTINATION,
      routeChangeReason: taskTypes.RouteChangeReason.SERVICE_ORDER_DESTINATION_PLANNING,
    };
  }
  return null;
}

function getServiceRouteUsageType(strategyId) {
  if (strategyId === taskTypes.RoutePlanningStrategy.SERVICE_ORDER_PICKUP) return taskTypes.RouteUsageType.SERVICE_PICKUP;
  if (strategyId === taskTypes.RoutePlanningStrategy.SERVICE_ORDER_DESTINATION) return taskTypes.RouteUsageType.SERVICE_DROPOFF;
  return taskTypes.RouteUsageType.SERVICE_REPLAN;
}

function createSingleCellRouteSteps(data, cellId) {
  if (!cellId) return [];
  return [{
    step_index: 0,
    cell_id: cellId,
    road_segment_id: findRoadSegmentIdByCell(data, cellId),
    road_node_id: data.roadNodes?.find((node) => node.cell_id === cellId)?.road_node_id || null,
    direction: "UNKNOWN",
    distance_km: 0,
    is_origin_step: true,
    is_target_step: true,
  }];
}

function mergeRouteStepPlans(stepPlans, data) {
  const mergedCellIds = [];
  stepPlans.forEach((steps) => {
    (steps || []).forEach((step) => {
      if (!step?.cell_id) return;
      if (mergedCellIds[mergedCellIds.length - 1] !== step.cell_id) mergedCellIds.push(step.cell_id);
    });
  });
  const cellById = new Map((data.cells || []).map((cell) => [cell.cell_id, cell]));
  return mergedCellIds.map((cellId, index) => {
    const nextCellId = mergedCellIds[index + 1];
    return {
      step_index: index,
      movement_step_index: index === 0 ? null : index,
      cell_id: cellId,
      road_segment_id: findRoadSegmentIdByCell(data, cellId),
      road_node_id: data.roadNodes?.find((node) => node.cell_id === cellId)?.road_node_id || null,
      direction: nextCellId ? inferStepDirection(cellById.get(cellId), cellById.get(nextCellId)) : "UNKNOWN",
      distance_km: index === 0 ? 0 : (data.maps?.[0]?.cell_size_m || 50) / 1000,
      is_origin_step: index === 0,
      is_target_step: index === mergedCellIds.length - 1,
    };
  });
}

function createBfsRoutePlan(data, originCellId, targetCellId) {
  const cellById = new Map((data.cells || []).map((cell) => [cell.cell_id, cell]));
  const roadNodeByCellId = new Map((data.roadNodes || []).map((node) => [node.cell_id, node]));
  const graph = buildRoadCellGraph(data.roadSegments || []);
  const graphCellIds = [...graph.keys()];
  if (!originCellId || !targetCellId || graphCellIds.length === 0) return { road_segment_sequence: [], route_steps: [] };
  const originConnector = connectEndpointToGraph(originCellId, graph, cellById);
  const targetConnector = connectEndpointToGraph(targetCellId, graph, cellById);
  if (!originConnector || !targetConnector) return { road_segment_sequence: [], route_steps: [] };
  const graphPath = findBfsCellPath(graph, originConnector.graphCellId, targetConnector.graphCellId);
  if (graphPath.length === 0) return { road_segment_sequence: [], route_steps: [] };
  const targetConnectorCells = [...targetConnector.connectorCells].reverse().slice(1);
  const routeCellIds = [
    ...originConnector.connectorCells,
    ...graphPath.slice(1),
    ...targetConnectorCells,
  ].filter((cellId, index, list) => cellId && (index === 0 || cellId !== list[index - 1]));
  const routeSteps = routeCellIds.map((cellId, index) => {
    const nextCellId = routeCellIds[index + 1];
    const edge = nextCellId ? graph.get(cellId)?.find((item) => item.to === nextCellId) : null;
    const previousEdge = index > 0 ? graph.get(routeCellIds[index - 1])?.find((item) => item.to === cellId) : null;
    const roadNode = roadNodeByCellId.get(cellId);
    return {
      step_index: index,
      cell_id: cellId,
      road_segment_id: edge?.road_segment_id || previousEdge?.road_segment_id || null,
      road_node_id: roadNode?.road_node_id || null,
      direction: nextCellId ? inferStepDirection(cellById.get(cellId), cellById.get(nextCellId)) : "UNKNOWN",
      distance_km: index === 0 ? 0 : (data.maps?.[0]?.cell_size_m || 50) / 1000,
      is_origin_step: index === 0,
      is_target_step: index === routeCellIds.length - 1,
    };
  });
  return {
    road_segment_sequence: routeSteps
      .map((step) => step.road_segment_id)
      .filter((segmentId, index, list) => segmentId && list.indexOf(segmentId) === index),
    route_steps: routeSteps,
  };
}

function buildRoadCellGraph(roadSegments) {
  const graph = new Map();
  roadSegments
    .filter((segment) => segment.segment_status !== "BLOCKED" && segment.segment_status !== "CLOSED" && segment.allowed_direction !== "CLOSED")
    .forEach((segment) => {
      const cellSequence = segment.cell_sequence || segment.cell_ids || [];
      cellSequence.forEach((cellId) => ensureGraphNode(graph, cellId));
      for (let index = 0; index < cellSequence.length - 1; index += 1) {
        const from = cellSequence[index];
        const to = cellSequence[index + 1];
        if (segment.allowed_direction === "FORWARD" || segment.allowed_direction === "BIDIRECTIONAL") addGraphEdge(graph, from, to, segment.road_segment_id);
        if (segment.allowed_direction === "BACKWARD" || segment.allowed_direction === "BIDIRECTIONAL") addGraphEdge(graph, to, from, segment.road_segment_id);
      }
    });
  return graph;
}

function ensureGraphNode(graph, cellId) {
  if (!graph.has(cellId)) graph.set(cellId, []);
}

function addGraphEdge(graph, from, to, roadSegmentId) {
  ensureGraphNode(graph, from);
  ensureGraphNode(graph, to);
  if (graph.get(from).some((edge) => edge.to === to && edge.road_segment_id === roadSegmentId)) return;
  graph.get(from).push({ to, road_segment_id: roadSegmentId });
}

function connectEndpointToGraph(endpointCellId, graph, cellById) {
  if (graph.has(endpointCellId)) return { graphCellId: endpointCellId, connectorCells: [endpointCellId] };
  const endpointCell = cellById.get(endpointCellId);
  if (!endpointCell) return null;
  const nearestGraphCellId = [...graph.keys()]
    .map((cellId) => ({ cellId, distance: manhattanDistance(endpointCell, cellById.get(cellId)) }))
    .sort((a, b) => a.distance - b.distance)[0]?.cellId;
  if (!nearestGraphCellId) return null;
  return {
    graphCellId: nearestGraphCellId,
    connectorCells: createManhattanConnector(endpointCell, cellById.get(nearestGraphCellId)),
  };
}

function createManhattanConnector(startCell, endCell) {
  const cells = [];
  let row = startCell.row;
  let col = startCell.col;
  cells.push(cellIdFromCoord(row, col));
  while (row !== endCell.row) {
    row += row < endCell.row ? 1 : -1;
    cells.push(cellIdFromCoord(row, col));
  }
  while (col !== endCell.col) {
    col += col < endCell.col ? 1 : -1;
    cells.push(cellIdFromCoord(row, col));
  }
  return cells;
}

function findBfsCellPath(graph, originCellId, targetCellId) {
  const queue = [originCellId];
  const previous = new Map([[originCellId, null]]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === targetCellId) break;
    (graph.get(current) || []).forEach((edge) => {
      if (previous.has(edge.to)) return;
      previous.set(edge.to, current);
      queue.push(edge.to);
    });
  }
  if (!previous.has(targetCellId)) return [];
  const path = [];
  let current = targetCellId;
  while (current) {
    path.unshift(current);
    current = previous.get(current);
  }
  return path;
}

function routeCellIds(route, roadSegments = []) {
  if (Array.isArray(route.route_steps)) return route.route_steps.map((step) => step.cell_id).filter(Boolean);
  return (route.road_segment_sequence || [])
    .flatMap((segmentId) => (roadSegments.find((segment) => segment.road_segment_id === segmentId)?.cell_sequence || []));
}

function findRoadSegmentIdByCell(data, cellId) {
  return (data.roadSegments || []).find((segment) => (segment.cell_sequence || segment.cell_ids || []).includes(cellId))?.road_segment_id || null;
}

function getCandidateServiceAreaCellIds(serviceArea) {
  if (!serviceArea) return [];
  return [
    ...(serviceArea.standby_cell_ids || []),
    ...(serviceArea.parking_cell_ids || []),
    ...(serviceArea.temp_stop_cell_ids || []),
    ...(serviceArea.pickup_cell_ids || []),
    ...(serviceArea.dropoff_cell_ids || []),
    ...(serviceArea.cell_ids || serviceArea.covered_cell_ids || []),
  ].filter((cellId, index, list) => cellId && list.indexOf(cellId) === index);
}

function getDeploymentTargetCandidates(data, originCellId) {
  const zones = data.zones || [];
  return (data.serviceAreas || []).flatMap((serviceArea) => {
    const capabilities = serviceArea.vehicle_capabilities || {};
    if (!capabilities.can_stage && !capabilities.can_short_wait && !capabilities.can_park) return [];
    const targetZoneId = zones.find((zone) => zone.service_area_ids?.includes(serviceArea.service_area_id))?.zone_id || null;
    return getCandidateServiceAreaCellIds(serviceArea)
      .filter((cellId) => cellId && cellId !== originCellId)
      .map((cellId) => ({
        target_cell_id: cellId,
        target_service_area_id: serviceArea.service_area_id,
        target_zone_id: targetZoneId,
      }));
  });
}

function countAvailableVehiclesByServiceArea(data, excludedRobotaxiId = null) {
  const counts = new Map();
  const serviceAreas = data.serviceAreas || [];
  for (const robotaxi of data.robotaxis || []) {
    if (robotaxi.robotaxi_id === excludedRobotaxiId) continue;
    if (robotaxi.current_order_id || robotaxi.current_task_id) continue;
    if (hasFleetOperationBlocker(robotaxi)) continue;
    const serviceArea = serviceAreas.find((item) =>
      getCandidateServiceAreaCellIds(item).includes(robotaxi.current_cell_id)
    );
    if (!serviceArea) continue;
    counts.set(serviceArea.service_area_id, (counts.get(serviceArea.service_area_id) || 0) + 1);
  }
  return counts;
}

function hasFleetOperationBlocker(robotaxi) {
  return robotaxi?.fleet_operation_status && robotaxi.fleet_operation_status !== "NONE"
    || robotaxi?.pending_fleet_task_id
    || robotaxi?.needs_cleaning === true
    || robotaxi?.needs_charging === true
    || robotaxi?.needs_maintenance === true
    || robotaxi?.cleanliness_status === "NEEDS_CLEANING"
    || ["LOW", "CRITICAL"].includes(robotaxi?.battery_operation_status)
    || ["DUE", "IN_MAINTENANCE"].includes(robotaxi?.maintenance_status)
    || ["ALERTED", "REMOTE_HANDLING", "BROKEN"].includes(robotaxi?.failure_status);
}

function estimateCellDistance(data, originCellId, targetCellId) {
  if (!originCellId || !targetCellId) return 9999;
  const plan = createBfsRoutePlan(data, originCellId, targetCellId);
  if (!plan.route_steps?.length) return 9999;
  return Math.max(0, plan.route_steps.length - 1);
}

function stableIndex(seed, length) {
  if (length <= 0) return 0;
  const text = String(seed || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % length;
}

function addElapsedMinutes(current, minutes) {
  return String(roundDuration(parseElapsedMinutes(current) + (minutes || 0)));
}

function parseElapsedMinutes(value) {
  if (Number.isFinite(Number(value))) return Number(value);
  const parts = String(value || "0").split(":").map((part) => Number.parseInt(part, 10) || 0);
  if (parts.length >= 3) return parts[0] * 60 + parts[1] + Math.ceil(parts[2] / 60);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function roundDuration(value) {
  return Number(Number(value || 0).toFixed(2));
}

function manhattanDistance(cellA, cellB) {
  if (!cellA || !cellB) return Number.POSITIVE_INFINITY;
  return Math.abs(cellA.row - cellB.row) + Math.abs(cellA.col - cellB.col);
}

function inferStepDirection(cellA, cellB) {
  if (!cellA || !cellB) return "UNKNOWN";
  if (cellA.row > cellB.row) return "NORTH";
  if (cellA.row < cellB.row) return "SOUTH";
  if (cellA.col > cellB.col) return "WEST";
  if (cellA.col < cellB.col) return "EAST";
  return "UNKNOWN";
}

function cellIdFromCoord(row, col) {
  return `C-${String(row).padStart(2, "0")}-${String(col).padStart(2, "0")}`;
}

function roundDistance(value) {
  return Number(Number(value || 0).toFixed(2));
}
