import { TripStatus } from "../domain/tripTypes.js?v=20260614-v020-4-trip-flow";

export function validateTrips(data) {
  const trips = data.trips || [];
  const orders = new Map((data.serviceOrders || []).map((order) => [order.service_order_id, order]));
  const robotaxis = new Map((data.robotaxis || []).map((robotaxi) => [robotaxi.robotaxi_id, robotaxi]));
  const routes = new Map((data.routes || []).map((route) => [route.route_id, route]));
  const routePlanningRuns = new Map((data.routePlanningRuns || []).map((run) => [run.route_planning_run_id, run]));
  const tripIds = new Set();
  const activeTripByRobotaxi = new Map();
  const rules = [];

  trips.forEach((trip) => {
    const order = orders.get(trip.service_order_id);
    const robotaxi = robotaxis.get(trip.robotaxi_id);
    rules.push(validateUnique(tripIds, trip.trip_id));
    rules.push(createRule(`TRIP-ORDER-${trip.trip_id}`, "服务履约记录必须关联服务订单", Boolean(order), trip.service_order_id || "无"));
    rules.push(createRule(`TRIP-ROBOTAXI-${trip.trip_id}`, "服务履约记录必须关联 Robotaxi", Boolean(robotaxi), trip.robotaxi_id || "无"));
    rules.push(createRule(`TRIP-STATUS-${trip.trip_id}`, "服务履约状态必须合法", Object.values(TripStatus).includes(trip.trip_status), trip.trip_status || "无"));
    rules.push(createRule(`TRIP-SO-LINK-${trip.trip_id}`, "服务订单必须引用服务履约记录", order?.trip_id === trip.trip_id, order?.trip_id || "无"));
    rules.push(...validateTripRouteRefs(trip, routes, routePlanningRuns));
    if (!["COMPLETED", "FAILED", "CANCELLED"].includes(trip.trip_status)) {
      const previousTripId = activeTripByRobotaxi.get(trip.robotaxi_id);
      rules.push(createRule(`TRIP-ROBOTAXI-ACTIVE-${trip.trip_id}`, "同一 Robotaxi 同一时间只能执行一个服务履约记录", !previousTripId, previousTripId ? `${trip.robotaxi_id} 已执行 ${previousTripId}` : trip.robotaxi_id));
      activeTripByRobotaxi.set(trip.robotaxi_id, trip.trip_id);
    }
  });

  return rules;
}

function validateTripRouteRefs(trip, routes, routePlanningRuns) {
  const rules = [];
  if (!trip.route_id && !trip.route_planning_run_id) return rules;
  const route = routes.get(trip.route_id);
  const run = routePlanningRuns.get(trip.route_planning_run_id);
  const latestHistory = Array.isArray(trip.route_history) ? trip.route_history.at(-1) : null;

  rules.push(createRule(`TRIP-ROUTE-${trip.trip_id}`, "Trip 当前 Route 必须存在", Boolean(route), trip.route_id || "无"));
  rules.push(createRule(`TRIP-RUN-${trip.trip_id}`, "Trip 当前路径规划执行记录必须存在", Boolean(run), trip.route_planning_run_id || "无"));
  if (!route || !run) return rules;

  rules.push(createRule(`TRIP-ROUTE-SO-${trip.trip_id}`, "Trip Route 必须反查服务订单", route.service_order_id === trip.service_order_id, route.service_order_id || "无"));
  rules.push(createRule(`TRIP-ROUTE-TRIP-${trip.trip_id}`, "Trip Route 必须反查服务履约记录", route.trip_id === trip.trip_id, route.trip_id || "无"));
  rules.push(createRule(`TRIP-RUN-SO-${trip.trip_id}`, "路径规划执行记录必须反查服务订单", run.service_order_id === trip.service_order_id, run.service_order_id || "无"));
  rules.push(createRule(`TRIP-RUN-TRIP-${trip.trip_id}`, "路径规划执行记录必须反查服务履约记录", run.trip_id === trip.trip_id, run.trip_id || "无"));
  rules.push(createRule(`TRIP-STRATEGY-ROUTE-RUN-${trip.trip_id}`, "Route 与路径规划执行记录策略必须一致", route.route_strategy_id === run.route_strategy_id, `${route.route_strategy_id || "无"} / ${run.route_strategy_id || "无"}`));
  rules.push(createRule(`TRIP-STRATEGY-HISTORY-${trip.trip_id}`, "Trip 路径历史策略必须与当前 Route 一致", latestHistory?.route_strategy_id === route.route_strategy_id, `${latestHistory?.route_strategy_id || "无"} / ${route.route_strategy_id || "无"}`));
  rules.push(createRule(`TRIP-ROUTE-STEPS-START-${trip.trip_id}`, "Trip Route 步骤起点必须正确", route.route_steps?.[0]?.cell_id === route.origin_cell_id, route.route_steps?.[0]?.cell_id || "无"));
  rules.push(createRule(`TRIP-ROUTE-STEPS-END-${trip.trip_id}`, "Trip Route 步骤终点必须正确", route.route_steps?.at(-1)?.cell_id === route.target_cell_id, route.route_steps?.at(-1)?.cell_id || "无"));
  return rules;
}

function validateUnique(tripIds, tripId) {
  if (!tripId) return createRule("TRIP-ID-MISSING", "服务履约记录编号不能为空", false, "发现缺少服务履约记录编号的记录");
  const passed = !tripIds.has(tripId);
  tripIds.add(tripId);
  return createRule(`TRIP-ID-${tripId}`, "服务履约记录编号必须唯一", passed, passed ? tripId : `${tripId} 重复`);
}

function createRule(ruleId, ruleName, passed, detail) {
  return {
    rule_id: ruleId,
    rule_name: ruleName,
    result: passed ? "PASS" : "FAIL",
    detail,
  };
}
