import assert from "node:assert/strict";
import fs from "node:fs";
import { initializeMapSpace } from "../src/data/mapInitialization.js";
import { initializeOperationsCenter } from "../src/data/operationsCenterInitialization.js";
import { initializeSpatialBusinessProfiles } from "../src/data/spatialBusinessProfileInitialization.js";
import { initializeSupplyManagement } from "../src/data/supplyManagementInitialization.js";
import {
  completeProductionBatch,
  confirmSupplyPlan,
  createProductionBatchFromSupplyPlan,
  executeLongTermDemandForecastStrategy,
  executeSupplyDecisionStrategy,
  passProductionQualityInspection,
  startProductionQualityInspection,
  startProductionBatch,
} from "../src/services/businessPlanningService.js";
import {
  confirmDeploymentPlan,
  executeDeploymentDecision,
  executeShortTermDemandForecast,
  markDeploymentPlanDispatched,
} from "../src/services/operatingPlanningService.js";
import { createDeploymentTasksFromPlan } from "../src/services/businessActionService.js";
import { initializeDefaultRobotaxiTaskPlanningStrategies } from "../src/services/robotaxiTaskPlanningService.js";
import { navigationGroups, validateNavigationRegistry } from "../src/ui/navigationRegistry.js";
import { getPageArchitecture, validatePageArchitecture } from "../src/ui/pageArchitectureRegistry.js";

const now = "2026-07-16T00:00:00.000Z";
const mapData = initializeMapSpace();
const operations = initializeOperationsCenter();
const supply = initializeSupplyManagement();
const profiles = initializeSpatialBusinessProfiles({ ...mapData, ...operations, ...supply, now });

const longForecast = executeLongTermDemandForecastStrategy({
  strategy: supply.longTermDemandForecastStrategies[0],
  businessTargets: supply.businessTargets,
  demandProfiles: profiles.demandProfiles,
  supplyProductionProfiles: supply.supplyProductionProfiles,
  robotaxis: operations.robotaxis,
  context: { now },
});
assert.equal(longForecast.run.run_status, "SUCCEEDED");
assert.ok(longForecast.results.length > 0);

const supplyDecision = executeSupplyDecisionStrategy({
  strategy: supply.supplyDecisionStrategies[0],
  forecast: longForecast.results[0],
  supplyProductionProfiles: supply.supplyProductionProfiles,
  context: { now, nextRunId: () => "SD-RUN-TEST", nextSupplyPlanId: () => "FPP-TEST" },
});
assert.equal(supplyDecision.run.run_status, "SUCCEEDED");
assert.equal(supplyDecision.supplyPlan.supply_decision_run_id, "SD-RUN-TEST");
assert.ok(supplyDecision.supplyPlan.planned_robotaxi_count > 0);

const confirmedSupplyPlan = confirmSupplyPlan({ supplyPlan: supplyDecision.supplyPlan, context: { now } });
assert.equal(confirmedSupplyPlan.succeeded, true);
const createdBatch = createProductionBatchFromSupplyPlan({
  supplyPlan: confirmedSupplyPlan.supplyPlan,
  context: { now, nextProductionBatchId: () => "PB-TEST" },
});
assert.equal(createdBatch.succeeded, true);
const startedBatch = startProductionBatch({ productionBatch: createdBatch.productionBatch, context: { now } });
assert.equal(startedBatch.succeeded, true);
const completedBatch = completeProductionBatch({
  productionBatch: startedBatch.productionBatch,
  context: { now },
});
assert.equal(completedBatch.succeeded, true);
assert.equal(completedBatch.productionBatch.batch_status, "AWAITING_QUALITY_INSPECTION");
assert.equal(completedBatch.robotaxis.length, 0);
const inspectionStarted = startProductionQualityInspection({ productionBatch: completedBatch.productionBatch, context: { now } });
assert.equal(inspectionStarted.productionBatch.batch_status, "IN_QUALITY_INSPECTION");
const inspectionPassed = passProductionQualityInspection({
  productionBatch: inspectionStarted.productionBatch,
  existingRobotaxis: operations.robotaxis,
  context: { now, nextRobotaxiId: (index) => `RTX-NEW-${String(index + 1).padStart(3, "0")}` },
});
assert.equal(inspectionPassed.succeeded, true);
assert.equal(inspectionPassed.robotaxis.length, supplyDecision.supplyPlan.planned_robotaxi_count);
assert.ok(inspectionPassed.robotaxis.every((item) => item.availability_status === "PENDING_DELIVERY"));

const shortForecast = executeShortTermDemandForecast({
  strategy: supply.shortTermDemandForecastStrategies[0],
  demandProfiles: profiles.demandProfiles,
  serviceOrders: [],
  trips: [],
  zones: mapData.zones,
  places: mapData.places,
  serviceAreas: mapData.serviceAreas,
  context: { now, nextRunId: () => "STF-RUN-TEST" },
});
assert.equal(shortForecast.run.run_status, "SUCCEEDED");
assert.ok(shortForecast.results.some((item) => item.predicted_order_count > 0));
assert.ok(shortForecast.results.every((item) => item.current_supply_quantity === undefined));

const targetServiceArea = mapData.serviceAreas.find((item) => item.zone_id === "Z-001") || mapData.serviceAreas[0];
const targetCellId = targetServiceArea.cell_ids[0];
const otherCellId = mapData.cells.find((item) => !targetServiceArea.cell_ids.includes(item.cell_id))?.cell_id;
const windowForecast = executeShortTermDemandForecast({
  strategy: { ...supply.shortTermDemandForecastStrategies[0], target_zone_ids: [targetServiceArea.zone_id], recent_window_days: 7 },
  demandProfiles: profiles.demandProfiles,
  serviceOrders: [
    { service_order_id: "SO-IN-WINDOW", created_at: "2026-07-15T00:00:00.000Z", pickup_cell_id: targetCellId, dropoff_cell_id: otherCellId },
    { service_order_id: "SO-OLD", created_at: "2026-06-01T00:00:00.000Z", pickup_cell_id: targetCellId, dropoff_cell_id: otherCellId },
    { service_order_id: "SO-DROPOFF-ONLY", created_at: "2026-07-15T01:00:00.000Z", pickup_cell_id: otherCellId, dropoff_cell_id: targetCellId },
  ],
  zones: mapData.zones,
  places: mapData.places,
  serviceAreas: mapData.serviceAreas,
  context: { now, nextRunId: () => "STF-RUN-WINDOW" },
});
assert.equal(windowForecast.run.input_snapshot.historical_order_count, 2, "短期预测输入只能保留时间窗内事实");
const targetHistory = windowForecast.results.find((item) => item.target_object_type === "SERVICE_AREA" && item.target_object_id === targetServiceArea.service_area_id);
assert.equal(targetHistory.historical_order_count, 1, "服务区域需求归属必须以订单起点为准");

const deploymentDecision = executeDeploymentDecision({
  strategy: supply.deploymentDecisionStrategies[0],
  forecastResults: shortForecast.results,
  robotaxis: [],
  zones: mapData.zones,
  places: mapData.places,
  serviceAreas: mapData.serviceAreas,
  context: { now, nextRunId: () => "DD-RUN-TEST" },
});
assert.equal(deploymentDecision.run.run_status, "SUCCEEDED");
assert.ok(deploymentDecision.plans.length > 0);
assert.equal(deploymentDecision.run.short_term_forecast_run_id, "STF-RUN-TEST");
const confirmedPlan = confirmDeploymentPlan({ plan: { ...deploymentDecision.plans[0], planned_robotaxi_count: 2, remaining_robotaxi_count: 2 }, context: { now } }).plan;
assert.equal(confirmedPlan.plan_status, "CONFIRMED");
const partialPlan = markDeploymentPlanDispatched({ plan: confirmedPlan, taskIds: ["TASK-DP-TEST-001"], failureReasons: ["NO_CANDIDATE_ROBOTAXI"], context: { now } }).plan;
assert.equal(partialPlan.plan_status, "PARTIALLY_DISPATCHED");
assert.equal(partialPlan.remaining_robotaxi_count, 1);
const dispatchedPlan = markDeploymentPlanDispatched({ plan: partialPlan, taskIds: ["TASK-DP-TEST-002"], context: { now } }).plan;
assert.equal(dispatchedPlan.plan_status, "DISPATCHED");
assert.equal(dispatchedPlan.remaining_robotaxi_count, 0);

const availableRobotaxis = operations.robotaxis.slice(0, 2).map((item) => ({
  ...item,
  availability_status: "AVAILABLE",
  available_for_dispatch: true,
  current_task_id: null,
  current_order_id: null,
}));
const runtime = createRuntime();
const batchResult = createDeploymentTasksFromPlan({
  state: {
    data: { ...mapData, ...operations, robotaxis: availableRobotaxis, robotaxiTaskPlanningStrategies: initializeDefaultRobotaxiTaskPlanningStrategies(now) },
    robotaxis: availableRobotaxis,
    deploymentTasks: [],
    routeExecutions: [],
    robotaxiTaskPlanningRuns: [],
    robotaxiTaskPlanningResults: [],
  },
  plan: confirmedPlan,
  runtime,
});
assert.equal(batchResult.success, true);
assert.equal(batchResult.data.taskIds.length, 2);
assert.equal(batchResult.updates.deploymentTasks.length, 2);
assert.ok(batchResult.updates.routeExecutions.every((item) => item.execution_status === "WAITING_ROUTE"));

const leafKeys = [];
const walk = (items) => items.forEach((item) => item.children?.length ? walk(item.children) : leafKeys.push(item.key));
walk(navigationGroups);
assert.ok(leafKeys.includes("supplyDecisionStrategies"));
assert.ok(leafKeys.includes("shortTermDemandForecastResults"));
assert.ok(leafKeys.includes("deploymentPlans"));
assert.ok(!leafKeys.includes("supplyDemandBalanceStrategies"));
assert.equal(validatePageArchitecture(leafKeys).valid, true);
assert.equal(getPageArchitecture("supplyDecisionStrategies").actionMode, "none");
assert.equal(getPageArchitecture("supplyDecisionStrategies").eventPanel?.label, "最近供应决策执行");
assert.equal(getPageArchitecture("shortTermDemandForecastStrategies").actionMode, "row");
assert.equal(getPageArchitecture("deploymentDecisionStrategies").actionMode, "row");

const mainSource = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
assert.match(mainSource, /businessActionService\.createDeploymentTasksFromPlan/);
assert.match(mainSource, /operatingPlanningService\.executeShortTermDemandForecast/);
assert.match(mainSource, /hiddenWorkspacePages = new Set\(\[[\s\S]*"supplyDemandBalanceStrategies"/);

console.log(`v046 经营与供应规划闭环验证通过：长期结果 ${longForecast.results.length}，生产资产 ${inspectionPassed.robotaxis.length}，短期结果 ${shortForecast.results.length}，投放计划 ${deploymentDecision.plans.length}，投放任务 ${batchResult.data.taskIds.length}`);

function createRuntime() {
  let sequence = 0;
  return {
    nextId: (prefix) => `${prefix}-TEST-${String(++sequence).padStart(3, "0")}`,
    now: () => now,
    audit: (options = {}) => ({
      record_source: "TEST",
      updated_at: now,
      ...(options.created ? { created_at: now } : {}),
    }),
    timeContext: { time_mode: "REAL_TIME", simulation_run_id: null, simulation_timeline_id: null },
    context: { trigger_source: "CONTRACT_TEST" },
  };
}
