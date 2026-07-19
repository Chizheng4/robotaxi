import assert from "node:assert/strict";
import fs from "node:fs";
import { getOperatingModelDefinition, validateOperatingModelDefinition } from "../src/services/operatingModelService.js";
import { navigationGroups, findNavigationPath, validateNavigationRegistry } from "../src/ui/navigationRegistry.js";

const mainSource = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const stylesSource = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const dictionarySource = fs.readFileSync(new URL("../src/domain/fieldDictionary.js", import.meta.url), "utf8");
const dictionaryDocument = fs.readFileSync(new URL("../doc/rules/field-dictionary.md", import.meta.url), "utf8");
const modelDocument = fs.readFileSync(new URL("../doc/08-strategy-operating-metrics-model/00-operating-model-overview.md", import.meta.url), "utf8");

const model = getOperatingModelDefinition();
assert.equal(validateOperatingModelDefinition(model).valid, true, "经营模型合同必须完整");
assert.deepEqual(model.model_domains.map((item) => item.model_domain_name), ["需求", "供应", "决策控制", "服务", "资产", "财务", "经营反馈"]);

const expectedGroupOrder = ["console", "businessPlanning", "decisionCenter", "businessAnalysis", "customer", "supplyManagement", "robotaxi", "supplyDemandDeploymentManagement", "travelServiceManagement", "operationSupportManagement", "financialManagement", "operationOrganization", "space", "simulation"];
assert.deepEqual(navigationGroups.map((item) => item.key), expectedGroupOrder, "一级菜单顺序必须符合经营结构");
assert.deepEqual(findNavigationPath("operatingModel").map((item) => item.key), ["businessPlanning", "operatingModel"]);

const pageObjectTypeBlock = mainSource.match(/const pageObjectType = \{([\s\S]*?)\n\};/)?.[1] || "";
const pageKeys = [...pageObjectTypeBlock.matchAll(/^\s{2}([A-Za-z0-9]+):/gm)].map((match) => match[1]);
const navigationValidation = validateNavigationRegistry(pageKeys);
assert.equal(navigationValidation.valid, true, navigationValidation.errors.join("；"));

assert(mainSource.includes("pageGroups = navigationRegistry.navigationGroups"), "页面必须从导航注册表读取菜单");
assert(mainSource.includes("<OperatingModelPanel"), "经营模型页面必须使用结构视图");
assert(!mainSource.includes("const pageGroups = ["), "主页面不得继续维护内联菜单");
assert(stylesSource.includes(".record-page-new.analytical-workspace"), "规划与分析必须复用分析画布");
assert(stylesSource.includes(".operating-model-domain-grid"), "经营模型必须具备响应式结构布局");

["operating_model_id", "model_domains", "management_question", "fact_source_types"].forEach((field) => {
  assert(dictionarySource.includes(`${field}:`), `代码字段字典缺少 ${field}`);
  assert(dictionaryDocument.includes(`|${field}|`), `文档字段字典缺少 ${field}`);
});
assert(modelDocument.includes("业务单据生命周期"), "经营模型设计必须声明业务事实边界");

console.log("v045 经营模型、导航注册表和分析画布合同验证通过");
