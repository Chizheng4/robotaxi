import assert from "node:assert/strict";
import fs from "node:fs";
import { createOperatingDataPool, createPlanningBaseline, createPlanningComparisons } from "../src/services/operatingDataPoolService.js";
import { getMapObjectPresentation } from "../src/ui/mapSceneService.js";
import { resolvePageContext, resolvePagePresentation } from "../src/ui/pageContextService.js";
import { metricObjectSchemas } from "../src/ui/metricObjectPresentationService.js";

const observations = [
  metric("OUTCOME-SERVICE-001", 80),
  metric("OUTCOME-SERVICE-002", 68),
  metric("OUTCOME-SERVICE-003", 0.85),
  metric("OUTCOME-FIN-002", 3264),
  metric("OUTCOME-FIN-006", 0.32),
];
const planningBaseline = createPlanningBaseline({
  businessTargets: [{ business_target_id: "BT-1", target_status: "ACTIVE", target_end_daily_orders: 100, target_order_fulfillment_rate: 0.9, average_revenue_per_order: 50, minimum_contribution_margin_rate: 0.3, updated_at: "2026-07-15T00:00:00+08:00" }],
  demandForecasts: [{ forecast_result_id: "F-1", forecast_status: "GENERATED", zone_id: "Z-1", planned_daily_orders: 90, required_robotaxi_quantity: 12, created_at: "2026-07-15T00:00:00+08:00" }],
  supplyPlans: [{ supply_plan_id: "SP-1", target_zone_id: "Z-1", plan_status: "CONFIRMED", planned_robotaxi_count: 10, updated_at: "2026-07-15T00:00:00+08:00" }],
});
const comparisons = createPlanningComparisons({
  planningBaseline,
  metricRows: observations,
  robotaxis: Array.from({ length: 10 }, (_, index) => ({ robotaxi_id: `RTX-${index + 1}`, availability_status: "AVAILABLE" })),
  calculationRun: { window_start_seconds: 0, window_end_seconds: 86400 },
});
assert.equal(comparisons.length, 6, "统一数据池必须输出需求、供给、服务、资产和财务比较");
assert.equal(comparisons.find((item) => item.performance_indicator_id === "PERFORMANCE-DEMAND-001").actual_value, 80, "实际日均订单必须按经营周期天数计算");
assert.equal(comparisons.find((item) => item.performance_indicator_id === "PERFORMANCE-SERVICE-001").performance_status, "WATCH", "表现状态必须由统一比较规则生成");

const pool = createOperatingDataPool({
  metricObservations: observations,
  metricDefinitions: observations.map((item) => ({ metric_definition_id: item.metric_definition_id, metric_name_cn: item.metric_definition_id, metric_status: "ACTIVE" })),
  metricCalculationRuns: [{ metric_calculation_run_id: "MCR-1", metric_scope_type: "OPERATING_PERIOD", metric_period_type: "ALL", window_start_seconds: 0, window_end_seconds: 86400 }],
  periodType: "ALL",
  businessTargets: [planningBaseline.businessTarget],
  demandForecasts: planningBaseline.forecasts,
  supplyPlans: planningBaseline.supplyPlans,
  robotaxis: Array.from({ length: 10 }, (_, index) => ({ robotaxi_id: `RTX-${index + 1}`, availability_status: "AVAILABLE" })),
});
assert.equal(pool.poolVersion, "MCR-1", "所有经营分析页必须共享同一数据池版本");
assert.equal(pool.comparisons.length, 6, "统一数据池必须包含规划与事实比较");

const mapData = {
  places: [{ place_id: "P-1", place_name: "办公区", place_type: "OFFICE" }],
  demandProfiles: [{ target_object_type: "PLACE", target_object_id: "P-1", baseline_addressable_daily_orders: 120, place_period_growth_rate: 0.02, peak_pattern: "WORKDAY_PEAK", calculated_at: "2026-07-15" }],
};
const presentation = getMapObjectPresentation("place", "P-1", mapData);
assert.deepEqual(presentation.fields.map((item) => item.field), ["baseline_addressable_daily_orders", "place_period_growth_rate", "peak_pattern"], "地图摘要必须读取对象与画像的关键字段");

const context = resolvePageContext({ page: "financialMetrics", menuLabel: "财务表现", config: { title: "旧标题", description: "旧说明" } });
assert.equal(context.title, "财务表现", "页面标题必须与菜单统一");
assert.match(context.description, /经营目标/, "经营分析页面说明必须表达规划与事实关系");

const mainSource = fs.readFileSync("src/main.jsx", "utf8");
const navigationSource = fs.readFileSync("src/ui/navigationRegistry.js", "utf8");
assert.match(mainSource, /operatingDataPool\?\.comparisons/, "经营分析画布必须消费数据池比较结果");
assert.equal(resolvePagePresentation("financialMetrics").usesDetailRail, false, "经营分析页必须通过统一展示服务隐藏常驻右侧详情");
assert.match(mainSource, /pageContextService\.resolvePagePresentation\(activePage\)/, "工作台必须消费统一页面展示合同");
assert.match(mainSource, /pageContextService\.resolvePageContext/, "页面标题和说明必须通过统一上下文服务解析");
assert.match(mainSource, /metricObjectPresentationService\?\.metricObjectSchemas/, "数据计算详情必须消费统一指标对象展示服务");
assert.match(navigationSource, /page\("metricCalculationRuns", "计算记录"\)/, "指标计算记录菜单必须使用简洁名称");
assert.ok(metricObjectSchemas.metricDefinition.tabs.some((tab) => tab.key === "calculation"), "指标定义详情必须解释计算逻辑");
assert.ok(metricObjectSchemas.metricObservation.tabs.some((tab) => tab.key === "source"), "指标观测详情必须支持来源追溯");
assert.ok(metricObjectSchemas.metricCalculationRun.tabs.some((tab) => tab.key === "issues"), "计算记录详情必须提供问题处理分组");
assert.ok(!metricObjectSchemas.metricDefinition.tabs.flatMap((tab) => tab.fields).includes("metric_name_en"), "指标详情不得展示英文名称");

console.log("v044 统一经营数据池、规划比较、地图摘要和页面上下文验证通过。");

function metric(id, value) {
  return {
    metric_observation_id: `MO-${id}`,
    metric_definition_id: id,
    metric_scope_type: "OPERATING_PERIOD",
    metric_period_type: "ALL",
    metric_calculation_run_id: "MCR-1",
    metric_value: value,
    created_at: "2026-07-15T00:00:00+08:00",
    source_object_refs: [{ object_type: "Fact", object_id: id }],
  };
}
