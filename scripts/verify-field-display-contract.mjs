import assert from "node:assert/strict";
import fs from "node:fs";

import { createBusinessTimingCalculation, initializeDefaultWorkflowTimingProfile } from "../src/data/businessTimingCalculator.js";
import { createCostCalculation, initializeDefaultCostModelProfile } from "../src/data/costModelCalculator.js";
import { createRevenueCalculation } from "../src/data/revenueCalculator.js";
import { createSimulationRunBusinessScope } from "../src/data/simulationRunBusinessScope.js";
import { validateFieldDisplayContract } from "../src/domain/fieldDisplayService.js";

const mainSource = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");

const fields = new Set();
const valueContexts = [];

collectArrayStringLiterals(/columns:\s*\[([^\]]*)\]/g, mainSource, fields);
collectArrayStringLiterals(/keys:\s*\[([^\]]*)\]/g, mainSource, fields);
collectArrayStringLiterals(/summaryItems\s*=\s*\[([^\]]*)\]/g, mainSource, fields);

const businessData = createSampleBusinessData();
const simulationRun = {
  simulation_run_id: "SIM-RUN-DISPLAY",
  simulation_timeline_id: "SIM-TL-DISPLAY",
  simulation_status: "COMPLETED",
  current_day: 1,
  current_time: "Day 1 00:20:00",
  current_day_tick: 20,
  current_global_tick: 20,
};
const scope = createSimulationRunBusinessScope(simulationRun, businessData);
const timingResult = createBusinessTimingCalculation({
  simulationRun,
  profile: initializeDefaultWorkflowTimingProfile(),
  businessData,
  scope,
  calculationRunId: "BTCR-DISPLAY",
});
const costResult = createCostCalculation({
  simulationRun,
  profile: initializeDefaultCostModelProfile(),
  businessData: { ...businessData, ...timingResult.businessData },
  scope: createSimulationRunBusinessScope(simulationRun, { ...businessData, ...timingResult.businessData }),
  calculationRunId: "CCR-DISPLAY",
});
const revenueResult = createRevenueCalculation({ simulationRun, scope, calculationRunId: "RCR-DISPLAY" });

[
  simulationRun,
  scope,
  timingResult.calculationRun,
  timingResult.businessData,
  costResult.calculationRun,
  costResult.costRecords,
  costResult.businessData,
  revenueResult.calculationRun,
  revenueResult.revenueRecords,
].forEach((value) => collectObjectKeys(value, fields, valueContexts));

const contract = validateFieldDisplayContract({
  fields: [...fields],
  values: valueContexts,
});

assert.deepEqual(contract.missingFields, [], `字段字典缺少中文字段名：\n${contract.missingFields.join("\n")}`);
assert.deepEqual(contract.missingValues, [], `值字典缺少中文枚举值：\n${contract.missingValues.join("\n")}`);
assert.match(mainSource, /fieldDisplayService\.js\?v=20260625-v029-2/, "主页面必须通过字段展示服务接入字段字典");
assert.doesNotMatch(mainSource, /import\("\.\/domain\/fieldDictionary\.js/, "主页面不得直接接入字段字典实现");

console.log("字段展示合同验证通过");

function collectArrayStringLiterals(pattern, source, target) {
  for (const match of source.matchAll(pattern)) {
    const values = match[1].match(/"([^"]+)"/g) || [];
    values.forEach((item) => target.add(item.slice(1, -1)));
  }
}

function collectObjectKeys(value, fieldTarget, valueTarget, parentKey = null) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectObjectKeys(item, fieldTarget, valueTarget, parentKey));
    return;
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "string") valueTarget.push({ field: parentKey, value });
    return;
  }
  Object.entries(value).forEach(([key, itemValue]) => {
    fieldTarget.add(key);
    if (typeof itemValue === "string") valueTarget.push({ field: key, value: itemValue });
    collectObjectKeys(itemValue, fieldTarget, valueTarget, key);
  });
}

function createSampleBusinessData() {
  const audit = {
    simulation_run_id: "SIM-RUN-DISPLAY",
    simulation_created_at: "Day 1 00:00:00",
  };
  return {
    routes: [
      { route_id: "R-OPS-DISPLAY", total_distance_m: 1200, route_usage_type: "OPERATIONAL_EXECUTION", route_steps: [{ cell_id: "C-1" }, { cell_id: "C-2" }, { cell_id: "C-3" }] },
      { route_id: "R-PICKUP-DISPLAY", total_distance_m: 800, route_usage_type: "SERVICE_PICKUP", route_steps: [{ cell_id: "C-3" }, { cell_id: "C-4" }] },
      { route_id: "R-DROP-DISPLAY", total_distance_m: 1600, route_usage_type: "SERVICE_DROPOFF", route_steps: [{ cell_id: "C-4" }, { cell_id: "C-5" }, { cell_id: "C-6" }] },
    ],
    readinessTasks: [{ task_id: "RC-DISPLAY", task_status: "COMPLETED", robotaxi_id: "RT-001", worker_id: "WK-001", ...audit }],
    deploymentTasks: [{ task_id: "DP-DISPLAY", task_status: "COMPLETED", route_execution_id: "RE-DISPLAY", robotaxi_id: "RT-002", worker_id: "WK-002", ...audit }],
    routeExecutions: [{ route_execution_id: "RE-DISPLAY", execution_status: "COMPLETED", deployment_task_id: "DP-DISPLAY", task_id: "DP-DISPLAY", robotaxi_id: "RT-002", route_id: "R-OPS-DISPLAY", total_step_count: 2, ...audit }],
    serviceOrders: [{ service_order_id: "SO-DISPLAY", order_status: "COMPLETED", trip_id: "TRIP-DISPLAY", customer_id: "CU-001", matched_robotaxi_id: "RT-003", final_price: 36, paid_amount: 30, simulation_completed_at: "Day 1 00:19:00", simulation_payment_completed_at: "Day 1 00:20:00", ...audit }],
    trips: [{ trip_id: "TRIP-DISPLAY", trip_status: "COMPLETED", service_order_id: "SO-DISPLAY", robotaxi_id: "RT-003", route_history: [{ route_id: "R-PICKUP-DISPLAY" }, { route_id: "R-DROP-DISPLAY" }], total_step_count: 3, ...audit }],
    pricingStrategyRuns: [],
    pricingDecisions: [],
    orderMatchingRuns: [],
    orderMatchingDecisions: [],
    routePlanningRuns: [],
    demandSimulationRuns: [],
  };
}
