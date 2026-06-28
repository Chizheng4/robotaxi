import assert from "node:assert/strict";

import { runDemandTrigger } from "../src/data/simulationDemandTrigger.js";
import { runSupplyTrigger } from "../src/data/simulationSupplyTrigger.js";
import { createDefaultSimulationPolicy } from "../src/domain/simulationTypes.js";
import * as businessActionService from "../src/services/businessActionService.js";

const policy = createDefaultSimulationPolicy();
assert.equal(policy.tick_seconds, 1, "底层统一模拟时间仍为 1 秒 Tick");
assert.equal(policy.demand_generation_config.demand_generation_interval_seconds, 600);
assert.equal(policy.supply_trigger_config.readiness_trigger_interval_seconds, 600);
assert.equal(policy.supply_trigger_config.deployment_trigger_interval_seconds, 600);

const demandAtZero = runDemandTrigger({
  timeContext: createTimeContext({ seconds: 0, demandProfileId: "DP-VERIFY" }),
  policySnapshot: createDemandPolicy(),
  randomSeed: "v0328-0",
});
assert.equal(demandAtZero.order_count, 2, "第 0 秒是需求周期边界，可以触发需求模型");

const demandAtOne = runDemandTrigger({
  timeContext: createTimeContext({ seconds: 1, demandProfileId: "DP-VERIFY" }),
  policySnapshot: createDemandPolicy(),
  randomSeed: "v0328-1",
});
assert.equal(demandAtOne.order_count, 0, "第 1 秒不能因为 1 秒 Tick 而再次触发需求模型");

const demandAtTenMinutes = runDemandTrigger({
  timeContext: createTimeContext({ seconds: 600, demandProfileId: "DP-VERIFY" }),
  policySnapshot: createDemandPolicy(),
  randomSeed: "v0328-600",
});
assert.equal(demandAtTenMinutes.order_count, 2, "第 600 秒再次命中 10 分钟需求周期");

const beforeWorkSupply = runSupplyTrigger({
  timeContext: createTimeContext({
    seconds: 7 * 3600 + 50 * 60,
    workerWorking: false,
    robotaxiOperating: true,
  }),
  policySnapshot: createSupplyPolicy(),
});
assert.equal(beforeWorkSupply.actions.length, 0, "未到作业人员工作时间不能触发准入或投放");

const atWorkSupply = runSupplyTrigger({
  timeContext: createTimeContext({
    seconds: 8 * 3600,
    workerWorking: true,
    robotaxiOperating: true,
  }),
  policySnapshot: createSupplyPolicy(),
});
assert.deepEqual(atWorkSupply.actions.map((item) => item.actionType), ["READINESS_TASK_CREATE", "DEPLOYMENT_TASK_CREATE"]);

const nonCadenceSupply = runSupplyTrigger({
  timeContext: createTimeContext({
    seconds: 8 * 3600 + 1,
    workerWorking: true,
    robotaxiOperating: true,
  }),
  policySnapshot: createSupplyPolicy(),
});
assert.equal(nonCadenceSupply.actions.length, 0, "工作时间内也必须命中供给触发周期才创建动作");

const readinessSkip = businessActionService.createReadinessTask({
  state: {},
  runtime: createRuntime({ workerWorking: false }),
});
assert.equal(readinessSkip.success, true);
assert.equal(readinessSkip.resultType, "READINESS_SKIPPED_OUT_OF_WORK_TIME");
assert.deepEqual(readinessSkip.updates, {});

const deploymentSkip = businessActionService.createDeploymentTask({
  state: {},
  runtime: createRuntime({ workerWorking: false }),
});
assert.equal(deploymentSkip.success, true);
assert.equal(deploymentSkip.resultType, "DEPLOYMENT_SKIPPED_OUT_OF_WORK_TIME");
assert.deepEqual(deploymentSkip.updates, {});

console.log("v032.8 业务触发周期与工作时间约束验证通过");

function createDemandPolicy() {
  return {
    demand_generation_config: {
      demand_generation_enabled: true,
      demand_generation_interval_seconds: 600,
      max_orders_per_generation_global: 10,
    },
    demand_profiles: [{
      demand_profile_id: "DP-VERIFY",
      distribution_type: "FIXED",
      lambda: 2,
      min_orders_per_tick: 0,
      max_orders_per_tick: 10,
    }],
  };
}

function createSupplyPolicy() {
  return {
    supply_trigger_config: {
      supply_trigger_enabled: true,
      readiness_trigger_enabled: true,
      deployment_trigger_enabled: true,
      readiness_trigger_interval_seconds: 600,
      deployment_trigger_interval_seconds: 600,
    },
  };
}

function createTimeContext({
  seconds,
  demandProfileId = null,
  workerWorking = true,
  robotaxiOperating = true,
}) {
  return {
    current_simulation_seconds: seconds,
    demand_profile_id: demandProfileId,
    is_worker_working_time: workerWorking,
    is_robotaxi_operating_time: robotaxiOperating,
  };
}

function createRuntime({ workerWorking }) {
  return {
    nextId: (prefix) => `${prefix}-V0328`,
    now: () => "2026-06-28T00:00:00.000Z",
    simulationTime: () => "Day 1 07:50:00",
    randomSeed: () => "v0328",
    audit: () => ({}),
    timeContext: {
      time_mode: "SIMULATION",
      simulation_seconds: 28200,
      simulation_timestamp: "Day 1 07:50:00",
      is_worker_working_time: workerWorking,
      is_robotaxi_operating_time: true,
    },
    policySnapshot: {},
  };
}
