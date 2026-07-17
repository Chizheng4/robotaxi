import assert from "node:assert/strict";
import { createEchartsOption } from "../src/ui/dataChartService.js";
import {
  executeLongTermDemandForecastStrategy,
  executeSupplyDecisionStrategy,
  initializeDefaultBusinessTargets,
  initializeDefaultLongTermDemandForecastStrategies,
  initializeDefaultSupplyDecisionStrategies,
  initializeDefaultSupplyProductionProfiles,
} from "../src/services/businessPlanningService.js";

const now = "2026-07-17T00:00:00.000Z";
const strategy = initializeDefaultLongTermDemandForecastStrategies(now)[0];
const businessTarget = initializeDefaultBusinessTargets(now)[0];
const productionProfile = initializeDefaultSupplyProductionProfiles(now)[0];
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
  current_cell_id: "C-1-1",
  availability_status: index === 0 ? "AVAILABLE" : "PENDING_ADMISSION",
}));
const execution = executeLongTermDemandForecastStrategy({
  strategy,
  businessTargets: [businessTarget],
  demandProfiles: [demandProfile],
  supplyProductionProfiles: [productionProfile],
  robotaxis,
  opsCenters: [{ ops_center_id: "OC-001", cell_ids: ["C-1-1"] }],
  zones: [{ zone_id: "Z-001", parent_zone_id: null, cell_ids: ["C-1-1"] }],
  context: { now, nextRunId: () => "LDF-RUN-TEST", nextResultBaseId: () => "LDF-RES-TEST" },
});
assert.equal(strategy.robotaxi_available_hours_per_day, 24);
assert.equal(execution.results[0].zone_non_retired_robotaxi_quantity, 20);
assert.equal(execution.results[0].effective_current_robotaxi, 20);
assert.ok(execution.run.input_fingerprint);

const reusedExecution = executeLongTermDemandForecastStrategy({
  strategy,
  businessTargets: [businessTarget],
  demandProfiles: [demandProfile],
  supplyProductionProfiles: [productionProfile],
  robotaxis,
  opsCenters: [{ ops_center_id: "OC-001", cell_ids: ["C-1-1"] }],
  zones: [{ zone_id: "Z-001", parent_zone_id: null, cell_ids: ["C-1-1"] }],
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

const chartOption = createEchartsOption({
  rows: Array.from({ length: 60 }, (_, index) => ({ label: String(index), values: { value: index } })),
  series: [{ key: "value", label: "数值", visible: true }],
});
assert.equal(chartOption.dataZoom[0].moveOnMouseWheel, false);
console.log("v047.1.0 经营规划执行合同验证通过");
