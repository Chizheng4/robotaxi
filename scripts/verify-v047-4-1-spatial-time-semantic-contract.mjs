import assert from "node:assert/strict";

import { initializeSpatialBusinessProfiles } from "../src/data/spatialBusinessProfileInitialization.js";
import { calculationModelRegistry, validateCalculationModelRegistry } from "../src/domain/calculationModelRegistry.js";
import { getFieldSemanticDefinition, validateFieldSemanticRegistry } from "../src/domain/fieldSemanticRegistry.js";
import { getFieldLabel } from "../src/domain/fieldDictionary.js";
import { calculateLongTermDemandPlan } from "../src/domain/longTermDemandPlanning.js";

assert.deepEqual(validateFieldSemanticRegistry(), [], "统一字段语义注册必须通过验证");
assert.deepEqual(validateCalculationModelRegistry(), [], "统一计算模型注册必须通过验证");

const context = {
  places: [
    { place_id: "P-001", place_name: "住宅区", place_type: "RESIDENTIAL", nearby_service_area_ids: ["SA-001"], resident_population: 1000 },
    { place_id: "P-002", place_name: "办公区", place_type: "OFFICE", nearby_service_area_ids: ["SA-002"], working_population: 1000 },
  ],
  serviceAreas: [
    { service_area_id: "SA-001", service_area_name: "住宅接驳区", place_ids: ["P-001"], pickup_position_capacity: 2, dropoff_position_capacity: 1, average_service_stop_duration_min: 5, operating_hours_per_day: 10, capacity_availability_rate: 0.5 },
    { service_area_id: "SA-002", service_area_name: "办公接驳区", place_ids: ["P-002"], pickup_position_capacity: 1, dropoff_position_capacity: 3, average_service_stop_duration_min: 10, operating_hours_per_day: 5, capacity_availability_rate: 1 },
  ],
  zones: [{ zone_id: "Z-001", zone_name: "测试区域", parent_zone_id: null, place_ids: ["P-001", "P-002"], service_area_ids: ["SA-001", "SA-002"] }],
};

const initialized = initializeSpatialBusinessProfiles(context);
const serviceAreas = initialized.demandProfiles.filter((item) => item.target_object_type === "SERVICE_AREA");
const places = initialized.demandProfiles.filter((item) => item.target_object_type === "PLACE");
const zone = initialized.demandProfiles.find((item) => item.target_object_type === "ZONE");
assert.ok(places.every((item) => item.profile_calculation_steps.every((step) => calculationModelRegistry[step.calculation_model])), "Place 每一步计算必须引用已登记模型");
assert.equal(serviceAreas.length, 2);
assert.ok(serviceAreas.every((item) => !("baseline_addressable_daily_orders" in item)), "ServiceArea 只表达承载能力，不得生成地点需求");
assert.ok(serviceAreas.every((item) => !("effective_daily_capacity" in item)), "ServiceArea 不得提前合并上下车承载");
assert.ok(serviceAreas.every((item) => item.calculated_from_profile_ids.length === 0), "ServiceArea 承载不得伪装为由 Place 需求画像计算");
assert.ok(serviceAreas.every((item) => item.profile_calculation_steps.every((step) => calculationModelRegistry[step.calculation_model])), "ServiceArea 每一步计算必须引用已登记模型");
assert.equal(zone.effective_daily_pickup_capacity, 150);
assert.equal(zone.effective_daily_dropoff_capacity, 150);
assert.equal(zone.effective_daily_capacity, 150, "Zone 日承载必须取上下车汇总后的瓶颈值");
assert.equal(zone.effective_pickup_capacity_per_hour, 18);
assert.equal(zone.effective_dropoff_capacity_per_hour, 24);
assert.equal(zone.effective_peak_hour_capacity, 18, "Zone 小时承载必须取上下车汇总后的瓶颈值");
assert.ok(zone.profile_calculation_steps.every((step) => calculationModelRegistry[step.calculation_model]), "Zone 每一步计算必须引用已登记模型");

const planning = calculateLongTermDemandPlan({
  strategy: {
    forecast_strategy_id: "LDF-STR-TEST",
    forecast_period_unit: "MONTH",
    forecast_period_count: 12,
    growth_model: "COMPOUND",
    growth_adjustment_rate: 0,
    demand_buffer_ratio: 0,
    operational_availability_rate: 1,
    robotaxi_available_hours_per_day: 12,
    average_pickup_duration_min: 8,
    average_passenger_trip_duration_min: 30,
    average_turnaround_duration_min: 7,
  },
  businessTarget: {
    business_target_id: "BT-TEST",
    forecast_start_date: "2026-07-19",
    forecast_period_unit: "MONTH",
    forecast_period_count: 12,
    target_end_daily_orders: 200,
    target_order_service_time_utilization_rate: 0.72,
    planning_mode: "MARKET_LED",
  },
  zoneProfile: zone,
  productionProfile: {
    profile_id: "SPP-TEST",
    production_capacity_period_unit: "MONTH",
    production_capacity_per_period: 100,
    delivery_capacity_per_period: 100,
  },
  robotaxis: [],
  zones: context.zones,
}).result;

assert.equal(planning.average_order_fulfillment_execution_duration_min, 38);
assert.equal(planning.vehicle_service_cycle_duration_min, 45);
assert.equal(planning.effective_daily_capacity, zone.effective_daily_capacity, "预测必须消费 Zone 汇总承载，不得自行重算 ServiceArea");
assert.equal(planning.effective_peak_hour_capacity, zone.effective_peak_hour_capacity);
assert.equal("average_trip_duration_min" in planning, false, "新预测结果不得写入旧时长字段");
assert.equal("effective_service_cycle_min" in planning, false, "新预测结果不得写入旧服务周期字段");
assert.ok(planning.calculation_steps.every((step) => calculationModelRegistry[step.calculation_model]), "预测计算过程必须全部引用已登记模型");

for (const field of [
  "average_passenger_trip_duration_min",
  "average_order_fulfillment_execution_duration_min",
  "average_order_end_to_end_duration_min",
  "vehicle_service_cycle_duration_min",
  "average_service_stop_duration_min",
  "effective_daily_pickup_capacity",
  "effective_daily_dropoff_capacity",
  "daily_population_exposure",
  "potential_daily_trips",
  "baseline_addressable_daily_orders",
  "baseline_peak_hour_orders",
  "zone_period_growth_rate",
  "effective_daily_capacity",
  "effective_peak_hour_capacity",
]) {
  assert.ok(getFieldSemanticDefinition(field), `${field} 必须登记统一字段语义`);
  assert.notEqual(getFieldLabel(field), "未登记字段", `${field} 必须由统一字典提供中文名`);
}

assert.equal(getFieldLabel("feasible_supply_quantity"), "预测期可供应数量");
assert.equal(getFieldLabel("daily_contribution_margin"), "预计日运营利润");

console.log("v047.4.1 服务区域、Zone、预测与时长语义合同验证通过");
