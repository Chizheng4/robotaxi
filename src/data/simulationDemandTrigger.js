/**
 * DemandTrigger：需求侧事件触发
 *
 * 根据模拟时间上下文和 DemandProfile 配置，使用 Poisson 分布生成订单数量。
 * 本模块只计算"生成多少订单"，不执行订单创建（由 ExecutionEngine 分发）。
 *
 * 参考文档：doc/08-simulation-system/01-simulation-runtime/06-demand-trigger.md
 */

import { DistributionType } from "../domain/simulationTypes.js";

/**
 * 执行需求侧触发判断
 *
 * @param {Object} params
 * @param {Object} params.timeContext - computeTimeContext 的返回值
 * @param {Object} params.policySnapshot - simulation_policy_snapshot
 * @param {number} [params.randomSeed] - 随机种子（用于复现）
 * @returns {Object} 需求触发结果 { orderCount, demandProfileId, actions }
 */
export function runDemandTrigger({ timeContext, policySnapshot, randomSeed }) {
  const dgConfig = policySnapshot.demand_generation_config || {};

  if (!dgConfig.demand_generation_enabled) {
    return { order_count: 0, demand_profile_id: null, actions: [] };
  }

  const demandProfileId = timeContext.demand_profile_id;
  if (!demandProfileId) {
    return { order_count: 0, demand_profile_id: null, actions: [] };
  }

  const profile = (policySnapshot.demand_profiles || []).find(
    (p) => p.demand_profile_id === demandProfileId
  );

  if (!profile) {
    return { order_count: 0, demand_profile_id: demandProfileId, actions: [] };
  }

  const orderCount = generateOrderCount(profile, randomSeed);
  const globalMax = dgConfig.max_orders_per_tick_global || 999;
  const actualCount = Math.min(orderCount, globalMax);

  return {
    order_count: actualCount,
    demand_profile_id: demandProfileId,
    actions: actualCount > 0
      ? [{ action_type: "DEMAND_ORDER_GENERATE", count: actualCount, demand_profile_id: demandProfileId }]
      : [{ action_type: "DEMAND_NO_ORDER", count: 0 }],
  };
}

/**
 * 根据 DemandProfile 生成订单数量
 */
function generateOrderCount(profile, randomSeed) {
  const seed = normalizeSeed(randomSeed);
  if (profile.distribution_type === DistributionType.FIXED) {
    return profile.lambda || 0;
  }

  if (profile.distribution_type === DistributionType.POISSON) {
    const lambda = profile.lambda || 0;
    const count = poissonRandom(lambda, seed);
    return Math.max(profile.min_orders_per_tick || 0, Math.min(count, profile.max_orders_per_tick || 999));
  }

  // UNIFORM
  const min = profile.min_orders_per_tick || 0;
  const max = profile.max_orders_per_tick || 0;
  const pseudoRandom = ((seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  return Math.floor(min + pseudoRandom * (max - min + 1));
}

function normalizeSeed(randomSeed) {
  if (typeof randomSeed === "number" && Number.isFinite(randomSeed)) return randomSeed;
  const input = String(randomSeed || Date.now());
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Poisson 分布随机数生成（Knuth 算法）
 */
function poissonRandom(lambda, randomSeed) {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  let seed = randomSeed || Date.now();

  do {
    k++;
    seed = (seed * 1103515245 + 12345) % 2147483648;
    p *= seed / 2147483648;
  } while (p > L);

  return k - 1;
}
