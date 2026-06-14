import { PaymentStatus, ServiceOrderChannel, ServiceOrderStatus } from "../domain/serviceOrderTypes.js?v=20260614-v020-5-settlement";

export function validateServiceOrders(data) {
  const orders = data.serviceOrders || [];
  const customers = new Set((data.customers || []).map((item) => item.customer_id));
  const demandRuns = new Set((data.demandSimulationRuns || []).map((item) => item.demand_simulation_run_id));
  const demandResults = new Set((data.demandSimulationRuns || []).map((item) => getDemandSimulationResultId(item.demand_simulation_run_id)));
  const serviceAreas = new Map((data.serviceAreas || []).map((item) => [item.service_area_id, item]));
  const cells = new Set((data.cells || []).map((item) => item.cell_id));
  const routes = new Map((data.routes || []).map((item) => [item.route_id, item]));
  const pricingDecisions = new Map((data.pricingDecisions || []).map((item) => [item.pricing_decision_id, item]));
  const orderIds = new Set();
  const rules = [];

  orders.forEach((order) => {
    rules.push(validateUnique(orderIds, order.service_order_id));
    rules.push(validateRef(`SO-CUSTOMER-${order.service_order_id}`, "服务订单客户必须存在", order.customer_id, customers));
    rules.push(validateRef(`SO-DEMAND-RUN-${order.service_order_id}`, "服务订单需求模拟执行记录必须存在", order.demand_simulation_run_id, demandRuns));
    rules.push(validateOptionalRef(`SO-DEMAND-RESULT-${order.service_order_id}`, "服务订单需求模拟结果必须存在", order.demand_simulation_result_id, demandResults));
    rules.push(validateEnum(`SO-CHANNEL-${order.service_order_id}`, "服务订单来源必须合法", order.order_channel, Object.values(ServiceOrderChannel)));
    rules.push(validateEnum(`SO-STATUS-${order.service_order_id}`, "服务订单状态必须合法", order.order_status, Object.values(ServiceOrderStatus)));
    rules.push(validateEnum(`SO-PAYMENT-${order.service_order_id}`, "服务订单支付状态必须合法", order.payment_status, Object.values(PaymentStatus)));
    rules.push(validateRef(`SO-PICKUP-SA-${order.service_order_id}`, "上车服务区必须存在", order.pickup_service_area_id, serviceAreas));
    rules.push(validateRef(`SO-DROPOFF-SA-${order.service_order_id}`, "下车服务区必须存在", order.dropoff_service_area_id, serviceAreas));
    rules.push(validateRef(`SO-PICKUP-CELL-${order.service_order_id}`, "上车位置必须存在", order.pickup_cell_id, cells));
    rules.push(validateRef(`SO-DROPOFF-CELL-${order.service_order_id}`, "下车位置必须存在", order.dropoff_cell_id, cells));
    rules.push(validateOptionalRef(`SO-PRICE-ROUTE-${order.service_order_id}`, "价格预估路径必须存在", order.price_estimation_route_id, routes));
    rules.push(validateOptionalRef(`SO-ESTIMATE-PD-${order.service_order_id}`, "预估价格决策必须存在", order.estimated_pricing_decision_id, pricingDecisions));
    rules.push(validateOptionalRef(`SO-FINAL-PD-${order.service_order_id}`, "最终价格决策必须存在", order.final_pricing_decision_id, pricingDecisions));
    rules.push(validateServiceAreaCell(order, serviceAreas, "pickup"));
    rules.push(validateServiceAreaCell(order, serviceAreas, "dropoff"));
    rules.push(validateCreatedStage(order));
  });

  return rules;
}

function validateUnique(orderIds, serviceOrderId) {
  if (!serviceOrderId) return createRule("SO-ID-MISSING", "服务订单编号不能为空", false, "发现缺少服务订单编号的记录");
  const passed = !orderIds.has(serviceOrderId);
  orderIds.add(serviceOrderId);
  return createRule(`SO-ID-${serviceOrderId}`, "服务订单编号必须唯一", passed, passed ? serviceOrderId : `${serviceOrderId} 重复`);
}

function validateRef(ruleId, ruleName, value, targetSetOrMap) {
  const passed = Boolean(value) && targetSetOrMap.has(value);
  return createRule(ruleId, ruleName, passed, passed ? value : `${value || "空"} 不存在`);
}

function validateEnum(ruleId, ruleName, value, allowedValues) {
  const passed = allowedValues.includes(value);
  return createRule(ruleId, ruleName, passed, passed ? value : `${value || "空"} 不合法`);
}

function validateServiceAreaCell(order, serviceAreas, type) {
  const serviceAreaId = type === "pickup" ? order.pickup_service_area_id : order.dropoff_service_area_id;
  const cellId = type === "pickup" ? order.pickup_cell_id : order.dropoff_cell_id;
  const serviceArea = serviceAreas.get(serviceAreaId);
  const allowedCells = type === "pickup" ? getPickupAllowedCells(order, serviceArea) : serviceArea?.dropoff_cell_ids;
  const passed = Boolean(serviceArea && cellId && allowedCells?.includes(cellId));
  return createRule(
    `SO-${type.toUpperCase()}-CELL-IN-SA-${order.service_order_id}`,
    type === "pickup" ? "上车位置必须属于上车服务区" : "下车位置必须属于下车服务区",
    passed,
    passed ? `${serviceAreaId} / ${cellId}` : `${serviceAreaId || "空"} / ${cellId || "空"} 不匹配`,
  );
}

function getPickupAllowedCells(order, serviceArea) {
  const standardPickupCells = serviceArea?.pickup_cell_ids || [];
  if (!serviceArea || order.pickup_cell_id !== order.customer_origin_cell_id) return standardPickupCells;
  return Array.from(new Set([
    ...standardPickupCells,
    ...(serviceArea.dropoff_cell_ids || []),
    ...(serviceArea.temp_stop_cell_ids || []),
    ...(serviceArea.parking_cell_ids || []),
    ...(serviceArea.standby_cell_ids || []),
    ...(serviceArea.cell_ids || serviceArea.covered_cell_ids || []),
  ]));
}

function validateCreatedStage(order) {
  if (![ServiceOrderStatus.WAITING_PRICE_ESTIMATE, ServiceOrderStatus.CREATED].includes(order.order_status)) {
    return createRule(`SO-CREATED-STAGE-${order.service_order_id}`, "订单创建阶段字段约束", true, "非创建阶段暂不校验");
  }
  const passed = !order.estimated_pricing_decision_id &&
    !order.final_pricing_decision_id &&
    !order.matched_robotaxi_id &&
    !order.order_matching_decision_id &&
    !order.trip_id;
  return createRule(
    `SO-CREATED-STAGE-${order.service_order_id}`,
    "订单创建后不得提前绑定定价、匹配或履约对象",
    passed,
    passed ? "创建阶段字段正确" : "存在提前绑定的后续对象",
  );
}

function validateOptionalRef(ruleId, ruleName, value, targetSetOrMap) {
  const passed = !value || targetSetOrMap.has(value);
  return createRule(ruleId, ruleName, passed, passed ? (value || "未设置") : `${value} 不存在`);
}

function getDemandSimulationResultId(runId) {
  const serial = String(runId || "").match(/\d+$/)?.[0] || "000";
  return `DSRES-${serial.padStart(3, "0")}`;
}

function createRule(ruleId, ruleName, passed, detail) {
  return {
    rule_id: ruleId,
    rule_name: ruleName,
    result: passed ? "PASS" : "FAIL",
    detail,
  };
}
