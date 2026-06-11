export const OrderMatchingAlgorithm = {
  BASIC_NEAREST_AVAILABLE_ROBOTAXI: "BASIC_NEAREST_AVAILABLE_ROBOTAXI",
};

export const OrderMatchingStrategyStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  ARCHIVED: "ARCHIVED",
};

export const OrderMatchingResult = {
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
};

export const OrderMatchingFailureReason = {
  NONE: "NONE",
  NO_AVAILABLE_ROBOTAXI: "NO_AVAILABLE_ROBOTAXI",
  ROBOTAXI_STATE_INVALID: "ROBOTAXI_STATE_INVALID",
  ROBOTAXI_ALREADY_ASSIGNED: "ROBOTAXI_ALREADY_ASSIGNED",
  PICKUP_CELL_UNREACHABLE: "PICKUP_CELL_UNREACHABLE",
  BATTERY_NOT_ENOUGH: "BATTERY_NOT_ENOUGH",
  UNKNOWN: "UNKNOWN",
};

export function createOrderMatchingStrategy(strategy) {
  return strategy;
}

export function createOrderMatchingRun(run) {
  return run;
}

export function createOrderMatchingDecision(decision) {
  return decision;
}
