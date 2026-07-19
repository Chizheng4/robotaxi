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
