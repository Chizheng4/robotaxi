import assert from "node:assert/strict";
import fs from "node:fs";
import {
  createSimulationRuntimeScope,
} from "../src/data/simulationRuntimeScope.js";
import {
  planFleetOperationRoute,
  advanceFleetOperationRouteExecution,
  confirmFleetOperationArrival,
} from "../src/services/fleetOperationTaskService.js";

const scope = createSimulationRuntimeScope({
  simulationRun: { simulation_run_id: "SIM-RUN-V039-7", current_simulation_seconds: 0 },
  businessData: {
    routeExecutions: [
      {
        route_execution_id: "REX-DEPLOYMENT",
        simulation_run_id: "SIM-RUN-V039-7",
        task_type: "DEPLOYMENT",
        execution_status: "WAITING_ROUTE",
      },
      {
        route_execution_id: "REX-CLEANING",
        simulation_run_id: "SIM-RUN-V039-7",
        task_type: "CLEANING",
        execution_status: "MOVING",
      },
      {
        route_execution_id: "REX-LEGACY-DEPLOYMENT",
        simulation_run_id: "SIM-RUN-V039-7",
        deployment_task_id: "TASK-DP-001",
        execution_status: "WAITING_ROUTE",
      },
    ],
    timedOperations: [],
  },
});

assert.deepEqual(
  scope.workflowScope.routeExecutions.map((item) => item.route_execution_id),
  ["REX-DEPLOYMENT", "REX-LEGACY-DEPLOYMENT"],
  "模拟运行当前只能扫描投放类运营行驶记录，Fleet Operation 行驶记录必须先隔离",
);

assert.equal(typeof planFleetOperationRoute, "function", "Fleet Operation 路径规划必须由服务层提供");
assert.equal(typeof advanceFleetOperationRouteExecution, "function", "Fleet Operation 行驶推进必须由服务层提供");
assert.equal(typeof confirmFleetOperationArrival, "function", "Fleet Operation 到达确认必须由服务层提供");

const mainSource = fs.readFileSync("src/main.jsx", "utf8");
const planStart = mainSource.indexOf("function planFleetOperationRoute(task)");
const planEnd = mainSource.indexOf("function advanceFleetOperationRouteExecution(execution)");
assert(planStart > 0 && planEnd > planStart, "缺少 Fleet Operation 页面动作函数");
const planBody = mainSource.slice(planStart, planEnd);
assert.match(planBody, /fleetOperationTaskService\.planFleetOperationRoute/, "页面路径规划必须调用 Fleet Operation 服务");
assert.doesNotMatch(planBody, /const\s+execution\s*=\s*\{/, "页面层不得拼装 routeExecution 对象");
assert.doesNotMatch(planBody, /setRouteExecutions\(\(r\)\s*=>\s*\[execution,/, "页面层不得直接插入手写行驶记录");

console.log("v039.7 route execution service boundary verified");
