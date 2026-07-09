import assert from "node:assert/strict";
import fs from "node:fs";
import {
  completeDeliveryOrder,
  completeProductionBatch,
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
  startDeliveryOrder,
  startProductionBatch,
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
  patch: { target_fleet_size: 40, target_service_order_count: 60000, planning_horizon_years: 3 },
  context: { now: () => "2026-07-09T00:20:00.000Z" },
});
assert.equal(targetUpdate.succeeded, true, "经营目标必须通过服务化能力保存配置");
assert.equal(targetUpdate.businessTarget.target_fleet_size, 40, "经营目标配置必须更新目标车队规模");
assert.equal(targetUpdate.businessTarget.forecast_end_date, "2029-07-08", "经营目标必须计算预测结束日期");
assert.equal(supplyProfiles.length, 1, "必须初始化默认生产画像");
assert.equal(supplyProfiles[0].profile_status, "ACTIVE", "生产画像默认必须可用");
assert.equal(strategies.length, 1, "必须初始化默认长期需求预测策略");
assert.equal(strategies[0].strategy_status, "ACTIVE", "长期需求预测策略默认必须可用");
assert.equal(allocationStrategies.length, 1, "必须初始化默认区域分配策略");
assert.equal(allocationStrategies[0].strategy_status, "ACTIVE", "区域分配策略默认必须可用");
assert.equal(allocationStrategies[0].allocation_algorithm, "ZONE_SUPPLY_URGENCY_ALLOCATION", "区域分配策略必须使用供给紧急度算法");

const profileUpdate = updateSupplyProductionProfileConfig({
  profile: supplyProfiles[0],
  patch: { monthly_production_capacity: 12, delivery_capacity: 24 },
  context: { now: () => "2026-07-09T00:30:00.000Z" },
});
assert.equal(profileUpdate.succeeded, true, "生产画像必须通过服务化能力保存配置");
assert.equal(profileUpdate.profile.monthly_production_capacity, 12, "生产画像配置必须更新月生产能力");
assert.equal(profileUpdate.profile.delivery_capacity, 24, "生产画像配置必须更新交付能力");

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
    expected_robotaxi_demand: 14.8,
    peak_demand_ratio: 0.2,
    growth_rate: 0.1,
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
assert.equal(execution.run.business_target_id, "BT-001", "预测执行必须记录经营目标");
assert.equal(execution.results[0].business_target_id, "BT-001", "预测结果必须关联经营目标");
assert.equal(execution.results[0].zone_id, "Z-001", "预测结果必须记录目标区域");
assert.ok(execution.results[0].forecast_daily_demand > execution.results[0].baseline_daily_demand, "预测结果必须计算增长后的日需求");
assert.ok(execution.results[0].forecast_peak_hour_demand > 0, "预测结果必须计算峰值小时需求");
assert.ok(execution.results[0].required_fleet_quantity > 0, "预测结果必须计算目标所需车辆数");
assert.ok(execution.results[0].fleet_gap_quantity >= 0, "预测结果必须计算车辆供给缺口");
assert.ok(execution.results[0].planned_production_quantity >= 0, "预测结果必须计算计划生产数量");
assert.ok(execution.results[0].feasible_production_quantity >= execution.results[0].planned_production_quantity, "可生产数量必须支撑计划生产数量");
assert.equal(execution.results[0].supply_completion_date, "2027-01-05", "预测结果必须按生产提前期计算供给完成日期");
assert.equal(execution.results[0].supply_production_profile_id, "SPP-001", "预测结果必须关联生产画像");

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
  existingRobotaxis: [
    { robotaxi_id: "RTX-001" },
    { robotaxi_id: "RTX-002" },
  ],
  opsCenters: [{ ops_center_id: "OC-001", cell_ids: ["C-34-32", "C-34-33"] }],
  context: {
    now: () => "2026-07-09T04:00:00.000Z",
    nextRobotaxiId: () => `RTX-${String(++producedSeq).padStart(3, "0")}`,
  },
});
assert.equal(completedBatchResult.succeeded, true, "生产中批次必须能完成");
assert.equal(completedBatchResult.productionBatch.batch_status, "COMPLETED", "生产批次完成后必须进入已完成");
assert.equal(completedBatchResult.robotaxis.length, confirmedPlan.planned_robotaxi_count, "生产批次必须按计划数量创建 Robotaxi");
assert.equal(completedBatchResult.robotaxis[0].availability_status, "PENDING_DELIVERY", "新 Robotaxi 必须待交付");
assert.ok(completedBatchResult.productionBatch.produced_robotaxi_ids.includes(completedBatchResult.robotaxis[0].robotaxi_id), "生产批次必须记录创建的 Robotaxi ID");

const allocation = executeFleetAllocationStrategy({
  strategy: allocationStrategies[0],
  robotaxis: completedBatchResult.robotaxis,
  supplyPlans: [confirmedPlan],
  productionBatches: [completedBatchResult.productionBatch],
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
  robotaxis: completedBatchResult.robotaxis,
  context: { now: () => "2026-07-09T06:10:00.000Z" },
});
assert.equal(deliveryStarted.deliveryOrder.delivery_status, "IN_DELIVERY", "交付开始后必须进入交付中");
assert.equal(deliveryStarted.robotaxis[0].availability_status, "IN_DELIVERY", "交付中的 Robotaxi 必须标记交付中");

const deliveryCompleted = completeDeliveryOrder({
  deliveryOrder: deliveryStarted.deliveryOrder,
  robotaxis: deliveryStarted.robotaxis,
  readinessTasks: [],
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

const main = fs.readFileSync("src/main.jsx", "utf8");
const fieldDictionary = fs.readFileSync("src/domain/fieldDictionary.js", "utf8");
const dictionaryDoc = fs.readFileSync("doc/rules/field-dictionary.md", "utf8");

assert.ok(main.includes('label: "经营规划"'), "前端必须存在经营规划一级菜单");
assert.ok(main.includes('{ key: "businessTargets", label: "经营目标" }'), "经营规划必须包含经营目标菜单");
assert.ok(main.includes('{ key: "supplyProductionProfiles", label: "生产画像" }'), "经营规划必须包含生产画像菜单");
assert.ok(main.includes('{ key: "longTermDemandForecastStrategies", label: "预测策略" }'), "需求预测必须包含预测策略三级菜单");
assert.ok(main.includes("businessPlanningService.executeLongTermDemandForecastStrategy"), "页面只能调用经营规划服务执行预测，不得自行拼预测结果");
assert.ok(main.includes("businessPlanningService.updateBusinessTargetConfig"), "页面必须调用服务保存经营目标配置");
assert.ok(main.includes("businessPlanningService.updateSupplyProductionProfileConfig"), "页面必须调用服务保存生产画像配置");
assert.ok(main.includes("businessTargets: data.businessTargets || []"), "需求预测执行必须传入经营目标集合");
assert.ok(main.includes("businessPlanningService.createSupplyPlanFromForecast"), "页面必须调用服务从预测结果创建生产计划");
assert.ok(main.includes("businessPlanningService.completeProductionBatch"), "页面必须调用服务完成生产批次并创建 Robotaxi");
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
assert.equal(main.includes('{ key: "supplyOrders", label: "供给单" }'), false, "当前菜单不得继续展示无效供给单");
assert.equal(main.includes('{ key: "dealerSupplies", label: "车商供应" }'), false, "当前菜单不得继续展示无效车商供应");

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
