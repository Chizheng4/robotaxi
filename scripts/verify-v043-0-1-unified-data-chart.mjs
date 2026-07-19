import assert from "node:assert/strict";
import fs from "node:fs";
import { performance } from "node:perf_hooks";
import {
  createDataChartModel,
  createEchartsOption,
  findNearestDataChartIndex,
  formatDataChartAxisNumber,
} from "../src/ui/dataChartService.js";

const rows = Array.from({ length: 24 }, (_, index) => ({
  key: `hour-${index}`,
  label: `${String(index).padStart(2, "0")}:00`,
  values: { orders: 100 + index * 3, planned: 95 + index * 2 },
}));
const model = createDataChartModel({
  rows,
  series: [
    { key: "orders", label: "订单量" },
    { key: "planned", label: "规划订单量" },
  ],
});
assert.equal(model.rows.length, 24, "小时趋势不得丢失时间点");
assert(model.width > 620, "完整时间标签必须通过图内宽度承载");
assert(model.yTicks.length >= 4, "数值轴必须提供可读刻度");
assert.equal(findNearestDataChartIndex(model, model.series[0].points[8].x), 8, "浮动提示必须定位到最近数据点");
assert(formatDataChartAxisNumber(1200).length > 0, "数值轴必须提供格式化结果");
const echartsOption = createEchartsOption({ rows, series: [{ key: "orders", label: "订单量", color: "#4b78c7" }] });
assert.equal(echartsOption.tooltip.trigger, "axis", "浮动提示和指示线必须由同一坐标轴驱动");
assert.equal(echartsOption.tooltip.alwaysShowContent, false, "浮动提示不得在离开图表后持续保留");
assert.equal(echartsOption.tooltip.hideDelay, 0, "浮动提示离开图表后必须立即释放");
assert.equal(echartsOption.grid.containLabel, true, "图表必须根据标签自适应绘图区");
assert.deepEqual(echartsOption.dataZoom, [], "短序列图表不得接管页面滚轮");

const largeRows = Array.from({ length: 10_000 }, (_, index) => ({
  key: `point-${index}`,
  label: String(index),
  values: { value: index % 317 },
}));
const startedAt = performance.now();
const largeModel = createDataChartModel({ rows: largeRows, series: [{ key: "value", label: "指标值" }] });
const elapsed = performance.now() - startedAt;
assert.equal(largeModel.rows.length, 360, "超长序列必须限制渲染节点数量");
assert(largeModel.sampled, "超长序列必须声明已进行展示抽样");
assert(elapsed < 80, `一万点图表模型构建耗时过高：${elapsed.toFixed(2)}ms`);
const denseOption = createEchartsOption({ rows: largeRows, series: [{ key: "value", label: "指标值" }] });
assert.deepEqual(denseOption.dataZoom, [], "长序列图表不得因时间点较多而接管页面滚轮");

const source = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const rules = fs.readFileSync(new URL("../doc/rules/04-frontend-ux-rules.md", import.meta.url), "utf8");
assert(source.includes("function DataSeriesChart"), "前端必须提供共享数据图表控件");
assert(source.includes("normalizeForecastChartRows"), "预测结果必须通过共享数据契约接入");
assert(source.includes("normalizeMetricChartRows"), "经营分析必须通过共享数据契约接入");
assert.equal(source.includes("function ForecastTrendChart"), false, "不得保留预测页私有图表实现");
assert.equal(source.includes("function MetricTrendChart"), false, "不得保留经营分析私有图表实现");
assert(source.includes("window.echarts.init"), "共享图表必须接入本地成熟图表引擎");
assert(source.includes("claimDataChartTooltip"), "共享图表必须统一管理跨图表提示层所有权");
assert(source.includes('chart.getZr().on("globalout", handleTooltipRelease)'), "共享图表移出时必须释放提示层");
assert.equal(source.includes("showNearestTooltip"), false, "不得用页面手工派发提示层覆盖图表引擎交互");
assert.equal(source.includes("data-chart-control-tooltip"), false, "不得同时渲染第二套 React 提示层");
assert(!source.slice(source.indexOf("function DataSeriesChart"), source.indexOf("function normalizeForecastChartRows")).includes("<svg"), "共享图表不得继续手写 SVG 坐标和提示层");
assert(styles.includes(".data-chart-viewport"), "图表必须提供统一响应式视口");
assert(styles.includes("touch-action: pan-y pinch-zoom"), "图表必须兼顾窄屏页面滚动和触摸查看");
assert(styles.includes(".data-chart-viewport canvas"), "图表画布必须继承手机端纵向触摸滚动合同");
assert(source.includes("onWheelCapture={preserveDataChartPageScroll}"), "共享图表必须统一保留页面纵向滚轮行为");
assert(rules.includes("统一调用共享图表控件"), "前端规则必须约束图表复用");

console.log(`v043.0.1 统一数据图表验证通过：10,000 点模型 ${elapsed.toFixed(2)}ms`);
