const defineModel = (modelId, definition) => Object.freeze({
  model_id: modelId,
  semantic_version: "1.0",
  ...definition,
});

export const calculationModelRegistry = Object.freeze({
  CALENDAR_PERIOD: defineModel("CALENDAR_PERIOD", { group: "预测周期", action: "确定预测结束日期", output_field: "forecast_end_date", unit: "DATE", formula: "add_calendar_period(forecast_start_date, forecast_period_unit, forecast_period_count) - 1 day", inputs: ["forecast_start_date", "forecast_period_unit", "forecast_period_count"] }),
  ZONE_PLACE_AGGREGATION: defineModel("ZONE_PLACE_AGGREGATION", { group: "需求预测", action: "汇总区域需求", output_field: "baseline_addressable_daily_orders", unit: "ORDER_PER_DAY", formula: "Σ Place.baseline_addressable_daily_orders", inputs: ["baseline_addressable_daily_orders"] }),
  GROWTH_RATE_ADJUSTMENT: defineModel("GROWTH_RATE_ADJUSTMENT", { group: "需求预测", action: "计算有效周期增长率", output_field: "effective_period_growth_rate", unit: "RATIO", formula: "zone_period_growth_rate + growth_adjustment_rate", inputs: ["zone_period_growth_rate", "growth_adjustment_rate"] }),
  LINEAR: defineModel("LINEAR", { group: "需求预测", action: "应用线性增长模型", output_field: "growth_factor", unit: "MULTIPLE", formula: "max(0, 1 + effective_period_growth_rate × forecast_period_count)", inputs: ["effective_period_growth_rate", "forecast_period_count"] }),
  COMPOUND: defineModel("COMPOUND", { group: "需求预测", action: "应用复合增长模型", output_field: "growth_factor", unit: "MULTIPLE", formula: "(1 + effective_period_growth_rate) ^ forecast_period_count", inputs: ["effective_period_growth_rate", "forecast_period_count"] }),
  MARKET_DEMAND_FORECAST: defineModel("MARKET_DEMAND_FORECAST", { group: "需求预测", action: "计算期末市场日订单", output_field: "market_forecast_daily_orders", unit: "ORDER_PER_DAY", formula: "baseline_addressable_daily_orders × growth_factor", inputs: ["baseline_addressable_daily_orders", "growth_factor"] }),
  MARKET_LED: defineModel("MARKET_LED", { group: "经营目标", action: "确定计划承接日订单", output_field: "planned_daily_orders", unit: "ORDER_PER_DAY", formula: "market_forecast_daily_orders", inputs: ["market_forecast_daily_orders", "target_end_daily_orders", "planning_mode"] }),
  TARGET_LED: defineModel("TARGET_LED", { group: "经营目标", action: "确定计划承接日订单", output_field: "planned_daily_orders", unit: "ORDER_PER_DAY", formula: "target_end_daily_orders", inputs: ["market_forecast_daily_orders", "target_end_daily_orders", "planning_mode"] }),
  BALANCED: defineModel("BALANCED", { group: "经营目标", action: "确定计划承接日订单", output_field: "planned_daily_orders", unit: "ORDER_PER_DAY", formula: "min(market_forecast_daily_orders, target_end_daily_orders)", inputs: ["market_forecast_daily_orders", "target_end_daily_orders", "planning_mode"] }),
  ORDER_FULFILLMENT_EXECUTION_DURATION: defineModel("ORDER_FULFILLMENT_EXECUTION_DURATION", { group: "Robotaxi 能力", action: "计算订单履约执行时长", output_field: "average_order_fulfillment_execution_duration_min", unit: "MINUTE", formula: "average_pickup_duration_min + average_passenger_trip_duration_min", inputs: ["average_pickup_duration_min", "average_passenger_trip_duration_min"] }),
  VEHICLE_SERVICE_CYCLE_DURATION: defineModel("VEHICLE_SERVICE_CYCLE_DURATION", { group: "Robotaxi 能力", action: "计算车辆服务周期", output_field: "vehicle_service_cycle_duration_min", unit: "MINUTE", formula: "average_order_fulfillment_execution_duration_min + average_turnaround_duration_min", inputs: ["average_order_fulfillment_execution_duration_min", "average_turnaround_duration_min"] }),
  THEORETICAL_DAILY_CAPACITY: defineModel("THEORETICAL_DAILY_CAPACITY", { group: "Robotaxi 能力", action: "计算单车理论日产能", output_field: "robotaxi_theoretical_daily_orders", unit: "ORDER_PER_ROBOTAXI_DAY", formula: "robotaxi_available_hours_per_day × 60 / vehicle_service_cycle_duration_min", inputs: ["robotaxi_available_hours_per_day", "vehicle_service_cycle_duration_min"] }),
  EFFECTIVE_DAILY_CAPACITY: defineModel("EFFECTIVE_DAILY_CAPACITY", { group: "Robotaxi 能力", action: "计算单车有效日产能", output_field: "robotaxi_effective_daily_orders", unit: "ORDER_PER_ROBOTAXI_DAY", formula: "robotaxi_theoretical_daily_orders × target_order_service_time_utilization_rate × operational_availability_rate", inputs: ["robotaxi_theoretical_daily_orders", "target_order_service_time_utilization_rate", "operational_availability_rate"] }),
  DEMAND_BUFFER: defineModel("DEMAND_BUFFER", { group: "Robotaxi 能力", action: "计算缓冲后日订单", output_field: "buffered_daily_orders", unit: "ORDER_PER_DAY", formula: "planned_daily_orders × (1 + demand_buffer_ratio)", inputs: ["planned_daily_orders", "demand_buffer_ratio"] }),
  DAILY_CAPACITY_REQUIREMENT: defineModel("DAILY_CAPACITY_REQUIREMENT", { group: "Robotaxi 能力", action: "计算日常需求 Robotaxi", output_field: "daily_required_robotaxi", unit: "ROBOTAXI", formula: "ceil(buffered_daily_orders / robotaxi_effective_daily_orders)", inputs: ["buffered_daily_orders", "robotaxi_effective_daily_orders"] }),
  PEAK_HOUR_DEMAND: defineModel("PEAK_HOUR_DEMAND", { group: "Robotaxi 能力", action: "计算计划峰值小时订单", output_field: "planned_peak_hour_orders", unit: "ORDER_PER_HOUR", formula: "planned_daily_orders × busiest_hour_share", inputs: ["planned_daily_orders", "busiest_hour_share"] }),
  PEAK_CONCURRENCY: defineModel("PEAK_CONCURRENCY", { group: "Robotaxi 能力", action: "计算峰值并发 Robotaxi", output_field: "peak_concurrent_robotaxi", unit: "ROBOTAXI", formula: "planned_peak_hour_orders × vehicle_service_cycle_duration_min / 60", inputs: ["planned_peak_hour_orders", "vehicle_service_cycle_duration_min"] }),
  PEAK_AVAILABILITY_REQUIREMENT: defineModel("PEAK_AVAILABILITY_REQUIREMENT", { group: "Robotaxi 能力", action: "计算峰值所需 Robotaxi", output_field: "peak_required_robotaxi", unit: "ROBOTAXI", formula: "ceil(peak_concurrent_robotaxi / operational_availability_rate)", inputs: ["peak_concurrent_robotaxi", "operational_availability_rate"] }),
  SERVICE_REQUIREMENT: defineModel("SERVICE_REQUIREMENT", { group: "Robotaxi 能力", action: "确定服务需求规模", output_field: "service_required_robotaxi", unit: "ROBOTAXI", formula: "max(daily_required_robotaxi, peak_required_robotaxi)", inputs: ["daily_required_robotaxi", "peak_required_robotaxi"] }),
  FINAL_REQUIREMENT: defineModel("FINAL_REQUIREMENT", { group: "Robotaxi 能力", action: "应用经营最低规模", output_field: "required_robotaxi_quantity", unit: "ROBOTAXI", formula: "max(service_required_robotaxi, target_minimum_robotaxi_quantity)", inputs: ["service_required_robotaxi", "target_minimum_robotaxi_quantity"] }),
  SERVICE_AREA_DAILY_CAPACITY: defineModel("SERVICE_AREA_DAILY_CAPACITY", { group: "服务承载", action: "计算日常服务能力缺口", output_field: "daily_capacity_gap", unit: "ORDER_PER_DAY", formula: "max(0, planned_daily_orders - effective_daily_capacity)", inputs: ["planned_daily_orders", "effective_daily_capacity"] }),
  SERVICE_AREA_PEAK_CAPACITY: defineModel("SERVICE_AREA_PEAK_CAPACITY", { group: "服务承载", action: "计算峰值服务能力缺口", output_field: "peak_capacity_gap", unit: "ORDER_PER_HOUR", formula: "max(0, planned_peak_hour_orders - effective_peak_hour_capacity)", inputs: ["planned_peak_hour_orders", "effective_peak_hour_capacity"] }),
  EFFECTIVE_ASSET_INVENTORY: defineModel("EFFECTIVE_ASSET_INVENTORY", { group: "资产缺口", action: "汇总规划资产基数", output_field: "effective_current_robotaxi", unit: "ROBOTAXI", formula: "zone_non_retired_robotaxi_quantity + committed_inbound_quantity - committed_outbound_quantity - planned_retirement_quantity", inputs: ["zone_non_retired_robotaxi_quantity", "committed_inbound_quantity", "committed_outbound_quantity", "planned_retirement_quantity"] }),
  ROBOTAXI_GAP: defineModel("ROBOTAXI_GAP", { group: "资产缺口", action: "计算 Robotaxi 缺口", output_field: "robotaxi_gap_quantity", unit: "ROBOTAXI", formula: "max(0, required_robotaxi_quantity - effective_current_robotaxi)", inputs: ["required_robotaxi_quantity", "effective_current_robotaxi"] }),
  SUPPLY_REQUIREMENT: defineModel("SUPPLY_REQUIREMENT", { group: "生产供应", action: "确定建议生产数量", output_field: "recommended_production_quantity", unit: "ROBOTAXI", formula: "robotaxi_gap_quantity", inputs: ["robotaxi_gap_quantity"] }),
  PRODUCTION_AND_DELIVERY_CONSTRAINT: defineModel("PRODUCTION_AND_DELIVERY_CONSTRAINT", { group: "生产供应", action: "计算预测期可供应数量", output_field: "feasible_supply_quantity", unit: "ROBOTAXI", formula: "min(feasible_manufacturing_quantity, feasible_delivery_quantity)", inputs: ["feasible_manufacturing_quantity", "feasible_delivery_quantity"] }),
  UNCOVERED_SUPPLY_GAP: defineModel("UNCOVERED_SUPPLY_GAP", { group: "生产供应", action: "计算预测期末剩余缺口", output_field: "uncovered_robotaxi_gap", unit: "ROBOTAXI", formula: "max(0, robotaxi_gap_quantity - feasible_supply_quantity)", inputs: ["robotaxi_gap_quantity", "feasible_supply_quantity"] }),
  SUPPLY_GAP_COVERAGE: defineModel("SUPPLY_GAP_COVERAGE", { group: "供应决策", action: "计算缺口覆盖数量", output_field: "covered_gap_quantity", unit: "ROBOTAXI", formula: "ceil(robotaxi_gap_quantity × demand_coverage_rate)", inputs: ["robotaxi_gap_quantity", "demand_coverage_rate"] }),
  SUPPLY_SAFETY_CAPACITY: defineModel("SUPPLY_SAFETY_CAPACITY", { group: "供应决策", action: "计算安全容量数量", output_field: "safety_capacity_quantity", unit: "ROBOTAXI", formula: "ceil(covered_gap_quantity × safety_capacity_ratio)", inputs: ["covered_gap_quantity", "safety_capacity_ratio"] }),
  SUPPLY_REQUIRED_QUANTITY: defineModel("SUPPLY_REQUIRED_QUANTITY", { group: "供应决策", action: "计算所需供应数量", output_field: "required_supply_quantity", unit: "ROBOTAXI", formula: "covered_gap_quantity + safety_capacity_quantity", inputs: ["covered_gap_quantity", "safety_capacity_quantity"] }),
  SUPPLY_PERIOD_CAPACITY: defineModel("SUPPLY_PERIOD_CAPACITY", { group: "供应决策", action: "计算预测期供应能力", output_field: "feasible_delivery_quantity", unit: "ROBOTAXI", formula: "sum(min(production_capacity_per_period, delivery_capacity_per_period)) where planned_quality_completion_date <= forecast_end_date", inputs: ["forecast_start_date", "forecast_end_date", "production_capacity_per_period", "ramp_up_capacity_ratios", "production_lead_time_days", "quality_inspection_lead_time_days", "delivery_capacity_per_period"] }),
  SUPPLY_PLAN_QUANTITY: defineModel("SUPPLY_PLAN_QUANTITY", { group: "供应决策", action: "确定计划生产数量", output_field: "planned_robotaxi_count", unit: "ROBOTAXI", formula: "min(required_supply_quantity, feasible_manufacturing_quantity, feasible_delivery_quantity)", inputs: ["required_supply_quantity", "feasible_manufacturing_quantity", "feasible_delivery_quantity"] }),
  SUPPLY_ESTIMATED_COST: defineModel("SUPPLY_ESTIMATED_COST", { group: "供应决策", action: "计算预计供应成本", output_field: "estimated_supply_cost_amount", unit: "CNY", formula: "planned_robotaxi_count × standard_production_cost_per_robotaxi_snapshot", inputs: ["planned_robotaxi_count", "standard_production_cost_per_robotaxi_snapshot"] }),
  DAILY_CONTRIBUTION: defineModel("DAILY_CONTRIBUTION", { group: "基础经济性", action: "计算预计日运营利润", output_field: "daily_contribution_margin", unit: "CNY_PER_DAY", formula: "planned_daily_orders × contribution_margin_per_order - daily_fixed_operating_cost", inputs: ["planned_daily_orders", "contribution_margin_per_order", "daily_fixed_operating_cost"] }),
  PLACE_POPULATION_EXPOSURE: defineModel("PLACE_POPULATION_EXPOSURE", { group: "地点需求", action: "计算日有效人群", output_field: "daily_population_exposure", unit: "PERSON_PER_DAY", formula: "resident_population × resident_trip_weight + working_population × worker_trip_weight + daily_visitors × visitor_trip_weight", inputs: ["resident_population", "resident_trip_weight", "working_population", "worker_trip_weight", "daily_visitors", "visitor_trip_weight"] }),
  PLACE_POTENTIAL_TRIPS: defineModel("PLACE_POTENTIAL_TRIPS", { group: "地点需求", action: "计算潜在日出行量", output_field: "potential_daily_trips", unit: "TRIP_PER_DAY", formula: "daily_population_exposure × trip_generation_rate × demand_weight", inputs: ["daily_population_exposure", "trip_generation_rate", "demand_weight"] }),
  PLACE_ADDRESSABLE_ORDERS: defineModel("PLACE_ADDRESSABLE_ORDERS", { group: "地点需求", action: "计算当前可争取日订单", output_field: "baseline_addressable_daily_orders", unit: "ORDER_PER_DAY", formula: "potential_daily_trips × robotaxi_adoption_rate × service_acceptance_rate × competition_retention_rate", inputs: ["potential_daily_trips", "robotaxi_adoption_rate", "service_acceptance_rate", "competition_retention_rate"] }),
  PLACE_PEAK_ORDERS: defineModel("PLACE_PEAK_ORDERS", { group: "地点需求", action: "计算当前峰值小时订单", output_field: "baseline_peak_hour_orders", unit: "ORDER_PER_HOUR", formula: "baseline_addressable_daily_orders × busiest_hour_share", inputs: ["baseline_addressable_daily_orders", "busiest_hour_share"] }),
  SERVICE_AREA_POSITION_THROUGHPUT: defineModel("SERVICE_AREA_POSITION_THROUGHPUT", { group: "服务区域承载", action: "计算单位置小时周转", output_field: "position_throughput_per_hour", unit: "ORDER_PER_HOUR", formula: "60 / average_service_stop_duration_min", inputs: ["average_service_stop_duration_min"] }),
  SERVICE_AREA_PICKUP_CAPACITY: defineModel("SERVICE_AREA_PICKUP_CAPACITY", { group: "服务区域承载", action: "计算有效上车承载", output_field: "effective_pickup_capacity_per_hour", unit: "ORDER_PER_HOUR", formula: "pickup_position_capacity × position_throughput_per_hour × accessibility_factor × capacity_availability_rate", inputs: ["pickup_position_capacity", "position_throughput_per_hour", "accessibility_factor", "capacity_availability_rate"] }),
  SERVICE_AREA_DROPOFF_CAPACITY: defineModel("SERVICE_AREA_DROPOFF_CAPACITY", { group: "服务区域承载", action: "计算有效下车承载", output_field: "effective_dropoff_capacity_per_hour", unit: "ORDER_PER_HOUR", formula: "dropoff_position_capacity × position_throughput_per_hour × accessibility_factor × capacity_availability_rate", inputs: ["dropoff_position_capacity", "position_throughput_per_hour", "accessibility_factor", "capacity_availability_rate"] }),
  SERVICE_AREA_DAILY_PICKUP_CAPACITY: defineModel("SERVICE_AREA_DAILY_PICKUP_CAPACITY", { group: "服务区域承载", action: "计算有效日上车承载", output_field: "effective_daily_pickup_capacity", unit: "ORDER_PER_DAY", formula: "effective_pickup_capacity_per_hour × operating_hours_per_day", inputs: ["effective_pickup_capacity_per_hour", "operating_hours_per_day"] }),
  SERVICE_AREA_DAILY_DROPOFF_CAPACITY: defineModel("SERVICE_AREA_DAILY_DROPOFF_CAPACITY", { group: "服务区域承载", action: "计算有效日下车承载", output_field: "effective_daily_dropoff_capacity", unit: "ORDER_PER_DAY", formula: "effective_dropoff_capacity_per_hour × operating_hours_per_day", inputs: ["effective_dropoff_capacity_per_hour", "operating_hours_per_day"] }),
  ZONE_BASELINE_DEMAND: defineModel("ZONE_BASELINE_DEMAND", { group: "区域需求", action: "汇总区域当前可争取日订单", output_field: "baseline_addressable_daily_orders", unit: "ORDER_PER_DAY", formula: "Σ Place.baseline_addressable_daily_orders", inputs: ["calculated_from_profile_ids"] }),
  ZONE_PEAK_DEMAND: defineModel("ZONE_PEAK_DEMAND", { group: "区域需求", action: "汇总区域当前峰值小时订单", output_field: "baseline_peak_hour_orders", unit: "ORDER_PER_HOUR", formula: "Σ Place.baseline_peak_hour_orders", inputs: ["calculated_from_profile_ids"] }),
  ZONE_PERIOD_GROWTH_RATE: defineModel("ZONE_PERIOD_GROWTH_RATE", { group: "区域需求", action: "汇总区域周期增长率", output_field: "zone_period_growth_rate", unit: "PERCENT", formula: "Σ(Place.place_period_growth_rate × Place.baseline_addressable_daily_orders) / Σ Place.baseline_addressable_daily_orders", inputs: ["calculated_from_profile_ids"] }),
  ZONE_DAILY_SERVICE_CAPACITY: defineModel("ZONE_DAILY_SERVICE_CAPACITY", { group: "区域承载", action: "计算区域有效日承载", output_field: "effective_daily_capacity", unit: "ORDER_PER_DAY", formula: "min(Σ ServiceArea.effective_daily_pickup_capacity, Σ ServiceArea.effective_daily_dropoff_capacity)", inputs: ["effective_daily_pickup_capacity", "effective_daily_dropoff_capacity"] }),
  ZONE_PEAK_SERVICE_CAPACITY: defineModel("ZONE_PEAK_SERVICE_CAPACITY", { group: "区域承载", action: "计算区域有效峰值承载", output_field: "effective_peak_hour_capacity", unit: "ORDER_PER_HOUR", formula: "min(Σ ServiceArea.effective_pickup_capacity_per_hour, Σ ServiceArea.effective_dropoff_capacity_per_hour)", inputs: ["effective_pickup_capacity_per_hour", "effective_dropoff_capacity_per_hour"] }),
});

export function getCalculationModelDefinition(modelId) {
  return calculationModelRegistry[modelId] || null;
}

export function createRegisteredCalculationStep({ modelId, result = {}, inputValues = {}, sourceRefs = [] }) {
  const model = getCalculationModelDefinition(modelId);
  if (!model) throw new Error(`CALCULATION_MODEL_NOT_REGISTERED:${modelId}`);
  return {
    step_group: model.group,
    step_action: model.action,
    step_name: model.action,
    input_values: inputValues,
    calculation_model: model.model_id,
    calculation_model_version: model.semantic_version,
    formula_expression: model.formula,
    formula: model.formula,
    output_field: model.output_field,
    output_value: result[model.output_field],
    output_unit: model.unit,
    source_refs: sourceRefs,
  };
}

export function validateCalculationModelRegistry() {
  const errors = [];
  Object.entries(calculationModelRegistry).forEach(([key, model]) => {
    if (model.model_id !== key) errors.push(`${key}:MODEL_ID_MISMATCH`);
    ["group", "action", "output_field", "unit", "formula", "inputs"].forEach((field) => {
      if (!model[field] || (Array.isArray(model[field]) && !model[field].length)) errors.push(`${key}:MISSING_${field.toUpperCase()}`);
    });
  });
  return Object.freeze(errors);
}
