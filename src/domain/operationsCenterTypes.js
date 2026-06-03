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
  return robotaxi;
}

export function createWorker(worker) {
  return worker;
}
