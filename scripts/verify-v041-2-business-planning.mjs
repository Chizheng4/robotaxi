import assert from "node:assert/strict";
import fs from "node:fs";
import {
  executeLongTermDemandForecastStrategy,
  initializeDefaultLongTermDemandForecastStrategies,
  initializeDefaultSupplyProductionProfiles,
} from "../src/services/businessPlanningService.js";

const supplyProfiles = initializeDefaultSupplyProductionProfiles("2026-07-09T00:00:00.000Z");
const strategies = initializeDefaultLongTermDemandForecastStrategies("2026-07-09T00:00:00.000Z");

assert.equal(supplyProfiles.length, 1, "必须初始化默认供应生产画像");
assert.equal(supplyProfiles[0].profile_status, "ACTIVE", "供应生产画像默认必须可用");
assert.equal(strategies.length, 1, "必须初始化默认长期需求预测策略");
assert.equal(strategies[0].strategy_status, "ACTIVE", "长期需求预测策略默认必须可用");

let runSeq = 0;
let resultSeq = 0;
const execution = executeLongTermDemandForecastStrategy({
  strategy: strategies[0],
  supplyProductionProfiles: supplyProfiles,
  demandProfiles: [{
    profile_id: "DP-Z-Z-001",
    target_object_type: "ZONE",
    target_object_id: "Z-001",
    target_object_name: "最小运营测试区",
    expected_robotaxi_demand: 14.8,
  }],
  robotaxis: [
    { robotaxi_id: "RTX-001", target_zone_id: "Z-001" },
    { robotaxi_id: "RTX-002", target_zone_id: "Z-001" },
  ],
  context: {
    now: () => "2026-07-09T01:00:00.000Z",
    nextRunId: () => `LDF-RUN-${String(++runSeq).padStart(4, "0")}`,
    nextResultBaseId: () => `LDF-RES-${String(++resultSeq).padStart(4, "0")}`,
  },
});

assert.equal(execution.run.run_status, "SUCCEEDED", "策略执行应成功");
assert.equal(execution.run.result_count, 1, "策略执行应生成一条区域预测结果");
assert.equal(execution.results.length, 1, "必须返回预测结果集合");
assert.equal(execution.results[0].forecast_run_id, execution.run.forecast_run_id, "预测结果必须关联预测执行");
assert.equal(execution.results[0].zone_id, "Z-001", "预测结果必须记录目标区域");
assert.ok(execution.results[0].required_fleet_quantity > 0, "预测结果必须计算目标所需车辆数");
assert.ok(execution.results[0].fleet_gap_quantity >= 0, "预测结果必须计算车辆供给缺口");
assert.equal(execution.results[0].supply_production_profile_id, "SPP-001", "预测结果必须关联供应生产画像");

const main = fs.readFileSync("src/main.jsx", "utf8");
const fieldDictionary = fs.readFileSync("src/domain/fieldDictionary.js", "utf8");
const dictionaryDoc = fs.readFileSync("doc/rules/field-dictionary.md", "utf8");

assert.ok(main.includes('label: "经营规划"'), "前端必须存在经营规划一级菜单");
assert.ok(main.includes('{ key: "supplyProductionProfiles", label: "供应生产画像" }'), "经营规划必须包含供应生产画像菜单");
assert.ok(main.includes('{ key: "longTermDemandForecastStrategies", label: "预测策略" }'), "需求预测必须包含预测策略三级菜单");
assert.ok(main.includes("businessPlanningService.executeLongTermDemandForecastStrategy"), "页面只能调用经营规划服务执行预测，不得自行拼预测结果");
assert.ok(main.includes("longTermDemandForecastRuns: [result.run, ...(current.longTermDemandForecastRuns || [])]"), "执行后必须写入预测执行记录");
assert.ok(main.includes("longTermDemandForecasts: [...(result.results || []), ...(current.longTermDemandForecasts || [])]"), "执行后必须写入预测结果");
assert.ok(main.includes("supplyProductionProfiles: snapshot.operationalData?.supplyProductionProfiles || initialData.supplyProductionProfiles || []"), "运行态恢复必须兼容供应生产画像集合");
assert.ok(main.includes("longTermDemandForecastStrategies: snapshot.operationalData?.longTermDemandForecastStrategies || initialData.longTermDemandForecastStrategies || []"), "运行态恢复必须兼容预测策略集合");
assert.ok(main.includes("longTermDemandForecastRuns: snapshot.operationalData?.longTermDemandForecastRuns || initialData.longTermDemandForecastRuns || []"), "运行态恢复必须兼容预测执行集合");

[
  "supplyProductionProfile",
  "longTermDemandForecastStrategy",
  "longTermDemandForecastRun",
  "forecast_strategy_id",
  "forecast_run_id",
  "forecast_result_id",
  "required_fleet_quantity",
  "fleet_gap_quantity",
].forEach((token) => {
  assert.ok(fieldDictionary.includes(token), `代码字段字典必须包含 ${token}`);
  assert.ok(dictionaryDoc.includes(token), `文档字段字典必须包含 ${token}`);
});

console.log("v041.2 经营规划底座合同验证通过");
