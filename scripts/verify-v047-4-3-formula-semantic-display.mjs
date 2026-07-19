import assert from "node:assert/strict";
import fs from "node:fs";
import { calculationModelRegistry } from "../src/domain/calculationModelRegistry.js";
import {
  formatCalculationResult,
  formatFormulaExpression,
  validateCalculationUnit,
  validateFormulaExpression,
} from "../src/domain/fieldDisplayService.js";

const source = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const rules = fs.readFileSync(new URL("../doc/rules/04-frontend-ux-rules.md", import.meta.url), "utf8");

assert.equal(
  formatFormulaExpression("60 / average_service_stop_duration_min"),
  "60 ÷ 平均站点停靠时长（分钟）",
  "服务区域公式必须使用中文字段名和易读运算符",
);
assert.equal(
  formatFormulaExpression("min(Σ ServiceArea.effective_pickup_capacity_per_hour, Σ ServiceArea.effective_dropoff_capacity_per_hour)"),
  "最小值(Σ 服务区域.有效上车承载（订单/小时）, Σ 服务区域.有效下车承载（订单/小时）)",
  "对象、函数和字段必须由统一公式语义服务解析",
);
assert.equal(formatCalculationResult(552.45, "ORDER_PER_DAY", "baseline_addressable_daily_orders"), "552.45 单/日");
assert.equal(formatCalculationResult(0.0157, "RATIO", "effective_period_growth_rate"), "1.57%");
assert.equal(formatCalculationResult(1.19, "MULTIPLE", "growth_factor"), "1.19 倍");
assert.equal(formatCalculationResult("2027-07-18", "DATE", "forecast_end_date"), "2027-07-18");

const registeredUnitErrors = Object.values(calculationModelRegistry)
  .map((model) => validateCalculationUnit(model.unit))
  .filter(Boolean);
assert.deepEqual(registeredUnitErrors, [], `计算模型存在未登记单位：${registeredUnitErrors.join(", ")}`);

const registeredFormulaErrors = Object.values(calculationModelRegistry).flatMap((model) => (
  validateFormulaExpression(model.formula).map((token) => `${model.model_id}:${token}`)
));
assert.deepEqual(registeredFormulaErrors, [], `计算模型公式存在未登记字段：${registeredFormulaErrors.join(", ")}`);

[
  "operation_hours × worker_cost_per_hour",
  "charged_energy_kwh × electricity_price_per_kwh",
  "distance_km × distance_cost_per_km",
  "distance_km × energy_consumption_kwh_per_km × electricity_price_per_kwh",
  "(robotaxi_purchase_cost - robotaxi_residual_value) / expected_lifetime_km × distance_km",
].forEach((formula) => {
  assert.deepEqual(validateFormulaExpression(formula), [], `成本公式存在未登记字段：${formula}`);
  assert(!formatFormulaExpression(formula).includes("未登记字段"), `成本公式中文展示失败：${formula}`);
});

assert(source.includes("formatPlanningCalculationExpression(step.formula_expression)"), "统一计算过程控件必须调用公式语义服务");
assert(source.includes("formatFormulaExpression(record.calculation_formula)"), "成本明细必须调用统一公式语义服务");
assert(source.includes("return formatFormulaExpression(expression);"), "预测计算过程必须复用统一公式语义服务");
assert(source.includes("formatCalculationResult(step.output_value, step.output_unit, step.output_field)"), "预测和画像计算结果必须复用统一单位语义服务");
assert(!source.includes("step.output_unit ? ` ${step.output_unit}`"), "页面不得直接拼接内部结果单位");
assert(!source.includes("<dd>{step.formula || \"无\"}</dd>"), "页面不得直接输出画像原始公式");
assert(!source.includes(">{record.calculation_formula}</Text>"), "页面不得直接输出成本原始公式");
assert(rules.includes("页面不得直接输出原始公式、内部单位或枚举字符串"), "前端规则必须固定计算语义展示边界");

console.log("v047.4.3 公式字段语义与统一中文展示合同验证通过");
