export const DecisionResultArtifactKind = Object.freeze({
  ANALYSIS_RESULT: "ANALYSIS_RESULT",
  DECISION_RECORD: "DECISION_RECORD",
  PLAN_DOCUMENT: "PLAN_DOCUMENT",
  OPERATIONAL_OBJECT: "OPERATIONAL_OBJECT",
  SIMULATION_RESULT: "SIMULATION_RESULT",
});

export const CalculationTraceOwner = Object.freeze({
  EXECUTION: "EXECUTION",
});

export const calculationStepFieldAliases = Object.freeze([
  "calculation_steps",
  "decision_calculation_steps",
  "profile_calculation_steps",
]);

export function resolveCalculationSteps(record = {}) {
  for (const key of calculationStepFieldAliases) {
    if (Array.isArray(record?.[key]) && record[key].length) {
      return Object.freeze({ field: key, steps: Object.freeze(record[key]) });
    }
  }
  return Object.freeze({ field: "calculation_steps", steps: Object.freeze([]) });
}

export function normalizeCalculationStep(step = {}, index = 0) {
  return Object.freeze({
    step_order: Number.isFinite(Number(step.step_order)) ? Number(step.step_order) : index + 1,
    step_group: step.step_group || "计算过程",
    step_action: step.step_action || step.step_name || "计算",
    calculation_model: step.calculation_model || null,
    calculation_model_version: step.calculation_model_version || null,
    input_values: Object.freeze({ ...(step.input_values || {}) }),
    source_refs: Object.freeze([...(step.source_refs || [])]),
    formula_expression: step.formula_expression || step.formula || null,
    output_field: step.output_field || null,
    output_value: step.output_value ?? null,
    output_unit: step.output_unit || null,
    diagnostics: Object.freeze([...(step.diagnostics || [])]),
  });
}

export function normalizeCalculationSteps(steps = []) {
  return Object.freeze((Array.isArray(steps) ? steps : []).map(normalizeCalculationStep));
}

export function validateCalculationSteps(steps = [], { allowEmpty = true } = {}) {
  const errors = [];
  if (!Array.isArray(steps)) return Object.freeze(["计算过程必须是数组"]);
  if (!allowEmpty && !steps.length) errors.push("计算过程不能为空");
  normalizeCalculationSteps(steps).forEach((step, index) => {
    const prefix = `第 ${index + 1} 步`;
    if (!step.calculation_model) errors.push(`${prefix}缺少计算模型编号`);
    if (!step.calculation_model_version) errors.push(`${prefix}缺少计算模型版本`);
    if (!step.formula_expression) errors.push(`${prefix}缺少公式`);
    if (!step.output_field) errors.push(`${prefix}缺少输出字段`);
    if (!step.output_unit) errors.push(`${prefix}缺少结果单位`);
  });
  return Object.freeze(errors);
}

export function validateDecisionExplanationContract(definition = {}) {
  const errors = [];
  if (!Object.values(DecisionResultArtifactKind).includes(definition.resultArtifactKind)) {
    errors.push(`${definition.id || "未知能力"}缺少有效结果性质`);
  }
  if (definition.calculationTraceOwner !== CalculationTraceOwner.EXECUTION) {
    errors.push(`${definition.id || "未知能力"}的完整计算过程必须由执行记录持有`);
  }
  if (!Array.isArray(definition.resultRunIdFields) || !definition.resultRunIdFields.length) {
    errors.push(`${definition.id || "未知能力"}缺少结果到执行的追溯字段`);
  }
  if (!Array.isArray(definition.downstreamPageKeys)) {
    errors.push(`${definition.id || "未知能力"}缺少下游页面声明`);
  }
  return Object.freeze(errors);
}
