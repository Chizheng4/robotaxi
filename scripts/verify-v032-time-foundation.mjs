import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  createSimulationTimeContext,
  TimeMode,
  TriggerSource,
} from "../src/domain/timeContext.js";
import {
  completeTick,
  initSimulationRun,
  startSimulationRun,
} from "../src/data/simulationEngine.js";
import { SimulationStatus } from "../src/domain/simulationTypes.js";

const timeContext = createSimulationTimeContext({
  simulationRunId: "SIM-RUN-TIME-001",
  simulationTimelineId: "SIM-TIMELINE-TIME",
  tickContext: {
    current_time: "Day 2 01:02:03",
    current_simulation_seconds: 90000,
    global_tick: 42,
  },
});

assert.equal(timeContext.time_mode, TimeMode.SIMULATION);
assert.equal(timeContext.trigger_source, TriggerSource.SIMULATION_AUTOMATION);
assert.equal(timeContext.simulation_run_id, "SIM-RUN-TIME-001");
assert.equal(timeContext.simulation_timestamp, "Day 2 01:02:03");
assert.equal(timeContext.simulation_seconds, 90000);
assert.equal(timeContext.global_tick, 42);

const simulationActionsSource = readFileSync(new URL("../src/services/simulationActions.js", import.meta.url), "utf8");
assert.doesNotMatch(
  simulationActionsSource,
  /READY["'][,\s]+["']RUNNING["'][,\s]+["']PAUSED["'][,\s]+["']DRAINING/,
  "创建模拟运行不得因为已有 READY/PAUSED 运行而被锁死",
);
assert.match(
  simulationActionsSource,
  /BLOCKING_RUN_STATUSES\s*=\s*\[\s*["']RUNNING["']\s*,\s*["']DRAINING["']\s*,\s*["']PAUSED["']\s*\]/,
  "启动或继续模拟运行必须检查 RUNNING/DRAINING/PAUSED 互斥",
);

const policy = {
  simulation_policy_id: "SIM-POLICY-TIME",
  simulation_days: 1,
  tick_minutes: 1,
  tick_seconds: 60,
  max_drain_ticks: 1,
  time_period_configs: [],
  time_window_configs: [],
};

const first = initSimulationRun({
  simulationName: "时间基础验证 1",
  simulationPolicy: policy,
}).simulationRun;
const second = initSimulationRun({
  simulationName: "时间基础验证 2",
  simulationPolicy: policy,
  previousSimulationRun: { ...first, simulation_end_seconds: 86400, current_global_tick: 1440 },
}).simulationRun;

assert.equal(first.simulation_status, SimulationStatus.READY);
assert.equal(second.simulation_status, SimulationStatus.READY);
assert.equal(second.simulation_start_seconds, 86400);
assert.equal(second.current_global_tick, 1440);
assert.equal(second.previous_simulation_run_id, first.simulation_run_id);

const started = startSimulationRun({
  ...first,
  failure_reason: "旧失败原因",
  failure_summary: { failure_source: "OLD" },
}).simulationRun;
assert.equal(started.simulation_status, SimulationStatus.RUNNING);
assert.equal(started.failure_reason, null);
assert.equal(started.failure_summary, null);

const stalled = completeTick(
  {
    ...started,
    simulation_status: SimulationStatus.DRAINING,
    drain_ticks: 1,
    max_drain_ticks: 1,
  },
  {
    current_time: "Day 1 00:01:00",
    current_clock_time: "00:01:00",
    current_day: 1,
    current_simulation_seconds: 60,
    day_tick: 1,
    global_tick: 1,
    tick_seconds: 60,
  },
  null,
  null,
  [],
  null,
  { phase: SimulationStatus.DRAINING, workflowActionCount: 1 },
);

assert.equal(stalled.simulationRun.simulation_status, SimulationStatus.FAILED);
assert.equal(stalled.simulationRun.failure_summary.failure_source, "DRAIN_TIMEOUT");
assert.equal(stalled.simulationRun.failure_summary.failure_object_id, started.simulation_run_id);
assert.ok(stalled.events.some((event) => event.event_payload?.failure_source === "DRAIN_TIMEOUT"));

console.log("v032.1 时间基础合同验证通过");
