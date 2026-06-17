/**
 * ServiceOrder 服务层
 *
 * 从 main.jsx UI handler 中提取的业务逻辑，供 UI 和 Simulation System 两条路径复用。
 *
 * 提取原则：
 * - 不改业务逻辑，只改调用方式
 * - 入参为纯数据对象，不依赖 React state 闭包
 * - 返回结构化结果，由调用方决定如何写入 state
 */

import { runPricingEstimate } from "../data/pricingEngine.js";
import { runOrderMatching } from "../data/orderMatchingEngine.js";

// ============================================================================
// 1. 价格预估
// ============================================================================

/**
 * 执行服务订单价格预估
 *
 * @param {Object} params
 * @param {Object} params.serviceOrder - 服务订单对象
 * @param {Object} params.strategy - 定价策略
 * @param {Object} params.data - 全局数据（maps, routes 等）
 * @param {Object} params.routeEstimate - 估价路径信息 { route_id, estimated_distance_km, estimated_duration_min }
 * @param {string} params.pricingStrategyRunId - 定价执行 ID
 * @param {string} params.pricingDecisionId - 定价决策 ID
 * @param {string} params.createdAt - 创建时间
 * @returns {{ success: boolean, decision?: Object, run?: Object, failureReason?: string }}
 */
export function executePricing({
  serviceOrder,
  strategy,
  data,
  routeEstimate,
  pricingStrategyRunId,
  pricingDecisionId,
  createdAt,
}) {
  const result = runPricingEstimate({
    strategy,
    serviceOrder,
    data,
    pricingStrategyRunId,
    pricingDecisionId,
    routeEstimate,
    createdAt,
  });

  if (!result.decision) {
    return {
      success: false,
      run: result.run,
      failureReason: result.run?.failure_reason || "定价决策生成失败",
    };
  }

  return {
    success: true,
    decision: result.decision,
    run: result.run,
  };
}

// ============================================================================
// 2. 订单匹配
// ============================================================================

/**
 * 执行服务订单匹配
 *
 * @param {Object} params
 * @param {Object} params.strategy - 订单匹配策略
 * @param {Object} params.serviceOrder - 服务订单对象
 * @param {Object} params.data - 全局数据
 * @param {string} params.orderMatchingRunId - 匹配执行 ID
 * @param {string} params.orderMatchingDecisionId - 匹配决策 ID
 * @param {string} params.createdAt - 创建时间
 * @returns {{ success: boolean, decision?: Object, run?: Object, failureReason?: string }}
 */
export function executeOrderMatching({
  strategy,
  serviceOrder,
  data,
  orderMatchingRunId,
  orderMatchingDecisionId,
  createdAt,
}) {
  const result = runOrderMatching({
    strategy,
    serviceOrder,
    data,
    orderMatchingRunId,
    orderMatchingDecisionId,
    createdAt,
  });

  if (!result.decision || result.decision.decision_result !== "SUCCESS") {
    return {
      success: false,
      run: result.run,
      decision: result.decision,
      failureReason: result.run?.failure_reason || "订单匹配失败",
    };
  }

  return {
    success: true,
    decision: result.decision,
    run: result.run,
  };
}
