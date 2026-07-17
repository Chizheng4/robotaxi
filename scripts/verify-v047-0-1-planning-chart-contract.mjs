import assert from "node:assert/strict";
import fs from "node:fs";
import { createEchartsOption } from "../src/ui/dataChartService.js";

const main = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const dictionary = fs.readFileSync(new URL("../src/domain/fieldDictionary.js", import.meta.url), "utf8");
const dictionaryDoc = fs.readFileSync(new URL("../doc/rules/field-dictionary.md", import.meta.url), "utf8");
const planning = fs.readFileSync(new URL("../src/domain/longTermDemandPlanning.js", import.meta.url), "utf8");
const chartVendor = new URL("../vendor/echarts.simple.min.js", import.meta.url);
const chartLicense = new URL("../vendor/echarts-LICENSE.txt", import.meta.url);

assert(fs.existsSync(chartVendor), "必须本地保存图表运行依赖");
assert(fs.existsSync(chartLicense), "必须保留图表依赖许可证");
assert(html.includes("vendor/echarts.simple.min.js"), "页面必须加载本地图表引擎");
assert(main.includes("执行供应决策"), "预测结果必须使用职责明确的供应决策动作");
assert(!main.includes(">执行供应闭环</Button>"), "普通业务页面不得暴露演示闭环动作");
assert(!main.includes('label: "规划日订单"'), "图表和结论不得继续使用旧中文别名");
assert(dictionary.includes('planned_daily_orders: "计划承接日订单"'), "字段字典必须统一计划承接量名称");
assert(dictionaryDoc.includes("|planned_daily_orders|计划承接日订单|"), "文档字段字典必须同步计划承接量名称");
assert(planning.includes('output_field: outputField'), "计算步骤必须声明唯一输出字段");
assert(planning.includes('formula_expression: formulaExpression'), "计算步骤必须保存字段键公式");
assert(planning.includes('source_refs: sourceRefs'), "计算步骤必须保存来源引用");

const rows = Array.from({ length: 48 }, (_, index) => ({ label: `第 ${index + 1} 期`, values: { value: index }, raw: { index } }));
const option = createEchartsOption({ rows, series: [{ key: "value", label: "指标值", color: "#4b78c7" }] });
assert.equal(option.grid.containLabel, true, "图表必须根据坐标标签自适应布局");
assert.equal(option.tooltip.axisPointer.snap, true, "提示线必须准确吸附数据点");
assert.equal(option.dataZoom[0].type, "inside", "长序列必须支持图内缩放移动");

console.log("v047.0.1 预测语义与响应式图表合同验证通过");
