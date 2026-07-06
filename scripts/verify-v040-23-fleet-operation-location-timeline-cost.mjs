import assert from "node:assert/strict";

import { initializeMapSpace } from "../src/data/mapInitialization.js";
import { initializeOperationsCenter } from "../src/data/operationsCenterInitialization.js";
import { initializeDefaultCostModelProfile } from "../src/data/costModelCalculator.js";
import {
  assignFleetOperationWorker,
  activateQueuedFleetOperationTask,
  advanceFleetOperationRouteExecution,
  completeFleetOperationWork,
  confirmFleetOperationArrival,
  createFleetOperationRouteExecution,
  dispatchFleetOperationTaskDestination,
  planFleetOperationRoute,
  startFleetOperationWork,
} from "../src/services/fleetOperationTaskService.js";
import {
  dispatchFleetOperationDestination,
} from "../src/services/fleetOperationDispatchService.js";

const mapData = initializeMapSpace();
const opsData = initializeOperationsCenter();
const data = { ...mapData, ...opsData };
const costModelProfile = initializeDefaultCostModelProfile();

const context = createContext();
const queuedMaintenanceTask = {
  task_id: "TASK-MNT-V04023-Q",
  task_type: "MAINTENANCE",
  task_status: "WAITING_ROBOTAXI_AVAILABLE",
  robotaxi_id: "RT-V04023",
  simulation_status_transition_history: [],
};
const robotaxiInOpsCenter = {
  robotaxi_id: "RT-V04023",
  current_cell_id: "C-34-32",
  pending_task_queue: [{ task_id: queuedMaintenanceTask.task_id, task_type: "MAINTENANCE", queue_sequence: 1 }],
  availability_status: "AVAILABLE",
  available_for_dispatch: true,
};

const activation = activateQueuedFleetOperationTask({
  task: queuedMaintenanceTask,
  robotaxi: robotaxiInOpsCenter,
  opsCenters: data.opsCenters,
  context,
});
assert.equal(activation.succeeded, true, "排队运维任务必须能被激活");
assert.equal(activation.alreadyAtCapableCenter, true, "Robotaxi 在具备职能的运营中心内部时应识别为已在站点");
assert.equal(activation.task.task_status, "WAITING_RESOURCE_ASSIGNMENT", "维修任务应直接进入待分配 Worker / 资源");
assert.equal(activation.task.target_cell_id, "C-34-32", "无需分配目的站点时目标 Cell 应为当前位置");
assert.equal(activation.task.simulation_status_transition_history.at(-1).action_type, "FLEET_OPERATION_TASK_ACTIVATE");

const skippedDispatch = dispatchFleetOperationTaskDestination({
  task: {
    task_id: "TASK-MNT-V04023-D",
    task_type: "MAINTENANCE",
    task_status: "WAITING_MAINTENANCE_DESTINATION_ASSIGNMENT",
    robotaxi_id: robotaxiInOpsCenter.robotaxi_id,
  },
  robotaxi: robotaxiInOpsCenter,
  opsCenters: data.opsCenters,
  cells: data.cells,
  context,
});
assert.equal(skippedDispatch.succeeded, true, "运维调度兜底应返回成功");
assert.equal(skippedDispatch.dispatchSkipped, true, "已在具备职能运营中心内部时应跳过调度");
assert.equal(skippedDispatch.run, null, "无需分配时不应生成调度执行");
assert.equal(skippedDispatch.decision, null, "无需分配时不应生成调度结果");
assert.equal(skippedDispatch.task.task_status, "WAITING_RESOURCE_ASSIGNMENT", "任务单接收兜底后应直接进入待分配 Worker / 资源");

const roadAccessDispatch = dispatchFleetOperationDestination({
  task: { task_id: "TASK-MNT-V04023-R", task_type: "MAINTENANCE" },
  robotaxi: { robotaxi_id: "RT-V04023-R", current_cell_id: "C-35-31" },
  opsCenters: data.opsCenters,
  cells: data.cells,
  context,
});
assert.equal(roadAccessDispatch.dispatchSkipped, undefined, "接入道路 Cell 不能被识别为已在作业站点");
assert.equal(roadAccessDispatch.targetCellId, "C-35-33", "接入道路上的维修任务仍应调度到维修职能目的 Cell");

const routeContext = createContext();
const routeTask = {
  task_id: "TASK-CLN-V04023-R",
  task_type: "CLEANING",
  task_status: "WAITING_ROUTE",
  robotaxi_id: "RT-V04023-R",
  origin_cell_id: "C-35-31",
  target_ops_center_id: "OC-001",
  target_cell_id: "C-34-32",
  simulation_status_transition_history: [],
};
let routeRobotaxi = {
  robotaxi_id: "RT-V04023-R",
  current_cell_id: "C-35-31",
  availability_status: "UNAVAILABLE",
  available_for_dispatch: false,
};
const routeCreate = createFleetOperationRouteExecution({
  task: routeTask,
  robotaxi: routeRobotaxi,
  context: routeContext,
});
assert.equal(routeCreate.succeeded, true, "运维任务应能通过服务层创建运营行驶记录");
assert.equal(routeCreate.routeExecution.execution_status, "WAITING_ROUTE", "运营行驶记录创建后必须先等待路径规划");
assert.equal(routeCreate.routeExecution.simulation_status_transition_history.at(-1).to_status, "WAITING_ROUTE");

const routePlan = planFleetOperationRoute({
  task: routeCreate.task,
  robotaxi: routeCreate.robotaxi,
  execution: routeCreate.routeExecution,
  data,
  context: routeContext,
});
assert.equal(routePlan.succeeded, true, "运维任务应能通过服务层规划运营行驶记录");
assert.equal(routePlan.routeExecution.execution_status, "MOVING");
assert.equal(routePlan.routeExecution.simulation_status_transition_history.at(-1).action_type, "ROUTE_PLAN");
assert.equal(routePlan.task.simulation_status_transition_history.at(-1).action_type, "FLEET_OPERATION_ROUTE_PLAN", "运维任务应记录自己的路径规划动作");
assert.ok(!routePlan.task.simulation_status_transition_history.some((item) => item.action_type === "ROUTE_PLAN"), "运维任务时间线不得混入行驶记录路径规划动作");

let execution = routePlan.routeExecution;
let activeRouteTask = routePlan.task;
routeRobotaxi = routePlan.robotaxi;
for (let i = 0; i < 20 && execution.execution_status !== "ARRIVED"; i += 1) {
  const step = advanceFleetOperationRouteExecution({
    execution,
    task: activeRouteTask,
    route: routePlan.route,
    robotaxi: routeRobotaxi,
    context: routeContext,
  });
  assert.equal(step.succeeded, true, "运营行驶记录推进必须成功");
  execution = step.routeExecution;
  activeRouteTask = step.task;
  routeRobotaxi = step.robotaxi;
}
assert.equal(execution.execution_status, "ARRIVED", "运营行驶记录应能到达目的地");
assert.ok(activeRouteTask.simulation_status_transition_history.some((item) => item.action_type === "FLEET_OPERATION_ROUTE_PROGRESS"), "运维任务应使用自己的行驶进展动作");
assert.ok(!activeRouteTask.simulation_status_transition_history.some((item) => item.action_type === "ROUTE_EXECUTION_STEP"), "运维任务时间线不得混入行驶记录推进动作");
const confirmed = confirmFleetOperationArrival({
  execution,
  task: activeRouteTask,
  robotaxi: routeRobotaxi,
  context: {
    ...routeContext,
    costModelProfile,
    costRecords: [],
    businessData: { ...data, routes: [routePlan.route], routeExecutions: [execution] },
    nextCostFactRunId: () => "CFR-V04023-ROUTE",
  },
});
assert.equal(confirmed.succeeded, true, "运维行驶记录正常到达确认必须成功");
assert.equal(confirmed.routeExecution.execution_status, "COMPLETED");
assert.equal(confirmed.routeExecution.simulation_status_transition_history.at(-1).to_status, "COMPLETED");
assert.equal(confirmed.task.task_status, "WAITING_WORKER_ASSIGNMENT", "清洁任务正常到达后应进入待分配 Worker");
assert.equal(confirmed.task.simulation_status_transition_history.at(-1).action_type, "FLEET_OPERATION_ROUTE_ARRIVAL_RESULT", "运维任务应使用自己的到达结果动作");
assert.ok(!confirmed.task.simulation_status_transition_history.some((item) => item.action_type === "ARRIVAL_CONFIRM"), "运维任务时间线不得混入行驶记录到达确认动作");
assert.ok(confirmed.costRecords.some((record) =>
  record.source_object_type === "routeExecution"
  && record.source_object_id === confirmed.routeExecution.route_execution_id
), "运维行驶记录完成必须生成行驶成本事实");

const workerTask = {
  task_id: "TASK-CLN-V04023-W",
  task_type: "CLEANING",
  task_status: "WAITING_WORKER_ASSIGNMENT",
  robotaxi_id: "RT-V04023-W",
  target_ops_center_id: "OC-001",
  simulation_status_transition_history: [],
};
const workerRobotaxi = {
  robotaxi_id: "RT-V04023-W",
  current_cell_id: "C-34-32",
  availability_status: "UNAVAILABLE",
  available_for_dispatch: false,
};
const assigned = assignFleetOperationWorker({
  task: workerTask,
  robotaxi: workerRobotaxi,
  workers: [{ worker_id: "WK-V04023", ops_center_id: "OC-001", worker_status: "IDLE", current_task_id: null }],
  context,
});
assert.equal(assigned.succeeded, true);
assert.equal(assigned.task.simulation_status_transition_history.at(-1).action_type, "FLEET_OPERATION_WORKER_ASSIGN");
const started = startFleetOperationWork({ task: assigned.task, robotaxi: assigned.robotaxi, context });
assert.equal(started.succeeded, true);
assert.equal(started.task.simulation_status_transition_history.at(-1).action_type, "FLEET_OPERATION_WORK_START");
const completed = completeFleetOperationWork({
  task: started.task,
  robotaxi: started.robotaxi,
  context: {
    ...context,
    costModelProfile,
    costRecords: confirmed.costRecords,
    businessData: data,
    nextCostFactRunId: () => "CFR-V04023-WORK",
  },
});
assert.equal(completed.succeeded, true);
assert.equal(completed.task.task_status, "COMPLETED");
assert.equal(completed.task.simulation_status_transition_history.at(-1).action_type, "FLEET_OPERATION_WORK_COMPLETE");
assert.ok(completed.costRecords.some((record) =>
  record.source_object_type === "cleaningTask"
  && record.source_object_id === completed.task.task_id
), "运维任务完成必须生成作业成本事实");

console.log("v040.23 运维位置兜底、状态时间线与成本事实合同验证通过");

function createContext() {
  let id = 0;
  return {
    now: () => "2026-07-05T12:30:00.000Z",
    simulationTime: () => "Day 1 00:30:00",
    nextId: (prefix) => `${prefix}-V04023-${String(++id).padStart(3, "0")}`,
  };
}
