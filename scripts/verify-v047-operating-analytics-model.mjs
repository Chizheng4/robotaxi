import assert from "node:assert/strict";
import fs from "node:fs";

import {
  createPeriodMetricCalculation,
  initializeDefaultMetricDefinitions,
} from "../src/data/metricCalculator.js";
import {
  createOperatingDataPool,
  createPlanningBaseline,
  OPERATING_ANALYSIS_PAGE_METRICS,
  OPERATING_ANALYSIS_PAGE_MODELS,
} from "../src/services/operatingDataPoolService.js";
import { getPageArchitecture } from "../src/ui/pageArchitectureRegistry.js";

const definitions = initializeDefaultMetricDefinitions();
const definitionIds = definitions.map((item) => item.metric_definition_id);
assert.equal(new Set(definitionIds).size, definitionIds.length, "统一指标目录不得出现重复指标编号");
definitions.filter((item) => item.metric_status === "ACTIVE").forEach((item) => {
  assert.ok(item.business_definition && item.management_question, `${item.metric_definition_id} 必须具有经营语义`);
  assert.ok(item.metric_role && item.measurement_type, `${item.metric_definition_id} 必须声明指标角色和度量类型`);
  assert.ok(item.fact_filter, `${item.metric_definition_id} 必须声明事实过滤条件`);
});
assert.equal(definitions.find((item) => item.metric_definition_id === "PROCESS-ASSET-002").metric_status, "RESERVED", "缺少状态区间事实时不得伪造订单服务时间利用率");
assert.equal(definitions.find((item) => item.metric_definition_id === "DEMAND-TREND-002").metric_status, "DISABLED", "旧时段趋势定义必须停止生成重复观测");

const simulationRun = {
  simulation_run_id: "SIM-V047-001",
  simulation_timeline_id: "TL-V047",
  start_simulation_seconds: 0,
  end_simulation_seconds: 172800,
  cost_calculation_status: "SUCCEEDED",
  revenue_calculation_status: "SUCCEEDED",
};
const scope = {
  serviceOrders: [
    order("SO-1", "COMPLETED", 3600, { matched_robotaxi_id: "RTX-1", fulfillment_distance_km: 12, fulfillment_duration_min: 30 }),
    order("SO-2", "CANCELLED", 7200),
    order("SO-3", "WAITING_ROBOTAXI_ASSIGNMENT", 9000),
    order("SO-4", "COMPLETED", 90000, { matched_robotaxi_id: "RTX-2", fulfillment_distance_km: 8, fulfillment_duration_min: 20 }),
  ],
  trips: [
    { trip_id: "T-1", trip_status: "COMPLETED", trip_total_distance_km: 12, simulation_created_at: "Day1 01:00:00" },
    { trip_id: "T-2", trip_status: "FAILED", trip_total_distance_km: 2, simulation_created_at: "Day1 02:00:00" },
    { trip_id: "T-3", trip_status: "ON_THE_WAY_DESTINATION", trip_total_distance_km: 3, simulation_created_at: "Day2 01:00:00" },
  ],
  routeExecutions: [{ route_execution_id: "RE-1", total_distance_km: 7, simulation_created_at: "Day1 03:00:00" }],
  routePlanningRuns: [
    { route_planning_run_id: "R-1", planning_result: "SUCCESS", result_route_id: "ROUTE-1", simulation_created_at: "Day1 01:00:00" },
    { route_planning_run_id: "R-2", planning_result: "FAILED", failure_reason: "NO_ROUTE", simulation_created_at: "Day1 02:00:00" },
  ],
  orderMatchingDecisions: [{ order_matching_decision_id: "D-1", service_order_id: "SO-1", selected_robotaxi_id: "RTX-1", simulation_created_at: "Day1 01:00:00" }],
  robotaxis: [
    { robotaxi_id: "RTX-1", availability_status: "AVAILABLE" },
    { robotaxi_id: "RTX-2", availability_status: "IN_MAINTENANCE" },
    { robotaxi_id: "RTX-3", availability_status: "PENDING_ADMISSION" },
  ],
  supplyPlans: [{ supply_plan_id: "SP-1", plan_status: "CONFIRMED", planned_robotaxi_count: 10 }],
  productionBatches: [{ production_batch_id: "PB-1", batch_status: "COMPLETED", produced_robotaxi_count: 8, simulation_created_at: "Day1 04:00:00" }],
  robotaxiDeliveryOrders: [{ delivery_order_id: "DO-1", delivery_status: "DELIVERED", robotaxi_ids: ["RTX-1", "RTX-2"], simulation_created_at: "Day1 05:00:00" }],
  readinessTasks: [{ task_id: "RD-1", task_status: "COMPLETED", admission_result: "PASSED", simulation_created_at: "Day1 06:00:00" }],
  decisionProcesses: [{ decision_process_id: "DP-1", final_decision_status: "SUCCESS", result_summary: "已完成", first_attempt_at: "2026-07-17T00:00:00Z", latest_attempt_at: "2026-07-17T00:00:05Z" }],
};
const revenueRecords = [
  { revenue_record_id: "REV-1", simulation_run_id: simulationRun.simulation_run_id, simulation_created_at: "Day1 01:00:00", revenue_type: "COLLECTED_REVENUE", revenue_amount: 100 },
];
const costRecords = [
  cost("C-1", "DISTANCE_COST", 10),
  cost("C-2", "ENERGY_COST", 5),
  cost("C-3", "LABOR_COST", 15),
  cost("C-4", "ASSET_DEPRECIATION_COST", 20),
  cost("C-5", "FIXED_OPERATING_COST", 10),
];
const result = createPeriodMetricCalculation({
  simulationRuns: [simulationRun],
  scope,
  revenueRecords,
  costRecords,
  metricDefinitions: definitions,
  calculationRunId: "MCR-V047",
  periodType: "ALL",
});
const metrics = latestById(result.metricObservations);
assert.equal(metrics.get("OUTCOME-SERVICE-003").metric_value, 0.6667, "订单履约率不得把在途订单放入分母");
assert.equal(metrics.get("PROCESS-TRIP-001").metric_value, 0.5, "履约行驶完成率不得把在途行驶放入分母");
assert.equal(metrics.get("OUTCOME-FIN-007").metric_value, 30, "变动运营成本必须只包含距离、能源和人力成本");
assert.equal(metrics.get("OUTCOME-FIN-005").metric_value, 70, "经营贡献必须扣除变动运营成本");
assert.equal(metrics.get("OUTCOME-FIN-010").metric_value, 40, "模拟运营利润必须扣除全部运营成本");
assert.equal(metrics.get("PROCESS-ASSET-003").metric_value, 0.2917, "空驶里程占比必须由运营行驶和履约行驶事实计算");
assert.equal(metrics.get("PROCESS-SUPPLY-001").metric_value, 0.8, "生产计划达成率必须按生产数量和计划数量计算");
assert.equal(metrics.get("PROCESS-SUPPLY-003").metric_value, 1, "准入通过率必须按终态准入任务计算");
assert.ok(!metrics.has("PROCESS-ASSET-002"), "缺少必要事实的预留指标不得生成伪观测");
assert.ok(result.metricObservations.some((item) => item.metric_definition_id === "DEMAND-TREND-001" && item.dimension_type === "DEMAND_TIME_SEGMENT"), "需求趋势必须在同一指标定义下支持时段维度");

const latestDay = createPeriodMetricCalculation({
  simulationRuns: [simulationRun],
  scope,
  revenueRecords,
  costRecords,
  metricDefinitions: definitions,
  calculationRunId: "MCR-V047-DAY",
  periodType: "LATEST_DAY",
});
assert.equal(latestById(latestDay.metricObservations).get("OUTCOME-SERVICE-001").metric_value, 1, "短周期统计必须按事实发生时间过滤，不能因运行编号相同而纳入全部记录");

const planningBaseline = createPlanningBaseline({
  businessTargets: [{ business_target_id: "BT-1", target_status: "ACTIVE", forecast_start_date: "2026-01-01", updated_at: "2026-01-01" }],
  demandForecasts: [{
    forecast_result_id: "F-1",
    forecast_status: "GENERATED",
    zone_id: "Z-1",
    forecast_start_date: "2026-01-01",
    required_robotaxi_quantity: 20,
    forecast_trend_series: { DAY: [
      { trend_date: "2026-01-01", elapsed_days: 0, planned_daily_orders: 100 },
      { trend_date: "2026-01-02", elapsed_days: 1, planned_daily_orders: 110 },
      { trend_date: "2026-01-03", elapsed_days: 2, planned_daily_orders: 120 },
    ] },
    created_at: "2026-01-01",
  }],
  calculationRun: { window_end_seconds: 86400 },
});
assert.equal(planningBaseline.alignedForecasts[0].aligned_planned_daily_orders, 110, "经营事实必须与预测中的同期周期点比较，而不是直接比较期末值");

const pool = createOperatingDataPool({
  metricObservations: result.metricObservations,
  metricDefinitions: definitions,
  metricCalculationRuns: [result.calculationRun],
  simulationRuns: [simulationRun],
  periodType: "ALL",
});
assert.deepEqual(Object.keys(OPERATING_ANALYSIS_PAGE_METRICS), ["operatingMetricsOverview", "serviceMetrics", "supplyAssetMetrics", "financialMetrics", "processDiagnostics", "decisionCenter"], "经营分析页面必须使用固定的五域结构并保留决策中心投影");
assert.equal(Object.keys(OPERATING_ANALYSIS_PAGE_MODELS).length, 5, "五个经营分析页面必须由统一分析模型服务驱动");
assert.ok(pool.pages.supplyAssetMetrics.length > 0, "供给资产页面必须读取统一经营数据池");
["operatingMetricsOverview", "serviceMetrics", "supplyAssetMetrics", "financialMetrics", "processDiagnostics"].forEach((page) => {
  assert.equal(getPageArchitecture(page).mode, "analysis", `${page} 必须使用分析页面框架`);
  assert.equal(getPageArchitecture(page).detailMode, "none", `${page} 不得显示对象详情栏`);
});

const mainSource = fs.readFileSync("src/main.jsx", "utf8");
assert.match(mainSource, /analysisModel=\{actions\.operatingDataPool\?\.analysisModels\?\.\[page\]\}/, "经营分析画布必须消费统一分析页面模型");
assert.doesNotMatch(mainSource, /const insightGroups = \[\s*createMetricInsightGroup/, "页面层不得继续硬编码经营指标组合");

console.log("v047 经营指标语义、经营数据池和五域分析模型验证通过。");

function order(id, status, seconds, extra = {}) {
  const day = Math.floor(seconds / 86400) + 1;
  const hour = Math.floor((seconds % 86400) / 3600);
  return { service_order_id: id, order_status: status, simulation_run_id: simulationRun.simulation_run_id, simulation_created_at: `Day${day} ${String(hour).padStart(2, "0")}:00:00`, ...extra };
}

function cost(id, type, amount) {
  return { cost_record_id: id, simulation_run_id: simulationRun.simulation_run_id, simulation_created_at: "Day1 01:00:00", cost_type: type, cost_amount: amount };
}

function latestById(observations) {
  return new Map(observations.map((item) => [item.metric_definition_id, item]));
}
