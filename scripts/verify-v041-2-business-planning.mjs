import assert from "node:assert/strict";
import fs from "node:fs";
import {
  completeDeliveryOrder,
  completeProductionBatch,
  completeSupplyManagementLoopFromForecast,
  confirmSupplyPlan,
  createDeliveryOrderFromAllocationResult,
  createProductionBatchFromSupplyPlan,
  createSupplyPlanFromForecast,
  executeFleetAllocationStrategy,
  executeLongTermDemandForecastStrategy,
  initializeDefaultBusinessTargets,
  initializeDefaultFleetAllocationStrategies,
  initializeDefaultLongTermDemandForecastStrategies,
  initializeDefaultSupplyProductionProfiles,
  passProductionQualityInspection,
  startDeliveryOrder,
  startProductionBatch,
  startProductionQualityInspection,
  updateBusinessTargetConfig,
  updateSupplyProductionProfileConfig,
} from "../src/services/businessPlanningService.js";

const businessTargets = initializeDefaultBusinessTargets("2026-07-09T00:00:00.000Z");
const supplyProfiles = initializeDefaultSupplyProductionProfiles("2026-07-09T00:00:00.000Z");
const strategies = initializeDefaultLongTermDemandForecastStrategies("2026-07-09T00:00:00.000Z");
const allocationStrategies = initializeDefaultFleetAllocationStrategies("2026-07-09T00:00:00.000Z");

assert.equal(businessTargets.length, 1, "必须初始化默认经营目标");
assert.equal(businessTargets[0].target_status, "ACTIVE", "经营目标默认必须可用");
const targetUpdate = updateBusinessTargetConfig({
  businessTarget: businessTargets[0],
  patch: { target_minimum_robotaxi_quantity: 40, target_end_daily_orders: 600, forecast_period_unit: "MONTH", forecast_period_count: 12 },
  context: { now: () => "2026-07-09T00:20:00.000Z" },
});
assert.equal(targetUpdate.succeeded, true, "经营目标必须通过服务化能力保存配置");
assert.equal(targetUpdate.businessTarget.target_minimum_robotaxi_quantity, 40, "经营目标配置必须更新最低 Robotaxi 数量");
assert.equal(targetUpdate.businessTarget.forecast_end_date, "2027-07-04", "经营目标必须按自然周期计算预测结束日期");
assert.equal(supplyProfiles.length, 1, "必须初始化默认生产画像");
assert.equal(supplyProfiles[0].profile_status, "ACTIVE", "生产画像默认必须可用");
assert.equal(strategies.length, 1, "必须初始化默认长期需求预测策略");
assert.equal(strategies[0].strategy_status, "ACTIVE", "长期需求预测策略默认必须可用");
assert.equal(allocationStrategies.length, 1, "必须初始化默认区域分配策略");
assert.equal(allocationStrategies[0].strategy_status, "ACTIVE", "区域分配策略默认必须可用");
assert.equal(allocationStrategies[0].allocation_algorithm, "ZONE_SUPPLY_URGENCY_ALLOCATION", "区域分配策略必须使用供给紧急度算法");

const profileUpdate = updateSupplyProductionProfileConfig({
  profile: supplyProfiles[0],
  patch: { production_capacity_per_period: 12, delivery_capacity_per_period: 24 },
  context: { now: () => "2026-07-09T00:30:00.000Z" },
});
assert.equal(profileUpdate.succeeded, true, "生产画像必须通过服务化能力保存配置");
assert.equal(profileUpdate.profile.production_capacity_per_period, 12, "生产画像配置必须更新周期生产能力");
assert.equal(profileUpdate.profile.delivery_capacity_per_period, 24, "生产画像配置必须更新周期交付能力");

let runSeq = 0;
let resultSeq = 0;
const execution = executeLongTermDemandForecastStrategy({
  strategy: strategies[0],
  businessTargets: [targetUpdate.businessTarget],
  supplyProductionProfiles: [profileUpdate.profile],
  demandProfiles: [{
    profile_id: "DP-Z-Z-001",
    target_object_type: "ZONE",
    target_object_id: "Z-001",
    target_object_name: "最小运营测试区",
    profile_status: "ACTIVE",
    baseline_addressable_daily_orders: 800,
    busiest_hour_share: 0.2,
    zone_period_growth_rate: 0.1,
    growth_rate_unit: "MONTH",
    effective_daily_capacity: 1000,
    effective_peak_hour_capacity: 200,
  }],
  robotaxis: [
    { robotaxi_id: "RTX-001", target_zone_id: "Z-001", availability_status: "AVAILABLE" },
    { robotaxi_id: "RTX-002", target_zone_id: "Z-001", availability_status: "AVAILABLE" },
  ],
  context: {
    now: () => "2026-07-09T01:00:00.000Z",
    nextRunId: () => `LDF-RUN-${String(++runSeq).padStart(4, "0")}`,
    nextResultBaseId: () => `LDF-RES-${String(++resultSeq).padStart(4, "0")}`,
  },
});

const lowerFulfillmentExecution = executeLongTermDemandForecastStrategy({
  strategy: strategies[0],
  businessTargets: [{ ...targetUpdate.businessTarget, target_order_fulfillment_rate: 0.2 }],
  supplyProductionProfiles: [profileUpdate.profile],
  demandProfiles: [{
    profile_id: "DP-Z-Z-001",
    target_object_type: "ZONE",
    target_object_id: "Z-001",
    target_object_name: "最小运营测试区",
    profile_status: "ACTIVE",
    baseline_addressable_daily_orders: 800,
    busiest_hour_share: 0.2,
    zone_period_growth_rate: 0.1,
    growth_rate_unit: "MONTH",
    effective_daily_capacity: 1000,
    effective_peak_hour_capacity: 200,
  }],
  robotaxis: [
    { robotaxi_id: "RTX-001", target_zone_id: "Z-001", availability_status: "AVAILABLE" },
    { robotaxi_id: "RTX-002", target_zone_id: "Z-001", availability_status: "AVAILABLE" },
  ],
  context: {
    now: () => "2026-07-09T01:00:00.000Z",
    nextRunId: () => "LDF-RUN-RATE-CHECK",
    nextResultBaseId: () => "LDF-RES-RATE-CHECK",
  },
});

assert.equal(execution.run.run_status, "SUCCEEDED", "策略执行应成功");
assert.equal(execution.run.result_count, 1, "策略执行应生成一条区域预测结果");
assert.equal(execution.results.length, 1, "必须返回预测结果集合");
assert.equal(execution.results[0].forecast_run_id, execution.run.forecast_run_id, "预测结果必须关联预测执行");
assert.equal(execution.run.business_target_id, "BT-001", "预测执行必须记录经营目标");
assert.equal(execution.results[0].business_target_id, "BT-001", "预测结果必须关联经营目标");
assert.equal(execution.results[0].zone_id, "Z-001", "预测结果必须记录目标区域");
assert.ok(execution.results[0].market_forecast_daily_orders > execution.results[0].baseline_addressable_daily_orders, "预测结果必须计算增长后的日需求");
assert.ok(execution.results[0].planned_peak_hour_orders > 0, "预测结果必须计算峰值小时需求");
assert.ok(execution.results[0].required_robotaxi_quantity > 0, "预测结果必须计算目标所需 Robotaxi");
assert.ok(execution.results[0].robotaxi_gap_quantity >= 0, "预测结果必须计算 Robotaxi 供给缺口");
assert.ok(execution.results[0].planned_production_quantity >= 0, "预测结果必须计算计划生产数量");
assert.equal(execution.results[0].recommended_production_quantity, execution.results[0].robotaxi_gap_quantity, "建议生产数量必须覆盖完整 Robotaxi 缺口");
assert.equal(execution.results[0].planned_production_quantity, execution.results[0].recommended_production_quantity, "生产计划数量必须使用完整建议量");
assert.equal(
  execution.results[0].uncovered_robotaxi_gap,
  Math.max(0, execution.results[0].robotaxi_gap_quantity - execution.results[0].feasible_supply_quantity),
  "预测期剩余缺口必须由预测期可形成供给计算",
);
assert.equal(execution.results[0].first_production_completion_date, "2026-07-19", "预测结果必须按生产提前期计算首批生产完成日期");
assert.equal(execution.results[0].first_quality_inspection_completion_date, "2026-07-22", "预测结果必须在生产完成后叠加质量检验周期");
assert.equal(execution.results[0].production_ready_date, "2026-07-19", "旧兼容字段只能映射首批生产完成日期");
assert.equal(execution.results[0].supply_production_profile_id, "SPP-001", "预测结果必须关联生产画像");
assert.equal(lowerFulfillmentExecution.results[0].market_forecast_daily_orders, execution.results[0].market_forecast_daily_orders, "服务质量目标不得折减市场预测");
assert.equal(lowerFulfillmentExecution.results[0].planned_daily_orders, execution.results[0].planned_daily_orders, "服务质量目标不得改变计划承接量");
assert.ok(execution.results[0].calculation_steps.length >= 20, "预测结果必须保存完整计算链");
execution.results[0].calculation_steps.forEach((step) => {
  ["step_action", "input_values", "calculation_model", "formula_expression", "output_field", "output_value", "source_refs"].forEach((key) => {
    assert.ok(Object.hasOwn(step, key), `计算步骤必须包含 ${key}`);
  });
  assert.notEqual(step.output_value, undefined, `计算步骤 ${step.output_field} 必须具有输出值`);
});
assert.ok(!execution.results[0].calculation_steps.some((step) => ["当前需求基线", "经营目标比较", "峰值并发"].includes(step.step_name)), "计算步骤不得使用临时别名冒充字段名称");

let supplyPlanSeq = 0;
let batchSeq = 0;
let allocationRunSeq = 0;
let allocationResultSeq = 0;
let deliverySeq = 0;
let producedSeq = 20;
let readinessSeq = 0;

const supplyPlanResult = createSupplyPlanFromForecast({
  forecast: execution.results[0],
  supplyProductionProfiles: [profileUpdate.profile],
  context: {
    now: () => "2026-07-09T02:00:00.000Z",
    nextSupplyPlanId: () => `FPP-${String(++supplyPlanSeq).padStart(4, "0")}`,
  },
});
assert.equal(supplyPlanResult.succeeded, true, "预测结果必须能创建生产计划");
assert.equal(supplyPlanResult.supplyPlan.plan_status, "DRAFT", "生产计划首态必须是草稿");
assert.equal(supplyPlanResult.supplyPlan.planned_robotaxi_count, execution.results[0].planned_production_quantity, "生产计划必须使用预测结果的计划生产数量");
assert.equal(supplyPlanResult.supplyPlan.simulation_status_transition_history.length, 1, "生产计划创建必须记录首态时间线");

const confirmedPlan = confirmSupplyPlan({
  supplyPlan: supplyPlanResult.supplyPlan,
  context: { now: () => "2026-07-09T02:10:00.000Z" },
}).supplyPlan;
assert.equal(confirmedPlan.plan_status, "CONFIRMED", "生产计划确认后必须进入已确认");

const batchCreate = createProductionBatchFromSupplyPlan({
  supplyPlan: confirmedPlan,
  context: {
    now: () => "2026-07-09T03:00:00.000Z",
    nextProductionBatchId: () => `PB-${String(++batchSeq).padStart(4, "0")}`,
  },
});
assert.equal(batchCreate.succeeded, true, "已确认生产计划必须能生成生产批次");
assert.equal(batchCreate.productionBatch.batch_status, "PLANNED", "生产批次首态必须是规划中");

const startedBatch = startProductionBatch({
  productionBatch: batchCreate.productionBatch,
  context: { now: () => "2026-07-09T03:10:00.000Z" },
}).productionBatch;
const completedBatchResult = completeProductionBatch({
  productionBatch: startedBatch,
  context: { now: () => "2026-07-09T04:00:00.000Z" },
});
assert.equal(completedBatchResult.succeeded, true, "生产中批次必须能完成生产");
assert.equal(completedBatchResult.productionBatch.batch_status, "AWAITING_QUALITY_INSPECTION", "生产完成后必须等待质量检验");
assert.equal(completedBatchResult.robotaxis.length, 0, "生产完成但质检前不得创建 Robotaxi");

const inspectionBatchResult = startProductionQualityInspection({
  productionBatch: completedBatchResult.productionBatch,
  context: { now: () => "2026-07-09T04:10:00.000Z" },
});
const passedInspectionResult = passProductionQualityInspection({
  productionBatch: inspectionBatchResult.productionBatch,
  existingRobotaxis: [
    { robotaxi_id: "RTX-001" },
    { robotaxi_id: "RTX-002" },
  ],
  opsCenters: [{ ops_center_id: "OC-001", cell_ids: ["C-34-32", "C-34-33"] }],
  context: {
    now: () => "2026-07-09T04:20:00.000Z",
    nextRobotaxiId: () => `RTX-${String(++producedSeq).padStart(3, "0")}`,
  },
});
assert.equal(passedInspectionResult.succeeded, true, "质量检验中批次必须能通过质检");
assert.equal(passedInspectionResult.productionBatch.batch_status, "COMPLETED", "质量检验通过后生产批次才进入已完成");
assert.equal(passedInspectionResult.robotaxis.length, confirmedPlan.planned_robotaxi_count, "质量检验通过后必须按计划数量创建 Robotaxi");
assert.equal(passedInspectionResult.robotaxis[0].availability_status, "PENDING_DELIVERY", "新 Robotaxi 必须待交付");
assert.equal(passedInspectionResult.robotaxis[0].current_cell_id, null, "生产完成不得提前写入运营中心位置");
assert.equal(passedInspectionResult.robotaxis[0].target_ops_center_id, null, "生产完成不得提前绑定运营中心");
assert.ok(passedInspectionResult.productionBatch.produced_robotaxi_ids.includes(passedInspectionResult.robotaxis[0].robotaxi_id), "生产批次必须记录质检通过后创建的 Robotaxi ID");

const allocation = executeFleetAllocationStrategy({
  strategy: allocationStrategies[0],
  robotaxis: passedInspectionResult.robotaxis,
  supplyPlans: [confirmedPlan],
  productionBatches: [passedInspectionResult.productionBatch],
  opsCenters: [{ ops_center_id: "OC-001" }],
  context: {
    now: () => "2026-07-09T05:00:00.000Z",
    nextFleetAllocationRunId: () => `FAR-${String(++allocationRunSeq).padStart(4, "0")}`,
    nextFleetAllocationResultId: () => `FAR-RES-${String(++allocationResultSeq).padStart(4, "0")}`,
  },
});
assert.equal(allocation.run.run_status, "SUCCEEDED", "区域分配策略执行必须成功");
assert.equal(allocation.results.length, 1, "区域分配必须生成结果");
assert.ok(allocation.results[0].allocated_quantity > 0, "区域分配结果必须记录分配数量");
assert.equal(allocation.results[0].allocated_quantity, allocation.results[0].allocated_robotaxi_ids.length, "分配数量必须等于 Robotaxi ID 数量");

const deliveryCreate = createDeliveryOrderFromAllocationResult({
  allocationResult: allocation.results[0],
  context: {
    now: () => "2026-07-09T06:00:00.000Z",
    nextDeliveryOrderId: () => `RDO-${String(++deliverySeq).padStart(4, "0")}`,
  },
});
assert.equal(deliveryCreate.succeeded, true, "分配结果必须能创建交付单");
assert.equal(deliveryCreate.deliveryOrder.delivery_status, "CREATED", "交付单首态必须是已创建");
assert.equal(deliveryCreate.deliveryOrder.robotaxi_count, allocation.results[0].allocated_quantity, "交付单必须包含分配出的 Robotaxi");

const deliveryStarted = startDeliveryOrder({
  deliveryOrder: deliveryCreate.deliveryOrder,
  robotaxis: passedInspectionResult.robotaxis,
  context: { now: () => "2026-07-09T06:10:00.000Z" },
});
assert.equal(deliveryStarted.deliveryOrder.delivery_status, "IN_DELIVERY", "交付开始后必须进入交付中");
assert.equal(deliveryStarted.robotaxis[0].availability_status, "IN_DELIVERY", "交付中的 Robotaxi 必须标记交付中");

const deliveryCompleted = completeDeliveryOrder({
  deliveryOrder: deliveryStarted.deliveryOrder,
  robotaxis: deliveryStarted.robotaxis,
  readinessTasks: [],
  opsCenters: [{ ops_center_id: "OC-001", cell_ids: ["C-34-32", "C-34-33"] }],
  context: {
    now: () => "2026-07-09T07:00:00.000Z",
    nextReadinessTaskId: () => `TASK-RC-${String(++readinessSeq).padStart(4, "0")}`,
  },
});
assert.equal(deliveryCompleted.deliveryOrder.delivery_status, "DELIVERED", "交付完成后必须进入已交付");
assert.equal(deliveryCompleted.readinessTasks.length, deliveryCompleted.deliveryOrder.robotaxi_count, "交付完成必须逐车触发准入任务");
assert.equal(deliveryCompleted.readinessTasks[0].task_status, "WAITING_ASSIGNMENT", "交付触发的准入任务首态必须待分配");
assert.equal(deliveryCompleted.readinessTasks[0].trigger_object_type, "robotaxiDeliveryOrder", "准入任务必须记录交付单来源");
assert.equal(deliveryCompleted.robotaxis[0].availability_status, "PENDING_ADMISSION", "交付完成后的 Robotaxi 必须待准入");
assert.ok(["C-34-32", "C-34-33"].includes(deliveryCompleted.robotaxis[0].current_cell_id), "交付完成后才写入目标运营中心位置");

let loopSupplyPlanSeq = 10;
let loopBatchSeq = 10;
let loopAllocationRunSeq = 10;
let loopAllocationResultSeq = 10;
let loopDeliverySeq = 10;
let loopProducedSeq = 50;
let loopReadinessSeq = 10;
const supplyLoop = completeSupplyManagementLoopFromForecast({
  forecast: execution.results[0],
  supplyProductionProfiles: [profileUpdate.profile],
  fleetAllocationStrategies: allocationStrategies,
  existingRobotaxis: [
    { robotaxi_id: "RTX-001", target_zone_id: "Z-001", availability_status: "AVAILABLE" },
    { robotaxi_id: "RTX-002", target_zone_id: "Z-001", availability_status: "AVAILABLE" },
  ],
  existingSupplyPlans: [],
  opsCenters: [{ ops_center_id: "OC-001", cell_ids: ["C-34-32", "C-34-33"] }],
  readinessTasks: [],
  context: {
    now: () => "2026-07-09T08:00:00.000Z",
    nextSupplyPlanId: () => `FPP-${String(++loopSupplyPlanSeq).padStart(4, "0")}`,
    nextProductionBatchId: () => `PB-${String(++loopBatchSeq).padStart(4, "0")}`,
    nextFleetAllocationRunId: () => `FAR-${String(++loopAllocationRunSeq).padStart(4, "0")}`,
    nextFleetAllocationResultId: () => `FAR-RES-${String(++loopAllocationResultSeq).padStart(4, "0")}`,
    nextDeliveryOrderId: () => `RDO-${String(++loopDeliverySeq).padStart(4, "0")}`,
    nextRobotaxiId: () => `RTX-${String(++loopProducedSeq).padStart(3, "0")}`,
    nextReadinessTaskId: () => `TASK-RC-${String(++loopReadinessSeq).padStart(4, "0")}`,
  },
});
assert.equal(supplyLoop.succeeded, true, "供应管理闭环编排必须成功");
assert.equal(supplyLoop.supplyPlan.plan_status, "CONFIRMED", "闭环编排必须确认生产计划");
assert.equal(supplyLoop.productionBatch.batch_status, "COMPLETED", "闭环编排必须完成生产批次");
assert.equal(supplyLoop.deliveryOrder.delivery_status, "DELIVERED", "闭环编排必须完成区域交付");
assert.equal(supplyLoop.producedRobotaxiIds.length, supplyLoop.supplyPlan.planned_robotaxi_count, "闭环编排必须按生产计划形成 Robotaxi 资产");
assert.equal(supplyLoop.readinessTasks.length, supplyLoop.deliveryOrder.robotaxi_count, "闭环编排必须逐车触发运营准入任务");
assert.equal(supplyLoop.readinessTasks[0].task_status, "WAITING_ASSIGNMENT", "闭环编排生成的准入任务必须待分配");
const producedAsset = supplyLoop.robotaxis.find((robotaxi) => robotaxi.robotaxi_id === supplyLoop.producedRobotaxiIds[0]);
assert.equal(producedAsset.availability_status, "PENDING_ADMISSION", "闭环编排后的新 Robotaxi 必须待准入");
assert.equal(supplyLoop.robotaxis.find((robotaxi) => robotaxi.robotaxi_id === "RTX-001").availability_status, "AVAILABLE", "闭环编排不得破坏已有 Robotaxi 管理状态");

const main = fs.readFileSync("src/main.jsx", "utf8");
const navigationRegistry = fs.readFileSync("src/ui/navigationRegistry.js", "utf8");
const fieldDictionary = fs.readFileSync("src/domain/fieldDictionary.js", "utf8");
const dictionaryDoc = fs.readFileSync("doc/rules/field-dictionary.md", "utf8");

assert.ok(navigationRegistry.includes('group("businessPlanning", "经营规划"'), "前端必须存在经营规划一级菜单");
assert.ok(navigationRegistry.includes('page("businessTargets", "经营目标")'), "经营规划必须包含经营目标菜单");
assert.ok(navigationRegistry.includes('page("supplyProductionProfiles", "生产画像")'), "经营规划必须包含生产画像菜单");
assert.ok(navigationRegistry.includes('page("longTermDemandForecastStrategies", "预测策略")'), "需求预测必须包含预测策略三级菜单");
assert.ok(main.includes("businessPlanningService.executeLongTermDemandForecastStrategy"), "页面只能调用经营规划服务执行预测，不得自行拼预测结果");
assert.ok(main.includes("businessPlanningService.updateBusinessTargetConfig"), "页面必须调用服务保存经营目标配置");
assert.ok(main.includes("businessPlanningService.updateSupplyProductionProfileConfig"), "页面必须调用服务保存生产画像配置");
assert.ok(main.includes("businessTargets: data.businessTargets || []"), "需求预测执行必须传入经营目标集合");
assert.ok(main.includes("businessPlanningService.executeSupplyDecisionStrategy"), "页面必须通过供应决策服务从预测结果创建生产计划");
assert.ok(main.includes("businessPlanningService.completeSupplyManagementLoopFromForecast"), "演示数据服务必须保留供应管理闭环编排能力");
assert.ok(main.includes("执行供应决策"), "预测结果页必须提供职责清晰的供应决策入口");
assert.ok(!main.includes(">执行供应闭环</Button>"), "普通预测结果页不得暴露跨单据供应演示闭环入口");
assert.ok(navigationRegistry.includes('group("regionDeliveryManagement", "区域交付"'), "供应管理必须把区域交付作为二级菜单容器");
assert.ok(navigationRegistry.includes('page("robotaxiDeliveryOrders", "交付单")'), "区域交付容器下必须把区域交付单显示为交付单");
assert.ok(main.includes("deriveInitialRuntimeSequences(fallback)"), "干净启动必须按初始 Robotaxi 派生新车编号序列，避免破坏 Robotaxi 管理");
assert.ok(main.includes('producedRobotaxiSequence = deriveSequence(initialData.robotaxis || [], "robotaxi_id", "RTX-")'), "重置模拟数据后必须按初始 Robotaxi 派生新车编号序列");
assert.ok(main.includes("businessPlanningService.completeProductionBatch"), "页面必须调用服务完成生产批次并创建 Robotaxi");
assert.ok(main.includes("createDocumentEventRows(displayRows, objectType, idField, actions.taskEventLogs, page)"), "供应单据事件区必须合并生命周期和操作事件");
assert.ok(main.includes("appendRecordOperationEvent(\"supplyPlans\""), "供应单据失败反馈必须写入最近事件而不是弹窗");
assert.ok(main.includes("businessPlanningService.executeFleetAllocationStrategy"), "页面必须调用服务执行区域分配策略");
assert.ok(main.includes("createRegionDeliveryOrder"), "区域交付必须支持创建时触发区域分配策略");
assert.ok(main.includes("businessPlanningService.completeDeliveryOrder"), "页面必须调用服务完成交付并触发准入任务");
assert.ok(main.includes("actions.fleetAllocationRuns || []"), "区域分配策略事件区必须通过组件 actions 读取执行记录，避免页面白屏");
assert.equal(main.includes("createStrategyRunRows(rowsByPage.fleetAllocationRuns"), false, "RecordTable 不得越界引用 App 内部 rowsByPage");
assert.ok(main.includes("longTermDemandForecastRuns: [result.run, ...(current.longTermDemandForecastRuns || [])]"), "执行后必须写入预测执行记录");
assert.ok(main.includes("longTermDemandForecasts: [...(result.results || []), ...(current.longTermDemandForecasts || [])]"), "执行后必须写入预测结果");
assert.ok(main.includes("supplyProductionProfiles: snapshot.operationalData?.supplyProductionProfiles || initialData.supplyProductionProfiles || []"), "运行态恢复必须兼容生产画像集合");
assert.ok(main.includes("longTermDemandForecastStrategies: snapshot.operationalData?.longTermDemandForecastStrategies || initialData.longTermDemandForecastStrategies || []"), "运行态恢复必须兼容预测策略集合");
assert.ok(main.includes("longTermDemandForecastRuns: snapshot.operationalData?.longTermDemandForecastRuns || initialData.longTermDemandForecastRuns || []"), "运行态恢复必须兼容预测执行集合");
assert.equal(navigationRegistry.includes('page("supplyOrders"'), false, "当前菜单不得继续展示无效供给单");
assert.equal(navigationRegistry.includes('page("dealerSupplies"'), false, "当前菜单不得继续展示无效车商供应");

[
  "supplyProductionProfile",
  "businessTarget",
  "longTermDemandForecastStrategy",
  "longTermDemandForecastRun",
  "forecast_strategy_id",
  "forecast_run_id",
  "forecast_result_id",
  "supplyPlan",
  "productionBatch",
  "fleetAllocationStrategy",
  "fleetAllocationRun",
  "fleetAllocationResult",
  "robotaxiDeliveryOrder",
  "supply_plan_id",
  "business_target_id",
  "forecast_start_date",
  "forecast_end_date",
  "baseline_daily_demand",
  "forecast_daily_demand",
  "forecast_peak_hour_demand",
  "production_batch_id",
  "fleet_allocation_strategy_id",
  "fleet_allocation_run_id",
  "fleet_allocation_result_id",
  "delivery_order_id",
  "required_fleet_quantity",
  "fleet_gap_quantity",
  "planned_production_quantity",
  "production_gap_quantity",
  "supply_completion_date",
  "urgency_weight",
  "ZONE_SUPPLY_URGENCY_ALLOCATION",
].forEach((token) => {
  assert.ok(fieldDictionary.includes(token), `代码字段字典必须包含 ${token}`);
  assert.ok(dictionaryDoc.includes(token), `文档字段字典必须包含 ${token}`);
});

console.log("v041.2 经营规划底座合同验证通过");
