/**
 * SimulationLoop：Tick 主循环
 *
 * 按 Tick 编排供应侧、需求侧和业务对象推进的执行顺序。
 * 本模块负责调度顺序，不执行业务逻辑。
 *
 * 参考文档：doc/08-simulation-system/01-simulation-runtime/07-simulation-loop.md
 */

import { SimulationStatus } from "../domain/simulationTypes.js";
import { computeTimeContext } from "./simulationClock.js";
import { runSupplyTrigger } from "./simulationSupplyTrigger.js";
import { runDemandTrigger } from "./simulationDemandTrigger.js";

/**
 * 执行一个 SimulationTick
 *
 * @param {Object} params
 * @param {Object} params.simulationRun - 当前 SimulationRun
 * @param {Object} params.policySnapshot - simulation_policy_snapshot
 * @param {number} [params.randomSeed] - 随机种子
 * @returns {Object} { tickContext, supplyResult, demandResult, tickEventSummary }
 */
export function executeTick({ simulationRun, policySnapshot, randomSeed }) {
  // 1. 校验 SimulationRun 状态
  if (simulationRun.simulation_status !== SimulationStatus.RUNNING) {
    return null;
  }

  // 2. 计算当前 Tick 时间上下文
  const tickContext = computeTimeContext({
    currentTime: simulationRun.current_time,
    currentDay: simulationRun.current_day,
    dayTick: simulationRun.current_day_tick,
    globalTick: simulationRun.current_global_tick,
    policySnapshot,
  });

  // 3. 供给侧触发判断
  const supplyResult = runSupplyTrigger({ timeContext: tickContext, policySnapshot });

  // 4. 需求侧触发判断
  const demandResult = runDemandTrigger({ timeContext: tickContext, policySnapshot, randomSeed });

  // 5. 汇总当前 Tick 摘要
  const tickEventSummary = buildTickEventSummary(supplyResult, demandResult);

  return {
    tickContext,
    supplyResult,
    demandResult,
    tickEventSummary,
  };
}

/**
 * 执行顺序（14 步）：
 *
 *   1. 校验 SimulationRun 是否 RUNNING
 *   2. 读取 simulation_policy_snapshot
 *   3. 生成当前 SimulationClock 上下文
 *   4. 触发 RouteExecution 推进事件        → v023.5 ExecutionEngine
 *   5. 触发 Trip 推进事件                  → v023.5 ExecutionEngine
 *   6. 触发 ServiceOrder 自动推进事件       → v023.5 ExecutionEngine
 *   7. 触发 SupplyTrigger 判断
 *   8. 触发 DemandTrigger 判断
 *   9. 汇总当前 Tick 事件结果
 *  10. 更新 SimulationRun 场景摘要
 *  11. 推进 current_tick / current_time
 *  12. 记录 SIMULATION_TICK_COMPLETED
 *  13. 判断是否到达 total_ticks
 *
 * 注：步骤 4-6 依赖 ExecutionEngine（v023.5），当前先输出触发结果，
 *      实际执行由 v023.5 整合时串联。
 */

function buildTickEventSummary(supplyResult, demandResult) {
  return {
    triggered_supply_events: supplyResult.triggered_event_count || 0,
    triggered_demand_events: demandResult.order_count > 0 ? 1 : 0,
    created_service_orders: demandResult.order_count || 0,
    completed_service_orders: 0,
    completed_trips: 0,
    completed_route_executions: 0,
    no_action_events: supplyResult.no_action_count || 0,
    failed_events: 0,
  };
}
