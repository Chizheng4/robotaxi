import assert from "node:assert/strict";

import { runOrderMatching } from "../src/data/orderMatchingEngine.js";
import { TaskType } from "../src/domain/taskTypes.js";
import { createFleetOperationTask } from "../src/services/fleetOperationTaskService.js";
import { canAcceptServiceOrder } from "../src/services/robotaxiService.js";
import { payServiceOrder } from "../src/services/serviceOrderService.js";
import { executeTaskDispatchStrategy, initializeDefaultTaskDispatchStrategies } from "../src/services/taskDispatchStrategyService.js";
import * as serviceOrderTypes from "../src/domain/serviceOrderTypes.js";
import * as tripTypes from "../src/domain/tripTypes.js";

const releasedRobotaxi = {
  robotaxi_id: "RT-V0409-001",
  availability_status: "AVAILABLE",
  available_for_dispatch: true,
  current_order_id: null,
  current_task_id: null,
  current_cell_id: "C-1-1",
  battery_percent: 80,
  battery_operation_status: "ENOUGH",
  cleanliness_status: "CLEAN",
  maintenance_status: "NORMAL",
  failure_status: "NONE",
  retirement_status: "ACTIVE",
  fleet_operation_status: "NONE",
};

const queuedResult = createFleetOperationTask({
  robotaxi: { ...releasedRobotaxi, current_order_id: "SO-V0409-001", cleanliness_status: "NEEDS_CLEANING" },
  taskType: TaskType.CLEANING,
  existingTasks: [],
  context: fixedContext(),
});

assert.equal(queuedResult.created, true);
assert.equal(queuedResult.queued, true);
assert.equal(queuedResult.robotaxi.pending_fleet_task_id, queuedResult.task.task_id);
assert.equal(queuedResult.robotaxi.availability_status, "AVAILABLE");
assert.equal(queuedResult.robotaxi.available_for_dispatch, true);
assert.equal(canAcceptServiceOrder(queuedResult.robotaxi), false);

const paymentResult = payServiceOrder({
  serviceOrder: {
    service_order_id: "SO-V0409-001",
    order_status: serviceOrderTypes.ServiceOrderStatus.WAITING_PAYMENT,
    final_price: 36,
  },
  trips: [{ trip_id: "TRIP-V0409-001", service_order_id: "SO-V0409-001", trip_status: tripTypes.TripStatus.WAITING_PAYMENT }],
  robotaxis: [queuedResult.robotaxi],
  completedAt: "2026-07-03T10:05:00.000Z",
  serviceOrderTypes,
  tripTypes,
});

assert.equal(paymentResult.success, true);
assert.equal(paymentResult.robotaxis[0].current_order_id, null);
assert.equal(paymentResult.robotaxis[0].availability_status, "AVAILABLE");
assert.equal(paymentResult.robotaxis[0].available_for_dispatch, true);
assert.equal(canAcceptServiceOrder(paymentResult.robotaxis[0]), false);

const matchingResult = runOrderMatching({
  strategy: {
    order_matching_strategy_id: "OMS-V0409",
    strategy_status: "ACTIVE",
    matching_algorithm: "NEAREST",
    min_battery_threshold: 20,
  },
  serviceOrder: {
    service_order_id: "SO-V0409-002",
    pickup_cell_id: "C-1-2",
    pickup_service_area_id: "SA-1",
    dropoff_cell_id: "C-2-2",
  },
  data: {
    maps: [{ cell_size_m: 50 }],
    cells: [
      { cell_id: "C-1-1", row: 1, col: 1 },
      { cell_id: "C-1-2", row: 1, col: 2 },
      { cell_id: "C-2-2", row: 2, col: 2 },
    ],
    robotaxis: [paymentResult.robotaxis[0]],
  },
  orderMatchingRunId: "OMR-V0409",
  orderMatchingDecisionId: "OMD-V0409",
  createdAt: "2026-07-03T10:06:00.000Z",
});

assert.equal(matchingResult.decision.decision_result, "FAILED");
assert.equal(matchingResult.decision.selected_robotaxi_id, null);

const taskDispatchResult = executeTaskDispatchStrategy({
  strategy: initializeDefaultTaskDispatchStrategies()[0],
  robotaxi: paymentResult.robotaxis[0],
  pendingFleetTasks: [queuedResult.task],
  serviceOrders: [],
  deploymentTasks: [],
  context: {
    now: () => "2026-07-03T10:07:00.000Z",
    nextTaskDispatchRunId: () => "TDR-V0409",
    nextTaskDispatchResultId: () => "TDRS-V0409",
  },
});

assert.equal(taskDispatchResult.succeeded, true);
assert.equal(taskDispatchResult.run.selected_candidate_type, "FLEET_OPERATION_TASK");
assert.equal(taskDispatchResult.run.selected_object_id, queuedResult.task.task_id);
assert.equal(taskDispatchResult.results[0].decision_result, "SELECTED");

console.log("v040.9 任务调度边界验证通过");

function fixedContext() {
  return {
    now: () => "2026-07-03T10:00:00.000Z",
    nextId: (prefix) => `${prefix}-V0409`,
    audit: () => ({ record_source: "TEST" }),
  };
}
