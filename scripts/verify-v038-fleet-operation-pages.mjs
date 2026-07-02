import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");

[
  "fleetOperationPolicies",
  "fleetOperationPolicyRuns",
  "fleetOperationPolicyResults",
  "runFleetOperationPolicyForPage",
  "createDirectFleetOperationTaskFromRobotaxi",
  "editFleetOperationPolicy",
  "createFleetTaskEventRows",
  "isFleetOperationTaskPage",
  "最近策略执行",
].forEach((needle) => {
  assert.match(source, new RegExp(escapeRegExp(needle)), `主页面缺少 ${needle}`);
});

[
  "cleaningTasks",
  "chargingTasks",
  "maintenanceTasks",
  "failureHandlingTasks",
  "retirementTasks",
].forEach((page) => {
  assert.match(source, new RegExp(`${page}[\\s\\S]{0,120}task_status`), `${page} 应接入任务状态字段`);
});

console.log("v038 Fleet Operations 页面接入合同验证通过");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
