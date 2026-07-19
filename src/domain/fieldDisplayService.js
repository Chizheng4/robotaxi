import {
  fieldDictionary,
  fieldValueDictionary,
  getDetailTitle,
  objectDictionary,
  valueDictionary,
} from "./fieldDictionary.js?v=20260719-v047-4-3";
import { getFieldSemanticDefinition } from "./fieldSemanticRegistry.js?v=20260719-v047-4-3";

const INTERNAL_FIELD_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/;
const INTERNAL_VALUE_PATTERN = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/;
const FORMULA_TOKEN_PATTERN = /[A-Za-z][A-Za-z0-9_]*/g;
const formulaTokenDictionary = Object.freeze({
  max: "最大值",
  min: "最小值",
  ceil: "向上取整",
  floor: "向下取整",
  round: "四舍五入",
  sum: "求和",
  avg: "平均值",
  add_calendar_period: "按日历周期增加",
  day: "天",
  days: "天",
  Place: "地点",
  ServiceArea: "服务区域",
  Zone: "运营区域",
  Robotaxi: "Robotaxi",
});
const calculationUnitDictionary = Object.freeze({
  DATE: "日期",
  ORDER_PER_DAY: "单/日",
  ORDER_PER_HOUR: "单/小时",
  ORDER_PER_ROBOTAXI_DAY: "单/Robotaxi·日",
  RATIO: "%",
  PERCENT: "%",
  MULTIPLE: "倍",
  MINUTE: "分钟",
  ROBOTAXI: "辆",
  CNY_PER_DAY: "元/日",
  PERSON_PER_DAY: "人/日",
  TRIP_PER_DAY: "次/日",
});

export function getFieldLabel(field) {
  const semanticDefinition = getFieldSemanticDefinition(field);
  if (semanticDefinition?.label) return semanticDefinition.label;
  if (fieldDictionary[field]) return fieldDictionary[field];
  return isInternalFieldName(field) ? "未登记字段" : field;
}

export function getDisplayValue(value, field = null) {
  const displayValue = fieldValueDictionary[field]?.[value] || valueDictionary[value];
  if (displayValue) return displayValue;
  return isInternalEnumValue(value) ? "未登记枚举值" : value;
}

export function formatFormulaExpression(expression) {
  if (expression === null || expression === undefined || expression === "") return "无公式";
  return String(expression)
    .replace(/\s*\/\s*/g, " ÷ ")
    .replace(/\s*\*\s*/g, " × ")
    .replace(FORMULA_TOKEN_PATTERN, (token) => {
      if (formulaTokenDictionary[token]) return formulaTokenDictionary[token];
      if (getFieldSemanticDefinition(token)?.label || fieldDictionary[token]) return getFieldLabel(token);
      return isInternalFieldName(token) ? "未登记字段" : token;
    });
}

export function validateFormulaExpression(expression) {
  const tokens = String(expression || "").match(FORMULA_TOKEN_PATTERN) || [];
  return unique(tokens.filter((token) => (
    isInternalFieldName(token)
    && !formulaTokenDictionary[token]
    && !getFieldSemanticDefinition(token)?.label
    && !fieldDictionary[token]
  )));
}

export function formatCalculationResult(value, unit, outputField = null) {
  if (value === null || value === undefined || value === "") return "无";
  if (unit === "DATE") return String(value);
  const numeric = Number(value);
  if (unit === "RATIO" || unit === "PERCENT") {
    return Number.isFinite(numeric)
      ? `${(numeric * 100).toLocaleString("zh-CN", { maximumFractionDigits: 2 })}%`
      : "无";
  }
  const formattedValue = Number.isFinite(numeric)
    ? numeric.toLocaleString("zh-CN", { maximumFractionDigits: 2 })
    : getDisplayValue(value, outputField);
  const displayUnit = calculationUnitDictionary[unit]
    || fieldValueDictionary.output_unit?.[unit]
    || (isInternalEnumValue(unit) ? "未登记单位" : unit);
  return displayUnit ? `${formattedValue} ${displayUnit}` : String(formattedValue);
}

export function validateCalculationUnit(unit) {
  if (!unit) return null;
  return calculationUnitDictionary[unit] || fieldValueDictionary.output_unit?.[unit]
    ? null
    : (isInternalEnumValue(unit) ? unit : null);
}

export { getDetailTitle };
export { getFieldSemanticDefinition };

export function hasFieldLabel(field) {
  return Boolean(getFieldSemanticDefinition(field)?.label || fieldDictionary[field]);
}

export function hasDisplayValue(value, field = null) {
  return Boolean(fieldValueDictionary[field]?.[value] || valueDictionary[value]);
}

export function isInternalFieldName(value) {
  return typeof value === "string" && INTERNAL_FIELD_PATTERN.test(value);
}

export function isInternalEnumValue(value) {
  return typeof value === "string" && INTERNAL_VALUE_PATTERN.test(value);
}

export function validateFieldDisplayContract({ fields = [], values = [] } = {}) {
  const missingFields = unique(fields)
    .filter((field) => isInternalFieldName(field))
    .filter((field) => !hasFieldLabel(field));
  const missingValues = values
    .filter(({ value }) => isInternalEnumValue(value))
    .filter(({ value, field }) => !hasDisplayValue(value, field))
    .map(({ value, field }) => field ? `${field}:${value}` : value);

  return {
    missingFields: unique(missingFields),
    missingValues: unique(missingValues),
    objectTypes: Object.keys(objectDictionary),
  };
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}
