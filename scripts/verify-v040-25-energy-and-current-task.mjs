import assert from "node:assert/strict";
import fs from "node:fs";

import { createIncrementalCostRecords, initializeDefaultCostModelProfile } from "../src/data/costModelCalculator.js";
import { initializeOperationsCenter } from "../src/data/operationsCenterInitialization.js";
import { fieldDictionary, valueDictionary } from "../src/domain/fieldDictionary.js";
import { ChargingTaskStatus, RouteExecutionStatus } from "../src/domain/taskTypes.js";
import * as fleetOperationTaskService from "../src/services/fleetOperationTaskService.js";
import * as routePlanningService from "../src/services/routePlanningService.js";
import * as tripService from "../src/services/tripService.js";

const opsData = initializeOperationsCenter();
const baseRobotaxi = {
  ...opsData.robotaxis[0],
  availability_status: "AVAILABLE",
  available_for_dispatch: true,
};

assert.equal(fieldDictionary.current_battery_kwh, "当前电量（千瓦时）");
assert.equal(fieldDictionary.lifetime_battery_consumed_kwh, "累计耗电（千瓦时）");
assert.equal(fieldDictionary.battery_consumed_kwh, "已消耗电量（千瓦时）");
assert.equal(fieldDictionary.charged_energy_kwh, "补能电量（千瓦时）");
assert.equal(valueDictionary.AVAILABLE, "可运营");
assert.equal(baseRobotaxi.current_battery_kwh, Number((baseRobotaxi.battery_capacity_kwh * baseRobotaxi.battery_percent / 100).toFixed(2)));

const route = {
  route_id: "ROUTE-V04025-001",
  route_steps: [{ cell_id: "C-34-32" }, { cell_id: "C-34-33" }, { cell_id: "C-35-33" }],
  route_step_count: 2,
  total_step_count: 2,
  total_distance_m: 100,
  total_distance_km: 0.1,
};

const routeExecution = routePlanningService.applyTravelMetrics({
  record: {
    route_execution_id: "REX-V04025-001",
    task_id: "TASK-DP-V04025",
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

const routeStep = routePlanningService.advanceRouteExecution({
  execution: routeExecution,
  task: { task_id: "TASK-DP-V04025", task_status: "MOVING" },
  route,
  robotaxi: baseRobotaxi,
});
assert.ok(routeStep.execution.battery_consumed_kwh > 0);
assert.ok(routeStep.execution.battery_consumed_percent > 0);
assert.ok(Number(routeStep.execution.time_elapsed) > 0);
assert.ok(routeStep.robotaxi.current_battery_kwh < baseRobotaxi.current_battery_kwh);
assert.ok(routeStep.robotaxi.lifetime_battery_consumed_kwh > baseRobotaxi.lifetime_battery_consumed_kwh);

const trip = {
  trip_id: "TRIP-V04025-001",
  service_order_id: "SO-V04025-001",
  robotaxi_id: baseRobotaxi.robotaxi_id,
  trip_status: "ON_THE_WAY_DESTINATION",
  route_id: route.route_id,
  current_cell_id: "C-34-32",
  dropoff_cell_id: "C-35-33",
  current_step_index: 0,
  battery_consumed_kwh: 0,
  battery_consumed_percent: 0,
  time_elapsed: "0",
  robotaxi_battery_capacity_kwh: baseRobotaxi.battery_capacity_kwh,
};
const nextTrip = tripService.getNextTripMovementState(trip, { routes: [route] });
assert.ok(nextTrip.battery_consumed_kwh > 0);
assert.ok(nextTrip.battery_consumed_percent > 0);
assert.ok(Number(nextTrip.time_elapsed) > 0);

const chargingResult = fleetOperationTaskService.completeFleetOperationWork({
  task: {
    task_id: "TASK-CHG-V04025",
    task_type: "CHARGING",
    task_status: ChargingTaskStatus.CHARGING,
    robotaxi_id: baseRobotaxi.robotaxi_id,
    worker_id: "WK-001",
    target_battery_percent: 100,
  },
  robotaxi: {
    ...baseRobotaxi,
    battery_percent: 50,
    current_battery_kwh: 37.5,
  },
  context: { now: "2026-07-06T00:00:00.000Z" },
});
assert.equal(chargingResult.succeeded, true);
assert.equal(chargingResult.task.charged_energy_kwh, 37.5);
assert.equal(chargingResult.robotaxi.current_battery_kwh, 75);
assert.equal(chargingResult.robotaxi.battery_percent, 100);

const costResult = createIncrementalCostRecords({
  profile: initializeDefaultCostModelProfile(),
  sourceObjectType: "chargingTask",
  sourceObject: chargingResult.task,
  calculationRunId: "CCR-V04025-001",
});
const chargingEnergyRecord = costResult.costRecords.find((record) => record.cost_type === "ENERGY_COST");
assert.ok(chargingEnergyRecord);
assert.equal(chargingEnergyRecord.quantity_unit, "kWh");
assert.equal(chargingEnergyRecord.quantity, 37.5);

const mainSource = fs.readFileSync("src/main.jsx", "utf8");
assert.equal(mainSource.includes("currentTask?.task_type || robotaxi.current_task_type"), false);
assert.equal(mainSource.includes("currentTask?.task_status || robotaxi.current_task_status"), false);

console.log("v040.25 电量单位与当前任务事实闭环验证通过");
