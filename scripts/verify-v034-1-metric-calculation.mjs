import assert from "node:assert/strict";
import fs from "node:fs";
import {
  createMetricCalculation,
  initializeDefaultMetricDefinitions,
  MetricCalculationStatus,
  MetricQualityStatus,
} from "../src/data/metricCalculator.js";

const simulationRun = {
  simulation_run_id: "SIM-RUN-METRIC-001",
  simulation_timeline_id: "SIM-TL-001",
  start_simulation_seconds: 0,
  end_simulation_seconds: 600,
  start_time: "Day1 00:00:00",
  completed_time: "Day1 00:10:00",
  cost_calculation_status: "SUCCEEDED",
  revenue_calculation_status: "SUCCEEDED",
};

const scope = {
  serviceOrders: [
    {
      service_order_id: "SO-METRIC-001",
      order_status: "COMPLETED",
      simulation_created_at: "Day1 00:01:00",
    },
    {
      service_order_id: "SO-METRIC-002",
      order_status: "CANCELLED",
      simulation_created_at: "Day1 00:02:00",
    },
  ],
};

const revenueRecords = [
  { revenue_record_id: "REV-001", simulation_run_id: simulationRun.simulation_run_id, revenue_type: "RECEIVABLE_REVENUE", revenue_amount: 30 },
  { revenue_record_id: "REV-002", simulation_run_id: simulationRun.simulation_run_id, revenue_type: "RECEIVABLE_REVENUE", revenue_amount: 20 },
  { revenue_record_id: "REV-003", simulation_run_id: simulationRun.simulation_run_id, revenue_type: "COLLECTED_REVENUE", revenue_amount: 30 },
  { revenue_record_id: "REV-004", simulation_run_id: simulationRun.simulation_run_id, revenue_type: "UNRECEIVED_REVENUE", revenue_amount: 20 },
];

const costRecords = [
  { cost_record_id: "COST-001", simulation_run_id: simulationRun.simulation_run_id, cost_amount: 10 },
  { cost_record_id: "COST-002", simulation_run_id: simulationRun.simulation_run_id, cost_amount: 5 },
];

const result = createMetricCalculation({
  simulationRun,
  scope,
  revenueRecords,
  costRecords,
  metricDefinitions: initializeDefaultMetricDefinitions(),
  calculationRunId: "MCR-VERIFY-001",
});

assert.equal(result.calculationRun.calculation_status, MetricCalculationStatus.SUCCEEDED, "完整收入、成本和订单事实应得到成功计算状态");
assert.equal(result.metricObservations.length, initializeDefaultMetricDefinitions().length, "每个启用指标定义都必须生成一条指标观测");

const observationByMetricId = new Map(result.metricObservations.map((item) => [item.metric_definition_id, item]));
assert.equal(observationByMetricId.get("OUTCOME-FIN-002").metric_value, 30, "实收收入必须来自收入记录");
assert.equal(observationByMetricId.get("OUTCOME-FIN-004").metric_value, 15, "运营总成本必须来自成本记录");
assert.equal(observationByMetricId.get("OUTCOME-FIN-005").metric_value, 15, "贡献利润必须等于实收收入减运营总成本");
assert.equal(observationByMetricId.get("OUTCOME-SERVICE-003").metric_value, 0.5, "订单履约率必须等于完成订单数除以创建订单数");
assert.equal(observationByMetricId.get("OUTCOME-EFF-002").metric_value, 15, "单均成本必须等于运营总成本除以完成订单数");
assert.equal(observationByMetricId.get("QUALITY-DATA-001").quality_status, MetricQualityStatus.PASS, "关键数据完整率必须反映基础事实完整性");

const emptyOrderResult = createMetricCalculation({
  simulationRun,
  scope: { serviceOrders: [] },
  revenueRecords,
  costRecords,
  metricDefinitions: initializeDefaultMetricDefinitions(),
  calculationRunId: "MCR-VERIFY-002",
});
assert.equal(
  new Map(emptyOrderResult.metricObservations.map((item) => [item.metric_definition_id, item])).get("OUTCOME-SERVICE-003").quality_status,
  MetricQualityStatus.WARN,
  "零订单分母必须给出质量提示，而不是制造错误履约率",
);

const mainSource = fs.readFileSync("src/main.jsx", "utf8");
assert.match(mainSource, /metricDefinitions/, "前端运行态必须持久化指标定义");
assert.match(mainSource, /metricObservations/, "前端运行态必须持久化指标观测");
assert.match(mainSource, /requestMetricCalculation/, "模拟运行必须提供人工经营指标计算入口");
assert.match(mainSource, /runMetricCalculation\(run\.simulation_run_id, \{ automatic: true \}\)/, "成本和收入完成后必须自动触发指标计算");

const fieldDictionarySource = fs.readFileSync("src/domain/fieldDictionary.js", "utf8");
assert.match(fieldDictionarySource, /metricDefinition: \{ label: "指标定义"/, "代码字段字典必须声明指标定义对象");
assert.match(fieldDictionarySource, /metric_definition_id: "指标定义编号"/, "代码字段字典必须声明指标定义编号");
assert.match(fieldDictionarySource, /display_unit: \{[\s\S]*currency: "金额"/, "指标展示单位必须通过统一值字典中文化");

const fieldDictionaryDoc = fs.readFileSync("doc/rules/field-dictionary.md", "utf8");
assert.match(fieldDictionaryDoc, /MetricObservation：指标观测/, "文档字段字典必须声明指标观测对象");
assert.match(fieldDictionaryDoc, /metric_calculation_status\|指标计算状态/, "文档字段字典必须声明模拟运行指标汇总字段");

console.log("v034.1 指标定义与计算引擎验证通过。");
