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
assert.match(stylesSource, /\.detail-tab-button\s*\{[^}]*white-space:\s*nowrap/s, "详情页签标题不得被压缩裁断");
assert.match(stylesSource, /\.detail-tabs-scroll\s*\{[^}]*min-width:\s*0/s, "详情页签必须保留原生溢出边界");
assert.match(stylesSource, /\.detail-tabs-scroll\s*\{[^}]*overflow-x:\s*auto/s, "详情页签必须使用浏览器原生横向滚动");
assert.match(stylesSource, /\.detail-tabs-scroll\s*\{[^}]*scrollbar-width:\s*none/s, "详情页签不得显示灰色滚动条");
assert.match(stylesSource, /\.detail-tabs-content-only > \.ant-tabs-nav\s*\{[^}]*display:\s*none/s, "内容页签不得保留内部导航和溢出菜单");
assert.doesNotMatch(tabbedDetailSource, /handlePointerMove|setPointerCapture|suppressDraggedClick|revealActiveDetailTab/, "详情页签不得覆盖平台原生滚动和点击交互");
assert.doesNotMatch(tabbedDetailSource, /onWheelCapture|onTouchMoveCapture/, "详情页签不得拦截原生滚轮或触摸事件");
assert.match(tabbedDetailSource, /role="tablist"[\s\S]*role="tab"[\s\S]*aria-selected=\{activeTabKey === tab\.key\}/, "详情页签必须使用可访问的原生页签按钮");
assert.match(tabbedDetailSource, /onClick=\{\(\) => setActiveTabKey\(tab\.key\)\}/, "页签点击必须直接选择当前按钮对应内容");
assert.match(tabbedDetailSource, /activeKey=\{activeTabKey\}[\s\S]*animated=\{false\}/, "详情内容必须由同一选中键控制且不得自行跳转");
assert.match(mainSource, /aria-label="展开详情"[\s\S]*?>‹<\/Button>/, "详情展开控件必须使用向左展开提示");
assert.match(mainSource, /aria-label="隐藏详情"[\s\S]*?>›<\/Button>/, "详情收起控件必须使用向右收起提示");
assert.match(stylesSource, /\.detail-toggle-button\.ant-btn:hover[\s\S]*background:\s*var\(--surface-soft\)/, "详情开合控件悬停时必须提供稳定的浮层反馈");
assert.match(stylesSource, /\.workbench\.detail-collapsed \.detail-rail\s*\{[^}]*width:\s*0/s, "手机详情收起后不得覆盖主内容");
assert.match(rulesSource, /行内功能只执行操作/, "前端规则必须约束行操作与选择隔离");

console.log("v045.1 全平台页面展示控件合同验证通过");
