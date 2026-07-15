import assert from "node:assert/strict";
import fs from "node:fs";

import { resolvePagePresentation } from "../src/ui/pageContextService.js";

const mainSource = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const stylesSource = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const rulesSource = fs.readFileSync(new URL("../doc/rules/04-frontend-ux-rules.md", import.meta.url), "utf8");

for (const page of ["operatingModel", "longTermDemandForecasts", "operatingMetricsOverview", "financialMetrics", "serviceMetrics", "processDiagnostics"]) {
  const presentation = resolvePagePresentation(page);
  assert.equal(presentation.mode, "analysis", `${page} 必须使用统一分析页面类型`);
  assert.equal(presentation.usesDetailRail, false, `${page} 不应常驻对象详情栏`);
}

assert.equal(resolvePagePresentation("console").mode, "map", "中控台必须使用地图页面类型");
assert.equal(resolvePagePresentation("serviceOrders").mode, "record", "业务对象必须使用记录页面类型");
assert.match(mainSource, /pageContextService\.resolvePagePresentation\(activePage\)/, "工作台必须通过页面展示服务决定布局");
assert.match(mainSource, /<AnalysisContentViewport>/, "分析页面必须接入统一内容视口");
assert.doesNotMatch(mainSource, /row-action-cell[^>]*onClickCapture/, "行操作不得触发行选中");
assert.match(mainSource, /row-action-cell[^>]*onClick=\{\(event\) => event\.stopPropagation\(\)\}/, "行操作必须由公共控件隔离点击事件");
assert.match(stylesSource, /\.analysis-content-viewport\s*\{[^}]*overflow-x:\s*auto/s, "分析内容必须支持内部横向浏览");
assert.match(stylesSource, /\.detail-tabs \.ant-tabs-tab-btn\s*\{[^}]*white-space:\s*nowrap/s, "详情页签标题不得被压缩裁断");
assert.match(stylesSource, /\.workbench\.detail-collapsed \.detail-rail\s*\{[^}]*width:\s*0/s, "手机详情收起后不得覆盖主内容");
assert.match(rulesSource, /行内功能只执行操作/, "前端规则必须约束行操作与选择隔离");

console.log("v045.1 全平台页面展示控件合同验证通过");
