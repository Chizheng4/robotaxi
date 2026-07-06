import { AvailabilityStatus } from "../domain/operationsCenterTypes.js";
import { TaskType } from "../domain/taskTypes.js";

export const DEFAULT_ENERGY_CONSUMPTION_KWH_PER_KM = 0.16;

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
  batteryDeltaPercent = null,
  batteryDeltaKwh = null,
  energyConsumptionKwhPerKm = DEFAULT_ENERGY_CONSUMPTION_KWH_PER_KM,
  currentCellId = null,
  routeId = null,
  taskId = null,
  motionStatus = null,
  now = null,
} = {}) {
  if (!robotaxi) return null;
  const normalizedDistanceDeltaKm = Math.max(0, Number(distanceDeltaKm) || 0);
  const normalizedBatteryDeltaKwh = batteryDeltaKwh !== null && batteryDeltaKwh !== undefined
    ? Math.max(0, Number(batteryDeltaKwh) || 0)
    : calculateBatteryConsumedKwh({ distanceKm: normalizedDistanceDeltaKm, energyConsumptionKwhPerKm });
  const normalizedBatteryDeltaPercent = batteryDeltaPercent !== null && batteryDeltaPercent !== undefined
    ? Math.max(0, Number(batteryDeltaPercent) || 0)
    : calculateBatteryPercentFromKwh(robotaxi, normalizedBatteryDeltaKwh);
  const currentBatteryKwh = getCurrentBatteryKwh(robotaxi);
  const nextDistance = round2(Number(robotaxi.lifetime_distance_km || 0) + normalizedDistanceDeltaKm);
  const nextConsumedKwh = round2(Number(robotaxi.lifetime_battery_consumed_kwh || 0) + normalizedBatteryDeltaKwh);
  const nextConsumedPercent = round2(Number(robotaxi.lifetime_battery_consumed_percent || 0) + normalizedBatteryDeltaPercent);
  const nextBatteryKwh = round2(Math.max(0, currentBatteryKwh - normalizedBatteryDeltaKwh));
  const nextBattery = robotaxi.battery_capacity_kwh
    ? round2(Math.max(0, Math.min(100, nextBatteryKwh / Number(robotaxi.battery_capacity_kwh || 1) * 100)))
    : round2(Math.max(0, Number(robotaxi.battery_percent || 0) - normalizedBatteryDeltaPercent));
  const nextRange = getEstimatedRangeFromBattery(robotaxi, nextBattery);
  return {
    ...robotaxi,
    current_cell_id: currentCellId || robotaxi.current_cell_id,
    current_route_id: routeId ?? robotaxi.current_route_id,
    current_task_id: taskId ?? robotaxi.current_task_id,
    motion_status: motionStatus || robotaxi.motion_status,
    battery_percent: nextBattery,
    current_battery_kwh: nextBatteryKwh,
    estimated_range_km: nextRange,
    lifetime_distance_km: nextDistance,
    lifetime_battery_consumed_kwh: nextConsumedKwh,
    lifetime_battery_consumed_percent: nextConsumedPercent,
    updated_at: now || robotaxi.updated_at,
  };
}

export function applyChargingDelta(robotaxi, {
  chargedEnergyKwh = 0,
  targetBatteryKwh = null,
  targetBatteryPercent = 100,
  now = null,
} = {}) {
  if (!robotaxi) return null;
  const capacity = Number(robotaxi.battery_capacity_kwh || 0);
  const nextBatteryKwh = targetBatteryKwh !== null && targetBatteryKwh !== undefined
    ? round2(Math.max(0, Number(targetBatteryKwh) || 0))
    : getBatteryKwhFromPercent(robotaxi, targetBatteryPercent);
  const nextBatteryPercent = capacity > 0
    ? round2(Math.max(0, Math.min(100, nextBatteryKwh / capacity * 100)))
    : round2(Math.max(0, Number(targetBatteryPercent) || 0));
  return {
    ...robotaxi,
    battery_percent: nextBatteryPercent,
    current_battery_kwh: nextBatteryKwh,
    estimated_range_km: getEstimatedRangeFromBattery(robotaxi, nextBatteryPercent),
    lifetime_charged_energy_kwh: round2(Number(robotaxi.lifetime_charged_energy_kwh || 0) + Math.max(0, Number(chargedEnergyKwh) || 0)),
    updated_at: now || robotaxi.updated_at,
  };
}

export function getCurrentBatteryKwh(robotaxi) {
  const explicit = Number(robotaxi?.current_battery_kwh);
  if (Number.isFinite(explicit) && explicit >= 0) return round2(explicit);
  const capacity = Number(robotaxi?.battery_capacity_kwh);
  const percent = Number(robotaxi?.battery_percent);
  if (!Number.isFinite(capacity) || !Number.isFinite(percent)) return 0;
  return round2(capacity * percent / 100);
}

export function getBatteryPercentFromKwh(robotaxi, batteryKwh) {
  return calculateBatteryPercentFromKwh(robotaxi, batteryKwh);
}

export function getBatteryKwhFromPercent(robotaxi, percent) {
  const capacity = Number(robotaxi?.battery_capacity_kwh);
  if (!Number.isFinite(capacity) || capacity <= 0) return 0;
  return round2(capacity * Math.max(0, Number(percent) || 0) / 100);
}

export function calculateBatteryConsumedKwh({
  distanceKm = 0,
  energyConsumptionKwhPerKm = DEFAULT_ENERGY_CONSUMPTION_KWH_PER_KM,
} = {}) {
  return round2(Math.max(0, Number(distanceKm) || 0) * Math.max(0, Number(energyConsumptionKwhPerKm) || 0));
}

export function getEstimatedRangeFromBattery(robotaxi, batteryPercent = robotaxi?.battery_percent) {
  const maxRange = Number(robotaxi?.max_range_km);
  if (!Number.isFinite(maxRange) || maxRange <= 0) return round2(robotaxi?.estimated_range_km || 0);
  return round2(maxRange * Math.max(0, Number(batteryPercent) || 0) / 100);
}

function calculateBatteryPercentFromKwh(robotaxi, batteryKwh) {
  const capacity = Number(robotaxi?.battery_capacity_kwh);
  if (!Number.isFinite(capacity) || capacity <= 0) return 0;
  return round2(Math.max(0, Number(batteryKwh) || 0) / capacity * 100);
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
  const distanceDeltaKm = round2(Math.max(0, Number(nextRecord.distance_traveled_km || 0) - Number(previousRecord.distance_traveled_km || 0)));
  const batteryDeltaKwh = round2(Math.max(0, Number(nextRecord.battery_consumed_kwh || 0) - Number(previousRecord.battery_consumed_kwh || 0)));
  return {
    distanceDeltaKm,
    batteryDeltaKwh,
    batteryDeltaPercent: round2(Math.max(0, Number(nextRecord.battery_consumed_percent || 0) - Number(previousRecord.battery_consumed_percent || 0))),
  };
}

function round2(value) {
  return Number((Number(value) || 0).toFixed(2));
}
