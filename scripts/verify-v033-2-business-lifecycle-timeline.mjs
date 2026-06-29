import fs from "node:fs";
import assert from "node:assert/strict";

const mainSource = fs.readFileSync("src/main.jsx", "utf8");
const businessActionSource = fs.readFileSync("src/services/businessActionService.js", "utf8");
const routePlanningSource = fs.readFileSync("src/services/routePlanningService.js", "utf8");
const costSource = fs.readFileSync("src/data/costModelCalculator.js", "utf8");

assert.equal(
  mainSource.includes("计算运营模拟时间"),
  false,
  "模拟运行页面不得继续暴露运营模拟时间补算入口",
);

assert.match(
  mainSource,
  /simulation_status_changed_at \|\| item\.calculated_simulation_status_changed_at/,
  "状态时间线必须优先展示业务动作实际沉淀的模拟状态变更时间",
);

assert.match(
  businessActionSource,
  /function withLifecycleStatus\(/,
  "业务动作服务必须集中沉淀业务生命周期状态时间线",
);

for (const actionType of [
  "READINESS_TASK_CREATE",
  "DEPLOYMENT_TASK_CREATE",
  "ROUTEEXECUTION_CREATE",
  "SERVICE_ORDER_CREATE",
  "TRIP_CREATE",
  "PAYMENT_EXECUTE",
]) {
  assert.match(businessActionSource, new RegExp(actionType), `业务生命周期时间线必须覆盖 ${actionType}`);
}

assert.match(
  routePlanningSource,
  /export function getRandomDeploymentTarget/,
  "投放目标选择必须提供服务化随机目标选择入口",
);
assert.match(
  businessActionSource,
  /routePlanningService\.getRandomDeploymentTarget/,
  "模拟投放创建必须使用随机服务区投放目标，而不是低密度再平衡偏置",
);

assert.match(
  mainSource,
  /runCostCalculation\(run\.simulation_run_id, \{ automatic: true \}\)/,
  "模拟完成后必须自动触发运营成本计算",
);
assert.match(
  mainSource,
  /runRevenueCalculation\(run\.simulation_run_id, \{ automatic: true \}\)/,
  "模拟完成后必须自动触发收入记录生成",
);

assert.match(
  costSource,
  /simulation_status_changed_at \|\| history\[0\]\.calculated_simulation_status_changed_at/,
  "成本计算必须优先消费业务生命周期实际状态时间",
);

console.log("v033.2 业务生命周期时间线与自动财务计算验证通过。");
