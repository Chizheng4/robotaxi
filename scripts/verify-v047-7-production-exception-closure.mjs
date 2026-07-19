import assert from "node:assert/strict";
import {
  completeProductionBatch,
  completeProductionQualityInspection,
  confirmSupplyPlan,
  createProductionBatchFromSupplyPlan,
  executeSupplyDecisionStrategy,
  initializeDefaultSupplyDecisionStrategies,
  initializeDefaultSupplyProductionProfiles,
  normalizeSupplyPlans,
  startProductionBatch,
  startProductionQualityInspection,
} from "../src/services/businessPlanningService.js";
import { initializeDefaultCostModelProfile } from "../src/data/costModelCalculator.js";

const now = "2026-07-19T00:00:00.000Z";
const productionProfile = initializeDefaultSupplyProductionProfiles(now)[0];
const decisionStrategy = initializeDefaultSupplyDecisionStrategies(now)[0];
const costProfile = initializeDefaultCostModelProfile();

const forecast = {
  forecast_result_id: "LDF-RES-EXCEPTION-001",
  forecast_run_id: "LDF-RUN-EXCEPTION-001",
  business_target_id: "BT-001",
  zone_id: "Z-001",
  zone_name: "最小运营测试区",
  forecast_start_date: "2026-07-19",
  forecast_end_date: "2027-07-18",
  forecast_period_unit: "MONTH",
  forecast_period_count: 12,
  robotaxi_gap_quantity: 43,
  supply_production_profile_id: productionProfile.profile_id,
};

const decision = executeSupplyDecisionStrategy({
  strategy: { ...decisionStrategy, demand_coverage_rate: 1, safety_capacity_ratio: 0 },
  forecast,
  supplyProductionProfiles: [productionProfile],
  costModelProfile: costProfile,
  context: {
    now: () => now,
    nextSupplyDecisionRunId: () => "SD-RUN-EXCEPTION-001",
    nextSupplyPlanId: () => "FPP-EXCEPTION-001",
  },
});
assert.equal(decision.succeeded, true);
assert.ok(decision.supplyPlan.feasible_manufacturing_quantity > 43, "供应能力应表达生产画像在预测期内的总能力，不得被缺口截断");
assert.ok(decision.supplyPlan.feasible_delivery_quantity > 43, "可交付数量应表达预测期内的总交付能力");
assert.equal(decision.supplyPlan.feasible_manufacturing_quantity, 111, "十二个月预测期应按生产画像累计完整生产能力");
assert.equal(decision.supplyPlan.feasible_delivery_quantity, 111, "十二个月预测期应按质检和交付约束累计完整供应能力");
assert.equal(decision.supplyPlan.planned_robotaxi_count, 43);
assert.equal(decision.supplyPlan.estimated_supply_cost_amount, 43 * 230000);

const correctedDraftPlan = normalizeSupplyPlans({
  supplyPlans: [{ ...decision.supplyPlan, feasible_manufacturing_quantity: 43, feasible_delivery_quantity: 43 }],
  forecasts: [forecast],
  supplyDecisionStrategies: [{ ...decisionStrategy, demand_coverage_rate: 1, safety_capacity_ratio: 0 }],
  supplyProductionProfiles: [productionProfile],
})[0];
assert.equal(correctedDraftPlan.feasible_manufacturing_quantity, 111, "草稿生产计划必须更新为生产画像计算的可生产能力");
assert.equal(correctedDraftPlan.feasible_delivery_quantity, 111, "草稿生产计划必须更新为生产画像计算的可交付能力");
assert.equal(correctedDraftPlan.planned_robotaxi_count, 43, "生产计划数量仍由需求和供应能力共同约束");

const confirmed = confirmSupplyPlan({
  supplyPlan: decision.supplyPlan,
  supplyProductionProfiles: [productionProfile],
  costModelProfile: costProfile,
  context: { now: () => now },
});
assert.equal(confirmed.succeeded, true);
assert.equal(confirmed.supplyPlan.planned_production_cost_amount, 43 * 230000);

const created = createProductionBatchFromSupplyPlan({
  supplyPlan: confirmed.supplyPlan,
  context: { now: () => now, nextProductionBatchId: () => "PB-EXCEPTION-001" },
});
assert.equal(created.productionBatch.planned_robotaxi_count, 4);
const started = startProductionBatch({
  productionBatch: created.productionBatch,
  supplyPlan: created.supplyPlan,
  context: { now: () => "2026-07-19T01:00:00.000Z" },
});
const produced = completeProductionBatch({
  productionBatch: started.productionBatch,
  actualCompletedQuantity: 3,
  costModelProfile: costProfile,
  existingCostRecords: [],
  context: { now: () => "2026-07-29T00:00:00.000Z" },
});
assert.equal(produced.productionBatch.production_completed_quantity, 3);
assert.equal(produced.costRecord.cost_amount, 3 * 230000);

const inspecting = startProductionQualityInspection({
  productionBatch: produced.productionBatch,
  context: { now: () => "2026-07-29T01:00:00.000Z" },
});
const inspected = completeProductionQualityInspection({
  productionBatch: inspecting.productionBatch,
  qualifiedRobotaxiCount: 2,
  existingCostRecords: produced.costRecords,
  supplyPlan: started.supplyPlan,
  existingProductionBatches: [inspecting.productionBatch],
  context: {
    now: () => "2026-08-01T00:00:00.000Z",
    nextRobotaxiId: (index) => `RTX-EX-${index + 1}`,
  },
});
assert.equal(inspected.productionBatch.quality_inspection_result, "PARTIALLY_PASSED");
assert.equal(inspected.productionBatch.qualified_robotaxi_count, 2);
assert.equal(inspected.productionBatch.failed_robotaxi_count, 1);
assert.equal(inspected.productionBatch.quality_loss_cost_amount, 230000);
assert.equal(inspected.productionBatch.qualified_unit_production_cost, 345000);
assert.equal(inspected.robotaxis.length, 2);
assert.equal(inspected.supplyPlan.completed_robotaxi_count, 2);
assert.equal(inspected.supplyPlan.pending_replacement_robotaxi_count, 2, "少产 1 辆和质检失败 1 辆应形成 2 辆补产，而不是全部待生产量");
assert.equal(inspected.supplyPlan.production_schedule_lines.filter((line) => line.schedule_adjustment_reason === "QUALITY_OR_PRODUCTION_VARIANCE_REPLACEMENT").reduce((sum, line) => sum + line.planned_quantity, 0), 2);

const allFailedPlan = confirmSupplyPlan({
  supplyPlan: { ...decision.supplyPlan, supply_plan_id: "FPP-FAIL-001", forecast_result_id: "LDF-RES-FAIL-001", planned_robotaxi_count: 4 },
  supplyProductionProfiles: [productionProfile],
  costModelProfile: costProfile,
  context: { now: () => now },
}).supplyPlan;
const allFailedCreated = createProductionBatchFromSupplyPlan({ supplyPlan: allFailedPlan, context: { now: () => now, nextProductionBatchId: () => "PB-FAIL-001" } });
const allFailedStarted = startProductionBatch({ productionBatch: allFailedCreated.productionBatch, supplyPlan: allFailedCreated.supplyPlan, context: { now: () => now } });
const allFailedProduced = completeProductionBatch({ productionBatch: allFailedStarted.productionBatch, actualCompletedQuantity: 4, costModelProfile: costProfile, context: { now: () => now } });
const allFailedInspecting = startProductionQualityInspection({ productionBatch: allFailedProduced.productionBatch, context: { now: () => now } });
const allFailed = completeProductionQualityInspection({
  productionBatch: allFailedInspecting.productionBatch,
  qualifiedRobotaxiCount: 0,
  existingCostRecords: allFailedProduced.costRecords,
  supplyPlan: allFailedStarted.supplyPlan,
  existingProductionBatches: [allFailedInspecting.productionBatch],
  context: { now: () => now },
});
assert.equal(allFailed.productionBatch.batch_status, "QUALITY_FAILED");
assert.equal(allFailed.robotaxis.length, 0);
assert.equal(allFailed.supplyPlan.pending_replacement_robotaxi_count, 4);
assert.equal(allFailed.supplyPlan.plan_status, "IN_EXECUTION");

const overproductionPlan = confirmSupplyPlan({
  supplyPlan: { ...decision.supplyPlan, supply_plan_id: "FPP-OVER-001", forecast_result_id: "LDF-RES-OVER-001", planned_robotaxi_count: 4 },
  supplyProductionProfiles: [productionProfile],
  costModelProfile: costProfile,
  context: { now: () => now },
}).supplyPlan;
const overproductionCreated = createProductionBatchFromSupplyPlan({ supplyPlan: overproductionPlan, context: { now: () => now, nextProductionBatchId: () => "PB-OVER-001" } });
const overproductionStarted = startProductionBatch({ productionBatch: overproductionCreated.productionBatch, supplyPlan: overproductionCreated.supplyPlan, context: { now: () => now } });
const overproductionCompleted = completeProductionBatch({ productionBatch: overproductionStarted.productionBatch, actualCompletedQuantity: 5, costModelProfile: costProfile, context: { now: () => now } });
const overproductionInspecting = startProductionQualityInspection({ productionBatch: overproductionCompleted.productionBatch, context: { now: () => now } });
const overproductionInspected = completeProductionQualityInspection({
  productionBatch: overproductionInspecting.productionBatch,
  qualifiedRobotaxiCount: 5,
  existingCostRecords: overproductionCompleted.costRecords,
  supplyPlan: overproductionStarted.supplyPlan,
  existingProductionBatches: [overproductionInspecting.productionBatch],
  context: { now: () => now, nextRobotaxiId: (index) => `RTX-OVER-${index + 1}` },
});
assert.equal(overproductionInspected.robotaxis.length, 5);
assert.equal(overproductionInspected.supplyPlan.completed_robotaxi_count, 5);
assert.equal(overproductionInspected.supplyPlan.pending_replacement_robotaxi_count, 0);
assert.equal(overproductionInspected.supplyPlan.plan_status, "COMPLETED");
assert.equal(overproductionCompleted.costRecord.cost_amount, 5 * 230000, "实际成本必须按实际生产量记录");

console.log("v047.7.0 生产偏差、质检损失与补产闭环验证通过");
