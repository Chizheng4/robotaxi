export const TimeMode = {
  REAL_MANUAL: "REAL_MANUAL",
  REAL_AUTOMATION: "REAL_AUTOMATION",
  SIMULATION: "SIMULATION",
};

export const TriggerSource = {
  MANUAL: "MANUAL",
  REAL_AUTOMATION: "REAL_AUTOMATION",
  SIMULATION_AUTOMATION: "SIMULATION_AUTOMATION",
};

export function createRealManualTimeContext(now = new Date()) {
  const isoNow = normalizeIsoTime(now);
  return {
    time_mode: TimeMode.REAL_MANUAL,
    trigger_source: TriggerSource.MANUAL,
    now: isoNow,
    simulation_run_id: null,
    simulation_timeline_id: null,
    simulation_seconds: null,
    simulation_timestamp: null,
    global_tick: null,
  };
}

export function createSimulationTimeContext({
  simulationRunId,
  simulationTimelineId = null,
  tickContext = {},
  globalTick = 0,
  now = new Date(),
}) {
  return {
    time_mode: TimeMode.SIMULATION,
    trigger_source: TriggerSource.SIMULATION_AUTOMATION,
    now: normalizeIsoTime(now),
    simulation_run_id: simulationRunId || null,
    simulation_timeline_id: simulationTimelineId || null,
    simulation_seconds: Number.isFinite(Number(tickContext.current_simulation_seconds))
      ? Number(tickContext.current_simulation_seconds)
      : null,
    simulation_timestamp: tickContext.current_time || null,
    global_tick: Number(tickContext.global_tick ?? globalTick) || 0,
  };
}

export function resolveRuntimeNow(timeContext) {
  return timeContext?.now || new Date().toISOString();
}

export function resolveSimulationTimestamp(timeContext) {
  return timeContext?.simulation_timestamp || null;
}

function normalizeIsoTime(value) {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}
