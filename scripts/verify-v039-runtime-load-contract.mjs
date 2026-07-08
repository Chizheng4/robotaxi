import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");

[
  "fleetOperationDispatchStrategies",
  "fleetOperationDispatchRuns",
  "fleetOperationDispatchDecisions",
].forEach((field) => {
  const occurrences = source.match(new RegExp(field, "g")) || [];
  assert(
    occurrences.length >= 8,
    `v039 新增运行态字段 ${field} 未完整接入初始化、恢复、持久化和页面数据`,
  );
});

[
  "fleetOperationDispatchDecisions: {",
  "fleetOperationDispatchDecisions: \"fleetOperationDispatchDecision\"",
  "fleetOperationDispatchDecision: \"fleet_operation_dispatch_decision_id\"",
  "fleetOperationDispatchDecisions: \"decision_result\"",
  "{ key: \"fleetOperationDispatchDecisions\", label: \"调度策略结果\" }",
].forEach((needle) => {
  assert(source.includes(needle), `运维调度策略结果页面合同缺失：${needle}`);
});

const planIndex = source.indexOf("function planFleetOperationRoute(task)");
const advanceIndex = source.indexOf("function advanceFleetOperationRouteExecution(execution)");
const confirmIndex = source.indexOf("function confirmFleetOperationArrival(task)");
const dispatchIndex = source.indexOf("function dispatchFleetOperationTaskDestination(task)");

assert(planIndex > 0, "缺少 planFleetOperationRoute");
assert(advanceIndex > planIndex, "缺少 advanceFleetOperationRouteExecution");
assert(confirmIndex > advanceIndex, "缺少 confirmFleetOperationArrival");
assert(dispatchIndex > confirmIndex, "缺少 dispatchFleetOperationTaskDestination");

assert(
  source.slice(planIndex, advanceIndex).trimEnd().endsWith("}"),
  "advanceFleetOperationRouteExecution 必须是 App 作用域函数，不能嵌套在路径规划函数内部",
);

console.log("v039 运行态恢复与 Fleet Operation 函数作用域合同验证通过");
