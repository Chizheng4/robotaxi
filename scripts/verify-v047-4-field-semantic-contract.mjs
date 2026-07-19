import assert from "node:assert/strict";

import { fieldSemanticRegistry, getMetricConcept, validateFieldSemanticRegistry } from "../src/domain/fieldSemanticRegistry.js";
import { getDisplayValue, getFieldLabel } from "../src/domain/fieldDisplayService.js";
import { initializeDefaultBusinessTargets, normalizeBusinessPlanningDefaults } from "../src/services/businessPlanningService.js";
import { calculateLongTermDemandPlan } from "../src/domain/longTermDemandPlanning.js";
import { createPlanningComparisons } from "../src/services/operatingDataPoolService.js";
import { initializeDefaultMetricDefinitions } from "../src/data/metricCalculator.js";

assert.deepEqual(validateFieldSemanticRegistry(), [], "统一字段语义注册必须完整且可追溯");
assert.equal(getFieldLabel("target_order_service_time_utilization_rate"), "目标订单服务时间利用率");
assert.equal(getFieldLabel("target_order_fulfillment_rate"), "目标订单履约率");
assert.equal(getDisplayValue("BALANCED", "planning_mode"), "平衡规划", "字段专属枚举不得被全局同值枚举污染");
assert.equal(getDisplayValue("BALANCED"), "均衡需求", "其他业务上下文仍保留原有均衡需求语义");
assert.equal(getMetricConcept("ORDER_SERVICE_TIME_UTILIZATION_RATE").target_field, "target_order_service_time_utilization_rate");

const migrated = normalizeBusinessPlanningDefaults({
  businessTargets: [{ business_target_id: "BT-OLD", target_task_utilization_rate: 0.66 }],
}).businessTargets[0];
assert.equal(migrated.target_order_service_time_utilization_rate, 0.66, "旧目标任务利用率必须迁移到明确的新字段");
assert.equal("target_task_utilization_rate" in migrated, false, "迁移后不得继续写出旧字段");

const target = {
  ...initializeDefaultBusinessTargets("2026-07-19T00:00:00.000Z")[0],
  target_end_daily_orders: 100,
};
const planning = calculateLongTermDemandPlan({
  strategy: {
    forecast_strategy_id: "LDF-STR-TEST",
    growth_model: "LINEAR",
    growth_adjustment_rate: 0,
    demand_buffer_ratio: 0,
    operational_availability_rate: 1,
    robotaxi_available_hours_per_day: 12,
    average_pickup_duration_min: 10,
    average_trip_duration_min: 20,
    average_turnaround_duration_min: 0,
  },
  businessTarget: target,
  zoneProfile: {
    profile_id: "DP-Z-TEST",
    target_object_type: "ZONE",
    target_object_id: "Z-001",
    baseline_addressable_daily_orders: 100,
    busiest_hour_share: 0.1,
    zone_period_growth_rate: 0,
    growth_rate_unit: "MONTH",
  },
  productionProfile: {
    profile_id: "SPP-TEST",
    production_capacity_period_unit: "MONTH",
    production_capacity_per_period: 100,
    delivery_capacity_per_period: 100,
  },
  robotaxis: [],
  zones: [{ zone_id: "Z-001" }],
}).result;
assert.equal(planning.target_order_service_time_utilization_rate, 0.72);
assert.equal("target_task_utilization_rate" in planning, false, "新预测结果不得写出旧字段");
assert.match(
  planning.calculation_steps.find((step) => step.output_field === "robotaxi_effective_daily_orders").formula_expression,
  /target_order_service_time_utilization_rate/,
  "预测公式必须引用统一字段",
);

const comparisons = createPlanningComparisons({
  planningBaseline: {
    businessTarget: target,
    targetSourceRefs: [{ object_type: "BusinessTarget", object_id: target.business_target_id }],
    forecastSourceRefs: [],
    supplySourceRefs: [],
  },
  metricRows: [{ metric_definition_id: "OUTCOME-SERVICE-003", metric_value: 0.8 }],
  calculationRun: { window_start_seconds: 0, window_end_seconds: 86400 },
});
const utilizationComparison = comparisons.find((item) => item.performance_indicator_id === "PERFORMANCE-ASSET-002");
assert.equal(utilizationComparison.performance_indicator_name, "订单服务时间利用率");
assert.equal(utilizationComparison.target_value, 0.72);
assert.equal(utilizationComparison.actual_value, null);
assert.equal(utilizationComparison.performance_status, "INSUFFICIENT_DATA", "缺少连续状态事实时不得伪造实际利用率");

const metricDefinitions = initializeDefaultMetricDefinitions();
assert.equal(metricDefinitions.find((item) => item.metric_definition_id === "OUTCOME-SERVICE-003").metric_name_cn, "订单履约率");
assert.equal(metricDefinitions.find((item) => item.metric_definition_id === "PROCESS-ASSET-002").metric_name_cn, "订单服务时间利用率");
assert.equal(fieldSemanticRegistry.target_task_utilization_rate.field_nature, "DEPRECATED_COMPATIBILITY");

console.log("v047.4.0 字段语义、指标血缘和兼容迁移验证通过");
