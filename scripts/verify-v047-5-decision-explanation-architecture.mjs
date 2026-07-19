import assert from "node:assert/strict";
import fs from "node:fs";
import {
  decisionCapabilityDefinitions,
  validateDecisionCapabilityDefinitions,
  validateDecisionPageArchitecture,
} from "../src/services/decisionControlService.js";
import {
  DecisionResultArtifactKind,
  resolveCalculationSteps,
  validateCalculationSteps,
} from "../src/domain/decisionExplanationContract.js";
import { calculationModelRegistry } from "../src/domain/calculationModelRegistry.js";
import { valueDictionary } from "../src/domain/fieldDictionary.js";
import { pageArchitectureRegistry } from "../src/ui/pageArchitectureRegistry.js";
import { createSupplyPlanFromForecast } from "../src/services/businessPlanningService.js";

const definitionValidation = validateDecisionCapabilityDefinitions();
assert.equal(definitionValidation.valid, true, definitionValidation.errors.join("；"));
const pageValidation = validateDecisionPageArchitecture(pageArchitectureRegistry);
assert.equal(pageValidation.valid, true, pageValidation.errors.join("；"));
assert.equal(decisionCapabilityDefinitions.length, 12);
assert(decisionCapabilityDefinitions.some((item) => item.resultArtifactKind === DecisionResultArtifactKind.ANALYSIS_RESULT));
assert(decisionCapabilityDefinitions.some((item) => item.resultArtifactKind === DecisionResultArtifactKind.DECISION_RECORD));
assert(decisionCapabilityDefinitions.some((item) => item.resultArtifactKind === DecisionResultArtifactKind.PLAN_DOCUMENT));
assert(decisionCapabilityDefinitions.some((item) => item.resultArtifactKind === DecisionResultArtifactKind.OPERATIONAL_OBJECT));
assert(decisionCapabilityDefinitions.some((item) => item.resultArtifactKind === DecisionResultArtifactKind.SIMULATION_RESULT));
Object.keys(calculationModelRegistry).forEach((modelId) => {
  assert(valueDictionary[modelId], `计算模型必须登记统一中文显示：${modelId}`);
});

["SUPPLY_GAP_COVERAGE", "SUPPLY_SAFETY_CAPACITY", "SUPPLY_REQUIRED_QUANTITY", "SUPPLY_PLAN_QUANTITY"].forEach((modelId) => {
  assert(calculationModelRegistry[modelId], `供应决策计算模型未登记：${modelId}`);
});

const supplyPlanResult = createSupplyPlanFromForecast({
  forecast: {
    forecast_result_id: "LDF-RES-TEST",
    forecast_run_id: "LDF-RUN-TEST",
    business_target_id: "BT-TEST",
    zone_id: "Z-001",
    zone_name: "测试区域",
    robotaxi_gap_quantity: 10,
    feasible_manufacturing_quantity: 12,
    feasible_delivery_quantity: 11,
  },
  supplyProductionProfiles: [{ profile_id: "SPP-TEST", profile_status: "ACTIVE" }],
  supplyDecisionStrategy: {
    supply_decision_strategy_id: "SD-TEST",
    demand_coverage_rate: 1,
    safety_capacity_ratio: 0.1,
  },
  supplyDecisionRunId: "SD-RUN-TEST",
  context: { supplyPlanId: "FPP-TEST", now: "2026-07-19T00:00:00Z" },
});
assert.equal(supplyPlanResult.succeeded, true);
assert.equal(resolveCalculationSteps(supplyPlanResult.supplyPlan).field, "calculation_steps");
assert.deepEqual(validateCalculationSteps(supplyPlanResult.supplyPlan.calculation_steps, { allowEmpty: false }), []);

const legacy = resolveCalculationSteps({ decision_calculation_steps: [{ step_name: "历史步骤" }] });
assert.equal(legacy.field, "decision_calculation_steps", "历史计算字段必须继续可读");

const mainSource = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
assert(mainSource.includes("function CalculationProcessView"), "缺少统一计算过程控件");
assert(mainSource.includes("decisionExplanationContract?.calculationStepFieldAliases?.includes(key)"), "详情字段未统一接入计算过程别名");
assert(mainSource.includes("<CalculationProcessView steps={selected.calculation_steps} mode=\"analysis\" />"), "预测分析页未复用统一计算过程控件");
assert(!mainSource.includes("function DemandProfileCalculationSteps"), "旧画像私有计算过程控件仍然存在");

console.log("v047.5.0 决策可解释架构与统一计算过程合同验证通过");
