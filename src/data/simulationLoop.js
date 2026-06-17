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
import { queryAllWorkflowRules } from "./simulationWorkflowEngine.js";
import { executeActions } from "./simulationExecutionEngine.js";

/**
 * 执行一个 SimulationTick
 *
 * @param {Object} params
 * @param {Object} params.simulationRun - 当前 SimulationRun
 * @param {Object} params.policySnapshot - simulation_policy_snapshot
 * @param {number} [params.randomSeed] - 随机种子
 * @param {Object} [params.businessData] - 业务数据上下文（serviceOrders, trips 等）
 * @param {Function} [params.refreshBusinessData] - 刷新业务数据（在需求执行后调用，获取最新订单等）
 * @returns {Object} { tickContext, supplyResult, demandResult, workflowActions, executionResults, tickEventSummary }
 */
export function executeTick({ simulationRun, policySnapshot, randomSeed, businessData, refreshBusinessData }) {
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

  // 5. 根据需求触发结果，构造 SERVICE_ORDER_CREATE 动作
  const demandActions = [];
  if (businessData && demandResult.order_count > 0) {
    for (let i = 0; i < demandResult.order_count; i++) {
      demandActions.push({
        actionType: "SERVICE_ORDER_CREATE",
        objectId: null,
        triggeredBy: "DEMAND_TRIGGER",
        context: { tickContext, policySnapshot },
      });
    }
  }

  // 5. 供给侧点火动作
  const supplyActions = (supplyResult && supplyResult.actions) ? supplyResult.actions : [];

  // 6. 先执行触发层动作（创建准入/投放任务 + 创建订单）
  const preActions = [...supplyActions, ...demandActions];
  let preExecutionResults = [];
  if (businessData && preActions.length > 0) {
    preExecutionResults = executeActions(preActions, businessData, {
      simulationRunId: simulationRun.simulation_run_id,
      globalTick: simulationRun.current_global_tick,
      policySnapshot,
    });
  }

  // 7. 刷新业务数据（包含刚创建的单据），再查询工作流
  const refreshedBusinessData = refreshBusinessData ? refreshBusinessData() : businessData;

  // 7. 查询工作流引擎：获取所有待执行的业务动作（含刚创建的订单的后续动作）
  const autoConfig = policySnapshot.service_order_auto_config || {};
  const defaultConfig = policySnapshot.default_completion_config || {};
  let workflowActions = [];
  if (refreshedBusinessData) {
    workflowActions = queryAllWorkflowRules({
      serviceOrders: refreshedBusinessData.serviceOrders || [],
      trips: refreshedBusinessData.trips || [],
      readinessTasks: refreshedBusinessData.readinessTasks || [],
      routeExecutions: refreshedBusinessData.routeExecutions || [],
      autoConfig,
      defaultCompletionConfig: defaultConfig,
    });
  }

  // 8. 通过执行引擎分发动作
  let executionResults = [];
  if (refreshedBusinessData && workflowActions.length > 0) {
    executionResults = executeActions(workflowActions, refreshedBusinessData, {
      simulationRunId: simulationRun.simulation_run_id,
      globalTick: simulationRun.current_global_tick,
      policySnapshot,
    });
  }

  // 合并所有执行结果
  const allResults = [...preExecutionResults, ...executionResults];

  // 9. 汇总当前 Tick 摘要
  const tickEventSummary = buildTickEventSummary(supplyResult, demandResult, allResults);

  return {
    tickContext,
    supplyResult,
    demandResult,
    workflowActions,
    executionResults: allResults,
    tickEventSummary,
  };
}

/**
 * 执行顺序（14 步）：
 *
 *   1. 校验 SimulationRun 是否 RUNNING
 *   2. 生成当前 SimulationClock 上下文
 *   3. 触发 SupplyTrigger 判断
 *   4. 触发 DemandTrigger 判断
 *   5. 查询 WorkflowEngine 获取待执行动作
 *   6. 通过 ExecutionEngine 分发执行业务动作
 *   7. 汇总当前 Tick 事件结果
 *   8. 更新 SimulationRun 场景摘要
 *   9. 推进 current_tick / current_time
 *  10. 记录 SIMULATION_TICK_COMPLETED
 *  11. 判断是否到达 total_ticks
 */

function buildTickEventSummary(supplyResult, demandResult, executionResults = []) {
  const succeeded = executionResults.filter((r) => r.success).length;
  const failed = executionResults.filter((r) => !r.success).length;
  return {
    triggered_supply_events: supplyResult.triggered_event_count || 0,
    triggered_demand_events: demandResult.order_count > 0 ? 1 : 0,
    created_service_orders: demandResult.order_count || 0,
    workflow_actions: executionResults.length,
    succeeded_actions: succeeded,
    failed_actions: failed,
    completed_service_orders: 0,
    completed_trips: 0,
    completed_route_executions: 0,
    no_action_events: supplyResult.no_action_count || 0,
  };
}
