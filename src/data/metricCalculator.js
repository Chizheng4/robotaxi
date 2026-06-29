export const MetricLayer = {
  OUTCOME: "OUTCOME",
  QUALITY: "QUALITY",
};

export const MetricDomain = {
  FINANCE: "FINANCE",
  SERVICE: "SERVICE",
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
  definition("OUTCOME-EFF-002", "单均成本", "Cost per Completed Order", MetricDomain.FINANCE, "Total Operating Cost / Completed Orders", ["CostRecord", "ServiceOrder"], ["cost_amount", "order_status"], MetricUnit.CURRENCY, false),
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
  const startedAt = new Date().toISOString();
  const definitions = normalizeMetricDefinitions(metricDefinitions);
  const runRevenueRecords = (revenueRecords || []).filter((record) => record.simulation_run_id === simulationRun.simulation_run_id);
  const runCostRecords = (costRecords || []).filter((record) => record.simulation_run_id === simulationRun.simulation_run_id);
  const runScope = scope || {};
  const context = {
    simulationRun,
    scope: runScope,
    revenueRecords: runRevenueRecords,
    costRecords: runCostRecords,
    calculationRunId,
    createdAt: startedAt,
  };
  const observations = definitions
    .filter((item) => item.metric_status === "ACTIVE")
    .map((metricDefinition, index) => calculateObservation(metricDefinition, context, index + 1));
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
      metric_calculation_run_id: calculationRunId,
      simulation_run_id: simulationRun.simulation_run_id,
      simulation_timeline_id: simulationRun.simulation_timeline_id || null,
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

export function normalizeMetricDefinitions(definitions = []) {
  const fallback = initializeDefaultMetricDefinitions();
  if (!Array.isArray(definitions) || definitions.length === 0) return fallback;
  const fallbackById = new Map(fallback.map((item) => [item.metric_definition_id, item]));
  return definitions.map((item) => ({
    ...(fallbackById.get(item.metric_definition_id) || {}),
    ...item,
    metric_status: item.metric_status || "ACTIVE",
    definition_version: Number(item.definition_version || 1),
  }));
}

function calculateObservation(metricDefinition, context, sequence) {
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
    "QUALITY-DATA-001": () => calculateCriticalDataCompleteness(context),
  };
  const rawValue = calculators[metricDefinition.metric_definition_id]?.();
  const quality = evaluateQuality(metricDefinition, context, rawValue);
  return {
    metric_observation_id: `${context.calculationRunId}-MO-${String(sequence).padStart(5, "0")}`,
    metric_calculation_run_id: context.calculationRunId,
    metric_definition_id: metricDefinition.metric_definition_id,
    simulation_run_id: context.simulationRun.simulation_run_id,
    simulation_timeline_id: context.simulationRun.simulation_timeline_id || null,
    window_type: "SIMULATION_RUN",
    window_start_seconds: Number(context.simulationRun.start_simulation_seconds || 0),
    window_end_seconds: Number(context.simulationRun.end_simulation_seconds ?? context.simulationRun.current_simulation_seconds ?? 0),
    window_label: `${context.simulationRun.start_time || context.simulationRun.current_time || "Simulation Run"} - ${context.simulationRun.completed_time || context.simulationRun.current_time || "Simulation Run"}`,
    dimension_type: "GLOBAL",
    dimension_id: "GLOBAL",
    metric_value: normalizeMetricValue(rawValue, metricDefinition.display_unit),
    metric_unit: metricDefinition.display_unit,
    numerator_value: quality.numeratorValue,
    denominator_value: quality.denominatorValue,
    quality_status: quality.qualityStatus,
    quality_reason: quality.qualityReason,
    source_record_count: sourceRecordCount(metricDefinition, context),
    source_object_refs: sourceObjectRefs(metricDefinition, context),
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
      qualityReason: "当前模拟运行缺少收入记录，财务指标可能不完整",
      numeratorValue: value?.numerator ?? null,
      denominatorValue: value?.denominator ?? null,
    };
  }
  if (metricDefinition.source_objects.includes("CostRecord") && context.costRecords.length === 0) {
    return {
      qualityStatus: MetricQualityStatus.WARN,
      qualityReason: "当前模拟运行缺少成本记录，成本或利润指标可能不完整",
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

function definition(metricDefinitionId, metricNameCn, metricNameEn, domain, formula, sourceObjects, sourceFields, displayUnit, higherIsBetter, layer = MetricLayer.OUTCOME) {
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
    supported_dimensions: ["simulation_run_id"],
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
    if (objectType === "ServiceOrder") return count + serviceOrders(context).length;
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
  return refs;
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}
