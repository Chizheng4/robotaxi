/**
 * Simulation 前端控制动作
 *
 * 供 main.jsx 调用的 SimulationRun 创建、启停和 Tick 循环。
 * 通过 hook 模式封装 React state 操作。
 */

// 模块级变量，跨渲染保持
const tickIntervalRef = { current: null };

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
}) {
  function initDefaultPolicy() {
    if (!simulationInitialization || !simulationTypes) return;
    if (simulationPolicies.length > 0) return;
    const defaultPolicy = simulationInitialization.initializeDefaultSimulationPolicy();
    setSimulationPolicies([defaultPolicy]);
  }

  function createSimulationRun() {
    if (!simulationEngine || !simulationPolicies.length) return;
    const policy = simulationPolicies.find((p) => p.policy_status === "ACTIVE");
    if (!policy) return;
    const { simulationRun: run, event: evt } = simulationEngine.initSimulationRun({
      simulationName: `模拟运行 ${simulationRuns.length + 1}`,
      simulationPolicy: policy,
    });
    setSimulationRuns((prev) => [run, ...prev]);
    setSimulationEvents((prev) => [evt, ...prev]);
  }

  function startSimulationRun(runId) {
    if (!simulationEngine) return;
    const run = simulationRuns.find((r) => r.simulation_run_id === runId);
    if (!run) return;
    const result = simulationEngine.startSimulationRun(run);
    if (!result) return;
    setSimulationRuns((prev) => prev.map((r) => r.simulation_run_id === runId ? result.simulationRun : r));
    setSimulationEvents((prev) => [result.event, ...prev]);
    tickIntervalRef.current = setInterval(() => executeTickForRun(runId), 500);
  }

  function pauseSimulationRun(runId) {
    if (!simulationEngine) return;
    const run = simulationRuns.find((r) => r.simulation_run_id === runId);
    const result = simulationEngine.pauseSimulationRun(run);
    if (!result) return;
    setSimulationRuns((prev) => prev.map((r) => r.simulation_run_id === runId ? result.simulationRun : r));
    clearInterval(tickIntervalRef.current);
  }

  function stopSimulationRun(runId) {
    if (!simulationEngine) return;
    const run = simulationRuns.find((r) => r.simulation_run_id === runId);
    const result = simulationEngine.stopSimulationRun(run);
    if (!result) return;
    setSimulationRuns((prev) => prev.map((r) => r.simulation_run_id === runId ? result.simulationRun : r));
    clearInterval(tickIntervalRef.current);
  }

  function executeTickForRun(runId) {
    if (!simulationEngine || !simulationLoop) return;
    setSimulationRuns((prev) => {
      const run = prev.find((r) => r.simulation_run_id === runId);
      if (!run || run.simulation_status !== "RUNNING") {
        clearInterval(tickIntervalRef.current);
        return prev;
      }
      const tickResult = simulationLoop.executeTick({
        simulationRun: run,
        policySnapshot: run.simulation_policy_snapshot,
        randomSeed: Date.now(),
      });
      if (!tickResult) return prev;
      const result = simulationEngine.completeTick(
        run, tickResult.tickContext, tickResult.supplyResult, tickResult.demandResult, tickResult.tickEventSummary
      );
      setSimulationEvents((evts) => [...result.events, ...evts]);
      return prev.map((r) => r.simulation_run_id === runId ? result.simulationRun : r);
    });
  }

  function cleanup() {
    clearInterval(tickIntervalRef.current);
  }

  return {
    initDefaultPolicy,
    createSimulationRun,
    startSimulationRun,
    pauseSimulationRun,
    stopSimulationRun,
    cleanup,
  };
}
