import assert from "node:assert/strict";
import fs from "node:fs";
import { normalizeLongTermDemandForecastResult } from "../src/domain/longTermDemandPlanning.js";
import { createEchartsOption } from "../src/ui/dataChartService.js";

const main = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const dictionary = fs.readFileSync(new URL("../src/domain/fieldDictionary.js", import.meta.url), "utf8");
const dictionaryDoc = fs.readFileSync(new URL("../doc/rules/field-dictionary.md", import.meta.url), "utf8");
const planning = fs.readFileSync(new URL("../src/domain/longTermDemandPlanning.js", import.meta.url), "utf8");
const chartVendor = new URL("../vendor/echarts.min.js", import.meta.url);
const chartLicense = new URL("../vendor/echarts-LICENSE.txt", import.meta.url);

assert(fs.existsSync(chartVendor), "必须本地保存图表运行依赖");
assert(fs.existsSync(chartLicense), "必须保留图表依赖许可证");
assert(html.includes("vendor/echarts.min.js"), "页面必须加载包含完整交互组件的本地图表引擎");
assert(!html.includes("vendor/echarts.simple.min.js"), "页面不得继续加载缺少提示组件的精简图表引擎");
assert(fs.statSync(chartVendor).size > 900_000, "本地图表引擎必须包含提示、指示线和缩放组件");
assert(main.includes('dataChartService.js?v=20260717-v047-0-2'), "图表服务动态模块必须使用当前版本缓存标识");
assert(main.includes('businessPlanningService.js?v=20260717-v047-0-3'), "经营规划服务动态模块必须使用当前计算合同缓存标识");
assert(main.includes("执行供应决策"), "预测结果必须使用职责明确的供应决策动作");
assert(!main.includes(">执行供应闭环</Button>"), "普通业务页面不得暴露演示闭环动作");
assert(!main.includes('label: "规划日订单"'), "图表和结论不得继续使用旧中文别名");
assert(dictionary.includes('planned_daily_orders: "计划承接日订单"'), "字段字典必须统一计划承接量名称");
assert(dictionaryDoc.includes("|planned_daily_orders|计划承接日订单|"), "文档字段字典必须同步计划承接量名称");
assert(planning.includes('output_field: outputField'), "计算步骤必须声明唯一输出字段");
assert(planning.includes('formula_expression: formulaExpression'), "计算步骤必须保存字段键公式");
assert(planning.includes('source_refs: sourceRefs'), "计算步骤必须保存来源引用");

const migratedForecast = normalizeLongTermDemandForecastResult({
  baseline_addressable_daily_orders: 45.71,
  zone_period_growth_rate: 0.01,
  growth_adjustment_rate: 0.005,
  effective_period_growth_rate: 0.015,
  growth_model: "LINEAR",
  growth_factor: 1.18,
  market_forecast_daily_orders: 53.99,
  calculation_steps: [{ step_order: 1, output_value: 45.71 }],
});
assert(migratedForecast.calculation_steps.length >= 20, "历史预测结果必须迁移为完整计算步骤");
migratedForecast.calculation_steps.forEach((step) => {
  assert(step.output_field, "迁移后的步骤必须具有统一输出字段");
  assert(step.calculation_model, `迁移后的 ${step.output_field} 必须具有计算模型`);
  assert(step.formula_expression, `迁移后的 ${step.output_field} 必须具有计算公式`);
  assert(Object.keys(step.input_values || {}).length, `迁移后的 ${step.output_field} 必须具有输入字段`);
});
assert(main.includes("normalizeLongTermDemandForecastResults(operationalData.longTermDemandForecasts)"), "运行态加载必须统一迁移历史预测结果");

const rows = Array.from({ length: 48 }, (_, index) => ({ label: `第 ${index + 1} 期`, values: { value: index }, raw: { index } }));
const option = createEchartsOption({ rows, series: [{ key: "value", label: "指标值", color: "#4b78c7" }] });
assert.equal(option.grid.containLabel, true, "图表必须根据坐标标签自适应布局");
assert.equal(option.tooltip.axisPointer.snap, true, "提示线必须准确吸附数据点");
assert.equal(option.dataZoom[0].type, "inside", "长序列必须支持图内缩放移动");

console.log("v047.0.3 预测语义、历史迁移与响应式图表合同验证通过");
