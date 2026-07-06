import assert from "node:assert/strict";

import { BatteryOperationStatus, CleanlinessStatus, TaskType } from "../src/domain/taskTypes.js";
import {
  FleetOperationPolicyResultStatus,
  FleetOperationPolicyRunStatus,
  createDirectFleetOperationTask,
  executeFleetOperationPolicy,
  initializeDefaultFleetOperationPolicies,
} from "../src/services/fleetOperationPolicyService.js";
import {
  dispatchFleetOperationDestination,
  initializeDefaultFleetOperationDispatchStrategies,
} from "../src/services/fleetOperationDispatchService.js";

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
assert.equal(createResult.policyResults.length, 1);
assert.equal(createResult.policyResults[0].result_status, FleetOperationPolicyResultStatus.TASK_CREATED);
assert.equal(createResult.policyResults[0].fleet_operation_policy_run_id, createResult.run.fleet_operation_policy_run_id);
assert.equal(createResult.tasks[0].task_type, TaskType.CLEANING);
assert.equal(createResult.tasks[0].trigger_source, "FLEET_OPERATION_POLICY");
assert.equal(createResult.tasks[0].trigger_object_id, cleaningPolicy.fleet_operation_policy_id);
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
assert.equal(chargingResult.tasks[0].target_battery_percent, 100);

const directResult = createDirectFleetOperationTask({
  taskType: TaskType.CLEANING,
  robotaxi: createRobotaxi({ robotaxi_id: "RT-DIRECT-CLEAN" }),
  existingTasks: [],
  taskFields: {
    trigger_object_type: "robotaxi",
    trigger_object_id: "RT-DIRECT-CLEAN",
  },
  context: createContext(),
});
assert.equal(directResult.created, true);
assert.equal(directResult.task.trigger_source, "DIRECT_ROBOTAXI_OPERATION");
assert.equal(directResult.task.trigger_object_type, "robotaxi");
assert.equal(directResult.task.trigger_object_id, "RT-DIRECT-CLEAN");

const queuedDirectResult = createDirectFleetOperationTask({
  taskType: TaskType.CLEANING,
  robotaxi: createRobotaxi({ robotaxi_id: "RT-IN-SERVICE", current_order_id: "SO-001" }),
  existingTasks: [],
  taskFields: {
    trigger_object_type: "robotaxi",
    trigger_object_id: "RT-IN-SERVICE",
  },
  context: createContext(),
});
assert.equal(queuedDirectResult.created, true);
assert.equal(queuedDirectResult.queued, true);
assert.equal(queuedDirectResult.task.task_status, "WAITING_ROBOTAXI_AVAILABLE");
assert.equal(queuedDirectResult.robotaxi.pending_task_queue.length, 1);
assert.equal(queuedDirectResult.robotaxi.pending_task_queue[0].task_id, queuedDirectResult.task.task_id);
assert.equal(queuedDirectResult.robotaxi.pending_task_queue[0].task_type, TaskType.CLEANING);

const dispatchStrategy = initializeDefaultFleetOperationDispatchStrategies()[0];
let dispatchRunSequence = 0;
let dispatchDecisionSequence = 0;
const dispatchContext = {
  now: () => "2026-07-02T00:00:00.000Z",
  nextDispatchRunId: () => `FODR-${String(++dispatchRunSequence).padStart(4, "0")}`,
  nextDispatchDecisionId: () => `FODD-${String(++dispatchDecisionSequence).padStart(4, "0")}`,
};
const dispatchResult = dispatchFleetOperationDestination({
  task: { task_id: "TASK-CLN-9999", task_type: TaskType.CLEANING },
  robotaxi: { robotaxi_id: "RT-DISPATCH", current_cell_id: "C-00-00" },
  strategy: dispatchStrategy,
  cells: [
    { cell_id: "C-00-00", row: 0, col: 0 },
    { cell_id: "C-01-00", row: 1, col: 0 },
    { cell_id: "C-09-09", row: 9, col: 9 },
  ],
  opsCenters: [
    { ops_center_id: "OC-FAR", cell_ids: ["C-09-09"], can_clean_robotaxi: true },
    { ops_center_id: "OC-NEAR", cell_ids: ["C-01-00"], can_clean_robotaxi: true },
  ],
  context: dispatchContext,
});
assert.equal(dispatchResult.targetOpsCenterId, "OC-NEAR", "NEAREST_AVAILABLE 应选择距离最近的具备能力运营中心");
assert.equal(dispatchResult.decision.distance_m, 50, "调度结果应记录可解释距离");

const failedDispatch = dispatchFleetOperationDestination({
  task: { task_id: "TASK-CLN-0000", task_type: TaskType.CLEANING },
  robotaxi: { robotaxi_id: "RT-NO-CENTER", current_cell_id: "C-00-00" },
  strategy: dispatchStrategy,
  opsCenters: [],
  context: dispatchContext,
});
assert.match(failedDispatch.run.fleet_operation_dispatch_run_id, /^FODR-\d{4}$/);
assert.match(failedDispatch.decision.fleet_operation_dispatch_decision_id, /^FODD-\d{4}$/);

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
    nextResultId: () => `FOP-RESULT-${String(runSequence + taskSequence + 1).padStart(4, "0")}`,
    serviceOrders: [
      { service_order_id: "SO-HISTORY-1", matched_robotaxi_id: "RT-CLEAN-NEED" },
      { service_order_id: "SO-HISTORY-2", matched_robotaxi_id: "RT-LOW-BATTERY" },
      { service_order_id: "SO-HISTORY-3", matched_robotaxi_id: "RT-DIRECT-CLEAN" },
      { service_order_id: "SO-001", matched_robotaxi_id: "RT-IN-SERVICE" },
    ],
  };
}
