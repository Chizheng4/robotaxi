import assert from "node:assert/strict";
import fs from "node:fs";

const main = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const planningService = fs.readFileSync(new URL("../src/services/robotaxiTaskPlanningService.js", import.meta.url), "utf8");
const fleetTaskService = fs.readFileSync(new URL("../src/services/fleetOperationTaskService.js", import.meta.url), "utf8");
const orderMatchingEngine = fs.readFileSync(new URL("../src/data/orderMatchingEngine.js", import.meta.url), "utf8");
const businessActionService = fs.readFileSync(new URL("../src/services/businessActionService.js", import.meta.url), "utf8");

[
  "resolveRobotaxiCompositeState",
  "planRobotaxiTask",
  "getAvailableRobotaxiActions",
  "TaskPlanningAssignmentType",
  "TaskPlanningDecision",
].forEach((needle) => assert.match(planningService, new RegExp(needle), `任务规划服务缺少 ${needle}`));

assert.match(fleetTaskService, /planRobotaxiTask/, "运维任务创建必须先调用 Robotaxi 任务规划策略");
assert.match(fleetTaskService, /requestedAssignmentType:\s*robotaxiTaskPlanningService\.TaskPlanningAssignmentType\.FLEET_OPERATION_TASK/, "运维任务必须以运维任务类型进入规划");
assert.match(orderMatchingEngine, /requestedAssignmentType:\s*robotaxiTaskPlanningService\.TaskPlanningAssignmentType\.SERVICE_ORDER/, "订单匹配候选必须经过任务规划策略");
assert.match(businessActionService, /requestedAssignmentType:\s*robotaxiTaskPlanningService\.TaskPlanningAssignmentType\.DEPLOYMENT_TASK/, "模拟/自动投放创建必须经过任务规划策略");

assert.match(main, /robotaxiTaskPlanningStrategies/, "主页面缺少 Robotaxi 任务规划策略运行态集合");
assert.match(main, /getRobotaxiFleetOperationActions/, "Robotaxi 页面动作必须由任务规划策略预判");
assert.match(main, /robotaxiTaskPlanningService\.getAvailableRobotaxiActions/, "Robotaxi 页面动作必须调用任务规划服务");
assert.match(main, /import\("\.\/services\/robotaxiTaskPlanningService\.js\?v=20260704-v040-12"\)/, "任务规划服务必须纳入 bootstrap 等待链");
assert.doesNotMatch(getFunctionBody(main, "renderRobotaxiFleetOperationActions"), /TaskType\.RETIREMENT/, "退役不能作为普通 Robotaxi 运维按钮");

console.log("v040.12 Robotaxi 任务规划策略合同验证通过");

function getFunctionBody(text, functionName) {
  const match = new RegExp(`function\\s+${functionName}\\s*\\(`).exec(text);
  assert.ok(match, `缺少函数 ${functionName}`);
  const braceStart = text.indexOf("{", match.index);
  let depth = 0;
  for (let cursor = braceStart; cursor < text.length; cursor += 1) {
    if (text[cursor] === "{") depth += 1;
    if (text[cursor] === "}") depth -= 1;
    if (depth === 0) return text.slice(braceStart, cursor + 1);
  }
  throw new Error(`函数 ${functionName} 函数体未闭合`);
}
