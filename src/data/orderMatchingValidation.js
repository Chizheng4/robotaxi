import { OrderMatchingResult } from "../domain/orderMatchingTypes.js?v=20260611-v019-5-order-matching";

export function validateOrderMatching(data) {
  const strategies = data.orderMatchingStrategies || [];
  const runs = data.orderMatchingRuns || [];
  const decisions = data.orderMatchingDecisions || [];
  const orders = new Map((data.serviceOrders || []).map((order) => [order.service_order_id, order]));
  const robotaxis = new Map((data.robotaxis || []).map((robotaxi) => [robotaxi.robotaxi_id, robotaxi]));
  const strategyIds = new Set(strategies.map((strategy) => strategy.order_matching_strategy_id));
  const runIds = new Set(runs.map((run) => run.order_matching_run_id));
  const activeOrderByRobotaxi = new Map();
  const rules = [];

  runs.forEach((run) => {
    rules.push(createRule(`OMR-STRATEGY-${run.order_matching_run_id}`, "匹配执行记录必须关联匹配策略", strategyIds.has(run.order_matching_strategy_id), run.order_matching_strategy_id || "无"));
    rules.push(createRule(`OMR-ORDER-${run.order_matching_run_id}`, "匹配执行记录必须关联服务订单", orders.has(run.service_order_id), run.service_order_id || "无"));
    rules.push(createRule(`OMR-RESULT-${run.order_matching_run_id}`, "匹配执行结果必须合法", Object.values(OrderMatchingResult).includes(run.run_result), run.run_result || "无"));
  });

  decisions.forEach((decision) => {
    const order = orders.get(decision.service_order_id);
    const selectedRobotaxi = decision.selected_robotaxi_id ? robotaxis.get(decision.selected_robotaxi_id) : null;
    rules.push(createRule(`OMD-RUN-${decision.order_matching_decision_id}`, "匹配决策必须关联匹配执行记录", runIds.has(decision.order_matching_run_id), decision.order_matching_run_id || "无"));
    rules.push(createRule(`OMD-ORDER-${decision.order_matching_decision_id}`, "匹配决策必须关联服务订单", Boolean(order), decision.service_order_id || "无"));
    rules.push(createRule(`OMD-RESULT-${decision.order_matching_decision_id}`, "匹配决策结果必须合法", Object.values(OrderMatchingResult).includes(decision.decision_result), decision.decision_result || "无"));
    if (decision.decision_result === OrderMatchingResult.SUCCESS) {
      rules.push(createRule(`OMD-ROBOTAXI-${decision.order_matching_decision_id}`, "匹配成功必须选中 Robotaxi", Boolean(selectedRobotaxi), decision.selected_robotaxi_id || "无"));
      rules.push(createRule(`OMD-SO-LINK-${decision.order_matching_decision_id}`, "服务订单必须引用匹配决策", order?.order_matching_decision_id === decision.order_matching_decision_id, order?.order_matching_decision_id || "无"));
      rules.push(createRule(`OMD-ROBOTAXI-LINK-${decision.order_matching_decision_id}`, "Robotaxi 必须绑定服务订单", selectedRobotaxi?.current_order_id === decision.service_order_id, selectedRobotaxi?.current_order_id || "无"));
    }
  });

  (data.robotaxis || []).forEach((robotaxi) => {
    if (!robotaxi.current_order_id) return;
    const previousRobotaxiId = activeOrderByRobotaxi.get(robotaxi.current_order_id);
    rules.push(createRule(`OM-ORDER-UNIQUE-${robotaxi.robotaxi_id}`, "同一服务订单同一时间只能绑定一台 Robotaxi", !previousRobotaxiId, previousRobotaxiId ? `${robotaxi.current_order_id} 已绑定 ${previousRobotaxiId}` : robotaxi.current_order_id));
    rules.push(createRule(`OM-ROBOTAXI-NO-TASK-${robotaxi.robotaxi_id}`, "绑定服务订单的 Robotaxi 不应同时绑定当前任务", !robotaxi.current_task_id, robotaxi.current_task_id || "无"));
    activeOrderByRobotaxi.set(robotaxi.current_order_id, robotaxi.robotaxi_id);
  });

  return rules;
}

function createRule(ruleId, ruleName, passed, detail) {
  return {
    rule_id: ruleId,
    rule_name: ruleName,
    result: passed ? "PASS" : "FAIL",
    detail,
  };
}
