import assert from "node:assert/strict";
import fs from "node:fs";

import { navigationGroups } from "../src/ui/navigationRegistry.js";
import { getPageArchitecture, pageArchitectureRegistry, validatePageArchitecture } from "../src/ui/pageArchitectureRegistry.js";

const mainSource = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const rulesSource = fs.readFileSync(new URL("../doc/rules/04-frontend-ux-rules.md", import.meta.url), "utf8");
const leafKeys = flattenLeafKeys(navigationGroups);

assert.equal(leafKeys.length, 78, "导航叶子页面数量发生变化时必须同步更新页面架构合同");
assert.equal(Object.keys(pageArchitectureRegistry).length, leafKeys.length, "每个页面必须且只能有一个架构合同");
assert.deepEqual(validatePageArchitecture(leafKeys), { valid: true, errors: [] }, "页面架构注册表必须完整有效");

leafKeys.forEach((page) => {
  const contract = getPageArchitecture(page);
  assert.ok(contract, `${page} 缺少页面架构合同`);
  if (contract.mode === "record") assert.notEqual(contract.detailMode, "none", `${page} 必须接入统一详情控件`);
  if (contract.mode === "analysis") assert.equal(contract.detailMode, "none", `${page} 不应显示记录详情栏`);
});

assert.equal(getPageArchitecture("supplyDemandBalanceResults").eventPanel, null, "纯策略结果不得显示最近任务事件");
assert.equal(getPageArchitecture("fleetAllocationResults").eventPanel.label, "最近操作事件", "可操作结果应使用操作事件语义");
assert.equal(getPageArchitecture("serviceOrders").resourceKind, "document", "服务订单必须声明为业务单据");
assert.equal(getPageArchitecture("metricObservations").resourceKind, "result", "指标观测必须声明为数据结果");

assert.match(mainSource, /validatePageArchitecture\(navigationValidation\.leafKeys\)/, "应用启动必须校验全部页面架构合同");
assert.match(mainSource, /getSemanticDetailTabs\(selectedObject\)/, "无专属配置的详情必须进入统一语义分组");
assert.doesNotMatch(mainSource, /function hasTabbedDetail/, "详情不得通过页面白名单退回字段平铺");
assert.match(mainSource, /pageArchitecture\.eventPanel\.label/, "事件区标题必须来自页面架构合同");
assert.match(mainSource, /页面操作合同与实现不一致/, "行操作实现必须接受页面架构合同校验");
assert.match(rulesSource, /pageArchitectureRegistry/, "前端规则必须声明页面架构注册表约束");

console.log("v045.2 全站页面架构注册与详情控件合同验证通过");

function flattenLeafKeys(items = []) {
  return items.flatMap((item) => item.children?.length ? flattenLeafKeys(item.children) : [item.key]);
}
