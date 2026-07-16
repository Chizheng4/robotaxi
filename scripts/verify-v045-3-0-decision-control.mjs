import assert from "node:assert/strict";
import { createDecisionControlView, decisionCapabilityDefinitions, validateDecisionCapabilityDefinitions } from "../src/services/decisionControlService.js";
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

const allLeafKeys = [];
const walk = (items) => items.forEach((item) => item.children?.length ? walk(item.children) : allLeafKeys.push(item.key));
walk(navigationGroups);
const navValidation = validateNavigationRegistry(allLeafKeys);
assert.equal(navValidation.valid, true, navValidation.errors.join("；"));

console.log("v045.3.0 决策控制中心合同验证通过");
