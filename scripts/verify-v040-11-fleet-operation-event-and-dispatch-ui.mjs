import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const dispatchTypes = fs.readFileSync(new URL("../src/domain/taskDispatchTypes.js", import.meta.url), "utf8");
const dispatchService = fs.readFileSync(new URL("../src/services/taskDispatchStrategyService.js", import.meta.url), "utf8");

[
  "runFleetOperationPolicy",
  "createDirectFleetOperationTaskFromRobotaxi",
  "dispatchFleetOperationTaskDestination",
  "startFleetOperationWork",
  "completeFleetOperationWork",
].forEach((name) => {
  const body = getFunctionBody(source, name);
  assert.doesNotMatch(body, /antd\.message/, `${name} 不能使用弹出提示承载运维单据操作结果`);
  assert.match(body, /task_type|source_page|appendFleetOperationPageEvent/, `${name} 应写入可归属的任务事件`);
});

const planBody = getFunctionBody(source, "planFleetOperationRoute");
const routeCreateBody = getFunctionBody(source, "createFleetOperationRouteExecution");
assert.doesNotMatch(planBody + routeCreateBody, /antd\.message/, "planFleetOperationRoute 不能使用弹出提示承载运维单据操作结果");
assert.match(routeCreateBody, /task_type|source_page|appendFleetOperationPageEvent/, "planFleetOperationRoute 应通过共用行驶记录创建函数写入可归属的任务事件");

assert.match(source, /function appendFleetOperationPageEvent/, "缺少运维页面事件写入入口");
assert.match(source, /function createFleetTaskEventRows\(eventLogs = \[\], tasks = \[\], page = null\)/, "最近任务事件必须支持按页面过滤");
assert.match(source, /event\.source_page === page/, "最近任务事件必须使用 source_page 过滤页面归属");
assert.match(source, /function createFleetOperationPolicyRunRows/, "运维策略执行记录必须按当前策略过滤");

const robotaxiActions = getFunctionBody(source, "renderRobotaxiFleetOperationActions");
assert.doesNotMatch(robotaxiActions, /isOccupied|current_order_id|current_task_id/, "Robotaxi 运维触发入口不能被前端占用状态隐藏");
["CLEANING", "CHARGING", "MAINTENANCE", "FAILURE_HANDLING"].forEach((taskType) => {
  assert.match(robotaxiActions, new RegExp(`TaskType\\.${taskType}`), `Robotaxi 管理缺少 ${taskType} 触发入口`);
});

assert.doesNotMatch(source, /runTaskDispatchStrategy|renderTaskDispatchStrategyActions|执行任务调度/, "任务调度策略是被调用策略，不能暴露人工执行入口");
assert.match(dispatchTypes, /invocation_rules/, "任务调度策略缺少调用规则配置");
assert.match(dispatchTypes, /priority_rank/, "任务调度策略缺少优先级配置");
assert.match(dispatchService, /export function resolveTaskPriorityConfig/, "任务调度策略服务必须提供优先级兼容配置");
assert.match(source, /tableLayout="auto"/, "表格应使用内容自适应布局");
assert.doesNotMatch(source, /tableLayout="fixed"/, "表格不能继续使用固定布局隐藏长内容");

console.log("v040.11 运维事件反馈与任务调度 UI 边界验证通过");

function getFunctionBody(text, functionName) {
  const match = new RegExp(`function\\s+${functionName}\\s*\\(`).exec(text);
  assert.ok(match, `缺少函数 ${functionName}`);
  const index = match.index;
  const braceStart = text.indexOf("{", index);
  assert.notEqual(braceStart, -1, `函数 ${functionName} 缺少函数体`);
  let depth = 0;
  for (let cursor = braceStart; cursor < text.length; cursor += 1) {
    if (text[cursor] === "{") depth += 1;
    if (text[cursor] === "}") depth -= 1;
    if (depth === 0) return text.slice(braceStart, cursor + 1);
  }
  throw new Error(`函数 ${functionName} 函数体未闭合`);
}
