import { AvailabilityStatus } from "../domain/operationsCenterTypes.js";
import { TaskType } from "../domain/taskTypes.js";

export const CANONICAL_AVAILABILITY_STATUSES = new Set([
  AvailabilityStatus.PENDING_ADMISSION,
  AvailabilityStatus.AVAILABLE,
  AvailabilityStatus.IN_FLEET_OPERATION,
  AvailabilityStatus.RETIRED,
]);

const LEGACY_PENDING_ADMISSION_STATUSES = new Set([
  AvailabilityStatus.PENDING_ADMISSION,
  AvailabilityStatus.PENDING_INSPECTION,
  AvailabilityStatus.IN_INSPECTION,
]);

export function isPendingAdmissionStatus(status) {
  return LEGACY_PENDING_ADMISSION_STATUSES.has(status);
}

export function isAvailableStatus(status) {
  return status === AvailabilityStatus.AVAILABLE;
}

export function isInFleetOperationStatus(status) {
  return status === AvailabilityStatus.IN_FLEET_OPERATION || status === AvailabilityStatus.UNAVAILABLE;
}

export function isRetiredStatus(status) {
  return status === AvailabilityStatus.RETIRED;
}

export function normalizeAvailabilityStatus(status) {
  if (status === AvailabilityStatus.PENDING_INSPECTION || status === AvailabilityStatus.IN_INSPECTION) {
    return AvailabilityStatus.PENDING_ADMISSION;
  }
  if (status === AvailabilityStatus.UNAVAILABLE) {
    return AvailabilityStatus.IN_FLEET_OPERATION;
  }
  return CANONICAL_AVAILABILITY_STATUSES.has(status) ? status : status || AvailabilityStatus.PENDING_ADMISSION;
}

export function canAcceptExternalAssignment(robotaxi) {
  return isAvailableStatus(robotaxi?.availability_status)
    && robotaxi?.available_for_dispatch !== false
    && !robotaxi?.current_order_id
    && !robotaxi?.current_task_id
    && !isRetiredStatus(robotaxi?.availability_status);
}

export function canTriggerFleetOperation(robotaxi) {
  return isAvailableStatus(robotaxi?.availability_status) || isInFleetOperationStatus(robotaxi?.availability_status);
}

export function markPendingAdmission(robotaxi, { reason = "READINESS_REQUIRED", now = null } = {}) {
  return {
    ...robotaxi,
    availability_status: AvailabilityStatus.PENDING_ADMISSION,
    available_for_dispatch: false,
    operation_blocking_reason: reason,
    updated_at: now || robotaxi?.updated_at,
  };
}

export function markAvailable(robotaxi, { now = null } = {}) {
  return {
    ...robotaxi,
    availability_status: AvailabilityStatus.AVAILABLE,
    available_for_dispatch: true,
    operation_blocking_reason: null,
    unavailable_reason: null,
    updated_at: now || robotaxi?.updated_at,
  };
}

export function markInFleetOperation(robotaxi, { task = null, taskType = null, now = null } = {}) {
  const nextTaskType = taskType || task?.task_type || null;
  return {
    ...robotaxi,
    availability_status: AvailabilityStatus.IN_FLEET_OPERATION,
    available_for_dispatch: false,
    operation_blocking_reason: nextTaskType || "FLEET_OPERATION",
    updated_at: now || robotaxi?.updated_at,
  };
}

export function markRetired(robotaxi, { now = null } = {}) {
  return {
    ...robotaxi,
    availability_status: AvailabilityStatus.RETIRED,
    available_for_dispatch: false,
    operation_blocking_reason: "RETIREMENT",
    retirement_status: "RETIRED",
    updated_at: now || robotaxi?.updated_at,
  };
}

export function applyTravelDelta(robotaxi, {
  distanceDeltaKm = 0,
  batteryDeltaPercent = 0,
  currentCellId = null,
  routeId = null,
  taskId = null,
  motionStatus = null,
  now = null,
} = {}) {
  if (!robotaxi) return null;
  const nextDistance = round2(Number(robotaxi.lifetime_distance_km || 0) + Math.max(0, Number(distanceDeltaKm) || 0));
  const nextConsumed = round2(Number(robotaxi.lifetime_battery_consumed_percent || 0) + Math.max(0, Number(batteryDeltaPercent) || 0));
  const nextBattery = round2(Math.max(0, Number(robotaxi.battery_percent || 0) - Math.max(0, Number(batteryDeltaPercent) || 0)));
  const nextRange = round2(Math.max(0, Number(robotaxi.estimated_range_km || 0) - Math.max(0, Number(distanceDeltaKm) || 0)));
  return {
    ...robotaxi,
    current_cell_id: currentCellId || robotaxi.current_cell_id,
    current_route_id: routeId ?? robotaxi.current_route_id,
    current_task_id: taskId ?? robotaxi.current_task_id,
    motion_status: motionStatus || robotaxi.motion_status,
    battery_percent: nextBattery,
    estimated_range_km: nextRange,
    lifetime_distance_km: nextDistance,
    lifetime_battery_consumed_percent: nextConsumed,
    updated_at: now || robotaxi.updated_at,
  };
}

export function incrementCompletedCounter(robotaxi, counterKey, { now = null } = {}) {
  if (!robotaxi || !counterKey) return robotaxi;
  return {
    ...robotaxi,
    [counterKey]: Number(robotaxi[counterKey] || 0) + 1,
    updated_at: now || robotaxi.updated_at,
  };
}

export function getCompletedCounterKeyForFleetTask(taskType) {
  if (taskType === TaskType.CLEANING) return "completed_cleaning_count";
  if (taskType === TaskType.CHARGING) return "completed_charging_count";
  if (taskType === TaskType.MAINTENANCE) return "completed_maintenance_count";
  return null;
}

export function getTravelDeltaFromRecords(previousRecord = {}, nextRecord = {}) {
  return {
    distanceDeltaKm: round2(Math.max(0, Number(nextRecord.distance_traveled_km || 0) - Number(previousRecord.distance_traveled_km || 0))),
    batteryDeltaPercent: round2(Math.max(0, Number(nextRecord.battery_consumed_percent || 0) - Number(previousRecord.battery_consumed_percent || 0))),
  };
}

function round2(value) {
  return Number((Number(value) || 0).toFixed(2));
}
