export const MetricLayer = {
  PROCESS: "PROCESS",
  OUTCOME: "OUTCOME",
  QUALITY: "QUALITY",
};

export const MetricDomain = {
  DEMAND: "DEMAND",
  FINANCE: "FINANCE",
  SERVICE: "SERVICE",
  EFFICIENCY: "EFFICIENCY",
  ASSET: "ASSET",
  MATCHING: "MATCHING",
  ROUTING: "ROUTING",
  SUPPLY: "SUPPLY",
  QUALITY: "QUALITY",
};

export const MetricCalculationStatus = {
  QUEUED: "QUEUED",
  CALCULATING: "CALCULATING",
  SUCCEEDED: "SUCCEEDED",
  PARTIALLY_SUCCEEDED: "PARTIALLY_SUCCEEDED",
  FAILED: "FAILED",
};

export const MetricQualityStatus = {
  PASS: "PASS",
  WARN: "WARN",
  FAIL: "FAIL",
};

export const MetricUnit = {
  CURRENCY: "currency",
  PERCENT: "percent",
  COUNT: "count",
  SECOND: "second",
  MINUTE: "minute",
  KM: "km",
};

export const MetricScopeType = {
  SIMULATION_RUN: "SIMULATION_RUN",
  OPERATING_PERIOD: "OPERATING_PERIOD",
};

export const MetricPeriodType = {
  ALL: "ALL",
  LATEST_DAY: "LATEST_DAY",
  LATEST_7_DAYS: "LATEST_7_DAYS",
};

export const defaultMetricDefinitions = [
  definition("OUTCOME-FIN-001", "应收收入", "Receivable Revenue", MetricDomain.FINANCE, "sum(RECEIVABLE_REVENUE.revenue_amount)", ["RevenueRecord"], ["revenue_type", "revenue_amount"], MetricUnit.CURRENCY, true),
  definition("OUTCOME-FIN-002", "实收收入", "Collected Revenue", MetricDomain.FINANCE, "sum(COLLECTED_REVENUE.revenue_amount)", ["RevenueRecord"], ["revenue_type", "revenue_amount"], MetricUnit.CURRENCY, true),
  definition("OUTCOME-FIN-003", "未收收入", "Unreceived Revenue", MetricDomain.FINANCE, "sum(UNRECEIVED_REVENUE.revenue_amount)", ["RevenueRecord"], ["revenue_type", "revenue_amount"], MetricUnit.CURRENCY, false),
  definition("OUTCOME-FIN-004", "运营总成本", "Total Operating Cost", MetricDomain.FINANCE, "sum(CostRecord.cost_amount)", ["CostRecord"], ["cost_amount"], MetricUnit.CURRENCY, false),
  definition("OUTCOME-FIN-005", "贡献利润", "Contribution Profit", MetricDomain.FINANCE, "COLLECTED_REVENUE - TOTAL_OPERATING_COST", ["RevenueRecord", "CostRecord"], ["revenue_amount", "cost_amount"], MetricUnit.CURRENCY, true),
  definition("OUTCOME-FIN-006", "贡献利润率", "Contribution Margin", MetricDomain.FINANCE, "Contribution Profit / Collected Revenue", ["RevenueRecord", "CostRecord"], ["revenue_amount", "cost_amount"], MetricUnit.PERCENT, true),
  definition("OUTCOME-SERVICE-001", "创建订单数", "Created Orders", MetricDomain.SERVICE, "count(ServiceOrder)", ["ServiceOrder"], ["service_order_id"], MetricUnit.COUNT, true),
  definition("OUTCOME-SERVICE-002", "完成订单数", "Completed Orders", MetricDomain.SERVICE, "count(order_status = COMPLETED)", ["ServiceOrder"], ["order_status"], MetricUnit.COUNT, true),
  definition("OUTCOME-SERVICE-003", "订单履约率", "Order Fulfillment Rate", MetricDomain.SERVICE, "Completed Orders / Created Orders", ["ServiceOrder"], ["order_status"], MetricUnit.PERCENT, true),
  definition("OUTCOME-SERVICE-004", "订单取消率", "Order Cancellation Rate", MetricDomain.SERVICE, "Cancelled Orders / Created Orders", ["ServiceOrder"], ["order_status"], MetricUnit.PERCENT, false),
  definition("OUTCOME-EFF-001", "单均收入", "Revenue per Completed Order", MetricDomain.FINANCE, "Collected Revenue / Completed Orders", ["RevenueRecord", "ServiceOrder"], ["revenue_amount", "order_status"], MetricUnit.CURRENCY, true),
  definition("OUTCOME-EFF-002", "单均运营成本", "Operating Cost per Completed Order", MetricDomain.FINANCE, "Total Operating Cost / Completed Orders", ["CostRecord", "ServiceOrder"], ["cost_amount", "order_status"], MetricUnit.CURRENCY, false),
  definition("OUTCOME-EFF-003", "单均贡献利润", "Contribution Profit per Completed Order", MetricDomain.FINANCE, "Contribution Profit / Completed Orders", ["RevenueRecord", "CostRecord", "ServiceOrder"], ["revenue_amount", "cost_amount", "order_status"], MetricUnit.CURRENCY, true),
  definition("DEMAND-TREND-001", "每小时订单数", "Hourly Order Count", MetricDomain.DEMAND, "count(ServiceOrder) by simulation hour", ["ServiceOrder"], ["simulation_created_at"], MetricUnit.COUNT, true, MetricLayer.PROCESS, ["simulation_hour"]),
  definition("DEMAND-TREND-002", "时段订单数", "Time Segment Order Count", MetricDomain.DEMAND, "count(ServiceOrder) by PEAK / NORMAL / OFF_PEAK", ["ServiceOrder"], ["simulation_created_at"], MetricUnit.COUNT, true, MetricLayer.PROCESS, ["time_segment"]),
  definition("PROCESS-ASSET-001", "履约车辆覆盖率", "Fulfillment Robotaxi Coverage Rate", MetricDomain.ASSET, "Robotaxi with completed ServiceOrder / effective Robotaxi", ["Robotaxi", "ServiceOrder"], ["robotaxi_id", "order_status", "availability_status"], MetricUnit.PERCENT, true, MetricLayer.PROCESS),
  definition("PROCESS-MATCH-001", "Robotaxi 分配成功率", "Robotaxi Assignment Success Rate", MetricDomain.MATCHING, "Assigned Orders / Created Orders", ["ServiceOrder", "OrderMatchingDecision"], ["order_status", "selected_robotaxi_id"], MetricUnit.PERCENT, true, MetricLayer.PROCESS),
  definition("PROCESS-ROUTE-001", "路径规划成功率", "Route Planning Success Rate", MetricDomain.ROUTING, "Successful RoutePlanningRun / RoutePlanningRun", ["RoutePlanningRun"], ["planning_result", "result_route_id"], MetricUnit.PERCENT, true, MetricLayer.PROCESS),
  definition("PROCESS-TRIP-001", "履约完成率", "Trip Completion Rate", MetricDomain.SERVICE, "Completed Trips / Trips", ["Trip"], ["trip_status"], MetricUnit.PERCENT, true, MetricLayer.PROCESS),
  definition("PROCESS-EFF-001", "平均履约距离", "Average Fulfillment Distance", MetricDomain.EFFICIENCY, "sum(ServiceOrder.fulfillment_distance_km) / Completed Orders", ["ServiceOrder"], ["fulfillment_distance_km", "order_status"], MetricUnit.KM, false, MetricLayer.PROCESS),
  definition("PROCESS-EFF-002", "平均履约耗时", "Average Fulfillment Duration", MetricDomain.EFFICIENCY, "sum(ServiceOrder.fulfillment_duration_min) / Completed Orders", ["ServiceOrder"], ["fulfillment_duration_min", "order_status"], MetricUnit.MINUTE, false, MetricLayer.PROCESS),
  definition("QUALITY-DATA-001", "关键数据完整率", "Critical Data Completeness Rate", MetricDomain.QUALITY, "complete critical inputs / required critical inputs", ["SimulationRun", "RevenueRecord", "CostRecord", "ServiceOrder"], ["cost_calculation_status", "revenue_calculation_status", "simulation_created_at"], MetricUnit.PERCENT, true, MetricLayer.QUALITY),
];

export function initializeDefaultMetricDefinitions() {
  return defaultMetricDefinitions.map((item) => ({ ...item }));
}

export function createMetricCalculation({
  simulationRun,
  scope,
  revenueRecords = [],
  costRecords = [],
  metricDefinitions = initializeDefaultMetricDefinitions(),
  calculationRunId,
  algorithmVersion = "1.0.0",
}) {
  return createCalculationFromContext(createSimulationRunMetricContext({
    simulationRun,
    scope,
    revenueRecords,
    costRecords,
    calculationRunId,
  }), normalizeMetricDefinitions(metricDefinitions), algorithmVersion);
}

export function createPeriodMetricCalculation({
  simulationRuns = [],
  scope,
  revenueRecords = [],
  costRecords = [],
  metricDefinitions = initializeDefaultMetricDefinitions(),
  calculationRunId,
  periodType = MetricPeriodType.ALL,
  algorithmVersion = "1.0.0",
}) {
  return createCalculationFromContext(createOperatingPeriodMetricContext({
    simulationRuns,
    scope,
    revenueRecords,
    costRecords,
    calculationRunId,
    periodType,
  }), normalizeMetricDefinitions(metricDefinitions), algorithmVersion);
}

export function getMetricPeriodOptions() {
  return [
    { value: MetricPeriodType.ALL, label: "全量经营周期" },
    { value: MetricPeriodType.LATEST_DAY, label: "最近 1 个模拟日" },
    { value: MetricPeriodType.LATEST_7_DAYS, label: "最近 7 个模拟日" },
  ];
}

function createCalculationFromContext(context, definitions, algorithmVersion) {
  const startedAt = new Date().toISOString();
  context.createdAt = startedAt;
  let observationSequence = 0;
  const observations = definitions
    .filter((item) => item.metric_status === "ACTIVE")
    .flatMap((metricDefinition) => calculateObservations(metricDefinition, context, () => {
      observationSequence += 1;
      return observationSequence;
    }));
  const failedCount = observations.filter((item) => item.quality_status === MetricQualityStatus.FAIL).length;
  const warnCount = observations.filter((item) => item.quality_status === MetricQualityStatus.WARN).length;
  const status = observations.length > 0 && failedCount >= observations.length
    ? MetricCalculationStatus.FAILED
    : failedCount > 0 || warnCount > 0
      ? MetricCalculationStatus.PARTIALLY_SUCCEEDED
      : MetricCalculationStatus.SUCCEEDED;
  const errors = observations
    .filter((item) => item.quality_status !== MetricQualityStatus.PASS)
    .map((item) => ({
      metric_definition_id: item.metric_definition_id,
      error_type: item.quality_status === MetricQualityStatus.FAIL ? "METRIC_QUALITY_FAILED" : "METRIC_QUALITY_WARN",
      error_message: item.quality_reason,
    }));
  return {
    metricObservations: observations,
    calculationRun: {
      metric_calculation_run_id: context.calculationRunId,
      metric_scope_type: context.metricScopeType,
      metric_period_type: context.metricPeriodType,
      metric_period_label: context.metricPeriodLabel,
      simulation_run_id: context.simulationRun?.simulation_run_id || null,
      simulation_run_ids: context.simulationRunIds,
      simulation_timeline_id: context.simulationTimelineId,
      calculation_status: status,
      calculation_progress_percent: 100,
      metric_definition_count: definitions.filter((item) => item.metric_status === "ACTIVE").length,
      generated_metric_observation_count: observations.length,
      error_count: errors.length,
      calculation_errors: errors,
      algorithm_version: algorithmVersion,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    },
  };
}

function createSimulationRunMetricContext({ simulationRun, scope, revenueRecords = [], costRecords = [], calculationRunId }) {
  const runRevenueRecords = (revenueRecords || []).filter((record) => record.simulation_run_id === simulationRun.simulation_run_id);
  const runCostRecords = (costRecords || []).filter((record) => record.simulation_run_id === simulationRun.simulation_run_id);
  return {
    simulationRun,
    simulationRunIds: [simulationRun.simulation_run_id],
    simulationTimelineId: simulationRun.simulation_timeline_id || null,
    metricScopeType: MetricScopeType.SIMULATION_RUN,
    metricPeriodType: "SIMULATION_RUN",
    metricPeriodLabel: simulationRun.simulation_name || simulationRun.simulation_run_id,
    scope: scope || {},
    revenueRecords: runRevenueRecords,
    costRecords: runCostRecords,
    calculationRunId,
  };
}

function createOperatingPeriodMetricContext({ simulationRuns = [], scope = {}, revenueRecords = [], costRecords = [], calculationRunId, periodType }) {
  const period = resolveOperatingPeriod(simulationRuns, periodType);
  const runIds = new Set(period.simulationRuns.map((run) => run.simulation_run_id).filter(Boolean));
  const scopedRunIds = runIds.size > 0 ? runIds : new Set((simulationRuns || []).map((run) => run.simulation_run_id).filter(Boolean));
  const filteredScope = filterScopeByOperatingPeriod(scope || {}, scopedRunIds, period);
  return {
    simulationRun: createPeriodAnchor(period, scopedRunIds),
    simulationRunIds: [...scopedRunIds],
    simulationTimelineId: period.simulationTimelineId,
    metricScopeType: MetricScopeType.OPERATING_PERIOD,
    metricPeriodType: period.periodType,
    metricPeriodLabel: period.periodLabel,
    scope: filteredScope,
    revenueRecords: filterRecordsByOperatingPeriod(revenueRecords, scopedRunIds, period),
    costRecords: filterRecordsByOperatingPeriod(costRecords, scopedRunIds, period),
    calculationRunId,
  };
}

function resolveOperatingPeriod(simulationRuns = [], periodType = MetricPeriodType.ALL) {
  const normalizedRuns = (simulationRuns || []).filter((run) => run?.simulation_run_id);
  const endSeconds = Math.max(0, ...normalizedRuns.map((run) => getRunEndSeconds(run)));
  const earliestStartSeconds = normalizedRuns.length
    ? Math.min(...normalizedRuns.map((run) => getRunStartSeconds(run)))
    : 0;
  const startSeconds = periodType === MetricPeriodType.LATEST_DAY
    ? Math.max(0, endSeconds - 86400)
    : periodType === MetricPeriodType.LATEST_7_DAYS
      ? Math.max(0, endSeconds - 86400 * 7)
      : earliestStartSeconds;
  const periodRuns = periodType === MetricPeriodType.ALL
    ? normalizedRuns
    : normalizedRuns.filter((run) => getRunEndSeconds(run) >= startSeconds && getRunStartSeconds(run) <= endSeconds);
  return {
    periodType,
    periodLabel: getPeriodLabel(periodType, startSeconds, endSeconds),
    startSeconds,
    endSeconds,
    simulationRuns: periodRuns,
    simulationTimelineId: periodRuns.find((run) => run.simulation_timeline_id)?.simulation_timeline_id || null,
  };
}

function createPeriodAnchor(period, runIds) {
  return {
    simulation_run_id: null,
    simulation_name: period.periodLabel,
    simulation_timeline_id: period.simulationTimelineId,
    start_simulation_seconds: period.startSeconds,
    end_simulation_seconds: period.endSeconds,
    start_time: formatMetricPeriodTime(period.startSeconds),
    completed_time: formatMetricPeriodTime(period.endSeconds),
    cost_calculation_status: "SUCCEEDED",
    revenue_calculation_status: "SUCCEEDED",
    source_simulation_run_count: runIds.size,
  };
}

function getRunStartSeconds(run) {
  return Number(run.start_simulation_seconds ?? run.simulation_start_seconds ?? 0) || 0;
}

function getRunEndSeconds(run) {
  return Number(run.end_simulation_seconds ?? run.simulation_end_seconds ?? run.current_simulation_seconds ?? getRunStartSeconds(run)) || 0;
}

function getPeriodLabel(periodType, startSeconds, endSeconds) {
  const option = getMetricPeriodOptions().find((item) => item.value === periodType);
  return `${option?.label || "经营周期"}：${formatMetricPeriodTime(startSeconds)} - ${formatMetricPeriodTime(endSeconds)}`;
}

function formatMetricPeriodTime(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds || 0));
  const day = Math.floor(seconds / 86400) + 1;
  const secondsInDay = seconds % 86400;
  const hour = Math.floor(secondsInDay / 3600);
  const minute = Math.floor((secondsInDay % 3600) / 60);
  const second = Math.floor(secondsInDay % 60);
  return `Day${day} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
}

function filterScopeByOperatingPeriod(scope, runIds, period) {
  const shouldKeep = (item) => recordBelongsToOperatingPeriod(item, runIds, period);
  return {
    ...scope,
    serviceOrders: (scope.serviceOrders || []).filter(shouldKeep),
    trips: (scope.trips || []).filter(shouldKeep),
    readinessTasks: (scope.readinessTasks || []).filter(shouldKeep),
    deploymentTasks: (scope.deploymentTasks || []).filter(shouldKeep),
    routeExecutions: (scope.routeExecutions || []).filter(shouldKeep),
    pricingStrategyRuns: (scope.pricingStrategyRuns || []).filter(shouldKeep),
    pricingDecisions: (scope.pricingDecisions || []).filter(shouldKeep),
    orderMatchingRuns: (scope.orderMatchingRuns || []).filter(shouldKeep),
    orderMatchingDecisions: (scope.orderMatchingDecisions || []).filter(shouldKeep),
    routePlanningRuns: (scope.routePlanningRuns || []).filter(shouldKeep),
    demandSimulationRuns: (scope.demandSimulationRuns || []).filter(shouldKeep),
  };
}

function filterRecordsByOperatingPeriod(records = [], runIds, period) {
  return (records || []).filter((record) => recordBelongsToOperatingPeriod(record, runIds, period));
}

function recordBelongsToOperatingPeriod(record, runIds, period) {
  if (!record) return false;
  if (record.simulation_run_id) return runIds.has(record.simulation_run_id);
  if (period.periodType === MetricPeriodType.ALL) return true;
  const seconds = resolveRecordSimulationSeconds(record);
  return Number.isFinite(seconds) && seconds >= period.startSeconds && seconds <= period.endSeconds;
}

function resolveRecordSimulationSeconds(record = {}) {
  const direct = Number(record.simulation_created_seconds ?? record.created_simulation_seconds ?? record.simulation_occurred_seconds);
  if (Number.isFinite(direct)) return direct;
  return parseSimulationTimeSeconds(
    record.simulation_created_at
      || record.simulation_completed_at
      || record.simulation_cost_occurred_at
      || record.simulation_revenue_occurred_at,
  );
}

export function normalizeMetricDefinitions(definitions = []) {
  const fallback = initializeDefaultMetricDefinitions();
  if (!Array.isArray(definitions) || definitions.length === 0) return fallback;
  const fallbackById = new Map(fallback.map((item) => [item.metric_definition_id, item]));
  const normalizedDefinitions = definitions.map((item) => ({
    ...(fallbackById.get(item.metric_definition_id) || {}),
    ...item,
    metric_status: item.metric_definition_id === "PROCESS-SUPPLY-001" ? "DISABLED" : item.metric_status || "ACTIVE",
    definition_version: Number(item.definition_version || 1),
  }));
  const existingIds = new Set(normalizedDefinitions.map((item) => item.metric_definition_id));
  return [
    ...normalizedDefinitions,
    ...fallback.filter((item) => !existingIds.has(item.metric_definition_id)),
  ];
}

function calculateObservations(metricDefinition, context, nextSequence) {
  const calculators = {
    "OUTCOME-FIN-001": () => sumRevenue(context.revenueRecords, "RECEIVABLE_REVENUE"),
    "OUTCOME-FIN-002": () => sumRevenue(context.revenueRecords, "COLLECTED_REVENUE"),
    "OUTCOME-FIN-003": () => sumRevenue(context.revenueRecords, "UNRECEIVED_REVENUE"),
    "OUTCOME-FIN-004": () => sumCost(context.costRecords),
    "OUTCOME-FIN-005": () => sumRevenue(context.revenueRecords, "COLLECTED_REVENUE") - sumCost(context.costRecords),
    "OUTCOME-FIN-006": () => ratio(sumRevenue(context.revenueRecords, "COLLECTED_REVENUE") - sumCost(context.costRecords), sumRevenue(context.revenueRecords, "COLLECTED_REVENUE")),
    "OUTCOME-SERVICE-001": () => serviceOrders(context).length,
    "OUTCOME-SERVICE-002": () => completedOrders(context).length,
    "OUTCOME-SERVICE-003": () => ratio(completedOrders(context).length, serviceOrders(context).length),
    "OUTCOME-SERVICE-004": () => ratio(cancelledOrders(context).length, serviceOrders(context).length),
    "OUTCOME-EFF-001": () => ratio(sumRevenue(context.revenueRecords, "COLLECTED_REVENUE"), completedOrders(context).length),
    "OUTCOME-EFF-002": () => ratio(sumCost(context.costRecords), completedOrders(context).length),
    "OUTCOME-EFF-003": () => ratio(sumRevenue(context.revenueRecords, "COLLECTED_REVENUE") - sumCost(context.costRecords), completedOrders(context).length),
    "DEMAND-TREND-001": () => createHourlyOrderTrend(context),
    "DEMAND-TREND-002": () => createTimeSegmentOrderTrend(context),
    "PROCESS-ASSET-001": () => calculateRobotaxiAssetUtilization(context),
    "PROCESS-MATCH-001": () => ratio(assignedOrders(context).length, serviceOrders(context).length),
    "PROCESS-ROUTE-001": () => ratio(successfulRoutePlanningRuns(context).length, routePlanningRuns(context).length),
    "PROCESS-TRIP-001": () => ratio(completedTrips(context).length, trips(context).length),
    "PROCESS-EFF-001": () => averageCompletedOrderDistance(completedOrders(context)),
    "PROCESS-EFF-002": () => averageCompletedOrderDurationMinutes(completedOrders(context)),
    "QUALITY-DATA-001": () => calculateCriticalDataCompleteness(context),
  };
  const rawValue = calculators[metricDefinition.metric_definition_id]?.();
  const values = Array.isArray(rawValue) ? rawValue : [rawValue];
  return values.map((value) => calculateObservation(metricDefinition, context, nextSequence(), value));
}

function calculateObservation(metricDefinition, context, sequence, rawValue) {
  const quality = evaluateQuality(metricDefinition, context, rawValue);
  return {
    metric_observation_id: `${context.calculationRunId}-MO-${String(sequence).padStart(5, "0")}`,
    metric_calculation_run_id: context.calculationRunId,
    metric_definition_id: metricDefinition.metric_definition_id,
    metric_scope_type: context.metricScopeType,
    metric_period_type: context.metricPeriodType,
    metric_period_label: context.metricPeriodLabel,
    simulation_run_id: context.simulationRun?.simulation_run_id || null,
    simulation_run_ids: context.simulationRunIds,
    simulation_timeline_id: context.simulationTimelineId,
    window_type: rawValue?.windowType || (context.metricScopeType === MetricScopeType.OPERATING_PERIOD ? "OPERATING_PERIOD" : "SIMULATION_RUN"),
    window_start_seconds: Number(rawValue?.windowStartSeconds ?? context.simulationRun.start_simulation_seconds ?? 0),
    window_end_seconds: Number(rawValue?.windowEndSeconds ?? context.simulationRun.end_simulation_seconds ?? context.simulationRun.current_simulation_seconds ?? 0),
    window_label: rawValue?.windowLabel || context.metricPeriodLabel || `${context.simulationRun.start_time || context.simulationRun.current_time || "Simulation Run"} - ${context.simulationRun.completed_time || context.simulationRun.current_time || "Simulation Run"}`,
    dimension_type: rawValue?.dimensionType || "GLOBAL",
    dimension_id: rawValue?.dimensionId || "GLOBAL",
    metric_value: normalizeMetricValue(rawValue, metricDefinition.display_unit),
    metric_unit: metricDefinition.display_unit,
    numerator_value: quality.numeratorValue,
    denominator_value: quality.denominatorValue,
    quality_status: quality.qualityStatus,
    quality_reason: quality.qualityReason,
    source_record_count: rawValue?.sourceRecordCount ?? sourceRecordCount(metricDefinition, context),
    source_object_refs: rawValue?.sourceObjectRefs ?? sourceObjectRefs(metricDefinition, context),
    created_at: context.createdAt,
  };
}

function evaluateQuality(metricDefinition, context, value) {
  if (metricDefinition.display_unit === MetricUnit.PERCENT && value?.denominator === 0) {
    return {
      qualityStatus: MetricQualityStatus.WARN,
      qualityReason: "分母为 0，指标值为空",
      numeratorValue: value.numerator,
      denominatorValue: value.denominator,
    };
  }
  if (metricDefinition.source_objects.includes("RevenueRecord") && context.revenueRecords.length === 0) {
    return {
      qualityStatus: MetricQualityStatus.WARN,
      qualityReason: "当前统计周期缺少收入记录，财务指标可能不完整",
      numeratorValue: value?.numerator ?? null,
      denominatorValue: value?.denominator ?? null,
    };
  }
  if (metricDefinition.source_objects.includes("CostRecord") && context.costRecords.length === 0) {
    return {
      qualityStatus: MetricQualityStatus.WARN,
      qualityReason: "当前统计周期缺少成本记录，成本或利润指标可能不完整",
      numeratorValue: value?.numerator ?? null,
      denominatorValue: value?.denominator ?? null,
    };
  }
  if (metricDefinition.metric_definition_id === "QUALITY-DATA-001") {
    return {
      qualityStatus: Number(value?.value ?? 0) >= 0.8 ? MetricQualityStatus.PASS : MetricQualityStatus.WARN,
      qualityReason: value?.reason || "关键数据完整率已计算",
      numeratorValue: value?.numerator ?? null,
      denominatorValue: value?.denominator ?? null,
    };
  }
  return {
    qualityStatus: MetricQualityStatus.PASS,
    qualityReason: "指标计算完成",
    numeratorValue: value?.numerator ?? null,
    denominatorValue: value?.denominator ?? null,
  };
}

function definition(metricDefinitionId, metricNameCn, metricNameEn, domain, formula, sourceObjects, sourceFields, displayUnit, higherIsBetter, layer = MetricLayer.OUTCOME, supportedDimensions = ["simulation_run_id"]) {
  return {
    metric_definition_id: metricDefinitionId,
    metric_name_cn: metricNameCn,
    metric_name_en: metricNameEn,
    metric_layer: layer,
    metric_domain: domain,
    business_definition: metricNameCn,
    calculation_formula: formula,
    source_objects: sourceObjects,
    source_fields: sourceFields,
    time_basis: "SIMULATION_TIME",
    default_time_window: "SIMULATION_RUN",
    supported_dimensions: supportedDimensions,
    zero_denominator_rule: "NULL_WITH_REASON",
    data_readiness: "READY",
    display_unit: displayUnit,
    higher_is_better: higherIsBetter,
    metric_status: "ACTIVE",
    definition_version: 1,
  };
}

function sumRevenue(records, revenueType) {
  return roundMoney(records
    .filter((record) => record.revenue_type === revenueType)
    .reduce((sum, record) => sum + Number(record.revenue_amount || 0), 0));
}

function sumCost(records) {
  return roundMoney(records.reduce((sum, record) => sum + Number(record.cost_amount || 0), 0));
}

function ratio(numerator, denominator) {
  const normalizedNumerator = Number(numerator || 0);
  const normalizedDenominator = Number(denominator || 0);
  return {
    value: normalizedDenominator > 0 ? normalizedNumerator / normalizedDenominator : null,
    numerator: normalizedNumerator,
    denominator: normalizedDenominator,
  };
}

function serviceOrders(context) {
  return context.scope?.serviceOrders || [];
}

function completedOrders(context) {
  return serviceOrders(context).filter((order) => order.order_status === "COMPLETED");
}

function cancelledOrders(context) {
  return serviceOrders(context).filter((order) => order.order_status === "CANCELLED");
}

function assignedOrders(context) {
  const assignedOrderIds = new Set((context.scope?.orderMatchingDecisions || [])
    .filter((decision) => Boolean(decision.selected_robotaxi_id))
    .map((decision) => decision.service_order_id)
    .filter(Boolean));
  return serviceOrders(context).filter((order) => Boolean(order.matched_robotaxi_id || order.robotaxi_id || order.trip_id || assignedOrderIds.has(order.service_order_id)));
}

function routePlanningRuns(context) {
  return context.scope?.routePlanningRuns || [];
}

function successfulRoutePlanningRuns(context) {
  return routePlanningRuns(context).filter((run) => run.planning_result === "SUCCESS" || Boolean(run.result_route_id));
}

function trips(context) {
  return context.scope?.trips || [];
}

function completedTrips(context) {
  return trips(context).filter((trip) => trip.trip_status === "COMPLETED");
}

function robotaxis(context) {
  return context.scope?.robotaxis || [];
}

function sumTripDistance(records = []) {
  return Number(records.reduce((sum, trip) => sum + Number(trip.total_distance_km || trip.trip_total_distance_km || 0), 0).toFixed(2));
}

function sumTripDurationSeconds(records = []) {
  return Number(records.reduce((sum, trip) => sum + normalizeDurationSeconds(trip.time_elapsed ?? trip.trip_total_duration_min ?? trip.estimated_duration_min), 0).toFixed(2));
}

function averageCompletedOrderDistance(records = []) {
  const values = records.map((order) => firstFiniteNumber(order.fulfillment_distance_km, order.trip_total_distance_km, order.trip_distance_traveled_km)).filter(Number.isFinite);
  return ratio(values.reduce((sum, value) => sum + value, 0), values.length);
}

function averageCompletedOrderDurationMinutes(records = []) {
  const values = records.map((order) => firstFiniteNumber(order.fulfillment_duration_min, order.trip_total_duration_min)).filter(Number.isFinite);
  return ratio(values.reduce((sum, value) => sum + value, 0), values.length);
}

function firstFiniteNumber(...values) {
  const value = values.find((item) => item !== null && item !== undefined && item !== "" && Number.isFinite(Number(item)));
  return value === undefined ? NaN : Number(value);
}

function calculateRobotaxiAssetUtilization(context) {
  const effectiveRobotaxis = robotaxis(context).filter((item) => !["PENDING_ADMISSION", "PENDING_DELIVERY", "RETIRED"].includes(item.availability_status || item.operational_status));
  const servedRobotaxiIds = new Set(completedOrders(context)
    .map((order) => order.robotaxi_id || order.matched_robotaxi_id || order.assigned_robotaxi_id)
    .filter(Boolean));
  return ratio(servedRobotaxiIds.size, effectiveRobotaxis.length);
}

function createHourlyOrderTrend(context) {
  const orders = serviceOrders(context);
  const periodStart = Number(context.simulationRun.start_simulation_seconds || 0);
  const periodEnd = Number(context.simulationRun.end_simulation_seconds ?? context.simulationRun.current_simulation_seconds ?? periodStart);
  const buckets = new Map();
  const startHour = Math.floor(periodStart / 3600) * 3600;
  const endHour = Math.max(startHour, Math.floor(Math.max(periodEnd - 1, periodStart) / 3600) * 3600);
  for (let hourStart = startHour; hourStart <= endHour; hourStart += 3600) {
    buckets.set(String(hourStart), []);
  }
  orders.forEach((order) => {
    const seconds = resolveOrderSimulationSeconds(order);
    const hourStart = Number.isFinite(seconds) ? Math.floor(seconds / 3600) * 3600 : periodStart;
    const key = String(hourStart);
    buckets.set(key, [...(buckets.get(key) || []), order]);
  });
  return [...buckets.entries()]
    .sort((left, right) => Number(left[0]) - Number(right[0]))
    .map(([hourStart, bucketOrders]) => {
      const startSeconds = Number(hourStart);
      const endSeconds = startSeconds + 3600;
      return {
        value: bucketOrders.length,
        numerator: bucketOrders.length,
        denominator: 1,
        dimensionType: "SIMULATION_HOUR",
        dimensionId: `HOUR-${String(Math.floor(startSeconds / 3600)).padStart(3, "0")}`,
        windowType: "HOUR",
        windowStartSeconds: startSeconds,
        windowEndSeconds: endSeconds,
        windowLabel: `${formatMetricPeriodTime(startSeconds)} - ${formatMetricPeriodTime(endSeconds)}`,
        sourceRecordCount: bucketOrders.length,
        sourceObjectRefs: bucketOrders.slice(0, 20).map((order) => ({ object_type: "serviceOrder", object_id: order.service_order_id })),
      };
    });
}

function createTimeSegmentOrderTrend(context) {
  const segments = [
    { id: "PEAK", label: "高峰", match: (hour) => (hour >= 7 && hour < 10) || (hour >= 17 && hour < 20) },
    { id: "NORMAL", label: "平峰", match: (hour) => hour >= 10 && hour < 17 },
    { id: "OFF_PEAK", label: "低峰", match: (hour) => hour < 7 || hour >= 20 },
  ];
  const grouped = new Map(segments.map((segment) => [segment.id, []]));
  serviceOrders(context).forEach((order) => {
    const seconds = resolveOrderSimulationSeconds(order);
    const secondsInDay = Number.isFinite(seconds) ? ((seconds % 86400) + 86400) % 86400 : 0;
    const hour = Math.floor(secondsInDay / 3600);
    const segment = segments.find((item) => item.match(hour)) || segments[1];
    grouped.set(segment.id, [...(grouped.get(segment.id) || []), order]);
  });
  return segments.map((segment) => {
    const bucketOrders = grouped.get(segment.id) || [];
    return {
      value: bucketOrders.length,
      numerator: bucketOrders.length,
      denominator: 1,
      dimensionType: "DEMAND_TIME_SEGMENT",
      dimensionId: segment.id,
      windowType: "OPERATING_PERIOD",
      windowStartSeconds: Number(context.simulationRun.start_simulation_seconds || 0),
      windowEndSeconds: Number(context.simulationRun.end_simulation_seconds ?? context.simulationRun.current_simulation_seconds ?? 0),
      windowLabel: segment.label,
      sourceRecordCount: bucketOrders.length,
      sourceObjectRefs: bucketOrders.slice(0, 20).map((order) => ({ object_type: "serviceOrder", object_id: order.service_order_id })),
    };
  });
}

function resolveOrderSimulationSeconds(order = {}) {
  const numericSeconds = Number(order.simulation_created_seconds ?? order.created_simulation_seconds ?? order.order_created_seconds);
  if (Number.isFinite(numericSeconds)) return numericSeconds;
  return parseSimulationTimeSeconds(order.simulation_created_at || order.created_at || order.order_created_at);
}

function parseSimulationTimeSeconds(value) {
  if (!value) return NaN;
  if (typeof value === "number") return value;
  const text = String(value).trim();
  const match = text.match(/Day\s*(\d+)\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/i);
  if (!match) return NaN;
  const day = Math.max(1, Number(match[1] || 1));
  const hour = Number(match[2] || 0);
  const minute = Number(match[3] || 0);
  const second = Number(match[4] || 0);
  return (day - 1) * 86400 + hour * 3600 + minute * 60 + second;
}

function normalizeDurationSeconds(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "string") {
    const text = value.trim();
    const hourMinuteSecond = text.match(/^(\d+):(\d+):(\d+)$/);
    if (hourMinuteSecond) {
      return Number(hourMinuteSecond[1]) * 3600 + Number(hourMinuteSecond[2]) * 60 + Number(hourMinuteSecond[3]);
    }
    const minuteMatch = text.match(/^([\d.]+)\s*min/);
    if (minuteMatch) return Number(minuteMatch[1]) * 60;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function calculateCriticalDataCompleteness(context) {
  const checks = [
    Boolean(context.simulationRun.simulation_run_id),
    ["SUCCEEDED", "PARTIALLY_SUCCEEDED"].includes(context.simulationRun.cost_calculation_status) || context.costRecords.length > 0,
    ["SUCCEEDED", "PARTIALLY_SUCCEEDED"].includes(context.simulationRun.revenue_calculation_status) || context.revenueRecords.length > 0,
    serviceOrders(context).every((order) => Boolean(order.simulation_created_at)),
  ];
  const passed = checks.filter(Boolean).length;
  return {
    value: checks.length ? passed / checks.length : null,
    numerator: passed,
    denominator: checks.length,
    reason: `${passed}/${checks.length} 项关键数据检查通过`,
  };
}

function normalizeMetricValue(value, unit) {
  if (value && typeof value === "object" && "value" in value) return normalizeMetricValue(value.value, unit);
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  if (unit === MetricUnit.CURRENCY) return roundMoney(value);
  if (unit === MetricUnit.PERCENT) return Number(Number(value).toFixed(4));
  return Number(Number(value).toFixed(2));
}

function sourceRecordCount(metricDefinition, context) {
  return (metricDefinition.source_objects || []).reduce((count, objectType) => {
    if (objectType === "RevenueRecord") return count + context.revenueRecords.length;
    if (objectType === "CostRecord") return count + context.costRecords.length;
    if (objectType === "Robotaxi") return count + robotaxis(context).length;
    if (objectType === "ServiceOrder") return count + serviceOrders(context).length;
    if (objectType === "OrderMatchingDecision") return count + (context.scope?.orderMatchingDecisions?.length || 0);
    if (objectType === "RoutePlanningRun") return count + routePlanningRuns(context).length;
    if (objectType === "Trip") return count + trips(context).length;
    if (objectType === "ReadinessTask") return count + (context.scope?.readinessTasks?.length || 0);
    if (objectType === "DeploymentTask") return count + (context.scope?.deploymentTasks?.length || 0);
    if (objectType === "RouteExecution") return count + (context.scope?.routeExecutions?.length || 0);
    return count;
  }, 0);
}

function sourceObjectRefs(metricDefinition, context) {
  const refs = [];
  if ((metricDefinition.source_objects || []).includes("RevenueRecord")) {
    refs.push(...context.revenueRecords.slice(0, 20).map((record) => ({ object_type: "revenueRecord", object_id: record.revenue_record_id })));
  }
  if ((metricDefinition.source_objects || []).includes("CostRecord")) {
    refs.push(...context.costRecords.slice(0, 20).map((record) => ({ object_type: "costRecord", object_id: record.cost_record_id })));
  }
  if ((metricDefinition.source_objects || []).includes("ServiceOrder")) {
    refs.push(...serviceOrders(context).slice(0, 20).map((order) => ({ object_type: "serviceOrder", object_id: order.service_order_id })));
  }
  if ((metricDefinition.source_objects || []).includes("Robotaxi")) {
    refs.push(...robotaxis(context).slice(0, 20).map((robotaxi) => ({ object_type: "robotaxi", object_id: robotaxi.robotaxi_id })));
  }
  if ((metricDefinition.source_objects || []).includes("OrderMatchingDecision")) {
    refs.push(...(context.scope?.orderMatchingDecisions || []).slice(0, 20).map((decision) => ({ object_type: "orderMatchingDecision", object_id: decision.order_matching_decision_id })));
  }
  if ((metricDefinition.source_objects || []).includes("RoutePlanningRun")) {
    refs.push(...routePlanningRuns(context).slice(0, 20).map((run) => ({ object_type: "routePlanningRun", object_id: run.route_planning_run_id })));
  }
  if ((metricDefinition.source_objects || []).includes("Trip")) {
    refs.push(...trips(context).slice(0, 20).map((trip) => ({ object_type: "trip", object_id: trip.trip_id })));
  }
  if ((metricDefinition.source_objects || []).includes("ReadinessTask")) {
    refs.push(...(context.scope?.readinessTasks || []).slice(0, 20).map((task) => ({ object_type: "readinessTask", object_id: task.task_id })));
  }
  if ((metricDefinition.source_objects || []).includes("DeploymentTask")) {
    refs.push(...(context.scope?.deploymentTasks || []).slice(0, 20).map((task) => ({ object_type: "deploymentTask", object_id: task.task_id })));
  }
  if ((metricDefinition.source_objects || []).includes("RouteExecution")) {
    refs.push(...(context.scope?.routeExecutions || []).slice(0, 20).map((execution) => ({ object_type: "routeExecution", object_id: execution.route_execution_id })));
  }
  return refs;
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}
