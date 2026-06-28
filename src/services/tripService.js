/**
 * Trip 服务层
 *
 * 从 main.jsx UI handler 中提取的业务逻辑，供 UI 和 Simulation System 两条路径复用。
 *
 * 提取原则：
 * - 不改业务逻辑，只改调用方式
 * - 入参为纯数据对象，不依赖 React state 闭包
 * - 返回结构化结果，由调用方决定如何写入 state
 */

import * as tripTypes from "../domain/tripTypes.js";
import { DEFAULT_CELL_TRAVEL_SECONDS, calculateTravelDistanceMetrics } from "./routePlanningService.js";

// ============================================================================
// 1. 行驶步数推进（Movement）
// ============================================================================

/**
 * 计算 Trip 行驶一步后的状态（用于 ON_THE_WAY_PICKUP / ON_THE_WAY_DESTINATION）
 *
 * @param {Object} trip - 当前 Trip 对象
 * @param {Object} data - 全局数据（含 routes）
 * @returns {Object|null} 更新后的 Trip 对象，或 null
 */
export function getNextTripMovementState(trip, data) {
  const route = data.routes?.find((item) => item.route_id === trip.route_id);
  if (!route || !Array.isArray(route.route_steps) || route.route_steps.length === 0) return null;

  const totalStepCount = getMovementStepCount(route);
  const currentStepIndex = Math.max(0, Number(trip.current_step_index || 0));
  const nextStepIndex = Math.min(currentStepIndex + 1, totalStepCount);
  const nextStep = route.route_steps[nextStepIndex] || route.route_steps[route.route_steps.length - 1];
  const reachedTarget = nextStepIndex >= totalStepCount;
  const distanceMetrics = calculateTravelDistanceMetrics(
    { ...trip, current_step_index: nextStepIndex },
    data.routes || [],
  );

  const nextStatus = reachedTarget
    ? (trip.trip_status === tripTypes.TripStatus.ON_THE_WAY_PICKUP
      ? tripTypes.TripStatus.WAITING_CUSTOMER_BOARDING
      : tripTypes.TripStatus.ARRIVED_DESTINATION)
    : trip.trip_status;
  const nextPhase = trip.trip_status === tripTypes.TripStatus.ON_THE_WAY_PICKUP
    ? tripTypes.TripPhase.PICKUP
    : tripTypes.TripPhase.DESTINATION;

  return {
    ...trip,
    trip_status: nextStatus,
    trip_phase: reachedTarget && nextStatus === tripTypes.TripStatus.ARRIVED_DESTINATION
      ? tripTypes.TripPhase.DESTINATION : nextPhase,
    current_cell_id: nextStep?.cell_id || trip.current_cell_id,
    current_step_index: nextStepIndex,
    total_step_count: totalStepCount,
    total_distance_km: distanceMetrics.total_distance_km,
    distance_traveled_km: distanceMetrics.distance_traveled_km,
    distance_remaining_km: distanceMetrics.distance_remaining_km,
    time_elapsed: addElapsedMinutes(trip.time_elapsed, DEFAULT_CELL_TRAVEL_SECONDS / 60),
    arrival_execution_result: reachedTarget && nextStatus === tripTypes.TripStatus.ARRIVED_DESTINATION
      ? "NORMAL_ARRIVAL" : trip.arrival_execution_result,
    event_log: [
      ...(Array.isArray(trip.event_log) ? trip.event_log : []),
      {
        event_time: _now(),
        previous_status: trip.trip_status,
        next_status: nextStatus,
        event_type: reachedTarget ? "ROUTE_TARGET_REACHED" : "ROUTE_STEP_ADVANCED",
        event_result: "SUCCESS",
        route_id: route.route_id,
        cell_id: nextStep?.cell_id || null,
      },
    ],
  };
}

export function projectTripTravelProgress(trip, data, elapsedSeconds = 0) {
  const route = data.routes?.find((item) => item.route_id === trip.route_id);
  if (!route || !Array.isArray(route.route_steps) || route.route_steps.length === 0) return null;
  const totalStepCount = getMovementStepCount(route);
  const elapsedStepIndex = Math.floor(Math.max(0, Number(elapsedSeconds) || 0) / DEFAULT_CELL_TRAVEL_SECONDS);
  const currentStepIndex = Math.min(elapsedStepIndex, totalStepCount);
  const currentStep = route.route_steps[currentStepIndex] || route.route_steps[route.route_steps.length - 1];
  const distanceMetrics = calculateTravelDistanceMetrics(
    { ...trip, current_step_index: currentStepIndex },
    data.routes || [],
  );
  return {
    ...trip,
    current_cell_id: currentStep?.cell_id || trip.current_cell_id,
    current_step_index: currentStepIndex,
    total_step_count: totalStepCount,
    total_distance_km: distanceMetrics.total_distance_km,
    distance_traveled_km: distanceMetrics.distance_traveled_km,
    distance_remaining_km: distanceMetrics.distance_remaining_km,
    time_elapsed: String(roundDuration((Number(elapsedSeconds) || 0) / 60)),
  };
}

export function completeTripTravel(trip, data) {
  const route = data.routes?.find((item) => item.route_id === trip.route_id);
  if (!route) return null;
  const totalStepCount = getMovementStepCount(route);
  const projected = projectTripTravelProgress(trip, data, totalStepCount * DEFAULT_CELL_TRAVEL_SECONDS);
  if (!projected) return null;
  const nextStatus = trip.trip_status === tripTypes.TripStatus.ON_THE_WAY_PICKUP
    ? tripTypes.TripStatus.WAITING_CUSTOMER_BOARDING
    : tripTypes.TripStatus.ARRIVED_DESTINATION;
  return {
    ...projected,
    trip_status: nextStatus,
    trip_phase: nextStatus === tripTypes.TripStatus.ARRIVED_DESTINATION
      ? tripTypes.TripPhase.DESTINATION
      : tripTypes.TripPhase.PICKUP,
    current_cell_id: nextStatus === tripTypes.TripStatus.ARRIVED_DESTINATION
      ? trip.dropoff_cell_id
      : trip.pickup_cell_id,
    current_step_index: totalStepCount,
    distance_traveled_km: projected.total_distance_km,
    distance_remaining_km: 0,
    arrival_execution_result: nextStatus === tripTypes.TripStatus.ARRIVED_DESTINATION
      ? "NORMAL_ARRIVAL"
      : trip.arrival_execution_result,
    event_log: [
      ...(Array.isArray(trip.event_log) ? trip.event_log : []),
      {
        event_time: _now(),
        previous_status: trip.trip_status,
        next_status: nextStatus,
        event_type: "TRAVEL_TIME_COMPLETED",
        event_result: "SUCCESS",
        route_id: route.route_id,
      },
    ],
  };
}

// ============================================================================
// 2. 状态跳转（State Transition）
// ============================================================================

/**
 * 计算 Trip 状态跳转后的状态（到达上车点、乘客上车、出发等）
 *
 * @param {Object} trip - 当前 Trip 对象
 * @returns {Object|null} 更新后的 Trip 对象，或 null
 */
export function getNextTripState(trip) {
  const status = tripTypes.TripStatus;
  const phase = tripTypes.TripPhase;
  const timestamp = _now();
  const baseEvent = {
    event_time: timestamp,
    previous_status: trip.trip_status,
  };
  const eventLog = Array.isArray(trip.event_log) ? trip.event_log : [];

  if ([status.COMPLETED, status.FAILED, status.CANCELLED].includes(trip.trip_status)) return null;

  const transitions = {
    [status.WAITING_ROUTE]: {
      trip_status: status.ON_THE_WAY_PICKUP,
      trip_phase: phase.PICKUP,
      current_cell_id: trip.current_cell_id,
      started_at: trip.started_at || timestamp,
      time_elapsed: addElapsedMinutes(trip.time_elapsed, 2),
    },
    [status.PENDING]: {
      trip_status: status.ON_THE_WAY_PICKUP,
      trip_phase: phase.PICKUP,
      current_cell_id: trip.current_cell_id,
      started_at: trip.started_at || timestamp,
      time_elapsed: addElapsedMinutes(trip.time_elapsed, 2),
    },
    [status.ASSIGNED]: {
      trip_status: status.ON_THE_WAY_PICKUP,
      trip_phase: phase.PICKUP,
      current_cell_id: trip.current_cell_id,
      started_at: trip.started_at || timestamp,
      time_elapsed: addElapsedMinutes(trip.time_elapsed, 2),
    },
    [status.ON_THE_WAY_PICKUP]: {
      trip_status: status.WAITING_CUSTOMER_BOARDING,
      trip_phase: phase.PICKUP,
      current_cell_id: trip.pickup_cell_id,
      current_step_index: Math.max(trip.current_step_index || 0, 1),
      total_step_count: Math.max(trip.total_step_count || 0, 4),
      distance_traveled_km: roundDistance((trip.distance_traveled_km || 0) + 0.6),
      distance_remaining_km: roundDistance(Math.max(0, trip.distance_remaining_km || 0)),
      time_elapsed: addElapsedMinutes(trip.time_elapsed, 3),
    },
    [status.ARRIVED_PICKUP]: {
      trip_status: status.CUSTOMER_ONBOARD,
      trip_phase: phase.PICKUP,
      current_cell_id: trip.pickup_cell_id,
      time_elapsed: addElapsedMinutes(trip.time_elapsed, 1),
    },
    [status.WAITING_CUSTOMER_BOARDING]: {
      trip_status: status.CUSTOMER_ONBOARD,
      trip_phase: phase.PICKUP,
      current_cell_id: trip.pickup_cell_id,
      time_elapsed: addElapsedMinutes(trip.time_elapsed, 1),
    },
    [status.CUSTOMER_ONBOARD]: {
      trip_status: status.ON_THE_WAY_DESTINATION,
      trip_phase: phase.DESTINATION,
      current_cell_id: trip.pickup_cell_id,
      time_elapsed: addElapsedMinutes(trip.time_elapsed, 1),
    },
    [status.PASSENGER_ONBOARD]: {
      trip_status: status.ON_THE_WAY_DESTINATION,
      trip_phase: phase.DESTINATION,
      current_cell_id: trip.pickup_cell_id,
      time_elapsed: addElapsedMinutes(trip.time_elapsed, 1),
    },
    [status.ON_THE_WAY_DESTINATION]: {
      trip_status: status.ARRIVED_DESTINATION,
      trip_phase: phase.DESTINATION,
      current_cell_id: trip.dropoff_cell_id,
      current_step_index: Math.max(trip.total_step_count || 4, 4),
      total_step_count: Math.max(trip.total_step_count || 0, 4),
      time_elapsed: addElapsedMinutes(trip.time_elapsed, 1),
      arrival_execution_result: "NORMAL_ARRIVAL",
    },
    [status.ARRIVED_DESTINATION]: {
      trip_status: status.COMPLETED,
      trip_phase: phase.COMPLETED,
      current_cell_id: trip.dropoff_cell_id,
      completed_at: timestamp,
      time_elapsed: addElapsedMinutes(trip.time_elapsed, 1),
    },
    [status.WAITING_OPERATION_DECISION]: {
      trip_status: status.FAILED,
      trip_phase: phase.DESTINATION,
      current_cell_id: trip.current_cell_id,
      time_elapsed: addElapsedMinutes(trip.time_elapsed, 1),
    },
  };

  const transition = transitions[trip.trip_status];
  if (!transition) return null;

  return {
    ...trip,
    ...transition,
    event_log: [
      ...eventLog,
      {
        ...baseEvent,
        next_status: transition.trip_status,
        event_type: "TRIP_STATE_CHANGED",
        event_result: "SUCCESS",
      },
    ],
  };
}

// ============================================================================
// 3. 辅助函数
// ============================================================================

function getMovementStepCount(route) {
  const segment = route.route_segments?.find(
    (item) => item.segment_type === "PICKUP_TO_DROPOFF"
  );
  if (segment && segment.step_count > 0) return segment.step_count;
  if (Array.isArray(route.route_steps)) return Math.max(0, route.route_steps.length - 1);
  return 0;
}

function roundDistance(value) {
  return Math.round((value || 0) * 100) / 100;
}

function addElapsedMinutes(current, minutes) {
  const total = parseElapsedMinutes(current) + (minutes || 0);
  return String(roundDuration(total));
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

function _now() {
  return new Date().toISOString();
}
