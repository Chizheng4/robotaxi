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

import { computeTimeContext, advanceTick, updateSimulationRunScene, isSimulationComplete } from "./simulationClock.js";

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
export function initSimulationRun({ simulationName, simulationPolicy, totalDays, tickMinutes }) {
  const run = createSimulationRun({
    simulationRunId: nextSimulationRunId(),
    simulationName,
    simulationPolicy,
    totalDays: totalDays || simulationPolicy.simulation_days,
    tickMinutes: tickMinutes || simulationPolicy.tick_minutes,
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
    message: `SimulationRun ${run.simulation_run_id} 已创建，状态：${SimulationStatus.READY}`,
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
    message: `SimulationRun ${updated.simulation_run_id} 已启动`,
  });

  return { simulationRun: updated, event };
}

/**
 * 暂停 SimulationRun（RUNNING → PAUSED）
 */
export function pauseSimulationRun(simulationRun) {
  if (simulationRun.simulation_status !== SimulationStatus.RUNNING) return null;
  return {
    simulationRun: {
      ...simulationRun,
      simulation_status: SimulationStatus.PAUSED,
      paused_at: new Date().toISOString(),
    },
  };
}

/**
 * 继续 SimulationRun（PAUSED → RUNNING）
 */
export function resumeSimulationRun(simulationRun) {
  if (simulationRun.simulation_status !== SimulationStatus.PAUSED) return null;
  return {
    simulationRun: {
      ...simulationRun,
      simulation_status: SimulationStatus.RUNNING,
      resumed_at: new Date().toISOString(),
    },
  };
}

/**
 * 停止 SimulationRun（RUNNING/PAUSED → STOPPED）
 */
export function stopSimulationRun(simulationRun) {
  if (![SimulationStatus.RUNNING, SimulationStatus.PAUSED].includes(simulationRun.simulation_status)) return null;
  return {
    simulationRun: {
      ...simulationRun,
      simulation_status: SimulationStatus.STOPPED,
      stopped_at: new Date().toISOString(),
    },
  };
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
export function completeTick(simulationRun, tickContext, supplySummary, demandSummary, tickEventSummary) {
  // 更新场景
  let updated = updateSimulationRunScene(simulationRun, tickContext, supplySummary, demandSummary);

  // 更新 Tick 事件摘要
  updated = {
    ...updated,
    current_tick_event_summary: tickEventSummary || null,
  };

  // 推进 Tick
  const tickMinutes = updated.tick_minutes || updated.simulation_policy_snapshot?.tick_minutes || 10;
  updated = advanceTick(updated, tickMinutes);

  const events = [];

  // 记录 Tick 完成事件
  events.push(createSimulationEvent({
    simulationEventId: nextSimulationEventId(),
    simulationRunId: updated.simulation_run_id,
    simulationDay: updated.current_day,
    simulationTime: updated.current_time,
    dayTick: updated.current_day_tick,
    globalTick: updated.current_global_tick,
    eventType: EventType.SIMULATION_TICK_COMPLETED,
    eventSource: EventSource.SIMULATION_SYSTEM,
    eventResult: EventResult.SUCCESS,
    message: `Tick ${updated.current_global_tick} 完成`,
  }));

  // 判断是否完成
  if (isSimulationComplete(updated)) {
    updated = {
      ...updated,
      simulation_status: SimulationStatus.COMPLETED,
      completed_at: new Date().toISOString(),
    };
    events.push(createSimulationEvent({
      simulationEventId: nextSimulationEventId(),
      simulationRunId: updated.simulation_run_id,
      simulationDay: updated.current_day,
      simulationTime: updated.current_time,
      dayTick: updated.current_day_tick,
      globalTick: updated.current_global_tick,
      eventType: EventType.SIMULATION_RUN_COMPLETED,
      eventSource: EventSource.SIMULATION_SYSTEM,
      eventResult: EventResult.SUCCESS,
      message: `SimulationRun ${updated.simulation_run_id} 已完成`,
    }));
  }

  return { simulationRun: updated, events };
}

// ============================================================================
// 2. SimulationEvent 工具
// ============================================================================

export { computeTimeContext, advanceTick, updateSimulationRunScene, isSimulationComplete } from "./simulationClock.js";
export { createSimulationEvent, SimulationStatus, EventSource, EventResult, EventType } from "../domain/simulationTypes.js";
