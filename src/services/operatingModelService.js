export const OperatingModelStatus = Object.freeze({ ACTIVE: "ACTIVE", ARCHIVED: "ARCHIVED" });

const objectTypeLabels = Object.freeze({
  BusinessTarget: "经营目标",
  DemandProfile: "需求画像",
  SupplyProductionProfile: "生产画像",
  LongTermDemandForecastResult: "需求预测结果",
  SupplyPlan: "生产计划",
  ProductionBatch: "生产批次",
  RobotaxiDeliveryOrder: "区域交付单",
  ServiceOrder: "服务订单",
  Trip: "履约行驶记录",
  OrderMatchingDecision: "订单匹配结果",
  Robotaxi: "Robotaxi",
  RouteExecution: "运营行驶记录",
  RevenueRecord: "收入记录",
  CostRecord: "成本记录",
  MetricObservation: "指标观测",
  StrategyRun: "策略执行",
  StrategyResult: "策略结果",
});

export const operatingModelDefinition = Object.freeze({
  operating_model_id: "OM-001",
  operating_model_name: "Robotaxi 经营模型",
  operating_model_status: OperatingModelStatus.ACTIVE,
  operating_model_version: "2.0.0",
  model_description: "统一解释规划、决策、需求、供应、服务、资产、财务与经营反馈之间的关系。",
  model_domains: Object.freeze([
    domain("DEMAND", "需求", "市场需要多少出行服务", ["BusinessTarget", "DemandProfile"], ["ServiceOrder"], ["DEMAND-TREND-001", "OUTCOME-SERVICE-001"]),
    domain("SUPPLY", "供应", "需要形成多少 Robotaxi，生产、交付和准入是否按计划完成", ["SupplyProductionProfile", "LongTermDemandForecastResult"], ["SupplyPlan", "ProductionBatch", "RobotaxiDeliveryOrder"], ["PROCESS-SUPPLY-001", "PROCESS-SUPPLY-002", "PROCESS-SUPPLY-003"]),
    domain("DECISION", "决策控制", "策略是否可靠执行并改善经营表现", ["BusinessTarget"], ["StrategyRun", "StrategyResult"], ["PROCESS-DECISION-002", "PROCESS-DECISION-003", "PROCESS-DECISION-004"]),
    domain("SERVICE", "服务", "现有供应能否稳定完成需求", ["BusinessTarget"], ["ServiceOrder", "Trip", "OrderMatchingDecision"], ["OUTCOME-SERVICE-003", "PROCESS-EFF-001", "PROCESS-EFF-002"]),
    domain("ASSET", "资产", "Robotaxi 是否可用并被有效使用", ["BusinessTarget", "LongTermDemandForecastResult"], ["Robotaxi", "RouteExecution"], ["STATE-ASSET-002", "PROCESS-ASSET-003", "PROCESS-ASSET-004"]),
    domain("FINANCE", "财务", "经营是否形成可持续收益", ["BusinessTarget"], ["RevenueRecord", "CostRecord"], ["OUTCOME-FIN-002", "OUTCOME-FIN-005", "OUTCOME-FIN-010"]),
    domain("FEEDBACK", "经营反馈", "实际结果与预测和目标存在什么差异", ["BusinessTarget", "LongTermDemandForecastResult"], ["MetricObservation"], ["PERFORMANCE-DEMAND-001", "PERFORMANCE-SERVICE-001", "PERFORMANCE-FINANCE-001"]),
  ]),
  model_relations: Object.freeze([
    relation("DEMAND", "SUPPLY", "需求预测形成供应规模与节奏"),
    relation("SUPPLY", "SERVICE", "可用供应承接订单与履约"),
    relation("SERVICE", "ASSET", "履约过程形成资产使用事实"),
    relation("SERVICE", "FINANCE", "服务完成形成收入与运营成本"),
    relation("ASSET", "FINANCE", "资产使用形成能耗、运维和折旧成本"),
    relation("DECISION", "SERVICE", "策略控制匹配、路径、定价和运维执行"),
    relation("FINANCE", "FEEDBACK", "经营结果进入目标和预测偏差分析"),
    relation("FEEDBACK", "DECISION", "经营偏差支持策略调整和异常治理"),
    relation("FEEDBACK", "DEMAND", "偏差反馈支持下一轮目标和模型调整"),
  ]),
  updated_at: "2026-07-17T00:00:00+08:00",
});

export function getOperatingModelDefinition() {
  return operatingModelDefinition;
}

export function getModelObjectTypeLabel(objectType) {
  return objectTypeLabels[objectType] || "业务对象";
}

export function validateOperatingModelDefinition(model = operatingModelDefinition) {
  const domainIds = new Set((model.model_domains || []).map((item) => item.model_domain_id));
  const errors = [];
  if (!model.operating_model_id || !model.operating_model_version) errors.push("经营模型缺少编号或版本");
  if (domainIds.size !== (model.model_domains || []).length) errors.push("经营模型域编号重复");
  (model.model_relations || []).forEach((item) => {
    if (!domainIds.has(item.source_model_domain_id) || !domainIds.has(item.target_model_domain_id)) {
      errors.push(`经营模型关系引用不存在的模型域：${item.model_relation_id}`);
    }
  });
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

function domain(id, name, question, planningInputs, factSources, metricDefinitionIds) {
  return Object.freeze({
    model_domain_id: id,
    model_domain_name: name,
    management_question: question,
    planning_input_types: Object.freeze(planningInputs),
    fact_source_types: Object.freeze(factSources),
    metric_definition_ids: Object.freeze(metricDefinitionIds),
  });
}

function relation(source, target, description) {
  return Object.freeze({
    model_relation_id: `${source}-${target}`,
    source_model_domain_id: source,
    target_model_domain_id: target,
    relation_description: description,
  });
}
