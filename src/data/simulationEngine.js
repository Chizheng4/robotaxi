/**
 * Simulation Engine：模拟运行管理
 *
 * 管理 SimulationRun 生命周期和 SimulationEvent 记录。
 * 参考文档：doc/08-simulation-system/01-simulation-runtime/02-simulation-run.md
 *           doc/08-simulation-system/01-simulation-runtime/03-simulation-event.md
 */

import {
  SimulationStatus,
  EventSource,
  EventResult,
  EventType,
  createSimulationRun,
  createSimulationEvent,
} from "../domain/simulationTypes.js";

import { computeTimeContext, advanceTick, formatSimulationTimestamp, updateSimulationRunScene, isSimulationComplete } from "./simulationClock.js";

// ============================================================================
// 1. SimulationRun 生命周期管理
// ============================================================================

let nextRunIdCounter = 1;
let nextEventIdCounter = 1;

export function resetSimulationCounters() {
  nextRunIdCounter = 1;
  nextEventIdCounter = 1;
}

function nextSimulationRunId() {
  return `SIM-RUN-${String(nextRunIdCounter++).padStart(3, "0")}`;
}

function nextSimulationEventId() {
  return `SE-${String(nextEventIdCounter++).padStart(4, "0")}`;
}

/**
 * 初始化 SimulationRun（创建后状态为 READY）
 *
 * @param {Object} params
 * @param {string} params.simulationName - 运行名称
 * @param {Object} params.simulationPolicy - 引用的 SimulationPolicy
 * @param {number} [params.totalDays] - 模拟天数（默认从 Policy 读取）
 * @param {number} [params.tickMinutes] - 每 Tick 分钟数（默认从 Policy 读取）
 * @returns {Object} { simulationRun, event }
 */
export function initSimulationRun({ simulationName, simulationPolicy, totalDays, tickMinutes, previousSimulationRun = null }) {
  const startSimulationSeconds = Number(previousSimulationRun?.simulation_end_seconds);
  const inheritedStartSeconds = Number.isFinite(startSimulationSeconds)
    ? startSimulationSeconds
    : Number(previousSimulationRun?.current_simulation_seconds) || 0;
  const run = createSimulationRun({
    simulationRunId: nextSimulationRunId(),
    simulationName,
    simulationPolicy,
    totalDays: totalDays || simulationPolicy.simulation_days,
    tickMinutes: tickMinutes || simulationPolicy.tick_minutes,
    startSimulationSeconds: inheritedStartSeconds,
    startGlobalTick: previousSimulationRun?.current_global_tick || 0,
    simulationTimelineId: previousSimulationRun?.simulation_timeline_id || "SIM-TIMELINE-001",
    previousSimulationRunId: previousSimulationRun?.simulation_run_id || null,
  });

  const event = createSimulationEvent({
    simulationEventId: nextSimulationEventId(),
    simulationRunId: run.simulation_run_id,
    simulationDay: run.current_day,
    simulationTime: run.current_time,
    dayTick: run.current_day_tick,
    globalTick: run.current_global_tick,
    eventType: EventType.SIMULATION_RUN_STARTED,
    eventSource: EventSource.SIMULATION_SYSTEM,
    message: `模拟运行 ${run.simulation_run_id} 已创建，状态：就绪`,
  });

  return { simulationRun: run, event };
}

/**
 * 启动 SimulationRun（READY → RUNNING）
 *
 * @param {Object} simulationRun - 当前 SimulationRun
 * @returns {{ simulationRun: Object, event: Object }}
 */
export function startSimulationRun(simulationRun) {
  if (simulationRun.simulation_status !== SimulationStatus.READY) {
    return null;
  }

  const updated = {
    ...simulationRun,
    simulation_status: SimulationStatus.RUNNING,
    started_at: new Date().toISOString(),
  };

  const event = createSimulationEvent({
    simulationEventId: nextSimulationEventId(),
    simulationRunId: updated.simulation_run_id,
    simulationDay: updated.current_day,
    simulationTime: updated.current_time,
    dayTick: updated.current_day_tick,
    globalTick: updated.current_global_tick,
    eventType: EventType.SIMULATION_RUN_STARTED,
    eventSource: EventSource.SIMULATION_SYSTEM,
    eventResult: EventResult.SUCCESS,
    message: `模拟运行 ${updated.simulation_run_id} 已启动`,
  });

  return { simulationRun: updated, event };
}

/**
 * 暂停 SimulationRun（RUNNING → PAUSED）
 */
export function pauseSimulationRun(simulationRun) {
  if (simulationRun.simulation_status !== SimulationStatus.RUNNING) return null;
  const updated = { ...simulationRun, simulation_status: SimulationStatus.PAUSED, paused_at: new Date().toISOString() };
  const event = createSimulationEvent({
    simulationEventId: nextSimulationEventId(), simulationRunId: updated.simulation_run_id,
    simulationDay: updated.current_day, simulationTime: updated.current_time,
    dayTick: updated.current_day_tick, globalTick: updated.current_global_tick,
    eventType: EventType.SIMULATION_RUN_PAUSED, eventSource: EventSource.SIMULATION_SYSTEM,
    eventResult: EventResult.SUCCESS,
    message: `模拟运行 ${updated.simulation_run_id} 已暂停 | Day ${updated.current_day} ${updated.current_time} | Tick #${updated.current_global_tick}`,
  });
  return { simulationRun: updated, event };
}

/**
 * 继续 SimulationRun（PAUSED → RUNNING）
 */
export function resumeSimulationRun(simulationRun) {
  if (simulationRun.simulation_status !== SimulationStatus.PAUSED) return null;
  const updated = { ...simulationRun, simulation_status: SimulationStatus.RUNNING, resumed_at: new Date().toISOString() };
  const event = createSimulationEvent({
    simulationEventId: nextSimulationEventId(), simulationRunId: updated.simulation_run_id,
    simulationDay: updated.current_day, simulationTime: updated.current_time,
    dayTick: updated.current_day_tick, globalTick: updated.current_global_tick,
    eventType: EventType.SIMULATION_RUN_RESUMED, eventSource: EventSource.SIMULATION_SYSTEM,
    eventResult: EventResult.SUCCESS,
    message: `模拟运行 ${updated.simulation_run_id} 已继续 | Day ${updated.current_day} ${updated.current_time} | Tick #${updated.current_global_tick}`,
  });
  return { simulationRun: updated, event };
}

/**
 * 停止 SimulationRun（RUNNING/PAUSED → STOPPED）
 */
export function stopSimulationRun(simulationRun) {
  if (![SimulationStatus.RUNNING, SimulationStatus.PAUSED].includes(simulationRun.simulation_status)) return null;
  const updated = {
    ...simulationRun,
    simulation_status: SimulationStatus.STOPPED,
    stopped_at: new Date().toISOString(),
    simulation_end_seconds: simulationRun.current_simulation_seconds,
    simulation_end_at: formatSimulationTimestamp(simulationRun.current_simulation_seconds),
  };
  const event = createSimulationEvent({
    simulationEventId: nextSimulationEventId(), simulationRunId: updated.simulation_run_id,
    simulationDay: updated.current_day, simulationTime: updated.current_time,
    dayTick: updated.current_day_tick, globalTick: updated.current_global_tick,
    eventType: EventType.SIMULATION_RUN_STOPPED, eventSource: EventSource.SIMULATION_SYSTEM,
    eventResult: EventResult.SUCCESS,
    message: `模拟运行 ${updated.simulation_run_id} 已停止 | Day ${updated.current_day} ${updated.current_time} | Tick #${updated.current_global_tick}`,
  });
  return { simulationRun: updated, event };
}

/**
 * 完成一个 Tick 的推进
 *
 * @param {Object} simulationRun
 * @param {Object} tickContext - computeTimeContext 的返回值
 * @param {Object|null} supplySummary
 * @param {Object|null} demandSummary
 * @param {Object|null} tickEventSummary
 * @returns {{ simulationRun: Object, events: Object[] }}
 */
export function completeTick(simulationRun, tickContext, supplyResult, demandResult, executionResults, tickEventSummary) {
  // 更新场景
  let updated = updateSimulationRunScene(simulationRun, tickContext, supplyResult, demandResult);

  const events = [];
  const tick = (Number(tickContext?.global_tick) || 0) + 1;
  const day = tickContext?.current_day || updated.current_day;
  const time = tickContext?.current_time || updated.current_time;
  const dayT = tickContext?.day_tick ?? updated.current_day_tick;
  const runId = updated.simulation_run_id;

  // === Phase 1: TICK_STARTED ===
  events.push(makeEvent(runId, day, time, dayT, tick, EventType.SIMULATION_TICK_STARTED, EventSource.SIMULATION_SYSTEM, EventResult.SUCCESS,
    `Tick #${tick} 开始 | ${time} | 时段 ${tickContext?.period_type || tickContext?.time_period || 'N/A'}`));

  // === Phase 2: SUPPLY_TRIGGER ===
  if (supplyResult) {
    const triggered = supplyResult.triggered_event_count || 0;
    const noAction = supplyResult.no_action_count || 0;
    const readinessMsg = supplyResult.readiness_triggered ? '准入检查已触发' : '准入检查跳过';
    const deploymentMsg = supplyResult.deployment_triggered ? '投放已触发' : '投放跳过';
    events.push(makeEvent(runId, day, time, dayT, tick, EventType.SUPPLY_TRIGGER_COMPLETED, EventSource.SUPPLY_TRIGGER,
      triggered > 0 ? EventResult.SUCCESS : EventResult.NO_ACTION,
      `供给侧触发：${readinessMsg}、${deploymentMsg} | 触发 ${triggered} 无动作 ${noAction}`));
  }

  // === Phase 3: DEMAND_TRIGGER ===
  if (demandResult) {
    const count = demandResult.order_count || 0;
    const profileName = demandResult.demand_profile_id ? String(demandResult.demand_profile_id).replace(/^DP-/, '') : '无';
    events.push(makeEvent(runId, day, time, dayT, tick, EventType.DEMAND_TRIGGER_COMPLETED, EventSource.DEMAND_TRIGGER,
      count > 0 ? EventResult.SUCCESS : EventResult.NO_ACTION,
      `需求侧触发：${count > 0 ? `生成 ${count} 个订单请求` : '当前时段无需求'}（配置 ${profileName}）`));
  }

  // === Phase 4: WORKFLOW + EXECUTION ===
  const execResults = executionResults || [];
  if (execResults.length > 0) {
    const succeeded = execResults.filter((r) => r.success).length;
    const failed = execResults.filter((r) => !r.success).length;
    events.push(makeEvent(runId, day, time, dayT, tick, EventType.WORKFLOW_QUERIED, EventSource.EXECUTION_ENGINE, EventResult.SUCCESS,
      `工作流执行：${execResults.length} 个动作（成功 ${succeeded} / 失败 ${failed}）`));

    for (const execResult of execResults) {
      const evtResult = execResult.success ? EventResult.SUCCESS : EventResult.FAILED;
      const actionLabel = getActionLabel(execResult.actionType || '');
      const detail = execResult.message || (execResult.success ? '成功' : '失败');
      const resultData = execResult.data?.data || execResult.data || {};
      const relatedObjectType = resultData.objectType || execResult.objectType || null;
      const relatedObjectId = resultData.objectId || execResult.objectId || null;
      const failureReason = !execResult.success ? (resultData.failureReason || execResult.message || "执行失败") : null;
      events.push(makeEvent(runId, day, time, dayT, tick, execResult.actionType || EventType.ACTION_EXECUTED, EventSource.EXECUTION_ENGINE,
        evtResult, `[${actionLabel}] ${detail}`, {
          relatedObjectType,
          relatedObjectId,
          failureReason,
          payload: {
            action_type: execResult.actionType || null,
            action_label: actionLabel,
            result_type: execResult.resultType || null,
            success: Boolean(execResult.success),
            from_state: execResult.fromState || null,
            triggered_by: execResult.triggeredBy || null,
            service_order_id: resultData.serviceOrderId || (relatedObjectType === "serviceOrder" ? relatedObjectId : null),
            trip_id: resultData.objectType === "trip" ? resultData.objectId : null,
            task_id: ["readinessTask", "deploymentTask"].includes(resultData.objectType) ? resultData.objectId : null,
            route_execution_id: resultData.routeExecutionId || (resultData.objectType === "routeExecution" ? resultData.objectId : null),
            robotaxi_id: resultData.robotaxiId || null,
          },
        }));
    }
  }

  // === Phase 5: TICK_COMPLETED ===
  const created = execResults.filter((r) => r.resultType === 'ORDER_CREATED').length;
  const succeeded = execResults.filter((r) => r.success).length;
  const failed = execResults.filter((r) => !r.success).length;
  updated = { ...updated, current_tick_event_summary: tickEventSummary || null };
  events.push(makeEvent(runId, day, time, dayT, tick, EventType.SIMULATION_TICK_COMPLETED, EventSource.SIMULATION_SYSTEM, EventResult.SUCCESS,
    `Tick #${tick} 完成 | 创建 ${created} 订单 | 执行 ${execResults.length} 动作（成功 ${succeeded} / 失败 ${failed}）`));

  // 所有事件使用本 Tick 实际发生时刻，记录完成后再推进运行游标。
  updated = advanceTick(updated, { tickSeconds: tickContext?.tick_seconds, phase: "RUNNING" });

  // 判断是否完成
  if (isSimulationComplete(updated)) {
    updated = {
      ...updated,
      simulation_status: SimulationStatus.COMPLETED,
      completed_at: new Date().toISOString(),
      simulation_end_seconds: updated.current_simulation_seconds,
      simulation_end_at: formatSimulationTimestamp(updated.current_simulation_seconds),
    };
    events.push(makeEvent(runId, updated.current_day, updated.current_time, updated.current_day_tick, updated.current_global_tick, EventType.SIMULATION_RUN_COMPLETED, EventSource.SIMULATION_SYSTEM, EventResult.SUCCESS,
      `模拟运行 ${runId} 已完成`));
  }

  return { simulationRun: updated, events };
}

function makeEvent(runId, day, time, dayTick, globalTick, eventType, eventSource, eventResult, message, options = {}) {
  return createSimulationEvent({
    simulationEventId: nextSimulationEventId(),
    simulationRunId: runId, simulationDay: day, simulationTime: time,
    dayTick,
    globalTick,
    eventType,
    eventSource,
    eventResult,
    relatedObjectType: options.relatedObjectType || null,
    relatedObjectId: options.relatedObjectId || null,
    failureReason: options.failureReason || null,
    skipReason: options.skipReason || null,
    message,
    eventPayload: options.payload || null,
  });
}

function getActionLabel(actionType) {
  const labels = {
    SERVICE_ORDER_CREATE: "创建订单", PRICING_EXECUTE: "定价执行", ROBOTAXI_CALL: "客户确认",
    ORDER_MATCHING_EXECUTE: "匹配执行", TRIP_STEP_EXECUTE: "履约推进", SETTLEMENT_EXECUTE: "结算执行",
    PAYMENT_EXECUTE: "支付执行", READINESS_TASK_ASSIGN: "准入分配", READINESS_TASK_START: "准入开始",
    READINESS_TASK_PASS: "准入通过", ROUTE_PLAN: "路径规划", ROUTE_EXECUTION_STEP: "行驶步进",
    ARRIVAL_CONFIRM: "到达确认", DEPLOYMENT_TASK_CREATE: "创建投放任务", READINESS_TASK_CREATE: "创建准入任务",
  };
  return labels[actionType] || actionType;
}

// ============================================================================
// 2. SimulationEvent 工具
// ============================================================================

export { computeTimeContext, advanceTick, updateSimulationRunScene, isSimulationComplete } from "./simulationClock.js";
export { createSimulationEvent, SimulationStatus, EventSource, EventResult, EventType } from "../domain/simulationTypes.js";
