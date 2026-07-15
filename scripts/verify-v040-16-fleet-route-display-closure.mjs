import fs from "node:fs";

const main = fs.readFileSync("src/main.jsx", "utf8");
const fieldContract = fs.readFileSync("scripts/verify-field-display-contract.mjs", "utf8");

function assertIncludes(source, needle, message) {
  if (!source.includes(needle)) throw new Error(message);
}

function assertBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex > secondIndex) throw new Error(message);
}

assertBefore(
  main,
  "{isRobotaxiPage && (",
  "{!isMetricAnalysisPage && !isForecastAnalysisPage && !isOperatingModelPage && statusOptions.length > 0",
  "Robotaxi 运营状态面板必须位于状态分类和筛选之前，避免与表格筛选层级混淆",
);
assertIncludes(main, "function formatRobotaxiQueueItems", "Robotaxi 排队任务必须显示排队序号");
assertIncludes(main, "当前可触发运维", "Robotaxi 可操作任务区域必须使用更清晰的中文说明");
assertIncludes(main, "\"cleaningTask\", \"chargingTask\", \"maintenanceTask\", \"failureHandlingTask\", \"retirementTask\"", "运维任务详情必须接入统一分组详情");
assertIncludes(main, "\"robotaxi_current_cell_id\", \"robotaxi_current_location_summary\", \"robotaxi_current_location_detail\"", "运维任务详情必须展示 Robotaxi 实时当前位置");
assertIncludes(main, "const routeResult = createFleetOperationRouteExecution(result.task, result.robotaxi)", "分配运维目的站点后必须自动创建运营行驶记录");
assertIncludes(main, "actions.viewRouteExecutionForDeployment(row)", "运维任务待行驶状态必须查看统一运营行驶记录");
assertIncludes(main, "renderRouteExecutionActions(row", "运营行驶记录页面必须接入行操作列");
assertIncludes(main, "completeRouteExecutionTravelNow", "运营行驶记录必须提供自动到达入口");
assertIncludes(fieldContract, "robotaxiTaskPlanningRuns", "字段展示合同必须覆盖任务规划执行");
assertIncludes(fieldContract, "strategy_snapshot", "字段展示合同必须覆盖任务规划策略快照");
assertIncludes(fieldContract, "composite_state", "字段展示合同必须覆盖任务规划综合状态");

console.log("v040.16 Fleet Operation 行驶闭环与中文展示合同通过");
