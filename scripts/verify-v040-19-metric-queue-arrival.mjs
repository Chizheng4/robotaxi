import assert from "node:assert/strict";
import fs from "node:fs";

import { TaskType } from "../src/domain/taskTypes.js";
import {
  TaskPlanningAssignmentType,
  TaskPlanningDecision,
} from "../src/domain/robotaxiTaskPlanningTypes.js";
import {
  planRobotaxiTask,
} from "../src/services/robotaxiTaskPlanningService.js";
import {
  enqueueTask,
} from "../src/services/robotaxiTaskPriorityService.js";

const main = fs.readFileSync("src/main.jsx", "utf8");
const fleetService = fs.readFileSync("src/services/fleetOperationTaskService.js", "utf8");
const planningTypes = fs.readFileSync("src/domain/robotaxiTaskPlanningTypes.js", "utf8");
const fieldDictionary = fs.readFileSync("src/domain/fieldDictionary.js", "utf8");

assert.match(main, /function createMetricPresentation/, "经营分析必须先生成统一指标展示对象");
assert.match(main, /primaryText: primaryPresentation\.text/, "经营分析洞察卡片不得直接拼接可能缺失的指标字段");
assert.doesNotMatch(main, /\$\{group\.primary\.metric_name_cn\}/, "经营分析洞察卡片不得直接读取 metric_name_cn 拼接");

const robotaxi = {
  robotaxi_id: "RT-V04019-001",
  availability_status: "UNAVAILABLE",
  motion_status: "PARKED",
  current_task_id: "TASK-ACTIVE",
  current_task_type: TaskType.CLEANING,
  pending_task_queue: [
    { task_id: "TASK-CLN-OLD", task_type: TaskType.CLEANING, priority: 60, queued_at: "2026-07-05T00:00:01.000Z" },
  ],
};

const decision = planRobotaxiTask({
  robotaxi,
  requestedAssignmentType: TaskPlanningAssignmentType.FLEET_OPERATION_TASK,
  requestedTaskType: TaskType.MAINTENANCE,
  triggerSource: "VERIFY",
  fleetOperationTasks: [],
});
assert.equal(decision.decision, TaskPlanningDecision.QUEUE, "当前有任务时新兼容运维任务应进入队列");
assert.equal(decision.queue_entry.queue_sequence, 1, "高优先级新任务应重排到队首");
assert.deepEqual(decision.queue_snapshot.map((item) => item.queue_sequence), [1, 2], "任务规划队列快照必须唯一连续编号");
assert.equal(decision.composite_state.pending_task_queue[0].queue_sequence, 1, "综合状态必须包含标准化排队队列");
assert.ok(decision.composite_state.current_assignment, "综合状态必须包含当前占用对象");
assert.ok("next_pending_task" in decision.composite_state, "综合状态必须包含下一排队任务");

const queuedRobotaxi = enqueueTask(robotaxi, { task_id: "TASK-MNT-NEW", task_type: TaskType.MAINTENANCE, priority: 80, queued_at: "2026-07-05T00:00:02.000Z" });
assert.deepEqual(queuedRobotaxi.pending_task_queue.map((item) => item.queue_sequence), [1, 2], "Robotaxi 入队后必须重写唯一连续队列序号");
assert.equal(queuedRobotaxi.pending_task_queue[0].task_id, "TASK-MNT-NEW", "Robotaxi 队列必须按优先级重排");

assert.match(fleetService, /const arrivedStatus = getFleetOperationArrivedStatus\(task\?\.task_type\)/, "运维行驶到达必须先投影为已到达目的地");
assert.match(fleetService, /getFleetOperationAfterArrivalStatus\(task\.task_type\)/, "运维正常到达确认后才进入待分配 Worker");
assert.match(fleetService, /export function confirmFleetOperationAbnormalArrival/, "运维任务必须具备异常到达投影服务");
assert.match(fleetService, /task_status: "ARRIVAL_ABNORMAL"/, "运维任务异常到达必须投影为异常到达状态");
assert.match(fleetService, /export function activateNextQueuedFleetOperationTask/, "运维任务完成后必须有服务化队列激活能力");
assert.match(planningTypes, /queue_snapshot: result\.queue_snapshot/, "任务规划结果必须持久展示队列快照");
assert.match(fieldDictionary, /queue_snapshot: "队列快照"/, "队列快照必须进入字段字典");
assert.match(fieldDictionary, /WAITING_WORKER_ASSIGNMENT: "待分配 Worker"/, "待分配 Worker 文案必须统一");

console.log("v040.19 经营分析、队列顺序与运维到达闭环合同通过");
