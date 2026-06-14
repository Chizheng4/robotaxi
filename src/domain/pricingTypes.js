export const PricingAlgorithm = {
  BASIC_RULE_BASED_DYNAMIC_PRICING: "BASIC_RULE_BASED_DYNAMIC_PRICING",
  BASIC_FINAL_FARE_CALCULATION: "BASIC_FINAL_FARE_CALCULATION",
};

export const PricingStrategyStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  ARCHIVED: "ARCHIVED",
};

export const PricingStage = {
  ESTIMATE: "ESTIMATE",
  FINAL: "FINAL",
};

export const PricingResult = {
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
};

export const PricingFailureReason = {
  NONE: "NONE",
  ROUTE_ESTIMATION_FAILED: "ROUTE_ESTIMATION_FAILED",
  PRICING_STRATEGY_NOT_FOUND: "PRICING_STRATEGY_NOT_FOUND",
  PRICING_CONFIG_MISSING: "PRICING_CONFIG_MISSING",
  INVALID_DISTANCE: "INVALID_DISTANCE",
  INVALID_DURATION: "INVALID_DURATION",
  UNKNOWN: "UNKNOWN",
};

export function createPricingStrategy(strategy) {
  return strategy;
}

export function createPricingStrategyRun(run) {
  return run;
}

export function createPricingDecision(decision) {
  return decision;
}
