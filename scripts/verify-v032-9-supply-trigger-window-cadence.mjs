import assert from "node:assert/strict";

import { runSupplyTrigger } from "../src/data/simulationSupplyTrigger.js";

const policy = {
  worker_work_start_time: "08:05",
  worker_work_end_time: "20:00",
  robotaxi_operating_start_time: "00:00",
  robotaxi_operating_end_time: "24:00",
  supply_trigger_config: {
    supply_trigger_enabled: true,
    readiness_trigger_enabled: true,
    deployment_trigger_enabled: true,
    readiness_trigger_interval_seconds: 600,
    deployment_trigger_interval_seconds: 600,
  },
};

const beforeWindow = runSupplyTrigger({
  timeContext: createTimeContext({ seconds: timeToSeconds("08:04:59"), workerWorking: false }),
  policySnapshot: policy,
});
assert.equal(beforeWindow.actions.length, 0, "未到配置工作时间不能触发供给动作");

const atWindowStart = runSupplyTrigger({
  timeContext: createTimeContext({ seconds: timeToSeconds("08:05:00") }),
  policySnapshot: policy,
});
assert.deepEqual(
  atWindowStart.actions.map((item) => item.actionType),
  ["READINESS_TASK_CREATE", "DEPLOYMENT_TASK_CREATE"],
  "供给触发周期必须从配置工作时间起点开始",
);

const globalCadenceButNotWindowCadence = runSupplyTrigger({
  timeContext: createTimeContext({ seconds: timeToSeconds("08:10:00") }),
  policySnapshot: policy,
});
assert.equal(globalCadenceButNotWindowCadence.actions.length, 0, "不能继续使用全天 0 点取模触发供给动作");

const nextWindowCadence = runSupplyTrigger({
  timeContext: createTimeContext({ seconds: timeToSeconds("08:15:00") }),
  policySnapshot: policy,
});
assert.deepEqual(nextWindowCadence.actions.map((item) => item.actionType), ["READINESS_TASK_CREATE", "DEPLOYMENT_TASK_CREATE"]);

const deploymentStartsWithLaterRobotaxiWindow = runSupplyTrigger({
  timeContext: createTimeContext({ seconds: timeToSeconds("08:05:00") }),
  policySnapshot: {
    ...policy,
    robotaxi_operating_start_time: "08:07",
  },
});
assert.deepEqual(deploymentStartsWithLaterRobotaxiWindow.actions.map((item) => item.actionType), ["READINESS_TASK_CREATE"]);

const deploymentAtLaterWindow = runSupplyTrigger({
  timeContext: createTimeContext({ seconds: timeToSeconds("08:07:00") }),
  policySnapshot: {
    ...policy,
    robotaxi_operating_start_time: "08:07",
  },
});
assert.deepEqual(deploymentAtLaterWindow.actions.map((item) => item.actionType), ["DEPLOYMENT_TASK_CREATE"]);

console.log("v032.9 供给触发周期对齐运营配置时间验证通过");

function createTimeContext({ seconds, workerWorking = true, robotaxiOperating = true }) {
  return {
    current_simulation_seconds: seconds,
    is_worker_working_time: workerWorking,
    is_robotaxi_operating_time: robotaxiOperating,
  };
}

function timeToSeconds(time) {
  const [hours, minutes, seconds = 0] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}
