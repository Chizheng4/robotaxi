import * as metricCalculator from "../data/metricCalculator.js?v=20260715-v044-1-0";

export const OPERATING_ANALYSIS_PAGE_METRICS = Object.freeze({
  operatingMetricsOverview: ["OUTCOME-SERVICE-001", "OUTCOME-SERVICE-002", "PROCESS-ASSET-001", "PROCESS-EFF-002", "PROCESS-EFF-001", "OUTCOME-FIN-005"],
  financialMetrics: ["OUTCOME-FIN-001", "OUTCOME-FIN-002", "OUTCOME-FIN-003", "OUTCOME-FIN-004", "OUTCOME-FIN-005", "OUTCOME-FIN-006", "OUTCOME-EFF-001", "OUTCOME-EFF-002", "OUTCOME-EFF-003"],
  serviceMetrics: ["OUTCOME-SERVICE-001", "OUTCOME-SERVICE-002", "OUTCOME-SERVICE-003", "OUTCOME-SERVICE-004", "DEMAND-TREND-001", "DEMAND-TREND-002", "PROCESS-ASSET-001", "PROCESS-EFF-001", "PROCESS-EFF-002", "PROCESS-TRIP-001"],
  processDiagnostics: ["PROCESS-ASSET-001", "PROCESS-MATCH-001", "PROCESS-ROUTE-001", "PROCESS-TRIP-001", "PROCESS-EFF-001", "PROCESS-EFF-002", "QUALITY-DATA-001"],
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
  const planningBaseline = createPlanningBaseline({ businessTargets, demandForecasts, supplyPlans });
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
  });
}

export function createPlanningBaseline({ businessTargets = [], demandForecasts = [], supplyPlans = [] } = {}) {
  const businessTarget = newest(businessTargets.filter((item) => item.target_status === "ACTIVE"), "updated_at")
    || newest(businessTargets, "updated_at");
  const forecasts = latestBy(demandForecasts.filter((item) => item.forecast_status === "GENERATED"), "zone_id", "created_at");
  const plans = latestBy(supplyPlans.filter((item) => !["CANCELLED", "REJECTED"].includes(item.plan_status)), "target_zone_id", "updated_at");
  return Object.freeze({
    businessTarget,
    forecasts,
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
  const forecastDailyOrders = sum(forecasts, (item) => item.planned_daily_orders ?? item.market_forecast_daily_orders ?? item.forecast_daily_demand);
  const forecastRequiredRobotaxi = sum(forecasts, (item) => item.required_robotaxi_quantity ?? item.required_fleet_quantity);
  const plannedRobotaxi = sum(planningBaseline.supplyPlans || [], (item) => item.planned_robotaxi_count);
  const effectiveRobotaxi = robotaxis.filter((item) => !["PENDING_ADMISSION", "PENDING_DELIVERY", "RETIRED"].includes(item.availability_status || item.operational_status)).length;
  const createdOrders = numberValue(metricById.get("OUTCOME-SERVICE-001")?.metric_value);
  const operatingDays = Math.max(1, (Number(calculationRun?.window_end_seconds || 0) - Number(calculationRun?.window_start_seconds || 0)) / 86400);
  const actualDailyOrders = createdOrders == null ? null : createdOrders / operatingDays;
  const fulfilledOrders = numberValue(metricById.get("OUTCOME-SERVICE-002")?.metric_value);
  const fulfillmentRate = numberValue(metricById.get("OUTCOME-SERVICE-003")?.metric_value);
  const collectedRevenue = numberValue(metricById.get("OUTCOME-FIN-002")?.metric_value);
  const contributionMarginRate = numberValue(metricById.get("OUTCOME-FIN-006")?.metric_value);
  const averageRevenue = fulfilledOrders > 0 && collectedRevenue != null ? collectedRevenue / fulfilledOrders : null;
  return [
    comparison("PERFORMANCE-DEMAND-001", "日均订单规模", "需求", actualDailyOrders, forecastDailyOrders, target.target_end_daily_orders, "单/日", [...planningBaseline.forecastSourceRefs, ...planningBaseline.targetSourceRefs], sourceRefs(metricById.get("OUTCOME-SERVICE-001"))),
    comparison("PERFORMANCE-SERVICE-001", "订单履约率", "服务", fulfillmentRate, null, numberValue(target.target_order_fulfillment_rate), "比例", planningBaseline.targetSourceRefs, sourceRefs(metricById.get("OUTCOME-SERVICE-003"))),
    comparison("PERFORMANCE-ASSET-001", "有效 Robotaxi 规模", "资产", effectiveRobotaxi, forecastRequiredRobotaxi, numberValue(target.target_minimum_robotaxi_quantity), "辆", [...planningBaseline.forecastSourceRefs, ...planningBaseline.targetSourceRefs], robotaxis.map((item) => ({ object_type: "Robotaxi", object_id: item.robotaxi_id }))),
    comparison("PERFORMANCE-SUPPLY-001", "计划供给覆盖", "供给", plannedRobotaxi, forecastRequiredRobotaxi, null, "辆", [...planningBaseline.forecastSourceRefs, ...planningBaseline.supplySourceRefs], planningBaseline.supplySourceRefs),
    comparison("PERFORMANCE-FINANCE-001", "单均实收收入", "财务", averageRevenue, null, numberValue(target.average_revenue_per_order), "金额", planningBaseline.targetSourceRefs, sourceRefs(metricById.get("OUTCOME-FIN-002"))),
    comparison("PERFORMANCE-FINANCE-002", "贡献利润率", "财务", contributionMarginRate, null, numberValue(target.minimum_contribution_margin_rate), "比例", planningBaseline.targetSourceRefs, sourceRefs(metricById.get("OUTCOME-FIN-006"))),
  ];
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
