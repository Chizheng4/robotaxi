const PERIOD_DAYS = { WEEK: 7, MONTH: 30, QUARTER: 91, YEAR: 365 };
const TREND_STEP_DAYS = { DAY: 1, WEEK: 7 };
const MAX_SUPPLY_TREND_PERIODS = 240;

const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const positive = (value, fallback = 0) => Math.max(0, number(value, fallback));
const ratio = (value, fallback = 0) => Math.min(1, Math.max(0, number(value, fallback)));
const round = (value, digits = 2) => Number(number(value).toFixed(digits));
const addDays = (date, days) => {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + Math.floor(days));
  return next.toISOString().slice(0, 10);
};
const daysBetween = (startDate, endDate) => Math.max(0, Math.round(
  (Date.parse(`${endDate}T00:00:00.000Z`) - Date.parse(`${startDate}T00:00:00.000Z`)) / 86400000,
));
const addCalendarMonths = (date, months) => {
  const current = new Date(`${date}T00:00:00.000Z`);
  const day = current.getUTCDate();
  current.setUTCDate(1);
  current.setUTCMonth(current.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0)).getUTCDate();
  current.setUTCDate(Math.min(day, lastDay));
  return current.toISOString().slice(0, 10);
};
const addCalendarPeriods = (date, unit, count) => {
  if (unit === "WEEK") return addDays(date, count * 7);
  if (unit === "MONTH") return addCalendarMonths(date, count);
  if (unit === "QUARTER") return addCalendarMonths(date, count * 3);
  if (unit === "YEAR") return addCalendarMonths(date, count * 12);
  throw new Error("FORECAST_PERIOD_UNIT_INVALID");
};

export function resolveForecastPeriod(target = {}, strategy = {}) {
  const unit = target.forecast_period_unit || strategy.forecast_period_unit || "MONTH";
  const count = Math.max(1, Math.floor(number(target.forecast_period_count ?? strategy.forecast_period_count, 3)));
  const startDate = target.forecast_start_date || new Date().toISOString().slice(0, 10);
  const periodDays = PERIOD_DAYS[unit];
  if (!periodDays) throw new Error("FORECAST_PERIOD_UNIT_INVALID");
  const endExclusiveDate = addCalendarPeriods(startDate, unit, count);
  const endDate = addDays(endExclusiveDate, -1);
  const totalDays = daysBetween(startDate, endExclusiveDate);
  return { unit, count, periodDays: totalDays / count, totalDays, startDate, endDate, endExclusiveDate };
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

export function calculateLongTermDemandPlan({ strategy, businessTarget, zoneProfile, productionProfile, robotaxis = [], opsCenters = [], zones = [] }) {
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
  const planningMode = businessTarget.planning_mode || strategy.planning_mode || "BALANCED";
  const plannedOrders = planningMode === "MARKET_LED"
    ? marketOrders
    : planningMode === "TARGET_LED"
      ? targetOrders
      : Math.min(marketOrders, targetOrders || marketOrders);

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
  const bufferedDailyOrders = plannedOrders * (1 + buffer);
  const plannedPeakOrders = plannedOrders * baselinePeakShare;
  const peakConcurrent = plannedPeakOrders * cycleMin / 60;
  const peakRequired = Math.ceil(peakConcurrent / Math.max(0.01, availability));
  const serviceRequired = Math.max(dailyRequired, peakRequired);
  const businessMinimum = positive(businessTarget.target_minimum_robotaxi_quantity ?? businessTarget.target_fleet_size);
  const required = Math.max(serviceRequired, businessMinimum);
  const requirementDriver = required === businessMinimum ? "BUSINESS_MINIMUM" : dailyRequired >= peakRequired ? "DAILY_ORDER_CAPACITY" : "PEAK_CONCURRENCY";

  const zoneId = zoneProfile.target_object_id || zoneProfile.zone_id;
  const zoneRobotaxis = robotaxis.filter((item) => resolveRobotaxiZoneId(item, opsCenters, zones) === zoneId);
  const nonRetired = zoneRobotaxis.filter((item) => (item.availability_status || item.operational_status) !== "RETIRED").length;
  const operational = zoneRobotaxis.filter((item) => ["AVAILABLE", "IN_FLEET_OPERATION"].includes(item.availability_status || item.operational_status)).length;
  const inbound = positive(zoneProfile.committed_inbound_quantity);
  const outbound = positive(zoneProfile.committed_outbound_quantity);
  const retirements = positive(zoneProfile.planned_retirement_quantity);
  const currentEffective = Math.max(0, nonRetired + inbound - outbound - retirements);
  const robotaxiGap = Math.max(0, required - currentEffective);

  const productionUnit = productionProfile.production_capacity_period_unit || "MONTH";
  const productionPeriodDays = PERIOD_DAYS[productionUnit] || 30;
  const productionLeadDays = positive(productionProfile.production_lead_time_days);
  const qualityInspectionLeadDays = positive(
    productionProfile.quality_inspection_lead_time_days
      ?? productionProfile.inspection_lead_time_days,
  );
  const productionCompletionDate = addDays(period.startDate, productionLeadDays);
  const qualityInspectionCompletionDate = addDays(productionCompletionDate, qualityInspectionLeadDays);
  const capacityPerPeriod = positive(productionProfile.production_capacity_per_period ?? productionProfile.monthly_production_capacity ?? positive(productionProfile.annual_production_capacity) / 12);
  const deliveryPerPeriod = positive(productionProfile.delivery_capacity_per_period ?? productionProfile.delivery_capacity);
  const rampRatios = Array.isArray(productionProfile.ramp_up_capacity_ratios) ? productionProfile.ramp_up_capacity_ratios : [];
  const recommendedProduction = robotaxiGap;
  const plannedProduction = recommendedProduction;
  const supplyTrendSeries = buildSupplyTrendSeries({
    startDate: period.startDate,
    forecastEndDate: period.endDate,
    productionReadyDate: productionCompletionDate,
    qualityInspectionLeadDays,
    productionPeriodDays,
    capacityPerPeriod,
    deliveryPerPeriod,
    rampRatios,
    robotaxiGap,
    plannedProduction,
  });
  const finalSupplyPoint = supplyTrendSeries[supplyTrendSeries.length - 1] || {};
  const forecastSupplyPoints = supplyTrendSeries.filter((point) => point.within_forecast_period);
  const finalForecastSupplyPoint = forecastSupplyPoints[forecastSupplyPoints.length - 1] || {};
  const availablePeriods = forecastSupplyPoints.filter((point) => point.period_production_quantity > 0).length;
  const feasibleManufacturing = Math.floor(finalForecastSupplyPoint.cumulative_production_quantity || 0);
  const feasibleDelivery = Math.floor(finalForecastSupplyPoint.cumulative_delivery_quantity || 0);
  const feasibleSupply = feasibleDelivery;
  const uncoveredGap = Math.max(0, robotaxiGap - feasibleSupply);

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
    target_end_daily_orders: round(targetOrders),
    planning_mode: planningMode,
    planned_daily_orders: round(plannedOrders),
    market_opportunity_gap: round(Math.max(0, marketOrders - targetOrders)),
    target_market_shortfall: round(Math.max(0, targetOrders - marketOrders)),
    effective_service_cycle_min: round(cycleMin),
    average_pickup_duration_min: round(pickupMin),
    average_trip_duration_min: round(tripMin),
    average_turnaround_duration_min: round(turnaroundMin),
    robotaxi_available_hours_per_day: round(availableHours),
    target_task_utilization_rate: round(utilization, 4),
    operational_availability_rate: round(availability, 4),
    demand_buffer_ratio: round(buffer, 4),
    robotaxi_theoretical_daily_orders: round(theoreticalDaily),
    robotaxi_effective_daily_orders: round(effectiveDaily),
    buffered_daily_orders: round(bufferedDailyOrders),
    daily_required_robotaxi: dailyRequired,
    planned_peak_hour_orders: round(plannedPeakOrders),
    peak_concurrent_robotaxi: round(peakConcurrent),
    peak_required_robotaxi: peakRequired,
    service_required_robotaxi: serviceRequired,
    target_minimum_robotaxi_quantity: businessMinimum,
    required_robotaxi_quantity: required,
    requirement_driver: requirementDriver,
    zone_non_retired_robotaxi_quantity: nonRetired,
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
    first_production_completion_date: productionCompletionDate,
    first_quality_inspection_completion_date: qualityInspectionCompletionDate,
    production_ready_date: productionCompletionDate,
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
    planned_cumulative_quality_passed_quantity: finalSupplyPoint.cumulative_quality_passed_quantity || 0,
    planned_cumulative_delivery_quantity: finalSupplyPoint.cumulative_delivery_quantity || 0,
    first_delivery_date: supplyTrendSeries.find((point) => point.period_delivery_quantity > 0)?.trend_date || null,
    full_supply_completion_date: supplyTrendSeries.find((point) => point.remaining_robotaxi_gap <= 0)?.trend_date || null,
    contribution_margin_per_order: round(contributionPerOrder),
    daily_fixed_operating_cost: round(fixedCost),
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

function resolveRobotaxiZoneId(robotaxi = {}, opsCenters = [], zones = []) {
  const directZoneId = robotaxi.zone_id || robotaxi.target_zone_id || robotaxi.service_zone_id;
  if (directZoneId) return resolveTopLevelZoneId(directZoneId, zones);
  const currentCellId = robotaxi.current_cell_id || robotaxi.current_location_cell_id;
  const opsCenterId = robotaxi.ops_center_id || robotaxi.current_ops_center_id || robotaxi.target_ops_center_id;
  const opsCenter = opsCenters.find((item) => item.ops_center_id === opsCenterId)
    || opsCenters.find((item) => currentCellId && (item.cell_ids || []).includes(currentCellId));
  const opsCenterZoneId = opsCenter?.zone_id || opsCenter?.target_zone_id || opsCenter?.service_zone_id;
  if (opsCenterZoneId) return resolveTopLevelZoneId(opsCenterZoneId, zones);
  const cellZone = zones.find((zone) => currentCellId && (zone.cell_ids || []).includes(currentCellId));
  return cellZone ? resolveTopLevelZoneId(cellZone.zone_id, zones) : null;
}

function resolveTopLevelZoneId(zoneId, zones = []) {
  let current = zones.find((zone) => zone.zone_id === zoneId);
  const visited = new Set();
  while (current?.parent_zone_id && !visited.has(current.zone_id)) {
    visited.add(current.zone_id);
    current = zones.find((zone) => zone.zone_id === current.parent_zone_id) || current;
  }
  return current?.zone_id || zoneId || null;
}

function buildSupplyTrendSeries({
  startDate,
  forecastEndDate,
  productionReadyDate,
  qualityInspectionLeadDays,
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
    period_quality_passed_quantity: 0,
    cumulative_quality_passed_quantity: 0,
    period_delivery_quantity: 0,
    cumulative_delivery_quantity: 0,
    remaining_robotaxi_gap: robotaxiGap,
  }];
  if (plannedProduction <= 0 || capacityPerPeriod <= 0) return points;

  const events = new Map();
  let scheduledProduction = 0;
  for (let index = 0; index < MAX_SUPPLY_TREND_PERIODS && scheduledProduction < plannedProduction; index += 1) {
    const productionCapacity = Math.floor(capacityPerPeriod * ratio(rampRatios[index], 1));
    const periodProduction = Math.min(
      Math.max(0, plannedProduction - scheduledProduction),
      productionCapacity,
    );
    if (periodProduction <= 0) break;
    scheduledProduction += periodProduction;
    const productionDate = addDays(productionReadyDate, productionPeriodDays * index);
    const qualityDate = addDays(productionDate, qualityInspectionLeadDays);
    const productionEvent = events.get(productionDate) || { production: 0, qualityPassed: 0, deliveryWindow: false };
    productionEvent.production += periodProduction;
    events.set(productionDate, productionEvent);
    const qualityEvent = events.get(qualityDate) || { production: 0, qualityPassed: 0, deliveryWindow: true };
    qualityEvent.qualityPassed += periodProduction;
    qualityEvent.deliveryWindow = true;
    events.set(qualityDate, qualityEvent);
  }

  let cumulativeProduction = 0;
  let cumulativeQualityPassed = 0;
  let cumulativeDelivery = 0;
  let trendIndex = 0;
  let pendingDates = [...events.keys()].sort();
  while (pendingDates.length && trendIndex < MAX_SUPPLY_TREND_PERIODS) {
    const pointDate = pendingDates.shift();
    const event = events.get(pointDate) || { production: 0, qualityPassed: 0, deliveryWindow: false };
    cumulativeProduction += event.production;
    cumulativeQualityPassed += event.qualityPassed;
    const deliverableInventory = Math.max(0, cumulativeQualityPassed - cumulativeDelivery);
    const periodDelivery = event.deliveryWindow ? Math.min(deliverableInventory, Math.floor(deliveryPerPeriod)) : 0;
    cumulativeDelivery += periodDelivery;
    trendIndex += 1;
    points.push({
      trend_index: trendIndex,
      trend_date: pointDate,
      within_forecast_period: pointDate <= forecastEndDate,
      period_production_quantity: event.production,
      cumulative_production_quantity: cumulativeProduction,
      period_quality_passed_quantity: event.qualityPassed,
      cumulative_quality_passed_quantity: cumulativeQualityPassed,
      period_delivery_quantity: periodDelivery,
      cumulative_delivery_quantity: cumulativeDelivery,
      remaining_robotaxi_gap: Math.max(0, robotaxiGap - cumulativeDelivery),
    });
    if (deliveryPerPeriod > 0 && !pendingDates.length && cumulativeDelivery < cumulativeQualityPassed) {
      const nextDate = addDays(pointDate, productionPeriodDays);
      events.set(nextDate, { production: 0, qualityPassed: 0, deliveryWindow: true });
      pendingDates = [nextDate];
    }
  }
  return points;
}

function calculateGrowthFactor(model, rate, elapsedPeriods) {
  if (model === "LINEAR") return Math.max(0, 1 + rate * elapsedPeriods);
  return Math.max(0, (1 + rate) ** elapsedPeriods);
}

function buildForecastTrendSeries({ period, growthModel, effectiveGrowth, baselineOrders, targetOrders, planningMode }) {
  const totalDays = period.totalDays;
  return Object.fromEntries(["DAY", "WEEK", "MONTH"].map((timeUnit) => [
    timeUnit,
    buildForecastTrendPoints({
      timeUnit,
      elapsedDays: buildTrendElapsedDays(period, timeUnit),
      totalDays,
      period,
      growthModel,
      effectiveGrowth,
      baselineOrders,
      targetOrders,
      planningMode,
    }),
  ]));
}

function buildTrendElapsedDays(period, timeUnit) {
  const totalDays = period.totalDays;
  if (timeUnit === "MONTH") {
    const elapsedDays = [0];
    for (let index = 1; ; index += 1) {
      const pointDate = addCalendarPeriods(period.startDate, "MONTH", index);
      const elapsed = Math.min(totalDays, daysBetween(period.startDate, pointDate));
      if (elapsed >= totalDays) break;
      elapsedDays.push(elapsed);
    }
    elapsedDays.push(totalDays);
    return elapsedDays;
  }
  const stepDays = TREND_STEP_DAYS[timeUnit] || 1;
  const elapsedDays = [0];
  for (let day = stepDays; day < totalDays; day += stepDays) elapsedDays.push(day);
  if (elapsedDays[elapsedDays.length - 1] !== totalDays) elapsedDays.push(totalDays);
  return elapsedDays;
}

function buildForecastTrendPoints({ timeUnit, elapsedDays, totalDays, period, growthModel, effectiveGrowth, baselineOrders, targetOrders, planningMode }) {
  let cumulativeMarketOrders = 0;
  let cumulativePlannedOrders = 0;
  let previousMarketDailyOrders = baselineOrders;
  let previousPlannedDailyOrders = resolvePlannedDailyOrders(baselineOrders, targetOrders, planningMode);
  return elapsedDays.map((day, index) => {
    const elapsedPeriods = totalDays > 0 ? day / totalDays * period.count : 0;
    const marketDailyOrders = baselineOrders * calculateGrowthFactor(growthModel, effectiveGrowth, elapsedPeriods);
    const plannedDailyOrders = resolvePlannedDailyOrders(marketDailyOrders, targetOrders, planningMode);
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
      trend_date: day === totalDays ? period.endDate : addDays(period.startDate, day),
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

function resolvePlannedDailyOrders(marketDailyOrders, targetOrders, planningMode) {
  if (planningMode === "MARKET_LED") return marketDailyOrders;
  if (planningMode === "TARGET_LED") return targetOrders;
  return Math.min(marketDailyOrders, targetOrders || marketDailyOrders);
}

function buildCalculationSteps(result) {
  const step = (stepGroup, stepAction, outputField, inputValues, calculationModel, formulaExpression, outputUnit, sourceRefs = []) => ({
    step_group: stepGroup,
    step_action: stepAction,
    step_name: stepAction,
    input_values: inputValues,
    calculation_model: calculationModel,
    formula_expression: formulaExpression,
    formula: formulaExpression,
    output_field: outputField,
    output_value: result[outputField],
    output_unit: outputUnit,
    source_refs: sourceRefs,
  });
  const planningFormula = result.planning_mode === "MARKET_LED"
    ? "market_forecast_daily_orders"
    : result.planning_mode === "TARGET_LED"
      ? "target_end_daily_orders"
      : "min(market_forecast_daily_orders, target_end_daily_orders)";
  return [
    step("预测周期", "确定预测结束日期", "forecast_end_date", {
      forecast_start_date: result.forecast_start_date,
      forecast_period_unit: result.forecast_period_unit,
      forecast_period_count: result.forecast_period_count,
    }, "CALENDAR_PERIOD", "add_calendar_period(forecast_start_date, forecast_period_unit, forecast_period_count) - 1 day", "日期", ["business_target_snapshot", "strategy_snapshot"]),
    step("需求预测", "汇总区域需求", "baseline_addressable_daily_orders", {
      baseline_addressable_daily_orders: result.baseline_addressable_daily_orders,
    }, "ZONE_PLACE_AGGREGATION", "Σ Place.baseline_addressable_daily_orders", "日订单", ["zone_demand_snapshot", "place_demand_profile_snapshot"]),
    step("需求预测", "计算有效增长率", "effective_period_growth_rate", {
      zone_period_growth_rate: result.zone_period_growth_rate,
      growth_adjustment_rate: result.growth_adjustment_rate,
    }, "GROWTH_RATE_ADJUSTMENT", "zone_period_growth_rate + growth_adjustment_rate", "比例", ["zone_demand_snapshot", "strategy_snapshot"]),
    step("需求预测", "应用增长模型", "growth_factor", {
      growth_model: result.growth_model,
      effective_period_growth_rate: result.effective_period_growth_rate,
      forecast_period_count: result.forecast_period_count,
    }, result.growth_model, result.growth_model === "LINEAR"
      ? "max(0, 1 + effective_period_growth_rate × forecast_period_count)"
      : "(1 + effective_period_growth_rate) ^ forecast_period_count", "倍", ["strategy_snapshot"]),
    step("需求预测", "计算期末市场需求", "market_forecast_daily_orders", {
      baseline_addressable_daily_orders: result.baseline_addressable_daily_orders,
      growth_factor: result.growth_factor,
    }, "MARKET_DEMAND_FORECAST", "baseline_addressable_daily_orders × growth_factor", "日订单", ["zone_demand_snapshot", "strategy_snapshot"]),
    step("经营目标", "确定计划承接量", "planned_daily_orders", {
      market_forecast_daily_orders: result.market_forecast_daily_orders,
      target_end_daily_orders: result.target_end_daily_orders,
      planning_mode: result.planning_mode,
    }, result.planning_mode, planningFormula, "日订单", ["business_target_snapshot", "strategy_snapshot"]),
    step("Robotaxi 能力", "计算完整服务周期", "effective_service_cycle_min", {
      average_pickup_duration_min: result.average_pickup_duration_min,
      average_trip_duration_min: result.average_trip_duration_min,
      average_turnaround_duration_min: result.average_turnaround_duration_min,
    }, "SERVICE_CYCLE", "average_pickup_duration_min + average_trip_duration_min + average_turnaround_duration_min", "分钟", ["strategy_snapshot"]),
    step("Robotaxi 能力", "计算单车理论日产能", "robotaxi_theoretical_daily_orders", {
      robotaxi_available_hours_per_day: result.robotaxi_available_hours_per_day,
      effective_service_cycle_min: result.effective_service_cycle_min,
    }, "THEORETICAL_DAILY_CAPACITY", "robotaxi_available_hours_per_day × 60 / effective_service_cycle_min", "订单 / Robotaxi·日", ["strategy_snapshot"]),
    step("Robotaxi 能力", "计算单车有效日产能", "robotaxi_effective_daily_orders", {
      robotaxi_theoretical_daily_orders: result.robotaxi_theoretical_daily_orders,
      target_task_utilization_rate: result.target_task_utilization_rate,
      operational_availability_rate: result.operational_availability_rate,
    }, "EFFECTIVE_DAILY_CAPACITY", "robotaxi_theoretical_daily_orders × target_task_utilization_rate × operational_availability_rate", "订单 / Robotaxi·日", ["business_target_snapshot", "strategy_snapshot"]),
    step("Robotaxi 能力", "加入需求缓冲", "buffered_daily_orders", {
      planned_daily_orders: result.planned_daily_orders,
      demand_buffer_ratio: result.demand_buffer_ratio,
    }, "DEMAND_BUFFER", "planned_daily_orders × (1 + demand_buffer_ratio)", "日订单", ["strategy_snapshot"]),
    step("Robotaxi 能力", "计算日常需求", "daily_required_robotaxi", {
      buffered_daily_orders: result.buffered_daily_orders,
      robotaxi_effective_daily_orders: result.robotaxi_effective_daily_orders,
    }, "DAILY_CAPACITY_REQUIREMENT", "ceil(buffered_daily_orders / robotaxi_effective_daily_orders)", "Robotaxi", ["business_target_snapshot", "strategy_snapshot"]),
    step("Robotaxi 能力", "计算峰值小时订单", "planned_peak_hour_orders", {
      planned_daily_orders: result.planned_daily_orders,
      busiest_hour_share: result.busiest_hour_share,
    }, "PEAK_HOUR_DEMAND", "planned_daily_orders × busiest_hour_share", "订单 / 小时", ["zone_demand_snapshot"]),
    step("Robotaxi 能力", "计算峰值并发数量", "peak_concurrent_robotaxi", {
      planned_peak_hour_orders: result.planned_peak_hour_orders,
      effective_service_cycle_min: result.effective_service_cycle_min,
    }, "PEAK_CONCURRENCY", "planned_peak_hour_orders × effective_service_cycle_min / 60", "Robotaxi", ["strategy_snapshot"]),
    step("Robotaxi 能力", "修正峰值可用性", "peak_required_robotaxi", {
      peak_concurrent_robotaxi: result.peak_concurrent_robotaxi,
      operational_availability_rate: result.operational_availability_rate,
    }, "PEAK_AVAILABILITY_REQUIREMENT", "ceil(peak_concurrent_robotaxi / operational_availability_rate)", "Robotaxi", ["strategy_snapshot"]),
    step("Robotaxi 能力", "确定服务需求规模", "service_required_robotaxi", {
      daily_required_robotaxi: result.daily_required_robotaxi,
      peak_required_robotaxi: result.peak_required_robotaxi,
    }, "SERVICE_REQUIREMENT", "max(daily_required_robotaxi, peak_required_robotaxi)", "Robotaxi"),
    step("Robotaxi 能力", "应用经营最低规模", "required_robotaxi_quantity", {
      service_required_robotaxi: result.service_required_robotaxi,
      target_minimum_robotaxi_quantity: result.target_minimum_robotaxi_quantity,
    }, "FINAL_REQUIREMENT", "max(service_required_robotaxi, target_minimum_robotaxi_quantity)", "Robotaxi", ["business_target_snapshot"]),
    step("服务承载", "校验日服务承载", "daily_capacity_gap", {
      planned_daily_orders: result.planned_daily_orders,
      effective_daily_capacity: result.effective_daily_capacity,
    }, "SERVICE_AREA_DAILY_CAPACITY", "max(0, planned_daily_orders - effective_daily_capacity)", "日订单", ["service_area_capacity_snapshot"]),
    step("服务承载", "校验峰值服务承载", "peak_capacity_gap", {
      planned_peak_hour_orders: result.planned_peak_hour_orders,
      effective_peak_hour_capacity: result.effective_peak_hour_capacity,
    }, "SERVICE_AREA_PEAK_CAPACITY", "max(0, planned_peak_hour_orders - effective_peak_hour_capacity)", "订单 / 小时", ["service_area_capacity_snapshot"]),
    step("资产缺口", "汇总规划资产基数", "effective_current_robotaxi", {
      zone_non_retired_robotaxi_quantity: result.zone_non_retired_robotaxi_quantity,
      committed_inbound_quantity: result.committed_inbound_quantity,
      committed_outbound_quantity: result.committed_outbound_quantity,
      planned_retirement_quantity: result.planned_retirement_quantity,
    }, "EFFECTIVE_ASSET_INVENTORY", "zone_non_retired_robotaxi_quantity + committed_inbound_quantity - committed_outbound_quantity - planned_retirement_quantity", "Robotaxi", ["robotaxi_inventory_snapshot"]),
    step("资产缺口", "计算 Robotaxi 缺口", "robotaxi_gap_quantity", {
      required_robotaxi_quantity: result.required_robotaxi_quantity,
      effective_current_robotaxi: result.effective_current_robotaxi,
    }, "ROBOTAXI_GAP", "max(0, required_robotaxi_quantity - effective_current_robotaxi)", "Robotaxi", ["robotaxi_inventory_snapshot"]),
    step("生产供给", "确定建议生产量", "recommended_production_quantity", {
      robotaxi_gap_quantity: result.robotaxi_gap_quantity,
    }, "SUPPLY_REQUIREMENT", "robotaxi_gap_quantity", "Robotaxi", ["production_profile_snapshot"]),
    step("生产供给", "计算预测期可形成供给", "feasible_supply_quantity", {
      feasible_manufacturing_quantity: result.feasible_manufacturing_quantity,
      feasible_delivery_quantity: result.feasible_delivery_quantity,
    }, "PRODUCTION_AND_DELIVERY_CONSTRAINT", "min(feasible_manufacturing_quantity, feasible_delivery_quantity)", "Robotaxi", ["production_profile_snapshot"]),
    step("生产供给", "计算预测期末剩余缺口", "uncovered_robotaxi_gap", {
      robotaxi_gap_quantity: result.robotaxi_gap_quantity,
      feasible_supply_quantity: result.feasible_supply_quantity,
    }, "UNCOVERED_SUPPLY_GAP", "max(0, robotaxi_gap_quantity - feasible_supply_quantity)", "Robotaxi", ["production_profile_snapshot"]),
    step("基础经济性", "计算日经营贡献", "daily_contribution_margin", {
      planned_daily_orders: result.planned_daily_orders,
      contribution_margin_per_order: result.contribution_margin_per_order,
      daily_fixed_operating_cost: result.daily_fixed_operating_cost,
    }, "DAILY_CONTRIBUTION", "planned_daily_orders × contribution_margin_per_order - daily_fixed_operating_cost", "元 / 日", ["business_target_snapshot"]),
  ].map((item, index) => ({ ...item, step_order: index + 1 }));
}

export function normalizeLongTermDemandForecastResult(result = {}) {
  const steps = Array.isArray(result.calculation_steps) ? result.calculation_steps : [];
  const hasCurrentCalculationContract = steps.length >= 20 && steps.every((item) => (
    item?.output_field
    && item?.calculation_model
    && item?.formula_expression
    && item?.input_values
    && Object.keys(item.input_values).length > 0
  ));
  const normalizedResult = {
    growth_model: "COMPOUND",
    planning_mode: "BALANCED",
    ...result,
    supply_trend_series: (result.supply_trend_series || []).map((point) => ({
      ...point,
      period_quality_passed_quantity: point.period_quality_passed_quantity ?? point.period_delivery_quantity ?? 0,
      cumulative_quality_passed_quantity: point.cumulative_quality_passed_quantity ?? point.cumulative_delivery_quantity ?? 0,
    })),
  };
  if (hasCurrentCalculationContract) return normalizedResult;
  return {
    ...normalizedResult,
    calculation_steps: buildCalculationSteps(normalizedResult),
  };
}

export function normalizeLongTermDemandForecastResults(results = []) {
  return (Array.isArray(results) ? results : []).map(normalizeLongTermDemandForecastResult);
}
