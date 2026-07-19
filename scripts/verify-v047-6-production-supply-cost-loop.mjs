import assert from "node:assert/strict";
import {
  completeProductionBatch,
  confirmSupplyPlan,
  createProductionBatchFromSupplyPlan,
  initializeDefaultProductionFactories,
  initializeDefaultSupplyProductionProfiles,
  passProductionQualityInspection,
  resolveProductionBatchReleaseState,
  startProductionBatch,
  startProductionQualityInspection,
} from "../src/services/businessPlanningService.js";
import { initializeDefaultCostModelProfile } from "../src/data/costModelCalculator.js";
import { createPeriodMetricCalculation } from "../src/data/metricCalculator.js";
import { createSupplyPositionView } from "../src/services/supplyPositionService.js";

const now = "2026-07-19T00:00:00.000Z";
const profile = initializeDefaultSupplyProductionProfiles(now)[0];
const factory = initializeDefaultProductionFactories(now)[0];
const costProfile = initializeDefaultCostModelProfile();

assert.equal(factory.production_factory_id, profile.production_factory_id);
assert.equal(costProfile.standard_production_cost_per_robotaxi, 230000);

const draftPlan = {
  supply_plan_id: "FPP-TEST-001",
  plan_name: "测试区域生产计划",
  plan_status: "DRAFT",
  forecast_result_id: "LDF-RES-TEST-001",
  supply_decision_run_id: "SD-RUN-TEST-001",
  supply_production_profile_id: profile.profile_id,
  target_zone_id: "Z-001",
  target_zone_name: "测试区域",
  planned_robotaxi_count: 23,
  planned_start_date: "2026-07-19",
  planned_end_date: "2027-07-18",
};

const confirmed = confirmSupplyPlan({
  supplyPlan: draftPlan,
  supplyProductionProfiles: [profile],
  costModelProfile: costProfile,
  context: { now: () => now },
});
assert.equal(confirmed.succeeded, true);
assert.equal(confirmed.supplyPlan.production_factory_id, factory.production_factory_id);
assert.equal(confirmed.supplyPlan.planned_production_cost_amount, 23 * 230000);
assert.deepEqual(confirmed.supplyPlan.production_schedule_lines.map((line) => line.planned_quantity), [4, 7, 10, 2]);
assert.equal(confirmed.supplyPlan.production_schedule_lines[0].release_status, "PRODUCTION_SCHEDULE_PENDING");

const firstCreated = createProductionBatchFromSupplyPlan({
  supplyPlan: confirmed.supplyPlan,
  existingProductionBatches: [],
  context: { now: () => now, nextProductionBatchId: () => "PB-TEST-001" },
});
assert.equal(firstCreated.succeeded, true);
assert.equal(firstCreated.productionBatch.planned_robotaxi_count, 4);

const firstStarted = startProductionBatch({
  productionBatch: firstCreated.productionBatch,
  supplyPlan: firstCreated.supplyPlan,
  context: { now: () => "2026-07-19T00:10:00.000Z" },
});
const blocked = resolveProductionBatchReleaseState({
  supplyPlan: firstStarted.supplyPlan,
  existingProductionBatches: [firstStarted.productionBatch],
  now: "2026-08-19T00:00:00.000Z",
});
assert.equal(blocked.enabled, false);
assert.equal(blocked.reason, "CURRENT_PRODUCTION_BATCH_NOT_COMPLETED");

const firstCompleted = completeProductionBatch({
  productionBatch: firstStarted.productionBatch,
  costModelProfile: costProfile,
  existingCostRecords: [],
  costCalculationRunId: "CCR-PROD-PB-TEST-001",
  context: { now: () => "2026-07-29T00:00:00.000Z" },
});
assert.equal(firstCompleted.succeeded, true);
assert.equal(firstCompleted.productionBatch.batch_status, "AWAITING_QUALITY_INSPECTION");
assert.equal(firstCompleted.costRecord.cost_amount, 4 * 230000);
assert.equal(firstCompleted.costRecord.actual_cost_occurred_at, "2026-07-29T00:00:00.000Z");
assert.equal(firstCompleted.costRecord.simulation_cost_occurred_at, null);

const secondCreated = createProductionBatchFromSupplyPlan({
  supplyPlan: firstCreated.supplyPlan,
  existingProductionBatches: [firstCompleted.productionBatch],
  context: { now: () => "2026-08-19T00:00:00.000Z", nextProductionBatchId: () => "PB-TEST-002" },
});
assert.equal(secondCreated.succeeded, true, "上一批生产完成后，下一到期批次必须可下达，无需等待质检完成");
assert.equal(secondCreated.productionBatch.planned_robotaxi_count, 7);

const inspection = startProductionQualityInspection({
  productionBatch: firstCompleted.productionBatch,
  context: { now: () => "2026-07-29T00:10:00.000Z" },
});
const passed = passProductionQualityInspection({
  productionBatch: inspection.productionBatch,
  existingRobotaxis: [{ robotaxi_id: "RTX-001" }],
  existingCostRecords: firstCompleted.costRecords,
  supplyPlan: secondCreated.supplyPlan,
  existingProductionBatches: [inspection.productionBatch, secondCreated.productionBatch],
  context: {
    now: () => "2026-08-01T00:00:00.000Z",
    nextRobotaxiId: (index) => `RTX-${String(index + 21).padStart(3, "0")}`,
  },
});
assert.equal(passed.succeeded, true);
assert.equal(passed.robotaxis.length, 4);
assert.equal(passed.robotaxis[0].asset_acquisition_cost, 230000);
assert.equal(passed.robotaxis[0].availability_status, "PENDING_DELIVERY");
assert.equal(passed.costRecords[0].qualified_robotaxi_count, 4);
assert.equal(passed.costRecords[0].quality_loss_cost_amount, 0);

const tracking = createSupplyPositionView({
  supplyPlans: [secondCreated.supplyPlan],
  productionBatches: [passed.productionBatch, secondCreated.productionBatch],
  robotaxis: passed.robotaxis,
  zones: [{ zone_id: "Z-001", zone_name: "测试区域", cell_ids: [] }],
});
const completedBatchProjection = tracking.records.filter((record) => record.production_batch_id === passed.productionBatch.production_batch_id);
assert.equal(completedBatchProjection.reduce((sum, record) => sum + Number(record.supply_quantity || 0), 0), 4, "质检合格资产不得再叠加已完成批次数量");

const metrics = createPeriodMetricCalculation({
  simulationRuns: [],
  scope: {
    supplyPlans: [secondCreated.supplyPlan],
    productionBatches: [passed.productionBatch, secondCreated.productionBatch],
    robotaxis: passed.robotaxis,
  },
  costRecords: passed.costRecords,
  calculationRunId: "MCR-SUPPLY-COST-TEST",
});
const metricValue = (id) => metrics.metricObservations.find((item) => item.metric_definition_id === id)?.metric_value;
assert.equal(metricValue("OUTCOME-SUPPLY-COST-001"), 4 * 230000);
assert.equal(metricValue("OUTCOME-SUPPLY-COST-002"), 23 * 230000);
assert.equal(metricValue("PROCESS-SUPPLY-COST-001"), 230000);
assert.equal(metricValue("QUALITY-SUPPLY-COST-001"), 0);
assert.equal(metricValue("STATE-SUPPLY-COST-001"), 4 * 230000);

console.log("v047.6.0 生产供应与成本闭环验证通过");
