import assert from "node:assert/strict";
import fs from "node:fs";

import { getPageArchitecture } from "../src/ui/pageArchitectureRegistry.js";

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
].forEach((needle) => {
  assert.match(source, new RegExp(escapeRegExp(needle)), `主页面缺少 ${needle}`);
});

assert.equal(getPageArchitecture("fleetOperationPolicies").eventPanel.label, "最近运维策略执行", "运维策略页面应通过统一页面合同展示最近执行");

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
