import assert from "node:assert/strict";
import fs from "node:fs";
import { createDecisionControlView, decisionCapabilityDefinitions, validateDecisionCapabilityDefinitions } from "../src/services/decisionControlService.js";
import { getDisplayValue } from "../src/domain/fieldDisplayService.js";
import { navigationGroups, validateNavigationRegistry } from "../src/ui/navigationRegistry.js";
import { getPageArchitecture } from "../src/ui/pageArchitectureRegistry.js";

const definitionValidation = validateDecisionCapabilityDefinitions();
assert.equal(definitionValidation.valid, true, definitionValidation.errors.join("；"));
assert.equal(decisionCapabilityDefinitions.length, 12, "决策中心应登记十二项决策能力");

const view = createDecisionControlView({
  collections: {
    pricingStrategies: [{ pricing_strategy_id: "PS-001", strategy_name: "标准定价", strategy_status: "ACTIVE" }],
    pricingStrategyRuns: [{ pricing_strategy_run_id: "PR-001", pricing_strategy_id: "PS-001", run_result: "SUCCESS", created_at: "2026-07-16T10:00:00+08:00", completed_at: "2026-07-16T10:00:01+08:00" }],
    pricingDecisions: [{ pricing_decision_id: "PD-001", pricing_strategy_run_id: "PR-001" }],
    orderMatchingStrategies: [{ order_matching_strategy_id: "OMS-001", strategy_name: "标准匹配", strategy_status: "ACTIVE" }],
    orderMatchingRuns: [{ order_matching_run_id: "OMR-001", order_matching_strategy_id: "OMS-001", run_result: "FAILED", failure_reason: "无候选车辆", created_at: "2026-07-16T10:01:00+08:00", completed_at: "2026-07-16T10:01:02+08:00" }],
  },
});
assert.equal(view.summary.run_count, 2);
assert.equal(view.summary.decision_result_count, 1);
assert.equal(view.summary.decision_exception_count, 1);
assert.equal(view.summary.decision_execution_success_rate, 0.5);
assert.equal(view.capabilities.find((item) => item.decision_capability_id === "DYNAMIC_PRICING").decision_result_coverage_rate, 1);

const matchingView = createDecisionControlView({
  collections: {
    orderMatchingStrategies: [{ order_matching_strategy_id: "OMS-001", strategy_name: "标准匹配", strategy_status: "ACTIVE", updated_at: "2026-07-17T09:00:00+08:00" }],
    orderMatchingRuns: [
      { order_matching_run_id: "OMR-101", order_matching_strategy_id: "OMS-001", service_order_id: "SO-001", run_result: "FAILED", failure_reason: "NO_AVAILABLE_ROBOTAXI", created_at: "2026-07-17T10:00:00+08:00" },
      { order_matching_run_id: "OMR-102", order_matching_strategy_id: "OMS-001", service_order_id: "SO-001", run_result: "FAILED", failure_reason: "NO_AVAILABLE_ROBOTAXI", created_at: "2026-07-17T10:00:30+08:00" },
      { order_matching_run_id: "OMR-103", order_matching_strategy_id: "OMS-001", service_order_id: "SO-001", run_result: "SUCCESS", created_at: "2026-07-17T10:01:00+08:00" },
      { order_matching_run_id: "OMR-104", order_matching_strategy_id: "OMS-001", service_order_id: "SO-002", run_result: "FAILED", failure_reason: "BATTERY_NOT_ENOUGH", created_at: "2026-07-17T10:02:00+08:00" },
    ],
    orderMatchingDecisions: [
      { order_matching_decision_id: "OMD-101", order_matching_run_id: "OMR-101", service_order_id: "SO-001", decision_result: "FAILED" },
      { order_matching_decision_id: "OMD-102", order_matching_run_id: "OMR-102", service_order_id: "SO-001", decision_result: "FAILED" },
      { order_matching_decision_id: "OMD-103", order_matching_run_id: "OMR-103", service_order_id: "SO-001", decision_result: "SUCCESS" },
      { order_matching_decision_id: "OMD-104", order_matching_run_id: "OMR-104", service_order_id: "SO-002", decision_result: "FAILED" },
    ],
    serviceOrders: [
      { service_order_id: "SO-001", order_status: "ON_THE_WAY_PICKUP" },
      { service_order_id: "SO-002", order_status: "CANCELLED" },
    ],
  },
});
assert.equal(matchingView.summary.run_count, 4, "必须保留原始策略执行次数");
assert.equal(matchingView.summary.decision_process_count, 2, "四次执行应按两个服务订单聚合为两个决策过程");
assert.equal(matchingView.summary.decision_exception_attempt_count, 3, "必须记录三次异常尝试");
assert.equal(matchingView.summary.decision_exception_count, 2, "必须记录两个异常决策过程");
assert.equal(matchingView.summary.affected_business_object_count, 2, "必须记录两个受影响服务订单");
assert.equal(matchingView.summary.recovered_exception_process_count, 1, "SO-001 必须识别为重试后恢复");
assert.equal(matchingView.summary.unresolved_exception_process_count, 1, "SO-002 必须保留为待处理异常过程");
assert.equal(matchingView.summary.terminal_impact_object_count, 1, "SO-002 必须识别为终局影响");
assert.equal(matchingView.processes.find((item) => item.source_business_object_id === "SO-001")?.business_impact_status, "RECOVERED_AFTER_RETRY");
assert.equal(matchingView.processes.find((item) => item.source_business_object_id === "SO-002")?.exception_category, "RESOURCE_SHORTAGE");
assert.match(matchingView.summary.decision_source_version, /^DC-/);

const resetView = createDecisionControlView({ collections: {} });
assert.equal(resetView.summary.run_count, 0);
assert.equal(resetView.summary.decision_process_count, 0);
assert.equal(resetView.summary.decision_exception_count, 0);
assert.equal(resetView.summary.affected_business_object_count, 0);
const mainSource = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
assert(mainSource.includes("setOrderMatchingRuns([])"), "重置必须清空订单匹配执行");
assert(mainSource.includes("setOrderMatchingDecisions([])"), "重置必须清空订单匹配结果");
assert.equal(getDisplayValue("RESOURCE_SHORTAGE"), "资源不足");
assert.equal(getDisplayValue("UNREGISTERED_INTERNAL_ENUM"), "未登记枚举值", "未登记内部枚举不得透传到前端");

const topLevelKeys = navigationGroups.map((item) => item.key);
assert(topLevelKeys.includes("decisionCenter"), "缺少决策中心一级菜单");
assert(!topLevelKeys.includes("operationsManagement"), "运营管理汇总层仍然存在");
assert(topLevelKeys.includes("supplyDemandDeploymentManagement"), "供需投放未提升为一级菜单");
assert(topLevelKeys.includes("travelServiceManagement"), "出行服务未提升为一级菜单");
assert(topLevelKeys.includes("operationSupportManagement"), "运维支持未提升为一级菜单");
assert.equal(navigationGroups.find((item) => item.key === "decisionCenter")?.children, undefined, "决策中心应是可直接打开的一级叶子页面");
assert.equal(getPageArchitecture("decisionCenter")?.mode, "analysis");
assert.equal(getPageArchitecture("decisionCenter")?.detailMode, "none");

const simulationGroup = navigationGroups.find((item) => item.key === "simulation");
assert.equal(simulationGroup?.children?.[0]?.key, "demandSimulationPolicyGroup", "需求模拟必须位于模拟运行之前");
assert.equal(simulationGroup?.children?.[0]?.label, "需求模拟", "需求模拟菜单名称必须简洁统一");
const planningGroup = navigationGroups.find((item) => item.key === "businessPlanning");
const forecastGroup = planningGroup?.children?.find((item) => item.key === "demandForecastManagement");
assert.equal(forecastGroup?.children?.some((item) => item.key === "longTermDemandForecasts"), false, "预测结果不应继续隐藏在三级菜单");
assert(planningGroup?.children?.some((item) => item.key === "longTermDemandForecasts"), "预测结果必须作为经营规划二级菜单");

const allLeafKeys = [];
const walk = (items) => items.forEach((item) => item.children?.length ? walk(item.children) : allLeafKeys.push(item.key));
walk(navigationGroups);
const navValidation = validateNavigationRegistry(allLeafKeys);
assert.equal(navValidation.valid, true, navValidation.errors.join("；"));

console.log("v045.3.0 决策控制中心合同验证通过");
