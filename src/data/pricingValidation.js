import { PricingAlgorithm, PricingResult, PricingStage } from "../domain/pricingTypes.js?v=20260611-v019-4-pricing";

export function validatePricing(data) {
  const strategies = data.pricingStrategies || [];
  const runs = data.pricingStrategyRuns || [];
  const decisions = data.pricingDecisions || [];
  const orders = new Map((data.serviceOrders || []).map((order) => [order.service_order_id, order]));
  const routes = new Map((data.routes || []).map((route) => [route.route_id, route]));
  const strategyIds = new Set(strategies.map((strategy) => strategy.pricing_strategy_id));
  const runIds = new Set(runs.map((run) => run.pricing_strategy_run_id));
  const rules = [];

  strategies.forEach((strategy) => {
    rules.push(createRule(`DPS-CONFIG-${strategy.pricing_strategy_id}`, "定价策略参数必须完整", hasValidConfig(strategy), strategy.pricing_strategy_id));
  });
  runs.forEach((run) => {
    rules.push(createRule(`DPR-STRATEGY-${run.pricing_strategy_run_id}`, "定价执行记录必须关联定价策略", strategyIds.has(run.pricing_strategy_id), run.pricing_strategy_id || "无"));
    rules.push(createRule(`DPR-ORDER-${run.pricing_strategy_run_id}`, "定价执行记录必须关联服务订单", orders.has(run.service_order_id), run.service_order_id || "无"));
    rules.push(createRule(`DPR-STAGE-${run.pricing_strategy_run_id}`, "定价执行阶段必须合法", Object.values(PricingStage).includes(run.pricing_stage), run.pricing_stage || "无"));
    rules.push(createRule(`DPR-RESULT-${run.pricing_strategy_run_id}`, "定价执行结果必须合法", Object.values(PricingResult).includes(run.run_result), run.run_result || "无"));
  });
  decisions.forEach((decision) => {
    const order = orders.get(decision.service_order_id);
    rules.push(createRule(`PD-RUN-${decision.pricing_decision_id}`, "定价决策必须关联定价执行记录", runIds.has(decision.pricing_strategy_run_id), decision.pricing_strategy_run_id || "无"));
    rules.push(createRule(`PD-ORDER-${decision.pricing_decision_id}`, "定价决策必须关联服务订单", Boolean(order), decision.service_order_id || "无"));
    rules.push(createRule(`PD-STAGE-${decision.pricing_decision_id}`, "定价决策阶段必须合法", Object.values(PricingStage).includes(decision.pricing_stage), decision.pricing_stage || "无"));

    if (decision.pricing_stage === PricingStage.ESTIMATE) {
      rules.push(createRule(`PD-ESTIMATE-PRICE-${decision.pricing_decision_id}`, "预估定价报价必须有效", Number(decision.quoted_price) > 0, decision.quoted_price ?? "无"));
      rules.push(createRule(`PD-ESTIMATE-SO-LINK-${decision.pricing_decision_id}`, "服务订单必须引用成功的预估定价决策", order?.estimated_pricing_decision_id === decision.pricing_decision_id, order?.estimated_pricing_decision_id || "无"));
      rules.push(createOptionalRefRule(`PD-ESTIMATE-ROUTE-${decision.pricing_decision_id}`, "预估定价路径必须存在", decision.price_estimation_route_id, routes));
    }

    if (decision.pricing_stage === PricingStage.FINAL) {
      rules.push(createRule(`PD-FINAL-PRICE-${decision.pricing_decision_id}`, "最终计费金额必须有效", Number(decision.final_price) > 0, decision.final_price ?? "无"));
      rules.push(createRule(`PD-FINAL-SO-LINK-${decision.pricing_decision_id}`, "服务订单必须引用成功的最终计费决策", order?.final_pricing_decision_id === decision.pricing_decision_id, order?.final_pricing_decision_id || "无"));
    }
  });

  return rules;
}

function hasValidConfig(strategy) {
  if (strategy.pricing_algorithm === PricingAlgorithm.BASIC_FINAL_FARE_CALCULATION) {
    return true;
  }
  return ["base_fare", "distance_unit_price", "time_unit_price", "supply_demand_multiplier", "time_period_multiplier", "service_area_multiplier", "channel_multiplier"]
    .every((key) => Number.isFinite(Number(strategy[key])));
}

function createRule(ruleId, ruleName, passed, detail) {
  return {
    rule_id: ruleId,
    rule_name: ruleName,
    result: passed ? "PASS" : "FAIL",
    detail,
  };
}

function createOptionalRefRule(ruleId, ruleName, value, targetSetOrMap) {
  const passed = !value || targetSetOrMap.has(value);
  return createRule(ruleId, ruleName, passed, passed ? (value || "未设置") : `${value} 不存在`);
}
