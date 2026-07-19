import assert from "node:assert/strict";
import { createSupplyPositionView, SupplyPositionStage } from "../src/services/supplyPositionService.js";

const robotaxis = [
  ...Array.from({ length: 4 }, (_, index) => asset(`RTX-A-${index + 1}`, "AVAILABLE")),
  ...Array.from({ length: 3 }, (_, index) => asset(`RTX-R-${index + 1}`, "PENDING_ADMISSION")),
  asset("RTX-O-1", "UNAVAILABLE"),
  asset("RTX-Q-1", "PENDING_DELIVERY", "PB-DONE"),
  asset("RTX-Q-2", "PENDING_DELIVERY", "PB-DONE"),
  asset("RTX-AW-1", "PENDING_DELIVERY", "PB-DONE"),
  asset("RTX-AW-2", "PENDING_DELIVERY", "PB-DONE"),
  asset("RTX-T-1", "IN_DELIVERY", "PB-DONE"),
];

const view = createSupplyPositionView({
  generatedAt: "2026-07-18T10:00:00.000Z",
  zones: [{ zone_id: "Z-001", zone_name: "最小运营测试区", cell_ids: ["C-1-1"] }],
  opsCenters: [{ ops_center_id: "OC-001", zone_id: "Z-001", cell_ids: ["C-1-1"] }],
  supplyPlans: [{
    supply_plan_id: "SP-001",
    plan_status: "CONFIRMED",
    target_zone_id: "Z-001",
    target_zone_name: "最小运营测试区",
    required_robotaxi_quantity: 20,
    planned_robotaxi_count: 12,
    planned_end_date: "2026-08-20",
  }],
  productionBatches: [
    batch("PB-ACTIVE-1", "IN_PRODUCTION", 4),
    batch("PB-ACTIVE-2", "IN_QUALITY_INSPECTION", 3),
    {
      ...batch("PB-DONE", "COMPLETED", 5),
      produced_robotaxi_ids: ["RTX-Q-1", "RTX-Q-2", "RTX-AW-1", "RTX-AW-2", "RTX-T-1"],
    },
  ],
  robotaxis,
  fleetAllocationResults: [{
    fleet_allocation_result_id: "FAR-001",
    result_status: "GENERATED",
    target_zone_id: "Z-001",
    target_ops_center_id: "OC-001",
    allocated_robotaxi_ids: ["RTX-AW-1", "RTX-AW-2"],
  }],
  robotaxiDeliveryOrders: [
    {
      delivery_order_id: "DO-001",
      delivery_status: "CREATED",
      target_zone_id: "Z-001",
      target_ops_center_id: "OC-001",
      robotaxi_ids: ["RTX-AW-1", "RTX-AW-2"],
    },
    {
      delivery_order_id: "DO-002",
      delivery_status: "IN_DELIVERY",
      target_zone_id: "Z-001",
      target_ops_center_id: "OC-001",
      robotaxi_ids: ["RTX-T-1"],
    },
  ],
});

assert.equal(view.summary.current_available_quantity, 4, "当前可用供给只统计可调度车辆");
assert.equal(view.summary.current_regional_asset_quantity, 8, "当前区域资产包含待准入、可用和区域内运维车辆");
assert.equal(view.summary.committed_inbound_quantity, 5, "已承诺供给包含质检通过待分配、待交付和在途车辆");
assert.equal(view.summary.production_pipeline_quantity, 7, "生产管道包含生产中及质检中的批次数量");
assert.equal(view.summary.plan_pending_release_quantity, 0, "已完全下达批次的计划不应重复形成待下达数量");
assert.equal(view.summary.current_supply_gap_quantity, 12);
assert.equal(view.summary.committed_supply_gap_quantity, 7);
assert.equal(view.summary.projected_supply_gap_quantity, 0);

assert.equal(view.records.some((record) => record.production_batch_id === "PB-DONE" && record.source_object_type === "productionBatch"), false, "完成批次必须由具体 Robotaxi 代替批次数量");
assert.equal(quantityAt(SupplyPositionStage.QUALIFIED_PENDING_ALLOCATION), 2);
assert.equal(quantityAt(SupplyPositionStage.ALLOCATED_PENDING_DELIVERY), 2);
assert.equal(quantityAt(SupplyPositionStage.IN_TRANSIT), 1);

const trackedRobotaxiIds = view.records.flatMap((record) => record.robotaxi_ids);
assert.equal(new Set(trackedRobotaxiIds).size, trackedRobotaxiIds.length, "每辆 Robotaxi 只能处于一个供给阶段");
assert.equal(view.diagnostics.length, 0);

const pendingPlanView = createSupplyPositionView({
  zones: [{ zone_id: "Z-001", zone_name: "最小运营测试区", cell_ids: ["C-1-1"] }],
  supplyPlans: [{ supply_plan_id: "SP-002", plan_status: "CONFIRMED", target_zone_id: "Z-001", required_robotaxi_quantity: 10, planned_robotaxi_count: 5 }],
  robotaxis: [asset("RTX-ONLY", "AVAILABLE")],
});
assert.equal(pendingPlanView.summary.plan_pending_release_quantity, 5);
assert.equal(pendingPlanView.summary.projected_supply_gap_quantity, 9, "尚未下达生产批次的计划意向不能抵减预测缺口");

const largeFleet = Array.from({ length: 10000 }, (_, index) => asset(`RTX-PERF-${index + 1}`, index % 5 === 0 ? "PENDING_ADMISSION" : "AVAILABLE"));
const performanceStartedAt = performance.now();
const largeView = createSupplyPositionView({
  zones: [{ zone_id: "Z-001", zone_name: "最小运营测试区", cell_ids: ["C-1-1"] }],
  opsCenters: [{ ops_center_id: "OC-001", zone_id: "Z-001", cell_ids: ["C-1-1"] }],
  robotaxis: largeFleet,
});
const performanceElapsedMs = performance.now() - performanceStartedAt;
assert.equal(largeView.records.length, 10000);
assert.equal(largeView.summary.current_regional_asset_quantity, 10000);
assert.ok(performanceElapsedMs < 1000, `10,000 台供给投影耗时过高：${performanceElapsedMs.toFixed(2)}ms`);

console.log(`v047.3 供应跟踪投影合同验证通过：10,000 台耗时 ${performanceElapsedMs.toFixed(2)}ms`);

function asset(robotaxiId, availabilityStatus, productionBatchId = null) {
  return {
    robotaxi_id: robotaxiId,
    availability_status: availabilityStatus,
    available_for_dispatch: availabilityStatus === "AVAILABLE",
    ops_center_id: "OC-001",
    current_cell_id: "C-1-1",
    production_batch_id: productionBatchId,
  };
}

function batch(productionBatchId, batchStatus, quantity) {
  return {
    production_batch_id: productionBatchId,
    supply_plan_id: "SP-001",
    target_zone_id: "Z-001",
    batch_status: batchStatus,
    planned_robotaxi_count: quantity,
  };
}

function quantityAt(stage) {
  return view.records.filter((record) => record.supply_stage === stage).reduce((total, record) => total + record.quantity, 0);
}
