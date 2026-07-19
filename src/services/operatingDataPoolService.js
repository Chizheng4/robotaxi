import * as metricCalculator from "../data/metricCalculator.js?v=20260717-v047-0-0";
import { getMetricConcept } from "../domain/fieldSemanticRegistry.js?v=20260719-v047-4-0";

export const OPERATING_ANALYSIS_PAGE_METRICS = Object.freeze({
  operatingMetricsOverview: ["OUTCOME-SERVICE-001", "OUTCOME-SERVICE-002", "OUTCOME-SERVICE-003", "STATE-ASSET-002", "OUTCOME-FIN-005", "OUTCOME-FIN-010"],
  serviceMetrics: ["OUTCOME-SERVICE-001", "OUTCOME-SERVICE-002", "OUTCOME-SERVICE-003", "OUTCOME-SERVICE-004", "OUTCOME-SERVICE-005", "STATE-SERVICE-001", "STATE-SERVICE-002", "PROCESS-MATCH-001", "PROCESS-TRIP-001", "PROCESS-EFF-001", "PROCESS-EFF-002", "DEMAND-TREND-001"],
  supplyAssetMetrics: ["STATE-ASSET-001", "STATE-ASSET-002", "STATE-ASSET-003", "PROCESS-ASSET-001", "PROCESS-ASSET-002", "PROCESS-ASSET-003", "PROCESS-ASSET-004", "PROCESS-SUPPLY-001", "PROCESS-SUPPLY-002", "PROCESS-SUPPLY-003"],
  financialMetrics: ["OUTCOME-FIN-001", "OUTCOME-FIN-002", "OUTCOME-FIN-003", "OUTCOME-FIN-007", "OUTCOME-FIN-008", "OUTCOME-FIN-009", "OUTCOME-FIN-004", "OUTCOME-FIN-005", "OUTCOME-FIN-006", "OUTCOME-FIN-010", "OUTCOME-FIN-011", "OUTCOME-EFF-001", "OUTCOME-EFF-002", "OUTCOME-EFF-003"],
  processDiagnostics: ["QUALITY-DATA-001", "PROCESS-DECISION-001", "PROCESS-DECISION-002", "PROCESS-DECISION-003", "PROCESS-DECISION-004", "PROCESS-DECISION-005", "PROCESS-MATCH-001", "PROCESS-ROUTE-001", "PROCESS-TRIP-001"],
  decisionCenter: ["PROCESS-DECISION-001", "PROCESS-DECISION-002", "PROCESS-DECISION-003", "PROCESS-DECISION-004", "PROCESS-DECISION-005", "PROCESS-MATCH-001", "PROCESS-ROUTE-001", "OUTCOME-SERVICE-003", "PROCESS-ASSET-003", "OUTCOME-FIN-006"],
});

export const OPERATING_ANALYSIS_PAGE_MODELS = Object.freeze({
  operatingMetricsOverview: analysisPage("经营总览", "经营结果是否达到规划要求，主要偏差来自哪里？", [
    insight("经营结果", "OUTCOME-FIN-010", ["OUTCOME-FIN-005", "OUTCOME-SERVICE-003"]),
    insight("需求与服务", "OUTCOME-SERVICE-001", ["OUTCOME-SERVICE-002", "OUTCOME-SERVICE-003"]),
    insight("可用供给", "STATE-ASSET-002", ["STATE-SERVICE-001", "PROCESS-ASSET-003"]),
  ], { comparisonDomains: ["需求", "服务", "资产", "供给", "财务"] }),
  serviceMetrics: analysisPage("需求服务", "观察需求如何变化，现有供给能否稳定完成订单？", [
    insight("需求规模", "OUTCOME-SERVICE-001", ["STATE-SERVICE-001", "OUTCOME-SERVICE-005"]),
    insight("履约结果", "OUTCOME-SERVICE-003", ["PROCESS-TRIP-001", "OUTCOME-SERVICE-004"]),
    insight("服务效率", "PROCESS-EFF-002", ["PROCESS-EFF-001", "PROCESS-MATCH-001"]),
  ], { showDemandTrend: true, comparisonDomains: ["需求", "服务"] }),
  supplyAssetMetrics: analysisPage("供给资产", "供给形成到什么程度，Robotaxi 是否可用并被有效使用？", [
    insight("可用供给", "STATE-ASSET-002", ["STATE-ASSET-001", "STATE-ASSET-003"]),
    insight("供给形成", "PROCESS-SUPPLY-001", ["PROCESS-SUPPLY-002", "PROCESS-SUPPLY-003"]),
    insight("资产效率", "PROCESS-ASSET-004", ["PROCESS-ASSET-001", "PROCESS-ASSET-003"]),
  ], { comparisonDomains: ["供给", "资产"] }),
  financialMetrics: analysisPage("财务效率", "收入是否覆盖变动成本和全部运营成本，单均经济性是否健康？", [
    insight("经营贡献", "OUTCOME-FIN-005", ["OUTCOME-FIN-002", "OUTCOME-FIN-007"]),
    insight("模拟运营利润", "OUTCOME-FIN-010", ["OUTCOME-FIN-008", "OUTCOME-FIN-009"]),
    insight("单均经济性", "OUTCOME-EFF-003", ["OUTCOME-EFF-001", "OUTCOME-EFF-002"]),
  ], { comparisonDomains: ["财务"] }),
  processDiagnostics: analysisPage("经营诊断", "哪些过程、决策或数据问题正在影响经营结果？", [
    insight("数据可信度", "QUALITY-DATA-001", ["PROCESS-EFF-001", "PROCESS-EFF-002"]),
    insight("服务过程", "PROCESS-MATCH-001", ["PROCESS-ROUTE-001", "PROCESS-TRIP-001"]),
    insight("决策影响", "PROCESS-DECISION-004", ["PROCESS-DECISION-002", "PROCESS-DECISION-003"]),
  ], { comparisonDomains: [] }),
});

export function calculateOperatingDataPool({
  simulationRuns = [],
  scope = {},
  revenueRecords = [],
  costRecords = [],
  metricDefinitions = [],
  calculationRunId,
  periodType = metricCalculator.MetricPeriodType.ALL,
}) {
  return metricCalculator.createPeriodMetricCalculation({
    simulationRuns,
    scope,
    revenueRecords,
    costRecords,
    metricDefinitions,
    calculationRunId,
    periodType,
  });
}

export function createOperatingDataPool({
  metricObservations = [],
  metricDefinitions = [],
  metricCalculationRuns = [],
  simulationRuns = [],
  periodType = metricCalculator.MetricPeriodType.ALL,
  businessTargets = [],
  demandForecasts = [],
  supplyPlans = [],
  robotaxis = [],
} = {}) {
  const definitions = metricCalculator.normalizeMetricDefinitions(metricDefinitions);
  const definitionById = new Map(definitions.map((definition) => [definition.metric_definition_id, definition]));
  const runById = new Map((simulationRuns || []).map((run) => [run.simulation_run_id, run]));
  const allRows = (metricObservations || []).map((observation) => createDisplayRow(observation, definitionById, runById));
  allRows.sort(compareRowsNewestFirst);
  const periodRows = allRows.filter((row) => row.metric_scope_type === "OPERATING_PERIOD" && row.metric_period_type === periodType);
  const pages = Object.fromEntries(Object.entries(OPERATING_ANALYSIS_PAGE_METRICS).map(([page, metricIds]) => [
    page,
    pickLatestMetricRows(periodRows, metricIds),
  ]));
  const latestCalculationRun = getLatestCalculationRun(metricCalculationRuns, periodType);
  const planningBaseline = createPlanningBaseline({ businessTargets, demandForecasts, supplyPlans, calculationRun: latestCalculationRun });
  const comparisons = createPlanningComparisons({
    planningBaseline,
    metricRows: getLatestMetricRows(periodRows),
    robotaxis,
    calculationRun: latestCalculationRun,
  });
  return Object.freeze({
    poolVersion: latestCalculationRun?.metric_calculation_run_id || null,
    periodType,
    periodLabel: latestCalculationRun?.metric_period_label || null,
    updatedAt: latestCalculationRun?.completed_at || null,
    calculationRun: latestCalculationRun,
    stateLabel: latestCalculationRun
      ? `${latestCalculationRun.metric_calculation_run_id} · ${latestCalculationRun.calculation_status}`
      : "数据池尚未更新",
    definitions,
    rows: allRows,
    periodRows,
    pages,
    planningBaseline,
    comparisons,
    analysisModels: OPERATING_ANALYSIS_PAGE_MODELS,
  });
}

export function createPlanningBaseline({ businessTargets = [], demandForecasts = [], supplyPlans = [], calculationRun = null } = {}) {
  const businessTarget = newest(businessTargets.filter((item) => item.target_status === "ACTIVE"), "updated_at")
    || newest(businessTargets, "updated_at");
  const forecasts = latestBy(demandForecasts.filter((item) => item.forecast_status === "GENERATED"), "zone_id", "created_at");
  const plans = latestBy(supplyPlans.filter((item) => !["CANCELLED", "REJECTED"].includes(item.plan_status)), "target_zone_id", "updated_at");
  const elapsedDays = Math.max(0, Math.floor(Number(calculationRun?.window_end_seconds || 0) / 86400));
  const alignedForecasts = forecasts.map((forecast) => alignForecastToOperatingDay(forecast, elapsedDays));
  return Object.freeze({
    businessTarget,
    forecasts,
    alignedForecasts,
    elapsedOperatingDays: elapsedDays,
    supplyPlans: plans,
    targetSourceRefs: businessTarget ? [{ object_type: "BusinessTarget", object_id: businessTarget.business_target_id }] : [],
    forecastSourceRefs: forecasts.map((item) => ({ object_type: "LongTermDemandForecastResult", object_id: item.forecast_result_id })),
    supplySourceRefs: plans.map((item) => ({ object_type: "SupplyPlan", object_id: item.supply_plan_id })),
  });
}

export function createPlanningComparisons({ planningBaseline = {}, metricRows = [], robotaxis = [], calculationRun = null } = {}) {
  const target = planningBaseline.businessTarget || {};
  const forecasts = planningBaseline.forecasts || [];
  const metricById = new Map(metricRows.map((row) => [row.metric_definition_id, row]));
  const alignedForecasts = planningBaseline.alignedForecasts?.length ? planningBaseline.alignedForecasts : forecasts;
  const forecastDailyOrders = sum(alignedForecasts, (item) => item.aligned_planned_daily_orders ?? item.planned_daily_orders ?? item.market_forecast_daily_orders ?? item.forecast_daily_demand);
  const forecastRequiredRobotaxi = sum(alignedForecasts, (item) => item.aligned_required_robotaxi_quantity ?? item.required_robotaxi_quantity ?? item.required_fleet_quantity);
  const plannedRobotaxi = sum(planningBaseline.supplyPlans || [], (item) => item.planned_robotaxi_count);
  const effectiveRobotaxi = robotaxis.filter((item) => !["PENDING_ADMISSION", "PENDING_DELIVERY", "RETIRED"].includes(item.availability_status || item.operational_status)).length;
  const createdOrders = numberValue(metricById.get("OUTCOME-SERVICE-001")?.metric_value);
  const operatingDays = Math.max(1, (Number(calculationRun?.window_end_seconds || 0) - Number(calculationRun?.window_start_seconds || 0)) / 86400);
  const actualDailyOrders = createdOrders == null ? null : createdOrders / operatingDays;
  const fulfilledOrders = numberValue(metricById.get("OUTCOME-SERVICE-002")?.metric_value);
  const fulfillmentRate = numberValue(metricById.get("OUTCOME-SERVICE-003")?.metric_value);
  const orderServiceTimeUtilization = numberValue(metricById.get("PROCESS-ASSET-002")?.metric_value);
  const collectedRevenue = numberValue(metricById.get("OUTCOME-FIN-002")?.metric_value);
  const contributionMarginRate = numberValue(metricById.get("OUTCOME-FIN-006")?.metric_value);
  const averageRevenue = fulfilledOrders > 0 && collectedRevenue != null ? collectedRevenue / fulfilledOrders : null;
  return [
    comparison("PERFORMANCE-DEMAND-001", "日均订单规模", "需求", actualDailyOrders, forecastDailyOrders, target.target_end_daily_orders, "单/日", [...planningBaseline.forecastSourceRefs, ...planningBaseline.targetSourceRefs], sourceRefs(metricById.get("OUTCOME-SERVICE-001"))),
    comparison("PERFORMANCE-SERVICE-001", getMetricConcept("ORDER_FULFILLMENT_RATE").label, "服务", fulfillmentRate, null, numberValue(target.target_order_fulfillment_rate), "比例", planningBaseline.targetSourceRefs, sourceRefs(metricById.get("OUTCOME-SERVICE-003"))),
    comparison("PERFORMANCE-ASSET-002", getMetricConcept("ORDER_SERVICE_TIME_UTILIZATION_RATE").label, "资产", orderServiceTimeUtilization, null, numberValue(target.target_order_service_time_utilization_rate ?? target.target_task_utilization_rate), "比例", planningBaseline.targetSourceRefs, sourceRefs(metricById.get("PROCESS-ASSET-002"))),
    comparison("PERFORMANCE-ASSET-001", "有效 Robotaxi 规模", "资产", effectiveRobotaxi, forecastRequiredRobotaxi, numberValue(target.target_minimum_robotaxi_quantity), "辆", [...planningBaseline.forecastSourceRefs, ...planningBaseline.targetSourceRefs], robotaxis.map((item) => ({ object_type: "Robotaxi", object_id: item.robotaxi_id }))),
    comparison("PERFORMANCE-SUPPLY-001", "计划供给覆盖", "供给", plannedRobotaxi, forecastRequiredRobotaxi, null, "辆", [...planningBaseline.forecastSourceRefs, ...planningBaseline.supplySourceRefs], planningBaseline.supplySourceRefs),
    comparison("PERFORMANCE-FINANCE-001", "单均实收收入", "财务", averageRevenue, null, numberValue(target.average_revenue_per_order), "金额", planningBaseline.targetSourceRefs, sourceRefs(metricById.get("OUTCOME-FIN-002"))),
    comparison("PERFORMANCE-FINANCE-002", "经营贡献率", "财务", contributionMarginRate, null, numberValue(target.minimum_contribution_margin_rate), "比例", planningBaseline.targetSourceRefs, sourceRefs(metricById.get("OUTCOME-FIN-006"))),
  ];
}

function alignForecastToOperatingDay(forecast, elapsedDays) {
  const dailySeries = forecast?.forecast_trend_series?.DAY || [];
  if (!dailySeries.length) return { ...forecast, aligned_elapsed_days: elapsedDays, aligned_forecast_date: null };
  const point = dailySeries.reduce((best, item) => (
    Math.abs(Number(item.elapsed_days || 0) - elapsedDays) < Math.abs(Number(best?.elapsed_days || 0) - elapsedDays) ? item : best
  ), dailySeries[0]);
  const supplyPoint = (forecast.supply_trend_series || []).reduce((best, item) => {
    const start = Date.parse(forecast.forecast_start_date || "");
    const date = Date.parse(item.trend_date || "");
    const itemDays = Number.isFinite(start) && Number.isFinite(date) ? Math.max(0, Math.round((date - start) / 86400000)) : 0;
    return Math.abs(itemDays - elapsedDays) < Math.abs(Number(best?.distance ?? Infinity)) ? { item, distance: itemDays - elapsedDays } : best;
  }, null)?.item;
  return {
    ...forecast,
    aligned_elapsed_days: elapsedDays,
    aligned_forecast_date: point.trend_date,
    aligned_planned_daily_orders: point.planned_daily_orders,
    aligned_market_daily_orders: point.market_daily_orders,
    aligned_required_robotaxi_quantity: forecast.required_robotaxi_quantity,
    aligned_cumulative_production_quantity: supplyPoint?.cumulative_production_quantity ?? null,
    aligned_cumulative_delivery_quantity: supplyPoint?.cumulative_delivery_quantity ?? null,
  };
}

function analysisPage(title, managementQuestion, insightGroups, options = {}) {
  return Object.freeze({ title, managementQuestion, insightGroups: Object.freeze(insightGroups), ...options });
}

function insight(title, primaryMetricId, secondaryMetricIds) {
  return Object.freeze({ title, primaryMetricId, secondaryMetricIds: Object.freeze(secondaryMetricIds) });
}

export function getLatestMetricRows(rows = []) {
  const latestByMetricId = new Map();
  rows.forEach((row) => {
    if (!latestByMetricId.has(row.metric_definition_id)) latestByMetricId.set(row.metric_definition_id, row);
  });
  return [...latestByMetricId.values()];
}

export function getLatestCalculationRun(metricCalculationRuns = [], periodType = metricCalculator.MetricPeriodType.ALL) {
  return (metricCalculationRuns || []).find((run) => (
    run.metric_scope_type === "OPERATING_PERIOD" && run.metric_period_type === periodType
  )) || null;
}

function createDisplayRow(observation, definitionById, runById) {
  const definition = definitionById.get(observation.metric_definition_id) || {};
  const run = runById.get(observation.simulation_run_id) || {};
  const hasDefinition = Boolean(definition.metric_definition_id);
  return {
    ...definition,
    ...observation,
    metric_name_cn: hasDefinition ? definition.metric_name_cn : "指标定义缺失",
    metric_name_en: hasDefinition ? definition.metric_name_en : null,
    metric_domain: hasDefinition ? definition.metric_domain : "QUALITY",
    metric_layer: hasDefinition ? definition.metric_layer : "QUALITY",
    calculation_formula: hasDefinition ? definition.calculation_formula : "缺少指标定义，无法展示计算公式",
    business_definition: hasDefinition ? definition.business_definition : "缺少指标定义，请检查统一指标目录",
    display_unit: hasDefinition ? definition.display_unit : observation.metric_unit,
    simulation_name: run.simulation_name,
    completed_time: run.completed_time,
    completed_at: run.completed_at,
  };
}

function pickLatestMetricRows(rows, metricIds) {
  const latestByMetricId = new Map();
  rows.forEach((row) => {
    if (metricIds.includes(row.metric_definition_id) && !latestByMetricId.has(row.metric_definition_id)) {
      latestByMetricId.set(row.metric_definition_id, row);
    }
  });
  return metricIds.map((id) => latestByMetricId.get(id)).filter(Boolean);
}

function compareRowsNewestFirst(left, right) {
  const createdOrder = String(right.created_at || "").localeCompare(String(left.created_at || ""));
  if (createdOrder !== 0) return createdOrder;
  const runOrder = String(right.metric_calculation_run_id || "").localeCompare(String(left.metric_calculation_run_id || ""));
  if (runOrder !== 0) return runOrder;
  return String(left.metric_definition_id || "").localeCompare(String(right.metric_definition_id || ""));
}

function comparison(id, name, domain, actualValue, forecastValue, targetValue, unit, planningSourceRefs, factSourceRefs) {
  const baseline = forecastValue ?? targetValue;
  const varianceToForecast = actualValue != null && forecastValue != null ? actualValue - forecastValue : null;
  const varianceToTarget = actualValue != null && targetValue != null ? actualValue - targetValue : null;
  const attainmentRate = actualValue != null && baseline != null && baseline !== 0 ? actualValue / baseline : null;
  return Object.freeze({
    performance_indicator_id: id,
    performance_indicator_name: name,
    performance_domain: domain,
    actual_value: actualValue,
    forecast_value: forecastValue,
    target_value: targetValue,
    variance_to_forecast: varianceToForecast,
    variance_to_target: varianceToTarget,
    attainment_rate: attainmentRate,
    performance_status: actualValue == null || baseline == null ? "INSUFFICIENT_DATA" : attainmentRate >= 1 ? "ACHIEVED" : attainmentRate >= 0.8 ? "WATCH" : "OFF_TRACK",
    value_unit: unit,
    comparison_explanation: actualValue == null ? "实际事实尚未形成" : baseline == null ? "规划基线尚未形成" : `实际值与${forecastValue != null ? "同期预测" : "经营目标"}比较`,
    planning_source_refs: planningSourceRefs || [],
    fact_source_refs: factSourceRefs || [],
  });
}

function newest(items = [], field) {
  return [...items].sort((left, right) => String(right?.[field] || right?.created_at || "").localeCompare(String(left?.[field] || left?.created_at || "")))[0] || null;
}

function latestBy(items = [], keyField, timeField) {
  const byKey = new Map();
  [...items].sort((left, right) => String(right?.[timeField] || "").localeCompare(String(left?.[timeField] || ""))).forEach((item) => {
    const key = item?.[keyField] || item?.forecast_result_id || item?.supply_plan_id;
    if (!byKey.has(key)) byKey.set(key, item);
  });
  return [...byKey.values()];
}

function sum(items = [], selector) {
  return items.reduce((total, item) => total + (numberValue(selector(item)) || 0), 0);
}

function numberValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function sourceRefs(metric) {
  return metric?.source_object_refs || [];
}
