import {
  PricingAlgorithm,
  PricingStrategyStatus,
  createPricingStrategy,
} from "../domain/pricingTypes.js?v=20260611-v019-4-pricing";

export function initializePricing() {
  return {
    pricingStrategies: [
      createPricingStrategy({
        pricing_strategy_id: "DPS-001",
        strategy_name: "基础动态定价策略",
        strategy_type: "BASIC_DYNAMIC_PRICING",
        pricing_algorithm: PricingAlgorithm.BASIC_RULE_BASED_DYNAMIC_PRICING,
        base_fare: 3,
        distance_unit_price: 0.6,
        time_unit_price: 0.2,
        supply_demand_multiplier: 1,
        time_period_multiplier: 1,
        service_area_multiplier: 1,
        channel_multiplier: 1,
        strategy_status: PricingStrategyStatus.ACTIVE,
        created_at: "2026-06-11T00:00:00.000Z",
      }),
    ],
  };
}
