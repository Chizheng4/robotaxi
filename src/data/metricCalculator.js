import { getMetricConcept } from "../domain/fieldSemanticRegistry.js?v=20260719-v047-4-1";

export const MetricLayer = {
  STATE: "STATE",
  PROCESS: "PROCESS",
  OUTCOME: "OUTCOME",
  QUALITY: "QUALITY",
  DECISION: "DECISION",
};

export const MetricDomain = {
  DEMAND: "DEMAND",
  FINANCE: "FINANCE",
  SERVICE: "SERVICE",
  EFFICIENCY: "EFFICIENCY",
  ASSET: "ASSET",
  MATCHING: "MATCHING",
  ROUTING: "ROUTING",
  SUPPLY: "SUPPLY",
  QUALITY: "QUALITY",
  DECISION: "DECISION",
};

export const MetricRole = {
  RESULT: "RESULT",
  DRIVER: "DRIVER",
  GUARDRAIL: "GUARDRAIL",
};

export const MetricMeasurementType = {
  SNAPSHOT: "SNAPSHOT",
  FLOW: "FLOW",
  RATE: "RATE",
  AVERAGE: "AVERAGE",
  AMOUNT: "AMOUNT",
};

export const MetricCalculationStatus = {
  QUEUED: "QUEUED",
  CALCULATING: "CALCULATING",
  SUCCEEDED: "SUCCEEDED",
  PARTIALLY_SUCCEEDED: "PARTIALLY_SUCCEEDED",
  FAILED: "FAILED",
};

export const MetricQualityStatus = {
  PASS: "PASS",
  WARN: "WARN",
  FAIL: "FAIL",
};

export const MetricUnit = {
  CURRENCY: "currency",
  PERCENT: "percent",
  COUNT: "count",
  SECOND: "second",
  MINUTE: "minute",
  KM: "km",
};

export const MetricScopeType = {
  SIMULATION_RUN: "SIMULATION_RUN",
  OPERATING_PERIOD: "OPERATING_PERIOD",
};

export const MetricPeriodType = {
  ALL: "ALL",
  LATEST_DAY: "LATEST_DAY",
  LATEST_7_DAYS: "LATEST_7_DAYS",
};

export const defaultMetricDefinitions = [
  definition("OUTCOME-FIN-001", "应收收入", "Receivable Revenue", MetricDomain.FINANCE, "sum(RECEIVABLE_REVENUE.revenue_amount)", ["RevenueRecord"], ["revenue_type", "revenue_amount"], MetricUnit.CURRENCY, true, MetricLayer.OUTCOME, ["GLOBAL"], semantics("统计周期内已形成付款义务的收入总额。", MetricRole.RESULT, MetricMeasurementType.AMOUNT, "收入记录类型为应收收入")),
  definition("OUTCOME-FIN-002", "实收收入", "Collected Revenue", MetricDomain.FINANCE, "sum(COLLECTED_REVENUE.revenue_amount)", ["RevenueRecord"], ["revenue_type", "revenue_amount"], MetricUnit.CURRENCY, true, MetricLayer.OUTCOME, ["GLOBAL"], semantics("统计周期内已经完成收款的收入总额。", MetricRole.RESULT, MetricMeasurementType.AMOUNT, "收入记录类型为实收收入")),
  definition("OUTCOME-FIN-003", "未收收入", "Unreceived Revenue", MetricDomain.FINANCE, "sum(UNRECEIVED_REVENUE.revenue_amount)", ["RevenueRecord"], ["revenue_type", "revenue_amount"], MetricUnit.CURRENCY, false, MetricLayer.OUTCOME, ["GLOBAL"], semantics("统计周期内已形成但尚未收取的收入总额。", MetricRole.GUARDRAIL, MetricMeasurementType.AMOUNT, "收入记录类型为未收收入")),
  definition("OUTCOME-FIN-004", "模拟运营总成本", "Simulated Total Operating Cost", MetricDomain.FINANCE, "sum(CostRecord.cost_amount)", ["CostRecord"], ["cost_type", "cost_amount"], MetricUnit.CURRENCY, false, MetricLayer.OUTCOME, ["GLOBAL"], semantics("统计周期内变动运营成本、资产折旧和固定运营成本的合计。", MetricRole.RESULT, MetricMeasurementType.AMOUNT, "全部运营成本记录")),
  definition("OUTCOME-FIN-005", "经营贡献", "Operating Contribution", MetricDomain.FINANCE, "COLLECTED_REVENUE - VARIABLE_OPERATING_COST", ["RevenueRecord", "CostRecord"], ["revenue_amount", "cost_type", "cost_amount"], MetricUnit.CURRENCY, true, MetricLayer.OUTCOME, ["GLOBAL"], semantics("实收收入扣除距离、能源和人力变动成本后的经营贡献。", MetricRole.RESULT, MetricMeasurementType.AMOUNT, "实收收入与变动运营成本")),
  definition("OUTCOME-FIN-006", "经营贡献率", "Operating Contribution Margin", MetricDomain.FINANCE, "Operating Contribution / Collected Revenue", ["RevenueRecord", "CostRecord"], ["revenue_amount", "cost_type", "cost_amount"], MetricUnit.PERCENT, true, MetricLayer.OUTCOME, ["GLOBAL"], semantics("经营贡献占实收收入的比例。", MetricRole.RESULT, MetricMeasurementType.RATE, "实收收入大于零", "实收收入")),
  definition("OUTCOME-FIN-007", "变动运营成本", "Variable Operating Cost", MetricDomain.FINANCE, "sum(DISTANCE_COST + ENERGY_COST + LABOR_COST)", ["CostRecord"], ["cost_type", "cost_amount"], MetricUnit.CURRENCY, false, MetricLayer.OUTCOME, ["GLOBAL"], semantics("随行驶或作业量变化的距离、能源和人力成本。", MetricRole.DRIVER, MetricMeasurementType.AMOUNT, "成本类型为距离、能源或人力成本")),
  definition("OUTCOME-FIN-008", "资产折旧", "Asset Depreciation", MetricDomain.FINANCE, "sum(ASSET_DEPRECIATION_COST)", ["CostRecord"], ["cost_type", "cost_amount"], MetricUnit.CURRENCY, false, MetricLayer.OUTCOME, ["GLOBAL"], semantics("Robotaxi 在统计周期内因行驶产生的资产折旧成本。", MetricRole.DRIVER, MetricMeasurementType.AMOUNT, "成本类型为资产折旧成本")),
  definition("OUTCOME-FIN-009", "固定运营成本", "Fixed Operating Cost", MetricDomain.FINANCE, "sum(FIXED_OPERATING_COST)", ["CostRecord"], ["cost_type", "cost_amount"], MetricUnit.CURRENCY, false, MetricLayer.OUTCOME, ["GLOBAL"], semantics("不随单次订单或行驶直接变化的固定运营成本。", MetricRole.DRIVER, MetricMeasurementType.AMOUNT, "成本类型为固定运营成本")),
  definition("OUTCOME-FIN-010", "模拟运营利润", "Simulated Operating Profit", MetricDomain.FINANCE, "COLLECTED_REVENUE - TOTAL_OPERATING_COST", ["RevenueRecord", "CostRecord"], ["revenue_amount", "cost_amount"], MetricUnit.CURRENCY, true, MetricLayer.OUTCOME, ["GLOBAL"], semantics("实收收入扣除全部模拟运营成本后的利润。", MetricRole.RESULT, MetricMeasurementType.AMOUNT, "实收收入与全部运营成本")),
  definition("OUTCOME-FIN-011", "模拟运营利润率", "Simulated Operating Margin", MetricDomain.FINANCE, "Simulated Operating Profit / Collected Revenue", ["RevenueRecord", "CostRecord"], ["revenue_amount", "cost_amount"], MetricUnit.PERCENT, true, MetricLayer.OUTCOME, ["GLOBAL"], semantics("模拟运营利润占实收收入的比例。", MetricRole.RESULT, MetricMeasurementType.RATE, "实收收入大于零", "实收收入")),
  definition("OUTCOME-SERVICE-001", "观察订单量", "Observed Order Count", MetricDomain.DEMAND, "count(ServiceOrder)", ["ServiceOrder"], ["service_order_id"], MetricUnit.COUNT, true, MetricLayer.OUTCOME, ["GLOBAL", "ZONE", "TIME"], semantics("统计周期内实际创建的服务订单量，是平台观察到的需求，不等同于全部市场需求。", MetricRole.RESULT, MetricMeasurementType.FLOW, "服务订单在统计周期内创建")),
  definition("OUTCOME-SERVICE-002", "完成订单量", "Completed Order Count", MetricDomain.SERVICE, "count(order_status = COMPLETED)", ["ServiceOrder"], ["order_status"], MetricUnit.COUNT, true, MetricLayer.OUTCOME, ["GLOBAL", "ZONE", "TIME"], semantics("统计周期内已经完成履约和结算闭环的服务订单量。", MetricRole.RESULT, MetricMeasurementType.FLOW, "订单状态为已完成")),
  definition("OUTCOME-SERVICE-003", getMetricConcept("ORDER_FULFILLMENT_RATE").label, "Order Fulfillment Rate", MetricDomain.SERVICE, "Completed Orders / Terminal Orders", ["ServiceOrder"], ["order_status"], MetricUnit.PERCENT, true, MetricLayer.OUTCOME, ["GLOBAL", "ZONE"], semantics(getMetricConcept("ORDER_FULFILLMENT_RATE").definition, MetricRole.RESULT, MetricMeasurementType.RATE, "订单状态为已完成、已取消或已失败", "终态订单量")),
  definition("OUTCOME-SERVICE-004", "成熟订单取消率", "Matured Order Cancellation Rate", MetricDomain.SERVICE, "Cancelled Orders / Terminal Orders", ["ServiceOrder"], ["order_status"], MetricUnit.PERCENT, false, MetricLayer.OUTCOME, ["GLOBAL", "ZONE"], semantics("取消订单占已经进入终态订单的比例；在途订单不进入分母。", MetricRole.GUARDRAIL, MetricMeasurementType.RATE, "订单状态为已完成、已取消或已失败", "终态订单量")),
  definition("OUTCOME-SERVICE-005", "失败订单量", "Failed Order Count", MetricDomain.SERVICE, "count(order_status in FAILED_STATUSES)", ["ServiceOrder"], ["order_status"], MetricUnit.COUNT, false, MetricLayer.OUTCOME, ["GLOBAL", "ZONE"], semantics("统计周期内进入失败终态的服务订单量。", MetricRole.GUARDRAIL, MetricMeasurementType.FLOW, "订单状态为失败或匹配失败")),
  definition("STATE-SERVICE-001", "在途订单量", "In-progress Order Count", MetricDomain.SERVICE, "count(non_terminal ServiceOrder)", ["ServiceOrder"], ["order_status"], MetricUnit.COUNT, false, MetricLayer.STATE, ["GLOBAL"], semantics("统计截止时点仍未进入终态的服务订单数量。", MetricRole.DRIVER, MetricMeasurementType.SNAPSHOT, "订单状态不是已完成、已取消或已失败")),
  definition("STATE-SERVICE-002", "在途履约量", "In-progress Trip Count", MetricDomain.SERVICE, "count(non_terminal Trip)", ["Trip"], ["trip_status"], MetricUnit.COUNT, false, MetricLayer.STATE, ["GLOBAL"], semantics("统计截止时点仍在推进中的履约行驶记录数量。", MetricRole.DRIVER, MetricMeasurementType.SNAPSHOT, "履约行驶状态不是已完成、已取消或已失败")),
  definition("OUTCOME-EFF-001", "单均实收收入", "Collected Revenue per Completed Order", MetricDomain.FINANCE, "Collected Revenue / Completed Orders", ["RevenueRecord", "ServiceOrder"], ["revenue_amount", "order_status"], MetricUnit.CURRENCY, true, MetricLayer.OUTCOME, ["GLOBAL"], semantics("每个已完成订单对应的平均实收收入。", MetricRole.DRIVER, MetricMeasurementType.AVERAGE, "已完成订单", "完成订单量")),
  definition("OUTCOME-EFF-002", "单均变动成本", "Variable Cost per Completed Order", MetricDomain.FINANCE, "Variable Operating Cost / Completed Orders", ["CostRecord", "ServiceOrder"], ["cost_type", "cost_amount", "order_status"], MetricUnit.CURRENCY, false, MetricLayer.OUTCOME, ["GLOBAL"], semantics("每个已完成订单承担的平均变动运营成本。", MetricRole.DRIVER, MetricMeasurementType.AVERAGE, "变动运营成本与已完成订单", "完成订单量")),
  definition("OUTCOME-EFF-003", "单均经营贡献", "Operating Contribution per Completed Order", MetricDomain.FINANCE, "Operating Contribution / Completed Orders", ["RevenueRecord", "CostRecord", "ServiceOrder"], ["revenue_amount", "cost_type", "cost_amount", "order_status"], MetricUnit.CURRENCY, true, MetricLayer.OUTCOME, ["GLOBAL"], semantics("每个已完成订单平均形成的经营贡献。", MetricRole.RESULT, MetricMeasurementType.AVERAGE, "实收收入、变动运营成本与已完成订单", "完成订单量")),
  definition("DEMAND-TREND-001", "订单需求趋势", "Order Demand Trend", MetricDomain.DEMAND, "count(ServiceOrder) by time dimension", ["ServiceOrder"], ["simulation_created_at"], MetricUnit.COUNT, true, MetricLayer.PROCESS, ["SIMULATION_HOUR", "DEMAND_TIME_SEGMENT"], semantics("按小时和经营时段观察服务订单需求分布。", MetricRole.DRIVER, MetricMeasurementType.FLOW, "具有有效模拟发生时间的服务订单")),
  definition("DEMAND-TREND-002", "旧时段订单趋势", "Legacy Time Segment Trend", MetricDomain.DEMAND, "legacy", ["ServiceOrder"], ["simulation_created_at"], MetricUnit.COUNT, true, MetricLayer.PROCESS, ["DEMAND_TIME_SEGMENT"], { ...semantics("兼容历史观测，不再生成新结果。", MetricRole.DRIVER, MetricMeasurementType.FLOW, "历史兼容"), metric_status: "DISABLED" }),
  definition("PROCESS-ASSET-001", "履约车辆覆盖率", "Fulfillment Robotaxi Coverage Rate", MetricDomain.ASSET, "Robotaxi with completed ServiceOrder / effective Robotaxi", ["Robotaxi", "ServiceOrder"], ["robotaxi_id", "order_status", "availability_status"], MetricUnit.PERCENT, true, MetricLayer.PROCESS, ["GLOBAL"], semantics("统计周期内至少完成过一个订单的 Robotaxi 占有效 Robotaxi 的比例；该指标不是时间利用率。", MetricRole.DRIVER, MetricMeasurementType.RATE, "有效 Robotaxi 与完成订单", "有效 Robotaxi 数量")),
  definition("PROCESS-ASSET-002", getMetricConcept("ORDER_SERVICE_TIME_UTILIZATION_RATE").label, "Order Service Time Utilization Rate", MetricDomain.ASSET, "Order Service Occupied Time / Robotaxi Operable Time", ["Robotaxi", "ServiceOrder", "Trip"], ["robotaxi_id", "order_status", "trip_status"], MetricUnit.PERCENT, true, MetricLayer.PROCESS, ["GLOBAL", "ROBOTAXI"], { ...semantics(`${getMetricConcept("ORDER_SERVICE_TIME_UTILIZATION_RATE").definition} 缺少连续状态区间时不伪造结果。`, MetricRole.RESULT, MetricMeasurementType.RATE, "Robotaxi 可运营状态区间、服务订单接驾区间和载客履约区间", "Robotaxi 可运营时长"), data_readiness: "MISSING_FACT", metric_status: "RESERVED" }),
  definition("PROCESS-ASSET-003", "空驶里程占比", "Empty Distance Share", MetricDomain.ASSET, "Operational Route Distance / Total Driven Distance", ["RouteExecution", "Trip"], ["total_distance_km", "trip_total_distance_km"], MetricUnit.PERCENT, false, MetricLayer.PROCESS, ["GLOBAL", "ROBOTAXI"], semantics("未承载客户履约的运营行驶里程占全部行驶里程的比例。", MetricRole.GUARDRAIL, MetricMeasurementType.RATE, "运营行驶与履约行驶记录", "全部行驶里程")),
  definition("PROCESS-ASSET-004", "单车完成订单量", "Completed Orders per Effective Robotaxi", MetricDomain.ASSET, "Completed Orders / Effective Robotaxi", ["Robotaxi", "ServiceOrder"], ["availability_status", "order_status"], MetricUnit.COUNT, true, MetricLayer.PROCESS, ["GLOBAL"], semantics("统计周期内每辆有效 Robotaxi 平均完成的订单量。", MetricRole.RESULT, MetricMeasurementType.AVERAGE, "有效 Robotaxi 与已完成订单", "有效 Robotaxi 数量")),
  definition("STATE-ASSET-001", "有效 Robotaxi", "Effective Robotaxi Count", MetricDomain.ASSET, "count(effective Robotaxi)", ["Robotaxi"], ["availability_status", "operational_status"], MetricUnit.COUNT, true, MetricLayer.STATE, ["GLOBAL", "ZONE"], semantics("统计截止时点已形成资产且未待交付、待准入或退役的 Robotaxi 数量。", MetricRole.DRIVER, MetricMeasurementType.SNAPSHOT, "有效 Robotaxi")),
  definition("STATE-ASSET-002", "可运营 Robotaxi", "Operable Robotaxi Count", MetricDomain.ASSET, "count(operable Robotaxi)", ["Robotaxi"], ["availability_status", "operational_status"], MetricUnit.COUNT, true, MetricLayer.STATE, ["GLOBAL", "ZONE"], semantics("统计截止时点可参与订单或投放分配的 Robotaxi 数量。", MetricRole.DRIVER, MetricMeasurementType.SNAPSHOT, "Robotaxi 运营状态为可运营")),
  definition("STATE-ASSET-003", "运维中 Robotaxi", "Robotaxi in Maintenance Count", MetricDomain.ASSET, "count(Robotaxi in maintenance)", ["Robotaxi"], ["availability_status", "operational_status"], MetricUnit.COUNT, false, MetricLayer.STATE, ["GLOBAL", "ZONE"], semantics("统计截止时点因运维任务被占用的 Robotaxi 数量。", MetricRole.GUARDRAIL, MetricMeasurementType.SNAPSHOT, "Robotaxi 运营状态为运维中")),
  definition("PROCESS-MATCH-001", "最终分配成功率", "Final Robotaxi Assignment Success Rate", MetricDomain.MATCHING, "Assigned Terminal Orders / Ended Matching Orders", ["ServiceOrder", "OrderMatchingDecision"], ["order_status", "selected_robotaxi_id"], MetricUnit.PERCENT, true, MetricLayer.PROCESS, ["GLOBAL"], semantics("已经结束匹配过程的订单中最终成功分配 Robotaxi 的比例；等待重试的订单不进入分母。", MetricRole.DRIVER, MetricMeasurementType.RATE, "已分配或匹配终止的服务订单", "已结束匹配过程的订单量")),
  definition("PROCESS-ROUTE-001", "路径规划成功率", "Route Planning Success Rate", MetricDomain.ROUTING, "Successful RoutePlanningRun / Ended RoutePlanningRun", ["RoutePlanningRun"], ["planning_result", "result_route_id"], MetricUnit.PERCENT, true, MetricLayer.PROCESS, ["GLOBAL"], semantics("已结束的路径规划执行中形成有效路线的比例。", MetricRole.DRIVER, MetricMeasurementType.RATE, "已结束路径规划执行", "已结束路径规划执行量")),
  definition("PROCESS-TRIP-001", "履约行驶完成率", "Trip Completion Rate", MetricDomain.SERVICE, "Completed Trips / Terminal Trips", ["Trip"], ["trip_status"], MetricUnit.PERCENT, true, MetricLayer.PROCESS, ["GLOBAL"], semantics("已进入终态的履约行驶记录中正常完成的比例；在途行驶不进入分母。", MetricRole.DRIVER, MetricMeasurementType.RATE, "履约行驶状态为已完成、已取消或已失败", "终态履约行驶量")),
  definition("PROCESS-EFF-001", "平均履约距离", "Average Fulfillment Distance", MetricDomain.EFFICIENCY, "sum(valid completed order distance) / valid completed orders", ["ServiceOrder"], ["fulfillment_distance_km", "order_status"], MetricUnit.KM, false, MetricLayer.PROCESS, ["GLOBAL"], semantics("具有有效距离的完成订单平均履约距离；缺失距离的订单不进入分母并形成质量提示。", MetricRole.DRIVER, MetricMeasurementType.AVERAGE, "已完成且履约距离有效的订单", "履约距离有效的完成订单量")),
  definition("PROCESS-EFF-002", "平均订单履约执行时长", "Average Order Fulfillment Execution Duration", MetricDomain.EFFICIENCY, "sum(valid completed order fulfillment execution duration) / valid completed orders", ["ServiceOrder"], ["fulfillment_duration_min", "order_status"], MetricUnit.MINUTE, false, MetricLayer.PROCESS, ["GLOBAL"], semantics("Robotaxi 接受订单至送达完成的平均执行时长；缺失有效执行时长的完成订单不进入分母并形成质量提示。", MetricRole.DRIVER, MetricMeasurementType.AVERAGE, "已完成且履约执行时长有效的订单", "履约执行时长有效的完成订单量")),
  definition("PROCESS-SUPPLY-001", "生产计划达成率", "Production Plan Attainment", MetricDomain.SUPPLY, "Produced Robotaxi / Planned Robotaxi", ["SupplyPlan", "ProductionBatch"], ["planned_robotaxi_count", "produced_robotaxi_count"], MetricUnit.PERCENT, true, MetricLayer.PROCESS, ["GLOBAL", "ZONE"], semantics("已完成生产批次形成的 Robotaxi 数量占有效生产计划数量的比例。", MetricRole.RESULT, MetricMeasurementType.RATE, "有效生产计划与已完成生产批次", "计划生产数量")),
  definition("PROCESS-SUPPLY-002", "区域交付达成率", "Regional Delivery Attainment", MetricDomain.SUPPLY, "Delivered Robotaxi / Delivery Order Robotaxi", ["RobotaxiDeliveryOrder"], ["robotaxi_ids", "delivery_status"], MetricUnit.PERCENT, true, MetricLayer.PROCESS, ["GLOBAL", "ZONE"], semantics("已完成交付的 Robotaxi 数量占进入终态交付单 Robotaxi 数量的比例。", MetricRole.RESULT, MetricMeasurementType.RATE, "已完成、失败或取消的区域交付单", "终态交付 Robotaxi 数量")),
  definition("PROCESS-SUPPLY-003", "运营准入通过率", "Operating Admission Pass Rate", MetricDomain.SUPPLY, "Passed Readiness Tasks / Terminal Readiness Tasks", ["ReadinessTask"], ["task_status", "admission_result"], MetricUnit.PERCENT, true, MetricLayer.PROCESS, ["GLOBAL", "ZONE"], semantics("已结束运营准入任务中通过准入的比例。", MetricRole.RESULT, MetricMeasurementType.RATE, "已完成、失败或取消的运营准入任务", "终态运营准入任务量")),
  definition("QUALITY-DATA-001", "关键数据完整率", "Critical Data Completeness Rate", MetricDomain.QUALITY, "complete critical inputs / required critical inputs", ["SimulationRun", "RevenueRecord", "CostRecord", "ServiceOrder"], ["cost_calculation_status", "revenue_calculation_status", "simulation_created_at"], MetricUnit.PERCENT, true, MetricLayer.QUALITY, ["GLOBAL"], semantics("本次经营分析依赖的关键来源和字段通过完整性检查的比例。", MetricRole.GUARDRAIL, MetricMeasurementType.RATE, "关键来源和必要字段", "关键数据检查项")),
  definition("PROCESS-DECISION-001", "决策过程量", "Decision Process Count", MetricDomain.DECISION, "count(DecisionProcess)", ["DecisionProcess"], ["decision_process_id"], MetricUnit.COUNT, true, MetricLayer.DECISION, ["GLOBAL", "DECISION_DOMAIN"], semantics("按业务对象聚合后的决策过程数量，不等同于原始策略尝试次数。", MetricRole.DRIVER, MetricMeasurementType.FLOW, "统一决策监控过程")),
  definition("PROCESS-DECISION-002", "决策最终成功率", "Final Decision Success Rate", MetricDomain.DECISION, "successful terminal DecisionProcess / terminal DecisionProcess", ["DecisionProcess"], ["process_status"], MetricUnit.PERCENT, true, MetricLayer.DECISION, ["GLOBAL", "DECISION_DOMAIN"], semantics("已结束决策过程中最终成功或等待后成功的比例。", MetricRole.RESULT, MetricMeasurementType.RATE, "已结束决策过程", "已结束决策过程量")),
  definition("PROCESS-DECISION-003", "决策结果覆盖率", "Decision Result Coverage Rate", MetricDomain.DECISION, "DecisionProcess with result / DecisionProcess", ["DecisionProcess"], ["result_count"], MetricUnit.PERCENT, true, MetricLayer.DECISION, ["GLOBAL", "DECISION_DOMAIN"], semantics("统一决策过程中至少形成一条结果记录的比例。", MetricRole.GUARDRAIL, MetricMeasurementType.RATE, "统一决策过程", "决策过程量")),
  definition("PROCESS-DECISION-004", "业务影响异常率", "Business-impact Decision Exception Rate", MetricDomain.DECISION, "business-impact exception processes / terminal processes", ["DecisionProcess"], ["exception_category", "affected_business_object_count"], MetricUnit.PERCENT, false, MetricLayer.DECISION, ["GLOBAL", "DECISION_DOMAIN"], semantics("真正造成业务对象失败、取消或终止的决策异常过程占比；正常重试单独下钻。", MetricRole.GUARDRAIL, MetricMeasurementType.RATE, "已结束且影响业务结果的决策过程", "已结束决策过程量")),
  definition("PROCESS-DECISION-005", "平均决策耗时", "Average Decision Duration", MetricDomain.DECISION, "sum(DecisionProcess.duration_seconds) / valid DecisionProcess", ["DecisionProcess"], ["duration_seconds"], MetricUnit.SECOND, false, MetricLayer.DECISION, ["GLOBAL", "DECISION_DOMAIN"], semantics("具有有效开始和结束时间的决策过程平均耗时。", MetricRole.DRIVER, MetricMeasurementType.AVERAGE, "具有有效耗时的决策过程", "有效耗时决策过程量")),
];

export function initializeDefaultMetricDefinitions() {
  return defaultMetricDefinitions.map((item) => ({ ...item }));
}

export function createMetricCalculation({
  simulationRun,
  scope,
  revenueRecords = [],
  costRecords = [],
  metricDefinitions = initializeDefaultMetricDefinitions(),
  calculationRunId,
  algorithmVersion = "1.0.0",
}) {
  return createCalculationFromContext(createSimulationRunMetricContext({
    simulationRun,
    scope,
    revenueRecords,
    costRecords,
    calculationRunId,
  }), normalizeMetricDefinitions(metricDefinitions), algorithmVersion);
}

export function createPeriodMetricCalculation({
  simulationRuns = [],
  scope,
  revenueRecords = [],
  costRecords = [],
  metricDefinitions = initializeDefaultMetricDefinitions(),
  calculationRunId,
  periodType = MetricPeriodType.ALL,
  algorithmVersion = "1.0.0",
}) {
  return createCalculationFromContext(createOperatingPeriodMetricContext({
    simulationRuns,
    scope,
    revenueRecords,
    costRecords,
    calculationRunId,
    periodType,
  }), normalizeMetricDefinitions(metricDefinitions), algorithmVersion);
}

export function getMetricPeriodOptions() {
  return [
    { value: MetricPeriodType.ALL, label: "全量经营周期" },
    { value: MetricPeriodType.LATEST_DAY, label: "最近 1 个模拟日" },
    { value: MetricPeriodType.LATEST_7_DAYS, label: "最近 7 个模拟日" },
  ];
}

function createCalculationFromContext(context, definitions, algorithmVersion) {
  const startedAt = new Date().toISOString();
  context.createdAt = startedAt;
  let observationSequence = 0;
  const observations = definitions
    .filter((item) => item.metric_status === "ACTIVE")
    .flatMap((metricDefinition) => calculateObservations(metricDefinition, context, () => {
      observationSequence += 1;
      return observationSequence;
    }));
  const failedCount = observations.filter((item) => item.quality_status === MetricQualityStatus.FAIL).length;
  const warnCount = observations.filter((item) => item.quality_status === MetricQualityStatus.WARN).length;
  const status = observations.length > 0 && failedCount >= observations.length
    ? MetricCalculationStatus.FAILED
    : failedCount > 0 || warnCount > 0
      ? MetricCalculationStatus.PARTIALLY_SUCCEEDED
      : MetricCalculationStatus.SUCCEEDED;
  const errors = observations
    .filter((item) => item.quality_status !== MetricQualityStatus.PASS)
    .map((item) => ({
      metric_definition_id: item.metric_definition_id,
      error_type: item.quality_status === MetricQualityStatus.FAIL ? "METRIC_QUALITY_FAILED" : "METRIC_QUALITY_WARN",
      error_message: item.quality_reason,
    }));
  const definitionById = new Map(definitions.map((item) => [item.metric_definition_id, item]));
  const issueDetails = createMetricIssueDetails(errors, definitionById);
  const failedMetricCount = issueDetails.filter((item) => item.issue_level === "FAIL").length;
  const warningMetricCount = issueDetails.filter((item) => item.issue_level === "WARN").length;
  const activeMetricCount = definitions.filter((item) => item.metric_status === "ACTIVE").length;
  return {
    metricObservations: observations,
    calculationRun: {
      metric_calculation_run_id: context.calculationRunId,
      metric_scope_type: context.metricScopeType,
      metric_period_type: context.metricPeriodType,
      metric_period_label: context.metricPeriodLabel,
      window_start_seconds: Number(context.simulationRun?.start_simulation_seconds || 0),
      window_end_seconds: Number(context.simulationRun?.end_simulation_seconds ?? context.simulationRun?.current_simulation_seconds ?? 0),
      time_basis: "SIMULATION_TIME",
      simulation_run_id: context.simulationRun?.simulation_run_id || null,
      simulation_run_ids: context.simulationRunIds,
      simulation_timeline_id: context.simulationTimelineId,
      calculation_status: status,
      calculation_progress_percent: 100,
      metric_definition_count: activeMetricCount,
      generated_metric_observation_count: observations.length,
      error_count: errors.length,
      calculation_errors: errors,
      successful_metric_count: Math.max(0, activeMetricCount - failedMetricCount - warningMetricCount),
      warning_metric_count: warningMetricCount,
      failed_metric_count: failedMetricCount,
      affected_metric_ids: issueDetails.map((item) => item.metric_definition_id),
      metric_issue_details: issueDetails,
      calculation_issue_summary: createCalculationIssueSummary({ status, failedMetricCount, warningMetricCount }),
      recommended_action: createCalculationRecommendedAction(issueDetails),
      algorithm_version: algorithmVersion,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    },
  };
}

function createMetricIssueDetails(errors, definitionById) {
  const issueByMetricId = new Map();
  errors.forEach((error) => {
    if (issueByMetricId.has(error.metric_definition_id)) return;
    const reason = error.error_message || "数据质量未通过";
    issueByMetricId.set(error.metric_definition_id, {
      metric_definition_id: error.metric_definition_id,
      metric_name_cn: definitionById.get(error.metric_definition_id)?.metric_name_cn || "未定义指标",
      issue_level: error.error_type === "METRIC_QUALITY_FAILED" ? "FAIL" : "WARN",
      issue_reason: reason,
      recommended_action: resolveMetricIssueAction(reason),
    });
  });
  return [...issueByMetricId.values()];
}

function createCalculationIssueSummary({ status, failedMetricCount, warningMetricCount }) {
  if (status === MetricCalculationStatus.SUCCEEDED) return "全部指标计算成功，数据质量通过。";
  if (status === MetricCalculationStatus.FAILED) return `${failedMetricCount} 项指标计算失败，当前结果不可用于经营判断。`;
  return `${warningMetricCount} 项指标存在数据提示${failedMetricCount > 0 ? `，${failedMetricCount} 项指标失败` : ""}；其余指标可正常使用。`;
}

function createCalculationRecommendedAction(issueDetails) {
  if (!issueDetails.length) return "无需处理，可直接查看经营分析结果。";
  const actions = [...new Set(issueDetails.map((item) => item.recommended_action))];
  return actions.slice(0, 3).join("；");
}

function resolveMetricIssueAction(reason) {
  const text = String(reason || "");
  if (/分母|订单|履约/.test(text)) return "继续形成已完成服务订单，或确认所选统计周期是否包含订单事实";
  if (/收入|成本|财务/.test(text)) return "确认业务单据已完成成本和收入闭环，再更新经营数据";
  if (/来源|缺失|完整/.test(text)) return "查看指标来源记录并补齐缺失业务字段";
  return "查看该指标的质量说明和来源记录后修正数据";
}

function createSimulationRunMetricContext({ simulationRun, scope, revenueRecords = [], costRecords = [], calculationRunId }) {
  const runRevenueRecords = (revenueRecords || []).filter((record) => record.simulation_run_id === simulationRun.simulation_run_id);
  const runCostRecords = (costRecords || []).filter((record) => record.simulation_run_id === simulationRun.simulation_run_id);
  return {
    simulationRun,
    simulationRunIds: [simulationRun.simulation_run_id],
    simulationTimelineId: simulationRun.simulation_timeline_id || null,
    metricScopeType: MetricScopeType.SIMULATION_RUN,
    metricPeriodType: "SIMULATION_RUN",
    metricPeriodLabel: simulationRun.simulation_name || simulationRun.simulation_run_id,
    scope: scope || {},
    revenueRecords: runRevenueRecords,
    costRecords: runCostRecords,
    calculationRunId,
  };
}

function createOperatingPeriodMetricContext({ simulationRuns = [], scope = {}, revenueRecords = [], costRecords = [], calculationRunId, periodType }) {
  const period = resolveOperatingPeriod(simulationRuns, periodType);
  const runIds = new Set(period.simulationRuns.map((run) => run.simulation_run_id).filter(Boolean));
  const scopedRunIds = runIds.size > 0 ? runIds : new Set((simulationRuns || []).map((run) => run.simulation_run_id).filter(Boolean));
  const filteredScope = filterScopeByOperatingPeriod(scope || {}, scopedRunIds, period);
  return {
    simulationRun: createPeriodAnchor(period, scopedRunIds),
    simulationRunIds: [...scopedRunIds],
    simulationTimelineId: period.simulationTimelineId,
    metricScopeType: MetricScopeType.OPERATING_PERIOD,
    metricPeriodType: period.periodType,
    metricPeriodLabel: period.periodLabel,
    scope: filteredScope,
    revenueRecords: filterRecordsByOperatingPeriod(revenueRecords, scopedRunIds, period),
    costRecords: filterRecordsByOperatingPeriod(costRecords, scopedRunIds, period),
    calculationRunId,
  };
}

function resolveOperatingPeriod(simulationRuns = [], periodType = MetricPeriodType.ALL) {
  const normalizedRuns = (simulationRuns || []).filter((run) => run?.simulation_run_id);
  const endSeconds = Math.max(0, ...normalizedRuns.map((run) => getRunEndSeconds(run)));
  const earliestStartSeconds = normalizedRuns.length
    ? Math.min(...normalizedRuns.map((run) => getRunStartSeconds(run)))
    : 0;
  const startSeconds = periodType === MetricPeriodType.LATEST_DAY
    ? Math.max(0, endSeconds - 86400)
    : periodType === MetricPeriodType.LATEST_7_DAYS
      ? Math.max(0, endSeconds - 86400 * 7)
      : earliestStartSeconds;
  const periodRuns = periodType === MetricPeriodType.ALL
    ? normalizedRuns
    : normalizedRuns.filter((run) => getRunEndSeconds(run) >= startSeconds && getRunStartSeconds(run) <= endSeconds);
  return {
    periodType,
    periodLabel: getPeriodLabel(periodType, startSeconds, endSeconds),
    startSeconds,
    endSeconds,
    simulationRuns: periodRuns,
    simulationTimelineId: periodRuns.find((run) => run.simulation_timeline_id)?.simulation_timeline_id || null,
  };
}

function createPeriodAnchor(period, runIds) {
  return {
    simulation_run_id: null,
    simulation_name: period.periodLabel,
    simulation_timeline_id: period.simulationTimelineId,
    start_simulation_seconds: period.startSeconds,
    end_simulation_seconds: period.endSeconds,
    start_time: formatMetricPeriodTime(period.startSeconds),
    completed_time: formatMetricPeriodTime(period.endSeconds),
    cost_calculation_status: "SUCCEEDED",
    revenue_calculation_status: "SUCCEEDED",
    source_simulation_run_count: runIds.size,
  };
}

function getRunStartSeconds(run) {
  return Number(run.start_simulation_seconds ?? run.simulation_start_seconds ?? 0) || 0;
}

function getRunEndSeconds(run) {
  return Number(run.end_simulation_seconds ?? run.simulation_end_seconds ?? run.current_simulation_seconds ?? getRunStartSeconds(run)) || 0;
}

function getPeriodLabel(periodType, startSeconds, endSeconds) {
  const option = getMetricPeriodOptions().find((item) => item.value === periodType);
  return `${option?.label || "经营周期"}：${formatMetricPeriodTime(startSeconds)} - ${formatMetricPeriodTime(endSeconds)}`;
}

function formatMetricPeriodTime(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds || 0));
  const day = Math.floor(seconds / 86400) + 1;
  const secondsInDay = seconds % 86400;
  const hour = Math.floor(secondsInDay / 3600);
  const minute = Math.floor((secondsInDay % 3600) / 60);
  const second = Math.floor(secondsInDay % 60);
  return `Day${day} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
}

function filterScopeByOperatingPeriod(scope, runIds, period) {
  const shouldKeep = (item) => recordBelongsToOperatingPeriod(item, runIds, period);
  return {
    ...scope,
    serviceOrders: (scope.serviceOrders || []).filter(shouldKeep),
    trips: (scope.trips || []).filter(shouldKeep),
    readinessTasks: (scope.readinessTasks || []).filter(shouldKeep),
    deploymentTasks: (scope.deploymentTasks || []).filter(shouldKeep),
    routeExecutions: (scope.routeExecutions || []).filter(shouldKeep),
    pricingStrategyRuns: (scope.pricingStrategyRuns || []).filter(shouldKeep),
    pricingDecisions: (scope.pricingDecisions || []).filter(shouldKeep),
    orderMatchingRuns: (scope.orderMatchingRuns || []).filter(shouldKeep),
    orderMatchingDecisions: (scope.orderMatchingDecisions || []).filter(shouldKeep),
    routePlanningRuns: (scope.routePlanningRuns || []).filter(shouldKeep),
    demandSimulationRuns: (scope.demandSimulationRuns || []).filter(shouldKeep),
    longTermDemandForecastRuns: (scope.longTermDemandForecastRuns || []).filter(shouldKeep),
    fleetAllocationRuns: (scope.fleetAllocationRuns || []).filter(shouldKeep),
    supplyDemandBalanceRuns: (scope.supplyDemandBalanceRuns || []).filter(shouldKeep),
    fleetOperationPolicyRuns: (scope.fleetOperationPolicyRuns || []).filter(shouldKeep),
    fleetOperationDispatchRuns: (scope.fleetOperationDispatchRuns || []).filter(shouldKeep),
    robotaxiTaskPlanningRuns: (scope.robotaxiTaskPlanningRuns || []).filter(shouldKeep),
    decisionProcesses: (scope.decisionProcesses || []).filter(shouldKeep),
    supplyPlans: (scope.supplyPlans || []).filter(shouldKeep),
    productionBatches: (scope.productionBatches || []).filter(shouldKeep),
    robotaxiDeliveryOrders: (scope.robotaxiDeliveryOrders || []).filter(shouldKeep),
    cleaningTasks: (scope.cleaningTasks || []).filter(shouldKeep),
    chargingTasks: (scope.chargingTasks || []).filter(shouldKeep),
    maintenanceTasks: (scope.maintenanceTasks || []).filter(shouldKeep),
    failureHandlingTasks: (scope.failureHandlingTasks || []).filter(shouldKeep),
    retirementTasks: (scope.retirementTasks || []).filter(shouldKeep),
  };
}

function filterRecordsByOperatingPeriod(records = [], runIds, period) {
  return (records || []).filter((record) => recordBelongsToOperatingPeriod(record, runIds, period));
}

function recordBelongsToOperatingPeriod(record, runIds, period) {
  if (!record) return false;
  if (period.periodType === MetricPeriodType.ALL) return true;
  if (record.simulation_run_id && !runIds.has(record.simulation_run_id)) return false;
  const seconds = resolveRecordSimulationSeconds(record);
  return Number.isFinite(seconds) && seconds >= period.startSeconds && seconds <= period.endSeconds;
}

function resolveRecordSimulationSeconds(record = {}) {
  const direct = Number(record.simulation_created_seconds ?? record.created_simulation_seconds ?? record.simulation_occurred_seconds);
  if (Number.isFinite(direct)) return direct;
  return parseSimulationTimeSeconds(
    record.simulation_created_at
      || record.simulation_completed_at
      || record.simulation_cost_occurred_at
      || record.simulation_revenue_occurred_at,
  );
}

export function normalizeMetricDefinitions(definitions = []) {
  const fallback = initializeDefaultMetricDefinitions();
  if (!Array.isArray(definitions) || definitions.length === 0) return fallback;
  const fallbackById = new Map(fallback.map((item) => [item.metric_definition_id, item]));
  const normalizedDefinitions = definitions.map((item) => {
    const canonical = fallbackById.get(item.metric_definition_id);
    return {
      ...item,
      ...(canonical || {}),
      metric_status: canonical?.metric_status || item.metric_status || "ACTIVE",
      definition_version: Number(canonical?.definition_version || item.definition_version || 1),
    };
  });
  const existingIds = new Set(normalizedDefinitions.map((item) => item.metric_definition_id));
  return [
    ...normalizedDefinitions,
    ...fallback.filter((item) => !existingIds.has(item.metric_definition_id)),
  ];
}

function calculateObservations(metricDefinition, context, nextSequence) {
  const calculators = {
    "OUTCOME-FIN-001": () => sumRevenue(context.revenueRecords, "RECEIVABLE_REVENUE"),
    "OUTCOME-FIN-002": () => sumRevenue(context.revenueRecords, "COLLECTED_REVENUE"),
    "OUTCOME-FIN-003": () => sumRevenue(context.revenueRecords, "UNRECEIVED_REVENUE"),
    "OUTCOME-FIN-004": () => sumCost(context.costRecords),
    "OUTCOME-FIN-005": () => roundMoney(sumRevenue(context.revenueRecords, "COLLECTED_REVENUE") - sumVariableOperatingCost(context.costRecords)),
    "OUTCOME-FIN-006": () => ratio(sumRevenue(context.revenueRecords, "COLLECTED_REVENUE") - sumVariableOperatingCost(context.costRecords), sumRevenue(context.revenueRecords, "COLLECTED_REVENUE")),
    "OUTCOME-FIN-007": () => sumVariableOperatingCost(context.costRecords),
    "OUTCOME-FIN-008": () => sumCostByTypes(context.costRecords, ["ASSET_DEPRECIATION_COST"]),
    "OUTCOME-FIN-009": () => sumCostByTypes(context.costRecords, ["FIXED_OPERATING_COST"]),
    "OUTCOME-FIN-010": () => roundMoney(sumRevenue(context.revenueRecords, "COLLECTED_REVENUE") - sumCost(context.costRecords)),
    "OUTCOME-FIN-011": () => ratio(sumRevenue(context.revenueRecords, "COLLECTED_REVENUE") - sumCost(context.costRecords), sumRevenue(context.revenueRecords, "COLLECTED_REVENUE")),
    "OUTCOME-SERVICE-001": () => serviceOrders(context).length,
    "OUTCOME-SERVICE-002": () => completedOrders(context).length,
    "OUTCOME-SERVICE-003": () => ratio(completedOrders(context).length, terminalOrders(context).length),
    "OUTCOME-SERVICE-004": () => ratio(cancelledOrders(context).length, terminalOrders(context).length),
    "OUTCOME-SERVICE-005": () => failedOrders(context).length,
    "STATE-SERVICE-001": () => inProgressOrders(context).length,
    "STATE-SERVICE-002": () => inProgressTrips(context).length,
    "OUTCOME-EFF-001": () => ratio(sumRevenue(context.revenueRecords, "COLLECTED_REVENUE"), completedOrders(context).length),
    "OUTCOME-EFF-002": () => ratio(sumVariableOperatingCost(context.costRecords), completedOrders(context).length),
    "OUTCOME-EFF-003": () => ratio(sumRevenue(context.revenueRecords, "COLLECTED_REVENUE") - sumVariableOperatingCost(context.costRecords), completedOrders(context).length),
    "DEMAND-TREND-001": () => [...createHourlyOrderTrend(context), ...createTimeSegmentOrderTrend(context)],
    "PROCESS-ASSET-001": () => calculateRobotaxiAssetUtilization(context),
    "PROCESS-ASSET-002": () => unavailableMetric("缺少 Robotaxi 连续可运营状态区间、接驾区间和载客履约区间，暂不计算订单服务时间利用率"),
    "PROCESS-ASSET-003": () => calculateEmptyDistanceShare(context),
    "PROCESS-ASSET-004": () => ratio(completedOrders(context).length, effectiveRobotaxis(context).length),
    "STATE-ASSET-001": () => effectiveRobotaxis(context).length,
    "STATE-ASSET-002": () => operableRobotaxis(context).length,
    "STATE-ASSET-003": () => maintenanceRobotaxis(context).length,
    "PROCESS-MATCH-001": () => calculateFinalAssignmentRate(context),
    "PROCESS-ROUTE-001": () => ratio(successfulRoutePlanningRuns(context).length, endedRoutePlanningRuns(context).length),
    "PROCESS-TRIP-001": () => ratio(completedTrips(context).length, terminalTrips(context).length),
    "PROCESS-EFF-001": () => averageCompletedOrderDistance(completedOrders(context)),
    "PROCESS-EFF-002": () => averageCompletedOrderDurationMinutes(completedOrders(context)),
    "PROCESS-SUPPLY-001": () => calculateProductionPlanAttainment(context),
    "PROCESS-SUPPLY-002": () => calculateDeliveryAttainment(context),
    "PROCESS-SUPPLY-003": () => calculateReadinessPassRate(context),
    "QUALITY-DATA-001": () => calculateCriticalDataCompleteness(context),
    "PROCESS-DECISION-001": () => decisionProcesses(context).length,
    "PROCESS-DECISION-002": () => decisionExecutionSuccessRate(context),
    "PROCESS-DECISION-003": () => decisionResultCoverageRate(context),
    "PROCESS-DECISION-004": () => decisionExceptionRate(context),
    "PROCESS-DECISION-005": () => averageDecisionDuration(context),
  };
  const rawValue = calculators[metricDefinition.metric_definition_id]?.();
  const values = Array.isArray(rawValue) ? rawValue : [rawValue];
  return values.map((value) => calculateObservation(metricDefinition, context, nextSequence(), value));
}

function calculateObservation(metricDefinition, context, sequence, rawValue) {
  const quality = evaluateQuality(metricDefinition, context, rawValue);
  return {
    metric_observation_id: `${context.calculationRunId}-MO-${String(sequence).padStart(5, "0")}`,
    metric_calculation_run_id: context.calculationRunId,
    metric_definition_id: metricDefinition.metric_definition_id,
    metric_scope_type: context.metricScopeType,
    metric_period_type: context.metricPeriodType,
    metric_period_label: context.metricPeriodLabel,
    simulation_run_id: context.simulationRun?.simulation_run_id || null,
    simulation_run_ids: context.simulationRunIds,
    simulation_timeline_id: context.simulationTimelineId,
    window_type: rawValue?.windowType || (context.metricScopeType === MetricScopeType.OPERATING_PERIOD ? "OPERATING_PERIOD" : "SIMULATION_RUN"),
    window_start_seconds: Number(rawValue?.windowStartSeconds ?? context.simulationRun.start_simulation_seconds ?? 0),
    window_end_seconds: Number(rawValue?.windowEndSeconds ?? context.simulationRun.end_simulation_seconds ?? context.simulationRun.current_simulation_seconds ?? 0),
    window_label: rawValue?.windowLabel || context.metricPeriodLabel || `${context.simulationRun.start_time || context.simulationRun.current_time || "Simulation Run"} - ${context.simulationRun.completed_time || context.simulationRun.current_time || "Simulation Run"}`,
    dimension_type: rawValue?.dimensionType || "GLOBAL",
    dimension_id: rawValue?.dimensionId || "GLOBAL",
    metric_value: normalizeMetricValue(rawValue, metricDefinition.display_unit),
    metric_unit: metricDefinition.display_unit,
    numerator_value: quality.numeratorValue,
    denominator_value: quality.denominatorValue,
    quality_status: quality.qualityStatus,
    quality_reason: quality.qualityReason,
    source_record_count: rawValue?.sourceRecordCount ?? sourceRecordCount(metricDefinition, context),
    source_object_refs: rawValue?.sourceObjectRefs ?? sourceObjectRefs(metricDefinition, context),
    as_of_at: metricDefinition.measurement_type === MetricMeasurementType.SNAPSHOT
      ? rawValue?.asOfAt || context.metricPeriodLabel
      : null,
    created_at: context.createdAt,
  };
}

function evaluateQuality(metricDefinition, context, value) {
  if (value?.unavailableReason) {
    return {
      qualityStatus: MetricQualityStatus.WARN,
      qualityReason: value.unavailableReason,
      numeratorValue: null,
      denominatorValue: null,
    };
  }
  if (metricDefinition.source_objects.includes("RevenueRecord") && context.revenueRecords.length === 0) {
    return {
      qualityStatus: MetricQualityStatus.WARN,
      qualityReason: "当前统计周期缺少收入记录，财务指标可能不完整",
      numeratorValue: value?.numerator ?? null,
      denominatorValue: value?.denominator ?? null,
    };
  }
  if (metricDefinition.source_objects.includes("CostRecord") && context.costRecords.length === 0) {
    return {
      qualityStatus: MetricQualityStatus.WARN,
      qualityReason: "当前统计周期缺少成本记录，成本或利润指标可能不完整",
      numeratorValue: value?.numerator ?? null,
      denominatorValue: value?.denominator ?? null,
    };
  }
  if ([MetricMeasurementType.RATE, MetricMeasurementType.AVERAGE].includes(metricDefinition.measurement_type) && value?.denominator === 0) {
    const expectedFactsMissing = ["PROCESS-EFF-001", "PROCESS-EFF-002"].includes(metricDefinition.metric_definition_id) && completedOrders(context).length > 0;
    return {
      qualityStatus: expectedFactsMissing ? MetricQualityStatus.WARN : MetricQualityStatus.PASS,
      qualityReason: expectedFactsMissing ? "已完成订单缺少计算该均值所需的有效字段" : "当前统计周期尚未形成适用的终态事实，指标值为空",
      numeratorValue: value.numerator,
      denominatorValue: value.denominator,
    };
  }
  if (metricDefinition.metric_definition_id === "QUALITY-DATA-001") {
    return {
      qualityStatus: Number(value?.value ?? 0) >= 0.8 ? MetricQualityStatus.PASS : MetricQualityStatus.WARN,
      qualityReason: value?.reason || "关键数据完整率已计算",
      numeratorValue: value?.numerator ?? null,
      denominatorValue: value?.denominator ?? null,
    };
  }
  if (["PROCESS-EFF-001", "PROCESS-EFF-002"].includes(metricDefinition.metric_definition_id)) {
    const completedCount = completedOrders(context).length;
    const validCount = Number(value?.denominator || 0);
    if (completedCount > validCount) {
      return {
        qualityStatus: MetricQualityStatus.WARN,
        qualityReason: `${completedCount - validCount} 条完成订单缺少有效${metricDefinition.metric_definition_id.endsWith("001") ? "履约距离" : "履约耗时"}，均值仅使用完整记录`,
        numeratorValue: value?.numerator ?? null,
        denominatorValue: value?.denominator ?? null,
      };
    }
  }
  return {
    qualityStatus: MetricQualityStatus.PASS,
    qualityReason: "指标计算完成",
    numeratorValue: value?.numerator ?? null,
    denominatorValue: value?.denominator ?? null,
  };
}

function definition(metricDefinitionId, metricNameCn, metricNameEn, domain, formula, sourceObjects, sourceFields, displayUnit, higherIsBetter, layer = MetricLayer.OUTCOME, supportedDimensions = ["GLOBAL"], details = {}) {
  return {
    metric_definition_id: metricDefinitionId,
    metric_name_cn: metricNameCn,
    metric_name_en: metricNameEn,
    metric_layer: layer,
    metric_domain: domain,
    business_definition: details.business_definition || metricNameCn,
    management_question: details.management_question || details.business_definition || metricNameCn,
    metric_role: details.metric_role || (layer === MetricLayer.QUALITY ? MetricRole.GUARDRAIL : MetricRole.RESULT),
    measurement_type: details.measurement_type || (displayUnit === MetricUnit.PERCENT ? MetricMeasurementType.RATE : MetricMeasurementType.FLOW),
    calculation_formula: formula,
    source_objects: sourceObjects,
    source_fields: sourceFields,
    time_basis: details.time_basis || "SIMULATION_TIME",
    default_time_window: details.default_time_window || "OPERATING_PERIOD",
    supported_dimensions: supportedDimensions,
    zero_denominator_rule: "NULL_WITH_REASON",
    fact_filter: details.fact_filter || "统计周期内符合指标定义的业务事实",
    denominator_definition: details.denominator_definition || null,
    data_readiness: details.data_readiness || "READY",
    display_unit: displayUnit,
    higher_is_better: higherIsBetter,
    metric_status: details.metric_status || "ACTIVE",
    definition_version: 2,
  };
}

function semantics(businessDefinition, metricRole, measurementType, factFilter, denominatorDefinition = null) {
  return {
    business_definition: businessDefinition,
    management_question: businessDefinition,
    metric_role: metricRole,
    measurement_type: measurementType,
    fact_filter: factFilter,
    denominator_definition: denominatorDefinition,
  };
}

function sumRevenue(records, revenueType) {
  return roundMoney(records
    .filter((record) => record.revenue_type === revenueType)
    .reduce((sum, record) => sum + Number(record.revenue_amount || 0), 0));
}

function sumCost(records) {
  return roundMoney(records.reduce((sum, record) => sum + Number(record.cost_amount || 0), 0));
}

function sumCostByTypes(records, types) {
  const typeSet = new Set(types);
  return roundMoney(records.filter((record) => typeSet.has(record.cost_type)).reduce((sum, record) => sum + Number(record.cost_amount || 0), 0));
}

function sumVariableOperatingCost(records) {
  return sumCostByTypes(records, ["DISTANCE_COST", "ENERGY_COST", "LABOR_COST"]);
}

function unavailableMetric(reason) {
  return { value: null, unavailableReason: reason };
}

function ratio(numerator, denominator) {
  const normalizedNumerator = Number(numerator || 0);
  const normalizedDenominator = Number(denominator || 0);
  return {
    value: normalizedDenominator > 0 ? normalizedNumerator / normalizedDenominator : null,
    numerator: normalizedNumerator,
    denominator: normalizedDenominator,
  };
}

function serviceOrders(context) {
  return context.scope?.serviceOrders || [];
}

function completedOrders(context) {
  return serviceOrders(context).filter((order) => order.order_status === "COMPLETED");
}

function cancelledOrders(context) {
  return serviceOrders(context).filter((order) => order.order_status === "CANCELLED");
}

const TERMINAL_ORDER_STATUSES = new Set(["COMPLETED", "CANCELLED", "FAILED", "MATCH_FAILED", "MATCHING_FAILED", "ROBOTAXI_ASSIGNMENT_FAILED"]);
const FAILED_ORDER_STATUSES = new Set(["FAILED", "MATCH_FAILED", "MATCHING_FAILED", "ROBOTAXI_ASSIGNMENT_FAILED"]);

function terminalOrders(context) {
  return serviceOrders(context).filter((order) => TERMINAL_ORDER_STATUSES.has(order.order_status));
}

function failedOrders(context) {
  return serviceOrders(context).filter((order) => FAILED_ORDER_STATUSES.has(order.order_status));
}

function inProgressOrders(context) {
  return serviceOrders(context).filter((order) => !TERMINAL_ORDER_STATUSES.has(order.order_status));
}

function assignedOrders(context) {
  const assignedOrderIds = new Set((context.scope?.orderMatchingDecisions || [])
    .filter((decision) => Boolean(decision.selected_robotaxi_id))
    .map((decision) => decision.service_order_id)
    .filter(Boolean));
  return serviceOrders(context).filter((order) => Boolean(order.matched_robotaxi_id || order.robotaxi_id || order.trip_id || assignedOrderIds.has(order.service_order_id)));
}

function routePlanningRuns(context) {
  return context.scope?.routePlanningRuns || [];
}

function successfulRoutePlanningRuns(context) {
  return routePlanningRuns(context).filter((run) => run.planning_result === "SUCCESS" || Boolean(run.result_route_id));
}

function endedRoutePlanningRuns(context) {
  return routePlanningRuns(context).filter((run) => Boolean(run.planning_result || run.result_route_id || run.failure_reason));
}

function trips(context) {
  return context.scope?.trips || [];
}

const TERMINAL_TRIP_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

function terminalTrips(context) {
  return trips(context).filter((trip) => TERMINAL_TRIP_STATUSES.has(trip.trip_status));
}

function inProgressTrips(context) {
  return trips(context).filter((trip) => !TERMINAL_TRIP_STATUSES.has(trip.trip_status));
}

function decisionRuns(context) {
  return [
    "longTermDemandForecastRuns", "fleetAllocationRuns", "supplyDemandBalanceRuns", "routePlanningRuns",
    "pricingStrategyRuns", "orderMatchingRuns", "fleetOperationPolicyRuns", "fleetOperationDispatchRuns",
    "robotaxiTaskPlanningRuns", "demandSimulationRuns",
  ].flatMap((key) => context.scope?.[key] || []);
}

function decisionProcesses(context) {
  return context.scope?.decisionProcesses || [];
}

function normalizeDecisionRunStatus(run = {}) {
  const value = String(run.forecast_run_status || run.planning_result || run.simulation_result || run.execution_status || run.run_status || run.run_result || run.calculation_status || run.result_type || "").toUpperCase();
  if (["SUCCESS", "SUCCEEDED", "COMPLETED", "GENERATED", "DISPATCHED", "SELECTED"].includes(value)) return "SUCCESS";
  if (["PARTIAL_SUCCESS", "PARTIALLY_SUCCEEDED", "WARN"].includes(value)) return "PARTIAL";
  if (["FAILED", "REJECTED", "ERROR", "NO_CAPACITY", "NO_MATCHING_CAPABILITY"].includes(value) || run.failure_reason) return "FAILED";
  if (["NO_ACTION", "NO_CANDIDATE", "SKIPPED", "NO_ELIGIBLE_CENTER"].includes(value)) return "NO_ACTION";
  return "UNKNOWN";
}

function decisionExecutionSuccessRate(context) {
  const processes = decisionProcesses(context);
  if (processes.length) {
    const ended = processes.filter((item) => ["SUCCESS", "PARTIAL", "FAILED", "NO_ACTION"].includes(String(item.final_decision_status || "").toUpperCase()));
    const successful = ended.filter((item) => String(item.final_decision_status || "").toUpperCase() === "SUCCESS");
    return ratio(successful.length, ended.length);
  }
  const ended = decisionRuns(context).filter((run) => ["SUCCESS", "PARTIAL", "FAILED", "NO_ACTION"].includes(normalizeDecisionRunStatus(run)));
  return ratio(ended.filter((run) => normalizeDecisionRunStatus(run) === "SUCCESS").length, ended.length);
}

function decisionResultCoverageRate(context) {
  const processes = decisionProcesses(context);
  if (processes.length) return ratio(processes.filter((item) => Boolean(item.result_summary) || String(item.final_decision_status || "").toUpperCase() === "SUCCESS").length, processes.length);
  const runs = decisionRuns(context);
  const resultRunIds = new Set([
    ...(context.scope?.longTermDemandForecasts || []), ...(context.scope?.fleetAllocationResults || []),
    ...(context.scope?.supplyDemandBalanceResults || []), ...(context.scope?.routes || []),
    ...(context.scope?.pricingDecisions || []), ...(context.scope?.orderMatchingDecisions || []),
    ...(context.scope?.fleetOperationPolicyResults || []), ...(context.scope?.fleetOperationDispatchDecisions || []),
    ...(context.scope?.robotaxiTaskPlanningResults || []), ...(context.scope?.demandSimulationResults || []),
  ].flatMap((result) => Object.entries(result).filter(([key, value]) => key.endsWith("_run_id") && value).map(([, value]) => value)));
  const covered = runs.filter((run) => {
    const runId = Object.entries(run).find(([key, value]) => key.endsWith("_run_id") && value)?.[1];
    return runId && resultRunIds.has(runId);
  });
  return ratio(covered.length, runs.length);
}

function decisionExceptionRate(context) {
  const processes = decisionProcesses(context);
  if (processes.length) {
    const ended = processes.filter((item) => ["SUCCESS", "PARTIAL", "FAILED", "NO_ACTION"].includes(String(item.final_decision_status || "").toUpperCase()));
    const impacted = ended.filter((item) => ["BUSINESS_FAILED", "BUSINESS_CANCELLED", "SYSTEM_EXCEPTION"].includes(String(item.business_impact_status || item.exception_category || "").toUpperCase()));
    return ratio(impacted.length, ended.length);
  }
  const ended = decisionRuns(context).filter((run) => ["SUCCESS", "PARTIAL", "FAILED", "NO_ACTION"].includes(normalizeDecisionRunStatus(run)));
  const exceptions = ended.filter((run) => ["PARTIAL", "FAILED"].includes(normalizeDecisionRunStatus(run)));
  return ratio(exceptions.length, ended.length);
}

function averageDecisionDuration(context) {
  const processes = decisionProcesses(context);
  if (processes.length) {
    const durations = processes.map((item) => {
      const direct = Number(item.duration_seconds);
      if (Number.isFinite(direct) && direct >= 0) return direct;
      const start = Date.parse(item.first_attempt_at || "");
      const end = Date.parse(item.latest_attempt_at || "");
      return Number.isFinite(start) && Number.isFinite(end) && end >= start ? (end - start) / 1000 : NaN;
    }).filter((value) => Number.isFinite(value) && value >= 0);
    return ratio(durations.reduce((sum, value) => sum + value, 0), durations.length);
  }
  const durations = decisionRuns(context).map((run) => {
    const start = Date.parse(run.started_at || run.created_at || "");
    const end = Date.parse(run.completed_at || run.updated_at || "");
    return Number.isFinite(start) && Number.isFinite(end) && end >= start ? (end - start) / 1000 : NaN;
  }).filter(Number.isFinite);
  return ratio(durations.reduce((sum, value) => sum + value, 0), durations.length);
}

function completedTrips(context) {
  return trips(context).filter((trip) => trip.trip_status === "COMPLETED");
}

function robotaxis(context) {
  return context.scope?.robotaxis || [];
}

function effectiveRobotaxis(context) {
  return robotaxis(context).filter((item) => !["PENDING_ADMISSION", "PENDING_DELIVERY", "RETIRED"].includes(item.availability_status || item.operational_status));
}

function operableRobotaxis(context) {
  return robotaxis(context).filter((item) => ["AVAILABLE", "OPERABLE"].includes(item.availability_status || item.operational_status));
}

function maintenanceRobotaxis(context) {
  return robotaxis(context).filter((item) => ["IN_MAINTENANCE", "MAINTENANCE", "OPERATIONS_IN_PROGRESS"].includes(item.availability_status || item.operational_status));
}

function sumTripDistance(records = []) {
  return Number(records.reduce((sum, trip) => sum + Number(trip.total_distance_km || trip.trip_total_distance_km || 0), 0).toFixed(2));
}

function sumTripDurationSeconds(records = []) {
  return Number(records.reduce((sum, trip) => sum + normalizeDurationSeconds(trip.time_elapsed ?? trip.trip_total_duration_min ?? trip.estimated_duration_min), 0).toFixed(2));
}

function averageCompletedOrderDistance(records = []) {
  const values = records.map((order) => firstFiniteNumber(order.fulfillment_distance_km, order.trip_total_distance_km, order.trip_distance_traveled_km)).filter(Number.isFinite);
  return ratio(values.reduce((sum, value) => sum + value, 0), values.length);
}

function averageCompletedOrderDurationMinutes(records = []) {
  const values = records.map((order) => firstFiniteNumber(order.fulfillment_duration_min, order.trip_total_duration_min)).filter(Number.isFinite);
  return ratio(values.reduce((sum, value) => sum + value, 0), values.length);
}

function firstFiniteNumber(...values) {
  const value = values.find((item) => item !== null && item !== undefined && item !== "" && Number.isFinite(Number(item)));
  return value === undefined ? NaN : Number(value);
}

function calculateRobotaxiAssetUtilization(context) {
  const effective = effectiveRobotaxis(context);
  const servedRobotaxiIds = new Set(completedOrders(context)
    .map((order) => order.robotaxi_id || order.matched_robotaxi_id || order.assigned_robotaxi_id)
    .filter(Boolean));
  return ratio(servedRobotaxiIds.size, effective.length);
}

function calculateEmptyDistanceShare(context) {
  const operationalDistance = sumRouteDistance(context.scope?.routeExecutions || []);
  const fulfillmentDistance = sumTripDistance(trips(context));
  return ratio(operationalDistance, operationalDistance + fulfillmentDistance);
}

function sumRouteDistance(records = []) {
  return Number(records.reduce((sum, item) => sum + Number(item.total_distance_km || item.distance_traveled_km || item.route_distance_km || 0), 0).toFixed(2));
}

function calculateFinalAssignmentRate(context) {
  const ended = serviceOrders(context).filter((order) => (
    assignedOrders(context).includes(order)
    || ["CANCELLED", "FAILED", "MATCH_FAILED", "MATCHING_FAILED", "ROBOTAXI_ASSIGNMENT_FAILED"].includes(order.order_status)
  ));
  const endedIds = new Set(ended.map((order) => order.service_order_id));
  const assigned = assignedOrders(context).filter((order) => endedIds.has(order.service_order_id));
  return ratio(assigned.length, ended.length);
}

function calculateProductionPlanAttainment(context) {
  const plans = (context.scope?.supplyPlans || []).filter((item) => !["CANCELLED", "REJECTED"].includes(item.plan_status));
  const batches = (context.scope?.productionBatches || []).filter((item) => item.batch_status === "COMPLETED");
  const planned = plans.reduce((sum, item) => sum + Number(item.planned_robotaxi_count || item.planned_quantity || 0), 0);
  const produced = batches.reduce((sum, item) => sum + Number(item.produced_robotaxi_count || item.actual_production_quantity || item.production_quantity || 0), 0);
  return ratio(produced, planned);
}

function calculateDeliveryAttainment(context) {
  const orders = context.scope?.robotaxiDeliveryOrders || [];
  const terminal = orders.filter((item) => ["COMPLETED", "DELIVERED", "FAILED", "CANCELLED"].includes(item.delivery_status || item.order_status));
  const total = terminal.reduce((sum, item) => sum + normalizeIdList(item.robotaxi_ids || item.robotaxi_id_list).length, 0);
  const delivered = terminal.filter((item) => ["COMPLETED", "DELIVERED"].includes(item.delivery_status || item.order_status))
    .reduce((sum, item) => sum + normalizeIdList(item.robotaxi_ids || item.robotaxi_id_list).length, 0);
  return ratio(delivered, total);
}

function calculateReadinessPassRate(context) {
  const tasks = context.scope?.readinessTasks || [];
  const terminal = tasks.filter((item) => ["COMPLETED", "FAILED", "CANCELLED", "ADMISSION_FAILED"].includes(item.task_status));
  const passed = terminal.filter((item) => item.task_status === "COMPLETED" && !["FAILED", "REJECTED"].includes(item.admission_result || item.inspection_result)).length;
  return ratio(passed, terminal.length);
}

function normalizeIdList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return String(value).split(/[,，]/).map((item) => item.trim()).filter(Boolean);
}

function createHourlyOrderTrend(context) {
  const orders = serviceOrders(context);
  const periodStart = Number(context.simulationRun.start_simulation_seconds || 0);
  const periodEnd = Number(context.simulationRun.end_simulation_seconds ?? context.simulationRun.current_simulation_seconds ?? periodStart);
  const buckets = new Map();
  const startHour = Math.floor(periodStart / 3600) * 3600;
  const endHour = Math.max(startHour, Math.floor(Math.max(periodEnd - 1, periodStart) / 3600) * 3600);
  for (let hourStart = startHour; hourStart <= endHour; hourStart += 3600) {
    buckets.set(String(hourStart), []);
  }
  orders.forEach((order) => {
    const seconds = resolveOrderSimulationSeconds(order);
    if (!Number.isFinite(seconds)) return;
    const hourStart = Math.floor(seconds / 3600) * 3600;
    const key = String(hourStart);
    buckets.set(key, [...(buckets.get(key) || []), order]);
  });
  return [...buckets.entries()]
    .sort((left, right) => Number(left[0]) - Number(right[0]))
    .map(([hourStart, bucketOrders]) => {
      const startSeconds = Number(hourStart);
      const endSeconds = startSeconds + 3600;
      return {
        value: bucketOrders.length,
        numerator: bucketOrders.length,
        denominator: 1,
        dimensionType: "SIMULATION_HOUR",
        dimensionId: `HOUR-${String(Math.floor(startSeconds / 3600)).padStart(3, "0")}`,
        windowType: "HOUR",
        windowStartSeconds: startSeconds,
        windowEndSeconds: endSeconds,
        windowLabel: `${formatMetricPeriodTime(startSeconds)} - ${formatMetricPeriodTime(endSeconds)}`,
        sourceRecordCount: bucketOrders.length,
        sourceObjectRefs: bucketOrders.slice(0, 20).map((order) => ({ object_type: "serviceOrder", object_id: order.service_order_id })),
      };
    });
}

function createTimeSegmentOrderTrend(context) {
  const segments = [
    { id: "PEAK", label: "高峰", match: (hour) => (hour >= 7 && hour < 10) || (hour >= 17 && hour < 20) },
    { id: "NORMAL", label: "平峰", match: (hour) => hour >= 10 && hour < 17 },
    { id: "OFF_PEAK", label: "低峰", match: (hour) => hour < 7 || hour >= 20 },
  ];
  const grouped = new Map(segments.map((segment) => [segment.id, []]));
  serviceOrders(context).forEach((order) => {
    const seconds = resolveOrderSimulationSeconds(order);
    if (!Number.isFinite(seconds)) return;
    const secondsInDay = ((seconds % 86400) + 86400) % 86400;
    const hour = Math.floor(secondsInDay / 3600);
    const segment = segments.find((item) => item.match(hour)) || segments[1];
    grouped.set(segment.id, [...(grouped.get(segment.id) || []), order]);
  });
  return segments.map((segment) => {
    const bucketOrders = grouped.get(segment.id) || [];
    return {
      value: bucketOrders.length,
      numerator: bucketOrders.length,
      denominator: 1,
      dimensionType: "DEMAND_TIME_SEGMENT",
      dimensionId: segment.id,
      windowType: "OPERATING_PERIOD",
      windowStartSeconds: Number(context.simulationRun.start_simulation_seconds || 0),
      windowEndSeconds: Number(context.simulationRun.end_simulation_seconds ?? context.simulationRun.current_simulation_seconds ?? 0),
      windowLabel: segment.label,
      sourceRecordCount: bucketOrders.length,
      sourceObjectRefs: bucketOrders.slice(0, 20).map((order) => ({ object_type: "serviceOrder", object_id: order.service_order_id })),
    };
  });
}

function resolveOrderSimulationSeconds(order = {}) {
  const numericSeconds = Number(order.simulation_created_seconds ?? order.created_simulation_seconds ?? order.order_created_seconds);
  if (Number.isFinite(numericSeconds)) return numericSeconds;
  return parseSimulationTimeSeconds(order.simulation_created_at || order.created_at || order.order_created_at);
}

function parseSimulationTimeSeconds(value) {
  if (!value) return NaN;
  if (typeof value === "number") return value;
  const text = String(value).trim();
  const match = text.match(/Day\s*(\d+)\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/i);
  if (!match) return NaN;
  const day = Math.max(1, Number(match[1] || 1));
  const hour = Number(match[2] || 0);
  const minute = Number(match[3] || 0);
  const second = Number(match[4] || 0);
  return (day - 1) * 86400 + hour * 3600 + minute * 60 + second;
}

function normalizeDurationSeconds(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "string") {
    const text = value.trim();
    const hourMinuteSecond = text.match(/^(\d+):(\d+):(\d+)$/);
    if (hourMinuteSecond) {
      return Number(hourMinuteSecond[1]) * 3600 + Number(hourMinuteSecond[2]) * 60 + Number(hourMinuteSecond[3]);
    }
    const minuteMatch = text.match(/^([\d.]+)\s*min/);
    if (minuteMatch) return Number(minuteMatch[1]) * 60;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function calculateCriticalDataCompleteness(context) {
  const orders = serviceOrders(context);
  const completed = completedOrders(context);
  const checks = [
    Boolean(context.simulationRun.simulation_run_id || context.simulationRunIds?.length || context.metricPeriodType === MetricPeriodType.ALL),
    ["SUCCEEDED", "PARTIALLY_SUCCEEDED"].includes(context.simulationRun.cost_calculation_status) || context.costRecords.length > 0,
    ["SUCCEEDED", "PARTIALLY_SUCCEEDED"].includes(context.simulationRun.revenue_calculation_status) || context.revenueRecords.length > 0,
    orders.length === 0 || orders.every((order) => Number.isFinite(resolveOrderSimulationSeconds(order))),
    completed.length === 0 || completed.every((order) => Number.isFinite(firstFiniteNumber(order.fulfillment_distance_km, order.trip_total_distance_km, order.trip_distance_traveled_km))),
    completed.length === 0 || completed.every((order) => Number.isFinite(firstFiniteNumber(order.fulfillment_duration_min, order.trip_total_duration_min))),
  ];
  const passed = checks.filter(Boolean).length;
  return {
    value: checks.length ? passed / checks.length : null,
    numerator: passed,
    denominator: checks.length,
    reason: `${passed}/${checks.length} 项关键数据检查通过`,
  };
}

function normalizeMetricValue(value, unit) {
  if (value && typeof value === "object" && "value" in value) return normalizeMetricValue(value.value, unit);
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  if (unit === MetricUnit.CURRENCY) return roundMoney(value);
  if (unit === MetricUnit.PERCENT) return Number(Number(value).toFixed(4));
  return Number(Number(value).toFixed(2));
}

function sourceRecordCount(metricDefinition, context) {
  return (metricDefinition.source_objects || []).reduce((count, objectType) => {
    if (objectType === "RevenueRecord") return count + context.revenueRecords.length;
    if (objectType === "CostRecord") return count + context.costRecords.length;
    if (objectType === "Robotaxi") return count + robotaxis(context).length;
    if (objectType === "ServiceOrder") return count + serviceOrders(context).length;
    if (objectType === "OrderMatchingDecision") return count + (context.scope?.orderMatchingDecisions?.length || 0);
    if (objectType === "RoutePlanningRun") return count + routePlanningRuns(context).length;
    if (objectType === "Trip") return count + trips(context).length;
    if (objectType === "ReadinessTask") return count + (context.scope?.readinessTasks?.length || 0);
    if (objectType === "DeploymentTask") return count + (context.scope?.deploymentTasks?.length || 0);
    if (objectType === "RouteExecution") return count + (context.scope?.routeExecutions?.length || 0);
    if (objectType === "StrategyRun") return count + decisionRuns(context).length;
    if (objectType === "DecisionProcess") return count + decisionProcesses(context).length;
    if (objectType === "SupplyPlan") return count + (context.scope?.supplyPlans?.length || 0);
    if (objectType === "ProductionBatch") return count + (context.scope?.productionBatches?.length || 0);
    if (objectType === "RobotaxiDeliveryOrder") return count + (context.scope?.robotaxiDeliveryOrders?.length || 0);
    if (objectType === "StrategyResult") return count + [
      "longTermDemandForecasts", "fleetAllocationResults", "supplyDemandBalanceResults", "routes",
      "pricingDecisions", "orderMatchingDecisions", "fleetOperationPolicyResults",
      "fleetOperationDispatchDecisions", "robotaxiTaskPlanningResults", "demandSimulationResults",
    ].reduce((total, key) => total + (context.scope?.[key]?.length || 0), 0);
    return count;
  }, 0);
}

function sourceObjectRefs(metricDefinition, context) {
  const refs = [];
  if ((metricDefinition.source_objects || []).includes("RevenueRecord")) {
    refs.push(...context.revenueRecords.slice(0, 20).map((record) => ({ object_type: "revenueRecord", object_id: record.revenue_record_id })));
  }
  if ((metricDefinition.source_objects || []).includes("CostRecord")) {
    refs.push(...context.costRecords.slice(0, 20).map((record) => ({ object_type: "costRecord", object_id: record.cost_record_id })));
  }
  if ((metricDefinition.source_objects || []).includes("DecisionProcess")) {
    refs.push(...decisionProcesses(context).slice(0, 20).map((record) => ({ object_type: "decisionProcess", object_id: record.decision_process_id || record.process_id })));
  }
  if ((metricDefinition.source_objects || []).includes("ServiceOrder")) {
    refs.push(...serviceOrders(context).slice(0, 20).map((order) => ({ object_type: "serviceOrder", object_id: order.service_order_id })));
  }
  if ((metricDefinition.source_objects || []).includes("Robotaxi")) {
    refs.push(...robotaxis(context).slice(0, 20).map((robotaxi) => ({ object_type: "robotaxi", object_id: robotaxi.robotaxi_id })));
  }
  if ((metricDefinition.source_objects || []).includes("OrderMatchingDecision")) {
    refs.push(...(context.scope?.orderMatchingDecisions || []).slice(0, 20).map((decision) => ({ object_type: "orderMatchingDecision", object_id: decision.order_matching_decision_id })));
  }
  if ((metricDefinition.source_objects || []).includes("RoutePlanningRun")) {
    refs.push(...routePlanningRuns(context).slice(0, 20).map((run) => ({ object_type: "routePlanningRun", object_id: run.route_planning_run_id })));
  }
  if ((metricDefinition.source_objects || []).includes("Trip")) {
    refs.push(...trips(context).slice(0, 20).map((trip) => ({ object_type: "trip", object_id: trip.trip_id })));
  }
  if ((metricDefinition.source_objects || []).includes("ReadinessTask")) {
    refs.push(...(context.scope?.readinessTasks || []).slice(0, 20).map((task) => ({ object_type: "readinessTask", object_id: task.task_id })));
  }
  if ((metricDefinition.source_objects || []).includes("DeploymentTask")) {
    refs.push(...(context.scope?.deploymentTasks || []).slice(0, 20).map((task) => ({ object_type: "deploymentTask", object_id: task.task_id })));
  }
  if ((metricDefinition.source_objects || []).includes("RouteExecution")) {
    refs.push(...(context.scope?.routeExecutions || []).slice(0, 20).map((execution) => ({ object_type: "routeExecution", object_id: execution.route_execution_id })));
  }
  if ((metricDefinition.source_objects || []).includes("StrategyRun")) {
    refs.push(...decisionRuns(context).slice(0, 20).map((run) => ({
      object_type: "strategyRun",
      object_id: Object.entries(run).find(([key, value]) => key.endsWith("_run_id") && value)?.[1] || "无编号",
    })));
  }
  return refs;
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}
