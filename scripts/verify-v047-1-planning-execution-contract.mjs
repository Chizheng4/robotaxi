import assert from "node:assert/strict";
import fs from "node:fs";
import { createEchartsOption } from "../src/ui/dataChartService.js";
import { normalizeDemandProfiles } from "../src/data/spatialBusinessProfileInitialization.js";
import {
  executeLongTermDemandForecastStrategy,
  executeSupplyDecisionStrategy,
  findReusableLongTermDemandForecast,
  initializeDefaultBusinessTargets,
  initializeDefaultLongTermDemandForecastStrategies,
  initializeDefaultSupplyDecisionStrategies,
  initializeDefaultSupplyProductionProfiles,
  normalizeSupplyPlans,
} from "../src/services/businessPlanningService.js";

const now = "2026-07-17T00:00:00.000Z";
const strategy = initializeDefaultLongTermDemandForecastStrategies(now)[0];
const businessTarget = initializeDefaultBusinessTargets(now)[0];
const productionProfile = initializeDefaultSupplyProductionProfiles(now)[0];
assert.equal(strategy.robotaxi_available_hours_per_day, 24);
assert.equal(businessTarget.forecast_period_count, 12);
assert.equal(businessTarget.target_name, "基准经营目标");
assert.equal(productionProfile.production_lead_time_days, 10);
assert.equal(strategy.growth_adjustment_rate, 0.005);

const place = { place_id: "P-001", place_name: "测试地点", place_type: "RESIDENTIAL", place_status: "ACTIVE" };
const initializedProfiles = normalizeDemandProfiles({ places: [place], demandProfiles: [] });
const initializedPlaceProfile = initializedProfiles.find((item) => item.target_object_id === place.place_id);
assert.equal(initializedPlaceProfile.robotaxi_adoption_rate, 0.6);
assert.equal(initializedPlaceProfile.service_acceptance_rate, 0.7);
assert.equal(initializedPlaceProfile.competition_retention_rate, 0.4);
assert.equal(initializedPlaceProfile.trip_generation_rate, 0.6);

const migratedProfiles = normalizeDemandProfiles({
  places: [place],
  demandProfiles: [{ ...initializedPlaceProfile, profile_version: 1, robotaxi_adoption_rate: 0.18, service_acceptance_rate: 0.9, competition_retention_rate: 0.85 }],
});
const migratedPlaceProfile = migratedProfiles.find((item) => item.target_object_id === place.place_id);
assert.equal(migratedPlaceProfile.robotaxi_adoption_rate, 0.6);
assert.equal(migratedPlaceProfile.service_acceptance_rate, 0.7);
assert.equal(migratedPlaceProfile.competition_retention_rate, 0.4);
assert.equal(migratedPlaceProfile.profile_version, 3);
const preservedProfiles = normalizeDemandProfiles({
  places: [place],
  demandProfiles: [{ ...initializedPlaceProfile, profile_version: 2, robotaxi_adoption_rate: 0.52 }],
});
assert.equal(preservedProfiles.find((item) => item.target_object_id === place.place_id).robotaxi_adoption_rate, 0.52);
const demandProfile = {
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
  current_cell_id: index === 0 ? "C-1-2" : "C-1-1",
  availability_status: index === 0 ? "AVAILABLE" : "PENDING_ADMISSION",
}));
const opsCenters = [{ ops_center_id: "OC-001", zone_id: "Z-001", cell_ids: ["C-1-1"] }];
const zones = [{ zone_id: "Z-001", parent_zone_id: null, cell_ids: ["C-1-1"] }, { zone_id: "Z-001-A", parent_zone_id: "Z-001", cell_ids: ["C-1-2"] }];
const executionInput = {
  strategy,
  businessTargets: [businessTarget],
  demandProfiles: [demandProfile],
  supplyProductionProfiles: [productionProfile],
  robotaxis,
  opsCenters,
  zones,
};
const execution = executeLongTermDemandForecastStrategy({
  ...executionInput,
  context: { now, nextRunId: () => "LDF-RUN-TEST", nextResultBaseId: () => "LDF-RES-TEST" },
});
assert.equal(execution.results[0].zone_non_retired_robotaxi_quantity, 20);
assert.equal(execution.results[0].effective_current_robotaxi, 20);
assert.ok(execution.run.input_fingerprint);
assert.ok(execution.results[0].calculation_steps.every((item) => item.output_field && item.calculation_model && item.formula_expression && Object.keys(item.input_values || {}).length));

const reusableForecast = findReusableLongTermDemandForecast({ ...executionInput, existingRuns: [execution.run], existingResults: execution.results });
assert.equal(reusableForecast.results[0].forecast_result_id, execution.results[0].forecast_result_id);
const reusedExecution = executeLongTermDemandForecastStrategy({
  ...executionInput,
  existingRuns: [execution.run],
  existingResults: execution.results,
  context: { now, nextRunId: () => "LDF-RUN-UNEXPECTED", nextResultBaseId: () => "LDF-RES-UNEXPECTED" },
});
assert.equal(reusedExecution.reused, true);
assert.equal(reusedExecution.run.forecast_run_id, execution.run.forecast_run_id);

const supplyStrategy = initializeDefaultSupplyDecisionStrategies(now)[0];
const supplyDecision = executeSupplyDecisionStrategy({
  strategy: supplyStrategy,
  forecast: execution.results[0],
  supplyProductionProfiles: [productionProfile],
  context: { now, nextRunId: () => "SD-RUN-TEST", nextSupplyPlanId: () => "SP-TEST" },
});
assert.equal(supplyDecision.succeeded, true);
assert.equal(supplyDecision.supplyPlan.supply_decision_run_id, "SD-RUN-TEST");
const reusedSupplyDecision = executeSupplyDecisionStrategy({
  strategy: supplyStrategy,
  forecast: execution.results[0],
  supplyProductionProfiles: [productionProfile],
  existingSupplyPlans: [supplyDecision.supplyPlan],
  context: { now, nextRunId: () => "SD-RUN-UNEXPECTED", nextSupplyPlanId: () => "SP-UNEXPECTED" },
});
assert.equal(reusedSupplyDecision.reused, true);
assert.equal(reusedSupplyDecision.supplyPlan.supply_plan_id, "SP-TEST");

const [migratedSupplyPlan] = normalizeSupplyPlans({
  supplyPlans: [{ supply_plan_id: "SP-LEGACY", forecast_result_id: execution.results[0].forecast_result_id, plan_status: "DRAFT", planned_robotaxi_count: 10 }],
  forecasts: execution.results,
  supplyDecisionRuns: [{ supply_decision_run_id: "SD-RUN-LEGACY", supply_plan_id: "SP-LEGACY", supply_decision_strategy_id: supplyStrategy.supply_decision_strategy_id }],
  supplyDecisionStrategies: [supplyStrategy],
  supplyProductionProfiles: [productionProfile],
});
assert.equal(migratedSupplyPlan.forecast_run_id, execution.run.forecast_run_id);
assert.equal(migratedSupplyPlan.supply_decision_run_id, "SD-RUN-LEGACY");
assert.ok(Number.isFinite(migratedSupplyPlan.required_supply_quantity));
assert.ok(Number.isFinite(migratedSupplyPlan.feasible_manufacturing_quantity));

const chartOption = createEchartsOption({
  rows: Array.from({ length: 60 }, (_, index) => ({ label: String(index), values: { value: index } })),
  series: [{ key: "value", label: "数值", visible: true }],
});
assert.deepEqual(chartOption.dataZoom, [], "经营规划图表不得接管页面纵向滚动");
const mainSource = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
assert.match(mainSource, /reusableForecast \? "查看预测结果" : "执行预测"/);
assert.match(mainSource, /showSearch/);
assert.match(mainSource, /getFieldLabel\("effective_current_robotaxi"\)/);
console.log("v047.1.1 经营规划执行合同收口验证通过");
