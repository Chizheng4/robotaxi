import { AvailabilityStatus, WorkerStatus } from "../domain/operationsCenterTypes.js";
import {
  CheckResult,
  IssueType,
  ReadinessTaskStatus,
  TaskEventResult,
  TaskSourceType,
  TaskType,
} from "../domain/taskTypes.js";

const unfinishedStatuses = new Set([
  ReadinessTaskStatus.WAITING_ASSIGNMENT,
  ReadinessTaskStatus.WAITING_CHECK,
  ReadinessTaskStatus.CHECKING,
]);

export function validateReadinessCheckTasks(data) {
  const taskIds = data.readinessCheckTasks.map((task) => task.task_id);
  const robotaxiById = new Map(data.robotaxis.map((robotaxi) => [robotaxi.robotaxi_id, robotaxi]));
  const workerById = new Map(data.workers.map((worker) => [worker.worker_id, worker]));
  const opsCenterById = new Map(data.opsCenters.map((opsCenter) => [opsCenter.ops_center_id, opsCenter]));
  const eventTaskIds = data.taskEventLogs.map((event) => event.event_id);

  return [
    check("READINESS_TASK_ID_UNIQUE", "准入任务编号必须唯一", new Set(taskIds).size === taskIds.length),
    check(
      "READINESS_TASK_TYPE",
      "准入任务 task_type 必须为 READINESS_CHECK",
      data.readinessCheckTasks.every((task) => task.task_type === TaskType.READINESS_CHECK),
    ),
    check(
      "READINESS_TASK_SOURCE",
      "准入任务来源必须为运营中心",
      data.readinessCheckTasks.every((task) => task.source_type === TaskSourceType.OPS_CENTER && opsCenterById.has(task.ops_center_id)),
    ),
    check(
      "READINESS_TASK_ROBOTAXI_REF",
      "准入任务必须关联有效 Robotaxi",
      data.readinessCheckTasks.every((task) => robotaxiById.has(task.robotaxi_id)),
    ),
    check(
      "READINESS_TASK_SINGLE_ACTIVE_PER_ROBOTAXI",
      "同一 Robotaxi 不得存在多个未完成准入任务",
      hasSingleUnfinishedTaskPerRobotaxi(data.readinessCheckTasks),
    ),
    check(
      "READINESS_TASK_WORKER_REF",
      "已分配作业人员的准入任务必须关联有效作业人员",
      data.readinessCheckTasks.every((task) => !task.worker_id || workerById.has(task.worker_id)),
    ),
    check(
      "READINESS_TASK_WORKER_SAME_OPS_CENTER",
      "准入任务 Worker 必须属于同一个运营中心",
      data.readinessCheckTasks.every((task) => !task.worker_id || workerById.get(task.worker_id)?.ops_center_id === task.ops_center_id),
    ),
    check(
      "READINESS_WAITING_ASSIGNMENT_EMPTY_WORKER",
      "等待分配状态下 worker_id 必须为空",
      data.readinessCheckTasks.every((task) => task.task_status !== ReadinessTaskStatus.WAITING_ASSIGNMENT || task.worker_id === null),
    ),
    check(
      "READINESS_ASSIGNED_ROBOTAXI_PENDING_ADMISSION",
      "已分配或检查中的准入任务必须保持 Robotaxi 待准入",
      data.readinessCheckTasks.every((task) => ![
        ReadinessTaskStatus.WAITING_CHECK,
        ReadinessTaskStatus.CHECKING,
      ].includes(task.task_status) || robotaxiById.get(task.robotaxi_id)?.availability_status === AvailabilityStatus.PENDING_ADMISSION),
    ),
    check(
      "READINESS_COMPLETED_HAS_RESULT",
      "已完成准入任务必须有检查结果",
      data.readinessCheckTasks.every((task) => task.task_status !== ReadinessTaskStatus.COMPLETED || Boolean(task.check_result)),
    ),
    check(
      "READINESS_FAILED_RESULT_HAS_ISSUE",
      "检查不通过必须记录问题类型",
      data.readinessCheckTasks.every((task) => task.check_result !== CheckResult.FAILED || (task.issue_type && task.issue_type !== IssueType.NONE)),
    ),
    check(
      "READINESS_PASSED_ROBOTAXI_AVAILABLE",
      "检查通过后 Robotaxi 必须可参与运营",
      data.readinessCheckTasks.every((task) => task.check_result !== CheckResult.PASSED || robotaxiById.get(task.robotaxi_id)?.availability_status === AvailabilityStatus.AVAILABLE),
    ),
    check(
      "READINESS_FAILED_ROBOTAXI_PENDING_ADMISSION",
      "检查不通过后 Robotaxi 必须回到待准入",
      data.readinessCheckTasks.every((task) => task.check_result !== CheckResult.FAILED || robotaxiById.get(task.robotaxi_id)?.availability_status === AvailabilityStatus.PENDING_ADMISSION),
    ),
    check(
      "READINESS_COMPLETED_WORKER_IDLE",
      "准入任务完成后 Worker 必须恢复空闲",
      data.readinessCheckTasks.every((task) => task.task_status !== ReadinessTaskStatus.COMPLETED || !task.worker_id || workerById.get(task.worker_id)?.worker_status === WorkerStatus.IDLE),
    ),
    check("TASK_EVENT_ID_UNIQUE", "任务事件编号必须唯一", new Set(eventTaskIds).size === eventTaskIds.length),
    check(
      "TASK_EVENT_RESULT_VALID",
      "任务事件结果必须有效",
      data.taskEventLogs.every((event) => Object.values(TaskEventResult).includes(event.event_result)),
    ),
  ];
}

function hasSingleUnfinishedTaskPerRobotaxi(tasks) {
  const activeCounts = new Map();
  tasks.forEach((task) => {
    if (!unfinishedStatuses.has(task.task_status)) return;
    activeCounts.set(task.robotaxi_id, (activeCounts.get(task.robotaxi_id) || 0) + 1);
  });
  return [...activeCounts.values()].every((count) => count <= 1);
}

function check(rule_id, rule_name, passed, detail = "") {
  return {
    rule_id,
    rule_name,
    result: passed ? "PASS" : "FAIL",
    detail,
  };
}
