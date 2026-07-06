export const OpsCenterStatus = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  RESTRICTED: "Restricted",
  CLOSED: "Closed",
};

export const AutomationLevel = {
  L4: "L4",
  L5: "L5",
};

export const ServiceType = {
  PASSENGER_RIDE: "PASSENGER_RIDE",
};

export const AvailabilityStatus = {
  PENDING_ADMISSION: "PENDING_ADMISSION",
  IN_FLEET_OPERATION: "IN_FLEET_OPERATION",
  RETIRED: "RETIRED",
  // Legacy compatibility values. New business logic should use the four
  // canonical statuses above plus AVAILABLE.
  PENDING_INSPECTION: "PENDING_INSPECTION",
  IN_INSPECTION: "IN_INSPECTION",
  AVAILABLE: "AVAILABLE",
  UNAVAILABLE: "UNAVAILABLE",
};

export const MotionStatus = {
  PARKED: "PARKED",
  STOPPED: "STOPPED",
  MOVING: "MOVING",
};

export const WorkerRole = {
  INSPECTION_OPERATOR: "INSPECTION_OPERATOR",
  CLEANING_OPERATOR: "CLEANING_OPERATOR",
  CHARGING_OPERATOR: "CHARGING_OPERATOR",
  MAINTENANCE_OPERATOR: "MAINTENANCE_OPERATOR",
};

export const WorkerStatus = {
  IDLE: "IDLE",
  BUSY: "BUSY",
  OFF_DUTY: "OFF_DUTY",
};

export function createOpsCenter(opsCenter) {
  return opsCenter;
}

export function createRobotaxi(robotaxi) {
  return {
    fleet_operation_status: "NONE",
    needs_cleaning: false,
    needs_charging: false,
    needs_maintenance: false,
    pending_task_queue: [],
    cleanliness_status: "CLEAN",
    battery_operation_status: "ENOUGH",
    maintenance_status: "NORMAL",
    failure_status: "NONE",
    retirement_status: "ACTIVE",
    operation_blocking_reason: null,
    pending_fleet_task_type: null,
    pending_fleet_task_id: null,
    last_health_check_at: null,
    lifetime_distance_km: 0,
    lifetime_battery_consumed_percent: 0,
    completed_service_order_count: 0,
    completed_cleaning_count: 0,
    completed_charging_count: 0,
    completed_maintenance_count: 0,
    ...robotaxi,
  };
}

export function createWorker(worker) {
  return worker;
}
