/**
 * Simulation 前端控制动作
 *
 * 供 main.jsx 调用的 SimulationRun 创建、启停和 Tick 循环。
 * 通过 hook 模式封装 React state 操作。
 */

// 模块级变量，跨渲染保持
const tickIntervalRef = { current: null };
// 模块级依赖缓存，避免 React 闭包导致 setInterval 捕获过时的 simulationLoop
const depsRef = { engine: null, loop: null, getBusinessData: null };
const BLOCKING_RUN_STATUSES = ["RUNNING", "DRAINING", "PAUSED"];

function debug(msg) {
  if (typeof window !== 'undefined') {
    if (!window.__simDebug) window.__simDebug = [];
    window.__simDebug.push(new Date().toLocaleTimeString() + " " + msg);
  }
}

function startTickInterval(runId, tickHandler, intervalMs = 50) {
  if (tickIntervalRef.current) {
    clearInterval(tickIntervalRef.current);
  }
  tickIntervalRef.current = setInterval(() => tickHandler(runId), normalizeRealCycleIntervalMs(intervalMs));
  return tickIntervalRef.current;
}

function stopTickInterval() {
  if (tickIntervalRef.current) {
    clearInterval(tickIntervalRef.current);
    tickIntervalRef.current = null;
  }
}

/**
 * 创建 Simulation 控制 hook
 *
 * @param {Object} deps - 依赖注入
 */
export function useSimulationActions({
  simulationEngine,
  simulationLoop,
  simulationTypes,
  simulationInitialization,
  simulationPolicies,
  simulationRuns,
  simulationEvents,
  setSimulationPolicies,
  setSimulationRuns,
  setSimulationEvents,
  // 业务数据上下文 — 供 Tick 循环传入 WorkflowEngine + ExecutionEngine
  getBusinessData,
}) {
  // 每次渲染同步最新依赖到模块级 ref，确保 setInterval 回调能拿到最新值
  depsRef.engine = simulationEngine;
  depsRef.loop = simulationLoop;
  depsRef.getBusinessData = getBusinessData;
  simulationEngine?.synchronizeSimulationCounters?.(simulationRuns, simulationEvents);

  function initDefaultPolicy() {
    if (!simulationInitialization || !simulationTypes) return;
    if (simulationPolicies.length > 0) return;
    const defaultPolicy = simulationInitialization.initializeDefaultSimulationPolicy();
    setSimulationPolicies([defaultPolicy]);
  }

  function createSimulationRun() {
    debug("createSimulationRun 调用 | engine:" + !!simulationEngine + " policies:" + simulationPolicies.length);
    if (!simulationEngine || !simulationPolicies.length) { debug("createSimulationRun 失败: engine或policies缺失"); return; }
    const policy = simulationPolicies.find((p) => p.policy_status === "ACTIVE");
    if (!policy) { debug("createSimulationRun 失败: 无ACTIVE策略"); return; }
    const previousSimulationRun = simulationRuns.reduce((latest, run) => {
      const runEnd = Number(run.simulation_end_seconds ?? run.current_simulation_seconds) || 0;
      const latestEnd = Number(latest?.simulation_end_seconds ?? latest?.current_simulation_seconds) || -1;
      return runEnd > latestEnd ? run : latest;
    }, null);
    const { simulationRun: run, event: evt } = simulationEngine.initSimulationRun({
      simulationName: `模拟运行 ${simulationRuns.length + 1}`,
      simulationPolicy: policy,
      previousSimulationRun,
    });
    debug("createSimulationRun 成功: " + run.simulation_run_id + " status=" + run.simulation_status);
    setSimulationRuns((prev) => [run, ...prev]);
    setSimulationEvents((prev) => [evt, ...prev]);
  }

  function startSimulationRun(runId) {
    debug("startSimulationRun 调用 runId=" + runId + " | engine:" + !!simulationEngine + " | runs count:" + simulationRuns.length);
    if (!simulationEngine) { debug("startSimulationRun 失败: engine缺失"); return; }
    const run = simulationRuns.find((r) => r.simulation_run_id === runId);
    if (!run) { debug("startSimulationRun 失败: 未找到run " + runId); return; }
    debug("startSimulationRun 找到run | status=" + run.simulation_status + " | expected READY=" + (run.simulation_status === "READY"));
    const activeRun = simulationRuns.find((item) => item.simulation_run_id !== runId && BLOCKING_RUN_STATUSES.includes(item.simulation_status));
    if (activeRun) {
      debug("startSimulationRun 失败: 已有运行中、暂停中或收尾执行中的模拟运行 " + activeRun.simulation_run_id);
      return;
    }
    const result = simulationEngine.startSimulationRun(run);
    if (!result) { debug("startSimulationRun 失败: 引擎返回null (status检查不通过或引擎错误)"); return; }
    debug("startSimulationRun 成功: 状态变为 " + result.simulationRun.simulation_status + " | 事件: " + result.event.message);
    setSimulationRuns((prev) => prev.map((r) => r.simulation_run_id === runId ? result.simulationRun : r));
    setSimulationEvents((prev) => [result.event, ...prev]);
    const intervalId = startTickInterval(runId, executeTickForRun, getRealCycleIntervalMs(result.simulationRun));
    debug("startSimulationRun: setInterval已设置, id=" + intervalId + ", tick循环启动");
    // 2秒后检测定时器是否还在运行
    setTimeout(() => {
      debug("DELAYED-CHECK: intervalId=" + tickIntervalRef.current + " | 是否还在运行=" + (tickIntervalRef.current ? "是" : "否(已被清除)"));
    }, 2000);
  }

  function restoreActiveSimulationRun() {
    if (tickIntervalRef.current) return;
    const activeRun = simulationRuns.find((run) => ["RUNNING", "DRAINING"].includes(run.simulation_status));
    if (activeRun) startTickInterval(activeRun.simulation_run_id, executeTickForRun, getRealCycleIntervalMs(activeRun));
  }

  function pauseSimulationRun(runId) {
    if (!simulationEngine) return;
    const run = simulationRuns.find((r) => r.simulation_run_id === runId);
    if (!run) return;
    const result = simulationEngine.pauseSimulationRun(run);
    if (!result) return;
    setSimulationRuns((prev) => prev.map((r) => r.simulation_run_id === runId ? result.simulationRun : r));
    if (result.event) setSimulationEvents((prev) => [result.event, ...prev]);
    stopTickInterval();
  }

  function resumeSimulationRun(runId) {
    if (!simulationEngine) return;
    const run = simulationRuns.find((r) => r.simulation_run_id === runId);
    if (!run) return;
    const activeRun = simulationRuns.find((item) => item.simulation_run_id !== runId && BLOCKING_RUN_STATUSES.includes(item.simulation_status));
    if (activeRun) {
      debug("resumeSimulationRun 失败: 已有运行中、暂停中或收尾执行中的模拟运行 " + activeRun.simulation_run_id);
      return;
    }
    const result = simulationEngine.resumeSimulationRun(run);
    if (!result) return;
    setSimulationRuns((prev) => prev.map((r) => r.simulation_run_id === runId ? result.simulationRun : r));
    if (result.event) setSimulationEvents((prev) => [result.event, ...prev]);
    startTickInterval(runId, executeTickForRun, getRealCycleIntervalMs(result.simulationRun));
  }

  function stopSimulationRun(runId) {
    if (!simulationEngine) return;
    const run = simulationRuns.find((r) => r.simulation_run_id === runId);
    if (!run) return;
    const result = simulationEngine.stopSimulationRun(run);
    if (!result) return;
    setSimulationRuns((prev) => prev.map((r) => r.simulation_run_id === runId ? result.simulationRun : r));
    if (result.event) setSimulationEvents((prev) => [result.event, ...prev]);
    stopTickInterval();
  }

  function executeTickForRun(runId) {
    const engine = depsRef.engine;
    const loop = depsRef.loop;
    const getBD = depsRef.getBusinessData;
    debug("executeTickForRun 被调用 | engine:" + !!engine + " loop:" + !!loop);
    if (!engine || !loop) { debug("executeTickForRun 退出: engine/loop缺失"); return; }
    setSimulationRuns((prev) => {
      const run = prev.find((r) => r.simulation_run_id === runId);
      if (!run || !["RUNNING", "DRAINING"].includes(run.simulation_status)) {
        if (run) debug("Tick停止: status=" + run.simulation_status);
        else debug("Tick停止: 未找到run");
        stopTickInterval();
        return prev;
      }
      let nextRun = run;
      const batchEvents = [];
      const ticksPerCycle = getTicksPerRealCycle(run);
      const businessData = getBD ? getBD() : null;
      for (let i = 0; i < ticksPerCycle; i++) {
        if (!["RUNNING", "DRAINING"].includes(nextRun.simulation_status)) break;
        debug("Tick #" + (nextRun.current_global_tick+1) + " | time=" + nextRun.current_time);
        const tickResult = loop.executeTick({
          simulationRun: nextRun,
          policySnapshot: nextRun.simulation_policy_snapshot,
          randomSeed: nextRun.simulation_policy_snapshot?.random_seed,
          businessData,
          refreshBusinessData: () => businessData,
        });
        if (!tickResult) { debug("Tick: executeTick返回null"); break; }
        const result = engine.completeTick(
          nextRun,
          tickResult.tickContext,
          tickResult.supplyResult,
          tickResult.demandResult,
          tickResult.executionResults,
          tickResult.tickEventSummary,
          { phase: tickResult.phase, workflowActionCount: tickResult.workflowActionCount }
        );
        batchEvents.push(...result.events);
        nextRun = result.simulationRun;
        if (!["RUNNING", "DRAINING"].includes(nextRun.simulation_status)) {
          stopTickInterval();
          break;
        }
      }
      debug("Tick批次完成: " + batchEvents.length + "条事件 | 新状态=" + nextRun.simulation_status);
      if (batchEvents.length) setSimulationEvents((evts) => [...batchEvents, ...evts]);
      return prev.map((r) => r.simulation_run_id === runId ? nextRun : r);
    });
  }

  function cleanup() {
    stopTickInterval();
  }

  return {
    initDefaultPolicy,
    createSimulationRun,
    startSimulationRun,
    restoreActiveSimulationRun,
    pauseSimulationRun,
    resumeSimulationRun,
    stopSimulationRun,
    cleanup,
  };
}

function getSimulationSpeedConfig(run) {
  return run?.simulation_policy_snapshot?.simulation_speed_config || {};
}

function getTicksPerRealCycle(run) {
  const value = Number(getSimulationSpeedConfig(run).ticks_per_real_cycle ?? run?.simulation_policy_snapshot?.ticks_per_real_cycle);
  return Number.isFinite(value) && value > 0 ? Math.min(Math.floor(value), 1000) : 300;
}

function getRealCycleIntervalMs(run) {
  return normalizeRealCycleIntervalMs(getSimulationSpeedConfig(run).real_cycle_interval_ms ?? run?.simulation_policy_snapshot?.real_cycle_interval_ms);
}

function normalizeRealCycleIntervalMs(value) {
  const ms = Number(value);
  return Number.isFinite(ms) && ms >= 16 ? Math.min(Math.floor(ms), 1000) : 50;
}
