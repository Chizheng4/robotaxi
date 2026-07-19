const contracts = new Map();

function register(keys, contract) {
  keys.forEach((key) => {
    if (contracts.has(key)) throw new Error(`页面架构重复登记：${key}`);
    contracts.set(key, { key, ...contract });
  });
}

register(["console"], {
  mode: "map",
  resourceKind: "object",
  detailMode: "contextual",
  actionMode: "contextual",
  eventPanel: null,
});

register(["operatingModel", "decisionCenter"], {
  mode: "analysis",
  resourceKind: "model",
  detailMode: "none",
  actionMode: "none",
  eventPanel: null,
});

register(["supplyPositionTracking"], {
  mode: "analysis",
  resourceKind: "projection",
  detailMode: "none",
  actionMode: "none",
  eventPanel: null,
});

register(["longTermDemandForecasts"], {
  mode: "analysis",
  resourceKind: "result",
  detailMode: "none",
  actionMode: "contextual",
  eventPanel: null,
});

register(["operatingMetricsOverview", "serviceMetrics", "supplyAssetMetrics", "financialMetrics", "processDiagnostics"], {
  mode: "analysis",
  resourceKind: "metric",
  detailMode: "none",
  actionMode: "global",
  eventPanel: null,
});

register([
  "businessTargets", "demandProfiles", "supplyProductionProfiles", "productionFactories", "customers", "ownerSupplies",
  "robotaxis", "opsCenters", "workers", "maps", "cells", "roads", "roadNodes", "roadSegments",
  "places", "serviceAreas", "zones",
], {
  mode: "record",
  resourceKind: "object",
  detailMode: "semantic",
  actionMode: "none",
  eventPanel: null,
});

register([
  "longTermDemandForecastStrategies", "supplyDecisionStrategies", "shortTermDemandForecastStrategies",
  "deploymentDecisionStrategies", "metricDefinitions", "fleetAllocationStrategies",
  "routePlanningStrategies", "demandSimulationStrategies",
  "pricingStrategies", "orderMatchingStrategies", "fleetOperationPolicies",
  "fleetOperationDispatchStrategies", "robotaxiTaskPlanningStrategies", "costParameterRules",
  "costModelProfiles", "simulationPolicies", "workflowTimingRules",
], {
  mode: "record",
  resourceKind: "configuration",
  detailMode: "semantic",
  actionMode: "none",
  eventPanel: null,
});

register([
  "longTermDemandForecastRuns", "supplyDecisionRuns", "shortTermDemandForecastRuns",
  "deploymentDecisionRuns", "fleetAllocationRuns", "routePlanningRuns",
  "demandSimulationRuns", "pricingStrategyRuns", "orderMatchingRuns", "fleetOperationPolicyRuns",
  "fleetOperationDispatchRuns", "robotaxiTaskPlanningRuns", "revenueCalculationRuns",
  "costCalculationRuns", "metricCalculationRuns", "timedOperations",
], {
  mode: "record",
  resourceKind: "execution",
  detailMode: "semantic",
  actionMode: "none",
  eventPanel: null,
});

register([
  "fleetAllocationResults", "shortTermDemandForecastResults", "demandSimulationResults",
  "pricingDecisions", "orderMatchingDecisions", "fleetOperationPolicyResults",
  "fleetOperationDispatchDecisions", "robotaxiTaskPlanningResults", "metricObservations",
  "revenueRecords", "costRecords",
], {
  mode: "record",
  resourceKind: "result",
  detailMode: "semantic",
  actionMode: "none",
  eventPanel: null,
});

register(["routes"], {
  mode: "record",
  resourceKind: "object",
  detailMode: "semantic",
  actionMode: "none",
  eventPanel: null,
});

register([
  "supplyPlans", "productionBatches", "robotaxiDeliveryOrders", "deploymentPlans", "readinessTasks", "routeExecutions",
  "serviceFulfillmentRecords", "deploymentTasks", "serviceOrders", "cleaningTasks", "chargingTasks",
  "maintenanceTasks", "failureHandlingTasks", "retirementTasks", "simulationRuns",
], {
  mode: "record",
  resourceKind: "document",
  detailMode: "semantic",
  actionMode: "row",
  eventPanel: { label: "最近单据事件" },
});

const specializedDetailPages = new Set([
  "businessTargets", "demandProfiles", "supplyProductionProfiles", "longTermDemandForecastStrategies",
  "supplyDecisionStrategies", "shortTermDemandForecastStrategies", "deploymentDecisionStrategies",
  "metricDefinitions", "metricObservations", "metricCalculationRuns", "readinessTasks", "robotaxis",
  "routes", "routeExecutions", "serviceFulfillmentRecords", "deploymentTasks", "serviceOrders",
  "cleaningTasks", "chargingTasks", "maintenanceTasks", "failureHandlingTasks", "retirementTasks",
  "revenueRecords", "costRecords", "costParameterRules", "revenueCalculationRuns", "costCalculationRuns",
  "costModelProfiles", "workers", "simulationRuns", "timedOperations", "simulationPolicies",
]);

const rowActionPages = new Set([
  "businessTargets", "demandProfiles", "supplyProductionProfiles", "longTermDemandForecastStrategies",
  "shortTermDemandForecastStrategies", "deploymentDecisionStrategies",
  "supplyPlans", "productionBatches", "deploymentPlans", "fleetAllocationStrategies", "fleetAllocationResults",
  "robotaxiDeliveryOrders", "readinessTasks", "robotaxis", "routePlanningRuns", "routeExecutions",
  "serviceFulfillmentRecords", "deploymentTasks", "serviceOrders",
  "pricingStrategyRuns", "orderMatchingRuns", "cleaningTasks", "chargingTasks", "maintenanceTasks",
  "failureHandlingTasks", "retirementTasks", "fleetOperationPolicies", "costParameterRules",
  "simulationRuns", "workflowTimingRules",
]);

const eventPanels = Object.freeze({
  longTermDemandForecastStrategies: { label: "最近预测执行" },
  supplyDecisionStrategies: { label: "最近供应决策执行" },
  shortTermDemandForecastStrategies: { label: "最近短期预测执行" },
  deploymentDecisionStrategies: { label: "最近投放决策执行" },
  fleetAllocationStrategies: { label: "最近分配执行" },
  fleetAllocationResults: { label: "最近操作事件" },
  routePlanningStrategies: { label: "最近路径规划执行" },
  demandSimulationStrategies: { label: "最近需求模拟执行" },
  pricingStrategies: { label: "最近定价执行" },
  orderMatchingStrategies: { label: "最近匹配执行" },
  fleetOperationPolicies: { label: "最近运维策略执行" },
  fleetOperationDispatchStrategies: { label: "最近运维调度执行" },
  robotaxiTaskPlanningStrategies: { label: "最近任务规划执行" },
  readinessTasks: { label: "最近任务事件" },
  deploymentTasks: { label: "最近任务事件" },
  cleaningTasks: { label: "最近任务事件" },
  chargingTasks: { label: "最近任务事件" },
  maintenanceTasks: { label: "最近任务事件" },
  failureHandlingTasks: { label: "最近任务事件" },
  retirementTasks: { label: "最近任务事件" },
  routeExecutions: { label: "运营行驶事件" },
  serviceFulfillmentRecords: { label: "履约行驶事件" },
  serviceOrders: { label: "最近订单事件" },
  supplyPlans: { label: "最近单据事件" },
  productionBatches: { label: "最近单据事件" },
  deploymentPlans: { label: "最近单据事件" },
  robotaxiDeliveryOrders: { label: "最近单据事件" },
  simulationRuns: { label: "模拟运行事件" },
});

specializedDetailPages.forEach((key) => contracts.set(key, { ...contracts.get(key), detailMode: "specialized" }));
rowActionPages.forEach((key) => contracts.set(key, { ...contracts.get(key), actionMode: ["pricingStrategyRuns", "orderMatchingRuns", "routePlanningRuns"].includes(key) ? "view" : "row" }));
contracts.set("timedOperations", { ...contracts.get("timedOperations"), actionMode: "global" });
Object.entries(eventPanels).forEach(([key, eventPanel]) => contracts.set(key, { ...contracts.get(key), eventPanel }));

export const pageArchitectureRegistry = Object.freeze(Object.fromEntries(
  [...contracts.entries()].map(([key, contract]) => [key, Object.freeze(contract)]),
));

export function getPageArchitecture(page) {
  return pageArchitectureRegistry[page] || null;
}

export function resolvePagePresentation(page) {
  const contract = getPageArchitecture(page);
  if (!contract) return Object.freeze({ mode: "unknown", usesDetailRail: false, supportsHorizontalContent: false });
  return Object.freeze({
    mode: contract.mode,
    usesDetailRail: contract.detailMode !== "none",
    supportsHorizontalContent: contract.mode !== "map",
  });
}

export function validatePageArchitecture(pageKeys = []) {
  const errors = [];
  const registeredKeys = Object.keys(pageArchitectureRegistry);
  pageKeys.forEach((key) => {
    if (!pageArchitectureRegistry[key]) errors.push(`页面缺少架构合同：${key}`);
  });
  registeredKeys.forEach((key) => {
    if (!pageKeys.includes(key)) errors.push(`架构合同引用未知页面：${key}`);
  });
  registeredKeys.forEach((key) => {
    const contract = pageArchitectureRegistry[key];
    if (!["map", "analysis", "record"].includes(contract.mode)) errors.push(`页面展示类型无效：${key}`);
    if (!contract.resourceKind) errors.push(`页面缺少资源性质：${key}`);
    if (!contract.detailMode) errors.push(`页面缺少详情模式：${key}`);
    if (!contract.actionMode) errors.push(`页面缺少操作模式：${key}`);
  });
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}
