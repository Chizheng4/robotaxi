import assert from "node:assert/strict";
import fs from "node:fs";

import {
  SupplyPlanStatus,
  confirmSupplyPlan,
  executeSupplyDecisionStrategy,
} from "../src/services/businessPlanningService.js";

let runSequence = 0;
let planSequence = 0;
const context = {
  now: () => "2026-07-19T12:00:00.000Z",
  nextRunId: () => `SD-RUN-${String(++runSequence).padStart(4, "0")}`,
  nextSupplyPlanId: () => `FPP-${String(++planSequence).padStart(4, "0")}`,
};
const strategy = {
  supply_decision_strategy_id: "SD-STR-001",
  strategy_status: "ACTIVE",
  demand_coverage_rate: 1,
  safety_capacity_ratio: 0,
};
const profile = [{ profile_id: "SPP-001", profile_status: "ACTIVE", production_lead_time_days: 10 }];
const forecast = (id) => ({
  forecast_result_id: id,
  forecast_run_id: `LDF-RUN-${id}`,
  business_target_id: "BT-001",
  zone_id: "Z-001",
  zone_name: "最小运营测试区",
  forecast_start_date: "2026-07-19",
  forecast_end_date: "2027-07-18",
  forecast_period_unit: "MONTH",
  forecast_period_count: 12,
  supply_production_profile_id: "SPP-001",
  robotaxi_gap_quantity: 10,
  feasible_manufacturing_quantity: 10,
  feasible_delivery_quantity: 10,
});

const first = executeSupplyDecisionStrategy({ strategy, forecast: forecast("LDF-RES-0001"), supplyProductionProfiles: profile, existingSupplyPlans: [], context });
const second = executeSupplyDecisionStrategy({ strategy, forecast: forecast("LDF-RES-0002"), supplyProductionProfiles: profile, existingSupplyPlans: [first.supplyPlan], context });
assert.equal(first.supplyPlan.plan_status, SupplyPlanStatus.DRAFT);
assert.equal(second.supplyPlan.plan_status, SupplyPlanStatus.DRAFT);
assert.deepEqual(second.cancelledSupplyPlans, [], "创建阶段不得取消重叠生产计划");

const confirmation = confirmSupplyPlan({ supplyPlan: second.supplyPlan, existingSupplyPlans: [second.supplyPlan, first.supplyPlan], context });
assert.equal(confirmation.succeeded, true);
assert.equal(confirmation.supplyPlan.plan_status, SupplyPlanStatus.CONFIRMED);
assert.equal(confirmation.cancelledSupplyPlans.length, 1);
assert.equal(confirmation.cancelledSupplyPlans[0].supply_plan_id, first.supplyPlan.supply_plan_id);
assert.equal(confirmation.cancelledSupplyPlans[0].plan_status, SupplyPlanStatus.CANCELLED);

const main = fs.readFileSync("src/main.jsx", "utf8");
const styles = fs.readFileSync("src/styles.css", "utf8");
assert.match(main, /className="row-action-split"/);
assert.match(main, /aria-label="更多操作"/);
assert.match(main, /renderSupplyPlanActions\(row, \{ \.\.\.actions, page, objectType, idField \}\)/, "生产计划详情动作必须携带统一页面上下文");
assert.match(main, /renderProductionBatchActions\(row, \{ \.\.\.actions, page, objectType, idField \}\)/, "生产批次详情动作必须携带统一页面上下文");
assert.match(main, /renderRobotaxiDeliveryOrderActions\(row, \{ \.\.\.actions, page, objectType, idField \}\)/, "交付单详情动作必须携带统一页面上下文");
assert.match(main, /className="interactive-table-cell" onClick=\{\(event\) => event\.stopPropagation\(\)\}/, "交互型表格单元格必须隔离行选中事件");
assert.match(main, /message: `已生成第 \$\{result\.productionBatch\.schedule_sequence \|\| 1\} 期生产批次/, "生产计划必须记录批次生成结果");
assert.match(styles, /\.row-action-split\s*\{/);
assert.match(styles, /\.row-action-menu-trigger\.ant-btn\s*\{/);
assert.match(styles, /\.interactive-table-cell\s*\{/);

console.log("v047.4.4 行操作与生产计划确认时点验证通过");
