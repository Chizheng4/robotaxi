import assert from "node:assert/strict";

import { executeActions, registerActionHandlers } from "../src/data/simulationExecutionEngine.js";
import { executeTick } from "../src/data/simulationLoop.js";
import {
  handleDeploymentTaskCreate,
  handleReadinessTaskAssign,
  handleReadinessTaskCreate,
  handleReadinessTaskPass,
  handleReadinessTaskStart,
} from "../src/services/simulationHandlers.js";

registerActionHandlers({
  READINESS_TASK_CREATE: handleReadinessTaskCreate,
  READINESS_TASK_ASSIGN: handleReadinessTaskAssign,
  READINESS_TASK_START: handleReadinessTaskStart,
  READINESS_TASK_PASS: handleReadinessTaskPass,
  DEPLOYMENT_TASK_CREATE: handleDeploymentTaskCreate,
});

const businessData = createBusinessData();
const context = createContext(0);

runAction({ actionType: "READINESS_TASK_CREATE", objectId: null }, context);
const readinessTaskId = businessData.readinessTasks[0].task_id;
runAction({ actionType: "READINESS_TASK_ASSIGN", objectId: readinessTaskId }, context);
runAction({ actionType: "READINESS_TASK_START", objectId: readinessTaskId }, context);

const workerCheckOperation = businessData.timedOperations.find((operation) =>
  operation.object_type === "readinessTask" &&
  operation.object_id === readinessTaskId &&
  operation.operation_type === "WORKER_CHECK" &&
  operation.action_type === "READINESS_TASK_PASS"
);
assert.ok(workerCheckOperation, "准入检查开始后必须生成 WORKER_CHECK 时间作业");
assert.equal(workerCheckOperation.duration_seconds, 12);
assert.equal(getReadinessTask(readinessTaskId).task_status, "CHECKING");

executeTick({
  simulationRun: createRun(12),
  policySnapshot: createPolicy(),
  businessData,
});
assert.equal(getReadinessTask(readinessTaskId).task_status, "COMPLETED");
assert.equal(getReadinessTask(readinessTaskId).check_result, "PASSED");
assert.equal(getRobotaxi("RT-READINESS-001").availability_status, "AVAILABLE");

runAction({ actionType: "DEPLOYMENT_TASK_CREATE", objectId: null }, createContext(18));
const deploymentTask = businessData.deploymentTasks[0];
assert.notEqual(deploymentTask.planned_target_cell_id, deploymentTask.origin_cell_id);
assert.ok(["SA-HIGH", "SA-LOW"].includes(deploymentTask.planned_target_service_area_id));
assert.equal(deploymentTask.deployment_target_model, "TEMPORARY_RANDOM_SERVICE_AREA");
assert.equal(deploymentTask.rebalance_reason, "RANDOM_SERVICE_AREA_DISPATCH");

console.log("v032.4 供给侧时间作业与随机服务区投放验证通过");

function runAction(action, runContext) {
  const [result] = executeActions([action], businessData, runContext);
  assert.equal(result.success, true, result.message);
  return result;
}

function getReadinessTask(taskId) {
  return businessData.readinessTasks.find((task) => task.task_id === taskId);
}

function getRobotaxi(robotaxiId) {
  return businessData.robotaxis.find((robotaxi) => robotaxi.robotaxi_id === robotaxiId);
}

function createContext(seconds) {
  return {
    simulationRunId: "SIM-RUN-V032-SUPPLY",
    globalTick: Math.floor(seconds / 6),
    tickContext: {
      current_time: `Day 1 00:00:${String(seconds).padStart(2, "0")}`,
      current_simulation_seconds: seconds,
      global_tick: Math.floor(seconds / 6),
    },
    policySnapshot: createPolicy(),
  };
}

function createRun(seconds) {
  return {
    simulation_run_id: "SIM-RUN-V032-SUPPLY",
    simulation_status: "RUNNING",
    current_simulation_seconds: seconds,
    current_time: `Day 1 00:00:${String(seconds).padStart(2, "0")}`,
    current_day: 1,
    current_day_tick: Math.floor(seconds / 6),
    current_global_tick: Math.floor(seconds / 6),
    current_run_tick: Math.floor(seconds / 6),
    tick_seconds: 6,
    total_ticks: 100,
    simulation_policy_snapshot: createPolicy(),
  };
}

function createPolicy() {
  return {
    tick_seconds: 6,
    tick_minutes: 0.1,
    supply_trigger_config: { supply_trigger_enabled: false },
    demand_generation_enabled: false,
    service_order_auto_config: {},
    default_completion_config: {},
    execution_time_config: { readiness_check_seconds: 12 },
    worker_work_start_time: "00:00:00",
    worker_work_end_time: "23:59:59",
    robotaxi_operating_start_time: "00:00:00",
    robotaxi_operating_end_time: "23:59:59",
  };
}

function createBusinessData() {
  const data = {
    maps: [{ map_id: "MAP-VERIFY", cell_size_m: 100 }],
    cells: Array.from({ length: 6 }, (_, col) => ({ cell_id: `C-00-0${col}`, row: 0, col })),
    roadNodes: Array.from({ length: 6 }, (_, col) => ({ road_node_id: `RN-00-0${col}`, cell_id: `C-00-0${col}` })),
    roadSegments: [{
      road_segment_id: "RS-VERIFY-001",
      cell_sequence: ["C-00-00", "C-00-01", "C-00-02", "C-00-03", "C-00-04", "C-00-05"],
      allowed_direction: "BIDIRECTIONAL",
      segment_status: "ACTIVE",
    }],
    zones: [{ zone_id: "ZONE-VERIFY", service_area_ids: ["SA-HIGH", "SA-LOW"] }],
    serviceAreas: [
      {
        service_area_id: "SA-HIGH",
        zone_id: "ZONE-VERIFY",
        cell_ids: ["C-00-01", "C-00-02"],
        standby_cell_ids: ["C-00-01", "C-00-02"],
        vehicle_capabilities: { can_stage: true },
      },
      {
        service_area_id: "SA-LOW",
        zone_id: "ZONE-VERIFY",
        cell_ids: ["C-00-05"],
        standby_cell_ids: ["C-00-05"],
        vehicle_capabilities: { can_stage: true },
      },
    ],
    workers: [{ worker_id: "W-VERIFY-001", worker_status: "IDLE" }],
    robotaxis: [
      {
        robotaxi_id: "RT-READINESS-001",
        availability_status: "PENDING_INSPECTION",
        current_task_id: null,
        current_order_id: null,
        current_cell_id: "C-00-00",
        battery_percent: 90,
      },
      {
        robotaxi_id: "RT-DEPLOY-001",
        availability_status: "AVAILABLE",
        current_task_id: null,
        current_order_id: null,
        current_cell_id: "C-00-01",
        battery_percent: 90,
      },
      {
        robotaxi_id: "RT-HIGH-001",
        availability_status: "AVAILABLE",
        current_task_id: null,
        current_order_id: null,
        current_cell_id: "C-00-02",
        battery_percent: 90,
      },
    ],
    routes: [],
    routePlanningRuns: [],
  };
  const businessData = {
    serviceOrders: [],
    trips: [],
    readinessTasks: [],
    deploymentTasks: [],
    routeExecutions: [],
    routes: data.routes,
    routePlanningRuns: data.routePlanningRuns,
    robotaxis: data.robotaxis,
    timedOperations: [],
    taskEventLogs: [],
    data,
  };
  const refresh = () => {
    businessData.data = {
      ...businessData.data,
      readinessTasks: businessData.readinessTasks,
      deploymentTasks: businessData.deploymentTasks,
      routeExecutions: businessData.routeExecutions,
      routes: businessData.routes,
      routePlanningRuns: businessData.routePlanningRuns,
      robotaxis: businessData.robotaxis,
      timedOperations: businessData.timedOperations,
    };
  };
  const bindSetter = (key) => (updater) => {
    businessData[key] = typeof updater === "function" ? updater(businessData[key]) : updater;
    refresh();
  };
  businessData.setReadinessTasks = bindSetter("readinessTasks");
  businessData.setDeploymentTasks = bindSetter("deploymentTasks");
  businessData.setRouteExecutions = bindSetter("routeExecutions");
  businessData.setRoutes = bindSetter("routes");
  businessData.setRoutePlanningRuns = bindSetter("routePlanningRuns");
  businessData.setRobotaxis = bindSetter("robotaxis");
  businessData.setTimedOperations = bindSetter("timedOperations");
  refresh();
  return businessData;
}
