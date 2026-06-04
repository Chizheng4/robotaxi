import {
  DeploymentTaskStatus,
  RouteExecutionStatus,
} from "../domain/taskTypes.js";

function check(ruleId, ruleName, passed) {
  return {
    rule_id: ruleId,
    rule_name: ruleName,
    result: passed ? "PASS" : "FAIL",
    detail: passed ? "通过" : "未通过",
  };
}

export function validateDeploymentTasks(data) {
  const robotaxiById = new Map((data.robotaxis || []).map((robotaxi) => [robotaxi.robotaxi_id, robotaxi]));
  const cellById = new Map((data.cells || []).map((cell) => [cell.cell_id, cell]));
  const routeById = new Map((data.routes || []).map((route) => [route.route_id, route]));
  const executionByTaskId = new Map((data.routeExecutions || []).map((execution) => [execution.task_id, execution]));
  const deploymentTasks = data.deploymentTasks || [];

  return [
    check(
      "DEPLOYMENT_ROBOTAXI_EXISTS",
      "每个运营投放任务必须关联有效 Robotaxi",
      deploymentTasks.every((task) => robotaxiById.has(task.robotaxi_id)),
    ),
    check(
      "DEPLOYMENT_TARGET_CELL_EXISTS",
      "每个运营投放任务必须有有效目标网格",
      deploymentTasks.every((task) => cellById.has(task.target_cell_id)),
    ),
    check(
      "DEPLOYMENT_WAITING_START_HAS_ROUTE",
      "等待行驶、行驶中或已完成的运营投放任务必须已有 Route",
      deploymentTasks.every((task) => ![
        DeploymentTaskStatus.WAITING_START,
        DeploymentTaskStatus.MOVING,
        DeploymentTaskStatus.COMPLETED,
      ].includes(task.task_status) || routeById.has(task.route_id)),
    ),
    check(
      "DEPLOYMENT_WAITING_START_HAS_EXECUTION",
      "等待行驶或行驶中的运营投放任务必须有关联行驶记录",
      deploymentTasks.every((task) => ![
        DeploymentTaskStatus.WAITING_START,
        DeploymentTaskStatus.MOVING,
      ].includes(task.task_status) || executionByTaskId.has(task.task_id)),
    ),
    check(
      "DEPLOYMENT_WAITING_START_EXECUTION_STATUS",
      "等待行驶的运营投放任务必须对应等待行驶的行驶记录",
      deploymentTasks.every((task) => {
        if (task.task_status !== DeploymentTaskStatus.WAITING_START) return true;
        return executionByTaskId.get(task.task_id)?.execution_status === RouteExecutionStatus.WAITING_START;
      }),
    ),
    check(
      "DEPLOYMENT_MOVING_EXECUTION_STATUS",
      "行驶中的运营投放任务必须对应行驶中的行驶记录",
      deploymentTasks.every((task) => {
        if (task.task_status !== DeploymentTaskStatus.MOVING) return true;
        return executionByTaskId.get(task.task_id)?.execution_status === RouteExecutionStatus.MOVING;
      }),
    ),
    check(
      "DEPLOYMENT_MOVING_ROBOTAXI_STATE",
      "行驶中的运营投放任务必须使 Robotaxi 处于行驶中并绑定当前任务和路径",
      deploymentTasks.every((task) => {
        if (task.task_status !== DeploymentTaskStatus.MOVING) return true;
        const robotaxi = robotaxiById.get(task.robotaxi_id);
        return robotaxi?.motion_status === "MOVING" &&
          robotaxi?.current_task_id === task.task_id &&
          robotaxi?.current_route_id === task.route_id;
      }),
    ),
    check(
      "DEPLOYMENT_COMPLETED_ROBOTAXI_STATE",
      "已完成运营投放任务必须使 Robotaxi 到达目标并清空当前任务和路径",
      deploymentTasks.every((task) => {
        if (task.task_status !== DeploymentTaskStatus.COMPLETED) return true;
        const robotaxi = robotaxiById.get(task.robotaxi_id);
        return robotaxi?.current_cell_id === task.target_cell_id &&
          robotaxi?.current_task_id === null &&
          robotaxi?.current_route_id === null;
      }),
    ),
    check(
      "ROUTE_EXECUTION_STEP_RANGE",
      "行驶记录当前步序号必须在 Route 总步数范围内",
      (data.routeExecutions || []).every((execution) =>
        execution.current_step_index >= 0 && execution.current_step_index <= execution.total_step_count
      ),
    ),
    check(
      "ROUTE_EXECUTION_COMPLETED_AT_TARGET",
      "已完成行驶记录必须到达目标网格",
      (data.routeExecutions || []).every((execution) =>
        execution.execution_status !== RouteExecutionStatus.COMPLETED || execution.current_cell_id === execution.target_cell_id
      ),
    ),
  ];
}
