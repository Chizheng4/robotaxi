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
import { advanceTimedOperations } from "./timedOperationScheduler.js";
import { getActiveWorkflowTimingProfile } from "./workflowRuntimeConfig.js";
import * as routePlanningService from "../services/routePlanningService.js";
import * as tripService from "../services/tripService.js";

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
  const isDraining = simulationRun.simulation_status === SimulationStatus.DRAINING;
  if (![SimulationStatus.RUNNING, SimulationStatus.DRAINING].includes(simulationRun.simulation_status)) {
    return null;
  }

  // 2. 计算当前 Tick 时间上下文
  const tickContext = computeTimeContext({
    currentSimulationSeconds: simulationRun.current_simulation_seconds,
    currentTime: simulationRun.current_time,
    currentDay: simulationRun.current_day,
    dayTick: simulationRun.current_day_tick,
    globalTick: simulationRun.current_global_tick,
    runTick: simulationRun.current_run_tick,
    tickSeconds: simulationRun.tick_seconds,
    policySnapshot,
  });

  // 3. 供给侧触发判断
  const supplyResult = isDraining
    ? createEmptySupplyResult()
    : runSupplyTrigger({ timeContext: tickContext, policySnapshot });

  // 4. 需求侧触发判断
  const tickRandomSeed = `${randomSeed ?? simulationRun.simulation_policy_snapshot?.random_seed ?? simulationRun.simulation_run_id}-${simulationRun.current_global_tick}`;
  const demandResult = isDraining
    ? createEmptyDemandResult()
    : runDemandTrigger({ timeContext: tickContext, policySnapshot, randomSeed: tickRandomSeed });

  // 5. 根据需求触发结果，构造 SERVICE_ORDER_CREATE 动作
  const timedOperationResult = advanceTimedOperations({
    timedOperations: businessData?.timedOperations || [],
    timeContext: tickContext,
  });
  const performanceConfig = policySnapshot?.simulation_performance_config || {};
  if (businessData?.setTimedOperations && timedOperationResult.changed) {
    businessData.setTimedOperations(timedOperationResult.timedOperations);
  }
  if (businessData) {
    applyTravelProgressFromTimedOperations({
      timedOperations: timedOperationResult.timedOperations,
      businessData,
      tickContext,
      performanceConfig,
      force: timedOperationResult.dueOperations.length > 0,
    });
  }
  const workflowTimingProfile = getActiveWorkflowTimingProfile(businessData?.workflowTimingProfiles || []);

  // 6. 根据需求触发结果，构造 SERVICE_ORDER_CREATE 动作
  const demandActions = [];
  if (!isDraining && businessData && demandResult.order_count > 0) {
    for (let i = 0; i < demandResult.order_count; i++) {
      demandActions.push({
        actionType: "SERVICE_ORDER_CREATE",
        objectId: null,
        triggeredBy: "DEMAND_TRIGGER",
        context: { tickContext, policySnapshot },
      });
    }
  }

  // 7. 供给侧点火动作
  const supplyActions = !isDraining && supplyResult?.actions ? supplyResult.actions : [];

  // 8. 先执行触发层动作（创建准入/投放任务 + 创建订单）
  const preActions = [...supplyActions, ...demandActions];
  let preExecutionResults = [];
  if (businessData && preActions.length > 0) {
    preExecutionResults = executeActions(preActions, businessData, {
      simulationRunId: simulationRun.simulation_run_id,
      globalTick: simulationRun.current_global_tick,
      tickContext,
      policySnapshot,
      workflowTimingProfile,
    });
  }

  // 9. 执行已经到期的时间作业，让 Route/Trip 的到达继续复用原业务闭环。
  const timedOperationActions = buildTimedOperationActions(timedOperationResult.dueOperations);
  let timedOperationExecutionResults = [];
  if (businessData && timedOperationActions.length > 0) {
    timedOperationExecutionResults = executeActions(timedOperationActions, businessData, {
      simulationRunId: simulationRun.simulation_run_id,
      globalTick: simulationRun.current_global_tick,
      tickContext,
      policySnapshot,
      workflowTimingProfile,
    });
  }

  // 10. 使用本 Tick 内已被 handler 同步写入的业务上下文，再查询工作流。
  // React state 异步刷新，不能依赖立即重新读取组件闭包。
  const refreshedBusinessData = businessData || (refreshBusinessData ? refreshBusinessData() : null);

  // 11. 查询工作流引擎：获取所有待执行的业务动作（含刚创建的订单的后续动作）
  const autoConfig = policySnapshot.service_order_auto_config || {};
  const defaultConfig = policySnapshot.default_completion_config || {};
  let workflowActions = [];
  if (refreshedBusinessData) {
    workflowActions = queryAllWorkflowRules({
      serviceOrders: refreshedBusinessData.serviceOrders || [],
      trips: refreshedBusinessData.trips || [],
      readinessTasks: refreshedBusinessData.readinessTasks || [],
      deploymentTasks: refreshedBusinessData.deploymentTasks || [],
      routeExecutions: refreshedBusinessData.routeExecutions || [],
      autoConfig,
      defaultCompletionConfig: defaultConfig,
    });
  }

  // 12. 通过执行引擎分发动作
  let executionResults = [];
  if (refreshedBusinessData && workflowActions.length > 0) {
    executionResults = executeActions(workflowActions, refreshedBusinessData, {
      simulationRunId: simulationRun.simulation_run_id,
      globalTick: simulationRun.current_global_tick,
      tickContext,
      policySnapshot,
      workflowTimingProfile,
    });
  }

  // 合并所有执行结果
  const allResults = [...preExecutionResults, ...timedOperationExecutionResults, ...executionResults];

  // 13. 汇总当前 Tick 摘要
  const tickEventSummary = buildTickEventSummary(supplyResult, demandResult, allResults, timedOperationResult.summary);

  return {
    tickContext,
    supplyResult,
    demandResult,
    workflowActions,
    executionResults: allResults,
    timedOperationResult,
    tickEventSummary,
    phase: isDraining ? SimulationStatus.DRAINING : SimulationStatus.RUNNING,
    workflowActionCount: workflowActions.length,
  };
}

function buildTimedOperationActions(dueOperations = []) {
  return dueOperations
    .filter((operation) => operation?.action_type && operation.object_type && operation.object_id)
    .map((operation) => ({
      objectType: operation.object_type,
      objectId: operation.object_id,
      actionType: operation.action_type,
      fromState: operation.operation_status,
      triggeredBy: "TIMED_OPERATION",
      timedOperationId: operation.timed_operation_id,
      operation_payload: operation.operation_payload,
    }));
}

function applyTravelProgressFromTimedOperations({ timedOperations = [], businessData, tickContext = {}, performanceConfig = {}, force = false }) {
  if (!force && !isUiSnapshotTick(tickContext, performanceConfig)) return;
  const travelOperations = timedOperations.filter((operation) =>
    operation?.operation_type === "TRAVEL" &&
    ["RUNNING", "COMPLETED"].includes(operation.operation_status)
  );
  if (travelOperations.length === 0) return;

  const routes = businessData.routes || businessData.data?.routes || [];
  let nextRouteExecutions = businessData.routeExecutions || [];
  let routeExecutionChanged = false;
  let nextTrips = businessData.trips || [];
  let tripChanged = false;

  for (const operation of travelOperations) {
    const routeId = operation.operation_payload?.route_id;
    const route = routes.find((item) => item.route_id === routeId);
    if (!route) continue;

    if (operation.object_type === "routeExecution") {
      nextRouteExecutions = nextRouteExecutions.map((execution) => {
        if (execution.route_execution_id !== operation.object_id) return execution;
        const projected = routePlanningService.projectRouteExecutionTravelProgress({
          execution,
          route,
          elapsedSeconds: operation.elapsed_seconds,
          cellTravelSeconds: operation.operation_payload?.cell_travel_seconds,
        });
        if (!projected) return execution;
        routeExecutionChanged = true;
        return projected;
      });
    }

    if (operation.object_type === "trip") {
      nextTrips = nextTrips.map((trip) => {
        if (trip.trip_id !== operation.object_id) return trip;
        const projected = tripService.projectTripTravelProgress(
          trip,
          { ...businessData, routes },
          operation.elapsed_seconds,
          { cellTravelSeconds: operation.operation_payload?.cell_travel_seconds },
        );
        if (!projected) return trip;
        tripChanged = true;
        return projected;
      });
    }
  }

  if (routeExecutionChanged && typeof businessData.setRouteExecutions === "function") {
    businessData.setRouteExecutions(() => nextRouteExecutions);
  }
  if (tripChanged && typeof businessData.setTrips === "function") {
    businessData.setTrips(() => nextTrips);
  }
}

function isUiSnapshotTick(tickContext = {}, performanceConfig = {}) {
  const interval = Math.max(1, Number(performanceConfig.ui_snapshot_interval_seconds) || 30);
  const seconds = Number(tickContext.current_simulation_seconds ?? tickContext.simulation_seconds ?? 0);
  return Number.isFinite(seconds) && seconds % interval === 0;
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

function buildTickEventSummary(supplyResult, demandResult, executionResults = [], timedOperationSummary = null) {
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
    timed_operation_summary: timedOperationSummary,
  };
}

function createEmptySupplyResult() {
  return {
    triggered_event_count: 0,
    no_action_count: 0,
    readiness_triggered: false,
    deployment_triggered: false,
    actions: [],
  };
}

function createEmptyDemandResult() {
  return {
    order_count: 0,
    triggered_event_count: 0,
    demand_profile_id: null,
    actions: [],
  };
}
