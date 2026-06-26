import assert from "node:assert/strict";
import fs from "node:fs";

const handlersSource = fs.readFileSync(new URL("../src/services/simulationHandlers.js", import.meta.url), "utf8");
const actionServiceSource = fs.readFileSync(new URL("../src/services/businessActionService.js", import.meta.url), "utf8");

assert.match(handlersSource, /businessActionService/, "模拟 handler 必须调用业务动作同源服务");
assert.doesNotMatch(handlersSource, /routePlanningService\./, "模拟 handler 不得直接调用路径规划服务");
assert.doesNotMatch(handlersSource, /createRoutePlanningRun/, "模拟 handler 不得直接创建路径规划执行记录");
assert.doesNotMatch(handlersSource, /createPriceEstimationRoute/, "模拟 handler 不得直接创建价格预估路径");
assert.doesNotMatch(handlersSource, /planDeploymentRoute/, "模拟 handler 不得直接规划运营投放路径");
assert.doesNotMatch(handlersSource, /order_status:\s*["'`]/, "模拟 handler 不得直接写服务订单状态");
assert.doesNotMatch(handlersSource, /trip_status:\s*["'`]/, "模拟 handler 不得直接写履约状态");
assert.doesNotMatch(handlersSource, /task_status:\s*["'`]/, "模拟 handler 不得直接写任务状态");
assert.doesNotMatch(handlersSource, /execution_status:\s*["'`]/, "模拟 handler 不得直接写行驶状态");

for (const fn of [
  "createReadinessTask",
  "assignReadinessTask",
  "startReadinessTask",
  "passReadinessTask",
  "createDeploymentTask",
  "executeRoutePlanning",
  "advanceRouteExecution",
  "confirmRouteExecutionArrival",
  "createServiceOrder",
  "executePricing",
  "callRobotaxi",
  "executeOrderMatching",
  "advanceTrip",
  "settleServiceOrder",
  "payServiceOrder",
]) {
  assert.match(actionServiceSource, new RegExp(`export function ${fn}\\b`), `业务动作服务缺少 ${fn}`);
}

assert.match(actionServiceSource, /routePlanningService\.createRoutePlanningRun/, "路径规划执行记录必须由业务动作服务通过路径规划服务创建");
assert.match(actionServiceSource, /routePlanningService\.planDeploymentRoute/, "运营投放路径规划必须集中在业务动作服务");

console.log("业务动作同源合同验证通过");
