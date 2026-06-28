import assert from "node:assert/strict";

import { createDefaultSimulationPolicy } from "../src/domain/simulationTypes.js";
import { initSimulationRun } from "../src/data/simulationEngine.js";
import * as businessActionService from "../src/services/businessActionService.js";

const defaultPolicy = createDefaultSimulationPolicy();
assert.equal(defaultPolicy.tick_seconds, 1, "默认模拟 Tick 必须按秒推进");
assert.equal(defaultPolicy.tick_minutes, 1 / 60, "tick_minutes 只保留为秒级 Tick 的兼容分钟表达");

const run = initSimulationRun({
  simulationName: "v032.6 秒级时间验证",
  simulationPolicy: defaultPolicy,
}).simulationRun;
assert.equal(run.tick_seconds, 1);
assert.equal(run.total_ticks, 86400);
assert.equal(run.current_time, "Day 1 00:00:00");

const serviceOrderResult = businessActionService.createServiceOrder({
  state: createDemandState(),
  runtime: createRuntime({ seconds: 0 }),
});
assert.equal(serviceOrderResult.success, true, serviceOrderResult.message);
const createdOrder = serviceOrderResult.updates.serviceOrders[0];
assert.ok(createdOrder.demand_simulation_result_id, "服务订单必须保存需求模拟结果编号");
assert.match(createdOrder.demand_simulation_result_id, /^DSR-RESULT-/);

const readinessResult = businessActionService.startReadinessTask({
  state: createReadinessState(),
  objectId: "TASK-RC-V0326",
  runtime: createRuntime({
    seconds: 5,
    simulationTimestamp: "Day 1 00:00:05",
    policySnapshot: {
      execution_time_config: {
        readiness_check_seconds: 12,
      },
    },
  }),
});
assert.equal(readinessResult.success, true, readinessResult.message);
const workerCheck = readinessResult.updates.timedOperations[0];
assert.equal(workerCheck.operation_type, "WORKER_CHECK");
assert.equal(workerCheck.start_seconds, 5);
assert.equal(workerCheck.duration_seconds, 12);
assert.equal(workerCheck.planned_completed_seconds, 17);
assert.equal(workerCheck.simulation_started_at, "Day 1 00:00:05");
assert.equal(workerCheck.simulation_planned_completed_at, "Day 1 00:00:17");

console.log("v032.6 时间解释性与配置合同验证通过");

function createRuntime({ seconds = 0, simulationTimestamp = "Day 1 00:00:00", policySnapshot = {} } = {}) {
  let sequence = 0;
  return {
    nextId: (prefix) => {
      sequence += 1;
      return `${prefix}-${String(sequence).padStart(3, "0")}`;
    },
    now: () => "2026-06-28T00:00:00.000Z",
    simulationTime: () => simulationTimestamp,
    randomSeed: () => "v0326",
    audit: (options = {}) => ({
      record_source: "SIMULATION",
      simulation_run_id: "SIM-RUN-V0326",
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
    policySnapshot,
  };
}

function createDemandState() {
  return {
    data: {
      customers: [{ customer_id: "CUS-V0326", customer_status: "ACTIVE" }],
      places: [{
        place_id: "PLACE-V0326",
        place_status: "Active",
        cell_ids: ["C-00-00"],
      }],
      cells: [
        { cell_id: "C-00-00", row: 0, col: 0, traversable: true },
        { cell_id: "C-00-01", row: 0, col: 1, traversable: true },
      ],
      serviceAreas: [
        {
          service_area_id: "SA-PICKUP",
          service_area_status: "ACTIVE",
          pickup_cell_ids: ["C-00-00"],
          dropoff_cell_ids: ["C-00-00"],
          standby_cell_ids: ["C-00-00"],
          vehicle_capabilities: { can_stage: true },
        },
        {
          service_area_id: "SA-DROPOFF",
          service_area_status: "ACTIVE",
          pickup_cell_ids: ["C-00-01"],
          dropoff_cell_ids: ["C-00-01"],
          standby_cell_ids: ["C-00-01"],
          vehicle_capabilities: { can_stage: true },
        },
      ],
      demandSimulationStrategies: [{
        demand_simulation_strategy_id: "DSS-V0326",
        strategy_name: "v032.6 需求验证",
        simulation_algorithm: "SEEDED_RANDOM_DEMAND",
        location_type_weights: { PLACE: 1, ROAD_SEGMENT: 0, CELL: 0 },
      }],
    },
    demandSimulationRuns: [],
    serviceOrders: [],
  };
}

function createReadinessState() {
  return {
    readinessTasks: [{
      task_id: "TASK-RC-V0326",
      task_status: "WAITING_CHECK",
      robotaxi_id: "RT-V0326",
      worker_id: "W-V0326",
    }],
    robotaxis: [{
      robotaxi_id: "RT-V0326",
      availability_status: "PENDING_INSPECTION",
      current_task_id: "TASK-RC-V0326",
    }],
    timedOperations: [],
  };
}
