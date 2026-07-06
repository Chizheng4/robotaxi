export const StatusGroup = {
  CURRENT_NORMAL: "current.normal",
  CURRENT_EXCEPTION: "current.exception",
  LEGACY_COMPAT: "legacy.compat",
};

export const statusRegistry = {
  readinessTask: {
    statusField: "task_status",
    current: {
      normal: ["WAITING_ASSIGNMENT", "WAITING_CHECK", "CHECKING", "COMPLETED"],
      exception: ["CANCELLED", "FAILED"],
    },
    legacy: { compat: [] },
  },
  deploymentTask: {
    statusField: "task_status",
    current: {
      normal: ["WAITING_START", "MOVING", "ARRIVED", "COMPLETED"],
      exception: ["ARRIVAL_ABNORMAL", "CANCELLED", "FAILED"],
    },
    legacy: { compat: ["WAITING_ROUTE"] },
  },
  routeExecution: {
    statusField: "execution_status",
    current: {
      normal: ["WAITING_ROUTE", "MOVING", "ARRIVED", "COMPLETED"],
      exception: ["ARRIVAL_ABNORMAL", "PAUSED", "CANCELLED", "FAILED"],
    },
    legacy: { compat: ["WAITING_START"] },
  },
  serviceOrder: {
    statusField: "order_status",
    current: {
      normal: [
        "WAITING_PRICE_ESTIMATE",
        "WAITING_ROBOTAXI_CALL",
        "WAITING_ROBOTAXI_ASSIGNMENT",
        "ON_THE_WAY_PICKUP",
        "WAITING_CUSTOMER_BOARDING",
        "CUSTOMER_ONBOARD",
        "ON_THE_WAY_DESTINATION",
        "ARRIVED_DESTINATION",
        "SETTLING",
        "WAITING_PAYMENT",
        "COMPLETED",
      ],
      exception: ["ROBOTAXI_ASSIGNMENT_FAILED", "WAITING_OPERATION_DECISION", "CANCELLED", "FAILED"],
    },
    legacy: {
      compat: [
        "CALCULATING_PRICE",
        "WAITING_CUSTOMER_CONFIRM",
        "WAITING_FOR_VEHICLE",
        "VEHICLE_ASSIGNED",
        "VEHICLE_ON_THE_WAY_TO_PICKUP",
        "WAITING_PASSENGER_BOARDING",
        "PASSENGER_ONBOARD",
        "ON_THE_WAY_TO_DESTINATION",
        "MATCH_FAILED",
        "MATCHING_FAILED",
      ],
    },
  },
  trip: {
    statusField: "trip_status",
    current: {
      normal: [
        "WAITING_ROUTE",
        "ON_THE_WAY_PICKUP",
        "WAITING_CUSTOMER_BOARDING",
        "CUSTOMER_ONBOARD",
        "ON_THE_WAY_DESTINATION",
        "ARRIVED_DESTINATION",
        "COMPLETED",
      ],
      exception: ["WAITING_OPERATION_DECISION", "FAILED", "CANCELLED"],
    },
    legacy: { compat: ["PENDING", "ASSIGNED", "ARRIVED_PICKUP", "PASSENGER_ONBOARD", "SETTLING"] },
  },
  simulationRun: {
    statusField: "simulation_status",
    current: {
      normal: ["READY", "RUNNING", "PAUSED", "DRAINING", "COMPLETED", "STOPPED"],
      exception: ["FAILED"],
    },
    legacy: { compat: [] },
  },
  workflowTimingRule: {
    statusField: "rule_status",
    current: {
      normal: ["ACTIVE", "DISABLED"],
      exception: [],
    },
    legacy: { compat: [] },
  },
  costCalculationRun: {
    statusField: "calculation_status",
    current: {
      normal: ["QUEUED", "CALCULATING", "SUCCEEDED", "PARTIALLY_SUCCEEDED"],
      exception: ["FAILED"],
    },
    legacy: { compat: [] },
  },
  revenueCalculationRun: {
    statusField: "calculation_status",
    current: {
      normal: ["QUEUED", "CALCULATING", "SUCCEEDED", "PARTIALLY_SUCCEEDED"],
      exception: ["FAILED"],
    },
    legacy: { compat: [] },
  },
  fleetOperationPolicy: {
    statusField: "policy_status",
    current: {
      normal: ["DRAFT", "ACTIVE", "DISABLED", "ARCHIVED"],
      exception: [],
    },
    legacy: { compat: [] },
  },
  fleetOperationPolicyRun: {
    statusField: "run_status",
    current: {
      normal: ["SUCCEEDED", "PARTIALLY_SUCCEEDED", "NO_ACTION"],
      exception: ["FAILED"],
    },
    legacy: { compat: [] },
  },
  fleetOperationPolicyResult: {
    statusField: "result_status",
    current: {
      normal: ["TASK_CREATED", "SKIPPED"],
      exception: ["FAILED"],
    },
    legacy: { compat: [] },
  },
  cleaningTask: {
    statusField: "task_status",
    current: {
      normal: [
        "WAITING_ROBOTAXI_AVAILABLE",
        "WAITING_DESTINATION_ASSIGNMENT",
        "WAITING_ROUTE",
        "MOVING_TO_OPS_CENTER",
        "ARRIVED_OPS_CENTER",
        "WAITING_WORKER_ASSIGNMENT",
        "READY_TO_START",
        "CLEANING_IN_PROGRESS",
        "COMPLETED",
      ],
      exception: ["ARRIVAL_ABNORMAL", "CANCELLED", "FAILED"],
    },
    legacy: { compat: [] },
  },
  chargingTask: {
    statusField: "task_status",
    current: {
      normal: [
        "WAITING_ROBOTAXI_AVAILABLE",
        "WAITING_CHARGING_DESTINATION_ASSIGNMENT",
        "WAITING_ROUTE",
        "MOVING_TO_CHARGER",
        "ARRIVED_CHARGER",
        "WAITING_CHARGER_ASSIGNMENT",
        "READY_TO_CHARGE",
        "CHARGING",
        "READY_TO_DISCONNECT",
        "COMPLETED",
      ],
      exception: ["ARRIVAL_ABNORMAL", "CANCELLED", "FAILED"],
    },
    legacy: { compat: [] },
  },
  maintenanceTask: {
    statusField: "task_status",
    current: {
      normal: [
        "WAITING_ROBOTAXI_AVAILABLE",
        "WAITING_MAINTENANCE_DESTINATION_ASSIGNMENT",
        "WAITING_ROUTE",
        "MOVING_TO_MAINTENANCE_CENTER",
        "ARRIVED_MAINTENANCE_CENTER",
        "WAITING_RESOURCE_ASSIGNMENT",
        "READY_TO_START",
        "MAINTENANCE_IN_PROGRESS",
        "COMPLETED",
      ],
      exception: ["ARRIVAL_ABNORMAL", "CANCELLED", "FAILED"],
    },
    legacy: { compat: [] },
  },
  failureHandlingTask: {
    statusField: "task_status",
    current: {
      normal: [
        "WAITING_ROBOTAXI_AVAILABLE",
        "WAITING_DIAGNOSIS_ASSIGNMENT",
        "DIAGNOSING",
        "COMPLETED",
      ],
      exception: ["CANCELLED", "FAILED"],
    },
    legacy: { compat: ["WAITING_DISPOSITION", "TRANSFERRED_TO_MAINTENANCE", "TRANSFERRED_TO_RETIREMENT", "RESOLVED_NO_ACTION"] },
  },
  retirementTask: {
    statusField: "task_status",
    current: {
      normal: [
        "WAITING_ROBOTAXI_AVAILABLE",
        "WAITING_RETIREMENT_APPROVAL",
        "WAITING_DESTINATION_ASSIGNMENT",
        "WAITING_ROUTE",
        "MOVING_TO_RETIREMENT_CENTER",
        "ARRIVED_RETIREMENT_CENTER",
        "PROCESSING_RETIREMENT",
        "COMPLETED",
      ],
      exception: ["CANCELLED", "FAILED"],
    },
    legacy: { compat: [] },
  },
  timedOperation: {
    statusField: "operation_status",
    current: {
      normal: ["PENDING", "RUNNING", "COMPLETED"],
      exception: ["FAILED", "CANCELLED"],
    },
    legacy: { compat: [] },
  },
};

export const pageStatusRegistryMap = {
  readinessTasks: "readinessTask",
  deploymentTasks: "deploymentTask",
  routeExecutions: "routeExecution",
  serviceOrders: "serviceOrder",
  serviceFulfillmentRecords: "trip",
  simulationRuns: "simulationRun",
  workflowTimingRules: "workflowTimingRule",
  costCalculationRuns: "costCalculationRun",
  revenueCalculationRuns: "revenueCalculationRun",
  cleaningTasks: "cleaningTask",
  chargingTasks: "chargingTask",
  maintenanceTasks: "maintenanceTask",
  failureHandlingTasks: "failureHandlingTask",
  retirementTasks: "retirementTask",
  fleetOperationPolicies: "fleetOperationPolicy",
  fleetOperationPolicyRuns: "fleetOperationPolicyRun",
  fleetOperationPolicyResults: "fleetOperationPolicyResult",
  timedOperations: "timedOperation",
};

export function getStatusField(objectType) {
  return statusRegistry[objectType]?.statusField || null;
}

export function getCurrentNormalStatusValues(objectType) {
  return [...(statusRegistry[objectType]?.current?.normal || [])];
}

export function getCurrentExceptionStatusValues(objectType) {
  return [...(statusRegistry[objectType]?.current?.exception || [])];
}

export function getCurrentStatusValues(objectType) {
  return [...getCurrentNormalStatusValues(objectType), ...getCurrentExceptionStatusValues(objectType)];
}

export function getLegacyCompatStatusValues(objectType) {
  return [...(statusRegistry[objectType]?.legacy?.compat || [])];
}

export function getStatusOptions(objectType, options = {}) {
  const { includeLegacy = false } = options;
  const values = getCurrentStatusValues(objectType);
  if (includeLegacy) values.push(...getLegacyCompatStatusValues(objectType));
  return [...new Set(values)];
}

export function getPageStatusOptions(page, options = {}) {
  const objectType = pageStatusRegistryMap[page];
  return objectType ? getStatusOptions(objectType, options) : [];
}

export function getPageStatusObjectType(page) {
  return pageStatusRegistryMap[page] || null;
}

export function getStatusGroup(objectType, status) {
  if (getCurrentNormalStatusValues(objectType).includes(status)) return StatusGroup.CURRENT_NORMAL;
  if (getCurrentExceptionStatusValues(objectType).includes(status)) return StatusGroup.CURRENT_EXCEPTION;
  if (getLegacyCompatStatusValues(objectType).includes(status)) return StatusGroup.LEGACY_COMPAT;
  return null;
}

export function isCurrentStatus(objectType, status) {
  return getCurrentStatusValues(objectType).includes(status);
}

export function isCurrentNormalStatus(objectType, status) {
  return getCurrentNormalStatusValues(objectType).includes(status);
}

export function isLegacyCompatStatus(objectType, status) {
  return getLegacyCompatStatusValues(objectType).includes(status);
}
