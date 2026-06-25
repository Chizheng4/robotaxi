import assert from "node:assert/strict";
import fs from "node:fs";

import {
  getCurrentNormalStatusValues,
  getCurrentStatusValues,
  getLegacyCompatStatusValues,
  getPageStatusOptions,
  getStatusGroup,
  StatusGroup,
} from "../src/domain/statusRegistry.js";
import {
  normalWorkflowTransitions,
  preservedWorkflowTransitions,
  WorkflowTransitionMode,
  getTimingTransitions,
} from "../src/domain/workflowTransitionRegistry.js";

const mainSource = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");

assert(!getCurrentStatusValues("serviceOrder").includes("PAID"), "服务订单主状态不得包含 PAID，已支付只属于 payment_status");
assert(!getCurrentStatusValues("trip").includes("SETTLING"), "Trip 当前状态不得包含 SETTLING，结算中只属于服务订单");
assert(getLegacyCompatStatusValues("trip").includes("SETTLING"), "Trip 历史 SETTLING 必须保留兼容解释");
assert(getCurrentNormalStatusValues("deploymentTask")[0] === "WAITING_START", "运营投放任务当前初始状态必须是 WAITING_START");
assert(getCurrentNormalStatusValues("routeExecution")[0] === "WAITING_ROUTE", "运营行驶记录当前初始状态必须是 WAITING_ROUTE");
assert(getLegacyCompatStatusValues("deploymentTask").includes("WAITING_ROUTE"), "投放任务 WAITING_ROUTE 只能作为历史兼容状态");
assert(getLegacyCompatStatusValues("routeExecution").includes("WAITING_START"), "运营行驶记录 WAITING_START 只能作为历史兼容状态");

for (const page of ["readinessTasks", "deploymentTasks", "routeExecutions", "serviceOrders", "serviceFulfillmentRecords"]) {
  assert(getPageStatusOptions(page).length > 0, `${page} 必须从状态注册表获得状态分类`);
}

for (const transition of normalWorkflowTransitions) {
  assert.equal(
    getStatusGroup(transition.business_object_type, transition.from_status),
    StatusGroup.CURRENT_NORMAL,
    `${transition.workflow_transition_definition_id} 的 from_status 必须是当前正常状态`
  );
  assert.equal(
    getStatusGroup(transition.business_object_type, transition.to_status),
    StatusGroup.CURRENT_NORMAL,
    `${transition.workflow_transition_definition_id} 的 to_status 必须是当前正常状态`
  );
}

for (const transition of preservedWorkflowTransitions) {
  assert.notEqual(
    transition.transition_mode,
    WorkflowTransitionMode.DIRECT,
    `${transition.workflow_transition_definition_id} 兼容或异常状态边不得是直接正常状态边`
  );
  assert.equal(
    transition.timing_enabled,
    false,
    `${transition.workflow_transition_definition_id} 兼容或异常状态边不得进入时效配置`
  );
}

const timingTransitionIds = new Set(getTimingTransitions().map((item) => item.workflow_transition_definition_id));
for (const transition of preservedWorkflowTransitions) {
  assert(!timingTransitionIds.has(transition.workflow_transition_definition_id), `${transition.workflow_transition_definition_id} 不得进入时效配置`);
}

assert.match(mainSource, /statusRegistry\??\.getPageStatusOptions/, "主页面状态分类必须通过状态注册表获取");
assert.doesNotMatch(mainSource, /const readinessStatusOptions\s*=/, "主页面不得维护运营准入状态分类手写数组");
assert.doesNotMatch(mainSource, /const deploymentStatusOptions\s*=/, "主页面不得维护运营投放状态分类手写数组");
assert.doesNotMatch(mainSource, /const routeExecutionStatusOptions\s*=/, "主页面不得维护运营行驶状态分类手写数组");
assert.doesNotMatch(mainSource, /const serviceOrderStatusOptions\s*=/, "主页面不得维护服务订单状态分类手写数组");
assert.doesNotMatch(mainSource, /const tripStatusOptions\s*=/, "主页面不得维护履约行驶状态分类手写数组");

const simulationHandlersSource = fs.readFileSync(new URL("../src/services/simulationHandlers.js", import.meta.url), "utf8");
assert.doesNotMatch(simulationHandlersSource, /order_status:\s*"MATCH_FAILED"/, "新模拟数据不得继续生成服务订单历史 MATCH_FAILED 状态");
assert.doesNotMatch(simulationHandlersSource, /task_status:\s*taskTypes\.DeploymentTaskStatus\.WAITING_ROUTE/, "新模拟投放任务不得把 WAITING_ROUTE 当作当前状态");

console.log("状态与工作流合同验证通过");
