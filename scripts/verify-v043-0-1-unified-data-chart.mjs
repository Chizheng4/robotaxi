import assert from "node:assert/strict";
import fs from "node:fs";
import { performance } from "node:perf_hooks";
import {
  createDataChartModel,
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

const source = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const rules = fs.readFileSync(new URL("../doc/rules/04-frontend-ux-rules.md", import.meta.url), "utf8");
assert(source.includes("function DataSeriesChart"), "前端必须提供共享数据图表控件");
assert(source.includes("normalizeForecastChartRows"), "预测结果必须通过共享数据契约接入");
assert(source.includes("normalizeMetricChartRows"), "经营分析必须通过共享数据契约接入");
assert.equal(source.includes("function ForecastTrendChart"), false, "不得保留预测页私有图表实现");
assert.equal(source.includes("function MetricTrendChart"), false, "不得保留经营分析私有图表实现");
assert(styles.includes(".data-chart-scroll") && styles.includes("overflow-x: auto"), "长序列必须在图表内部滚动");
assert(styles.includes("touch-action: pan-x"), "图表必须支持窄屏触摸浏览");
assert(rules.includes("统一调用共享图表控件"), "前端规则必须约束图表复用");

console.log(`v043.0.1 统一数据图表验证通过：10,000 点模型 ${elapsed.toFixed(2)}ms`);
