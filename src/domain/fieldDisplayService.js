import {
  fieldDictionary,
  fieldValueDictionary,
  getDetailTitle,
  objectDictionary,
  valueDictionary,
} from "./fieldDictionary.js";

const INTERNAL_FIELD_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/;
const INTERNAL_VALUE_PATTERN = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/;

export function getFieldLabel(field) {
  return fieldDictionary[field] || field;
}

export function getDisplayValue(value, field = null) {
  return fieldValueDictionary[field]?.[value] || valueDictionary[value] || value;
}

export { getDetailTitle };

export function hasFieldLabel(field) {
  return Boolean(fieldDictionary[field]);
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
