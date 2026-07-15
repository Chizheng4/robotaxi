import assert from "node:assert/strict";
import fs from "node:fs";

const main = fs.readFileSync("src/main.jsx", "utf8");
const navigation = fs.readFileSync("src/ui/navigationRegistry.js", "utf8");
const planningService = fs.readFileSync("src/services/robotaxiTaskPlanningService.js", "utf8");
const fieldDictionary = fs.readFileSync("src/domain/fieldDictionary.js", "utf8");
const dictionaryDoc = fs.readFileSync("doc/rules/field-dictionary.md", "utf8");

assert.ok(navigation.includes('group("robotaxiTaskPlanningPolicyGroup", "任务规划策略"'), "前台菜单必须显示任务规划策略分组");
assert.ok(navigation.includes('page("robotaxiTaskPlanningStrategies", "规划策略配置")'), "任务规划策略分组必须包含规划策略配置页面");
assert.ok(!navigation.includes('page("taskDispatchStrategies"'), "前台菜单不能继续展示任务调度策略入口");
assert.match(main, /"taskDispatchStrategies",\s*\n\s*"taskDispatchRuns",\s*\n\s*"taskDispatchResults"/, "旧任务调度页面必须隐藏保留兼容");

assert.match(planningService, /export function resolveTaskPriorityConfig/, "任务规划服务必须派生任务优先级配置");
assert.match(main, /robotaxiTaskPlanningService\?\.resolveTaskPriorityConfig\(getActiveRobotaxiTaskPlanningStrategy\(\)\)/, "业务调用必须从任务规划策略获取优先级配置");
assert.doesNotMatch(main, /taskDispatchStrategyService\?\.resolveTaskPriorityConfig\(getActiveTaskDispatchStrategy\(\)\)/, "当前业务不能再从任务调度策略获取优先级配置");

assert.match(main, /const autoMetricCalculationRunIdsRef = useRef\(new Set\(\)\)/, "必须记录自动经营数据刷新锁");
assert.match(main, /isFinanceCalculationTerminal\(run\.cost_calculation_status\)/, "经营数据自动刷新必须等待成本计算终态");
assert.match(main, /isFinanceCalculationTerminal\(run\.revenue_calculation_status\)/, "经营数据自动刷新必须等待收入生成终态");
assert.match(main, /runMetricCalculation\(metricPeriodType, \{ automatic: true \}\)/, "模拟完成后的经营数据刷新必须调用统一指标计算入口");

assert.ok(fieldDictionary.includes('robotaxiTaskPlanningStrategy: { label: "任务规划策略"'), "字段字典对象名必须显示任务规划策略");
assert.ok(fieldDictionary.includes('robotaxi_task_planning_strategy_id: "任务规划策略编号"'), "字段字典字段名必须显示任务规划策略编号");
assert.ok(dictionaryDoc.includes("空闲 Robotaxi 视为当前队列长度为 0"), "字段字典文档必须记录空闲是任务规划策略输入状态");

console.log("v040.13 任务规划收敛与经营数据自动刷新验证通过");
