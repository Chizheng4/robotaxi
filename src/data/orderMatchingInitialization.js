import {
  OrderMatchingAlgorithm,
  OrderMatchingStrategyStatus,
  createOrderMatchingStrategy,
} from "../domain/orderMatchingTypes.js?v=20260611-v019-5-order-matching";

export function initializeOrderMatching() {
  return {
    orderMatchingStrategies: [
      createOrderMatchingStrategy({
        order_matching_strategy_id: "OMS-001",
        strategy_name: "最近可用车辆匹配策略",
        strategy_type: "BASIC_ORDER_MATCHING",
        matching_algorithm: OrderMatchingAlgorithm.BASIC_NEAREST_AVAILABLE_ROBOTAXI,
        candidate_filter_rule: "筛选可运营、无当前订单、无当前任务且电量不低于 20% 的 Robotaxi",
        distance_rule: "使用 Cell 曼哈顿距离近似接驾距离",
        battery_rule: "battery_percent >= 20",
        scoring_rule: "matching_score = 1 / (1 + estimated_pickup_distance_km)，同分时电量高者优先",
        min_battery_threshold: 20,
        strategy_status: OrderMatchingStrategyStatus.ACTIVE,
        created_at: "2026-06-11T00:00:00.000Z",
      }),
    ],
  };
}
