import { createRobotaxi } from "../domain/operationsCenterTypes.js?v=20260608-v018-bfs-route-planning";
import { getFieldSemanticDefinition } from "../domain/fieldSemanticRegistry.js?v=20260719-v047-4-0";
import {
  calculateLongTermDemandPlan,
  normalizeLongTermDemandForecastResult,
  normalizeLongTermDemandForecastResults,
  resolveForecastPeriod,
  validatePlanningInputs,
} from "../domain/longTermDemandPlanning.js?v=20260717-v047-1-0";

export { normalizeLongTermDemandForecastResult, normalizeLongTermDemandForecastResults };

export const SupplyProductionProfileStatus = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
};

export const BusinessTargetStatus = {
  ACTIVE: "ACTIVE",
  DRAFT: "DRAFT",
  ARCHIVED: "ARCHIVED",
};

export const LongTermDemandForecastStrategyStatus = {
  ACTIVE: "ACTIVE",
  DRAFT: "DRAFT",
  ARCHIVED: "ARCHIVED",
};

export const LongTermDemandForecastRunStatus = {
  SUCCEEDED: "SUCCEEDED",
  NO_RESULT: "NO_RESULT",
  FAILED: "FAILED",
};

export const LongTermDemandForecastResultStatus = {
  GENERATED: "GENERATED",
};

export const businessPlanningObjectSchemas = {
  businessTarget: {
    tabs: [
      { key: "basic", label: "目标信息", fields: ["business_target_id", "target_name", "target_status", "target_version", "target_zone_ids"] },
      { key: "period", label: "规划周期", fields: ["forecast_start_date", "forecast_period_unit", "forecast_period_count", "forecast_end_date"] },
      { key: "operation", label: "运营目标", fields: ["target_end_daily_orders", "target_order_fulfillment_rate", "target_order_service_time_utilization_rate", "target_minimum_robotaxi_quantity", "planning_mode"] },
      { key: "economics", label: "经济假设", fields: ["average_revenue_per_order", "average_variable_cost_per_order", "daily_fixed_operating_cost", "minimum_contribution_margin_rate"] },
    ],
    explanations: {
      forecast_start_date: "经营规划开始生效的日期，也是需求与供给趋势的时间起点。",
      forecast_period_unit: "规划周期的基础单位，必须与区域画像增长率周期一致。",
      forecast_period_count: "从规划起点向后预测的周期数量。",
      planning_mode: getFieldSemanticDefinition("planning_mode").definition,
      target_end_daily_orders: "预测期末典型经营日希望完成的订单数量，不是预测期累计订单。",
      target_order_fulfillment_rate: getFieldSemanticDefinition("target_order_fulfillment_rate").definition,
      target_order_service_time_utilization_rate: getFieldSemanticDefinition("target_order_service_time_utilization_rate").definition,
      target_minimum_robotaxi_quantity: "即使需求模型计算值更低，经营规划仍需保有的最低 Robotaxi 规模。",
      average_revenue_per_order: "用于经营可行性判断的平均单笔服务收入假设。",
      average_variable_cost_per_order: "随订单数量变化的平均单笔成本假设。",
      daily_fixed_operating_cost: "与当日订单量无关的日固定运营成本假设。",
      minimum_contribution_margin_rate: "经营目标可接受的最低单笔贡献毛利率。",
    },
  },
  supplyProductionProfile: {
    tabs: [
      { key: "basic", label: "画像信息", fields: ["profile_id", "profile_name", "profile_status", "profile_version"] },
      { key: "capacity", label: "生产能力", fields: ["production_lead_time_days", "production_capacity_period_unit", "production_capacity_per_period", "ramp_up_periods", "ramp_up_capacity_ratios"] },
      { key: "delivery", label: "质检与交付", fields: ["quality_inspection_lead_time_days", "delivery_capacity_per_period"] },
      { key: "validity", label: "版本有效期", fields: ["effective_from", "effective_to", "created_at", "updated_at"] },
    ],
    explanations: {
      production_lead_time_days: "从生产计划开始到首批车辆完成生产所需的准备和制造时间。",
      production_capacity_per_period: "产能稳定后每个生产能力周期最多完成的 Robotaxi 数量。",
      ramp_up_capacity_ratios: "产能爬坡期间各周期相对稳定产能的比例。",
      quality_inspection_lead_time_days: "生产完成后的工厂质量检验时间，不等于车辆到达运营中心后的运营准入。",
      delivery_capacity_per_period: "每个生产能力周期最多可完成物流交付的 Robotaxi 数量。",
      production_capacity_period_unit: "生产能力和交付能力共同使用的统计周期单位。",
      ramp_up_periods: "从启动生产到稳定产能所经历的能力周期数。",
      effective_from: "画像版本开始适用的日期；预测开始日期必须落在有效期内。",
      effective_to: "画像版本停止适用的日期；为空表示持续有效。",
    },
  },
  longTermDemandForecastStrategy: {
    tabs: [
      { key: "basic", label: "策略信息", fields: ["forecast_strategy_id", "strategy_name", "strategy_type", "strategy_status", "strategy_version", "target_zone_ids"] },
      { key: "growth", label: "增长规则", fields: ["growth_scenario", "growth_model", "growth_adjustment_rate"] },
      { key: "capacity", label: "容量参数", fields: ["demand_buffer_ratio", "operational_availability_rate", "robotaxi_available_hours_per_day", "average_pickup_duration_min", "average_trip_duration_min", "average_turnaround_duration_min"] },
      { key: "time", label: "更新时间", fields: ["created_at", "updated_at"] },
    ],
    explanations: {
      growth_scenario: "本次规划采用的经营增长情景，用于识别和复盘策略版本。",
      growth_model: "线性增长按固定增量累加，复合增长按每周期基数递增。",
      growth_adjustment_rate: "在区域画像增长率基础上增加的情景调整，不替代画像增长率。",
      demand_buffer_ratio: "为波动和预测误差预留的额外 Robotaxi 容量比例。",
      operational_availability_rate: "扣除充电、清洁、维修等不可运营时间后的资产可用比例。",
      robotaxi_available_hours_per_day: "单台 Robotaxi 每日计划运营时长。充电、清洁、维修等不可运营时间统一通过运营可用率折减，避免重复扣减。",
      average_pickup_duration_min: "Robotaxi 前往乘客上车点的平均时间，单位为分钟。",
      average_trip_duration_min: "服务订单从上车到下车的平均履约时间。",
      average_turnaround_duration_min: "一次服务结束到下一次可接单之间的平均周转时间，单位为分钟。",
    },
  },
  supplyDecisionStrategy: {
    tabs: [
      { key: "basic", label: "策略信息", fields: ["supply_decision_strategy_id", "strategy_name", "strategy_status", "strategy_version", "target_zone_ids"] },
      { key: "decision", label: "决策规则", fields: ["decision_algorithm", "demand_coverage_rate", "safety_capacity_ratio", "capacity_constraint_mode"] },
      { key: "time", label: "更新时间", fields: ["created_at", "updated_at"] },
    ],
    explanations: {
      decision_algorithm: "产能约束供应决策以预测结果冻结的 Robotaxi 缺口、可生产数量和可交付数量作为唯一输入，不在决策阶段重复计算产能。",
      demand_coverage_rate: "本次决策计划覆盖的 Robotaxi 缺口比例。",
      safety_capacity_ratio: "在缺口覆盖量上增加的安全容量比例，用于应对预测偏差和供给损耗。",
      capacity_constraint_mode: "生产与交付双约束表示计划数量同时不能超过预测期可生产数量和可交付数量。",
    },
  },
};

export function normalizeBusinessTargetFields(target = {}) {
  const { target_task_utilization_rate: legacyUtilizationRate, ...currentTarget } = target;
  return {
    ...currentTarget,
    target_order_service_time_utilization_rate: currentTarget.target_order_service_time_utilization_rate
      ?? legacyUtilizationRate
      ?? null,
  };
}

export function normalizeBusinessPlanningDefaults({ businessTargets = [], supplyProductionProfiles = [], longTermDemandForecastStrategies = [] } = {}) {
  return {
    businessTargets: businessTargets.map((target) => {
      const normalizedTarget = normalizeBusinessTargetFields(target);
      const isLegacyDefault = normalizedTarget.business_target_id === "BT-001"
        && ["三年运营增长目标", "一年运营增长目标"].includes(normalizedTarget.target_name)
        && [12, 36].includes(Number(normalizedTarget.forecast_period_count))
        && (normalizedTarget.forecast_period_unit || "MONTH") === "MONTH";
      if (!isLegacyDefault) return normalizedTarget;
      const period = resolveForecastPeriod({ ...normalizedTarget, forecast_period_unit: "MONTH", forecast_period_count: 12 });
      return { ...normalizedTarget, target_name: "基准经营目标", forecast_period_count: 12, forecast_end_date: period.endDate };
    }),
    supplyProductionProfiles: supplyProductionProfiles.map((profile) => (
      profile.profile_id === "SPP-001"
        && Number(profile.production_lead_time_days) === 180
        && profile.created_at === profile.updated_at
        ? { ...profile, production_lead_time_days: 10 }
        : profile
    )),
    longTermDemandForecastStrategies: longTermDemandForecastStrategies.map((strategy) => (
      strategy.forecast_strategy_id === "LDF-STR-001"
        && Number(strategy.growth_adjustment_rate || 0) === 0
        && strategy.created_at === strategy.updated_at
        ? { ...strategy, growth_adjustment_rate: 0.005 }
        : strategy
    )),
  };
}

export const SupplyPlanStatus = {
  DRAFT: "DRAFT",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
};

export const SupplyDecisionStrategyStatus = {
  ACTIVE: "ACTIVE",
  DRAFT: "DRAFT",
  ARCHIVED: "ARCHIVED",
};

export const SupplyDecisionRunStatus = {
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
};

export const ProductionBatchStatus = {
  PLANNED: "PLANNED",
  IN_PRODUCTION: "IN_PRODUCTION",
  AWAITING_QUALITY_INSPECTION: "AWAITING_QUALITY_INSPECTION",
  IN_QUALITY_INSPECTION: "IN_QUALITY_INSPECTION",
  QUALITY_FAILED: "QUALITY_FAILED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

export const FleetAllocationStrategyStatus = {
  ACTIVE: "ACTIVE",
  DRAFT: "DRAFT",
  ARCHIVED: "ARCHIVED",
};

export function initializeDefaultBusinessTargets(now = defaultNow()) {
  const forecastStartDate = now.slice(0, 10);
  const forecastPeriodUnit = "MONTH";
  const forecastPeriodCount = 12;
  const forecastPeriod = resolveForecastPeriod({ forecast_start_date: forecastStartDate, forecast_period_unit: forecastPeriodUnit, forecast_period_count: forecastPeriodCount });
  return [{
    business_target_id: "BT-001",
    target_name: "基准经营目标",
    target_status: BusinessTargetStatus.ACTIVE,
    target_version: "1.0.0",
    forecast_start_date: forecastStartDate,
    forecast_period_unit: forecastPeriodUnit,
    forecast_period_count: forecastPeriodCount,
    forecast_end_date: forecastPeriod.endDate,
    target_zone_ids: ["Z-001", "Z-002"],
    target_end_daily_orders: 500,
    target_minimum_robotaxi_quantity: 35,
    target_order_service_time_utilization_rate: 0.72,
    target_order_fulfillment_rate: 0.85,
    planning_mode: "BALANCED",
    average_revenue_per_order: 48,
    average_variable_cost_per_order: 18,
    daily_fixed_operating_cost: 5000,
    minimum_contribution_margin_rate: 0.3,
    created_at: now,
    updated_at: now,
  }];
}

export function initializeDefaultSupplyDecisionStrategies(now = defaultNow()) {
  return [{
    supply_decision_strategy_id: "SD-STR-001",
    strategy_name: "产能约束供应决策",
    strategy_status: SupplyDecisionStrategyStatus.ACTIVE,
    strategy_version: "1.0.0",
    decision_algorithm: "CAPACITY_CONSTRAINED",
    target_zone_ids: ["Z-001", "Z-002"],
    demand_coverage_rate: 1,
    safety_capacity_ratio: 0.05,
    include_in_transit_supply: true,
    capacity_constraint_mode: "PRODUCTION_AND_DELIVERY",
    created_at: now,
    updated_at: now,
  }];
}

export function updateBusinessTargetConfig({
  businessTarget,
  patch = {},
  context = {},
} = {}) {
  if (!businessTarget?.business_target_id) return { succeeded: false, reason: "BUSINESS_TARGET_REQUIRED", businessTarget: null };
  const occurredAt = resolveNow(context);
  const currentBusinessTarget = normalizeBusinessTargetFields(businessTarget);
  const numericFields = [
    "forecast_period_count",
    "target_end_daily_orders",
    "target_minimum_robotaxi_quantity",
    "target_order_service_time_utilization_rate",
    "target_order_fulfillment_rate",
    "average_revenue_per_order",
    "average_variable_cost_per_order",
    "daily_fixed_operating_cost",
    "minimum_contribution_margin_rate",
  ];
  const normalizedPatch = { ...patch };
  numericFields.forEach((field) => {
    if (field in normalizedPatch) normalizedPatch[field] = Math.max(0, Number(normalizedPatch[field] || 0));
  });
  const forecastStartDate = normalizedPatch.forecast_start_date || currentBusinessTarget.forecast_start_date || occurredAt.slice(0, 10);
  const forecastPeriod = resolveForecastPeriod({ ...currentBusinessTarget, ...normalizedPatch, forecast_start_date: forecastStartDate });
  return {
    succeeded: true,
    businessTarget: {
      ...currentBusinessTarget,
      ...normalizedPatch,
      forecast_start_date: forecastStartDate,
      forecast_period_unit: forecastPeriod.unit,
      forecast_period_count: forecastPeriod.count,
      forecast_end_date: forecastPeriod.endDate,
      target_status: normalizedPatch.target_status || businessTarget.target_status || BusinessTargetStatus.ACTIVE,
      updated_at: occurredAt,
    },
  };
}

export const FleetAllocationRunStatus = {
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
};

export const FleetAllocationResultStatus = {
  GENERATED: "GENERATED",
  USED_FOR_DELIVERY: "USED_FOR_DELIVERY",
};

export const RobotaxiDeliveryOrderStatus = {
  CREATED: "CREATED",
  IN_DELIVERY: "IN_DELIVERY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
};

export function initializeDefaultSupplyProductionProfiles(now = defaultNow()) {
  return [{
    profile_id: "SPP-001",
    profile_name: "自有生产能力画像",
    profile_status: SupplyProductionProfileStatus.ACTIVE,
    production_lead_time_days: 10,
    production_capacity_period_unit: "MONTH",
    production_capacity_per_period: 10,
    ramp_up_periods: 3,
    ramp_up_capacity_ratios: [0.4, 0.7, 1],
    delivery_capacity_per_period: 20,
    quality_inspection_lead_time_days: 3,
    effective_from: "2026-01-01",
    effective_to: null,
    created_at: now,
    updated_at: now,
  }];
}

export function updateSupplyProductionProfileConfig({
  profile,
  patch = {},
  context = {},
} = {}) {
  if (!profile?.profile_id) return { succeeded: false, reason: "SUPPLY_PRODUCTION_PROFILE_REQUIRED", profile: null };
  const occurredAt = resolveNow(context);
  const numericFields = [
    "production_lead_time_days",
    "production_capacity_per_period",
    "ramp_up_periods",
    "delivery_capacity_per_period",
    "quality_inspection_lead_time_days",
  ];
  const normalizedPatch = { ...patch };
  numericFields.forEach((field) => {
    if (field in normalizedPatch) normalizedPatch[field] = Math.max(0, Number(normalizedPatch[field] || 0));
  });
  return {
    succeeded: true,
    profile: {
      ...profile,
      ...normalizedPatch,
      profile_status: normalizedPatch.profile_status || profile.profile_status || SupplyProductionProfileStatus.ACTIVE,
      updated_at: occurredAt,
    },
  };
}

export function initializeDefaultLongTermDemandForecastStrategies(now = defaultNow()) {
  return [{
    forecast_strategy_id: "LDF-STR-001",
    strategy_name: "长期需求预测策略",
    strategy_type: "ZONE_DEMAND_TO_FLEET_REQUIREMENT",
    strategy_status: LongTermDemandForecastStrategyStatus.ACTIVE,
    strategy_version: "1.0.0",
    target_zone_ids: ["Z-001", "Z-002"],
    growth_scenario: "BASELINE",
    growth_model: "LINEAR",
    growth_adjustment_rate: 0.005,
    demand_buffer_ratio: 0.15,
    operational_availability_rate: 0.9,
    robotaxi_available_hours_per_day: 24,
    average_pickup_duration_min: 8,
    average_trip_duration_min: 30,
    average_turnaround_duration_min: 7,
    created_at: now,
    updated_at: now,
  }];
}

export function updateLongTermDemandForecastStrategyConfig({ strategy, patch = {}, context = {} } = {}) {
  if (!strategy?.forecast_strategy_id) return { succeeded: false, reason: "FORECAST_STRATEGY_REQUIRED", strategy: null };
  const occurredAt = resolveNow(context);
  const numericFields = [
    "growth_adjustment_rate", "demand_buffer_ratio", "operational_availability_rate",
    "robotaxi_available_hours_per_day", "average_pickup_duration_min",
    "average_trip_duration_min", "average_turnaround_duration_min",
  ];
  const normalizedPatch = { ...patch };
  numericFields.forEach((field) => {
    if (field in normalizedPatch) normalizedPatch[field] = Number(normalizedPatch[field] || 0);
  });
  return {
    succeeded: true,
    strategy: {
      ...strategy,
      ...normalizedPatch,
      strategy_status: normalizedPatch.strategy_status || strategy.strategy_status,
      updated_at: occurredAt,
    },
  };
}

export function initializeDefaultFleetAllocationStrategies(now = defaultNow()) {
  return [{
    fleet_allocation_strategy_id: "FAS-001",
    strategy_name: "交付编排策略",
    strategy_status: FleetAllocationStrategyStatus.ACTIVE,
    strategy_version: "1.0.0",
    allocation_algorithm: "ZONE_SUPPLY_URGENCY_ALLOCATION",
    target_zone_ids: ["Z-001"],
    target_ops_center_ids: ["OC-001"],
    urgency_weight: 0.5,
    demand_gap_weight: 0.3,
    production_ready_weight: 0.2,
    max_robotaxi_per_delivery_order: 20,
    created_at: now,
    updated_at: now,
  }];
}

export function executeLongTermDemandForecastStrategy({
  strategy,
  businessTargets = [],
  demandProfiles = [],
  supplyProductionProfiles = [],
  robotaxis = [],
  opsCenters = [],
  zones = [],
  existingRuns = [],
  existingResults = [],
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

  const activeBusinessTarget = businessTargets.find((item) => item.target_status === BusinessTargetStatus.ACTIVE)
    || businessTargets[0]
    || null;
  const forecastStartDate = activeBusinessTarget?.forecast_start_date || startedAt.slice(0, 10);
  const activeProductionProfile = supplyProductionProfiles.find((item) => (
    item.profile_status === SupplyProductionProfileStatus.ACTIVE
      && isEffectiveOn(item, forecastStartDate)
  )) || null;
  const targetZoneIds = Array.isArray(strategy.target_zone_ids) && strategy.target_zone_ids.length
    ? strategy.target_zone_ids
    : Array.isArray(activeBusinessTarget?.target_zone_ids) && activeBusinessTarget.target_zone_ids.length
      ? activeBusinessTarget.target_zone_ids
    : unique(demandProfiles.filter((item) => item.target_object_type === "ZONE" && item.profile_status === "ACTIVE").map((item) => item.target_object_id));
  const zoneProfiles = demandProfiles.filter((profile) => profile.target_object_type === "ZONE" && targetZoneIds.includes(profile.target_object_id));
  const inputFingerprint = createPlanningInputFingerprint({
    strategy,
    businessTarget: activeBusinessTarget,
    productionProfile: activeProductionProfile,
    zoneProfiles,
    robotaxis,
    opsCenters,
    zones,
  });
  const reusableRun = existingRuns.find((item) => item.run_status === LongTermDemandForecastRunStatus.SUCCEEDED && item.input_fingerprint === inputFingerprint);
  const reusableResults = reusableRun
    ? existingResults.filter((item) => item.forecast_run_id === reusableRun.forecast_run_id)
    : [];
  if (reusableRun && reusableResults.length) return { run: reusableRun, results: reusableResults, reused: true };
  const runId = resolveRunId(context);
  const resultBaseId = resolveResultBaseId(context);
  const completedAt = resolveNow(context);
  if (!activeBusinessTarget || !activeProductionProfile) {
    return {
      run: createForecastRun({
        runId,
        strategy,
        businessTarget: activeBusinessTarget,
        productionProfile: activeProductionProfile,
        runStatus: LongTermDemandForecastRunStatus.FAILED,
        startedAt,
        completedAt,
        resultCount: 0,
        failureReason: !activeBusinessTarget ? "BUSINESS_TARGET_REQUIRED" : "SUPPLY_PRODUCTION_PROFILE_REQUIRED",
        targetZoneIds,
        demandProfiles,
        robotaxis,
        inputFingerprint,
      }),
      results: [],
    };
  }
  const results = zoneProfiles.map((profile, index) => createPlanningForecastResult({
    resultId: `${resultBaseId}-${String(index + 1).padStart(3, "0")}`,
    runId,
    strategy,
    businessTarget: activeBusinessTarget,
    profile,
    productionProfile: activeProductionProfile,
    robotaxis,
    opsCenters,
    zones,
    demandProfiles,
    inputFingerprint,
    occurredAt: completedAt,
  })).filter(Boolean);
  const runStatus = zoneProfiles.length ? (results.length ? LongTermDemandForecastRunStatus.SUCCEEDED : LongTermDemandForecastRunStatus.FAILED) : LongTermDemandForecastRunStatus.NO_RESULT;
  const run = createForecastRun({
    runId,
    strategy,
    runStatus,
    startedAt,
    completedAt,
    resultCount: results.length,
    failureReason: results.length ? null : (zoneProfiles.length ? "FORECAST_INPUT_INVALID" : "NO_ZONE_DEMAND_PROFILE"),
    targetZoneIds,
    businessTarget: activeBusinessTarget,
    productionProfile: activeProductionProfile,
    demandProfiles,
    robotaxis,
    inputFingerprint,
  });
  return { run, results, reused: false };
}

export function findReusableLongTermDemandForecast({
  strategy,
  businessTargets = [],
  demandProfiles = [],
  supplyProductionProfiles = [],
  robotaxis = [],
  opsCenters = [],
  zones = [],
  existingRuns = [],
  existingResults = [],
} = {}) {
  const activeBusinessTarget = businessTargets.find((item) => item.target_status === BusinessTargetStatus.ACTIVE) || businessTargets[0] || null;
  const forecastStartDate = activeBusinessTarget?.forecast_start_date || defaultNow().slice(0, 10);
  const activeProductionProfile = supplyProductionProfiles.find((item) => item.profile_status === SupplyProductionProfileStatus.ACTIVE && isEffectiveOn(item, forecastStartDate)) || null;
  const targetZoneIds = Array.isArray(strategy?.target_zone_ids) && strategy.target_zone_ids.length
    ? strategy.target_zone_ids
    : activeBusinessTarget?.target_zone_ids || [];
  const zoneProfiles = demandProfiles.filter((profile) => profile.target_object_type === "ZONE" && targetZoneIds.includes(profile.target_object_id));
  const inputFingerprint = createPlanningInputFingerprint({ strategy, businessTarget: activeBusinessTarget, productionProfile: activeProductionProfile, zoneProfiles, robotaxis, opsCenters, zones });
  const run = existingRuns.find((item) => item.run_status === LongTermDemandForecastRunStatus.SUCCEEDED && item.input_fingerprint === inputFingerprint) || null;
  const results = run ? existingResults.filter((item) => item.forecast_run_id === run.forecast_run_id) : [];
  return run && results.length ? { run, results, inputFingerprint } : null;
}

export function normalizeSupplyPlans({ supplyPlans = [], forecasts = [], supplyDecisionRuns = [], supplyDecisionStrategies = [], supplyProductionProfiles = [] } = {}) {
  const forecastById = new Map((forecasts || []).map((item) => [item.forecast_result_id, item]));
  const runByPlanId = new Map((supplyDecisionRuns || []).filter((item) => item.supply_plan_id).map((item) => [item.supply_plan_id, item]));
  const strategyById = new Map((supplyDecisionStrategies || []).map((item) => [item.supply_decision_strategy_id, item]));
  const profileById = new Map((supplyProductionProfiles || []).map((item) => [item.profile_id, item]));
  return (supplyPlans || []).map((plan) => {
    const forecast = forecastById.get(plan.forecast_result_id || plan.forecast_id) || {};
    const run = runByPlanId.get(plan.supply_plan_id) || {};
    const strategy = strategyById.get(plan.supply_decision_strategy_id || run.supply_decision_strategy_id) || {};
    const profile = profileById.get(plan.supply_production_profile_id || run.supply_production_profile_id || forecast.supply_production_profile_id) || {};
    const gap = Math.max(0, Number(plan.robotaxi_gap_quantity ?? plan.fleet_gap_quantity ?? forecast.robotaxi_gap_quantity ?? forecast.fleet_gap_quantity ?? 0));
    const coveredGap = Math.ceil(gap * Math.max(0, Number(strategy.demand_coverage_rate ?? 1)));
    const safetyCapacity = Math.ceil(coveredGap * Math.max(0, Number(strategy.safety_capacity_ratio ?? 0)));
    const requiredSupply = coveredGap + safetyCapacity;
    const feasibleManufacturing = Number(plan.feasible_manufacturing_quantity ?? plan.feasible_production_quantity ?? forecast.feasible_manufacturing_quantity ?? requiredSupply);
    const feasibleDelivery = Number(plan.feasible_delivery_quantity ?? forecast.feasible_delivery_quantity ?? requiredSupply);
    const plannedQuantity = Number(plan.planned_robotaxi_count ?? Math.min(feasibleManufacturing, feasibleDelivery));
    return {
      ...plan,
      forecast_result_id: plan.forecast_result_id || plan.forecast_id || null,
      forecast_run_id: plan.forecast_run_id || forecast.forecast_run_id || null,
      supply_decision_strategy_id: plan.supply_decision_strategy_id || run.supply_decision_strategy_id || null,
      supply_decision_run_id: plan.supply_decision_run_id || run.supply_decision_run_id || null,
      supply_production_profile_id: plan.supply_production_profile_id || run.supply_production_profile_id || forecast.supply_production_profile_id || null,
      required_robotaxi_quantity: plan.required_robotaxi_quantity ?? forecast.required_robotaxi_quantity ?? null,
      effective_current_robotaxi: plan.effective_current_robotaxi ?? forecast.effective_current_robotaxi ?? null,
      robotaxi_gap_quantity: gap,
      covered_gap_quantity: plan.covered_gap_quantity ?? coveredGap,
      safety_capacity_quantity: plan.safety_capacity_quantity ?? safetyCapacity,
      required_supply_quantity: plan.required_supply_quantity ?? requiredSupply,
      feasible_manufacturing_quantity: plan.feasible_manufacturing_quantity ?? feasibleManufacturing,
      feasible_delivery_quantity: plan.feasible_delivery_quantity ?? feasibleDelivery,
      planned_robotaxi_count: plannedQuantity,
      uncovered_robotaxi_gap: plan.uncovered_robotaxi_gap ?? Math.max(0, requiredSupply - plannedQuantity),
    };
  });
}

export function createSupplyPlanFromForecast({
  forecast,
  supplyProductionProfiles = [],
  supplyDecisionStrategy = null,
  supplyDecisionRunId = null,
  context = {},
} = {}) {
  const occurredAt = resolveNow(context);
  if (!forecast?.forecast_result_id) {
    return { succeeded: false, reason: "FORECAST_RESULT_REQUIRED", supplyPlan: null };
  }
  const rawGap = Math.max(0, Number(forecast.robotaxi_gap_quantity ?? forecast.fleet_gap_quantity ?? 0));
  if (rawGap <= 0) {
    return { succeeded: false, reason: "NO_FLEET_GAP", supplyPlan: null };
  }
  const productionProfile = supplyProductionProfiles.find((item) => item.profile_id === forecast.supply_production_profile_id)
    || supplyProductionProfiles.find((item) => item.profile_status === SupplyProductionProfileStatus.ACTIVE)
    || supplyProductionProfiles[0]
    || {};
  const coverageRate = Math.max(0, Number(supplyDecisionStrategy?.demand_coverage_rate ?? 1));
  const safetyRatio = Math.max(0, Number(supplyDecisionStrategy?.safety_capacity_ratio ?? 0));
  const coveredGap = Math.ceil(rawGap * coverageRate);
  const safetyCapacity = Math.ceil(coveredGap * safetyRatio);
  const requiredSupply = coveredGap + safetyCapacity;
  const feasibleManufacturing = Math.max(0, Number(forecast.feasible_manufacturing_quantity ?? forecast.feasible_supply_quantity ?? rawGap));
  const feasibleDelivery = Math.max(0, Number(forecast.feasible_delivery_quantity ?? forecast.feasible_supply_quantity ?? rawGap));
  const feasibleQuantity = Math.max(0, Math.floor(Math.min(requiredSupply, feasibleManufacturing, feasibleDelivery)));
  const plannedRobotaxiCount = feasibleQuantity;
  if (plannedRobotaxiCount <= 0) return { succeeded: false, reason: "NO_FEASIBLE_SUPPLY_CAPACITY", supplyPlan: null };
  const supplyPlan = withLifecycleStatus({
    supply_plan_id: resolveSupplyPlanId(context),
    plan_name: `${forecast.zone_name || forecast.zone_id || "区域"}生产计划`,
    plan_status: SupplyPlanStatus.DRAFT,
    forecast_id: forecast.forecast_result_id,
    forecast_result_id: forecast.forecast_result_id,
    forecast_run_id: forecast.forecast_run_id,
    supply_decision_strategy_id: supplyDecisionStrategy?.supply_decision_strategy_id || null,
    supply_decision_run_id: supplyDecisionRunId,
    target_zone_id: forecast.zone_id,
    target_zone_name: forecast.zone_name,
    supply_production_profile_id: productionProfile.profile_id || null,
    planned_robotaxi_count: plannedRobotaxiCount,
    required_robotaxi_quantity: forecast.required_robotaxi_quantity ?? null,
    effective_current_robotaxi: forecast.effective_current_robotaxi ?? null,
    robotaxi_gap_quantity: rawGap,
    covered_gap_quantity: coveredGap,
    safety_capacity_quantity: safetyCapacity,
    required_supply_quantity: requiredSupply,
    feasible_manufacturing_quantity: Math.min(requiredSupply, feasibleManufacturing),
    feasible_delivery_quantity: Math.min(requiredSupply, feasibleDelivery),
    uncovered_robotaxi_gap: Math.max(0, requiredSupply - plannedRobotaxiCount),
    production_lead_time_days: productionProfile.production_lead_time_days ?? null,
    planned_start_date: forecast.forecast_start_date || occurredAt.slice(0, 10),
    planned_end_date: forecast.full_supply_completion_date || forecast.first_delivery_date || addDaysIsoDate(occurredAt, Number(productionProfile.production_lead_time_days || 180)),
    created_at: occurredAt,
    updated_at: occurredAt,
  }, {
    objectType: "supplyPlan",
    idField: "supply_plan_id",
    statusField: "plan_status",
    fromStatus: null,
    toStatus: SupplyPlanStatus.DRAFT,
    actionType: "SUPPLY_PLAN_CREATE",
    resultType: "SUPPLY_PLAN_CREATED",
    occurredAt,
  });
  return { succeeded: true, supplyPlan };
}

export function executeSupplyDecisionStrategy({
  strategy,
  forecast,
  supplyProductionProfiles = [],
  existingSupplyPlans = [],
  context = {},
} = {}) {
  const occurredAt = resolveNow(context);
  const runIdFactory = context.nextRunId || context.nextSupplyDecisionRunId;
  const runId = typeof runIdFactory === "function" ? runIdFactory() : context.supplyDecisionRunId || "SD-RUN-0001";
  const failed = (reason) => ({
    run: {
      supply_decision_run_id: runId,
      supply_decision_strategy_id: strategy?.supply_decision_strategy_id || null,
      forecast_result_id: forecast?.forecast_result_id || null,
      run_status: SupplyDecisionRunStatus.FAILED,
      supply_plan_id: null,
      failure_reason: reason,
      strategy_snapshot: strategy ? { ...strategy } : null,
      forecast_snapshot: forecast ? { ...forecast } : null,
      started_at: occurredAt,
      completed_at: occurredAt,
    },
    supplyPlan: null,
    succeeded: false,
    reason,
  });
  if (!strategy?.supply_decision_strategy_id || strategy.strategy_status !== SupplyDecisionStrategyStatus.ACTIVE) return failed("SUPPLY_DECISION_STRATEGY_NOT_ACTIVE");
  if (!forecast?.forecast_result_id) return failed("FORECAST_RESULT_REQUIRED");
  const existingSupplyPlan = (existingSupplyPlans || []).find((item) => item.forecast_result_id === forecast.forecast_result_id && item.plan_status !== SupplyPlanStatus.CANCELLED);
  if (existingSupplyPlan) return { succeeded: true, supplyPlan: existingSupplyPlan, run: null, reused: true };
  const result = createSupplyPlanFromForecast({ forecast, supplyProductionProfiles, supplyDecisionStrategy: strategy, supplyDecisionRunId: runId, context });
  if (!result.succeeded) return failed(result.reason);
  return {
    succeeded: true,
    reused: false,
    supplyPlan: result.supplyPlan,
    run: {
      supply_decision_run_id: runId,
      supply_decision_strategy_id: strategy.supply_decision_strategy_id,
      forecast_result_id: forecast.forecast_result_id,
      supply_production_profile_id: result.supplyPlan.supply_production_profile_id,
      target_zone_id: result.supplyPlan.target_zone_id,
      run_status: SupplyDecisionRunStatus.SUCCEEDED,
      supply_plan_id: result.supplyPlan.supply_plan_id,
      robotaxi_gap_quantity: result.supplyPlan.robotaxi_gap_quantity,
      covered_gap_quantity: result.supplyPlan.covered_gap_quantity,
      safety_capacity_quantity: result.supplyPlan.safety_capacity_quantity,
      required_supply_quantity: result.supplyPlan.required_supply_quantity,
      planned_robotaxi_count: result.supplyPlan.planned_robotaxi_count,
      uncovered_robotaxi_gap: result.supplyPlan.uncovered_robotaxi_gap,
      failure_reason: null,
      strategy_snapshot: { ...strategy },
      forecast_snapshot: { ...forecast },
      production_profile_snapshot: supplyProductionProfiles.find((item) => item.profile_id === result.supplyPlan.supply_production_profile_id) || null,
      started_at: occurredAt,
      completed_at: occurredAt,
    },
  };
}

export function confirmSupplyPlan({ supplyPlan, context = {} } = {}) {
  if (!supplyPlan?.supply_plan_id) return { succeeded: false, reason: "SUPPLY_PLAN_REQUIRED", supplyPlan: null };
  if (supplyPlan.plan_status !== SupplyPlanStatus.DRAFT) return { succeeded: false, reason: "SUPPLY_PLAN_NOT_DRAFT", supplyPlan };
  const occurredAt = resolveNow(context);
  return {
    succeeded: true,
    supplyPlan: withLifecycleStatus({
      ...supplyPlan,
      plan_status: SupplyPlanStatus.CONFIRMED,
      confirmed_at: occurredAt,
      updated_at: occurredAt,
    }, {
      objectType: "supplyPlan",
      idField: "supply_plan_id",
      statusField: "plan_status",
      fromStatus: supplyPlan.plan_status,
      toStatus: SupplyPlanStatus.CONFIRMED,
      actionType: "SUPPLY_PLAN_CONFIRM",
      resultType: "SUPPLY_PLAN_CONFIRMED",
      occurredAt,
    }),
  };
}

export function cancelSupplyPlan({ supplyPlan, context = {} } = {}) {
  if (!supplyPlan?.supply_plan_id) return { succeeded: false, reason: "SUPPLY_PLAN_REQUIRED", supplyPlan: null };
  if ([SupplyPlanStatus.CANCELLED].includes(supplyPlan.plan_status)) return { succeeded: false, reason: "SUPPLY_PLAN_ALREADY_CANCELLED", supplyPlan };
  const occurredAt = resolveNow(context);
  return {
    succeeded: true,
    supplyPlan: withLifecycleStatus({
      ...supplyPlan,
      plan_status: SupplyPlanStatus.CANCELLED,
      cancelled_at: occurredAt,
      updated_at: occurredAt,
    }, {
      objectType: "supplyPlan",
      idField: "supply_plan_id",
      statusField: "plan_status",
      fromStatus: supplyPlan.plan_status,
      toStatus: SupplyPlanStatus.CANCELLED,
      actionType: "SUPPLY_PLAN_CANCEL",
      resultType: "SUPPLY_PLAN_CANCELLED",
      occurredAt,
    }),
  };
}

export function createProductionBatchFromSupplyPlan({ supplyPlan, context = {} } = {}) {
  const occurredAt = resolveNow(context);
  if (!supplyPlan?.supply_plan_id) return { succeeded: false, reason: "SUPPLY_PLAN_REQUIRED", productionBatch: null };
  if (supplyPlan.plan_status !== SupplyPlanStatus.CONFIRMED) return { succeeded: false, reason: "SUPPLY_PLAN_NOT_CONFIRMED", productionBatch: null };
  const plannedQuantity = Math.max(0, Number(supplyPlan.planned_robotaxi_count || 0));
  if (plannedQuantity <= 0) return { succeeded: false, reason: "NO_PLANNED_ROBOTAXI_COUNT", productionBatch: null };
  const productionBatch = withLifecycleStatus({
    production_batch_id: resolveProductionBatchId(context),
    batch_name: `${supplyPlan.plan_name || supplyPlan.supply_plan_id}生产批次`,
    batch_status: ProductionBatchStatus.PLANNED,
    supply_plan_id: supplyPlan.supply_plan_id,
    target_zone_id: supplyPlan.target_zone_id,
    target_zone_name: supplyPlan.target_zone_name,
    planned_robotaxi_count: plannedQuantity,
    produced_robotaxi_count: 0,
    produced_robotaxi_ids: [],
    production_started_at: null,
    production_completed_at: null,
    created_at: occurredAt,
    updated_at: occurredAt,
  }, {
    objectType: "productionBatch",
    idField: "production_batch_id",
    statusField: "batch_status",
    fromStatus: null,
    toStatus: ProductionBatchStatus.PLANNED,
    actionType: "PRODUCTION_BATCH_CREATE",
    resultType: "PRODUCTION_BATCH_CREATED",
    occurredAt,
  });
  return { succeeded: true, productionBatch };
}

export function startProductionBatch({ productionBatch, context = {} } = {}) {
  if (!productionBatch?.production_batch_id) return { succeeded: false, reason: "PRODUCTION_BATCH_REQUIRED", productionBatch: null };
  if (productionBatch.batch_status !== ProductionBatchStatus.PLANNED) return { succeeded: false, reason: "PRODUCTION_BATCH_NOT_PLANNED", productionBatch };
  const occurredAt = resolveNow(context);
  return {
    succeeded: true,
    productionBatch: withLifecycleStatus({
      ...productionBatch,
      batch_status: ProductionBatchStatus.IN_PRODUCTION,
      production_started_at: occurredAt,
      updated_at: occurredAt,
    }, {
      objectType: "productionBatch",
      idField: "production_batch_id",
      statusField: "batch_status",
      fromStatus: productionBatch.batch_status,
      toStatus: ProductionBatchStatus.IN_PRODUCTION,
      actionType: "PRODUCTION_BATCH_START",
      resultType: "PRODUCTION_BATCH_STARTED",
      occurredAt,
    }),
  };
}

export function completeProductionBatch({
  productionBatch,
  context = {},
} = {}) {
  if (!productionBatch?.production_batch_id) return { succeeded: false, reason: "PRODUCTION_BATCH_REQUIRED", productionBatch: null, robotaxis: [] };
  if (productionBatch.batch_status !== ProductionBatchStatus.IN_PRODUCTION) return { succeeded: false, reason: "PRODUCTION_BATCH_NOT_IN_PRODUCTION", productionBatch, robotaxis: [] };
  const occurredAt = resolveNow(context);
  const completedBatch = withLifecycleStatus({
    ...productionBatch,
    batch_status: ProductionBatchStatus.AWAITING_QUALITY_INSPECTION,
    production_completed_at: occurredAt,
    updated_at: occurredAt,
  }, {
    objectType: "productionBatch",
    idField: "production_batch_id",
    statusField: "batch_status",
    fromStatus: productionBatch.batch_status,
    toStatus: ProductionBatchStatus.AWAITING_QUALITY_INSPECTION,
    actionType: "PRODUCTION_BATCH_COMPLETE",
    resultType: "PRODUCTION_BATCH_COMPLETED",
    occurredAt,
  });
  return { succeeded: true, productionBatch: completedBatch, robotaxis: [] };
}

export function startProductionQualityInspection({ productionBatch, context = {} } = {}) {
  if (!productionBatch?.production_batch_id) return { succeeded: false, reason: "PRODUCTION_BATCH_REQUIRED", productionBatch: null };
  if (productionBatch.batch_status !== ProductionBatchStatus.AWAITING_QUALITY_INSPECTION) return { succeeded: false, reason: "PRODUCTION_BATCH_NOT_AWAITING_QUALITY_INSPECTION", productionBatch };
  const occurredAt = resolveNow(context);
  return {
    succeeded: true,
    productionBatch: withLifecycleStatus({
      ...productionBatch,
      batch_status: ProductionBatchStatus.IN_QUALITY_INSPECTION,
      quality_inspection_started_at: occurredAt,
      updated_at: occurredAt,
    }, {
      objectType: "productionBatch",
      idField: "production_batch_id",
      statusField: "batch_status",
      fromStatus: productionBatch.batch_status,
      toStatus: ProductionBatchStatus.IN_QUALITY_INSPECTION,
      actionType: "PRODUCTION_QUALITY_INSPECTION_START",
      resultType: "PRODUCTION_QUALITY_INSPECTION_STARTED",
      occurredAt,
    }),
  };
}

export function passProductionQualityInspection({ productionBatch, existingRobotaxis = [], context = {} } = {}) {
  if (!productionBatch?.production_batch_id) return { succeeded: false, reason: "PRODUCTION_BATCH_REQUIRED", productionBatch: null, robotaxis: [] };
  if (productionBatch.batch_status !== ProductionBatchStatus.IN_QUALITY_INSPECTION) return { succeeded: false, reason: "PRODUCTION_BATCH_NOT_IN_QUALITY_INSPECTION", productionBatch, robotaxis: [] };
  const occurredAt = resolveNow(context);
  const plannedQuantity = Math.max(0, Number(productionBatch.planned_robotaxi_count || 0));
  const existingIds = new Set((existingRobotaxis || []).map((item) => item.robotaxi_id));
  const robotaxis = Array.from({ length: plannedQuantity }, (_, index) => {
    const robotaxiId = resolveRobotaxiId(context, existingIds, index);
    existingIds.add(robotaxiId);
    return createProducedRobotaxi({ robotaxiId, productionBatch, occurredAt, index });
  });
  return {
    succeeded: true,
    robotaxis,
    productionBatch: withLifecycleStatus({
      ...productionBatch,
      batch_status: ProductionBatchStatus.COMPLETED,
      quality_inspection_result: "PASSED",
      quality_inspection_completed_at: occurredAt,
      produced_robotaxi_count: robotaxis.length,
      produced_robotaxi_ids: robotaxis.map((item) => item.robotaxi_id),
      updated_at: occurredAt,
    }, {
      objectType: "productionBatch",
      idField: "production_batch_id",
      statusField: "batch_status",
      fromStatus: productionBatch.batch_status,
      toStatus: ProductionBatchStatus.COMPLETED,
      actionType: "PRODUCTION_QUALITY_INSPECTION_PASS",
      resultType: "PRODUCTION_QUALITY_INSPECTION_PASSED",
      occurredAt,
    }),
  };
}

export function failProductionQualityInspection({ productionBatch, failureReason = "QUALITY_INSPECTION_FAILED", context = {} } = {}) {
  if (!productionBatch?.production_batch_id) return { succeeded: false, reason: "PRODUCTION_BATCH_REQUIRED", productionBatch: null, robotaxis: [] };
  if (productionBatch.batch_status !== ProductionBatchStatus.IN_QUALITY_INSPECTION) return { succeeded: false, reason: "PRODUCTION_BATCH_NOT_IN_QUALITY_INSPECTION", productionBatch, robotaxis: [] };
  const occurredAt = resolveNow(context);
  return {
    succeeded: true,
    robotaxis: [],
    productionBatch: withLifecycleStatus({
      ...productionBatch,
      batch_status: ProductionBatchStatus.QUALITY_FAILED,
      quality_inspection_result: "FAILED",
      quality_inspection_failure_reason: failureReason,
      quality_inspection_completed_at: occurredAt,
      updated_at: occurredAt,
    }, {
      objectType: "productionBatch",
      idField: "production_batch_id",
      statusField: "batch_status",
      fromStatus: productionBatch.batch_status,
      toStatus: ProductionBatchStatus.QUALITY_FAILED,
      actionType: "PRODUCTION_QUALITY_INSPECTION_FAIL",
      resultType: "PRODUCTION_QUALITY_INSPECTION_FAILED",
      occurredAt,
    }),
  };
}

export function executeFleetAllocationStrategy({
  strategy,
  robotaxis = [],
  supplyPlans = [],
  productionBatches = [],
  opsCenters = [],
  context = {},
} = {}) {
  const occurredAt = resolveNow(context);
  const runId = resolveFleetAllocationRunId(context);
  if (!strategy?.fleet_allocation_strategy_id || strategy.strategy_status !== FleetAllocationStrategyStatus.ACTIVE) {
    return {
      run: createFleetAllocationRun({ runId, strategy, runStatus: FleetAllocationRunStatus.FAILED, occurredAt, resultCount: 0, failureReason: "FLEET_ALLOCATION_STRATEGY_NOT_ACTIVE" }),
      results: [],
    };
  }
  const allocatedIds = new Set();
  const eligibleRobotaxis = (robotaxis || []).filter((robotaxi) => {
    if (allocatedIds.has(robotaxi.robotaxi_id)) return false;
    return robotaxi.availability_status === "PENDING_DELIVERY";
  });
  const opsCenter = opsCenters[0] || {};
  const targetZoneIds = Array.isArray(strategy.target_zone_ids) && strategy.target_zone_ids.length ? strategy.target_zone_ids : unique(supplyPlans.map((item) => item.target_zone_id));
  const results = targetZoneIds.map((zoneId, index) => {
    const zonePlan = (supplyPlans || []).find((plan) => plan.target_zone_id === zoneId && plan.plan_status !== SupplyPlanStatus.CANCELLED) || {};
    const batchRobotaxiIds = new Set((productionBatches || [])
      .filter((batch) => !zoneId || batch.target_zone_id === zoneId)
      .flatMap((batch) => batch.produced_robotaxi_ids || []));
    const candidates = eligibleRobotaxis.filter((robotaxi) => (
      !batchRobotaxiIds.size || batchRobotaxiIds.has(robotaxi.robotaxi_id)
    ) && !allocatedIds.has(robotaxi.robotaxi_id));
    const quantity = Math.min(
      candidates.length,
      Math.max(0, Number(zonePlan.planned_robotaxi_count || candidates.length)),
      Number(strategy.max_robotaxi_per_delivery_order || candidates.length || 0),
    );
    const allocatedRobotaxis = candidates.slice(0, quantity);
    allocatedRobotaxis.forEach((robotaxi) => allocatedIds.add(robotaxi.robotaxi_id));
    return {
      fleet_allocation_result_id: resolveFleetAllocationResultId(context, index),
      fleet_allocation_run_id: runId,
      fleet_allocation_strategy_id: strategy.fleet_allocation_strategy_id,
      result_status: FleetAllocationResultStatus.GENERATED,
      target_zone_id: zoneId,
      target_ops_center_id: opsCenter.ops_center_id || strategy.target_ops_center_ids?.[0] || null,
      supply_plan_id: zonePlan.supply_plan_id || null,
      allocated_quantity: allocatedRobotaxis.length,
      allocated_robotaxi_ids: allocatedRobotaxis.map((item) => item.robotaxi_id),
      candidate_robotaxi_ids: candidates.map((item) => item.robotaxi_id),
      strategy_snapshot: { ...strategy },
      created_at: occurredAt,
    };
  }).filter((result) => result.allocated_quantity > 0);
  return {
    run: createFleetAllocationRun({
      runId,
      strategy,
      runStatus: FleetAllocationRunStatus.SUCCEEDED,
      occurredAt,
      resultCount: results.length,
      failureReason: results.length ? null : "NO_ELIGIBLE_ROBOTAXI",
    }),
    results,
  };
}

export function createDeliveryOrderFromAllocationResult({ allocationResult, context = {} } = {}) {
  const occurredAt = resolveNow(context);
  if (!allocationResult?.fleet_allocation_result_id) return { succeeded: false, reason: "ALLOCATION_RESULT_REQUIRED", deliveryOrder: null };
  if (!Array.isArray(allocationResult.allocated_robotaxi_ids) || !allocationResult.allocated_robotaxi_ids.length) {
    return { succeeded: false, reason: "NO_ALLOCATED_ROBOTAXI", deliveryOrder: null };
  }
  const deliveryOrder = withLifecycleStatus({
    delivery_order_id: resolveDeliveryOrderId(context),
    delivery_order_name: `${allocationResult.target_zone_id || "区域"}区域交付单`,
    delivery_status: RobotaxiDeliveryOrderStatus.CREATED,
    fleet_allocation_result_id: allocationResult.fleet_allocation_result_id,
    fleet_allocation_run_id: allocationResult.fleet_allocation_run_id,
    target_zone_id: allocationResult.target_zone_id,
    target_ops_center_id: allocationResult.target_ops_center_id,
    robotaxi_ids: [...allocationResult.allocated_robotaxi_ids],
    robotaxi_count: allocationResult.allocated_robotaxi_ids.length,
    delivered_robotaxi_ids: [],
    readiness_task_ids: [],
    created_at: occurredAt,
    updated_at: occurredAt,
  }, {
    objectType: "robotaxiDeliveryOrder",
    idField: "delivery_order_id",
    statusField: "delivery_status",
    fromStatus: null,
    toStatus: RobotaxiDeliveryOrderStatus.CREATED,
    actionType: "DELIVERY_ORDER_CREATE",
    resultType: "DELIVERY_ORDER_CREATED",
    occurredAt,
  });
  return { succeeded: true, deliveryOrder };
}

export function startDeliveryOrder({ deliveryOrder, robotaxis = [], context = {} } = {}) {
  if (!deliveryOrder?.delivery_order_id) return { succeeded: false, reason: "DELIVERY_ORDER_REQUIRED", deliveryOrder: null, robotaxis };
  if (deliveryOrder.delivery_status !== RobotaxiDeliveryOrderStatus.CREATED) return { succeeded: false, reason: "DELIVERY_ORDER_NOT_CREATED", deliveryOrder, robotaxis };
  const occurredAt = resolveNow(context);
  const startedOrder = withLifecycleStatus({
    ...deliveryOrder,
    delivery_status: RobotaxiDeliveryOrderStatus.IN_DELIVERY,
    delivery_started_at: occurredAt,
    updated_at: occurredAt,
  }, {
    objectType: "robotaxiDeliveryOrder",
    idField: "delivery_order_id",
    statusField: "delivery_status",
    fromStatus: deliveryOrder.delivery_status,
    toStatus: RobotaxiDeliveryOrderStatus.IN_DELIVERY,
    actionType: "DELIVERY_ORDER_START",
    resultType: "DELIVERY_ORDER_STARTED",
    occurredAt,
  });
  const nextRobotaxis = updateRobotaxisForDelivery(robotaxis, deliveryOrder.robotaxi_ids, {
    availability_status: "IN_DELIVERY",
    target_zone_id: deliveryOrder.target_zone_id,
    target_ops_center_id: deliveryOrder.target_ops_center_id,
    updated_at: occurredAt,
  });
  return { succeeded: true, deliveryOrder: startedOrder, robotaxis: nextRobotaxis };
}

export function completeDeliveryOrder({ deliveryOrder, robotaxis = [], readinessTasks = [], opsCenters = [], context = {} } = {}) {
  if (!deliveryOrder?.delivery_order_id) return { succeeded: false, reason: "DELIVERY_ORDER_REQUIRED", deliveryOrder: null, robotaxis, readinessTasks };
  if (deliveryOrder.delivery_status !== RobotaxiDeliveryOrderStatus.IN_DELIVERY) return { succeeded: false, reason: "DELIVERY_ORDER_NOT_IN_DELIVERY", deliveryOrder, robotaxis, readinessTasks };
  const occurredAt = resolveNow(context);
  const deliveredIds = [...(deliveryOrder.robotaxi_ids || [])];
  const newReadinessTasks = deliveredIds.map((robotaxiId, index) => createDeliveryReadinessTask({
    robotaxiId,
    deliveryOrder,
    occurredAt,
    taskId: resolveReadinessTaskId(context, index),
  }));
  const completedOrder = withLifecycleStatus({
    ...deliveryOrder,
    delivery_status: RobotaxiDeliveryOrderStatus.DELIVERED,
    delivered_robotaxi_ids: deliveredIds,
    readiness_task_ids: newReadinessTasks.map((task) => task.task_id),
    delivery_completed_at: occurredAt,
    updated_at: occurredAt,
  }, {
    objectType: "robotaxiDeliveryOrder",
    idField: "delivery_order_id",
    statusField: "delivery_status",
    fromStatus: deliveryOrder.delivery_status,
    toStatus: RobotaxiDeliveryOrderStatus.DELIVERED,
    actionType: "DELIVERY_ORDER_COMPLETE",
    resultType: "DELIVERY_ORDER_DELIVERED",
    occurredAt,
  });
  const targetOpsCenter = opsCenters.find((item) => item.ops_center_id === deliveryOrder.target_ops_center_id) || {};
  const deliveryCellIds = targetOpsCenter.cell_ids || [];
  const nextRobotaxis = updateRobotaxisForDelivery(robotaxis, deliveredIds, (robotaxi, index) => ({
    availability_status: "PENDING_ADMISSION",
    available_for_dispatch: false,
    current_task_id: null,
    current_task_type: null,
    current_task_status: null,
    target_zone_id: deliveryOrder.target_zone_id,
    target_ops_center_id: deliveryOrder.target_ops_center_id,
    current_cell_id: deliveryCellIds[index % Math.max(1, deliveryCellIds.length)] || null,
    updated_at: occurredAt,
  }));
  return {
    succeeded: true,
    deliveryOrder: completedOrder,
    robotaxis: nextRobotaxis,
    readinessTasks: [...newReadinessTasks, ...(readinessTasks || [])],
  };
}

export function completeSupplyManagementLoopFromForecast({
  forecast,
  supplyProductionProfiles = [],
  supplyDecisionStrategies = [],
  fleetAllocationStrategies = [],
  existingRobotaxis = [],
  existingSupplyPlans = [],
  opsCenters = [],
  readinessTasks = [],
  context = {},
} = {}) {
  const supplyDecisionStrategy = supplyDecisionStrategies.find((item) => item.strategy_status === SupplyDecisionStrategyStatus.ACTIVE)
    || supplyDecisionStrategies[0]
    || initializeDefaultSupplyDecisionStrategies(context.now)[0];
  const supplyDecisionResult = executeSupplyDecisionStrategy({
    strategy: supplyDecisionStrategy,
    forecast,
    supplyProductionProfiles,
    existingSupplyPlans,
    context,
  });
  const supplyPlanResult = supplyDecisionResult.succeeded
    ? { succeeded: true, supplyPlan: supplyDecisionResult.supplyPlan }
    : supplyDecisionResult;
  if (!supplyPlanResult.succeeded) {
    return { succeeded: false, reason: supplyPlanResult.reason, step: "CREATE_SUPPLY_PLAN", supplyPlan: null };
  }

  const confirmedPlanResult = confirmSupplyPlan({
    supplyPlan: supplyPlanResult.supplyPlan,
    context,
  });
  if (!confirmedPlanResult.succeeded) {
    return {
      succeeded: false,
      reason: confirmedPlanResult.reason,
      step: "CONFIRM_SUPPLY_PLAN",
      supplyPlan: supplyPlanResult.supplyPlan,
    };
  }

  const batchCreateResult = createProductionBatchFromSupplyPlan({
    supplyPlan: confirmedPlanResult.supplyPlan,
    context,
  });
  if (!batchCreateResult.succeeded) {
    return {
      succeeded: false,
      reason: batchCreateResult.reason,
      step: "CREATE_PRODUCTION_BATCH",
      supplyPlan: confirmedPlanResult.supplyPlan,
    };
  }

  const startedBatchResult = startProductionBatch({
    productionBatch: batchCreateResult.productionBatch,
    context,
  });
  if (!startedBatchResult.succeeded) {
    return {
      succeeded: false,
      reason: startedBatchResult.reason,
      step: "START_PRODUCTION_BATCH",
      supplyPlan: confirmedPlanResult.supplyPlan,
      productionBatch: batchCreateResult.productionBatch,
    };
  }

  const completedBatchResult = completeProductionBatch({
    productionBatch: startedBatchResult.productionBatch,
    context,
  });
  if (!completedBatchResult.succeeded) {
    return {
      succeeded: false,
      reason: completedBatchResult.reason,
      step: "COMPLETE_PRODUCTION_BATCH",
      supplyPlan: confirmedPlanResult.supplyPlan,
      productionBatch: startedBatchResult.productionBatch,
    };
  }

  const startedInspectionResult = startProductionQualityInspection({
    productionBatch: completedBatchResult.productionBatch,
    context,
  });
  if (!startedInspectionResult.succeeded) {
    return {
      succeeded: false,
      reason: startedInspectionResult.reason,
      step: "START_PRODUCTION_QUALITY_INSPECTION",
      supplyPlan: confirmedPlanResult.supplyPlan,
      productionBatch: completedBatchResult.productionBatch,
    };
  }

  const passedInspectionResult = passProductionQualityInspection({
    productionBatch: startedInspectionResult.productionBatch,
    existingRobotaxis,
    context,
  });
  if (!passedInspectionResult.succeeded) {
    return {
      succeeded: false,
      reason: passedInspectionResult.reason,
      step: "PASS_PRODUCTION_QUALITY_INSPECTION",
      supplyPlan: confirmedPlanResult.supplyPlan,
      productionBatch: startedInspectionResult.productionBatch,
    };
  }

  const strategy = (fleetAllocationStrategies || []).find((item) => item.strategy_status === FleetAllocationStrategyStatus.ACTIVE)
    || (fleetAllocationStrategies || [])[0];
  const allRobotaxisAfterProduction = [
    ...(passedInspectionResult.robotaxis || []),
    ...(existingRobotaxis || []),
  ];
  const allocation = executeFleetAllocationStrategy({
    strategy,
    robotaxis: allRobotaxisAfterProduction,
    supplyPlans: [confirmedPlanResult.supplyPlan, ...(existingSupplyPlans || [])],
    productionBatches: [passedInspectionResult.productionBatch],
    opsCenters,
    context,
  });
  if (!allocation.results?.length) {
    return {
      succeeded: false,
      reason: allocation.run?.failure_reason || "NO_ELIGIBLE_ROBOTAXI",
      step: "EXECUTE_FLEET_ALLOCATION",
      supplyPlan: confirmedPlanResult.supplyPlan,
      productionBatch: passedInspectionResult.productionBatch,
      robotaxis: allRobotaxisAfterProduction,
      fleetAllocationRun: allocation.run,
      fleetAllocationResults: [],
    };
  }

  const deliveryCreateResult = createDeliveryOrderFromAllocationResult({
    allocationResult: allocation.results[0],
    context,
  });
  if (!deliveryCreateResult.succeeded) {
    return {
      succeeded: false,
      reason: deliveryCreateResult.reason,
      step: "CREATE_DELIVERY_ORDER",
      supplyPlan: confirmedPlanResult.supplyPlan,
      productionBatch: passedInspectionResult.productionBatch,
      robotaxis: allRobotaxisAfterProduction,
      fleetAllocationRun: allocation.run,
      fleetAllocationResults: allocation.results,
    };
  }

  const deliveryStartedResult = startDeliveryOrder({
    deliveryOrder: deliveryCreateResult.deliveryOrder,
    robotaxis: allRobotaxisAfterProduction,
    context,
  });
  if (!deliveryStartedResult.succeeded) {
    return {
      succeeded: false,
      reason: deliveryStartedResult.reason,
      step: "START_DELIVERY_ORDER",
      supplyPlan: confirmedPlanResult.supplyPlan,
      productionBatch: passedInspectionResult.productionBatch,
      robotaxis: allRobotaxisAfterProduction,
      fleetAllocationRun: allocation.run,
      fleetAllocationResults: allocation.results,
      deliveryOrder: deliveryCreateResult.deliveryOrder,
    };
  }

  const deliveryCompletedResult = completeDeliveryOrder({
    deliveryOrder: deliveryStartedResult.deliveryOrder,
    robotaxis: deliveryStartedResult.robotaxis,
    readinessTasks,
    opsCenters,
    context,
  });
  if (!deliveryCompletedResult.succeeded) {
    return {
      succeeded: false,
      reason: deliveryCompletedResult.reason,
      step: "COMPLETE_DELIVERY_ORDER",
      supplyPlan: confirmedPlanResult.supplyPlan,
      productionBatch: passedInspectionResult.productionBatch,
      robotaxis: deliveryStartedResult.robotaxis,
      fleetAllocationRun: allocation.run,
      fleetAllocationResults: allocation.results,
      deliveryOrder: deliveryStartedResult.deliveryOrder,
    };
  }

  const usedAllocationResults = allocation.results.map((result, index) => (
    index === 0 ? { ...result, result_status: FleetAllocationResultStatus.USED_FOR_DELIVERY } : result
  ));
  return {
    succeeded: true,
    supplyDecisionRun: supplyDecisionResult.run,
    supplyPlan: confirmedPlanResult.supplyPlan,
    productionBatch: passedInspectionResult.productionBatch,
    robotaxis: deliveryCompletedResult.robotaxis,
    fleetAllocationRun: allocation.run,
    fleetAllocationResults: usedAllocationResults,
    deliveryOrder: deliveryCompletedResult.deliveryOrder,
    readinessTasks: deliveryCompletedResult.readinessTasks,
    producedRobotaxiIds: passedInspectionResult.productionBatch.produced_robotaxi_ids || [],
    readinessTaskIds: deliveryCompletedResult.deliveryOrder.readiness_task_ids || [],
  };
}

export function createBusinessOperationEvent({
  page = null,
  businessObjectType = null,
  businessObjectId = null,
  actionType,
  resultType,
  eventResult = "SUCCESS",
  message = "",
  occurredAt = null,
} = {}) {
  return {
    source_page: page,
    business_object_type: businessObjectType,
    business_object_id: businessObjectId,
    action_type: actionType,
    result_type: resultType || eventResult,
    event_type: actionType,
    event_result: eventResult,
    message,
    occurred_at: occurredAt || defaultNow(),
  };
}

function createForecastRun({
  runId,
  strategy,
  businessTarget,
  productionProfile,
  runStatus,
  startedAt,
  completedAt,
  resultCount,
  failureReason = null,
  targetZoneIds = [],
  demandProfiles = [],
  robotaxis = [],
  inputFingerprint = null,
}) {
  const placeProfiles = demandProfiles.filter((item) => item.target_object_type === "PLACE");
  const zoneProfiles = demandProfiles.filter((item) => item.target_object_type === "ZONE" && (!targetZoneIds.length || targetZoneIds.includes(item.target_object_id)));
  const serviceAreaProfiles = demandProfiles.filter((item) => item.target_object_type === "SERVICE_AREA");
  const period = businessTarget ? resolveForecastPeriod(businessTarget, strategy) : null;
  return {
    forecast_run_id: runId,
    forecast_strategy_id: strategy?.forecast_strategy_id || null,
    business_target_id: businessTarget?.business_target_id || null,
    supply_production_profile_id: productionProfile?.profile_id || null,
    strategy_name: strategy?.strategy_name || null,
    strategy_version: strategy?.strategy_version || null,
    run_status: runStatus,
    target_zone_ids: targetZoneIds,
    forecast_start_date: businessTarget?.forecast_start_date || startedAt.slice(0, 10),
    forecast_period_unit: period?.unit || strategy?.forecast_period_unit || null,
    forecast_period_count: period?.count || strategy?.forecast_period_count || null,
    forecast_end_date: businessTarget?.forecast_end_date || period?.endDate || null,
    started_at: startedAt,
    completed_at: completedAt,
    result_count: resultCount,
    failure_reason: failureReason,
    input_fingerprint: inputFingerprint,
    strategy_snapshot: strategy ? { ...strategy } : null,
    business_target_snapshot: businessTarget ? { ...businessTarget } : null,
    production_profile_snapshot: productionProfile ? { ...productionProfile } : null,
    place_demand_profile_snapshot: placeProfiles.map((item) => ({ ...item })),
    zone_demand_snapshot: zoneProfiles.map((item) => ({ ...item })),
    service_area_capacity_snapshot: serviceAreaProfiles.map((item) => ({ ...item })),
    robotaxi_capacity_snapshot: strategy ? {
      robotaxi_available_hours_per_day: strategy.robotaxi_available_hours_per_day,
      average_pickup_duration_min: strategy.average_pickup_duration_min,
      average_trip_duration_min: strategy.average_trip_duration_min,
      average_turnaround_duration_min: strategy.average_turnaround_duration_min,
      operational_availability_rate: strategy.operational_availability_rate,
    } : null,
    robotaxi_inventory_snapshot: robotaxis.map((item) => ({
      robotaxi_id: item.robotaxi_id,
      zone_id: item.zone_id || item.target_zone_id || item.service_zone_id || null,
      availability_status: item.availability_status || item.operational_status || null,
    })),
    economic_assumption_snapshot: businessTarget ? {
      average_revenue_per_order: businessTarget.average_revenue_per_order,
      average_variable_cost_per_order: businessTarget.average_variable_cost_per_order,
      daily_fixed_operating_cost: businessTarget.daily_fixed_operating_cost,
      minimum_contribution_margin_rate: businessTarget.minimum_contribution_margin_rate,
    } : null,
    calculation_parameter_snapshot: strategy ? { ...strategy } : null,
    input_validation_result: zoneProfiles.map((zoneProfile) => validatePlanningInputs({ strategy, businessTarget, zoneProfile, productionProfile })),
  };
}

function createPlanningForecastResult({ resultId, runId, strategy, businessTarget, profile, productionProfile, robotaxis, opsCenters = [], zones = [], inputFingerprint = null, occurredAt }) {
  const calculation = calculateLongTermDemandPlan({ strategy, businessTarget, zoneProfile: profile, productionProfile, robotaxis, opsCenters, zones });
  if (!calculation.validation?.valid || !calculation.result) return null;
  const result = calculation.result;
  return {
    forecast_result_id: resultId,
    forecast_id: resultId,
    forecast_name: `${profile.target_object_name || profile.target_object_id}需求预测`,
    forecast_status: LongTermDemandForecastResultStatus.GENERATED,
    forecast_strategy_id: strategy.forecast_strategy_id,
    forecast_run_id: runId,
    business_target_id: businessTarget.business_target_id,
    zone_id: profile.target_object_id,
    zone_name: profile.target_object_name,
    demand_profile_id: profile.profile_id,
    supply_production_profile_id: productionProfile.profile_id,
    ...result,
    strategy_snapshot: { ...strategy },
    business_target_snapshot: { ...businessTarget },
    zone_demand_snapshot: { ...profile },
    production_profile_snapshot: { ...productionProfile },
    input_fingerprint: inputFingerprint,
    input_validation_result: calculation.validation,
    created_at: occurredAt,
  };
}

function createForecastResultLegacy({ resultId, runId, strategy, businessTarget, profile, productionProfile, robotaxis, occurredAt }) {
  const baselineDailyDemand = Number(profile.expected_robotaxi_demand || profile.service_area_demand || profile.potential_demand || 0);
  const bufferRatio = Number(strategy.demand_buffer_ratio ?? 0.15);
  const utilizationTarget = Math.max(0.1, Number(strategy.fleet_utilization_target ?? 0.72));
  const targetHorizonYears = Math.max(1, Number(businessTarget?.planning_horizon_years || 0));
  const strategyHorizonYears = Math.max(1, Number(strategy.forecast_horizon_years || 0));
  const productionLeadTimeDays = Math.max(0, Number(productionProfile?.production_lead_time_days || 0));
  const productionHorizonYears = Math.max(1, Math.ceil(productionLeadTimeDays / 365));
  const forecastHorizonYears = Math.max(targetHorizonYears, strategyHorizonYears, productionHorizonYears);
  const growthRate = Number(profile.growth_rate ?? strategy.growth_rate ?? 0.08);
  const growthFactor = Number(profile.growth_factor || profile.demand_growth_factor || ((1 + growthRate) ** forecastHorizonYears));
  const forecastDailyDemand = baselineDailyDemand * growthFactor;
  const peakDemandRatio = Number(profile.peak_demand_ratio ?? profile.peak_demand_factor ?? 0.15);
  const forecastPeakHourDemand = forecastDailyDemand * peakDemandRatio;
  const averageTripDurationMin = Math.max(1, Number(strategy.average_trip_duration_min || 30));
  const vehicleAvailableHoursPerDay = Math.max(1, Number(strategy.vehicle_available_hours_per_day || 12));
  const targetDailyOrders = Number(businessTarget?.target_service_order_count || 0) / Math.max(1, forecastHorizonYears * 365);
  const targetPeakHourDemand = targetDailyOrders * peakDemandRatio;
  const demandFleetRequirement = Math.ceil((forecastPeakHourDemand * averageTripDurationMin) / 60);
  const targetServiceFleetRequirement = Math.ceil((targetPeakHourDemand * averageTripDurationMin) / 60);
  const targetFleetSize = Math.max(0, Number(businessTarget?.target_fleet_size || 0));
  const productivityFleetRequirement = Math.ceil((forecastDailyDemand * (1 + bufferRatio)) / Math.max(1, (vehicleAvailableHoursPerDay * 60) / averageTripDurationMin) / utilizationTarget);
  const requiredFleetQuantity = Math.max(demandFleetRequirement, targetServiceFleetRequirement, targetFleetSize, productivityFleetRequirement);
  const currentFleetQuantity = robotaxis.filter((item) => item.target_zone_id === profile.target_object_id || item.service_zone_id === profile.target_object_id || profile.target_object_id === "Z-001").length;
  const fleetGapQuantity = Math.max(0, requiredFleetQuantity - currentFleetQuantity);
  const annualProductionCapacity = Math.max(0, Number(productionProfile?.annual_production_capacity || 0));
  const monthlyProductionCapacity = Math.max(0, Number(productionProfile?.monthly_production_capacity || annualProductionCapacity / 12 || 0));
  const deliveryCapacity = Math.max(0, Number(productionProfile?.delivery_capacity || fleetGapQuantity || 0));
  const feasibleProductionQuantity = Math.floor(Math.min(
    annualProductionCapacity * forecastHorizonYears || fleetGapQuantity,
    monthlyProductionCapacity * 12 * forecastHorizonYears || fleetGapQuantity,
    Math.max(deliveryCapacity, fleetGapQuantity),
  ));
  const plannedProductionQuantity = Math.max(0, Math.min(fleetGapQuantity, feasibleProductionQuantity || fleetGapQuantity));
  const productionGapQuantity = Math.max(0, fleetGapQuantity - plannedProductionQuantity);
  const productionStartDate = businessTarget?.forecast_start_date || occurredAt.slice(0, 10);
  const supplyCompletionDate = addDaysIsoDate(productionStartDate, productionLeadTimeDays);
  return {
    forecast_result_id: resultId,
    forecast_id: resultId,
    forecast_name: `${profile.target_object_name || profile.target_object_id}需求预测`,
    forecast_status: LongTermDemandForecastResultStatus.GENERATED,
    forecast_period: `${forecastHorizonYears}年`,
    forecast_strategy_id: strategy.forecast_strategy_id,
    forecast_run_id: runId,
    business_target_id: businessTarget?.business_target_id || null,
    zone_id: profile.target_object_id,
    zone_name: profile.target_object_name,
    demand_profile_id: profile.profile_id,
    supply_production_profile_id: productionProfile?.profile_id || null,
    baseline_daily_demand: roundNumber(baselineDailyDemand, 2),
    growth_factor: roundNumber(growthFactor, 4),
    forecast_daily_demand: roundNumber(forecastDailyDemand, 2),
    forecast_peak_hour_demand: roundNumber(forecastPeakHourDemand, 2),
    expected_robotaxi_demand: roundNumber(forecastDailyDemand, 2),
    target_service_order_count: businessTarget?.target_service_order_count ?? null,
    target_fleet_size: targetFleetSize || null,
    target_asset_utilization_rate: businessTarget?.target_asset_utilization_rate ?? null,
    target_order_fulfillment_rate: businessTarget?.target_order_fulfillment_rate ?? null,
    vehicle_available_hours_per_day: vehicleAvailableHoursPerDay,
    average_trip_duration_min: averageTripDurationMin,
    required_fleet_quantity: requiredFleetQuantity,
    current_fleet_quantity: currentFleetQuantity,
    fleet_gap_quantity: fleetGapQuantity,
    production_lead_time_days: productionLeadTimeDays,
    production_start_date: productionStartDate,
    supply_completion_date: supplyCompletionDate,
    feasible_production_quantity: feasibleProductionQuantity,
    planned_production_quantity: plannedProductionQuantity,
    production_gap_quantity: productionGapQuantity,
    confidence_level: 0.82,
    demand_buffer_ratio: bufferRatio,
    fleet_utilization_target: utilizationTarget,
    business_target_snapshot: businessTarget ? { ...businessTarget } : null,
    demand_profile_snapshot: profile ? { ...profile } : null,
    production_profile_snapshot: productionProfile ? { ...productionProfile } : null,
    created_at: occurredAt,
  };
}

function createFleetAllocationRun({ runId, strategy, runStatus, occurredAt, resultCount, failureReason = null }) {
  return {
    fleet_allocation_run_id: runId,
    fleet_allocation_strategy_id: strategy?.fleet_allocation_strategy_id || null,
    strategy_name: strategy?.strategy_name || null,
    strategy_version: strategy?.strategy_version || null,
    run_status: runStatus,
    target_zone_ids: strategy?.target_zone_ids || [],
    target_ops_center_ids: strategy?.target_ops_center_ids || [],
    started_at: occurredAt,
    completed_at: occurredAt,
    result_count: resultCount,
    failure_reason: failureReason,
    strategy_snapshot: strategy ? { ...strategy } : null,
  };
}

function createProducedRobotaxi({ robotaxiId, productionBatch, occurredAt }) {
  const batteryPercent = 100;
  return createRobotaxi({
    robotaxi_id: robotaxiId,
    fleet_id: "FLEET-UNALLOCATED",
    model_name: "L4 Robotaxi Standard",
    automation_level: "L4",
    seat_capacity: 4,
    battery_capacity_kwh: 75,
    max_range_km: 400,
    service_type: "PASSENGER_RIDE",
    battery_percent: batteryPercent,
    current_battery_kwh: 75,
    estimated_range_km: 400,
    availability_status: "PENDING_DELIVERY",
    motion_status: "PARKED",
    current_cell_id: null,
    current_route_id: null,
    current_task_id: null,
    current_order_id: null,
    available_for_dispatch: false,
    production_batch_id: productionBatch.production_batch_id,
    planned_target_zone_id: productionBatch.target_zone_id || null,
    target_zone_id: null,
    target_ops_center_id: null,
    produced_at: occurredAt,
    created_at: occurredAt,
    updated_at: occurredAt,
    lifetime_distance_km: 0,
    lifetime_battery_consumed_kwh: 0,
    lifetime_battery_consumed_percent: 0,
    lifetime_charged_energy_kwh: 0,
    completed_service_order_count: 0,
    completed_cleaning_count: 0,
    completed_charging_count: 0,
    completed_maintenance_count: 0,
  });
}

function isEffectiveOn(record = {}, date) {
  if (!date) return true;
  const start = record.effective_from;
  const end = record.effective_to;
  return (!start || start <= date) && (!end || end >= date);
}

function createDeliveryReadinessTask({ robotaxiId, deliveryOrder, occurredAt, taskId }) {
  return withLifecycleStatus({
    task_id: taskId,
    task_type: "READINESS_CHECK",
    task_status: "WAITING_ASSIGNMENT",
    trigger_type: "DELIVERY_ORDER",
    trigger_source: "ROBOTAXI_DELIVERY_ORDER",
    trigger_object_type: "robotaxiDeliveryOrder",
    trigger_object_id: deliveryOrder.delivery_order_id,
    robotaxi_id: robotaxiId,
    ops_center_id: deliveryOrder.target_ops_center_id,
    worker_id: null,
    check_result: null,
    issue_type: null,
    created_at: occurredAt,
    updated_at: occurredAt,
  }, {
    objectType: "readinessTask",
    idField: "task_id",
    statusField: "task_status",
    fromStatus: null,
    toStatus: "WAITING_ASSIGNMENT",
    actionType: "READINESS_TASK_CREATE",
    resultType: "READINESS_CREATED",
    occurredAt,
  });
}

function updateRobotaxisForDelivery(robotaxis = [], robotaxiIds = [], patch = {}) {
  const targetIds = new Set(robotaxiIds || []);
  let targetIndex = 0;
  return (robotaxis || []).map((robotaxi) => {
    if (!targetIds.has(robotaxi.robotaxi_id)) return robotaxi;
    const resolvedPatch = typeof patch === "function" ? patch(robotaxi, targetIndex) : patch;
    targetIndex += 1;
    return { ...robotaxi, ...resolvedPatch };
  });
}

export function withLifecycleStatus(item, {
  objectType,
  idField,
  statusField,
  fromStatus,
  toStatus,
  actionType,
  resultType,
  occurredAt,
} = {}) {
  const history = Array.isArray(item?.simulation_status_transition_history) ? item.simulation_status_transition_history : [];
  const nextStatus = toStatus ?? item?.[statusField] ?? null;
  const previousStatus = fromStatus !== undefined ? fromStatus : item?.[statusField] ?? null;
  return {
    ...item,
    simulation_status_transition_history: [
      ...history,
      {
        status_transition_id: `ST-${String(history.length + 1).padStart(4, "0")}`,
        transition_sequence: history.length + 1,
        business_object_type: objectType,
        business_object_id: item?.[idField] || null,
        from_status: previousStatus,
        action_type: actionType,
        result_type: resultType,
        to_status: nextStatus,
        occurred_at: occurredAt,
        simulation_occurred_at: null,
        time_mode: "REAL_TIME",
        trigger_source: "MANUAL_OR_SERVICE",
      },
    ],
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

function resolveSupplyPlanId(context = {}) {
  return typeof context.nextSupplyPlanId === "function" ? context.nextSupplyPlanId() : `FPP-${Date.now()}`;
}

function resolveProductionBatchId(context = {}) {
  return typeof context.nextProductionBatchId === "function" ? context.nextProductionBatchId() : `PB-${Date.now()}`;
}

function resolveFleetAllocationRunId(context = {}) {
  return typeof context.nextFleetAllocationRunId === "function" ? context.nextFleetAllocationRunId() : `FAR-${Date.now()}`;
}

function resolveFleetAllocationResultId(context = {}, index = 0) {
  return typeof context.nextFleetAllocationResultId === "function" ? context.nextFleetAllocationResultId(index) : `FAR-RES-${Date.now()}-${index + 1}`;
}

function resolveDeliveryOrderId(context = {}) {
  return typeof context.nextDeliveryOrderId === "function" ? context.nextDeliveryOrderId() : `RDO-${Date.now()}`;
}

function resolveReadinessTaskId(context = {}, index = 0) {
  return typeof context.nextReadinessTaskId === "function" ? context.nextReadinessTaskId(index) : `TASK-RC-${Date.now()}-${index + 1}`;
}

function resolveRobotaxiId(context = {}, existingIds = new Set(), index = 0) {
  if (typeof context.nextRobotaxiId === "function") return context.nextRobotaxiId(index);
  let cursor = existingIds.size + index + 1;
  let robotaxiId = `RTX-${String(cursor).padStart(3, "0")}`;
  while (existingIds.has(robotaxiId)) {
    cursor += 1;
    robotaxiId = `RTX-${String(cursor).padStart(3, "0")}`;
  }
  return robotaxiId;
}

function addDaysIsoDate(isoDateTime, days = 0) {
  const date = new Date(isoDateTime);
  date.setUTCDate(date.getUTCDate() + Math.max(0, Math.floor(Number(days || 0))));
  return date.toISOString().slice(0, 10);
}

function createPlanningInputFingerprint({ strategy, businessTarget, productionProfile, zoneProfiles = [], robotaxis = [], opsCenters = [], zones = [] } = {}) {
  const payload = {
    strategy,
    businessTarget,
    productionProfile,
    zoneProfiles,
    robotaxis: robotaxis.map((item) => ({
      robotaxi_id: item.robotaxi_id,
      availability_status: item.availability_status || item.operational_status || null,
      zone_id: item.zone_id || item.target_zone_id || item.service_zone_id || null,
      ops_center_id: item.ops_center_id || item.current_ops_center_id || null,
      current_cell_id: item.current_cell_id || item.current_location_cell_id || null,
    })),
    opsCenters: opsCenters.map((item) => ({ ops_center_id: item.ops_center_id, zone_id: item.zone_id || item.target_zone_id || null, cell_ids: item.cell_ids || [] })),
    zones: zones.filter((item) => !item.parent_zone_id).map((item) => ({ zone_id: item.zone_id, cell_ids: item.cell_ids || [] })),
  };
  const serialized = stableSerialize(payload);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `LDF-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
  return JSON.stringify(value ?? null);
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
