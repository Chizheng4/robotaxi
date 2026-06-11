import { TripStatus } from "../domain/tripTypes.js?v=20260611-v019-6-trip";

export function validateTrips(data) {
  const trips = data.trips || [];
  const orders = new Map((data.serviceOrders || []).map((order) => [order.service_order_id, order]));
  const robotaxis = new Map((data.robotaxis || []).map((robotaxi) => [robotaxi.robotaxi_id, robotaxi]));
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
    if (!["COMPLETED", "FAILED", "CANCELLED"].includes(trip.trip_status)) {
      const previousTripId = activeTripByRobotaxi.get(trip.robotaxi_id);
      rules.push(createRule(`TRIP-ROBOTAXI-ACTIVE-${trip.trip_id}`, "同一 Robotaxi 同一时间只能执行一个服务履约记录", !previousTripId, previousTripId ? `${trip.robotaxi_id} 已执行 ${previousTripId}` : trip.robotaxi_id));
      activeTripByRobotaxi.set(trip.robotaxi_id, trip.trip_id);
    }
  });

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
