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

function debug(msg) {
  if (typeof window !== 'undefined') {
    if (!window.__simDebug) window.__simDebug = [];
    window.__simDebug.push(new Date().toLocaleTimeString() + " " + msg);
  }
}

function startTickInterval(runId, tickHandler) {
  if (tickIntervalRef.current) {
    clearInterval(tickIntervalRef.current);
  }
  tickIntervalRef.current = setInterval(() => tickHandler(runId), 500);
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
    const unfinishedRun = simulationRuns.find((run) => ["READY", "RUNNING", "PAUSED", "DRAINING"].includes(run.simulation_status));
    if (unfinishedRun) {
      debug("createSimulationRun 失败: 存在未结束运行 " + unfinishedRun.simulation_run_id);
      return;
    }
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
    const result = simulationEngine.startSimulationRun(run);
    if (!result) { debug("startSimulationRun 失败: 引擎返回null (status检查不通过或引擎错误)"); return; }
    debug("startSimulationRun 成功: 状态变为 " + result.simulationRun.simulation_status + " | 事件: " + result.event.message);
    setSimulationRuns((prev) => prev.map((r) => r.simulation_run_id === runId ? result.simulationRun : r));
    setSimulationEvents((prev) => [result.event, ...prev]);
    const intervalId = startTickInterval(runId, executeTickForRun);
    debug("startSimulationRun: setInterval已设置, id=" + intervalId + ", tick循环启动");
    // 2秒后检测定时器是否还在运行
    setTimeout(() => {
      debug("DELAYED-CHECK: intervalId=" + tickIntervalRef.current + " | 是否还在运行=" + (tickIntervalRef.current ? "是" : "否(已被清除)"));
    }, 2000);
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
    const result = simulationEngine.resumeSimulationRun(run);
    if (!result) return;
    setSimulationRuns((prev) => prev.map((r) => r.simulation_run_id === runId ? result.simulationRun : r));
    if (result.event) setSimulationEvents((prev) => [result.event, ...prev]);
    startTickInterval(runId, executeTickForRun);
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
      if (!run || run.simulation_status !== "RUNNING") {
        if (run) debug("Tick停止: status=" + run.simulation_status);
        else debug("Tick停止: 未找到run");
        stopTickInterval();
        return prev;
      }
      debug("Tick #" + (run.current_global_tick+1) + " | time=" + run.current_time);
      const businessData = getBD ? getBD() : null;
      const tickResult = loop.executeTick({
        simulationRun: run,
        policySnapshot: run.simulation_policy_snapshot,
        randomSeed: run.simulation_policy_snapshot?.random_seed,
        businessData,
        refreshBusinessData: getBD || null,
      });
      if (!tickResult) { debug("Tick: executeTick返回null"); return prev; }
      const result = engine.completeTick(
        run, tickResult.tickContext, tickResult.supplyResult, tickResult.demandResult, tickResult.executionResults, tickResult.tickEventSummary
      );
      debug("Tick完成: " + result.events.length + "条事件 | 新状态=" + result.simulationRun.simulation_status);
      setSimulationEvents((evts) => [...result.events, ...evts]);
      return prev.map((r) => r.simulation_run_id === runId ? result.simulationRun : r);
    });
  }

  function cleanup() {
    stopTickInterval();
  }

  return {
    initDefaultPolicy,
    createSimulationRun,
    startSimulationRun,
    pauseSimulationRun,
    resumeSimulationRun,
    stopSimulationRun,
    cleanup,
  };
}
