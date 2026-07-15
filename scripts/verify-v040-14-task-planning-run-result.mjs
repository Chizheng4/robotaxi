import assert from "node:assert/strict";
import fs from "node:fs";

const main = fs.readFileSync("src/main.jsx", "utf8");
const navigation = fs.readFileSync("src/ui/navigationRegistry.js", "utf8");
const planningTypes = fs.readFileSync("src/domain/robotaxiTaskPlanningTypes.js", "utf8");
const planningService = fs.readFileSync("src/services/robotaxiTaskPlanningService.js", "utf8");
const fleetTaskService = fs.readFileSync("src/services/fleetOperationTaskService.js", "utf8");
const orderMatchingEngine = fs.readFileSync("src/data/orderMatchingEngine.js", "utf8");
const fieldDictionary = fs.readFileSync("src/domain/fieldDictionary.js", "utf8");
const dictionaryDoc = fs.readFileSync("doc/rules/field-dictionary.md", "utf8");

[
  "robotaxiTaskPlanningRuns",
  "robotaxiTaskPlanningResults",
  "robotaxiTaskPlanningRun",
  "robotaxiTaskPlanningResult",
  "nextTaskPlanningRunId",
  "nextTaskPlanningResultId",
].forEach((needle) => assert.ok(main.includes(needle), `主页面缺少 ${needle}`));

assert.ok(navigation.includes('page("robotaxiTaskPlanningRuns", "规划策略执行")'), "任务规划策略分组必须包含规划策略执行");
assert.ok(navigation.includes('page("robotaxiTaskPlanningResults", "规划策略结果")'), "任务规划策略分组必须包含规划策略结果");
assert.match(main, /isFleetOperationDispatchStrategyPage[\s\S]*isRobotaxiTaskPlanningStrategyPage[\s\S]*isStrategyExecutionPanelPage/, "策略页面必须统一接入最近策略执行区");
assert.match(main, /isRobotaxiTaskPlanningStrategyPage \? createStrategyRunRows\(actions\.robotaxiTaskPlanningRuns/, "任务规划策略页必须展示最近任务规划执行");

assert.match(planningTypes, /createRobotaxiTaskPlanningRun/, "必须定义任务规划执行对象");
assert.match(planningTypes, /createRobotaxiTaskPlanningResult/, "必须定义任务规划结果对象");
assert.match(planningService, /executeRobotaxiTaskPlanning/, "任务规划服务必须提供带审计执行入口");
assert.match(fleetTaskService, /recordTaskPlanningAudit/, "运维任务真实触发必须可生成任务规划审计");
assert.match(orderMatchingEngine, /executeRobotaxiTaskPlanning/, "订单匹配候选必须生成任务规划审计");

[
  "robotaxiTaskPlanningRun",
  "robotaxiTaskPlanningResult",
  "robotaxi_task_planning_run_id",
  "robotaxi_task_planning_result_id",
  "PLANNING_ALLOWED",
  "PLANNING_QUEUED",
  "PLANNING_REJECTED",
].forEach((needle) => assert.ok(fieldDictionary.includes(needle), `代码字段字典缺少 ${needle}`));

[
  "RobotaxiTaskPlanningRun：任务规划执行",
  "RobotaxiTaskPlanningResult：任务规划结果",
  "页面预览不生成执行",
  "PLANNING_ALLOWED",
].forEach((needle) => assert.ok(dictionaryDoc.includes(needle), `文档字段字典缺少 ${needle}`));

console.log("v040.14 任务规划执行结果与策略页面规范验证通过");
