import assert from "node:assert/strict";

import { createDefaultSimulationPolicy } from "../src/domain/simulationTypes.js";
import { runSupplyTrigger } from "../src/data/simulationSupplyTrigger.js";
import { initializeDefaultWorkflowTimingProfile } from "../src/data/businessTimingCalculator.js";
import { resolveWorkflowRuntimeSeconds } from "../src/data/workflowRuntimeConfig.js";
import * as businessActionService from "../src/services/businessActionService.js";

const policy = createDefaultSimulationPolicy();
assert.equal(policy.tick_seconds, 1, "模拟世界时间仍必须按 1 秒 Tick 推进");
assert.equal(policy.simulation_speed_config.real_cycle_interval_ms, 50);
assert.equal(policy.simulation_speed_config.ticks_per_real_cycle, 300);
assert.equal(policy.real_cycle_interval_ms, 50);
assert.equal(policy.ticks_per_real_cycle, 300);

const noWorkSupply = runSupplyTrigger({
  timeContext: {
    is_worker_working_time: false,
    is_robotaxi_operating_time: true,
  },
  policySnapshot: {
    supply_trigger_config: {
      supply_trigger_enabled: true,
      readiness_trigger_enabled: true,
      deployment_trigger_enabled: true,
    },
  },
});
assert.equal(noWorkSupply.actions.length, 0, "非作业人员工作时间不应触发准入或投放");
assert.equal(noWorkSupply.no_action_count, 2);

const workflowTimingProfile = initializeDefaultWorkflowTimingProfile();
assert.equal(resolveWorkflowRuntimeSeconds({
  workflowTimingProfile,
  key: "order_assignment_wait_seconds",
  fallbackSeconds: 10,
}), 60, "订单分配等待时长应来自工作流时效配置");

const callResult = businessActionService.callRobotaxi({
  state: createOrderState("WAITING_ROBOTAXI_CALL"),
  objectId: "SO-V0327",
  runtime: createRuntime({ seconds: 10, workflowTimingProfile }),
});
assert.equal(callResult.success, true, callResult.message);
assert.equal(callResult.updates.serviceOrders[0].assignment_wait_timeout_seconds, 60);
const timeoutOperation = callResult.updates.timedOperations[0];
assert.equal(timeoutOperation.operation_type, "ORDER_ASSIGNMENT_TIMEOUT");
assert.equal(timeoutOperation.action_type, "SERVICE_ORDER_CANCEL");
assert.equal(timeoutOperation.duration_seconds, 60);
assert.equal(timeoutOperation.planned_completed_seconds, 70);

const cancelResult = businessActionService.cancelServiceOrder({
  state: {
    ...createOrderState("WAITING_ROBOTAXI_ASSIGNMENT"),
    timedOperations: [timeoutOperation],
  },
  objectId: "SO-V0327",
  runtime: createRuntime({
    seconds: 70,
    simulationTimestamp: "Day 1 00:01:10",
    workflowTimingProfile,
    action: { operation_payload: timeoutOperation.operation_payload },
  }),
});
assert.equal(cancelResult.success, true, cancelResult.message);
assert.equal(cancelResult.updates.serviceOrders[0].order_status, "CANCELLED");
assert.equal(cancelResult.updates.serviceOrders[0].cancellation_reason, "ROBOTAXI_ASSIGNMENT_TIMEOUT");
assert.equal(cancelResult.updates.serviceOrders[0].simulation_cancelled_at, "Day 1 00:01:10");

console.log("v032.7 工作流运行时与高速推进合同验证通过");

function createOrderState(status) {
  return {
    serviceOrders: [{
      service_order_id: "SO-V0327",
      order_status: status,
      matching_retry_pending: false,
    }],
    timedOperations: [],
  };
}

function createRuntime({ seconds = 0, simulationTimestamp = "Day 1 00:00:10", workflowTimingProfile = null, action = null } = {}) {
  let sequence = 0;
  return {
    nextId: (prefix) => {
      sequence += 1;
      return `${prefix}-V0327-${String(sequence).padStart(3, "0")}`;
    },
    now: () => "2026-06-28T00:00:00.000Z",
    simulationTime: () => simulationTimestamp,
    randomSeed: () => "v0327",
    audit: (options = {}) => ({
      record_source: "SIMULATION",
      simulation_run_id: "SIM-RUN-V0327",
      simulation_updated_at: simulationTimestamp,
      simulation_global_tick: seconds,
      ...(options.created ? { simulation_created_at: simulationTimestamp } : {}),
      ...(options.completed ? { simulation_completed_at: simulationTimestamp } : {}),
    }),
    timeContext: {
      time_mode: "SIMULATION",
      simulation_seconds: seconds,
      simulation_timestamp: simulationTimestamp,
    },
    workflowTimingProfile,
    policySnapshot: {},
    context: { action },
  };
}
