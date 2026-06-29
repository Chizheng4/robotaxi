import fs from "node:fs";
import assert from "node:assert/strict";
import { initializeDefaultWorkflowTimingProfile } from "../src/data/businessTimingCalculator.js";
import { resolveTimingRuleDuration } from "../src/data/workflowRuntimeConfig.js";

const businessActionSource = fs.readFileSync("src/services/businessActionService.js", "utf8");
const runtimeRuleSource = fs.readFileSync("src/data/workflowRuntimeConfig.js", "utf8");
const fieldDictionaryDoc = fs.readFileSync("doc/rules/field-dictionary.md", "utf8");
const architectureRules = fs.readFileSync("doc/rules/07-simulation-runtime-architecture-rules.md", "utf8");

const profile = initializeDefaultWorkflowTimingProfile();

const readinessAssign = resolveTimingRuleDuration({
  workflowTimingProfile: profile,
  objectType: "readinessTask",
  fromState: "WAITING_ASSIGNMENT",
  actionType: "READINESS_TASK_ASSIGN",
  fallbackSeconds: 0,
});
assert.equal(readinessAssign.durationSeconds, 3, "准入任务分配必须使用工作流时效配置的 3 秒");
assert.ok(readinessAssign.rule?.workflow_timing_rule_id, "时效解析必须返回规则编号");

const routeMove = resolveTimingRuleDuration({
  workflowTimingProfile: profile,
  objectType: "routeExecution",
  fromState: "MOVING",
  actionType: "ROUTE_EXECUTION_STEP",
  fallbackSeconds: 0,
  movementStepCount: 7,
});
assert.equal(routeMove.durationSeconds, 28, "行驶状态边必须按 seconds_per_cell * movementStepCount 计算耗时");
assert.equal(routeMove.secondsPerCell, 4, "行驶状态边必须返回单 Cell 时长");

assert.match(
  runtimeRuleSource,
  /export function resolveTimingRuleDuration/,
  "工作流时效运行时必须提供规则级解析结果",
);
assert.match(
  businessActionSource,
  /resolveLifecycleTiming\(\{ runtime, objectType, previousStatus, actionType, durationSeconds, movementStepCount, secondsPerCell \}\)/,
  "业务状态时间线入口必须集中解析生命周期耗时",
);
assert.match(
  businessActionSource,
  /workflow_timing_rule_id: timing\.workflowTimingRuleId/,
  "状态时间线必须沉淀命中的工作流时效规则编号",
);
assert.match(
  businessActionSource,
  /formatSimulationTimestamp\(Math\.max\(0, currentSeconds - normalizedDuration\)\)/,
  "状态时间线动作开始时间必须由状态变更时间反推配置耗时",
);
assert.match(
  businessActionSource,
  /actionType: "ROUTE_EXECUTION_STEP"/,
  "运营行驶记录行驶完成必须对齐工作流时效动作 ROUTE_EXECUTION_STEP",
);
assert.match(
  businessActionSource,
  /if \(resultType === "TRIP_ADVANCED"\) \{/,
  "履约行驶记录推进必须按来源状态映射路径规划、上车、下车等工作流动作",
);
assert.doesNotMatch(
  fieldDictionaryDoc,
  /只用于 SimulationRun 完成后的业务时间线计算/,
  "字段字典不得继续描述旧的模拟后置补算语义",
);
assert.match(
  architectureRules,
  /工作流时效配置是业务单据生命周期自动化推进的耗时合同/,
  "模拟运行架构规则必须明确工作流时效配置的底层合同语义",
);

console.log("v033.3 工作流时效与业务生命周期时间线合同验证通过。");
