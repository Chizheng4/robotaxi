import { withLifecycleStatus } from "./businessPlanningService.js";

export const StrategyStatus = Object.freeze({ ACTIVE: "ACTIVE", DRAFT: "DRAFT", ARCHIVED: "ARCHIVED" });
export const RunStatus = Object.freeze({ SUCCEEDED: "SUCCEEDED", FAILED: "FAILED" });
export const ForecastResultStatus = Object.freeze({ GENERATED: "GENERATED" });
export const DeploymentPlanStatus = Object.freeze({ DRAFT: "DRAFT", CONFIRMED: "CONFIRMED", DISPATCHED: "DISPATCHED", CANCELLED: "CANCELLED" });

export function initializeOperatingPlanningData(now = new Date().toISOString()) {
  return {
    shortTermDemandForecastStrategies: [{
      short_term_forecast_strategy_id: "STF-STR-001",
      strategy_name: "日常短期需求预测",
      strategy_status: StrategyStatus.ACTIVE,
      strategy_version: "1.0.0",
      forecast_horizon_value: 24,
      forecast_horizon_unit: "HOUR",
      time_bucket_unit: "HOUR",
      profile_weight: 0.5,
      historical_weight: 0.3,
      recent_trend_weight: 0.2,
      recent_window_days: 7,
      confidence_band_ratio: 0.15,
      date_type: "NORMAL_DAY",
      normal_day_factor: 1,
      weekend_factor: 1.08,
      holiday_factor: 1.25,
      target_zone_ids: ["Z-001", "Z-002"],
      created_at: now,
      updated_at: now,
    }],
    shortTermDemandForecastRuns: [],
    shortTermDemandForecastResults: [],
    deploymentDecisionStrategies: [{
      deployment_decision_strategy_id: "DD-STR-001",
      strategy_name: "利润约束投放决策",
      strategy_status: StrategyStatus.ACTIVE,
      strategy_version: "1.0.0",
      decision_algorithm: "PROFIT_CONSTRAINED",
      demand_weight: 0.35,
      supply_gap_weight: 0.3,
      service_pressure_weight: 0.2,
      profit_weight: 0.15,
      average_fulfillment_duration_min: 30,
      target_utilization_rate: 0.72,
      default_average_order_revenue: 35,
      reposition_cost_per_km: 2.4,
      average_reposition_distance_km: 3,
      minimum_expected_profit: 0,
      target_zone_ids: ["Z-001", "Z-002"],
      created_at: now,
      updated_at: now,
    }],
    deploymentDecisionRuns: [],
    deploymentPlans: [],
  };
}

export function executeShortTermDemandForecast({
  strategy,
  demandProfiles = [],
  serviceOrders = [],
  trips = [],
  zones = [],
  places = [],
  serviceAreas = [],
  context = {},
} = {}) {
  const occurredAt = resolveNow(context);
  const runId = resolveId(context.nextRunId, context.runId, "STF-RUN-0001");
  if (!strategy?.short_term_forecast_strategy_id || strategy.strategy_status !== StrategyStatus.ACTIVE) {
    return { run: createForecastRun({ runId, strategy, occurredAt, status: RunStatus.FAILED, failureReason: "SHORT_TERM_FORECAST_STRATEGY_NOT_ACTIVE" }), results: [] };
  }
  const targets = createForecastTargets({ strategy, demandProfiles, zones, places, serviceAreas });
  if (!targets.length) {
    return { run: createForecastRun({ runId, strategy, occurredAt, status: RunStatus.FAILED, failureReason: "NO_FORECAST_TARGET" }), results: [] };
  }
  const period = resolveForecastPeriod(strategy, occurredAt);
  const orderFacts = createOrderFacts(serviceOrders, trips);
  const bucketCount = period.bucketCount;
  const results = [];
  targets.forEach((target) => {
    const targetFacts = orderFacts.filter((fact) => isOrderInTarget(fact, target, zones, places, serviceAreas));
    const dailyBaseline = resolveDailyBaseline(target.profile);
    const historicalDaily = resolveHistoricalDailyDemand(targetFacts, strategy.recent_window_days);
    const recentTrend = resolveRecentTrend(targetFacts);
    for (let index = 0; index < bucketCount; index += 1) {
      const bucketStart = addBucket(period.startAt, strategy.time_bucket_unit, index);
      const bucketEnd = addBucket(period.startAt, strategy.time_bucket_unit, index + 1);
      const resultId = typeof context.nextResultId === "function" ? context.nextResultId(results.length) : `STF-RES-${String(results.length + 1).padStart(4, "0")}`;
      results.push(createForecastResult({ resultId, runId, strategy, target, bucketStart, bucketEnd, dailyBaseline, historicalDaily, recentTrend, targetFacts, occurredAt }));
    }
  });
  return {
    run: createForecastRun({ runId, strategy, occurredAt, status: RunStatus.SUCCEEDED, resultCount: results.length, period, targets, orderFacts }),
    results,
  };
}

export function executeDeploymentDecision({
  strategy,
  forecastResults = [],
  robotaxis = [],
  serviceOrders = [],
  trips = [],
  zones = [],
  places = [],
  serviceAreas = [],
  context = {},
} = {}) {
  const occurredAt = resolveNow(context);
  const runId = resolveId(context.nextRunId, context.runId, "DD-RUN-0001");
  if (!strategy?.deployment_decision_strategy_id || strategy.strategy_status !== StrategyStatus.ACTIVE) {
    return { run: createDecisionRun({ runId, strategy, occurredAt, status: RunStatus.FAILED, failureReason: "DEPLOYMENT_DECISION_STRATEGY_NOT_ACTIVE" }), plans: [] };
  }
  const latestForecastRunId = forecastResults.find((item) => item.short_term_forecast_run_id)?.short_term_forecast_run_id;
  const currentResults = forecastResults.filter((item) => item.short_term_forecast_run_id === latestForecastRunId);
  const hasPositiveDemand = (type) => currentResults.some((item) => item.target_object_type === type && Number(item.predicted_order_count || 0) > 0);
  const preferredGranularity = hasPositiveDemand("SERVICE_AREA") ? "SERVICE_AREA"
    : hasPositiveDemand("PLACE") ? "PLACE" : "ZONE";
  const grouped = groupBy(currentResults.filter((item) => item.target_object_type === preferredGranularity), (item) => item.target_object_id);
  const orderFacts = createOrderFacts(serviceOrders, trips);
  const averageRevenue = average(orderFacts.map((item) => item.revenue).filter((value) => value > 0)) || Number(strategy.default_average_order_revenue || 35);
  const plans = [...grouped.entries()].map(([targetId, values], index) => createDeploymentPlan({
    planId: typeof context.nextPlanId === "function" ? context.nextPlanId(index) : `DPL-${String(index + 1).padStart(4, "0")}`,
    runId,
    strategy,
    forecastResults: values,
    robotaxis,
    zones,
    places,
    serviceAreas,
    averageRevenue,
    occurredAt,
  })).filter((plan) => plan.planned_robotaxi_count > 0)
    .sort((a, b) => b.deployment_priority_score - a.deployment_priority_score)
    .map((plan, index) => ({ ...plan, deployment_priority_rank: index + 1 }));
  return {
    run: createDecisionRun({ runId, strategy, occurredAt, status: RunStatus.SUCCEEDED, planCount: plans.length, forecastRunId: latestForecastRunId, robotaxis }),
    plans,
  };
}

export function confirmDeploymentPlan({ plan, context = {} } = {}) {
  if (!plan?.deployment_plan_id || plan.plan_status !== DeploymentPlanStatus.DRAFT) return { succeeded: false, reason: "DEPLOYMENT_PLAN_NOT_DRAFT", plan };
  const occurredAt = resolveNow(context);
  return { succeeded: true, plan: transitionPlan(plan, DeploymentPlanStatus.CONFIRMED, "DEPLOYMENT_PLAN_CONFIRM", "DEPLOYMENT_PLAN_CONFIRMED", occurredAt, { confirmed_at: occurredAt }) };
}

export function cancelDeploymentPlan({ plan, context = {} } = {}) {
  if (!plan?.deployment_plan_id || [DeploymentPlanStatus.CANCELLED, DeploymentPlanStatus.DISPATCHED].includes(plan.plan_status)) return { succeeded: false, reason: "DEPLOYMENT_PLAN_NOT_CANCELLABLE", plan };
  const occurredAt = resolveNow(context);
  return { succeeded: true, plan: transitionPlan(plan, DeploymentPlanStatus.CANCELLED, "DEPLOYMENT_PLAN_CANCEL", "DEPLOYMENT_PLAN_CANCELLED", occurredAt, { cancelled_at: occurredAt }) };
}

export function markDeploymentPlanDispatched({ plan, taskIds = [], context = {} } = {}) {
  if (!plan?.deployment_plan_id || plan.plan_status !== DeploymentPlanStatus.CONFIRMED) return { succeeded: false, reason: "DEPLOYMENT_PLAN_NOT_CONFIRMED", plan };
  const occurredAt = resolveNow(context);
  return { succeeded: true, plan: transitionPlan(plan, DeploymentPlanStatus.DISPATCHED, "DEPLOYMENT_PLAN_DISPATCH", "DEPLOYMENT_TASKS_CREATED", occurredAt, { generated_task_ids: taskIds, dispatched_at: occurredAt }) };
}

function createForecastRun({ runId, strategy, occurredAt, status, resultCount = 0, failureReason = null, period = null, targets = [], orderFacts = [] }) {
  return {
    short_term_forecast_run_id: runId,
    short_term_forecast_strategy_id: strategy?.short_term_forecast_strategy_id || null,
    strategy_name: strategy?.strategy_name || null,
    strategy_version: strategy?.strategy_version || null,
    run_status: status,
    forecast_start_at: period?.startAt || occurredAt,
    forecast_end_at: period?.endAt || occurredAt,
    time_bucket_unit: strategy?.time_bucket_unit || null,
    target_zone_ids: strategy?.target_zone_ids || [],
    result_count: resultCount,
    failure_reason: failureReason,
    strategy_snapshot: strategy ? { ...strategy } : null,
    input_snapshot: { target_count: targets.length, historical_order_count: orderFacts.length },
    started_at: occurredAt,
    completed_at: occurredAt,
  };
}

function createForecastResult({ resultId, runId, strategy, target, bucketStart, bucketEnd, dailyBaseline, historicalDaily, recentTrend, targetFacts, occurredAt }) {
  const weights = normalizeWeights(strategy.profile_weight, strategy.historical_weight, strategy.recent_trend_weight, historicalDaily > 0);
  const dateFactor = resolveDateFactor(strategy, bucketStart);
  const bucketShare = strategy.time_bucket_unit === "HOUR" ? resolveHourShare(new Date(bucketStart).getHours(), target.profile) : 1;
  const profileValue = dailyBaseline * bucketShare;
  const historicalValue = historicalDaily * bucketShare;
  const recentValue = historicalDaily > 0 ? historicalValue * recentTrend : profileValue;
  const forecast = Math.max(0, (profileValue * weights.profile + historicalValue * weights.historical + recentValue * weights.trend) * dateFactor);
  const band = Math.max(0, Number(strategy.confidence_band_ratio || 0.15));
  return {
    short_term_forecast_result_id: resultId,
    short_term_forecast_run_id: runId,
    short_term_forecast_strategy_id: strategy.short_term_forecast_strategy_id,
    forecast_status: ForecastResultStatus.GENERATED,
    target_object_type: target.target_object_type,
    target_object_id: target.target_object_id,
    target_object_name: target.target_object_name,
    target_zone_id: target.target_zone_id,
    forecast_bucket_start_at: bucketStart,
    forecast_bucket_end_at: bucketEnd,
    time_bucket_unit: strategy.time_bucket_unit,
    date_type: strategy.date_type,
    baseline_order_count: round(profileValue),
    historical_order_count: targetFacts.length,
    recent_trend_factor: round(recentTrend, 4),
    date_type_factor: round(dateFactor, 4),
    predicted_order_count: round(forecast),
    predicted_order_lower_bound: round(forecast * (1 - band)),
    predicted_order_upper_bound: round(forecast * (1 + band)),
    data_quality_level: targetFacts.length >= 20 ? "HIGH" : targetFacts.length >= 5 ? "MEDIUM" : "PROFILE_BASED",
    forecast_method: targetFacts.length ? "PROFILE_HISTORY_TREND_BLEND" : "DEMAND_PROFILE_COLD_START",
    demand_profile_id: target.profile?.profile_id || null,
    strategy_snapshot: { ...strategy },
    demand_profile_snapshot: target.profile ? { ...target.profile } : null,
    created_at: occurredAt,
  };
}

function createDeploymentPlan({ planId, runId, strategy, forecastResults, robotaxis, zones, places, serviceAreas, averageRevenue, occurredAt }) {
  const first = forecastResults[0];
  const predictedOrders = sum(forecastResults.map((item) => item.predicted_order_count));
  const horizonHours = Math.max(1, forecastResults.reduce((hours, item) => hours + ((Date.parse(item.forecast_bucket_end_at) - Date.parse(item.forecast_bucket_start_at)) / 3600000), 0));
  const averageDuration = Math.max(1, Number(strategy.average_fulfillment_duration_min || 30));
  const targetUtilization = Math.max(0.1, Number(strategy.target_utilization_rate || 0.72));
  const expectedDemand = Math.ceil((predictedOrders * averageDuration) / (60 * horizonHours * targetUtilization));
  const currentSupply = countSupply(first, robotaxis, zones, places, serviceAreas);
  const gap = Math.max(0, expectedDemand - currentSupply);
  const revenue = predictedOrders * averageRevenue;
  const cost = gap * Number(strategy.average_reposition_distance_km || 3) * Number(strategy.reposition_cost_per_km || 0);
  const profit = revenue - cost;
  const pressure = expectedDemand > 0 ? gap / expectedDemand : 0;
  const score = round(100 * (Math.min(1, predictedOrders / 50) * Number(strategy.demand_weight || 0) + pressure * Number(strategy.supply_gap_weight || 0) + pressure * Number(strategy.service_pressure_weight || 0) + Math.max(0, Math.min(1, profit / Math.max(1, revenue))) * Number(strategy.profit_weight || 0)));
  const targetCell = resolveTargetCell(first, zones, places, serviceAreas);
  return withLifecycleStatus({
    deployment_plan_id: planId,
    plan_name: `${first.target_object_name || first.target_object_id}投放计划`,
    plan_status: DeploymentPlanStatus.DRAFT,
    deployment_decision_run_id: runId,
    deployment_decision_strategy_id: strategy.deployment_decision_strategy_id,
    short_term_forecast_run_id: first.short_term_forecast_run_id,
    short_term_forecast_result_ids: forecastResults.map((item) => item.short_term_forecast_result_id),
    target_zone_id: first.target_zone_id,
    target_object_type: first.target_object_type,
    target_object_id: first.target_object_id,
    target_object_name: first.target_object_name,
    target_service_area_id: first.target_object_type === "SERVICE_AREA" ? first.target_object_id : null,
    target_cell_id: targetCell,
    plan_start_at: forecastResults[0].forecast_bucket_start_at,
    plan_end_at: forecastResults.at(-1).forecast_bucket_end_at,
    predicted_order_count: round(predictedOrders),
    expected_robotaxi_demand: expectedDemand,
    current_supply_quantity: currentSupply,
    robotaxi_gap_quantity: gap,
    planned_robotaxi_count: gap,
    deployment_priority_score: score,
    deployment_priority_rank: null,
    expected_revenue_amount: round(revenue),
    estimated_deployment_cost_amount: round(cost),
    expected_profit_amount: round(profit),
    generated_task_ids: [],
    strategy_snapshot: { ...strategy },
    created_at: occurredAt,
    updated_at: occurredAt,
  }, { objectType: "deploymentPlan", idField: "deployment_plan_id", statusField: "plan_status", fromStatus: null, toStatus: DeploymentPlanStatus.DRAFT, actionType: "DEPLOYMENT_PLAN_CREATE", resultType: "DEPLOYMENT_PLAN_CREATED", occurredAt });
}

function createDecisionRun({ runId, strategy, occurredAt, status, planCount = 0, failureReason = null, forecastRunId = null, robotaxis = [] }) {
  return {
    deployment_decision_run_id: runId,
    deployment_decision_strategy_id: strategy?.deployment_decision_strategy_id || null,
    strategy_name: strategy?.strategy_name || null,
    strategy_version: strategy?.strategy_version || null,
    run_status: status,
    short_term_forecast_run_id: forecastRunId,
    plan_count: planCount,
    failure_reason: failureReason,
    strategy_snapshot: strategy ? { ...strategy } : null,
    input_snapshot: { robotaxi_count: robotaxis.length },
    started_at: occurredAt,
    completed_at: occurredAt,
  };
}

function transitionPlan(plan, status, actionType, resultType, occurredAt, patch) {
  return withLifecycleStatus({ ...plan, ...patch, plan_status: status, updated_at: occurredAt }, { objectType: "deploymentPlan", idField: "deployment_plan_id", statusField: "plan_status", fromStatus: plan.plan_status, toStatus: status, actionType, resultType, occurredAt });
}

function createForecastTargets({ strategy, demandProfiles, zones, places, serviceAreas }) {
  return demandProfiles.filter((profile) => ["ZONE", "PLACE", "SERVICE_AREA"].includes(profile.target_object_type) && profile.profile_status !== "ARCHIVED")
    .map((profile) => ({ target_object_type: profile.target_object_type, target_object_id: profile.target_object_id, target_object_name: profile.target_object_name || profile.profile_name || profile.target_object_id, target_zone_id: resolveZoneId(profile, zones, places, serviceAreas), profile }))
    .filter((item) => !strategy.target_zone_ids?.length || strategy.target_zone_ids.includes(item.target_zone_id) || strategy.target_zone_ids.includes(item.target_object_id));
}

function createOrderFacts(serviceOrders, trips) {
  const tripByOrder = new Map(trips.map((item) => [item.service_order_id, item]));
  return serviceOrders.map((order) => { const trip = tripByOrder.get(order.service_order_id) || {}; return { createdAt: order.created_at || order.simulation_created_at || trip.created_at, pickupCellId: order.pickup_cell_id || trip.pickup_cell_id, dropoffCellId: order.dropoff_cell_id || trip.dropoff_cell_id, revenue: Number(order.final_price ?? order.estimated_price ?? 0), completed: ["COMPLETED", "PAID", "SETTLED"].includes(order.order_status) }; });
}

function resolveForecastPeriod(strategy, occurredAt) {
  const startAt = strategy.forecast_start_at || occurredAt;
  const horizon = Math.max(1, Number(strategy.forecast_horizon_value || 24));
  const horizonHours = strategy.forecast_horizon_unit === "DAY" ? horizon * 24 : horizon;
  const bucketHours = strategy.time_bucket_unit === "DAY" ? 24 : 1;
  return { startAt, endAt: new Date(Date.parse(startAt) + horizonHours * 3600000).toISOString(), bucketCount: Math.ceil(horizonHours / bucketHours) };
}

function addBucket(startAt, unit, index) { return new Date(Date.parse(startAt) + index * (unit === "DAY" ? 86400000 : 3600000)).toISOString(); }
function resolveDailyBaseline(profile = {}) { return Number(profile.baseline_addressable_daily_orders ?? profile.potential_daily_trips ?? profile.potential_demand ?? profile.service_area_demand ?? profile.expected_robotaxi_demand ?? 0); }
function resolveHistoricalDailyDemand(facts, days = 7) { return facts.length ? facts.length / Math.max(1, Number(days || 7)) : 0; }
function resolveRecentTrend(facts) { if (facts.length < 2) return 1; const midpoint = Math.ceil(facts.length / 2); const older = Math.max(1, midpoint); const recent = Math.max(1, facts.length - midpoint); return Math.max(0.5, Math.min(1.5, recent / older)); }
function resolveHourShare(hour, profile = {}) { const peak = Number(profile.busiest_hour_share || profile.peak_hour_share || 0.1); return [7, 8, 9, 17, 18, 19].includes(hour) ? peak : Math.max(0, (1 - peak * 6) / 18); }
function resolveDateFactor(strategy, at) { const day = new Date(at).getDay(); if (strategy.date_type === "HOLIDAY") return Number(strategy.holiday_factor || 1.25); if (strategy.date_type === "WEEKEND" || day === 0 || day === 6) return Number(strategy.weekend_factor || 1.08); return Number(strategy.normal_day_factor || 1); }
function normalizeWeights(profile, historical, trend, hasHistory) { if (!hasHistory) return { profile: 1, historical: 0, trend: 0 }; const total = Math.max(0.0001, Number(profile || 0) + Number(historical || 0) + Number(trend || 0)); return { profile: Number(profile || 0) / total, historical: Number(historical || 0) / total, trend: Number(trend || 0) / total }; }
function isOrderInTarget(fact, target, zones, places, serviceAreas) { const cells = resolveTargetCells(target, zones, places, serviceAreas); return !cells.size || cells.has(fact.pickupCellId) || cells.has(fact.dropoffCellId); }
function countSupply(target, robotaxis, zones, places, serviceAreas) { const cells = resolveTargetCells(target, zones, places, serviceAreas); return robotaxis.filter((item) => ["AVAILABLE", "OPERATIONAL", "READY"].includes(item.availability_status) && !item.current_task_id && !item.current_order_id && (!cells.size ? item.target_zone_id === target.target_zone_id || item.service_zone_id === target.target_zone_id : cells.has(item.current_cell_id || item.location_cell_id))).length; }
function resolveTargetCell(target, zones, places, serviceAreas) { return [...resolveTargetCells(target, zones, places, serviceAreas)][0] || null; }
function resolveTargetCells(target, zones, places, serviceAreas) { if (!target) return new Set(); if (target.target_object_type === "SERVICE_AREA") return new Set(serviceAreas.find((item) => item.service_area_id === target.target_object_id)?.cell_ids || []); if (target.target_object_type === "PLACE") { const place = places.find((item) => item.place_id === target.target_object_id) || {}; const areas = serviceAreas.filter((item) => item.parent_place_id === place.place_id || place.nearby_service_area_ids?.includes(item.service_area_id)); return new Set([...(place.cell_ids || []), ...areas.flatMap((item) => item.cell_ids || [])]); } return new Set(zones.find((item) => item.zone_id === target.target_object_id)?.cell_ids || []); }
function resolveZoneId(profile, zones, places, serviceAreas) { if (profile.target_object_type === "ZONE") return profile.target_object_id; const objectId = profile.target_object_id; return zones.find((zone) => !zone.parent_zone_id && ((zone.place_ids || []).includes(objectId) || (zone.service_area_ids || []).includes(objectId)))?.zone_id || zones.find((zone) => (zone.place_ids || []).includes(objectId) || (zone.service_area_ids || []).includes(objectId))?.parent_zone_id || places.find((place) => place.place_id === objectId)?.zone_id || serviceAreas.find((area) => area.service_area_id === objectId)?.zone_id || null; }
function groupBy(values, selector) { const result = new Map(); values.forEach((value) => { const key = selector(value); result.set(key, [...(result.get(key) || []), value]); }); return result; }
function resolveId(factory, provided, fallback) { return typeof factory === "function" ? factory() : provided || fallback; }
function resolveNow(context) { return typeof context.now === "function" ? context.now() : context.now || new Date().toISOString(); }
function average(values) { return values.length ? sum(values) / values.length : 0; }
function sum(values) { return values.reduce((total, value) => total + Number(value || 0), 0); }
function round(value, digits = 2) { const factor = 10 ** digits; return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor; }
