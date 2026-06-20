/**
 * SimulationClock：连续模拟时间上下文计算。
 * 绝对模拟秒是唯一计算源，Day N HH:MM:SS 仅作为稳定展示格式。
 */

import { TimePeriod, PeriodType } from "../domain/simulationTypes.js";
import {
  SECONDS_PER_DAY,
  clockTimeToSeconds,
  formatSimulationTimestamp,
  getSimulationPosition,
  resolveTickSeconds,
} from "../domain/simulationTime.js";

export { formatSimulationTimestamp, getSimulationPosition, resolveTickSeconds } from "../domain/simulationTime.js";

export function computeTimeContext({
  currentSimulationSeconds,
  currentTime,
  currentDay,
  dayTick,
  globalTick,
  runTick = 0,
  tickSeconds,
  policySnapshot,
}) {
  const resolvedTickSeconds = resolveTickSeconds({ tickSeconds, tickMinutes: policySnapshot?.tick_minutes });
  const legacySeconds = ((Number(currentDay) || 1) - 1) * SECONDS_PER_DAY + clockTimeToSeconds(currentTime);
  const absoluteSeconds = Number.isFinite(Number(currentSimulationSeconds))
    ? Number(currentSimulationSeconds)
    : legacySeconds;
  const position = getSimulationPosition(absoluteSeconds, resolvedTickSeconds);
  const timePeriod = getTimePeriod(position.clockTime, policySnapshot || {});
  const timeWindow = getTimeWindow(position.clockTime, policySnapshot || {});
  const periodType = timeWindow?.period_type || PeriodType.NORMAL;

  return {
    current_time: position.displayTime,
    current_clock_time: position.clockTime,
    current_simulation_seconds: position.simulationSeconds,
    current_day: position.day,
    day_tick: Number.isFinite(Number(dayTick)) ? Number(dayTick) : position.dayTick,
    global_tick: Number(globalTick) || 0,
    run_tick: Number(runTick) || 0,
    tick_seconds: resolvedTickSeconds,
    time_period: timePeriod,
    period_type: periodType,
    time_window: timeWindow?.time_window || null,
    demand_profile_id: timeWindow?.demand_profile_id || null,
    is_worker_working_time: isWithinTimeRange(position.clockTime, policySnapshot?.worker_work_start_time, policySnapshot?.worker_work_end_time),
    is_robotaxi_operating_time: isWithinTimeRange(position.clockTime, policySnapshot?.robotaxi_operating_start_time, policySnapshot?.robotaxi_operating_end_time),
  };
}

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

export function advanceTick(simulationRun, { tickSeconds, phase = "RUNNING" } = {}) {
  const resolvedTickSeconds = resolveTickSeconds({
    tickSeconds,
    tickMinutes: simulationRun.tick_minutes || simulationRun.simulation_policy_snapshot?.tick_minutes,
  });
  const nextSeconds = (Number(simulationRun.current_simulation_seconds) || 0) + resolvedTickSeconds;
  const position = getSimulationPosition(nextSeconds, resolvedTickSeconds);

  return {
    ...simulationRun,
    tick_seconds: resolvedTickSeconds,
    current_simulation_seconds: nextSeconds,
    current_day: position.day,
    current_time: position.displayTime,
    current_clock_time: position.clockTime,
    current_day_tick: position.dayTick,
    current_run_tick: (Number(simulationRun.current_run_tick) || 0) + 1,
    current_global_tick: (Number(simulationRun.current_global_tick) || 0) + 1,
    trigger_ticks_completed: (Number(simulationRun.trigger_ticks_completed) || 0) + (phase === "RUNNING" ? 1 : 0),
    drain_ticks: (Number(simulationRun.drain_ticks) || 0) + (phase === "DRAINING" ? 1 : 0),
  };
}

export function isSimulationComplete(simulationRun) {
  return (Number(simulationRun.trigger_ticks_completed) || 0) >= Number(simulationRun.total_ticks || 0);
}

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
  const value = clockTimeToSeconds(time);
  const rangeStart = clockTimeToSeconds(start);
  const rangeEnd = clockTimeToSeconds(end);
  return value >= rangeStart && value < rangeEnd;
}

function buildSceneSummary(context, supplySummary, demandSummary) {
  return {
    simulation_time: context.current_time,
    time_period: context.time_period,
    period_type: context.period_type,
    worker_working: context.is_worker_working_time,
    robotaxi_operating: context.is_robotaxi_operating_time,
    supply_triggered: supplySummary?.triggered_event_count || 0,
    demand_triggered: demandSummary?.triggered_event_count || 0,
  };
}
