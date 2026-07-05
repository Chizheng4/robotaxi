import fs from "node:fs";

const main = fs.readFileSync("src/main.jsx", "utf8");
const styles = fs.readFileSync("src/styles.css", "utf8");
const fleetService = fs.readFileSync("src/services/fleetOperationTaskService.js", "utf8");

assertIncludes(fleetService, "export function assignFleetOperationWorker", "Fleet Operation 必须提供服务化 Worker 分配动作");
assertIncludes(fleetService, "queue_entry", "任务规划队列信息必须继续由服务层生成");
assertIncludes(fleetService, "const arrivedStatus = getFleetOperationArrivedStatus(task?.task_type)", "行驶到达后任务状态必须先进入已到达目的地");
assertIncludes(fleetService, "getFleetOperationAfterArrivalStatus(task.task_type)", "正常到达确认后才进入待分配 Worker 等后续状态");
assertIncludes(fleetService, "origin_cell_id: originCellId", "创建运维行驶记录后必须回写任务起点位置");
assertIncludes(fleetService, "worker_status: \"BUSY\"", "分配 Worker 必须占用作业人员");
assertIncludes(fleetService, "worker_status: \"IDLE\"", "作业完成或充电接入完成必须释放作业人员");

assertIncludes(main, "assignFleetOperationWorker", "前端必须调用 Fleet Operation Worker 分配服务");
assertIncludes(main, "分配 Worker", "待分配 Worker 时必须显示分配 Worker 动作");
assertIncludes(main, "isFleetOperationRouteRecordStatus", "运维任务关联行驶记录时必须统一显示查看行驶记录");
assertIncludes(main, "actions.viewRouteExecutionForDeployment(row)", "运维任务行驶链路必须跳转统一运营行驶记录");
assertIncludes(main, "origin_cell_id\", \"origin_location_summary", "运维任务表格必须展示起点位置");
assertIncludes(main, "robotaxi_current_location_summary", "运维任务表格必须展示 Robotaxi 当前实时位置");
assertIncludes(main, "\"origin_cell_id\", \"origin_location_summary\", \"origin_location_detail\"", "运维任务详情必须展示起点位置详情");
assertIncludes(main, "if ([\"ARRIVED_OPS_CENTER\", \"ARRIVED_CHARGER\", \"ARRIVED_MAINTENANCE_CENTER\"].includes(status)) return \"已到达目的地\"", "已到达状态必须展示为已到达目的地");
assertIncludes(main, "WAITING_WORKER_ASSIGNMENT\", \"WAITING_RESOURCE_ASSIGNMENT\", \"WAITING_CHARGER_ASSIGNMENT", "待分配 Worker 状态必须与已到达状态分开");

assertIncludes(main, "robotaxi-fleet-summary-scroll", "Robotaxi 顶部必须有车队状态摘要层");
assertIncludes(main, "robotaxi-selected-card", "Robotaxi 顶部必须有当前 Robotaxi 摘要卡片");
assertIncludes(main, "RobotaxiQueuePopover", "Robotaxi 排队任务必须通过悬浮卡片展示完整信息");
assertIncludes(styles, "max-height: 132px", "Robotaxi 摘要区域必须控制高度");
assertIncludes(styles, "overflow-x: auto", "Robotaxi 摘要区域必须支持横向移动");
assertIncludes(styles, ".robotaxi-selected-card-inner:focus-visible", "Robotaxi 摘要卡片必须使用轻量焦点样式");

console.log("v040.18 运维 Worker 闭环与 Robotaxi 摘要体验合同通过");

function assertIncludes(source, needle, message) {
  if (!source.includes(needle)) throw new Error(message);
}
