import {
  DeploymentTaskStatus,
  RouteExecutionStatus,
  TaskEventType,
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
  const routeExecutions = data.routeExecutions || [];
  const routePlanningRuns = data.routePlanningRuns || [];
  const taskEventLogs = data.taskEventLogs || [];

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
        DeploymentTaskStatus.ARRIVED,
        DeploymentTaskStatus.ARRIVAL_ABNORMAL,
        DeploymentTaskStatus.COMPLETED,
      ].includes(task.task_status) || routeById.has(task.route_id)),
    ),
    check(
      "DEPLOYMENT_WAITING_START_HAS_EXECUTION",
      "等待行驶或行驶中的运营投放任务必须有关联行驶记录",
      deploymentTasks.every((task) => ![
        DeploymentTaskStatus.WAITING_START,
        DeploymentTaskStatus.MOVING,
        DeploymentTaskStatus.ARRIVED,
        DeploymentTaskStatus.ARRIVAL_ABNORMAL,
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
      "DEPLOYMENT_ARRIVED_EXECUTION_STATUS",
      "已到达的运营投放任务必须对应已到达的行驶记录",
      deploymentTasks.every((task) => {
        if (task.task_status !== DeploymentTaskStatus.ARRIVED) return true;
        return executionByTaskId.get(task.task_id)?.execution_status === RouteExecutionStatus.ARRIVED;
      }),
    ),
    check(
      "DEPLOYMENT_ABNORMAL_HAS_RESULT",
      "异常到达的运营投放任务必须有到达执行结果",
      deploymentTasks.every((task) =>
        task.task_status !== DeploymentTaskStatus.ARRIVAL_ABNORMAL || Boolean(task.arrival_execution_result)
      ),
    ),
    check(
      "DEPLOYMENT_ABNORMAL_EXECUTION_STATUS",
      "异常到达的运营投放任务必须对应异常到达的行驶记录",
      deploymentTasks.every((task) => {
        if (task.task_status !== DeploymentTaskStatus.ARRIVAL_ABNORMAL) return true;
        return executionByTaskId.get(task.task_id)?.execution_status === RouteExecutionStatus.ARRIVAL_ABNORMAL;
      }),
    ),
    check(
      "DEPLOYMENT_ROUTE_HAS_STRATEGY",
      "已有路径的运营投放任务必须记录路径规划策略",
      deploymentTasks.every((task) => ![
        DeploymentTaskStatus.WAITING_START,
        DeploymentTaskStatus.MOVING,
        DeploymentTaskStatus.ARRIVED,
        DeploymentTaskStatus.ARRIVAL_ABNORMAL,
        DeploymentTaskStatus.COMPLETED,
      ].includes(task.task_status) || Boolean(routeById.get(task.route_id)?.route_strategy_id)),
    ),
    check(
      "DEPLOYMENT_ROUTE_STRATEGY_MATCH",
      "运营投放任务记录的路径规划策略必须与当前路径一致",
      deploymentTasks.every((task) => {
        if (!task.route_id || !task.route_strategy_id) return true;
        return task.route_strategy_id === routeById.get(task.route_id)?.route_strategy_id;
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
      "DEPLOYMENT_ARRIVED_ROBOTAXI_STATE",
      "已到达的运营投放任务必须使 Robotaxi 保持当前任务和路径",
      deploymentTasks.every((task) => {
        if (task.task_status !== DeploymentTaskStatus.ARRIVED) return true;
        const robotaxi = robotaxiById.get(task.robotaxi_id);
        return robotaxi?.current_task_id === task.task_id &&
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
      "行驶记录当前步序号必须在路径总步数范围内",
      routeExecutions.every((execution) =>
        execution.current_step_index >= 0 && execution.current_step_index <= execution.total_step_count
      ),
    ),
    check(
      "ROUTE_EXECUTION_COMPLETED_AT_TARGET",
      "已完成行驶记录必须到达目标网格",
      routeExecutions.every((execution) =>
        execution.execution_status !== RouteExecutionStatus.COMPLETED || execution.current_cell_id === execution.target_cell_id
      ),
    ),
    check(
      "ROUTE_EXECUTION_TARGET_FIELDS",
      "行驶记录必须同步计划目标、当前目标和完成后的实际目标",
      routeExecutions.every((execution) => {
        const hasTargets = Boolean(execution.planned_target_cell_id && execution.target_cell_id);
        const hasActualWhenCompleted = execution.execution_status !== RouteExecutionStatus.COMPLETED ||
          Boolean(execution.actual_target_cell_id);
        return hasTargets && hasActualWhenCompleted;
      }),
    ),
    check(
      "ROUTE_EXECUTION_ROUTE_HISTORY_HAS_STRATEGY",
      "行驶记录路径历史必须记录路径规划策略",
      routeExecutions.every((execution) =>
        (execution.route_history || []).every((history) => Boolean(history.route_strategy_id))
      ),
    ),
    check(
      "ROUTE_EXECUTION_ROUTE_STRATEGY_MATCH",
      "行驶记录记录的路径规划策略必须与当前路径一致",
      routeExecutions.every((execution) => {
        if (!execution.route_id || !execution.route_strategy_id) return true;
        return execution.route_strategy_id === routeById.get(execution.route_id)?.route_strategy_id;
      }),
    ),
    check(
      "ROUTE_EXECUTION_HISTORY_STRATEGY_MATCH",
      "行驶记录路径历史中的路径规划策略必须与对应路径一致",
      routeExecutions.every((execution) =>
        (execution.route_history || []).every((history) => {
          if (!history.route_id || !history.route_strategy_id) return true;
          return history.route_strategy_id === routeById.get(history.route_id)?.route_strategy_id;
        })
      ),
    ),
    check(
      "ROUTE_PLANNING_EVENT_STRATEGY_MATCH",
      "路径规划执行记录中的路径规划策略必须与生成的路径一致",
      taskEventLogs.every((event) => {
        if (event.event_type !== TaskEventType.ROUTE_PLANNED || !event.route_id || !event.route_strategy_id) return true;
        return event.route_strategy_id === routeById.get(event.route_id)?.route_strategy_id;
      }),
    ),
    check(
      "ROUTE_PLANNING_RUN_ROUTE_REF",
      "路径规划执行记录成功时必须关联生成的 Route",
      routePlanningRuns.every((run) => run.planning_result !== "SUCCESS" || routeById.has(run.result_route_id)),
    ),
    check(
      "ROUTE_PLANNING_RUN_HAS_ALGORITHM",
      "路径规划执行记录必须记录路径规划算法",
      routePlanningRuns.every((run) => Boolean(run.planning_algorithm)),
    ),
    check(
      "ROUTE_PLANNING_RUN_STRATEGY_MATCH",
      "路径规划执行记录的策略编号必须与生成的路径一致",
      routePlanningRuns.every((run) => {
        if (run.planning_result !== "SUCCESS" || !run.result_route_id) return true;
        return run.route_strategy_id === routeById.get(run.result_route_id)?.route_strategy_id;
      }),
    ),
  ];
}
