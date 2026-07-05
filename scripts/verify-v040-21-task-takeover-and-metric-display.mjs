import assert from "node:assert/strict";
import fs from "node:fs";

import {
  activateQueuedFleetOperationTask,
  dispatchFleetOperationTaskDestination,
} from "../src/services/fleetOperationTaskService.js";

const opsCenters = [
  {
    ops_center_id: "OC-V04021",
    service_area_ids: ["SA-V04021"],
    cell_ids: ["C-10-10", "C-10-11"],
    can_clean_robotaxi: true,
    can_charge_robotaxi: true,
    can_repair_robotaxi: true,
  },
];

const robotaxi = {
  robotaxi_id: "RT-V04021",
  current_cell_id: "C-10-10",
  availability_status: "UNAVAILABLE",
  available_for_dispatch: false,
  current_task_id: null,
  current_order_id: null,
  pending_task_queue: [
    {
      task_id: "TASK-MNT-V04021",
      task_type: "MAINTENANCE",
      queue_sequence: 1,
      priority_level: 3,
    },
  ],
};

const queuedMaintenanceTask = {
  task_id: "TASK-MNT-V04021",
  task_type: "MAINTENANCE",
  task_status: "WAITING_ROBOTAXI_EXECUTION",
  task_priority: "HIGH",
  robotaxi_id: robotaxi.robotaxi_id,
  origin_cell_id: "C-1-1",
  target_ops_center_id: null,
  target_cell_id: null,
};

const activated = activateQueuedFleetOperationTask({
  task: queuedMaintenanceTask,
  robotaxi,
  opsCenters,
  context: { now: () => "2026-07-05T10:00:00.000Z" },
});

assert.equal(activated.succeeded, true, "排队运维任务必须可以被 Robotaxi 接管");
assert.equal(activated.alreadyAtCapableCenter, true, "接管时必须识别当前位置已在具备能力的运维点");
assert.equal(activated.task.task_status, "WAITING_RESOURCE_ASSIGNMENT", "维修任务已在维修点时必须直接进入待分配资源");
assert.equal(activated.task.origin_cell_id, "C-10-10", "接管任务必须写入 Robotaxi 最新起点位置");
assert.equal(activated.task.target_ops_center_id, "OC-V04021", "接管任务必须写入当前位置对应运维中心");
assert.equal(activated.task.target_cell_id, "C-10-10", "接管任务必须使用当前位置作为目的位置");
assert.equal(activated.robotaxi.pending_task_queue.length, 0, "被接管任务必须从排队任务中移除");

const dispatchSkipped = dispatchFleetOperationTaskDestination({
  task: {
    ...activated.task,
    task_status: "WAITING_MAINTENANCE_DESTINATION_ASSIGNMENT",
  },
  robotaxi: activated.robotaxi,
  opsCenters,
  cells: [{ cell_id: "C-10-10", row: 10, col: 10, cell_size_m: 50 }],
  context: { now: () => "2026-07-05T10:01:00.000Z" },
});

assert.equal(dispatchSkipped.succeeded, true, "已在具备能力站点时目的地分配必须成功收敛");
assert.equal(dispatchSkipped.dispatchSkipped, true, "已在具备能力站点时必须跳过运维调度执行");
assert.equal(dispatchSkipped.run, null, "跳过调度时不得生成运维调度执行");
assert.equal(dispatchSkipped.decision, null, "跳过调度时不得生成运维调度结果");
assert.equal(dispatchSkipped.task.task_status, "WAITING_RESOURCE_ASSIGNMENT", "跳过调度后必须进入待分配资源");

const mainSource = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
assert.match(mainSource, /metricCalculator\.initializeDefaultMetricDefinitions\(\)/, "经营指标展示必须合并默认指标定义兜底");
assert.match(mainSource, /getMetricDisplayName\(row\)/, "经营指标卡片必须通过统一指标中文名函数展示");
assert.doesNotMatch(mainSource, /metric_name_cn:\s*definition\.metric_name_cn\s*\|\|\s*observation\.metric_definition_id/, "不得把指标编号作为中文名兜底");
assert.doesNotMatch(mainSource, /return row\?\.metric_definition_id \|\| "指标"/, "不得把指标编号作为指标展示名兜底");

console.log("v040.21 排队任务接管与经营指标展示合同验证通过");
