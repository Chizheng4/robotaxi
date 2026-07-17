import assert from "node:assert/strict";
import fs from "node:fs";

import { navigationGroups } from "../src/ui/navigationRegistry.js";
import { getPageArchitecture, pageArchitectureRegistry, validatePageArchitecture } from "../src/ui/pageArchitectureRegistry.js";

const mainSource = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const rulesSource = fs.readFileSync(new URL("../doc/rules/04-frontend-ux-rules.md", import.meta.url), "utf8");
const leafKeys = flattenLeafKeys(navigationGroups);

assert.equal(leafKeys.length, 85, "导航叶子页面数量发生变化时必须同步更新页面架构合同");
assert.equal(Object.keys(pageArchitectureRegistry).length, leafKeys.length, "每个页面必须且只能有一个架构合同");
assert.deepEqual(validatePageArchitecture(leafKeys), { valid: true, errors: [] }, "页面架构注册表必须完整有效");

leafKeys.forEach((page) => {
  const contract = getPageArchitecture(page);
  assert.ok(contract, `${page} 缺少页面架构合同`);
  if (contract.mode === "record") assert.notEqual(contract.detailMode, "none", `${page} 必须接入统一详情控件`);
  if (contract.mode === "analysis") assert.equal(contract.detailMode, "none", `${page} 不应显示记录详情栏`);
});

assert.equal(getPageArchitecture("shortTermDemandForecastResults").eventPanel, null, "纯预测结果不得显示最近任务事件");
assert.equal(getPageArchitecture("fleetAllocationResults").eventPanel.label, "最近操作事件", "可操作结果应使用操作事件语义");
assert.equal(getPageArchitecture("serviceOrders").resourceKind, "document", "服务订单必须声明为业务单据");
assert.equal(getPageArchitecture("metricObservations").resourceKind, "result", "指标观测必须声明为数据结果");

const coreDocumentPages = [
  "readinessTasks", "routeExecutions", "serviceFulfillmentRecords", "deploymentTasks", "serviceOrders",
  "cleaningTasks", "maintenanceTasks", "chargingTasks", "failureHandlingTasks", "retirementTasks",
];
coreDocumentPages.forEach((page) => {
  const contract = getPageArchitecture(page);
  assert.equal(contract.mode, "record", `${page} 必须使用统一表单框架`);
  assert.equal(contract.resourceKind, "document", `${page} 必须保持独立业务单据语义`);
  assert.equal(contract.detailMode, "specialized", `${page} 必须接入统一专属详情控件`);
  assert.equal(contract.actionMode, "row", `${page} 必须通过统一行操作控件触发功能`);
  assert.ok(contract.eventPanel?.label, `${page} 必须接入统一单据事件区`);
});
assert.deepEqual(
  pickFrameworkContract(getPageArchitecture("routeExecutions")),
  pickFrameworkContract(getPageArchitecture("serviceFulfillmentRecords")),
  "运营行驶与履约行驶必须使用同一表单、详情、操作和事件框架",
);

assert.match(mainSource, /validatePageArchitecture\(navigationValidation\.leafKeys\)/, "应用启动必须校验全部页面架构合同");
assert.match(mainSource, /getSemanticDetailTabs\(selectedObject\)/, "无专属配置的详情必须进入统一语义分组");
assert.doesNotMatch(mainSource, /function hasTabbedDetail/, "详情不得通过页面白名单退回字段平铺");
assert.match(mainSource, /pageArchitecture\.eventPanel\.label/, "事件区标题必须来自页面架构合同");
assert.match(mainSource, /页面操作合同与实现不一致/, "行操作实现必须接受页面架构合同校验");
assert.match(mainSource, /cleaningTask: "task_status"/, "清洁任务详情必须使用自身任务状态时间线");
assert.match(mainSource, /chargingTask: "task_status"/, "充电任务详情必须使用自身任务状态时间线");
assert.match(mainSource, /maintenanceTask: "task_status"/, "维修任务详情必须使用自身任务状态时间线");
assert.match(mainSource, /failureHandlingTask: "task_status"/, "故障处理详情必须使用自身任务状态时间线");
assert.match(mainSource, /retirementTask: "task_status"/, "退役任务详情必须使用自身任务状态时间线");
assert.ok(mainSource.includes('if (/^[A-Z][A-Z0-9_]*$/.test'), "结构化详情必须把枚举键转换为中文");
assert.match(mainSource, /summarizeObject[\s\S]*getStructuredKeyLabel\(key\)/, "表格中的复杂配置摘要必须复用结构化中文展示入口");
assert.match(rulesSource, /pageArchitectureRegistry/, "前端规则必须声明页面架构注册表约束");

console.log("v045.2 全站页面架构注册与详情控件合同验证通过");

function flattenLeafKeys(items = []) {
  return items.flatMap((item) => item.children?.length ? flattenLeafKeys(item.children) : [item.key]);
}

function pickFrameworkContract(contract) {
  return {
    mode: contract.mode,
    resourceKind: contract.resourceKind,
    detailMode: contract.detailMode,
    actionMode: contract.actionMode,
    hasEventPanel: Boolean(contract.eventPanel),
  };
}
