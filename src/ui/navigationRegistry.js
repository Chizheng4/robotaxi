const page = (key, label) => Object.freeze({ key, label });
const group = (key, label, children) => Object.freeze({ key, label, children: Object.freeze(children) });

export const navigationGroups = Object.freeze([
  page("console", "运营中控台"),
  group("businessPlanning", "经营规划", [
    page("operatingModel", "经营模型"),
    page("businessTargets", "经营目标"),
    page("demandProfiles", "需求画像"),
    page("supplyProductionProfiles", "生产画像"),
    group("demandForecastManagement", "需求预测", [
      page("longTermDemandForecastStrategies", "预测策略"),
      page("longTermDemandForecastRuns", "预测执行"),
    ]),
    page("longTermDemandForecasts", "预测结果"),
    group("supplyDecisionManagement", "供应决策", [
      page("supplyDecisionStrategies", "决策策略"),
      page("supplyDecisionRuns", "决策执行"),
    ]),
  ]),
  page("decisionCenter", "决策中心"),
  group("businessAnalysis", "经营分析", [
    page("operatingMetricsOverview", "经营总览"),
    page("financialMetrics", "财务表现"),
    page("serviceMetrics", "服务分析"),
    page("processDiagnostics", "过程诊断"),
    group("dataCalculationManagement", "数据计算", [
      page("metricDefinitions", "指标定义"),
      page("metricObservations", "指标观测"),
      page("metricCalculationRuns", "计算记录"),
    ]),
  ]),
  group("customer", "客户管理", [page("customers", "客户列表")]),
  group("supplyManagement", "供应管理", [
    page("supplyPlans", "生产计划"),
    page("productionBatches", "生产批次"),
    group("regionDeliveryManagement", "区域交付", [
      group("fleetAllocationManagement", "交付编排", [
        page("fleetAllocationStrategies", "编排策略"),
        page("fleetAllocationRuns", "编排执行"),
        page("fleetAllocationResults", "编排结果"),
      ]),
      page("robotaxiDeliveryOrders", "交付单"),
    ]),
    page("readinessTasks", "运营准入"),
    page("ownerSupplies", "车主供应"),
  ]),
  group("robotaxi", "Robotaxi", [
    page("robotaxis", "Robotaxi"),
    group("routePlanningManagement", "路径规划", [
      page("routePlanningStrategies", "路径规划策略"),
      page("routePlanningRuns", "路径规划执行"),
      page("routes", "路径规划结果"),
    ]),
    page("routeExecutions", "运营行驶"),
    page("serviceFulfillmentRecords", "履约行驶"),
  ]),
  group("supplyDemandDeploymentManagement", "供需投放", [
      group("shortTermDemandForecastManagement", "短期预测", [
        page("shortTermDemandForecastStrategies", "预测策略"),
        page("shortTermDemandForecastRuns", "预测执行"),
        page("shortTermDemandForecastResults", "预测结果"),
      ]),
      group("deploymentDecisionManagement", "投放决策", [
        page("deploymentDecisionStrategies", "决策策略"),
        page("deploymentDecisionRuns", "决策执行"),
      ]),
      page("deploymentPlans", "投放计划"),
      page("deploymentTasks", "投放任务"),
    ]),
  group("travelServiceManagement", "出行服务", [
      page("serviceOrders", "服务订单"),
      group("pricingPolicyGroup", "动态定价策略", [
        page("pricingStrategies", "定价策略配置"),
        page("pricingStrategyRuns", "定价策略执行"),
        page("pricingDecisions", "定价策略结果"),
      ]),
      group("orderMatchingPolicyGroup", "订单匹配策略", [
        page("orderMatchingStrategies", "匹配策略配置"),
        page("orderMatchingRuns", "匹配策略执行"),
        page("orderMatchingDecisions", "匹配策略结果"),
      ]),
    ]),
  group("operationSupportManagement", "运维支持", [
      page("cleaningTasks", "清洁任务"),
      page("chargingTasks", "充电任务"),
      page("maintenanceTasks", "维修任务"),
      page("failureHandlingTasks", "故障处理"),
      page("retirementTasks", "退役任务"),
      group("fleetOperationPolicyGroup", "运维策略管理", [
        page("fleetOperationPolicies", "运维策略配置"),
        page("fleetOperationPolicyRuns", "运维策略执行"),
        page("fleetOperationPolicyResults", "运维策略结果"),
      ]),
      group("fleetOperationDispatchPolicyGroup", "运维调度策略", [
        page("fleetOperationDispatchStrategies", "调度策略配置"),
        page("fleetOperationDispatchRuns", "调度策略执行"),
        page("fleetOperationDispatchDecisions", "调度策略结果"),
      ]),
      group("robotaxiTaskPlanningPolicyGroup", "任务规划策略", [
        page("robotaxiTaskPlanningStrategies", "规划策略配置"),
        page("robotaxiTaskPlanningRuns", "规划策略执行"),
        page("robotaxiTaskPlanningResults", "规划策略结果"),
      ]),
    ]),
  group("financialManagement", "财务管理", [
    page("revenueRecords", "收入记录"),
    page("costRecords", "成本记录"),
    page("costParameterRules", "成本配置"),
    page("revenueCalculationRuns", "收入生成记录"),
    page("costCalculationRuns", "成本计算记录"),
    page("costModelProfiles", "成本模型配置"),
  ]),
  group("operationOrganization", "运营组织", [
    page("opsCenters", "运营中心"),
    page("workers", "作业人员"),
  ]),
  group("space", "地图空间", [
    page("maps", "地图管理"),
    page("cells", "网格单元"),
    page("roads", "道路管理"),
    page("roadNodes", "道路节点"),
    page("roadSegments", "道路片段"),
    page("places", "地点管理"),
    page("serviceAreas", "服务区域"),
    page("zones", "Zone 管理"),
  ]),
  group("simulation", "运营模拟", [
    group("demandSimulationPolicyGroup", "需求模拟", [
      page("demandSimulationStrategies", "策略配置"),
      page("demandSimulationRuns", "策略执行"),
      page("demandSimulationResults", "策略结果"),
    ]),
    page("simulationRuns", "模拟运行"),
    page("timedOperations", "时间作业"),
    group("simulationConfigManagement", "配置管理", [
      page("simulationPolicies", "模拟规则"),
      page("workflowTimingRules", "工作流时效"),
    ]),
  ]),
]);

export const navigationIcons = Object.freeze({
  console: "⌁",
  businessPlanning: "◇",
  decisionCenter: "◎",
  businessAnalysis: "◫",
  customer: "○",
  supplyManagement: "⇧",
  robotaxi: "R",
  supplyDemandDeploymentManagement: "↔",
  travelServiceManagement: "◉",
  operationSupportManagement: "⊕",
  financialManagement: "¥",
  operationOrganization: "⊙",
  space: "⌖",
  simulation: "▷",
});

export function findNavigationPath(pageKey, groups = navigationGroups) {
  const walk = (items, path = []) => {
    for (const item of items || []) {
      const nextPath = [...path, item];
      if (item.key === pageKey) return nextPath;
      const childPath = walk(item.children, nextPath);
      if (childPath) return childPath;
    }
    return null;
  };
  return walk(groups) || [];
}

export function getNavigationLabel(pageKey) {
  const path = findNavigationPath(pageKey);
  return path.at(-1)?.label || null;
}

export function getNavigationOpenKeys(pageKey) {
  return findNavigationPath(pageKey).slice(0, -1).map((item) => item.key);
}

export function getNavigationRootKey(pageKey) {
  return findNavigationPath(pageKey)[0]?.key || pageKey;
}

export function validateNavigationRegistry(renderablePageKeys = []) {
  const seenKeys = new Set();
  const leafKeys = new Set();
  const errors = [];
  const visit = (items) => (items || []).forEach((item) => {
    if (!item.key || !item.label) errors.push("导航节点必须包含编号和中文名称");
    if (seenKeys.has(item.key)) errors.push(`导航编号重复：${item.key}`);
    seenKeys.add(item.key);
    if (item.children?.length) visit(item.children);
    else leafKeys.add(item.key);
  });
  visit(navigationGroups);
  const knownPageKeys = new Set(renderablePageKeys);
  leafKeys.forEach((key) => {
    if (key !== "console" && !knownPageKeys.has(key)) errors.push(`导航引用未知页面：${key}`);
  });
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), leafKeys: Object.freeze([...leafKeys]) });
}
