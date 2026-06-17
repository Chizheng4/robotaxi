/**
 * SimulationClock：模拟时间上下文计算
 *
 * 根据当前模拟时间和 SimulationPolicy snapshot 计算时间语境。
 * 参考文档：doc/08-simulation-system/01-simulation-runtime/01-simulation-time.md
 */

import { TimePeriod, PeriodType } from "../domain/simulationTypes.js";

/**
 * 计算当前 Tick 的时间上下文
 *
 * @param {Object} params
 * @param {string} params.currentTime - 当前模拟时间 "HH:MM"
 * @param {number} params.currentDay - 当前模拟第几天
 * @param {number} params.dayTick - 当天 Tick
 * @param {number} params.globalTick - 全局 Tick
 * @param {Object} params.policySnapshot - simulation_policy_snapshot
 * @returns {Object} 时间上下文
 */
export function computeTimeContext({ currentTime, currentDay, dayTick, globalTick, policySnapshot }) {
  const timePeriod = getTimePeriod(currentTime, policySnapshot);
  const timeWindow = getTimeWindow(currentTime, policySnapshot);
  const periodType = timeWindow?.period_type || PeriodType.NORMAL;
  const isWorkerWorkingTime = isWithinTimeRange(currentTime, policySnapshot.worker_work_start_time, policySnapshot.worker_work_end_time);
  const isRobotaxiOperatingTime = isWithinTimeRange(currentTime, policySnapshot.robotaxi_operating_start_time, policySnapshot.robotaxi_operating_end_time);

  return {
    current_time: currentTime,
    current_day: currentDay,
    day_tick: dayTick,
    global_tick: globalTick,
    time_period: timePeriod,
    period_type: periodType,
    time_window: timeWindow?.time_window || null,
    demand_profile_id: timeWindow?.demand_profile_id || null,
    is_worker_working_time: isWorkerWorkingTime,
    is_robotaxi_operating_time: isRobotaxiOperatingTime,
  };
}

/**
 * 更新当前场景摘要（写入 SimulationRun）
 *
 * @param {Object} simulationRun - 当前 SimulationRun 对象
 * @param {Object} context - 时间上下文（computeTimeContext 的返回值）
 * @param {Object} supplySummary - 供给侧触发摘要（可选）
 * @param {Object} demandSummary - 需求侧触发摘要（可选）
 * @returns {Object} 更新后的 SimulationRun
 */
export function updateSimulationRunScene(simulationRun, context, supplySummary = null, demandSummary = null) {
  return {
    ...simulationRun,
    current_time_period: context.time_period,
    current_period_type: context.period_type,
    current_supply_scene: supplySummary,
    current_demand_scene: demandSummary,
    current_scene_summary: buildSceneSummary(context, supplySummary, demandSummary),
  };
}

/**
 * 推进 Tick（更新模拟时间）
 *
 * @param {Object} simulationRun - 当前 SimulationRun
 * @param {number} tickMinutes - 每 Tick 分钟数
 * @returns {Object} 更新后的 SimulationRun
 */
export function advanceTick(simulationRun, tickMinutes) {
  const currentMinutes = timeToMinutes(simulationRun.current_time);
  const nextMinutes = currentMinutes + tickMinutes;

  if (nextMinutes >= 24 * 60) {
    return {
      ...simulationRun,
      current_day: simulationRun.current_day + 1,
      current_time: "00:00",
      current_day_tick: 0,
      current_global_tick: simulationRun.current_global_tick + 1,
    };
  }

  return {
    ...simulationRun,
    current_time: minutesToTime(nextMinutes),
    current_day_tick: simulationRun.current_day_tick + 1,
    current_global_tick: simulationRun.current_global_tick + 1,
  };
}

/**
 * 判断 SimulationRun 是否已完成
 */
export function isSimulationComplete(simulationRun) {
  return simulationRun.current_global_tick >= simulationRun.total_ticks;
}

// ============================================================================
// 辅助函数
// ============================================================================

function getTimePeriod(time, policySnapshot) {
  const configs = policySnapshot.time_period_configs || [];
  const match = configs.find((item) => isWithinTimeRange(time, item.start_time, item.end_time));
  return match?.time_period || TimePeriod.MORNING;
}

function getTimeWindow(time, policySnapshot) {
  const configs = policySnapshot.time_window_configs || [];
  return configs.find((item) => isWithinTimeRange(time, item.start_time, item.end_time)) || null;
}

function isWithinTimeRange(time, start, end) {
  if (!start || !end) return false;
  const t = timeToMinutes(time);
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  return t >= s && t < e;
}

function timeToMinutes(time) {
  const [h, m] = (time || "0:0").split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function buildSceneSummary(context, supplySummary, demandSummary) {
  return {
    time_period: context.time_period,
    period_type: context.period_type,
    worker_working: context.is_worker_working_time,
    robotaxi_operating: context.is_robotaxi_operating_time,
    supply_triggered: supplySummary?.triggered_event_count || 0,
    demand_triggered: demandSummary?.triggered_event_count || 0,
  };
}
