export const SupplyProductionProfileStatus = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
};

export const LongTermDemandForecastStrategyStatus = {
  ACTIVE: "ACTIVE",
  DRAFT: "DRAFT",
  ARCHIVED: "ARCHIVED",
};

export const LongTermDemandForecastRunStatus = {
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
};

export const LongTermDemandForecastResultStatus = {
  GENERATED: "GENERATED",
};

export function initializeDefaultSupplyProductionProfiles(now = defaultNow()) {
  return [{
    profile_id: "SPP-001",
    profile_name: "自有生产能力画像",
    profile_type: "SELF_PRODUCTION",
    profile_status: SupplyProductionProfileStatus.ACTIVE,
    production_lead_time_days: 180,
    annual_production_capacity: 120,
    monthly_production_capacity: 10,
    ramp_up_months: 3,
    delivery_capacity: 20,
    inspection_lead_time_days: 3,
    effective_from: "2026-01-01",
    effective_to: null,
    created_at: now,
    updated_at: now,
  }];
}

export function initializeDefaultLongTermDemandForecastStrategies(now = defaultNow()) {
  return [{
    forecast_strategy_id: "LDF-STR-001",
    strategy_name: "长期需求预测策略",
    strategy_type: "ZONE_DEMAND_TO_FLEET_REQUIREMENT",
    strategy_status: LongTermDemandForecastStrategyStatus.ACTIVE,
    strategy_version: "1.0.0",
    target_zone_ids: ["Z-001"],
    forecast_horizon_years: 3,
    demand_buffer_ratio: 0.15,
    fleet_utilization_target: 0.72,
    created_at: now,
    updated_at: now,
  }];
}

export function executeLongTermDemandForecastStrategy({
  strategy,
  demandProfiles = [],
  supplyProductionProfiles = [],
  robotaxis = [],
  context = {},
} = {}) {
  const startedAt = resolveNow(context);
  if (!strategy?.forecast_strategy_id || strategy.strategy_status !== LongTermDemandForecastStrategyStatus.ACTIVE) {
    const failedRun = createForecastRun({
      runId: resolveRunId(context),
      strategy,
      runStatus: LongTermDemandForecastRunStatus.FAILED,
      startedAt,
      completedAt: startedAt,
      resultCount: 0,
      failureReason: "FORECAST_STRATEGY_NOT_ACTIVE",
    });
    return { run: failedRun, results: [] };
  }

  const activeProductionProfile = supplyProductionProfiles.find((item) => item.profile_status === SupplyProductionProfileStatus.ACTIVE)
    || supplyProductionProfiles[0]
    || null;
  const targetZoneIds = Array.isArray(strategy.target_zone_ids) && strategy.target_zone_ids.length
    ? strategy.target_zone_ids
    : unique(demandProfiles.filter((item) => item.target_object_type === "ZONE").map((item) => item.target_object_id));
  const zoneProfiles = demandProfiles.filter((profile) => profile.target_object_type === "ZONE" && targetZoneIds.includes(profile.target_object_id));
  const runId = resolveRunId(context);
  const resultBaseId = resolveResultBaseId(context);
  const completedAt = resolveNow(context);
  const results = zoneProfiles.map((profile, index) => createForecastResult({
    resultId: `${resultBaseId}-${String(index + 1).padStart(3, "0")}`,
    runId,
    strategy,
    profile,
    productionProfile: activeProductionProfile,
    robotaxis,
    occurredAt: completedAt,
  }));
  const run = createForecastRun({
    runId,
    strategy,
    runStatus: LongTermDemandForecastRunStatus.SUCCEEDED,
    startedAt,
    completedAt,
    resultCount: results.length,
    failureReason: results.length ? null : "NO_ZONE_DEMAND_PROFILE",
    targetZoneIds,
  });
  return { run, results };
}

function createForecastRun({
  runId,
  strategy,
  runStatus,
  startedAt,
  completedAt,
  resultCount,
  failureReason = null,
  targetZoneIds = [],
}) {
  return {
    forecast_run_id: runId,
    forecast_strategy_id: strategy?.forecast_strategy_id || null,
    strategy_name: strategy?.strategy_name || null,
    strategy_version: strategy?.strategy_version || null,
    run_status: runStatus,
    target_zone_ids: targetZoneIds,
    started_at: startedAt,
    completed_at: completedAt,
    result_count: resultCount,
    failure_reason: failureReason,
    strategy_snapshot: strategy ? { ...strategy } : null,
  };
}

function createForecastResult({ resultId, runId, strategy, profile, productionProfile, robotaxis, occurredAt }) {
  const expectedDemand = Number(profile.expected_robotaxi_demand || profile.service_area_demand || profile.potential_demand || 0);
  const bufferRatio = Number(strategy.demand_buffer_ratio ?? 0.15);
  const utilizationTarget = Math.max(0.1, Number(strategy.fleet_utilization_target ?? 0.72));
  const requiredFleetQuantity = Math.ceil((expectedDemand * (1 + bufferRatio)) / utilizationTarget);
  const currentFleetQuantity = robotaxis.filter((item) => item.target_zone_id === profile.target_object_id || item.service_zone_id === profile.target_object_id || profile.target_object_id === "Z-001").length;
  const fleetGapQuantity = Math.max(0, requiredFleetQuantity - currentFleetQuantity);
  return {
    forecast_result_id: resultId,
    forecast_id: resultId,
    forecast_name: `${profile.target_object_name || profile.target_object_id}需求预测`,
    forecast_status: LongTermDemandForecastResultStatus.GENERATED,
    forecast_period: `${strategy.forecast_horizon_years || 3}年`,
    forecast_strategy_id: strategy.forecast_strategy_id,
    forecast_run_id: runId,
    zone_id: profile.target_object_id,
    zone_name: profile.target_object_name,
    demand_profile_id: profile.profile_id,
    supply_production_profile_id: productionProfile?.profile_id || null,
    expected_robotaxi_demand: roundNumber(expectedDemand, 2),
    required_fleet_quantity: requiredFleetQuantity,
    current_fleet_quantity: currentFleetQuantity,
    fleet_gap_quantity: fleetGapQuantity,
    confidence_level: 0.82,
    demand_buffer_ratio: bufferRatio,
    fleet_utilization_target: utilizationTarget,
    created_at: occurredAt,
  };
}

function resolveNow(context = {}) {
  return typeof context.now === "function" ? context.now() : defaultNow();
}

function resolveRunId(context = {}) {
  return typeof context.nextRunId === "function" ? context.nextRunId() : `LDF-RUN-${Date.now()}`;
}

function resolveResultBaseId(context = {}) {
  return typeof context.nextResultBaseId === "function" ? context.nextResultBaseId() : `LDF-RES-${Date.now()}`;
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function roundNumber(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(Number(value || 0) * factor) / factor;
}

function defaultNow() {
  return new Date().toISOString();
}
