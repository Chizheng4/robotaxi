import assert from "node:assert/strict";
import fs from "node:fs";
import { normalizeDemandProfiles } from "../src/data/spatialBusinessProfileInitialization.js";
import { getFieldLabel } from "../src/domain/fieldDictionary.js";
import {
  completeProductionBatch,
  createProductionBatchFromSupplyPlan,
  executeLongTermDemandForecastStrategy,
  executeSupplyDecisionStrategy,
  failProductionQualityInspection,
  initializeDefaultBusinessTargets,
  initializeDefaultLongTermDemandForecastStrategies,
  initializeDefaultSupplyDecisionStrategies,
  initializeDefaultSupplyProductionProfiles,
  normalizeBusinessPlanningDefaults,
  startProductionBatch,
  startProductionQualityInspection,
} from "../src/services/businessPlanningService.js";

const now = "2026-07-18T00:00:00.000Z";
const target = initializeDefaultBusinessTargets(now)[0];
const profile = initializeDefaultSupplyProductionProfiles(now)[0];
const strategy = initializeDefaultLongTermDemandForecastStrategies(now)[0];
assert.equal(target.target_name, "基准经营目标");
assert.equal(target.forecast_period_count, 12);
assert.equal(profile.production_lead_time_days, 10);
assert.equal(strategy.growth_adjustment_rate, 0.005);

const places = [
  { place_id: "P-RES", place_name: "住宅区", place_type: "RESIDENTIAL", place_status: "ACTIVE" },
  { place_id: "P-OFF", place_name: "办公区", place_type: "OFFICE", place_status: "ACTIVE" },
];
const demandProfiles = normalizeDemandProfiles({ places, demandProfiles: [] });
assert.equal(demandProfiles.find((item) => item.target_object_id === "P-RES").trip_generation_rate, 0.6);
assert.equal(demandProfiles.find((item) => item.target_object_id === "P-OFF").trip_generation_rate, 0.9);

const migrated = normalizeBusinessPlanningDefaults({
  businessTargets: [{ ...target, target_name: "一年运营增长目标", forecast_period_count: 12 }],
  supplyProductionProfiles: [{ ...profile, production_lead_time_days: 180 }],
  longTermDemandForecastStrategies: [{ ...strategy, growth_adjustment_rate: 0 }],
});
assert.equal(migrated.businessTargets[0].forecast_period_count, 12);
assert.equal(migrated.supplyProductionProfiles[0].production_lead_time_days, 10);
assert.equal(migrated.longTermDemandForecastStrategies[0].growth_adjustment_rate, 0.005);

const forecast = executeLongTermDemandForecastStrategy({
  strategy,
  businessTargets: [target],
  demandProfiles: [{
    profile_id: "DP-Z-001",
    profile_status: "ACTIVE",
    target_object_type: "ZONE",
    target_object_id: "Z-001",
    target_object_name: "测试区域",
    baseline_addressable_daily_orders: 120,
    busiest_hour_share: 0.15,
    zone_period_growth_rate: 0.01,
    growth_rate_unit: "MONTH",
    effective_daily_capacity: 400,
    effective_peak_hour_capacity: 80,
  }],
  supplyProductionProfiles: [profile],
  robotaxis: [],
  zones: [{ zone_id: "Z-001", parent_zone_id: null }],
  context: { now, nextRunId: () => "LDF-RUN-TIME", nextResultBaseId: () => "LDF-RES-TIME" },
}).results[0];
assert.equal(forecast.first_production_completion_date, "2026-07-28");
assert.equal(forecast.first_quality_inspection_completion_date, "2026-07-31");
assert.equal(forecast.first_delivery_date, "2026-07-31");

const decision = executeSupplyDecisionStrategy({
  strategy: initializeDefaultSupplyDecisionStrategies(now)[0],
  forecast: {
    ...forecast,
    robotaxi_gap_quantity: 100,
    feasible_manufacturing_quantity: 30,
    feasible_delivery_quantity: 25,
  },
  supplyProductionProfiles: [{ ...profile, production_capacity_per_period: 9999, delivery_capacity_per_period: 9999 }],
  context: { now, nextRunId: () => "SD-RUN-TIME", nextSupplyPlanId: () => "SP-TIME" },
});
assert.equal(decision.supplyPlan.required_supply_quantity, 105);
assert.equal(decision.supplyPlan.planned_robotaxi_count, 25);

const created = createProductionBatchFromSupplyPlan({
  supplyPlan: { ...decision.supplyPlan, plan_status: "CONFIRMED" },
  context: { now, nextProductionBatchId: () => "PB-TIME" },
});
const started = startProductionBatch({ productionBatch: created.productionBatch, context: { now } });
const productionCompleted = completeProductionBatch({ productionBatch: started.productionBatch, context: { now } });
assert.equal(productionCompleted.productionBatch.batch_status, "AWAITING_QUALITY_INSPECTION");
assert.deepEqual(productionCompleted.robotaxis, []);
const inspection = startProductionQualityInspection({ productionBatch: productionCompleted.productionBatch, context: { now } });
const failed = failProductionQualityInspection({ productionBatch: inspection.productionBatch, context: { now } });
assert.equal(failed.productionBatch.batch_status, "QUALITY_FAILED");
assert.deepEqual(failed.robotaxis, []);

const mainSource = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const pageArchitectureSource = fs.readFileSync(new URL("../src/ui/pageArchitectureRegistry.js", import.meta.url), "utf8");
assert.match(mainSource, /function renderPlanningConfigControl/);
assert.match(mainSource, /addonAfter=\{isPercent \|\| field\.type === "percentList" \? "%"/);
assert.match(mainSource, /planningPercentageFieldKeys\.has\(key\)/);
assert.match(mainSource, /AWAITING_QUALITY_INSPECTION/);
for (const fieldKey of ["daily_required_robotaxi", "peak_required_robotaxi", "daily_capacity_gap", "peak_capacity_gap"]) {
  assert.notEqual(getFieldLabel(fieldKey), "未登记字段");
}
assert.doesNotMatch(pageArchitectureSource.match(/const rowActionPages = new Set\(\[([\s\S]*?)\]\);/)?.[1] || "", /supplyDecisionStrategies/);

console.log("v047.1.2 经营规划与供应时间合同验证通过");
