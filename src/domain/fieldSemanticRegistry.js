const defineField = (key, definition) => Object.freeze({ key, ...definition });

export const metricConceptRegistry = Object.freeze({
  ORDER_FULFILLMENT_RATE: Object.freeze({
    concept_id: "ORDER_FULFILLMENT_RATE",
    label: "订单履约率",
    definition: "统计周期内已完成服务订单占已进入终态服务订单的比例；执行中订单不进入分母。",
    target_field: "target_order_fulfillment_rate",
    actual_metric_id: "OUTCOME-SERVICE-003",
  }),
  ORDER_SERVICE_TIME_UTILIZATION_RATE: Object.freeze({
    concept_id: "ORDER_SERVICE_TIME_UTILIZATION_RATE",
    label: "订单服务时间利用率",
    definition: "Robotaxi 可运营时间中用于接驾和载客履约的时间比例，不包含空闲、停车、运维和投放任务时间。",
    target_field: "target_order_service_time_utilization_rate",
    actual_metric_id: "PROCESS-ASSET-002",
  }),
  EMPTY_DISTANCE_SHARE: Object.freeze({
    concept_id: "EMPTY_DISTANCE_SHARE",
    label: "空驶里程占比",
    definition: "未承载客户履约的运营行驶里程占全部行驶里程的比例。",
    target_field: null,
    actual_metric_id: "PROCESS-ASSET-003",
  }),
  PASSENGER_TRIP_DURATION: Object.freeze({
    concept_id: "PASSENGER_TRIP_DURATION",
    label: "载客行驶时长",
    definition: "乘客上车至 Robotaxi 到达下车点的行驶时长。",
    target_field: "average_passenger_trip_duration_min",
    actual_metric_id: null,
  }),
  ORDER_FULFILLMENT_EXECUTION_DURATION: Object.freeze({
    concept_id: "ORDER_FULFILLMENT_EXECUTION_DURATION",
    label: "订单履约执行时长",
    definition: "Robotaxi 接受订单后，从接驾开始至送达完成的执行时长。",
    target_field: "average_order_fulfillment_execution_duration_min",
    actual_metric_id: "PROCESS-EFF-002",
  }),
  ORDER_END_TO_END_DURATION: Object.freeze({
    concept_id: "ORDER_END_TO_END_DURATION",
    label: "订单全流程时长",
    definition: "订单创建至订单完成的全部时长，包含等待匹配、接驾和载客送达。",
    target_field: "average_order_end_to_end_duration_min",
    actual_metric_id: null,
  }),
  VEHICLE_SERVICE_CYCLE_DURATION: Object.freeze({
    concept_id: "VEHICLE_SERVICE_CYCLE_DURATION",
    label: "车辆服务周期时长",
    definition: "Robotaxi 开始接驾至送达后周转完成的车辆占用周期，用于计算单车服务产能。",
    target_field: "vehicle_service_cycle_duration_min",
    actual_metric_id: null,
  }),
});

export const fieldSemanticRegistry = Object.freeze({
  target_order_fulfillment_rate: defineField("target_order_fulfillment_rate", {
    label: "目标订单履约率",
    owner_object: "BusinessTarget",
    field_nature: "CONFIGURATION",
    data_type: "ratio",
    unit: "PERCENT",
    definition: "规划期希望达到的订单履约率目标，分母为已进入终态的服务订单。",
    metric_concept_id: "ORDER_FULFILLMENT_RATE",
  }),
  target_order_service_time_utilization_rate: defineField("target_order_service_time_utilization_rate", {
    label: "目标订单服务时间利用率",
    owner_object: "BusinessTarget",
    field_nature: "CONFIGURATION",
    data_type: "ratio",
    unit: "PERCENT",
    definition: "规划期内 Robotaxi 可运营时间用于接驾和载客履约的目标比例。",
    metric_concept_id: "ORDER_SERVICE_TIME_UTILIZATION_RATE",
    replaces: Object.freeze(["target_task_utilization_rate"]),
  }),
  target_task_utilization_rate: defineField("target_task_utilization_rate", {
    label: "目标任务利用率（兼容）",
    owner_object: "BusinessTarget",
    field_nature: "DEPRECATED_COMPATIBILITY",
    data_type: "ratio",
    unit: "PERCENT",
    definition: "历史兼容字段；新数据统一使用目标订单服务时间利用率。",
    replaced_by: "target_order_service_time_utilization_rate",
  }),
  planning_mode: defineField("planning_mode", {
    label: "规划模式",
    owner_object: "BusinessTarget",
    field_nature: "CONFIGURATION",
    data_type: "enum",
    unit: null,
    definition: "经营目标与市场预测存在差异时，确定计划承接日订单采用的选择规则。",
    enum_values: Object.freeze({
      MARKET_LED: "市场导向",
      TARGET_LED: "目标导向",
      BALANCED: "平衡规划",
    }),
  }),
  average_pickup_duration_min: defineField("average_pickup_duration_min", {
    label: "平均接驾时长（分钟）",
    owner_object: "LongTermDemandForecastStrategy",
    field_nature: "CONFIGURATION",
    data_type: "number",
    unit: "MINUTE",
    definition: "Robotaxi 接受订单后，从开始接驾至乘客上车的平均时长。",
  }),
  average_passenger_trip_duration_min: defineField("average_passenger_trip_duration_min", {
    label: "平均载客行驶时长（分钟）",
    owner_object: "LongTermDemandForecastStrategy",
    field_nature: "CONFIGURATION",
    data_type: "number",
    unit: "MINUTE",
    definition: "乘客上车至 Robotaxi 到达下车点的平均行驶时长。",
    metric_concept_id: "PASSENGER_TRIP_DURATION",
    replaces: Object.freeze(["average_trip_duration_min"]),
  }),
  average_order_fulfillment_execution_duration_min: defineField("average_order_fulfillment_execution_duration_min", {
    label: "平均订单履约执行时长（分钟）",
    owner_object: "LongTermDemandForecastResult",
    field_nature: "CALCULATED",
    data_type: "number",
    unit: "MINUTE",
    definition: "Robotaxi 接受订单至送达完成的平均时长，等于平均接驾时长与平均载客行驶时长之和。",
    metric_concept_id: "ORDER_FULFILLMENT_EXECUTION_DURATION",
  }),
  average_order_end_to_end_duration_min: defineField("average_order_end_to_end_duration_min", {
    label: "平均订单全流程时长（分钟）",
    owner_object: "OperatingMetric",
    field_nature: "CALCULATED",
    data_type: "number",
    unit: "MINUTE",
    definition: "订单创建至订单完成的平均时长，包含等待匹配；缺少完整事件时间戳时不得推算。",
    metric_concept_id: "ORDER_END_TO_END_DURATION",
  }),
  average_turnaround_duration_min: defineField("average_turnaround_duration_min", {
    label: "平均周转时长（分钟）",
    owner_object: "LongTermDemandForecastStrategy",
    field_nature: "CONFIGURATION",
    data_type: "number",
    unit: "MINUTE",
    definition: "订单送达完成后至 Robotaxi 可开始下一次接驾的平均准备时长。",
  }),
  vehicle_service_cycle_duration_min: defineField("vehicle_service_cycle_duration_min", {
    label: "车辆服务周期时长（分钟）",
    owner_object: "LongTermDemandForecastResult",
    field_nature: "CALCULATED",
    data_type: "number",
    unit: "MINUTE",
    definition: "平均接驾时长、平均载客行驶时长与平均周转时长之和，用于计算单车服务产能。",
    metric_concept_id: "VEHICLE_SERVICE_CYCLE_DURATION",
    replaces: Object.freeze(["effective_service_cycle_min"]),
  }),
  average_service_stop_duration_min: defineField("average_service_stop_duration_min", {
    label: "平均站点停靠时长（分钟）",
    owner_object: "ServiceAreaDemandProfile",
    field_nature: "CONFIGURATION",
    data_type: "number",
    unit: "MINUTE",
    definition: "一辆 Robotaxi 在服务区域完成一次上车或下车停靠平均占用的位置时间。",
    replaces: Object.freeze(["average_service_time_min"]),
  }),
  effective_pickup_capacity_per_hour: defineField("effective_pickup_capacity_per_hour", {
    label: "有效上车承载（订单/小时）",
    owner_object: "DemandProfile",
    field_nature: "CALCULATED",
    data_type: "number",
    unit: "ORDER_PER_HOUR",
    definition: "服务区域每小时可完成的有效上车订单数；Zone 为所属服务区域之和。",
  }),
  effective_dropoff_capacity_per_hour: defineField("effective_dropoff_capacity_per_hour", {
    label: "有效下车承载（订单/小时）",
    owner_object: "DemandProfile",
    field_nature: "CALCULATED",
    data_type: "number",
    unit: "ORDER_PER_HOUR",
    definition: "服务区域每小时可完成的有效下车订单数；Zone 为所属服务区域之和。",
  }),
  effective_daily_pickup_capacity: defineField("effective_daily_pickup_capacity", {
    label: "有效日上车承载（订单）",
    owner_object: "DemandProfile",
    field_nature: "CALCULATED",
    data_type: "number",
    unit: "ORDER_PER_DAY",
    definition: "服务区域或 Zone 每日可完成的上车订单数。",
  }),
  effective_daily_dropoff_capacity: defineField("effective_daily_dropoff_capacity", {
    label: "有效日下车承载（订单）",
    owner_object: "DemandProfile",
    field_nature: "CALCULATED",
    data_type: "number",
    unit: "ORDER_PER_DAY",
    definition: "服务区域或 Zone 每日可完成的下车订单数。",
  }),
  daily_population_exposure: defineField("daily_population_exposure", {
    label: "日有效人群",
    owner_object: "PlaceDemandProfile",
    field_nature: "CALCULATED",
    data_type: "number",
    unit: "PERSON_PER_DAY",
    definition: "Place 常住人口、工作人口和日访客量分别按出行权重折算后的日需求人群基数。",
  }),
  potential_daily_trips: defineField("potential_daily_trips", {
    label: "潜在日出行量",
    owner_object: "PlaceDemandProfile",
    field_nature: "CALCULATED",
    data_type: "number",
    unit: "TRIP_PER_DAY",
    definition: "Place 日有效人群经出行产生率和地点需求权重修正后的潜在日出行次数。",
  }),
  baseline_addressable_daily_orders: defineField("baseline_addressable_daily_orders", {
    label: "当前可争取日订单",
    owner_object: "DemandProfile",
    field_nature: "CALCULATED",
    data_type: "number",
    unit: "ORDER_PER_DAY",
    definition: "Place 基于人口、出行产生率和采用率计算的当前可争取日订单；Zone 为所属 Place 的汇总值。服务区域不生成该字段。",
  }),
  baseline_peak_hour_orders: defineField("baseline_peak_hour_orders", {
    label: "当前峰值小时订单",
    owner_object: "DemandProfile",
    field_nature: "CALCULATED",
    data_type: "number",
    unit: "ORDER_PER_HOUR",
    definition: "Place 当前可争取日订单按高峰时段分布计算的峰值小时订单；Zone 为所属 Place 的汇总值。服务区域不生成该字段。",
  }),
  zone_period_growth_rate: defineField("zone_period_growth_rate", {
    label: "区域周期增长率",
    owner_object: "ZoneDemandProfile",
    field_nature: "CALCULATED",
    data_type: "ratio",
    unit: "PERCENT",
    definition: "Zone 所属 Place 周期增长率按各 Place 当前可争取日订单加权汇总的增长率。",
  }),
  effective_daily_capacity: defineField("effective_daily_capacity", {
    label: "区域有效日承载（订单）",
    owner_object: "ZoneDemandProfile",
    field_nature: "CALCULATED",
    data_type: "number",
    unit: "ORDER_PER_DAY",
    definition: "Zone 所属服务区域日上车承载总量与日下车承载总量中的较小值，用于识别区域日服务瓶颈。",
  }),
  effective_peak_hour_capacity: defineField("effective_peak_hour_capacity", {
    label: "区域有效峰值承载（订单/小时）",
    owner_object: "ZoneDemandProfile",
    field_nature: "CALCULATED",
    data_type: "number",
    unit: "ORDER_PER_HOUR",
    definition: "Zone 所属服务区域小时上车承载总量与小时下车承载总量中的较小值，用于识别区域峰值服务瓶颈。",
  }),
  feasible_supply_quantity: defineField("feasible_supply_quantity", {
    label: "预测期可供应数量",
    owner_object: "LongTermDemandForecastResult",
    field_nature: "CALCULATED",
    data_type: "number",
    unit: "ROBOTAXI",
    definition: "预测期内同时满足生产完成、质量检验通过和交付能力约束的 Robotaxi 数量。",
  }),
  daily_contribution_margin: defineField("daily_contribution_margin", {
    label: "预计日运营利润",
    owner_object: "LongTermDemandForecastResult",
    field_nature: "CALCULATED",
    data_type: "number",
    unit: "CNY_PER_DAY",
    definition: "计划承接订单的日贡献毛利扣除已建模日固定运营成本后的预计金额，不包含尚未进入模型的成本。",
  }),
});

export function getFieldSemanticDefinition(field) {
  return fieldSemanticRegistry[field] || null;
}

export function getMetricConcept(conceptId) {
  return metricConceptRegistry[conceptId] || null;
}

export function getMetricConceptByTargetField(field) {
  const definition = getFieldSemanticDefinition(field);
  return definition?.metric_concept_id ? getMetricConcept(definition.metric_concept_id) : null;
}

export function createCanonicalFieldLabelMap() {
  return Object.fromEntries(Object.entries(fieldSemanticRegistry).map(([key, definition]) => [key, definition.label]));
}

export function createCanonicalFieldValueMap() {
  return Object.fromEntries(
    Object.entries(fieldSemanticRegistry)
      .filter(([, definition]) => definition.enum_values)
      .map(([key, definition]) => [key, definition.enum_values]),
  );
}

export function validateFieldSemanticRegistry() {
  const errors = [];
  Object.entries(fieldSemanticRegistry).forEach(([key, definition]) => {
    if (definition.key !== key) errors.push(`${key}:KEY_MISMATCH`);
    ["label", "owner_object", "field_nature", "data_type", "definition"].forEach((field) => {
      if (!definition[field]) errors.push(`${key}:MISSING_${field.toUpperCase()}`);
    });
    if (definition.metric_concept_id && !metricConceptRegistry[definition.metric_concept_id]) {
      errors.push(`${key}:UNKNOWN_METRIC_CONCEPT`);
    }
  });
  return Object.freeze(errors);
}
