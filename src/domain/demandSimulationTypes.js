export const DemandSimulationStrategyType = {
  BASIC_RANDOM_DEMAND_SIMULATION: "BASIC_RANDOM_DEMAND_SIMULATION",
};

export const DemandSimulationAlgorithm = {
  BASIC_WEIGHTED_RANDOM_SAMPLING: "BASIC_WEIGHTED_RANDOM_SAMPLING",
};

export const DemandSimulationStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  ARCHIVED: "ARCHIVED",
};

export const DemandSimulationResult = {
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
};

export const CustomerOriginLocationType = {
  PLACE: "PLACE",
  ROAD_SEGMENT: "ROAD_SEGMENT",
  CELL: "CELL",
};

export const DemandSimulationFailureReason = {
  NONE: "NONE",
  NO_ACTIVE_CUSTOMER: "NO_ACTIVE_CUSTOMER",
  NO_AVAILABLE_PLACE: "NO_AVAILABLE_PLACE",
  NO_AVAILABLE_ROAD_SEGMENT: "NO_AVAILABLE_ROAD_SEGMENT",
  CUSTOMER_LOCATION_INVALID: "CUSTOMER_LOCATION_INVALID",
  NO_AVAILABLE_PICKUP_CELL: "NO_AVAILABLE_PICKUP_CELL",
  NO_AVAILABLE_DROPOFF_CELL: "NO_AVAILABLE_DROPOFF_CELL",
};

export function createDemandSimulationStrategy(strategy) {
  return strategy;
}

export function createDemandSimulationRun(run) {
  return run;
}
