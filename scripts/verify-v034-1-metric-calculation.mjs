import assert from "node:assert/strict";
import fs from "node:fs";
import {
  createMetricCalculation,
  createPeriodMetricCalculation,
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
      matched_robotaxi_id: "RTX-001",
      trip_id: "TRIP-METRIC-001",
      fulfillment_distance_km: 6.4,
      fulfillment_duration_min: 8,
      simulation_created_at: "Day1 00:01:00",
    },
    {
      service_order_id: "SO-METRIC-002",
      order_status: "CANCELLED",
      simulation_created_at: "Day1 00:02:00",
    },
  ],
  trips: [
    { trip_id: "TRIP-METRIC-001", trip_status: "COMPLETED", total_distance_km: 6.4, time_elapsed: 480 },
  ],
  routePlanningRuns: [
    { route_planning_run_id: "RPR-METRIC-001", planning_result: "SUCCESS", result_route_id: "ROUTE-METRIC-001" },
    { route_planning_run_id: "RPR-METRIC-002", planning_result: "FAILED" },
  ],
  readinessTasks: [
    { task_id: "TASK-RD-METRIC-001", task_status: "PASSED" },
  ],
  deploymentTasks: [
    { task_id: "TASK-DP-METRIC-001", task_status: "COMPLETED" },
  ],
  routeExecutions: [
    { route_execution_id: "RE-METRIC-001", execution_status: "ARRIVED" },
  ],
  orderMatchingDecisions: [
    { order_matching_decision_id: "OMD-METRIC-001", selected_robotaxi_id: "RTX-001" },
  ],
  robotaxis: [
    { robotaxi_id: "RTX-001" },
    { robotaxi_id: "RTX-002" },
  ],
};

const revenueRecords = [
  { revenue_record_id: "REV-001", simulation_run_id: simulationRun.simulation_run_id, revenue_type: "RECEIVABLE_REVENUE", revenue_amount: 30 },
  { revenue_record_id: "REV-002", simulation_run_id: simulationRun.simulation_run_id, revenue_type: "RECEIVABLE_REVENUE", revenue_amount: 20 },
  { revenue_record_id: "REV-003", simulation_run_id: simulationRun.simulation_run_id, revenue_type: "COLLECTED_REVENUE", revenue_amount: 30 },
  { revenue_record_id: "REV-004", simulation_run_id: simulationRun.simulation_run_id, revenue_type: "UNRECEIVED_REVENUE", revenue_amount: 20 },
];

const costRecords = [
  { cost_record_id: "COST-001", simulation_run_id: simulationRun.simulation_run_id, cost_type: "DISTANCE_COST", cost_amount: 10 },
  { cost_record_id: "COST-002", simulation_run_id: simulationRun.simulation_run_id, cost_type: "ASSET_DEPRECIATION_COST", cost_amount: 5 },
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
assert.ok(result.metricObservations.length >= initializeDefaultMetricDefinitions().length, "每个启用指标定义都必须生成指标观测，趋势指标允许多条观测");

const observationByMetricId = new Map(result.metricObservations.map((item) => [item.metric_definition_id, item]));
assert.equal(observationByMetricId.get("OUTCOME-FIN-002").metric_value, 30, "实收收入必须来自收入记录");
assert.equal(observationByMetricId.get("OUTCOME-FIN-004").metric_value, 15, "运营总成本必须来自成本记录");
assert.equal(observationByMetricId.get("OUTCOME-FIN-005").metric_value, 20, "经营贡献必须等于实收收入减变动运营成本");
assert.equal(observationByMetricId.get("OUTCOME-FIN-010").metric_value, 15, "模拟运营利润必须等于实收收入减全部运营成本");
assert.equal(observationByMetricId.get("OUTCOME-EFF-003").metric_value, 20, "单均经营贡献必须等于经营贡献除以完成订单数");
assert.equal(observationByMetricId.get("OUTCOME-SERVICE-003").metric_value, 0.5, "订单履约率必须等于完成订单数除以创建订单数");
assert.equal(observationByMetricId.get("OUTCOME-EFF-002").metric_value, 10, "单均变动成本必须等于变动运营成本除以完成订单数");
assert.equal(observationByMetricId.get("PROCESS-MATCH-001").metric_value, 0.5, "Robotaxi 分配成功率必须来自订单分配事实");
assert.equal(observationByMetricId.get("PROCESS-ROUTE-001").metric_value, 0.5, "路径规划成功率必须来自路径规划执行事实");
assert.equal(observationByMetricId.get("PROCESS-TRIP-001").metric_value, 1, "履约完成率必须来自履约行驶记录");
assert.equal(observationByMetricId.get("PROCESS-SUPPLY-001").metric_value, null, "没有生产计划事实时供给达成率必须为空而不是伪造结果");
assert.equal(observationByMetricId.get("PROCESS-ASSET-001").metric_value, 0.5, "履约车辆覆盖率必须等于有完成服务订单的 Robotaxi 数除以有效 Robotaxi 数");
assert.equal(observationByMetricId.get("PROCESS-EFF-001").metric_value, 6.4, "平均履约距离必须来自已完成服务订单履约距离");
assert.equal(observationByMetricId.get("PROCESS-EFF-002").metric_value, 8, "平均履约耗时必须来自已完成服务订单履约耗时分钟");
assert.equal(result.metricObservations.find((item) => item.metric_definition_id === "DEMAND-TREND-001" && item.dimension_type === "SIMULATION_HOUR").metric_value, 2, "每小时订单数必须来自服务订单创建时间");
assert.equal(result.metricObservations.find((item) => item.metric_definition_id === "DEMAND-TREND-001" && item.dimension_id === "OFF_PEAK").metric_value, 2, "低峰时段订单数必须来自服务订单创建时间");
assert.equal(result.metricObservations.find((item) => item.metric_definition_id === "DEMAND-TREND-001" && item.dimension_id === "PEAK").metric_value, 0, "时段订单数必须保留高峰空桶，便于前端趋势展示");
assert.equal(observationByMetricId.get("PROCESS-ROUTE-001").source_record_count, 2, "过程指标必须记录来源对象数量，支持诊断下钻");
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
  MetricQualityStatus.PASS,
  "没有终态订单时履约率必须为空但不制造数据异常",
);
assert.equal(emptyOrderResult.calculationRun.calculation_status, MetricCalculationStatus.SUCCEEDED, "尚未形成适用事实不是计算异常");

const secondSimulationRun = {
  ...simulationRun,
  simulation_run_id: "SIM-RUN-METRIC-002",
  start_simulation_seconds: 600,
  end_simulation_seconds: 1200,
};
const periodResult = createPeriodMetricCalculation({
  simulationRuns: [simulationRun, secondSimulationRun],
  scope: {
    ...scope,
    serviceOrders: [
      ...scope.serviceOrders,
      { service_order_id: "SO-METRIC-003", simulation_run_id: secondSimulationRun.simulation_run_id, order_status: "COMPLETED", matched_robotaxi_id: "RTX-002", fulfillment_distance_km: 4.2, fulfillment_duration_min: 6, simulation_created_at: "Day1 00:12:00" },
    ],
  },
  revenueRecords: [
    ...revenueRecords,
    { revenue_record_id: "REV-005", simulation_run_id: secondSimulationRun.simulation_run_id, revenue_type: "COLLECTED_REVENUE", revenue_amount: 40 },
  ],
  costRecords: [
    ...costRecords,
    { cost_record_id: "COST-003", simulation_run_id: secondSimulationRun.simulation_run_id, cost_type: "ENERGY_COST", cost_amount: 12 },
  ],
  metricDefinitions: initializeDefaultMetricDefinitions(),
  calculationRunId: "MCR-VERIFY-PERIOD-001",
  periodType: "ALL",
});
const periodObservationByMetricId = new Map(periodResult.metricObservations.map((item) => [item.metric_definition_id, item]));
assert.equal(periodResult.calculationRun.metric_scope_type, "OPERATING_PERIOD", "经营指标计算必须以经营周期为主范围");
assert.deepEqual(periodResult.calculationRun.simulation_run_ids, [simulationRun.simulation_run_id, secondSimulationRun.simulation_run_id], "经营周期必须记录纳入统计的多个模拟运行");
assert.equal(periodObservationByMetricId.get("OUTCOME-FIN-002").metric_value, 70, "经营周期实收收入必须跨多个模拟运行聚合");
assert.equal(periodObservationByMetricId.get("OUTCOME-FIN-004").metric_value, 27, "经营周期成本必须跨多个模拟运行聚合");
assert.equal(periodObservationByMetricId.get("OUTCOME-FIN-005").metric_value, 48, "经营周期经营贡献必须扣除周期变动运营成本");
assert.equal(periodObservationByMetricId.get("OUTCOME-FIN-010").metric_value, 43, "经营周期模拟运营利润必须扣除全部运营成本");
assert.equal(periodObservationByMetricId.get("OUTCOME-FIN-002").metric_scope_type, "OPERATING_PERIOD", "指标观测必须标记经营周期范围");
assert.equal(periodObservationByMetricId.get("OUTCOME-FIN-002").metric_period_type, "ALL", "指标观测必须标记统计周期");

const mainSource = fs.readFileSync("src/main.jsx", "utf8");
const navigationSource = fs.readFileSync("src/ui/navigationRegistry.js", "utf8");
assert.match(mainSource, /metricDefinitions/, "前端运行态必须持久化指标定义");
assert.match(mainSource, /metricObservations/, "前端运行态必须持久化指标观测");
assert.match(mainSource, /metricPeriodOptions/, "经营分析必须提供统计周期选择");
assert.match(mainSource, /更新经营数据/, "经营分析必须提供统一经营数据刷新入口");
assert.doesNotMatch(mainSource, /计算经营周期指标/, "经营分析页不得呈现为页面级指标计算入口");
assert.match(mainSource, /operatingDataPoolService\.createOperatingDataPool/, "经营分析页必须通过统一经营数据池服务获取数据");
assert.doesNotMatch(mainSource, /runMetricCalculation\(run\.simulation_run_id, \{ automatic: true \}\)/, "指标计算不得再按单个模拟运行自动触发");
assert.match(mainSource, /operatingMetricsOverview/, "经营分析必须接入经营总览");
assert.match(navigationSource, /财务效率/, "经营分析必须接入财务效率");
assert.match(navigationSource, /需求服务/, "经营分析必须接入需求服务");
assert.match(navigationSource, /供给资产/, "经营分析必须接入供给资产");
assert.match(navigationSource, /经营诊断/, "经营分析必须接入经营诊断");
assert.match(navigationSource, /财务管理/, "收入、成本和财务计算记录必须归入财务管理一级菜单");
assert.match(navigationSource, /数据计算/, "指标定义、观测和计算记录必须归入数据计算分组");
assert.match(mainSource, /function MetricExperiencePanel/, "指标页面必须具备统一指标体验面板");
assert.match(mainSource, /metricTableVisible/, "指标明细表必须默认收起，避免占用经营分析主阅读区域");
assert.match(mainSource, /pagePresentation\.mode !== "analysis" && statusOptions\.length > 0/, "分析页不得显示业务对象状态分类");
assert.match(mainSource, /pagePresentation\.mode !== "analysis" && \(/, "分析页不得显示业务对象查询筛选栏");
assert.doesNotMatch(mainSource, /metric-decision-labels/, "经营分析页不得用额外说明标签干扰核心指标阅读");
assert.match(mainSource, /operatingDataPool\.pages\.operatingMetricsOverview/, "经营分析页必须消费统一数据池的页面投影");

const poolServiceSource = fs.readFileSync("src/services/operatingDataPoolService.js", "utf8");
assert.match(poolServiceSource, /export function createOperatingDataPool/, "统一经营数据池必须由独立服务创建");
assert.match(poolServiceSource, /OPERATING_ANALYSIS_PAGE_METRICS/, "经营分析页面指标集合必须由统一服务管理");

const fieldDictionarySource = fs.readFileSync("src/domain/fieldDictionary.js", "utf8");
assert.match(fieldDictionarySource, /metricDefinition: \{ label: "指标定义"/, "代码字段字典必须声明指标定义对象");
assert.match(fieldDictionarySource, /metric_definition_id: "指标定义编号"/, "代码字段字典必须声明指标定义编号");
assert.match(fieldDictionarySource, /metric_scope_type: "指标统计范围"/, "代码字段字典必须声明指标统计范围");
assert.match(fieldDictionarySource, /OPERATING_PERIOD: "经营统计周期"/, "指标统计范围必须中文化");
assert.match(fieldDictionarySource, /display_unit: \{[\s\S]*currency: "金额"/, "指标展示单位必须通过统一值字典中文化");

const fieldDictionaryDoc = fs.readFileSync("doc/rules/field-dictionary.md", "utf8");
assert.match(fieldDictionaryDoc, /MetricObservation：指标观测/, "文档字段字典必须声明指标观测对象");
assert.match(fieldDictionaryDoc, /metric_scope_type\|指标统计范围/, "文档字段字典必须声明指标统计范围");
assert.match(fieldDictionaryDoc, /metric_calculation_status\|指标计算状态/, "文档字段字典必须声明模拟运行指标汇总字段");

console.log("v034 经营指标系统计算与页面接入验证通过。");
