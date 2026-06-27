export const CostType = {
  DISTANCE_COST: "DISTANCE_COST",
  ENERGY_COST: "ENERGY_COST",
  LABOR_COST: "LABOR_COST",
  ASSET_DEPRECIATION_COST: "ASSET_DEPRECIATION_COST",
  FIXED_OPERATING_COST: "FIXED_OPERATING_COST",
};

export const CostCalculationStatus = {
  QUEUED: "QUEUED",
  CALCULATING: "CALCULATING",
  SUCCEEDED: "SUCCEEDED",
  PARTIALLY_SUCCEEDED: "PARTIALLY_SUCCEEDED",
  FAILED: "FAILED",
};

export function initializeDefaultCostModelProfile() {
  const profile = createBaseCostModelProfile();
  return normalizeCostModelProfile({
    ...profile,
    cost_parameter_rules: createDefaultCostParameterRules(profile),
  });
}

function createBaseCostModelProfile() {
  return {
    cost_model_profile_id: "CMP-001",
    profile_name: "标准运营成本模型",
    profile_version: 1,
    profile_status: "ACTIVE",
    description: "用于模拟完成后估算行驶、能源、人力与车辆折旧成本。",
    currency_code: "CNY",
    distance_cost_per_km: 0.42,
    electricity_price_per_kwh: 0.85,
    energy_consumption_kwh_per_km: 0.16,
    worker_cost_per_hour: 45,
    worker_cost_per_minute: 0.75,
    robotaxi_purchase_cost: 280000,
    robotaxi_residual_value: 60000,
    expected_lifetime_km: 450000,
    depreciation_method: "PER_KM",
    fixed_operating_cost_per_day: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    activated_at: new Date().toISOString(),
  };
}

export function normalizeCostModelProfile(profile) {
  const fallback = createBaseCostModelProfile();
  if (!profile) return fallback;
  const workerCostPerHour = nonNegative(profile.worker_cost_per_hour, fallback.worker_cost_per_hour);
  return {
    ...fallback,
    ...profile,
    profile_version: Number(profile.profile_version || fallback.profile_version),
    profile_status: profile.profile_status || fallback.profile_status,
    currency_code: profile.currency_code || fallback.currency_code,
    distance_cost_per_km: nonNegative(profile.distance_cost_per_km, fallback.distance_cost_per_km),
    electricity_price_per_kwh: nonNegative(profile.electricity_price_per_kwh, fallback.electricity_price_per_kwh),
    energy_consumption_kwh_per_km: nonNegative(profile.energy_consumption_kwh_per_km, fallback.energy_consumption_kwh_per_km),
    worker_cost_per_hour: workerCostPerHour,
    worker_cost_per_minute: nonNegative(profile.worker_cost_per_minute, roundMoney(workerCostPerHour / 60)),
    robotaxi_purchase_cost: nonNegative(profile.robotaxi_purchase_cost, fallback.robotaxi_purchase_cost),
    robotaxi_residual_value: nonNegative(profile.robotaxi_residual_value, fallback.robotaxi_residual_value),
    expected_lifetime_km: positive(profile.expected_lifetime_km, fallback.expected_lifetime_km),
    depreciation_method: profile.depreciation_method || fallback.depreciation_method,
    fixed_operating_cost_per_day: nonNegative(profile.fixed_operating_cost_per_day, fallback.fixed_operating_cost_per_day),
    cost_parameter_rules: normalizeCostParameterRules(profile.cost_parameter_rules, { ...fallback, ...profile }),
  };
}

export function updateCostParameterRule(profile, parameterKey, value) {
  const normalized = normalizeCostModelProfile(profile);
  const rules = normalized.cost_parameter_rules.map((rule) => rule.cost_parameter_key === parameterKey
    ? normalizeParameterRuleValue(rule, value)
    : rule);
  return normalizeCostModelProfile({
    ...normalized,
    profile_version: Number(normalized.profile_version || 0) + 1,
    updated_at: new Date().toISOString(),
    cost_parameter_rules: rules,
    ...rules.reduce((result, rule) => ({ ...result, [rule.cost_parameter_key]: rule.configured_value }), {}),
  });
}

export function createCostCalculation({
  simulationRun,
  profile,
  businessData,
  scope = null,
  calculationRunId,
  algorithmVersion = "1.0.0",
}) {
  const startedAt = new Date().toISOString();
  const normalizedProfile = normalizeCostModelProfile(profile);
  const errors = [];
  const records = [];
  const context = {
    simulationRun,
    profile: normalizedProfile,
    businessData,
    calculationRunId,
    errors,
    records,
    sequence: 1,
    createdAt: startedAt,
  };

  const runScope = scope || createFallbackScope(simulationRun, businessData);
  context.businessData = { ...businessData, ...runScope };
  const routeExecutions = (runScope.routeExecutions || []).map((item) => calculateRouteExecutionCost(item, context));
  const trips = (runScope.trips || []).map((item) => calculateTripCost(item, context));
  const readinessTasks = (runScope.readinessTasks || []).map((item) => calculateTaskLaborCost(item, "readinessTask", context));
  const deploymentTasks = (runScope.deploymentTasks || []).map((item) => calculateTaskLaborCost(item, "deploymentTask", context));
  const serviceOrders = (runScope.serviceOrders || []).map((item) => projectCostSummary(item, recordsForServiceOrder(records, item.service_order_id), calculationRunId, startedAt));
  const routeExecutionByTaskId = new Map(routeExecutions.map((item) => [item.task_id, item]));
  const deploymentTasksWithRouteCost = deploymentTasks.map((task) => {
    const execution = routeExecutionByTaskId.get(task.task_id);
    const relatedRecords = records.filter((record) =>
      record.source_object_id === task.task_id ||
      (execution && record.source_object_id === execution.route_execution_id)
    );
    return projectCostSummary(task, relatedRecords, calculationRunId, startedAt);
  });

  const sourceObjectIds = new Set([
    ...routeExecutions.map((item) => item.route_execution_id),
    ...trips.map((item) => item.trip_id),
    ...readinessTasks.map((item) => item.task_id),
    ...deploymentTasks.map((item) => item.task_id),
    ...serviceOrders.map((item) => item.service_order_id),
  ]);
  const failedObjectIds = new Set(errors.map((error) => error.source_object_id || error.business_object_id).filter(Boolean));
  const processedObjectCount = sourceObjectIds.size;
  const status = processedObjectCount > 0 && failedObjectIds.size >= processedObjectCount
    ? CostCalculationStatus.FAILED
    : errors.length > 0 || simulationRun.simulation_status !== "COMPLETED"
      ? CostCalculationStatus.PARTIALLY_SUCCEEDED
      : CostCalculationStatus.SUCCEEDED;

  return {
    businessData: {
      routeExecutions,
      trips,
      readinessTasks,
      deploymentTasks: deploymentTasksWithRouteCost,
      serviceOrders,
    },
    costRecords: records,
    calculationRun: {
      cost_calculation_run_id: calculationRunId,
      simulation_run_id: simulationRun.simulation_run_id,
      simulation_timeline_id: simulationRun.simulation_timeline_id,
      cost_model_profile_id: normalizedProfile.cost_model_profile_id,
      cost_model_profile_version: normalizedProfile.profile_version,
      cost_model_profile_snapshot: clone(normalizedProfile),
      calculation_status: status,
      calculation_progress_percent: 100,
      processed_object_count: processedObjectCount,
      generated_cost_record_count: records.length,
      total_cost_amount: roundMoney(records.reduce((sum, record) => sum + Number(record.cost_amount || 0), 0)),
      error_count: errors.length,
      calculation_errors: errors,
      algorithm_version: algorithmVersion,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    },
  };
}

function calculateRouteExecutionCost(execution, context) {
  const route = findRoute(execution.route_id, context.businessData);
  const distanceKm = routeDistanceKm(route) || nonNegative(execution.distance_traveled_km, 0);
  if (!distanceKm) {
    addError(context, "COST_DISTANCE_MISSING", "routeExecution", execution.route_execution_id, "运营行驶记录缺少可计算距离");
    return projectCostSummary(execution, [], context.calculationRunId, context.createdAt);
  }
  const basis = {
    route_id: execution.route_id,
    task_id: execution.task_id,
    distance_source: route ? "Route.total_distance_m" : "RouteExecution.distance_traveled_km",
  };
  createDrivingCostRecords(context, {
    sourceObjectType: "routeExecution",
    sourceObjectId: execution.route_execution_id,
    relatedRouteExecutionId: execution.route_execution_id,
    relatedOrderId: null,
    relatedTripId: null,
    robotaxiId: execution.robotaxi_id,
    distanceKm,
    simulationCostOccurredAt: execution.calculated_simulation_completed_at || execution.simulation_completed_at || execution.simulation_created_at || null,
    basis,
  });
  return projectCostSummary(execution, recordsForSource(context.records, "routeExecution", execution.route_execution_id), context.calculationRunId, context.createdAt);
}

function calculateTripCost(trip, context) {
  const distanceInfo = getTripDistanceKm(trip, context.businessData);
  if (!distanceInfo.distanceKm) {
    addError(context, "COST_DISTANCE_MISSING", "trip", trip.trip_id, "履约行驶记录缺少可计算距离");
    return projectCostSummary(trip, [], context.calculationRunId, context.createdAt);
  }
  createDrivingCostRecords(context, {
    sourceObjectType: "trip",
    sourceObjectId: trip.trip_id,
    relatedTripId: trip.trip_id,
    relatedOrderId: trip.service_order_id,
    relatedRouteExecutionId: null,
    robotaxiId: trip.robotaxi_id,
    distanceKm: distanceInfo.distanceKm,
    simulationCostOccurredAt: trip.calculated_simulation_completed_at || trip.simulation_completed_at || trip.simulation_created_at || null,
    basis: distanceInfo.basis,
  });
  return projectCostSummary(trip, recordsForSource(context.records, "trip", trip.trip_id), context.calculationRunId, context.createdAt);
}

function calculateTaskLaborCost(task, objectType, context) {
  const seconds = getOperationSeconds(task);
  if (!seconds) {
    addError(context, "COST_DURATION_MISSING", objectType, task.task_id, "任务缺少可计算操作时长");
    return projectCostSummary(task, [], context.calculationRunId, context.createdAt);
  }
  const quantityHours = roundQuantity(seconds / 3600);
  const costAmount = roundMoney(quantityHours * Number(context.profile.worker_cost_per_hour || 0));
  context.records.push(createRecord(context, {
    sourceObjectType: objectType,
    sourceObjectId: task.task_id,
    robotaxiId: task.robotaxi_id || null,
    workerId: task.worker_id || null,
    relatedOrderId: null,
    relatedTripId: null,
    relatedRouteExecutionId: null,
    costType: CostType.LABOR_COST,
    quantity: quantityHours,
    quantityUnit: "hour",
    unitCost: context.profile.worker_cost_per_hour,
    costAmount,
    formula: "operation_hours × worker_cost_per_hour",
    basis: {
      operation_seconds: seconds,
      duration_source: task.simulation_status_transition_history?.length ? "simulation_status_transition_history" : "calculated_simulation_*",
    },
    simulationCostOccurredAt: task.calculated_simulation_completed_at || task.simulation_completed_at || task.simulation_created_at || null,
  }));
  return projectCostSummary(task, recordsForSource(context.records, objectType, task.task_id), context.calculationRunId, context.createdAt);
}

function createDrivingCostRecords(context, params) {
  const distanceKm = roundQuantity(params.distanceKm);
  const energyKwh = roundQuantity(distanceKm * Number(context.profile.energy_consumption_kwh_per_km || 0));
  const depreciableValue = Math.max(0, Number(context.profile.robotaxi_purchase_cost || 0) - Number(context.profile.robotaxi_residual_value || 0));
  const depreciationCostPerKm = context.profile.depreciation_method === "PER_KM"
    ? depreciableValue / Number(context.profile.expected_lifetime_km || 1)
    : 0;
  const definitions = [
    {
      costType: CostType.DISTANCE_COST,
      quantity: distanceKm,
      quantityUnit: "km",
      unitCost: context.profile.distance_cost_per_km,
      costAmount: distanceKm * Number(context.profile.distance_cost_per_km || 0),
      formula: "distance_km × distance_cost_per_km",
      basis: params.basis,
    },
    {
      costType: CostType.ENERGY_COST,
      quantity: energyKwh,
      quantityUnit: "kWh",
      unitCost: context.profile.electricity_price_per_kwh,
      costAmount: energyKwh * Number(context.profile.electricity_price_per_kwh || 0),
      formula: "distance_km × energy_consumption_kwh_per_km × electricity_price_per_kwh",
      basis: { ...params.basis, energy_consumption_kwh_per_km: context.profile.energy_consumption_kwh_per_km },
    },
    {
      costType: CostType.ASSET_DEPRECIATION_COST,
      quantity: distanceKm,
      quantityUnit: "km",
      unitCost: depreciationCostPerKm,
      costAmount: distanceKm * depreciationCostPerKm,
      formula: "(robotaxi_purchase_cost - robotaxi_residual_value) / expected_lifetime_km × distance_km",
      basis: { ...params.basis, depreciation_method: context.profile.depreciation_method },
    },
  ];

  definitions.forEach((definition) => {
    context.records.push(createRecord(context, {
      ...params,
      ...definition,
      costAmount: roundMoney(definition.costAmount),
      simulationCostOccurredAt: params.simulationCostOccurredAt,
    }));
  });
}

function createRecord(context, params) {
  return {
    cost_record_id: `${context.calculationRunId}-CR-${String(context.sequence++).padStart(5, "0")}`,
    simulation_run_id: context.simulationRun.simulation_run_id,
    cost_calculation_run_id: context.calculationRunId,
    cost_model_profile_id: context.profile.cost_model_profile_id,
    source_object_type: params.sourceObjectType,
    source_object_id: params.sourceObjectId,
    related_order_id: params.relatedOrderId || null,
    related_trip_id: params.relatedTripId || null,
    related_route_execution_id: params.relatedRouteExecutionId || null,
    robotaxi_id: params.robotaxiId || null,
    worker_id: params.workerId || null,
    cost_type: params.costType,
    quantity: roundQuantity(params.quantity),
    quantity_unit: params.quantityUnit,
    unit_cost: roundMoney(params.unitCost),
    cost_amount: roundMoney(params.costAmount),
    currency_code: context.profile.currency_code,
    calculation_formula: params.formula,
    calculation_basis: params.basis || {},
    simulation_cost_occurred_at: params.simulationCostOccurredAt || null,
    created_at: context.createdAt,
  };
}

function projectCostSummary(item, records, calculationRunId, calculatedAt) {
  const summary = summarizeRecords(records);
  return {
    ...item,
    ...summary,
    cost_calculated_at: calculatedAt,
    cost_calculation_run_id: calculationRunId,
  };
}

export function summarizeRecords(records = []) {
  const summary = {
    total_cost_amount: 0,
    distance_cost_amount: 0,
    energy_cost_amount: 0,
    labor_cost_amount: 0,
    asset_depreciation_cost_amount: 0,
  };
  records.forEach((record) => {
    const amount = Number(record.cost_amount || 0);
    summary.total_cost_amount += amount;
    if (record.cost_type === CostType.DISTANCE_COST) summary.distance_cost_amount += amount;
    if (record.cost_type === CostType.ENERGY_COST) summary.energy_cost_amount += amount;
    if (record.cost_type === CostType.LABOR_COST) summary.labor_cost_amount += amount;
    if (record.cost_type === CostType.ASSET_DEPRECIATION_COST) summary.asset_depreciation_cost_amount += amount;
  });
  Object.keys(summary).forEach((key) => {
    summary[key] = roundMoney(summary[key]);
  });
  return summary;
}

function recordsForSource(records, sourceObjectType, sourceObjectId) {
  return records.filter((record) => record.source_object_type === sourceObjectType && record.source_object_id === sourceObjectId);
}

function recordsForServiceOrder(records, serviceOrderId) {
  return records.filter((record) => record.related_order_id === serviceOrderId);
}

function getTripDistanceKm(trip, data) {
  const routeIds = Array.from(new Set((trip.route_history || []).map((item) => item.route_id).filter(Boolean)));
  const routeHistoryDistanceKm = routeIds.reduce((sum, routeId) => sum + routeDistanceKm(findRoute(routeId, data)), 0);
  if (routeHistoryDistanceKm > 0) {
    return {
      distanceKm: roundQuantity(Math.max(routeHistoryDistanceKm, Number(trip.distance_traveled_km || 0))),
      basis: { route_ids: routeIds, distance_source: "Trip.route_history" },
    };
  }
  if (Number(trip.distance_traveled_km || 0) > 0) {
    return {
      distanceKm: roundQuantity(Number(trip.distance_traveled_km || 0)),
      basis: { distance_source: "Trip.distance_traveled_km" },
    };
  }
  const order = (data.serviceOrders || []).find((item) => item.service_order_id === trip.service_order_id);
  if (Number(order?.trip_total_distance_km || 0) > 0) {
    return {
      distanceKm: roundQuantity(Number(order.trip_total_distance_km)),
      basis: { service_order_id: order.service_order_id, distance_source: "ServiceOrder.trip_total_distance_km" },
    };
  }
  if (Number(order?.actual_distance_km || 0) > 0) {
    return {
      distanceKm: roundQuantity(Number(order.actual_distance_km)),
      basis: { service_order_id: order.service_order_id, distance_source: "ServiceOrder.actual_distance_km_compat" },
    };
  }
  return { distanceKm: 0, basis: {} };
}

function createFallbackScope(simulationRun, businessData) {
  const runId = simulationRun.simulation_run_id;
  const filterByRun = (items = []) => (items || []).filter((item) => item.simulation_run_id === runId);
  return {
    serviceOrders: filterByRun(businessData.serviceOrders),
    trips: filterByRun(businessData.trips),
    readinessTasks: filterByRun(businessData.readinessTasks),
    deploymentTasks: filterByRun(businessData.deploymentTasks),
    routeExecutions: filterByRun(businessData.routeExecutions),
    routes: businessData.routes || [],
  };
}

function createDefaultCostParameterRules(profile) {
  const definitions = [
    ["CPR-001", "distance_cost_per_km", "每公里距离成本", "DISTANCE_COST", "CURRENCY_PER_KM", true],
    ["CPR-002", "electricity_price_per_kwh", "每千瓦时电价", "ENERGY_COST", "CURRENCY_PER_KWH", true],
    ["CPR-003", "energy_consumption_kwh_per_km", "每公里耗电量", "ENERGY_COST", "KWH_PER_KM", true],
    ["CPR-004", "worker_cost_per_hour", "作业人员每小时成本", "LABOR_COST", "CURRENCY_PER_HOUR", true],
    ["CPR-005", "robotaxi_purchase_cost", "Robotaxi 购置成本", "ASSET_DEPRECIATION_COST", "CURRENCY", true],
    ["CPR-006", "robotaxi_residual_value", "Robotaxi 残值", "ASSET_DEPRECIATION_COST", "CURRENCY", true],
    ["CPR-007", "expected_lifetime_km", "预计寿命里程", "ASSET_DEPRECIATION_COST", "KM", true],
    ["CPR-008", "depreciation_method", "折旧方式", "ASSET_DEPRECIATION_COST", "ENUM", true],
    ["CPR-009", "fixed_operating_cost_per_day", "每日固定运营成本", "FIXED_OPERATING_COST", "CURRENCY_PER_DAY", false],
  ];
  return definitions.map(([id, key, name, group, unit, enabled], index) => ({
    cost_parameter_rule_id: id,
    cost_parameter_key: key,
    cost_parameter_name: name,
    cost_parameter_group: group,
    parameter_unit: unit,
    configured_value: profile[key],
    cost_parameter_status: enabled ? "ENABLED" : "RESERVED",
    participates_in_calculation: enabled,
    display_order: index + 1,
  }));
}

function normalizeCostParameterRules(rules, profile) {
  const baseRules = createDefaultCostParameterRules(profile);
  const legacyByKey = new Map((rules || []).map((rule) => [rule.cost_parameter_key, rule]));
  return baseRules.map((rule) => ({
    ...rule,
    ...(legacyByKey.get(rule.cost_parameter_key) || {}),
    configured_value: legacyByKey.has(rule.cost_parameter_key)
      ? legacyByKey.get(rule.cost_parameter_key).configured_value
      : profile[rule.cost_parameter_key],
  }));
}

function normalizeParameterRuleValue(rule, value) {
  if (rule.cost_parameter_key === "depreciation_method") {
    const nextValue = ["PER_KM", "PER_HOUR", "PER_DAY"].includes(value) ? value : "PER_KM";
    return { ...rule, configured_value: nextValue };
  }
  return { ...rule, configured_value: nonNegative(value, 0) };
}

function getOperationSeconds(item) {
  const history = Array.isArray(item.simulation_status_transition_history) ? item.simulation_status_transition_history : [];
  if (history.length > 1) {
    const first = parseSimulationTimestamp(history[0].calculated_simulation_status_changed_at);
    const last = parseSimulationTimestamp(history[history.length - 1].calculated_simulation_status_changed_at);
    if (last > first) return last - first;
    const durationSum = history.reduce((sum, entry) => sum + Number(entry.configured_duration_seconds || 0), 0);
    if (durationSum > 0) return durationSum;
  }
  const start = parseSimulationTimestamp(item.calculated_simulation_created_at || item.simulation_created_at);
  const end = parseSimulationTimestamp(item.calculated_simulation_completed_at || item.simulation_completed_at);
  if (end > start) return end - start;
  return 0;
}

function parseSimulationTimestamp(value) {
  if (!value || typeof value !== "string") return 0;
  const match = value.match(/Day\s+(\d+)\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return 0;
  const [, day, hour, minute, second] = match;
  return (Number(day) - 1) * 86400 + Number(hour) * 3600 + Number(minute) * 60 + Number(second);
}

function findRoute(routeId, data) {
  return (data.routes || []).find((route) => route.route_id === routeId);
}

function routeDistanceKm(route) {
  return route ? roundQuantity(Number(route.total_distance_m || 0) / 1000) : 0;
}

function addError(context, errorType, objectType, objectId, message) {
  context.errors.push({
    error_type: errorType,
    error_message: message,
    source_object_type: objectType,
    source_object_id: objectId,
    business_object_type: objectType,
    business_object_id: objectId,
  });
}

function nonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function positive(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function roundMoney(value) {
  return Number((Number(value || 0)).toFixed(2));
}

function roundQuantity(value) {
  return Number((Number(value || 0)).toFixed(4));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
