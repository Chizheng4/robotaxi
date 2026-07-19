import assert from "node:assert/strict";
import fs from "node:fs";

import {
  SupplyPlanStatus,
  businessPlanningObjectSchemas,
  cancelSupplyPlan,
  confirmSupplyPlan,
  createProductionBatchFromSupplyPlan,
  executeSupplyDecisionStrategy,
  resolveForecastSupplyDecisionEligibility,
} from "../src/services/businessPlanningService.js";
import { getDisplayValue, getFieldLabel } from "../src/domain/fieldDictionary.js";

let runSequence = 0;
let planSequence = 0;
let batchSequence = 0;
const context = {
  now: () => "2026-07-19T10:00:00.000Z",
  nextRunId: () => `SD-RUN-${String(++runSequence).padStart(4, "0")}`,
  nextSupplyPlanId: () => `FPP-${String(++planSequence).padStart(4, "0")}`,
  nextProductionBatchId: () => `PB-${String(++batchSequence).padStart(4, "0")}`,
};
const strategy = {
  supply_decision_strategy_id: "SD-STR-001",
  strategy_status: "ACTIVE",
  demand_coverage_rate: 1,
  safety_capacity_ratio: 0.1,
};
const productionProfiles = [{ profile_id: "SPP-001", profile_status: "ACTIVE", production_lead_time_days: 10 }];
const forecast = (id, start = "2026-07-19", end = "2027-07-18") => ({
  forecast_result_id: id,
  forecast_run_id: `LDF-RUN-${id}`,
  business_target_id: "BT-001",
  zone_id: "Z-001",
  zone_name: "测试区域",
  forecast_start_date: start,
  forecast_end_date: end,
  forecast_period_unit: "MONTH",
  forecast_period_count: 12,
  supply_production_profile_id: "SPP-001",
  robotaxi_gap_quantity: 10,
  required_robotaxi_quantity: 30,
  effective_current_robotaxi: 20,
  feasible_manufacturing_quantity: 20,
  feasible_delivery_quantity: 20,
});

const first = executeSupplyDecisionStrategy({ strategy, forecast: forecast("LDF-RES-0001"), supplyProductionProfiles: productionProfiles, existingSupplyPlans: [], context });
assert.equal(first.succeeded, true);
assert.equal(first.supplyPlan.forecast_result_id, "LDF-RES-0001");
assert.equal(first.supplyPlan.supply_decision_run_id, first.run.supply_decision_run_id);
assert.equal(first.supplyPlan.business_target_id, "BT-001");
assert.equal(first.supplyPlan.forecast_start_date, "2026-07-19");
assert.equal(first.run.forecast_end_date, "2027-07-18");
assert.equal(first.run.decision_calculation_steps.length, 4);

const second = executeSupplyDecisionStrategy({ strategy, forecast: forecast("LDF-RES-0002"), supplyProductionProfiles: productionProfiles, existingSupplyPlans: [first.supplyPlan], context });
assert.equal(second.succeeded, true);
assert.equal(first.supplyPlan.plan_status, SupplyPlanStatus.DRAFT, "生成新计划时不得提前取消已有重叠草稿");
assert.deepEqual(second.cancelledSupplyPlans, [], "供应决策执行只生成计划，不处理计划冲突");
const plansAfterSecond = [second.supplyPlan, first.supplyPlan];
const confirmed = confirmSupplyPlan({ supplyPlan: second.supplyPlan, existingSupplyPlans: plansAfterSecond, context });
assert.equal(confirmed.succeeded, true);
assert.equal(confirmed.cancelledSupplyPlans.length, 1, "确认计划时必须处理同范围重叠草稿");
assert.equal(confirmed.cancelledSupplyPlans[0].supply_plan_id, first.supplyPlan.supply_plan_id);
assert.equal(confirmed.cancelledSupplyPlans[0].plan_status, SupplyPlanStatus.CANCELLED);

const thirdForecast = forecast("LDF-RES-0003");
const eligibility = resolveForecastSupplyDecisionEligibility({ forecast: thirdForecast, supplyPlans: [confirmed.supplyPlan, ...confirmed.cancelledSupplyPlans] });
assert.equal(eligibility.status, "CONFIRMED_PERIOD_CONFLICT");
const blocked = executeSupplyDecisionStrategy({ strategy, forecast: thirdForecast, supplyProductionProfiles: productionProfiles, existingSupplyPlans: [confirmed.supplyPlan], context });
assert.equal(blocked.succeeded, false);
assert.equal(blocked.reason, "OVERLAPPING_CONFIRMED_SUPPLY_PLAN_EXISTS");
assert.equal(blocked.run.conflicting_supply_plan_id, confirmed.supplyPlan.supply_plan_id);

const exact = executeSupplyDecisionStrategy({ strategy, forecast: forecast("LDF-RES-0002"), supplyProductionProfiles: productionProfiles, existingSupplyPlans: [confirmed.supplyPlan], context });
assert.equal(exact.reused, true, "同一预测结果不得重复生成计划和执行记录");

const nonOverlapping = executeSupplyDecisionStrategy({ strategy, forecast: forecast("LDF-RES-0004", "2027-07-19", "2028-07-18"), supplyProductionProfiles: productionProfiles, existingSupplyPlans: [confirmed.supplyPlan], context });
assert.equal(nonOverlapping.succeeded, true, "不重叠周期必须允许形成独立生产计划");

const batch = createProductionBatchFromSupplyPlan({ supplyPlan: confirmed.supplyPlan, context });
assert.equal(batch.succeeded, true);
const duplicateBatch = createProductionBatchFromSupplyPlan({ supplyPlan: confirmed.supplyPlan, existingProductionBatches: [batch.productionBatch], context });
assert.equal(duplicateBatch.reason, "PRODUCTION_BATCH_ALREADY_EXISTS");
const cancellation = cancelSupplyPlan({ supplyPlan: confirmed.supplyPlan, productionBatches: [batch.productionBatch], context });
assert.equal(cancellation.succeeded, false);
assert.equal(cancellation.reason, "SUPPLY_PLAN_HAS_PRODUCTION_BATCH");

assert.ok(businessPlanningObjectSchemas.supplyDecisionRun.tabs.some((item) => item.key === "calculation"));
assert.ok(businessPlanningObjectSchemas.supplyPlan.tabs.some((item) => item.key === "source"));
assert.equal(getFieldLabel("decision_calculation_steps"), "决策计算过程");
assert.equal(getFieldLabel("conflicting_supply_plan_id"), "冲突生产计划编号");
assert.equal(getDisplayValue("OVERLAPPING_CONFIRMED_SUPPLY_PLAN_EXISTS"), "该区域当前周期已有已确认生产计划");

const mainSource = fs.readFileSync("src/main.jsx", "utf8");
assert.match(mainSource, /resolveForecastSupplyDecisionEligibility/, "预测结果页面必须消费统一供应决策资格服务");
assert.match(mainSource, /查看已确认计划/, "预测结果必须提供冲突计划的明确查看入口");
assert.match(mainSource, /actions\.cancelSupplyPlan\(row\)/, "生产计划必须提供服务化取消入口");
assert.match(mainSource, /className="row-action-split"/, "多动作必须使用主动作与更多菜单统一分体控件");
assert.match(mainSource, /aria-label="更多操作"/, "更多操作入口必须具备明确可访问名称");

console.log("v047.4.2 预测、供应决策与生产计划追溯合同验证通过");
