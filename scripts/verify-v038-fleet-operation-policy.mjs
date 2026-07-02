import assert from "node:assert/strict";

import { BatteryOperationStatus, CleanlinessStatus, TaskType } from "../src/domain/taskTypes.js";
import {
  FleetOperationPolicyRunStatus,
  executeFleetOperationPolicy,
  initializeDefaultFleetOperationPolicies,
} from "../src/services/fleetOperationPolicyService.js";

const policies = initializeDefaultFleetOperationPolicies("2026-07-02T00:00:00.000Z");
assert.equal(policies.length, 5, "应初始化五类运维策略");

const cleaningPolicy = policies.find((item) => item.target_task_type === TaskType.CLEANING);
const noAction = executeFleetOperationPolicy({
  policy: cleaningPolicy,
  robotaxis: [createRobotaxi({ robotaxi_id: "RT-CLEAN-OK", cleanliness_status: CleanlinessStatus.CLEAN })],
  existingTasks: [],
  context: createContext(),
});
assert.equal(noAction.run.run_status, FleetOperationPolicyRunStatus.NO_ACTION);
assert.equal(noAction.tasks.length, 0);
assert.equal(noAction.run.policy_snapshot.policy_parameters.service_order_count_threshold, 8);

cleaningPolicy.policy_parameters.service_order_count_threshold = 99;
assert.equal(noAction.run.policy_snapshot.policy_parameters.service_order_count_threshold, 8, "历史执行快照不得被配置变更污染");

const createResult = executeFleetOperationPolicy({
  policy: cleaningPolicy,
  robotaxis: [createRobotaxi({ robotaxi_id: "RT-CLEAN-NEED", cleanliness_status: CleanlinessStatus.NEEDS_CLEANING })],
  existingTasks: [],
  context: createContext(),
});
assert.equal(createResult.run.run_status, FleetOperationPolicyRunStatus.SUCCEEDED);
assert.equal(createResult.tasks.length, 1);
assert.equal(createResult.tasks[0].task_type, TaskType.CLEANING);
assert.equal(createResult.collectionKey, "cleaningTasks");
assert.equal(createResult.robotaxis[0].pending_fleet_task_id || createResult.robotaxis[0].current_task_id, createResult.tasks[0].task_id);

const chargingPolicy = policies.find((item) => item.target_task_type === TaskType.CHARGING);
const chargingResult = executeFleetOperationPolicy({
  policy: chargingPolicy,
  robotaxis: [createRobotaxi({ robotaxi_id: "RT-LOW-BATTERY", battery_percent: 12, battery_operation_status: BatteryOperationStatus.LOW })],
  existingTasks: [],
  context: createContext(),
});
assert.equal(chargingResult.tasks[0].task_type, TaskType.CHARGING);
assert.equal(chargingResult.tasks[0].battery_percent_before, 12);
assert.equal(chargingResult.tasks[0].target_battery_percent, 90);

console.log("v038 Fleet Operations 运维策略服务合同验证通过");

function createRobotaxi(patch = {}) {
  return {
    robotaxi_id: "RT-DEFAULT",
    availability_status: "AVAILABLE",
    current_order_id: null,
    current_task_id: null,
    cleanliness_status: CleanlinessStatus.CLEAN,
    battery_percent: 80,
    battery_operation_status: BatteryOperationStatus.ENOUGH,
    maintenance_status: "NORMAL",
    failure_status: "NONE",
    retirement_status: "ACTIVE",
    fleet_operation_status: "NONE",
    ...patch,
  };
}

function createContext() {
  let taskSequence = 0;
  let runSequence = 0;
  return {
    now: () => "2026-07-02T00:00:00.000Z",
    nextId: (prefix) => {
      taskSequence += 1;
      return `${prefix}-${String(taskSequence).padStart(4, "0")}`;
    },
    nextRunId: () => {
      runSequence += 1;
      return `FOP-RUN-${String(runSequence).padStart(4, "0")}`;
    },
  };
}
