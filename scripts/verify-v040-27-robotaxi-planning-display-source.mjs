import assert from "node:assert/strict";
import fs from "node:fs";
import { initializeOperationsCenter } from "../src/data/operationsCenterInitialization.js";
import { TaskType } from "../src/domain/taskTypes.js";
import * as fleetOperationTaskService from "../src/services/fleetOperationTaskService.js";

const mainSource = fs.readFileSync("src/main.jsx", "utf8");

assert.ok(
  mainSource.includes('return findPageMenuLabel(page) || tableConfig[page]?.title || "业务页面";'),
  "页面页签名称必须优先使用菜单中文名，避免 Robotaxi 列表打开后显示为 Robotaxi 管理",
);

assert.ok(
  mainSource.includes("enrichRobotaxiForDisplay(robotaxi, data, readinessTasks, deploymentTasks, allFleetOperationTasks, routeExecutions)"),
  "Robotaxi 列表展示必须读取运维任务集合，避免当前清洁/充电/维修任务被展示层抹空",
);

assert.ok(
  mainSource.includes("enrichRobotaxiForDetail(robotaxi, data, readinessTasks, deploymentTasks, allFleetOperationTasks, routeExecutions)"),
  "Robotaxi 详情展示必须读取运维任务集合，保持与列表同一当前任务来源",
);

assert.ok(
  mainSource.includes("fleetOperationTasks.find((task) => task.task_id === taskId)"),
  "Robotaxi 当前任务查询必须覆盖运维任务，不能只查准入和投放任务",
);

assert.ok(
  mainSource.includes("const sourceRobotaxi = data.robotaxis.find((item) => item.robotaxi_id === robotaxi.robotaxi_id) || robotaxi;"),
  "Robotaxi 运维任务创建入口必须回取原始 Robotaxi 状态，禁止用展示行作为任务规划输入",
);

assert.ok(
  mainSource.includes("const sourceRobotaxi = data.robotaxis.find((item) => item.robotaxi_id === robotaxi?.robotaxi_id) || robotaxi;"),
  "Robotaxi 可触发动作计算必须回取原始 Robotaxi 状态，页面刷新和行操作使用同一策略输入",
);

const operations = initializeOperationsCenter();
const baseRobotaxi = {
  ...operations.robotaxis[0],
  availability_status: "AVAILABLE",
  available_for_dispatch: true,
  operation_status: "AVAILABLE",
  current_cell_id: "C-34-32",
  current_task_id: null,
  current_task_type: null,
  current_task_status: null,
  pending_task_queue: [],
};

let sequence = 1;
const context = {
  now: "2026-07-06T00:00:00.000Z",
  opsCenters: operations.opsCenters,
  deploymentTasks: [{
    task_id: "TASK-DP-HISTORY",
    robotaxi_id: baseRobotaxi.robotaxi_id,
    task_status: "COMPLETED",
  }],
  readinessTasks: [],
  serviceOrders: [],
  nextId(prefix) {
    return `${prefix}-${String(sequence++).padStart(4, "0")}`;
  },
};

const cleaning = fleetOperationTaskService.createFleetOperationTask({
  robotaxi: baseRobotaxi,
  taskType: TaskType.CLEANING,
  existingTasks: [],
  trigger: { trigger_source: "ROBOTAXI_MANAGEMENT" },
  context,
});

assert.equal(cleaning.created, true, "第一个清洁任务应创建成功");
assert.equal(cleaning.robotaxi.current_task_id, cleaning.task.task_id, "立即执行任务必须写入 Robotaxi 当前任务");
assert.equal(cleaning.robotaxi.current_task_type, TaskType.CLEANING, "立即执行任务必须写入 Robotaxi 当前任务类型");

const displayOnlyRobotaxi = {
  ...cleaning.robotaxi,
  current_task_id: null,
  current_task_type: null,
  current_task_status: null,
};
const sourceRobotaxi = [cleaning.robotaxi].find((item) => item.robotaxi_id === displayOnlyRobotaxi.robotaxi_id) || displayOnlyRobotaxi;

const maintenance = fleetOperationTaskService.createFleetOperationTask({
  robotaxi: sourceRobotaxi,
  taskType: TaskType.MAINTENANCE,
  existingTasks: [cleaning.task],
  trigger: { trigger_source: "ROBOTAXI_MANAGEMENT" },
  context,
});

assert.equal(maintenance.created, true, "第二个维修任务应创建为业务任务单");
assert.equal(maintenance.queued, true, "Robotaxi 已有当前任务时，后续运维任务必须进入队列");
assert.equal(maintenance.robotaxi.current_task_id, cleaning.task.task_id, "排队任务不能覆盖当前正在执行的任务");
assert.equal(maintenance.robotaxi.pending_task_queue.length, 1, "排队任务必须写入 Robotaxi 待执行队列");
assert.equal(maintenance.robotaxi.pending_task_queue[0].queue_sequence, 1, "排队任务必须有唯一排队序号");
assert.equal(maintenance.robotaxi.pending_task_queue[0].task_id, maintenance.task.task_id, "队列项必须指向新生成任务单");

console.log("v040.27 Robotaxi 展示与任务规划输入源合同验证通过");
