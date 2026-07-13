import assert from "node:assert/strict";
import { calculateLongTermDemandPlan } from "../src/domain/longTermDemandPlanning.js";
import {
  executeLongTermDemandForecastStrategy,
  initializeDefaultBusinessTargets,
  initializeDefaultLongTermDemandForecastStrategies,
  initializeDefaultSupplyProductionProfiles,
} from "../src/services/businessPlanningService.js";

const businessTarget = initializeDefaultBusinessTargets("2026-07-13T00:00:00.000Z")[0];
const strategy = initializeDefaultLongTermDemandForecastStrategies("2026-07-13T00:00:00.000Z")[0];
const productionProfile = initializeDefaultSupplyProductionProfiles("2026-07-13T00:00:00.000Z")[0];
const zoneProfile = {
  profile_id: "DP-Z-Z-001",
  profile_status: "ACTIVE",
  target_object_type: "ZONE",
  target_object_id: "Z-001",
  target_object_name: "最小运营测试区",
  baseline_addressable_daily_orders: 600,
  busiest_hour_share: 0.15,
  zone_period_growth_rate: 0.02,
  growth_rate_unit: "MONTH",
  effective_daily_capacity: 900,
  effective_peak_hour_capacity: 120,
};
const robotaxis = Array.from({ length: 20 }, (_, index) => ({
  robotaxi_id: `RTX-${index + 1}`,
  target_zone_id: "Z-001",
  availability_status: "AVAILABLE",
}));

const calculation = calculateLongTermDemandPlan({ strategy, businessTarget, zoneProfile, productionProfile, robotaxis });
assert.equal(calculation.validation.valid, true);
assert.equal(calculation.result.forecast_period_unit, "MONTH");
assert.equal(calculation.result.forecast_period_count, 36);
assert.ok(calculation.result.market_forecast_daily_orders > 600);
assert.ok(calculation.result.required_robotaxi_quantity >= calculation.result.daily_required_robotaxi);
assert.ok(calculation.result.required_robotaxi_quantity >= calculation.result.peak_required_robotaxi);
assert.equal(calculation.result.effective_current_robotaxi, 20);
assert.equal(calculation.result.recommended_production_quantity, calculation.result.robotaxi_gap_quantity);
assert.equal(calculation.result.planned_production_quantity, calculation.result.recommended_production_quantity);
assert.ok(calculation.result.feasible_supply_quantity <= calculation.result.feasible_manufacturing_quantity);
assert.ok(calculation.result.feasible_supply_quantity <= calculation.result.feasible_delivery_quantity);
assert.ok(calculation.result.supply_trend_series.length > 1);
assert.equal(calculation.result.supply_trend_series.at(-1).remaining_robotaxi_gap, 0);
assert.equal(calculation.result.calculation_steps.length, 11);
assert.equal(calculation.result.growth_model, "LINEAR");
assert.ok(calculation.result.forecast_trend_series.DAY.length > calculation.result.forecast_trend_series.WEEK.length);
assert.ok(calculation.result.forecast_trend_series.WEEK.length > calculation.result.forecast_trend_series.MONTH.length);
assert.equal(calculation.result.forecast_trend_series.DAY[0].cumulative_market_orders, 0);
assert.equal(
  calculation.result.forecast_trend_series.DAY.at(-1).market_daily_orders,
  calculation.result.market_forecast_daily_orders,
);
assert.equal(
  calculation.result.forecast_trend_series.DAY.at(-1).cumulative_market_orders,
  calculation.result.forecast_cumulative_market_orders,
);
assert.ok(calculation.result.forecast_cumulative_market_orders > calculation.result.market_forecast_daily_orders);

const linearCalculation = calculateLongTermDemandPlan({
  strategy: { ...strategy, growth_model: "LINEAR" },
  businessTarget,
  zoneProfile,
  productionProfile,
  robotaxis,
});
assert.equal(linearCalculation.result.growth_model, "LINEAR");
assert.equal(linearCalculation.result.growth_factor, 1.72);

const execution = executeLongTermDemandForecastStrategy({
  strategy,
  businessTargets: [businessTarget],
  demandProfiles: [zoneProfile],
  supplyProductionProfiles: [productionProfile],
  robotaxis,
  context: { now: "2026-07-13T00:00:00.000Z", nextRunId: () => "LDF-RUN-TEST", nextResultBaseId: () => "LDF-RES-TEST" },
});
assert.equal(execution.run.run_status, "SUCCEEDED");
assert.equal(execution.results.length, 1);
assert.equal(execution.results[0].confidence_level, undefined);
assert.equal(execution.results[0].required_fleet_quantity, undefined);
assert.ok(execution.run.strategy_snapshot);
assert.ok(Array.isArray(execution.run.robotaxi_inventory_snapshot));
assert.ok(Array.isArray(execution.run.input_validation_result));

const noResult = executeLongTermDemandForecastStrategy({
  strategy,
  businessTargets: [businessTarget],
  demandProfiles: [],
  supplyProductionProfiles: [productionProfile],
  robotaxis,
  context: { now: "2026-07-13T00:00:00.000Z", nextRunId: () => "LDF-RUN-NONE", nextResultBaseId: () => "LDF-RES-NONE" },
});
assert.equal(noResult.run.run_status, "NO_RESULT");

console.log("v043.0 长期需求预测计算合同验证通过");
