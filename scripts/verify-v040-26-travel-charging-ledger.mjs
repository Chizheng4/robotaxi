import assert from "node:assert/strict";

import { executeTick } from "../src/data/simulationLoop.js";
import { initializeOperationsCenter } from "../src/data/operationsCenterInitialization.js";
import { fieldDictionary } from "../src/domain/fieldDictionary.js";
import { SimulationStatus } from "../src/domain/simulationTypes.js";
import { TimedOperationStatus, TimedOperationType } from "../src/domain/timedOperationTypes.js";
import { ChargingTaskStatus, RouteExecutionStatus, TaskType } from "../src/domain/taskTypes.js";
import * as fleetOperationTaskService from "../src/services/fleetOperationTaskService.js";
import * as routePlanningService from "../src/services/routePlanningService.js";

const opsData = initializeOperationsCenter();
const baseRobotaxi = {
  ...opsData.robotaxis[0],
  availability_status: "AVAILABLE",
  available_for_dispatch: true,
  current_cell_id: "C-34-32",
};

assert.equal(fieldDictionary.battery_consumed_kwh, "已耗电（千瓦时）");
assert.equal(fieldDictionary.lifetime_charged_energy_kwh, "累计充电量（千瓦时）");
assert.equal(fieldDictionary.robotaxi_current_battery_kwh, "当前电量（千瓦时）");
assert.equal(fieldDictionary.robotaxi_battery_capacity_kwh, "总电量（千瓦时）");
assert.equal(fieldDictionary.charged_energy_kwh, "已充电量（千瓦时）");

const route = {
  route_id: "ROUTE-V04026-001",
  route_steps: [{ cell_id: "C-34-32" }, { cell_id: "C-34-33" }, { cell_id: "C-35-33" }],
  route_step_count: 2,
  total_step_count: 2,
  total_distance_m: 100,
  total_distance_km: 0.1,
};
const execution = routePlanningService.applyTravelMetrics({
  record: {
    route_execution_id: "REX-V04026-001",
    simulation_run_id: "SIM-V04026-001",
    task_id: "TASK-DP-V04026",
    robotaxi_id: baseRobotaxi.robotaxi_id,
    execution_status: RouteExecutionStatus.MOVING,
    route_id: route.route_id,
    origin_cell_id: "C-34-32",
    current_cell_id: "C-34-32",
    target_cell_id: "C-35-33",
    route_cell_ids: ["C-34-32", "C-34-33", "C-35-33"],
    current_step_index: 0,
    total_step_count: 2,
    battery_consumed_kwh: 0,
    battery_consumed_percent: 0,
    time_elapsed: "0",
  },
  routes: [route],
  currentRouteId: route.route_id,
  currentStepIndex: 0,
});
const projected = routePlanningService.projectRouteExecutionTravelProgress({
  execution,
  route,
  elapsedSeconds: 6,
  cellTravelSeconds: 6,
  robotaxi: baseRobotaxi,
});
assert.ok(projected.battery_consumed_kwh > 0);
assert.equal(projected.battery_consumed_kwh, 0.01);

let routeExecutions = [execution];
let robotaxis = [baseRobotaxi];
const simulationRun = {
  simulation_run_id: "SIM-V04026-001",
  simulation_status: SimulationStatus.RUNNING,
  current_simulation_seconds: 6,
  current_time: "Day 1 00:00:06",
  current_day: 1,
  current_day_tick: 6,
  current_global_tick: 6,
  current_run_tick: 6,
  tick_seconds: 1,
  simulation_policy_snapshot: {
    simulation_performance_config: { ui_snapshot_interval_seconds: 6 },
  },
};
executeTick({
  simulationRun,
  policySnapshot: simulationRun.simulation_policy_snapshot,
  businessData: {
    routes: [route],
    routeExecutions,
    trips: [],
    robotaxis,
    timedOperations: [{
      timed_operation_id: "TOP-V04026-001",
      simulation_run_id: "SIM-V04026-001",
      operation_type: TimedOperationType.TRAVEL,
      operation_status: TimedOperationStatus.PENDING,
      object_type: "routeExecution",
      object_id: execution.route_execution_id,
      action_type: null,
      start_seconds: 0,
      duration_seconds: 12,
      elapsed_seconds: 0,
      remaining_seconds: 12,
      progress_percent: 0,
      operation_payload: { route_id: route.route_id, cell_travel_seconds: 6 },
    }],
    setTimedOperations: () => {},
    setRouteExecutions: (updater) => { routeExecutions = updater(routeExecutions); },
    setTrips: () => {},
    setRobotaxis: (updater) => { robotaxis = updater(robotaxis); },
  },
});
assert.equal(routeExecutions[0].battery_consumed_kwh, 0.01);
assert.equal(robotaxis[0].lifetime_distance_km, 0.05);
assert.equal(robotaxis[0].lifetime_battery_consumed_kwh, 0.01);
assert.ok(robotaxis[0].current_battery_kwh < baseRobotaxi.current_battery_kwh);

const chargingRobotaxi = {
  ...baseRobotaxi,
  current_cell_id: "C-35-32",
  battery_percent: 50,
  current_battery_kwh: 37.5,
  lifetime_charged_energy_kwh: 0,
};
const chargingCreate = fleetOperationTaskService.createFleetOperationTask({
  robotaxi: chargingRobotaxi,
  taskType: TaskType.CHARGING,
  existingTasks: [],
  trigger: { trigger_source: "ROBOTAXI_MANAGEMENT" },
  context: {
    now: "2026-07-06T00:00:00.000Z",
    opsCenters: opsData.opsCenters,
    deploymentTasks: [{ task_id: "TASK-DP-HISTORY", robotaxi_id: chargingRobotaxi.robotaxi_id, task_status: "COMPLETED" }],
  },
});
assert.equal(chargingCreate.created, true);
assert.equal(chargingCreate.task.robotaxi_current_battery_kwh, 37.5);
assert.equal(chargingCreate.task.robotaxi_battery_capacity_kwh, 75);
assert.equal(chargingCreate.task.target_battery_percent, 100);

const chargingComplete = fleetOperationTaskService.completeFleetOperationWork({
  task: {
    ...chargingCreate.task,
    worker_id: "WK-001",
    task_status: ChargingTaskStatus.CHARGING,
  },
  robotaxi: chargingRobotaxi,
  context: { now: "2026-07-06T00:30:00.000Z" },
});
assert.equal(chargingComplete.succeeded, true);
assert.equal(chargingComplete.task.charged_energy_kwh, 37.5);
assert.equal(chargingComplete.robotaxi.current_battery_kwh, 75);
assert.equal(chargingComplete.robotaxi.battery_percent, 100);
assert.equal(chargingComplete.robotaxi.lifetime_charged_energy_kwh, 37.5);

const disconnectComplete = fleetOperationTaskService.completeFleetOperationWork({
  task: {
    ...chargingComplete.task,
    worker_id: "WK-001",
    task_status: ChargingTaskStatus.READY_TO_DISCONNECT,
  },
  robotaxi: chargingComplete.robotaxi,
  context: { now: "2026-07-06T00:35:00.000Z" },
});
assert.equal(disconnectComplete.succeeded, true);
assert.equal(disconnectComplete.robotaxi.lifetime_charged_energy_kwh, 37.5);
assert.equal(disconnectComplete.robotaxi.completed_charging_count, 1);

console.log("v040.26 行驶耗电与充电资产台账闭环验证通过");
