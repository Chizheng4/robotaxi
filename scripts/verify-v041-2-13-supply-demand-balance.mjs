import assert from "node:assert/strict";
import fs from "node:fs";

import { initializeMapSpace } from "../src/data/mapInitialization.js";
import { initializeOperationsCenter } from "../src/data/operationsCenterInitialization.js";
import { initializeCustomers } from "../src/data/customerInitialization.js";
import { initializeSupplyManagement } from "../src/data/supplyManagementInitialization.js";
import { initializeSpatialBusinessProfiles } from "../src/data/spatialBusinessProfileInitialization.js";
import {
  executeSupplyDemandBalanceStrategy,
  initializeDefaultSupplyDemandBalanceStrategies,
} from "../src/services/supplyDemandBalanceService.js";

const baseData = {
  ...initializeMapSpace(),
  ...initializeOperationsCenter(),
  ...initializeCustomers(),
  ...initializeSupplyManagement(),
};
const data = {
  ...baseData,
  ...initializeSpatialBusinessProfiles(baseData),
};

const strategies = initializeDefaultSupplyDemandBalanceStrategies("2026-07-10T00:00:00.000Z");
assert.equal(strategies.length, 1, "必须初始化默认供需平衡策略");
assert.equal(strategies[0].strategy_status, "ACTIVE", "默认供需平衡策略必须启用");

const robotaxis = [
  {
    robotaxi_id: "RTX-901",
    availability_status: "AVAILABLE",
    current_task_id: null,
    current_order_id: null,
    current_cell_id: "C-06-10",
    target_zone_id: "Z-001",
  },
  {
    robotaxi_id: "RTX-902",
    availability_status: "UNAVAILABLE",
    current_task_id: "TASK-CLN-9999",
    current_order_id: null,
    current_cell_id: "C-06-10",
    target_zone_id: "Z-001",
  },
];

let runSeq = 0;
let resultSeq = 0;
const execution = executeSupplyDemandBalanceStrategy({
  strategy: strategies[0],
  demandProfiles: data.demandProfiles,
  serviceOrders: [
    {
      service_order_id: "SO-T-001",
      order_status: "COMPLETED",
      pickup_cell_id: "C-06-10",
      dropoff_cell_id: "C-06-25",
      final_price: 42,
      trip_total_duration_min: 18,
    },
    {
      service_order_id: "SO-T-002",
      order_status: "CREATED",
      pickup_cell_id: "C-12-18",
      dropoff_cell_id: "C-28-26",
      estimated_price: 36,
      estimated_duration_min: 22,
    },
  ],
  trips: [],
  robotaxis,
  zones: data.zones,
  places: data.places,
  serviceAreas: data.serviceAreas,
  context: {
    now: "2026-07-10T00:00:00.000Z",
    nextRunId: () => `SDB-RUN-${String(++runSeq).padStart(4, "0")}`,
    nextResultId: () => `SDB-RES-${String(++resultSeq).padStart(4, "0")}`,
  },
});

assert.equal(execution.run.run_status, "SUCCEEDED", "供需平衡策略执行必须成功");
assert.ok(execution.results.length >= 3, "供需平衡必须生成多维度结果");
assert.ok(execution.results.some((item) => item.target_object_type === "ZONE"), "必须生成 Zone 结果");
assert.ok(execution.results.some((item) => item.target_object_type === "PLACE"), "必须生成 Place 结果");
assert.ok(execution.results.some((item) => item.target_object_type === "SERVICE_AREA"), "必须生成服务区域结果");
assert.ok(execution.results.every((item) => Number.isFinite(item.robotaxi_gap_quantity)), "每条结果必须计算 Robotaxi 缺口");
assert.ok(execution.results.every((item) => Number.isFinite(item.demand_urgency_score)), "每条结果必须计算需求紧迫度");
assert.deepEqual(execution.results.map((item) => item.deployment_priority_rank), execution.results.map((_, index) => index + 1), "投放优先级必须连续排序");
assert.ok(execution.results.every((item) => item.deployment_demand_order_id === null), "当前版本不得直接创建投放需求单");

const inactiveExecution = executeSupplyDemandBalanceStrategy({
  strategy: { ...strategies[0], strategy_status: "ARCHIVED" },
  context: { nextRunId: () => "SDB-RUN-9999" },
});
assert.equal(inactiveExecution.run.run_status, "FAILED", "未启用策略必须失败");
assert.equal(inactiveExecution.run.failure_reason, "SUPPLY_DEMAND_BALANCE_STRATEGY_NOT_ACTIVE", "失败原因必须明确");

const main = fs.readFileSync("src/main.jsx", "utf8");
const navigation = fs.readFileSync("src/ui/navigationRegistry.js", "utf8");
assert.equal(navigation.includes('page("supplyDemandBalanceStrategies"'), false, "旧供需平衡页面不得继续作为导航事实源");
assert.ok(navigation.includes('group("shortTermDemandForecastManagement", "短期预测"'), "供需投放必须显式拆分短期预测");
assert.ok(navigation.includes('group("deploymentDecisionManagement", "投放决策"'), "供需投放必须显式拆分投放决策");
assert.ok(main.includes("supplyDemandBalanceService.executeSupplyDemandBalanceStrategy"), "页面必须调用服务执行供需平衡策略");
assert.equal(main.includes("createDeploymentTasksFromSupplyDemandBalance"), false, "供需平衡当前版本不得接入投放任务创建");

const fieldDictionary = fs.readFileSync("src/domain/fieldDictionary.js", "utf8");
[
  "supplyDemandBalanceStrategy",
  "supply_demand_balance_strategy_id",
  "robotaxi_gap_quantity",
  "demand_urgency_score",
  "expected_profit_amount",
  "SHORT_TERM_PROFIT_PRIORITY",
].forEach((text) => {
  assert.ok(fieldDictionary.includes(text), `字段字典必须包含 ${text}`);
});

const designDoc = fs.readFileSync("doc/06-fleet-operations-management/01-fleet-deployment/01-short-term-demand-and-deployment-planning.md", "utf8");
assert.ok(designDoc.includes("短期需求预测"), "正式设计必须明确短期需求预测边界");
assert.ok(designDoc.includes("投放计划"), "正式设计必须明确投放决策直接形成投放计划");

console.log("v041.2.13 供需平衡策略合同验证通过");
