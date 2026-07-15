export const metricObjectSchemas = Object.freeze({
  metricDefinition: {
    tabs: [
      { key: "basic", label: "基础定义", fields: ["metric_definition_id", "metric_name_cn", "metric_layer", "metric_domain", "metric_status", "definition_version"] },
      { key: "business", label: "业务口径", fields: ["business_definition", "display_unit", "higher_is_better"] },
      { key: "calculation", label: "计算逻辑", fields: ["calculation_formula", "source_objects", "source_fields", "time_basis", "default_time_window", "supported_dimensions"] },
      { key: "quality", label: "质量规则", fields: ["zero_denominator_rule", "data_readiness"] },
    ],
    explanations: {
      business_definition: "说明指标回答的经营问题，是理解指标含义的唯一业务口径。",
      calculation_formula: "说明指标如何由来源字段计算，公式使用统一字段字典中的正式字段。",
      source_objects: "参与计算的业务单据、业务对象或经营事实对象。",
      source_fields: "从来源对象读取的正式字段，字段中文名由统一字段字典提供。",
      time_basis: "决定计算按真实时间还是模拟世界时间归集；当前经营指标使用模拟世界时间。",
      default_time_window: "未指定统计周期时采用的默认时间范围。",
      supported_dimensions: "指标可按哪些业务维度拆分观察，例如模拟运行、区域或服务区域。",
      zero_denominator_rule: "分母为零时不伪造数值，按规则返回空值并给出质量原因。",
      data_readiness: "表示来源数据是否可直接计算、可推导或仍缺少必要数据。",
      higher_is_better: "用于趋势和偏差解释；并非所有指标都是数值越高越好。",
    },
  },
  metricObservation: {
    tabs: [
      { key: "result", label: "指标结果", fields: ["metric_observation_id", "metric_definition_id", "metric_value", "metric_unit", "quality_status", "quality_reason"] },
      { key: "period", label: "周期与维度", fields: ["metric_scope_type", "metric_period_type", "metric_period_label", "window_type", "window_start_seconds", "window_end_seconds", "window_label", "dimension_type", "dimension_id"] },
      { key: "calculation", label: "计算依据", fields: ["numerator_value", "denominator_value", "source_record_count"] },
      { key: "source", label: "来源记录", fields: ["metric_calculation_run_id", "simulation_run_ids", "simulation_timeline_id", "source_object_refs", "created_at"] },
    ],
    explanations: {
      metric_value: "当前统计周期和维度下按指标定义计算得到的正式结果。",
      quality_status: "说明该结果是否可直接使用，存在提示时应结合质量说明判断。",
      quality_reason: "解释指标通过、提示或失败的具体数据原因。",
      metric_period_label: "面向用户显示本次指标覆盖的真实统计范围。",
      numerator_value: "比例或均值指标计算时使用的分子；不适用时为空。",
      denominator_value: "比例或均值指标计算时使用的分母；为零时指标不伪造结果。",
      source_record_count: "本次结果实际使用的来源记录数量。",
      source_object_refs: "支持从指标结果追溯到业务事实的来源对象引用。",
    },
  },
  metricCalculationRun: {
    tabs: [
      { key: "summary", label: "执行摘要", fields: ["metric_calculation_run_id", "calculation_status", "calculation_progress_percent", "calculation_issue_summary", "recommended_action"] },
      { key: "result", label: "结果范围", fields: ["metric_definition_count", "successful_metric_count", "warning_metric_count", "failed_metric_count", "generated_metric_observation_count", "error_count"] },
      { key: "issues", label: "问题处理", fields: ["affected_metric_ids", "metric_issue_details"] },
      { key: "scope", label: "统计范围", fields: ["metric_scope_type", "metric_period_type", "metric_period_label", "simulation_run_ids", "simulation_timeline_id", "algorithm_version"] },
      { key: "time", label: "执行时间", fields: ["started_at", "completed_at"] },
    ],
    explanations: {
      calculation_status: "成功表示全部指标可用；部分成功表示仍有可用结果，但部分指标需要处理；失败表示本次没有形成可用结果。",
      calculation_issue_summary: "用一句话说明受影响范围，帮助先判断结果是否仍可使用。",
      recommended_action: "根据问题类型给出下一步处理建议，不要求用户自行解析内部错误。",
      successful_metric_count: "本次可直接用于经营分析的唯一指标数量。",
      warning_metric_count: "已形成结果但存在数据质量提示的唯一指标数量。",
      failed_metric_count: "因缺少必要数据或计算异常而未形成可用结果的唯一指标数量。",
      affected_metric_ids: "存在提示或失败的指标编号，用于快速定位对应指标定义。",
      metric_issue_details: "逐项说明问题级别、原因和建议动作，且只记录本次计算自身的问题。",
      metric_period_label: "本次经营数据更新实际覆盖的统计周期。",
      algorithm_version: "用于确认本次结果采用的计算规则版本。",
    },
  },
});

const SOURCE_OBJECT_LABELS = Object.freeze({
  CostRecord: "成本记录",
  RevenueRecord: "收入记录",
  ServiceOrder: "服务订单",
  Trip: "履约行驶记录",
  RouteExecution: "运营行驶记录",
  RoutePlanningRun: "路径规划执行",
  OrderMatchingDecision: "订单匹配结果",
  Robotaxi: "Robotaxi",
  ReadinessTask: "运营准入任务",
  DeploymentTask: "运营投放任务",
  CleaningTask: "清洁任务",
  ChargingTask: "充电任务",
  MaintenanceTask: "维修任务",
});

export function getMetricSourceObjectLabel(value) {
  return SOURCE_OBJECT_LABELS[value] || "业务事实对象";
}
