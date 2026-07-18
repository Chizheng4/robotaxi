import assert from "node:assert/strict";
import { calculateLongTermDemandPlan, resolveForecastPeriod } from "../src/domain/longTermDemandPlanning.js";
import {
  createSupplyPlanFromForecast,
  initializeDefaultBusinessTargets,
  initializeDefaultLongTermDemandForecastStrategies,
  initializeDefaultSupplyDecisionStrategies,
  initializeDefaultSupplyProductionProfiles,
} from "../src/services/businessPlanningService.js";

assert.deepEqual(resolveForecastPeriod({
  forecast_start_date: "2026-07-18",
  forecast_period_unit: "MONTH",
  forecast_period_count: 12,
}), {
  unit: "MONTH",
  count: 12,
  periodDays: 365 / 12,
  totalDays: 365,
  startDate: "2026-07-18",
  endDate: "2027-07-17",
  endExclusiveDate: "2027-07-18",
});

const now = "2026-07-18T00:00:00.000Z";
const businessTarget = {
  ...initializeDefaultBusinessTargets(now)[0],
  planning_mode: "BALANCED",
  target_end_daily_orders: 100,
};
const strategy = initializeDefaultLongTermDemandForecastStrategies(now)[0];
const productionProfile = {
  ...initializeDefaultSupplyProductionProfiles(now)[0],
  production_capacity_per_period: 10,
  delivery_capacity_per_period: 10,
  production_lead_time_days: 10,
  quality_inspection_lead_time_days: 3,
};
const calculation = calculateLongTermDemandPlan({
  strategy,
  businessTarget,
  zoneProfile: {
    profile_id: "DP-Z-1",
    target_object_type: "ZONE",
    target_object_id: "Z-1",
    baseline_addressable_daily_orders: 50,
    busiest_hour_share: 0.15,
    zone_period_growth_rate: 0.01,
    growth_rate_unit: "MONTH",
    effective_daily_capacity: 40,
    effective_peak_hour_capacity: 5,
  },
  productionProfile,
  robotaxis: [],
  zones: [{ zone_id: "Z-1" }],
});
const forecast = calculation.result;
assert.equal(forecast.forecast_end_date, "2027-07-17");
assert.deepEqual(
  forecast.forecast_trend_series.MONTH.map((point) => point.trend_date),
  [
    "2026-07-18", "2026-08-18", "2026-09-18", "2026-10-18", "2026-11-18", "2026-12-18",
    "2027-01-18", "2027-02-18", "2027-03-18", "2027-04-18", "2027-05-18", "2027-06-18", "2027-07-17",
  ],
);
assert.equal(forecast.planned_daily_orders, Math.min(forecast.market_forecast_daily_orders, 100));
assert.equal(forecast.first_production_completion_date, "2026-07-28");
assert.equal(forecast.first_quality_inspection_completion_date, "2026-07-31");
const productionPoint = forecast.supply_trend_series.find((point) => point.period_production_quantity > 0);
const qualityPoint = forecast.supply_trend_series.find((point) => point.period_quality_passed_quantity > 0);
assert.equal(productionPoint.trend_date, "2026-07-28");
assert.equal(qualityPoint.trend_date, "2026-07-31");
assert.equal(forecast.supply_trend_series.every((point) => point.remaining_robotaxi_gap === Math.max(0, forecast.robotaxi_gap_quantity - point.cumulative_delivery_quantity)), true);

const supplyPlanResult = createSupplyPlanFromForecast({
  forecast: {
    ...forecast,
    forecast_result_id: "LDF-RES-1",
    robotaxi_gap_quantity: 43,
    feasible_manufacturing_quantity: 100,
    feasible_delivery_quantity: 100,
  },
  supplyProductionProfiles: [productionProfile],
  supplyDecisionStrategy: initializeDefaultSupplyDecisionStrategies(now)[0],
  context: { now, nextSupplyPlanId: () => "SP-1" },
});
assert.equal(supplyPlanResult.supplyPlan.covered_gap_quantity, 43);
assert.equal(supplyPlanResult.supplyPlan.safety_capacity_quantity, 3);
assert.equal(supplyPlanResult.supplyPlan.required_supply_quantity, 46);

console.log("v047.2.0 经营规划模型边界验证通过");
