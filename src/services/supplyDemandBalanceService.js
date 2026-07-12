export const SupplyDemandBalanceStrategyStatus = {
  ACTIVE: "ACTIVE",
  DRAFT: "DRAFT",
  ARCHIVED: "ARCHIVED",
};

export const SupplyDemandBalanceRunStatus = {
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
};

export const SupplyDemandBalanceResultStatus = {
  GENERATED: "GENERATED",
  PENDING_DEPLOYMENT_DEMAND: "PENDING_DEPLOYMENT_DEMAND",
};

const TargetObjectType = {
  ZONE: "ZONE",
  PLACE: "PLACE",
  SERVICE_AREA: "SERVICE_AREA",
};

export function initializeDefaultSupplyDemandBalanceStrategies(now = defaultNow()) {
  return [{
    supply_demand_balance_strategy_id: "SDB-STR-001",
    strategy_name: "短期供需平衡策略",
    strategy_status: SupplyDemandBalanceStrategyStatus.ACTIVE,
    strategy_version: "1.0.0",
    balance_algorithm: "SHORT_TERM_PROFIT_PRIORITY",
    target_zone_ids: ["Z-001"],
    forecast_window_hours: 24,
    demand_weight: 0.35,
    gap_weight: 0.3,
    urgency_weight: 0.2,
    profit_weight: 0.15,
    vehicle_service_capacity_per_hour: 2,
    default_average_order_revenue: 35,
    deployment_cost_per_km: 2.4,
    average_reposition_distance_km: 3,
    min_profit_amount: 0,
    created_at: now,
    updated_at: now,
  }];
}

export function executeSupplyDemandBalanceStrategy({
  strategy,
  demandProfiles = [],
  serviceOrders = [],
  trips = [],
  robotaxis = [],
  zones = [],
  places = [],
  serviceAreas = [],
  context = {},
} = {}) {
  const startedAt = resolveNow(context);
  const runId = resolveRunId(context);
  if (!strategy?.supply_demand_balance_strategy_id || strategy.strategy_status !== SupplyDemandBalanceStrategyStatus.ACTIVE) {
    return {
      run: createBalanceRun({
        runId,
        strategy,
        runStatus: SupplyDemandBalanceRunStatus.FAILED,
        occurredAt: startedAt,
        resultCount: 0,
        failureReason: "SUPPLY_DEMAND_BALANCE_STRATEGY_NOT_ACTIVE",
      }),
      results: [],
    };
  }

  const targetZoneIds = resolveTargetZoneIds(strategy, demandProfiles, zones);
  const targetProfiles = createTargetProfiles({ strategy, demandProfiles, targetZoneIds, zones, places, serviceAreas });
  if (!targetProfiles.length) {
    return {
      run: createBalanceRun({
        runId,
        strategy,
        runStatus: SupplyDemandBalanceRunStatus.FAILED,
        occurredAt: startedAt,
        resultCount: 0,
        failureReason: "NO_SUPPLY_DEMAND_TARGET",
        targetZoneIds,
      }),
      results: [],
    };
  }

  const orderFacts = createOrderFacts(serviceOrders, trips);
  const globalAverageRevenue = calculateAverageRevenue(orderFacts) || Number(strategy.default_average_order_revenue || 35);
  const globalAverageDurationMin = calculateAverageDuration(orderFacts) || 30;
  const rawResults = targetProfiles.map((profile, index) => createBalanceResult({
    resultId: resolveResultId(context, index),
    runId,
    strategy,
    profile,
    orderFacts,
    robotaxis,
    zones,
    places,
    serviceAreas,
    globalAverageRevenue,
    globalAverageDurationMin,
    occurredAt: startedAt,
  }));
  const rankedResults = rankBalanceResults(rawResults);
  return {
    run: createBalanceRun({
      runId,
      strategy,
      runStatus: SupplyDemandBalanceRunStatus.SUCCEEDED,
      occurredAt: startedAt,
      resultCount: rankedResults.length,
      failureReason: rankedResults.length ? null : "NO_SUPPLY_DEMAND_RESULT",
      targetZoneIds,
    }),
    results: rankedResults,
  };
}

function createBalanceRun({
  runId,
  strategy,
  runStatus,
  occurredAt,
  resultCount = 0,
  failureReason = null,
  targetZoneIds = [],
}) {
  return {
    supply_demand_balance_run_id: runId,
    supply_demand_balance_strategy_id: strategy?.supply_demand_balance_strategy_id || null,
    strategy_name: strategy?.strategy_name || null,
    strategy_version: strategy?.strategy_version || null,
    balance_algorithm: strategy?.balance_algorithm || null,
    run_status: runStatus,
    target_zone_ids: targetZoneIds,
    forecast_window_hours: Number(strategy?.forecast_window_hours || 0),
    started_at: occurredAt,
    completed_at: occurredAt,
    result_count: resultCount,
    failure_reason: failureReason,
    strategy_snapshot: strategy ? { ...strategy } : null,
  };
}

function createBalanceResult({
  resultId,
  runId,
  strategy,
  profile,
  orderFacts,
  robotaxis,
  zones,
  places,
  serviceAreas,
  globalAverageRevenue,
  globalAverageDurationMin,
  occurredAt,
}) {
  const matchingOrders = orderFacts.filter((fact) => isOrderInTarget(fact, profile, zones, places, serviceAreas));
  const historicalOrderCount = matchingOrders.length;
  const completedOrderCount = matchingOrders.filter((fact) => fact.completed).length;
  const profileDemand = resolveProfileDemand(profile);
  const forecastWindowHours = Math.max(1, Number(strategy.forecast_window_hours || 24));
  const historicalDailyDemand = historicalOrderCount > 0 ? historicalOrderCount : 0;
  const forecastOrderCount = Math.max(profileDemand, historicalDailyDemand) * (forecastWindowHours / 24);
  const averageDurationMin = calculateAverageDuration(matchingOrders) || globalAverageDurationMin;
  const vehicleCapacityPerHour = Math.max(0.1, Number(strategy.vehicle_service_capacity_per_hour || 2));
  const expectedDemandQuantity = Math.ceil((forecastOrderCount * averageDurationMin) / Math.max(1, vehicleCapacityPerHour * 60 * forecastWindowHours));
  const currentSupplyQuantity = countCurrentSupply(profile, robotaxis, zones, places, serviceAreas);
  const robotaxiGapQuantity = Math.max(0, expectedDemandQuantity - currentSupplyQuantity);
  const recommendedDeploymentQuantity = robotaxiGapQuantity;
  const averageRevenue = calculateAverageRevenue(matchingOrders) || globalAverageRevenue;
  const expectedRevenueAmount = forecastOrderCount * averageRevenue;
  const averageRepositionDistanceKm = Number(strategy.average_reposition_distance_km || 3);
  const estimatedDeploymentCostAmount = recommendedDeploymentQuantity * averageRepositionDistanceKm * Number(strategy.deployment_cost_per_km || 0);
  const expectedProfitAmount = expectedRevenueAmount - estimatedDeploymentCostAmount;
  const fulfillmentRate = historicalOrderCount > 0 ? completedOrderCount / historicalOrderCount : 1;
  const gapRatio = expectedDemandQuantity > 0 ? robotaxiGapQuantity / expectedDemandQuantity : 0;
  const demandIntensityScore = normalizeScore(forecastOrderCount, 50);
  const gapScore = normalizeScore(gapRatio, 1);
  const urgencyScore = normalizeScore((1 - fulfillmentRate) + gapRatio, 2);
  const profitScore = normalizeScore(expectedProfitAmount, Math.max(1, expectedRevenueAmount));
  const demandUrgencyScore = roundNumber(100 * (
    demandIntensityScore * Number(strategy.demand_weight || 0) +
    gapScore * Number(strategy.gap_weight || 0) +
    urgencyScore * Number(strategy.urgency_weight || 0) +
    profitScore * Number(strategy.profit_weight || 0)
  ), 2);

  return {
    supply_demand_balance_result_id: resultId,
    supply_demand_balance_run_id: runId,
    supply_demand_balance_strategy_id: strategy.supply_demand_balance_strategy_id,
    result_status: SupplyDemandBalanceResultStatus.GENERATED,
    target_object_type: profile.target_object_type,
    target_object_id: profile.target_object_id,
    target_object_name: profile.target_object_name,
    target_zone_id: profile.target_zone_id,
    forecast_window_hours: forecastWindowHours,
    historical_order_count: historicalOrderCount,
    completed_order_count: completedOrderCount,
    forecast_order_count: roundNumber(forecastOrderCount, 2),
    expected_demand_quantity: expectedDemandQuantity,
    current_supply_quantity: currentSupplyQuantity,
    robotaxi_gap_quantity: robotaxiGapQuantity,
    demand_urgency_score: demandUrgencyScore,
    deployment_priority_rank: null,
    recommended_deployment_quantity: recommendedDeploymentQuantity,
    expected_revenue_amount: roundNumber(expectedRevenueAmount, 2),
    estimated_deployment_cost_amount: roundNumber(estimatedDeploymentCostAmount, 2),
    expected_profit_amount: roundNumber(expectedProfitAmount, 2),
    profit_score: roundNumber(profitScore * 100, 2),
    average_order_revenue: roundNumber(averageRevenue, 2),
    average_fulfillment_duration_min: roundNumber(averageDurationMin, 2),
    average_reposition_distance_km: roundNumber(averageRepositionDistanceKm, 2),
    deployment_demand_order_id: null,
    strategy_snapshot: { ...strategy },
    demand_profile_snapshot: profile.source_profile ? { ...profile.source_profile } : null,
    created_at: occurredAt,
  };
}

function rankBalanceResults(results = []) {
  return [...results]
    .sort((a, b) => {
      const urgency = Number(b.demand_urgency_score || 0) - Number(a.demand_urgency_score || 0);
      if (urgency !== 0) return urgency;
      const profit = Number(b.expected_profit_amount || 0) - Number(a.expected_profit_amount || 0);
      if (profit !== 0) return profit;
      return String(a.target_object_id || "").localeCompare(String(b.target_object_id || ""));
    })
    .map((result, index) => ({ ...result, deployment_priority_rank: index + 1 }));
}

function createTargetProfiles({ strategy, demandProfiles, targetZoneIds, zones, places, serviceAreas }) {
  const zoneById = new Map((zones || []).map((zone) => [zone.zone_id, zone]));
  const profileTargets = (demandProfiles || [])
    .filter((profile) => ["ZONE", "PLACE", "SERVICE_AREA"].includes(profile.target_object_type))
    .map((profile) => {
      const targetZoneId = resolveTargetZoneId(profile, zones, places, serviceAreas);
      return {
        target_object_type: profile.target_object_type,
        target_object_id: profile.target_object_id,
        target_object_name: profile.target_object_name || profile.profile_name || profile.target_object_id,
        target_zone_id: targetZoneId,
        source_profile: profile,
      };
    })
    .filter((profile) => !targetZoneIds.length || targetZoneIds.includes(profile.target_zone_id) || targetZoneIds.includes(profile.target_object_id));
  if (profileTargets.length) return profileTargets;
  return (targetZoneIds.length ? targetZoneIds : (zones || []).filter((zone) => !zone.parent_zone_id).map((zone) => zone.zone_id)).map((zoneId) => ({
    target_object_type: TargetObjectType.ZONE,
    target_object_id: zoneId,
    target_object_name: zoneById.get(zoneId)?.zone_name || zoneId,
    target_zone_id: zoneId,
    source_profile: null,
  }));
}

function createOrderFacts(serviceOrders = [], trips = []) {
  const tripByOrderId = new Map((trips || []).map((trip) => [trip.service_order_id, trip]));
  return (serviceOrders || []).map((order) => {
    const trip = tripByOrderId.get(order.service_order_id) || {};
    return {
      service_order_id: order.service_order_id,
      completed: ["COMPLETED", "PAID", "SETTLED"].includes(order.order_status) || ["COMPLETED", "PAID", "SETTLED"].includes(trip.trip_status),
      pickup_cell_id: order.pickup_cell_id || trip.pickup_cell_id,
      dropoff_cell_id: order.dropoff_cell_id || trip.dropoff_cell_id,
      final_price: Number(order.final_price ?? order.estimated_price ?? trip.final_price ?? 0),
      total_duration_min: Number(order.trip_total_duration_min ?? order.estimated_duration_min ?? trip.time_elapsed ?? trip.total_duration_min ?? 0),
    };
  });
}

function isOrderInTarget(orderFact, profile, zones, places, serviceAreas) {
  const cellIds = resolveTargetCellIds(profile, zones, places, serviceAreas);
  if (!cellIds.size) return true;
  return cellIds.has(orderFact.pickup_cell_id) || cellIds.has(orderFact.dropoff_cell_id);
}

function countCurrentSupply(profile, robotaxis, zones, places, serviceAreas) {
  const cellIds = resolveTargetCellIds(profile, zones, places, serviceAreas);
  return (robotaxis || []).filter((robotaxi) => {
    const available = ["AVAILABLE", "OPERATIONAL", "IN_OPERATION", "READY"].includes(robotaxi.availability_status);
    const idle = !robotaxi.current_task_id && !robotaxi.current_order_id;
    if (!available || !idle) return false;
    if (!cellIds.size) return profile.target_zone_id ? robotaxi.target_zone_id === profile.target_zone_id || robotaxi.service_zone_id === profile.target_zone_id : true;
    return cellIds.has(robotaxi.current_cell_id) || cellIds.has(robotaxi.location_cell_id);
  }).length;
}

function resolveTargetCellIds(profile, zones, places, serviceAreas) {
  if (profile.target_object_type === TargetObjectType.ZONE) {
    const zone = (zones || []).find((item) => item.zone_id === profile.target_object_id);
    return new Set(zone?.cell_ids || []);
  }
  if (profile.target_object_type === TargetObjectType.PLACE) {
    const place = (places || []).find((item) => item.place_id === profile.target_object_id);
    const nearbyServiceAreas = (serviceAreas || []).filter((area) => (place?.nearby_service_area_ids || []).includes(area.service_area_id));
    return new Set([...(place?.cell_ids || []), ...nearbyServiceAreas.flatMap((area) => area.cell_ids || [])]);
  }
  if (profile.target_object_type === TargetObjectType.SERVICE_AREA) {
    const area = (serviceAreas || []).find((item) => item.service_area_id === profile.target_object_id);
    return new Set(area?.cell_ids || []);
  }
  return new Set();
}

function resolveTargetZoneId(profile, zones, places, serviceAreas) {
  if (profile.target_object_type === TargetObjectType.ZONE) return profile.target_object_id;
  if (profile.target_object_type === TargetObjectType.PLACE) {
    return (zones || []).find((zone) => (zone.place_ids || []).includes(profile.target_object_id) && !zone.parent_zone_id)?.zone_id
      || (zones || []).find((zone) => (zone.place_ids || []).includes(profile.target_object_id))?.parent_zone_id
      || null;
  }
  if (profile.target_object_type === TargetObjectType.SERVICE_AREA) {
    return (zones || []).find((zone) => (zone.service_area_ids || []).includes(profile.target_object_id) && !zone.parent_zone_id)?.zone_id
      || (zones || []).find((zone) => (zone.service_area_ids || []).includes(profile.target_object_id))?.parent_zone_id
      || null;
  }
  return null;
}

function resolveProfileDemand(profile) {
  const source = profile.source_profile || {};
  return Number(source.expected_robotaxi_demand ?? source.service_area_demand ?? source.potential_demand ?? source.peak_hour_demand ?? 0);
}

function resolveTargetZoneIds(strategy, demandProfiles, zones) {
  if (Array.isArray(strategy.target_zone_ids) && strategy.target_zone_ids.length) return strategy.target_zone_ids;
  const zoneProfileIds = (demandProfiles || [])
    .filter((profile) => profile.target_object_type === TargetObjectType.ZONE && profile.profile_status === "ACTIVE")
    .map((profile) => profile.target_object_id);
  if (zoneProfileIds.length) return unique(zoneProfileIds);
  return (zones || [])
    .filter((zone) => !zone.parent_zone_id && ["Testing", "Active"].includes(zone.zone_status))
    .map((zone) => zone.zone_id);
}

function calculateAverageRevenue(orderFacts = []) {
  const values = orderFacts.map((fact) => Number(fact.final_price || 0)).filter((value) => value > 0);
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateAverageDuration(orderFacts = []) {
  const values = orderFacts.map((fact) => Number(fact.total_duration_min || 0)).filter((value) => value > 0);
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeScore(value, maxValue) {
  const numberValue = Number(value || 0);
  const denominator = Math.max(1, Number(maxValue || 1));
  return Math.max(0, Math.min(1, numberValue / denominator));
}

function resolveRunId(context) {
  if (typeof context.nextRunId === "function") return context.nextRunId();
  return context.runId || "SDB-RUN-0001";
}

function resolveResultId(context, index) {
  if (typeof context.nextResultId === "function") return context.nextResultId(index);
  return `SDB-RES-${String(index + 1).padStart(4, "0")}`;
}

function resolveNow(context = {}) {
  if (typeof context.now === "function") return context.now();
  return context.now || defaultNow();
}

function defaultNow() {
  return new Date().toISOString();
}

function roundNumber(value, digits = 2) {
  return Number((Number(value || 0)).toFixed(digits));
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}
