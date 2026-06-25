import assert from "node:assert/strict";
import fs from "node:fs";

import {
  getRoutePlanningStrategies,
  getRoutePlanningStrategy,
} from "../src/domain/routePlanningStrategies.js";
import * as taskTypes from "../src/domain/taskTypes.js";
import { createRoutePlanningRun } from "../src/services/routePlanningService.js";

const strategies = getRoutePlanningStrategies();
const strategyIds = strategies.map((strategy) => strategy.route_strategy_id);

assert.deepEqual(
  strategyIds,
  [
    taskTypes.RoutePlanningStrategy.INITIAL_DEPLOYMENT,
    taskTypes.RoutePlanningStrategy.ABNORMAL_SAME_SERVICE_AREA,
    taskTypes.RoutePlanningStrategy.SERVICE_ORDER_PICKUP,
    taskTypes.RoutePlanningStrategy.SERVICE_ORDER_DESTINATION,
    taskTypes.RoutePlanningStrategy.SERVICE_ORDER_DESTINATION_CHANGE,
    taskTypes.RoutePlanningStrategy.SERVICE_ROUTE_EXCEPTION_REPLAN,
    taskTypes.RoutePlanningStrategy.SERVICE_PRICE_ESTIMATION,
  ],
  "路径规划策略注册表必须完整覆盖 RPS-001 到 RPS-007"
);

for (const strategy of strategies) {
  assert(strategy.strategy_name, `${strategy.route_strategy_id} 必须有中文策略名称`);
  assert(strategy.trigger_object_type, `${strategy.route_strategy_id} 必须声明触发对象类型`);
  assert(strategy.trigger_task_status, `${strategy.route_strategy_id} 必须声明触发状态`);
  assert.equal(strategy.planning_algorithm, taskTypes.RoutePlanningAlgorithm.BFS_CELL_GRAPH, `${strategy.route_strategy_id} 必须声明规划算法`);
}

assert.equal(getRoutePlanningStrategy("RPS-001").trigger_object_type, "routeExecution");
assert.equal(getRoutePlanningStrategy("RPS-003").trigger_object_type, "trip");
assert.equal(getRoutePlanningStrategy("RPS-007").trigger_object_type, "serviceOrder");

const run = createRoutePlanningRun({
  routePlanningRunId: "RPR-VERIFY-001",
  routeStrategyId: taskTypes.RoutePlanningStrategy.INITIAL_DEPLOYMENT,
  taskId: "TASK-DP-VERIFY",
  routeExecutionId: "REX-VERIFY",
  robotaxiId: "RT-VERIFY",
  originCellId: "C-00-00",
  targetCellId: "C-00-02",
  resultRouteId: "ROUTE-VERIFY",
  planningResult: taskTypes.RoutePlanningResult.SUCCESS,
  failureReason: taskTypes.RoutePlanningFailureReason.NONE,
});

assert.equal(run.strategy_snapshot.route_strategy_id, taskTypes.RoutePlanningStrategy.INITIAL_DEPLOYMENT);
assert.equal(run.input_snapshot.origin_cell_id, "C-00-00");
assert.equal(run.output_snapshot.result_route_id, "ROUTE-VERIFY");

const mainSource = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
assert.match(mainSource, /routePlanningStrategies\.getRoutePlanningStrategies\(\)/, "路径规划策略页面必须读取领域策略注册表");
assert.doesNotMatch(mainSource, /strategy_name:\s*"初始运营投放路径规划策略"/, "路径规划策略不得继续由页面临时拼行");

console.log("路径规划策略注册表验证通过");
