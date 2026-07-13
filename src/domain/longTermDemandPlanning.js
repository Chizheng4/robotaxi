const PERIOD_DAYS = { WEEK: 7, MONTH: 30, QUARTER: 91, YEAR: 365 };
const TREND_STEP_DAYS = { DAY: 1, WEEK: 7, MONTH: 30 };
const MAX_SUPPLY_TREND_PERIODS = 240;

const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const positive = (value, fallback = 0) => Math.max(0, number(value, fallback));
const ratio = (value, fallback = 0) => Math.min(1, Math.max(0, number(value, fallback)));
const round = (value, digits = 2) => Number(number(value).toFixed(digits));
const addDays = (date, days) => {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + Math.max(0, Math.floor(days)));
  return next.toISOString().slice(0, 10);
};

export function resolveForecastPeriod(target = {}, strategy = {}) {
  const unit = target.forecast_period_unit || strategy.forecast_period_unit || "MONTH";
  const count = Math.max(1, Math.floor(number(target.forecast_period_count ?? strategy.forecast_period_count, 3)));
  const startDate = target.forecast_start_date || new Date().toISOString().slice(0, 10);
  const periodDays = PERIOD_DAYS[unit];
  if (!periodDays) throw new Error("FORECAST_PERIOD_UNIT_INVALID");
  return { unit, count, periodDays, startDate, endDate: addDays(startDate, periodDays * count) };
}

export function validatePlanningInputs({ strategy, businessTarget, zoneProfile, productionProfile }) {
  const missing = [];
  if (!strategy?.forecast_strategy_id) missing.push("forecast_strategy_id");
  if (!businessTarget?.business_target_id) missing.push("business_target_id");
  if (!zoneProfile?.profile_id) missing.push("zone_demand_profile");
  if (!productionProfile?.profile_id) missing.push("supply_production_profile_id");
  const periodUnit = businessTarget?.forecast_period_unit || strategy?.forecast_period_unit || "MONTH";
  const growthRateUnit = zoneProfile?.growth_rate_unit || strategy?.growth_rate_unit || periodUnit;
  const errors = [];
  if (!PERIOD_DAYS[periodUnit]) errors.push("FORECAST_PERIOD_UNIT_INVALID");
  if (growthRateUnit !== periodUnit) errors.push("GROWTH_RATE_UNIT_MISMATCH");
  return { valid: !missing.length && !errors.length, missing_input_fields: missing, errors };
}

export function calculateLongTermDemandPlan({ strategy, businessTarget, zoneProfile, productionProfile, robotaxis = [] }) {
  const period = resolveForecastPeriod(businessTarget, strategy);
  const validation = validatePlanningInputs({ strategy, businessTarget, zoneProfile, productionProfile });
  if (!validation.valid) return { validation };

  const baselineOrders = positive(zoneProfile.baseline_addressable_daily_orders ?? zoneProfile.expected_robotaxi_demand);
  const baselinePeakShare = ratio(zoneProfile.busiest_hour_share ?? zoneProfile.peak_demand_ratio, 0.15);
  const zoneGrowth = number(zoneProfile.zone_period_growth_rate ?? zoneProfile.place_period_growth_rate ?? zoneProfile.growth_rate, 0);
  const growthAdjustment = number(strategy.growth_adjustment_rate, 0);
  const effectiveGrowth = Math.max(-0.99, zoneGrowth + growthAdjustment);
  const growthModel = strategy.growth_model || "COMPOUND";
  const growthFactor = calculateGrowthFactor(growthModel, effectiveGrowth, period.count);
  const marketOrders = baselineOrders * growthFactor;
  const targetOrders = positive(businessTarget.target_end_daily_orders ?? businessTarget.target_service_order_count);
  const targetFulfillmentRate = ratio(businessTarget.target_order_fulfillment_rate, 1);
  const marketServiceableOrders = marketOrders * targetFulfillmentRate;
  const planningMode = businessTarget.planning_mode || strategy.planning_mode || "BALANCED";
  const plannedOrders = planningMode === "MARKET_LED"
    ? marketServiceableOrders
    : planningMode === "TARGET_LED"
      ? targetOrders
      : Math.min(marketServiceableOrders, targetOrders || marketServiceableOrders);

  const pickupMin = positive(strategy.average_pickup_duration_min, 8);
  const tripMin = positive(strategy.average_trip_duration_min, 30);
  const turnaroundMin = positive(strategy.average_turnaround_duration_min, 7);
  const cycleMin = Math.max(1, pickupMin + tripMin + turnaroundMin);
  const availableHours = Math.min(24, Math.max(0.1, number(strategy.robotaxi_available_hours_per_day ?? strategy.vehicle_available_hours_per_day, 12)));
  const utilization = ratio(businessTarget.target_task_utilization_rate ?? businessTarget.target_asset_utilization_rate ?? strategy.target_task_utilization_rate ?? strategy.fleet_utilization_target, 0.72);
  const availability = ratio(strategy.operational_availability_rate, 0.9);
  const buffer = ratio(strategy.demand_buffer_ratio, 0.15);
  const theoreticalDaily = availableHours * 60 / cycleMin;
  const effectiveDaily = theoreticalDaily * Math.max(0.01, utilization) * Math.max(0.01, availability);
  const dailyRequired = Math.ceil(plannedOrders * (1 + buffer) / effectiveDaily);
  const plannedPeakOrders = plannedOrders * baselinePeakShare;
  const peakConcurrent = plannedPeakOrders * cycleMin / 60;
  const peakRequired = Math.ceil(peakConcurrent / Math.max(0.01, availability));
  const serviceRequired = Math.max(dailyRequired, peakRequired);
  const businessMinimum = positive(businessTarget.target_minimum_robotaxi_quantity ?? businessTarget.target_fleet_size);
  const required = Math.max(serviceRequired, businessMinimum);
  const requirementDriver = required === businessMinimum ? "BUSINESS_MINIMUM" : dailyRequired >= peakRequired ? "DAILY_ORDER_CAPACITY" : "PEAK_CONCURRENCY";

  const zoneId = zoneProfile.target_object_id || zoneProfile.zone_id;
  const operational = robotaxis.filter((item) => {
    const itemZoneId = item.zone_id || item.target_zone_id || item.service_zone_id;
    const admitted = ["AVAILABLE", "IN_FLEET_OPERATION"].includes(item.availability_status || item.operational_status);
    return itemZoneId === zoneId && admitted;
  }).length;
  const inbound = positive(zoneProfile.committed_inbound_quantity);
  const outbound = positive(zoneProfile.committed_outbound_quantity);
  const retirements = positive(zoneProfile.planned_retirement_quantity);
  const currentEffective = Math.max(0, operational + inbound - outbound - retirements);
  const robotaxiGap = Math.max(0, required - currentEffective);

  const productionUnit = productionProfile.production_capacity_period_unit || "MONTH";
  const productionPeriodDays = PERIOD_DAYS[productionUnit] || 30;
  const productionLeadDays = positive(productionProfile.production_lead_time_days);
  const qualityInspectionLeadDays = positive(
    productionProfile.quality_inspection_lead_time_days
      ?? productionProfile.inspection_lead_time_days,
  );
  const readyDate = addDays(period.startDate, productionLeadDays + qualityInspectionLeadDays);
  const availableDays = Math.max(0, (Date.parse(`${period.endDate}T00:00:00Z`) - Date.parse(`${readyDate}T00:00:00Z`)) / 86400000);
  const availablePeriods = Math.max(0, Math.floor(availableDays / productionPeriodDays));
  const capacityPerPeriod = positive(productionProfile.production_capacity_per_period ?? productionProfile.monthly_production_capacity ?? positive(productionProfile.annual_production_capacity) / 12);
  const deliveryPerPeriod = positive(productionProfile.delivery_capacity_per_period ?? productionProfile.delivery_capacity);
  const rampRatios = Array.isArray(productionProfile.ramp_up_capacity_ratios) ? productionProfile.ramp_up_capacity_ratios : [];
  let manufacturing = 0;
  for (let index = 0; index < availablePeriods; index += 1) manufacturing += capacityPerPeriod * ratio(rampRatios[index], 1);
  const feasibleManufacturing = Math.floor(manufacturing);
  const feasibleDelivery = Math.floor(deliveryPerPeriod * availablePeriods);
  const feasibleSupply = Math.min(feasibleManufacturing, feasibleDelivery);
  const recommendedProduction = robotaxiGap;
  const plannedProduction = recommendedProduction;
  const uncoveredGap = Math.max(0, robotaxiGap - feasibleSupply);
  const supplyTrendSeries = buildSupplyTrendSeries({
    startDate: period.startDate,
    forecastEndDate: period.endDate,
    readyDate,
    productionPeriodDays,
    capacityPerPeriod,
    deliveryPerPeriod,
    rampRatios,
    robotaxiGap,
    plannedProduction,
  });
  const finalSupplyPoint = supplyTrendSeries[supplyTrendSeries.length - 1] || {};

  const serviceDailyCapacity = positive(zoneProfile.effective_daily_capacity ?? zoneProfile.service_capacity);
  const servicePeakCapacity = positive(zoneProfile.effective_peak_hour_capacity ?? zoneProfile.turnover_capacity);
  const averageRevenue = positive(businessTarget.average_revenue_per_order);
  const variableCost = positive(businessTarget.average_variable_cost_per_order);
  const fixedCost = positive(businessTarget.daily_fixed_operating_cost);
  const contributionPerOrder = averageRevenue - variableCost;
  const breakEvenOrders = contributionPerOrder > 0 ? Math.ceil(fixedCost / contributionPerOrder) : null;
  const forecastTrendSeries = buildForecastTrendSeries({
    period,
    growthModel,
    effectiveGrowth,
    baselineOrders,
    targetOrders,
    targetFulfillmentRate,
    planningMode,
  });
  const dailyTrend = forecastTrendSeries.DAY || [];
  const finalTrendPoint = dailyTrend[dailyTrend.length - 1] || {};

  const result = {
    forecast_period_unit: period.unit,
    forecast_period_count: period.count,
    forecast_start_date: period.startDate,
    forecast_end_date: period.endDate,
    baseline_addressable_daily_orders: round(baselineOrders),
    busiest_hour_share: round(baselinePeakShare, 4),
    zone_period_growth_rate: round(zoneGrowth, 4),
    growth_adjustment_rate: round(growthAdjustment, 4),
    effective_period_growth_rate: round(effectiveGrowth, 4),
    growth_model: growthModel,
    growth_factor: round(growthFactor, 4),
    market_forecast_daily_orders: round(marketOrders),
    target_order_fulfillment_rate: round(targetFulfillmentRate, 4),
    market_serviceable_daily_orders: round(marketServiceableOrders),
    target_end_daily_orders: round(targetOrders),
    planning_mode: planningMode,
    planned_daily_orders: round(plannedOrders),
    market_opportunity_gap: round(Math.max(0, marketServiceableOrders - targetOrders)),
    target_market_shortfall: round(Math.max(0, targetOrders - marketServiceableOrders)),
    effective_service_cycle_min: round(cycleMin),
    robotaxi_available_hours_per_day: round(availableHours),
    robotaxi_theoretical_daily_orders: round(theoreticalDaily),
    robotaxi_effective_daily_orders: round(effectiveDaily),
    daily_required_robotaxi: dailyRequired,
    planned_peak_hour_orders: round(plannedPeakOrders),
    peak_concurrent_robotaxi: round(peakConcurrent),
    peak_required_robotaxi: peakRequired,
    service_required_robotaxi: serviceRequired,
    target_minimum_robotaxi_quantity: businessMinimum,
    required_robotaxi_quantity: required,
    requirement_driver: requirementDriver,
    operational_robotaxi_quantity: operational,
    committed_inbound_quantity: inbound,
    committed_outbound_quantity: outbound,
    planned_retirement_quantity: retirements,
    effective_current_robotaxi: currentEffective,
    robotaxi_gap_quantity: robotaxiGap,
    effective_daily_capacity: round(serviceDailyCapacity),
    effective_peak_hour_capacity: round(servicePeakCapacity),
    daily_capacity_gap: round(Math.max(0, plannedOrders - serviceDailyCapacity)),
    peak_capacity_gap: round(Math.max(0, plannedPeakOrders - servicePeakCapacity)),
    production_ready_date: readyDate,
    quality_inspection_lead_time_days: qualityInspectionLeadDays,
    available_production_periods: availablePeriods,
    feasible_manufacturing_quantity: feasibleManufacturing,
    feasible_delivery_quantity: feasibleDelivery,
    feasible_supply_quantity: feasibleSupply,
    recommended_production_quantity: recommendedProduction,
    planned_production_quantity: plannedProduction,
    uncovered_robotaxi_gap: uncoveredGap,
    supply_trend_series: supplyTrendSeries,
    planned_cumulative_production_quantity: finalSupplyPoint.cumulative_production_quantity || 0,
    planned_cumulative_delivery_quantity: finalSupplyPoint.cumulative_delivery_quantity || 0,
    first_delivery_date: supplyTrendSeries.find((point) => point.period_delivery_quantity > 0)?.trend_date || null,
    full_supply_completion_date: supplyTrendSeries.find((point) => point.remaining_robotaxi_gap <= 0)?.trend_date || null,
    contribution_margin_per_order: round(contributionPerOrder),
    daily_contribution_margin: round(plannedOrders * contributionPerOrder - fixedCost),
    contribution_margin_rate: averageRevenue > 0 ? round(contributionPerOrder / averageRevenue, 4) : null,
    break_even_daily_orders: breakEvenOrders,
    forecast_trend_series: forecastTrendSeries,
    forecast_cumulative_market_orders: round(finalTrendPoint.cumulative_market_orders),
    forecast_cumulative_planned_orders: round(finalTrendPoint.cumulative_planned_orders),
  };
  const assumptions = [
    !strategy.average_pickup_duration_min && "average_pickup_duration_min",
    !strategy.average_turnaround_duration_min && "average_turnaround_duration_min",
    !strategy.operational_availability_rate && "operational_availability_rate",
  ].filter(Boolean);
  result.data_quality_score = round((1 - assumptions.length / 3) * 100, 0);
  result.data_quality_level = result.data_quality_score >= 80 ? "HIGH" : result.data_quality_score >= 50 ? "MEDIUM" : "LOW";
  result.missing_input_fields = validation.missing_input_fields;
  result.assumption_fields = assumptions;
  result.calculation_steps = buildCalculationSteps(result);
  return { validation, result, period };
}

function buildSupplyTrendSeries({
  startDate,
  forecastEndDate,
  readyDate,
  productionPeriodDays,
  capacityPerPeriod,
  deliveryPerPeriod,
  rampRatios,
  robotaxiGap,
  plannedProduction,
}) {
  const points = [{
    trend_index: 0,
    trend_date: startDate,
    within_forecast_period: true,
    period_production_quantity: 0,
    cumulative_production_quantity: 0,
    period_delivery_quantity: 0,
    cumulative_delivery_quantity: 0,
    remaining_robotaxi_gap: robotaxiGap,
  }];
  if (plannedProduction <= 0 || capacityPerPeriod <= 0 || deliveryPerPeriod <= 0) return points;

  let cumulativeProduction = 0;
  let cumulativeDelivery = 0;
  for (let index = 0; index < MAX_SUPPLY_TREND_PERIODS && cumulativeDelivery < plannedProduction; index += 1) {
    const productionCapacity = Math.floor(capacityPerPeriod * ratio(rampRatios[index], 1));
    const periodProduction = Math.min(
      Math.max(0, plannedProduction - cumulativeProduction),
      productionCapacity,
    );
    cumulativeProduction += periodProduction;
    const deliverableInventory = Math.max(0, cumulativeProduction - cumulativeDelivery);
    const periodDelivery = Math.min(deliverableInventory, Math.floor(deliveryPerPeriod));
    cumulativeDelivery += periodDelivery;
    const pointDate = addDays(readyDate, productionPeriodDays * (index + 1));
    points.push({
      trend_index: index + 1,
      trend_date: pointDate,
      within_forecast_period: pointDate <= forecastEndDate,
      period_production_quantity: periodProduction,
      cumulative_production_quantity: cumulativeProduction,
      period_delivery_quantity: periodDelivery,
      cumulative_delivery_quantity: cumulativeDelivery,
      remaining_robotaxi_gap: Math.max(0, robotaxiGap - cumulativeDelivery),
    });
    if (productionCapacity <= 0 && periodDelivery <= 0) break;
  }
  return points;
}

function calculateGrowthFactor(model, rate, elapsedPeriods) {
  if (model === "LINEAR") return Math.max(0, 1 + rate * elapsedPeriods);
  return Math.max(0, (1 + rate) ** elapsedPeriods);
}

function buildForecastTrendSeries({ period, growthModel, effectiveGrowth, baselineOrders, targetOrders, targetFulfillmentRate, planningMode }) {
  const totalDays = period.periodDays * period.count;
  return Object.fromEntries(Object.entries(TREND_STEP_DAYS).map(([timeUnit, stepDays]) => [
    timeUnit,
    buildForecastTrendPoints({
      timeUnit,
      stepDays,
      totalDays,
      period,
      growthModel,
      effectiveGrowth,
      baselineOrders,
      targetOrders,
      targetFulfillmentRate,
      planningMode,
    }),
  ]));
}

function buildForecastTrendPoints({ timeUnit, stepDays, totalDays, period, growthModel, effectiveGrowth, baselineOrders, targetOrders, targetFulfillmentRate, planningMode }) {
  const elapsedDays = [0];
  for (let day = stepDays; day < totalDays; day += stepDays) elapsedDays.push(day);
  if (elapsedDays[elapsedDays.length - 1] !== totalDays) elapsedDays.push(totalDays);
  let cumulativeMarketOrders = 0;
  let cumulativePlannedOrders = 0;
  let previousMarketDailyOrders = baselineOrders;
  let previousPlannedDailyOrders = resolvePlannedDailyOrders(baselineOrders, targetOrders, targetFulfillmentRate, planningMode);
  return elapsedDays.map((day, index) => {
    const elapsedPeriods = day / period.periodDays;
    const marketDailyOrders = baselineOrders * calculateGrowthFactor(growthModel, effectiveGrowth, elapsedPeriods);
    const plannedDailyOrders = resolvePlannedDailyOrders(marketDailyOrders, targetOrders, targetFulfillmentRate, planningMode);
    const intervalDays = index === 0 ? 0 : day - elapsedDays[index - 1];
    const periodMarketOrders = intervalDays * (previousMarketDailyOrders + marketDailyOrders) / 2;
    const periodPlannedOrders = intervalDays * (previousPlannedDailyOrders + plannedDailyOrders) / 2;
    cumulativeMarketOrders += periodMarketOrders;
    cumulativePlannedOrders += periodPlannedOrders;
    previousMarketDailyOrders = marketDailyOrders;
    previousPlannedDailyOrders = plannedDailyOrders;
    return {
      trend_time_unit: timeUnit,
      trend_index: index,
      trend_date: addDays(period.startDate, day),
      elapsed_days: day,
      market_daily_orders: round(marketDailyOrders),
      planned_daily_orders: round(plannedDailyOrders),
      target_daily_orders: round(targetOrders),
      period_market_orders: round(periodMarketOrders),
      period_planned_orders: round(periodPlannedOrders),
      cumulative_market_orders: round(cumulativeMarketOrders),
      cumulative_planned_orders: round(cumulativePlannedOrders),
    };
  });
}

function resolvePlannedDailyOrders(marketDailyOrders, targetOrders, targetFulfillmentRate, planningMode) {
  const serviceableOrders = marketDailyOrders * targetFulfillmentRate;
  if (planningMode === "MARKET_LED") return serviceableOrders;
  if (planningMode === "TARGET_LED") return targetOrders;
  return Math.min(serviceableOrders, targetOrders || serviceableOrders);
}

function buildCalculationSteps(result) {
  return [
    ["需求预测", "当前需求基线", "Place 当前可争取日订单汇总", result.baseline_addressable_daily_orders, "日订单"],
    ["需求预测", "周期增长", "当前需求 × 增长模型（有效周期增长率，周期数量）", result.market_forecast_daily_orders, "日订单"],
    ["经营目标", "经营目标比较", "按规划模式比较市场可服务需求与目标日订单", result.planned_daily_orders, "日订单"],
    ["Robotaxi 能力", "峰值并发", "规划日订单 × 最繁忙小时占比 × 完整服务周期 / 60", result.peak_required_robotaxi, "Robotaxi"],
    ["Robotaxi 能力", "单车日产能", "每日运营时间 / 完整服务周期 × 利用率 × 可用率", result.robotaxi_effective_daily_orders, "订单 / Robotaxi·日"],
    ["服务承载", "服务承载", "规划需求与 ServiceArea 汇总容量比较", result.daily_capacity_gap, "日订单"],
    ["资产缺口", "Robotaxi 缺口", "最终所需 Robotaxi - 当前有效 Robotaxi", result.robotaxi_gap_quantity, "Robotaxi"],
    ["生产供给", "建议生产", "Robotaxi 缺口作为需要纳入生产计划的建议数量", result.recommended_production_quantity, "Robotaxi"],
    ["生产供给", "预测期可形成供给", "预测期内可生产数量与可交付数量取较小值", result.feasible_supply_quantity, "Robotaxi"],
    ["生产供给", "预测期末剩余缺口", "Robotaxi 缺口 - 预测期内可形成供给数量", result.uncovered_robotaxi_gap, "Robotaxi"],
    ["基础经济性", "贡献毛利", "规划日订单 × 单均贡献毛利 - 日固定运营成本", result.daily_contribution_margin, "元 / 日"],
  ].map(([step_group, step_name, formula, output_value, output_unit], index) => ({ step_order: index + 1, step_group, step_name, formula, output_value, output_unit }));
}
