import assert from "node:assert/strict";
import fs from "node:fs";

import { resolvePagePresentation } from "../src/ui/pageContextService.js";

const mainSource = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const stylesSource = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const rulesSource = fs.readFileSync(new URL("../doc/rules/04-frontend-ux-rules.md", import.meta.url), "utf8");
const tabbedDetailSource = mainSource.match(/function TabbedDetail[\s\S]*?function DetailFieldContent/)?.[0] || "";

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
assert.match(stylesSource, /\.detail-tabs \.ant-tabs-nav-wrap\s*\{[^}]*min-width:\s*0/s, "详情页签必须保留组件原生溢出边界");
assert.match(stylesSource, /\.detail-tabs \.ant-tabs-nav-wrap\s*\{[^}]*overflow-x:\s*auto/s, "详情页签必须与表单一致使用原生横向滚动");
assert.match(stylesSource, /\.detail-tabs \.ant-tabs-nav-wrap\s*\{[^}]*scrollbar-width:\s*none/s, "详情页签不得显示无意义的灰色滚动条");
assert.match(stylesSource, /\.detail-tabs \.ant-tabs-nav-wrap::after\s*\{[^}]*display:\s*none/s, "详情页签不得保留覆盖标题的溢出遮罩");
assert.doesNotMatch(tabbedDetailSource, /handlePointerMove|setPointerCapture|suppressDraggedClick|revealActiveDetailTab/, "详情页签不得覆盖平台原生滚动和点击交互");
assert.match(stylesSource, /\.detail-tabs \.ant-tabs-nav-list\s*\{[^}]*transform:\s*none/s, "详情页签原生滚动时不得叠加组件位移");
assert.match(stylesSource, /\.detail-tabs \.ant-tabs-nav-operations\s*\{[^}]*display:\s*none/s, "详情页签不得显示更多菜单");
assert.match(mainSource, /aria-label="展开详情"[\s\S]*?>›<\/Button>/, "详情展开控件必须使用统一的向右提示");
assert.match(mainSource, /aria-label="隐藏详情"[\s\S]*?>‹<\/Button>/, "详情收起控件必须使用统一的向左提示");
assert.match(stylesSource, /\.detail-toggle-button\.ant-btn:hover[\s\S]*background:\s*var\(--surface-soft\)/, "详情开合控件悬停时必须提供稳定的浮层反馈");
assert.match(stylesSource, /\.workbench\.detail-collapsed \.detail-rail\s*\{[^}]*width:\s*0/s, "手机详情收起后不得覆盖主内容");
assert.match(rulesSource, /行内功能只执行操作/, "前端规则必须约束行操作与选择隔离");

console.log("v045.1 全平台页面展示控件合同验证通过");
