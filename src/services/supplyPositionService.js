export const SupplyPositionStage = Object.freeze({
  PLAN_PENDING_RELEASE: "PLAN_PENDING_RELEASE",
  BATCH_PLANNED: "BATCH_PLANNED",
  IN_PRODUCTION: "IN_PRODUCTION",
  AWAITING_QUALITY_INSPECTION: "AWAITING_QUALITY_INSPECTION",
  IN_QUALITY_INSPECTION: "IN_QUALITY_INSPECTION",
  QUALITY_FAILED: "QUALITY_FAILED",
  QUALIFIED_PENDING_ALLOCATION: "QUALIFIED_PENDING_ALLOCATION",
  ALLOCATED_PENDING_DELIVERY: "ALLOCATED_PENDING_DELIVERY",
  IN_TRANSIT: "IN_TRANSIT",
  PENDING_ADMISSION: "PENDING_ADMISSION",
  AVAILABLE: "AVAILABLE",
  IN_FLEET_OPERATION: "IN_FLEET_OPERATION",
  RETIRED: "RETIRED",
});

const ACTIVE_BATCH_STAGE = Object.freeze({
  PLANNED: SupplyPositionStage.BATCH_PLANNED,
  IN_PRODUCTION: SupplyPositionStage.IN_PRODUCTION,
  AWAITING_QUALITY_INSPECTION: SupplyPositionStage.AWAITING_QUALITY_INSPECTION,
  IN_QUALITY_INSPECTION: SupplyPositionStage.IN_QUALITY_INSPECTION,
  QUALITY_FAILED: SupplyPositionStage.QUALITY_FAILED,
});

const CURRENT_ASSET_STATUSES = new Set([
  "PENDING_ADMISSION", "PENDING_INSPECTION", "IN_INSPECTION",
  "AVAILABLE", "IN_FLEET_OPERATION", "UNAVAILABLE",
]);

export function createSupplyPositionView({
  supplyPlans = [],
  productionBatches = [],
  robotaxis = [],
  fleetAllocationResults = [],
  robotaxiDeliveryOrders = [],
  readinessTasks = [],
  zones = [],
  opsCenters = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  const diagnostics = [];
  const zoneNames = new Map((zones || []).map((zone) => [zone.zone_id, zone.zone_name || zone.name || zone.zone_id]));
  const zoneByCell = createZoneByCell(zones);
  const zoneByOpsCenter = createZoneByOpsCenter(opsCenters, zoneByCell);
  const planById = new Map((supplyPlans || []).map((plan) => [plan.supply_plan_id, plan]));
  const batchById = new Map((productionBatches || []).map((batch) => [batch.production_batch_id, batch]));
  const deliveryByRobotaxi = createDeliveryByRobotaxi(robotaxiDeliveryOrders, diagnostics);
  const allocationByRobotaxi = createAllocationByRobotaxi(fleetAllocationResults, deliveryByRobotaxi, diagnostics);
  const readinessByRobotaxi = new Map((readinessTasks || []).filter((task) => task.robotaxi_id).map((task) => [task.robotaxi_id, task]));
  const robotaxiIds = new Set((robotaxis || []).map((robotaxi) => robotaxi.robotaxi_id));
  const records = [];

  (robotaxis || []).forEach((robotaxi) => {
    const deliveryOrder = deliveryByRobotaxi.get(robotaxi.robotaxi_id) || null;
    const allocationResult = allocationByRobotaxi.get(robotaxi.robotaxi_id) || null;
    const batch = batchById.get(robotaxi.production_batch_id) || null;
    const plan = batch ? planById.get(batch.supply_plan_id) || null : null;
    const zoneId = resolveRobotaxiZone(robotaxi, deliveryOrder, allocationResult, plan, zoneByOpsCenter, zoneByCell);
    const stage = resolveRobotaxiStage(robotaxi, deliveryOrder, allocationResult);
    records.push(createTrackingRecord({
      stage,
      sourceObjectType: deliveryOrder ? "robotaxiDeliveryOrder" : allocationResult ? "fleetAllocationResult" : "robotaxi",
      sourceObjectId: deliveryOrder?.delivery_order_id || allocationResult?.fleet_allocation_result_id || robotaxi.robotaxi_id,
      targetZoneId: zoneId,
      targetZoneName: zoneNames.get(zoneId) || zoneId || "未分配区域",
      supplyPlanId: plan?.supply_plan_id || null,
      productionBatchId: batch?.production_batch_id || robotaxi.production_batch_id || null,
      deliveryOrderId: deliveryOrder?.delivery_order_id || null,
      targetOpsCenterId: deliveryOrder?.target_ops_center_id || robotaxi.target_ops_center_id || robotaxi.ops_center_id || null,
      quantity: 1,
      robotaxiIds: [robotaxi.robotaxi_id],
      expectedAvailableDate: plan?.planned_end_date || null,
      updatedAt: deliveryOrder?.updated_at || robotaxi.updated_at || robotaxi.created_at || generatedAt,
      readinessTaskId: readinessByRobotaxi.get(robotaxi.robotaxi_id)?.task_id || null,
    }));
  });

  (productionBatches || []).forEach((batch) => {
    const stage = ACTIVE_BATCH_STAGE[batch.batch_status];
    if (!stage) {
      if (batch.batch_status === "COMPLETED") {
        const missingIds = (batch.produced_robotaxi_ids || []).filter((id) => !robotaxiIds.has(id));
        if (missingIds.length) diagnostics.push(createDiagnostic("BATCH_ASSET_MISSING", batch.production_batch_id, missingIds.length));
      }
      return;
    }
    const plan = planById.get(batch.supply_plan_id) || null;
    records.push(createTrackingRecord({
      stage,
      sourceObjectType: "productionBatch",
      sourceObjectId: batch.production_batch_id,
      targetZoneId: batch.target_zone_id || plan?.target_zone_id || null,
      targetZoneName: batch.target_zone_name || plan?.target_zone_name || zoneNames.get(batch.target_zone_id || plan?.target_zone_id) || "未分配区域",
      supplyPlanId: batch.supply_plan_id || null,
      productionBatchId: batch.production_batch_id,
      quantity: Math.max(0, Number(batch.planned_robotaxi_count || 0)),
      robotaxiIds: [],
      expectedAvailableDate: plan?.planned_end_date || null,
      updatedAt: batch.updated_at || batch.created_at || generatedAt,
    }));
  });

  (supplyPlans || []).filter((plan) => plan.plan_status === "CONFIRMED").forEach((plan) => {
    const releasedQuantity = (productionBatches || [])
      .filter((batch) => batch.supply_plan_id === plan.supply_plan_id && !["CANCELLED", "QUALITY_FAILED"].includes(batch.batch_status))
      .reduce((total, batch) => total + Math.max(0, Number(batch.planned_robotaxi_count || 0)), 0);
    const remainingQuantity = Math.max(0, Number(plan.planned_robotaxi_count || 0) - releasedQuantity);
    if (!remainingQuantity) return;
    records.push(createTrackingRecord({
      stage: SupplyPositionStage.PLAN_PENDING_RELEASE,
      sourceObjectType: "supplyPlan",
      sourceObjectId: plan.supply_plan_id,
      targetZoneId: plan.target_zone_id || null,
      targetZoneName: plan.target_zone_name || zoneNames.get(plan.target_zone_id) || "未分配区域",
      supplyPlanId: plan.supply_plan_id,
      quantity: remainingQuantity,
      robotaxiIds: [],
      expectedAvailableDate: plan.planned_end_date || null,
      updatedAt: plan.updated_at || plan.created_at || generatedAt,
    }));
  });

  const summaries = createZoneSummaries({ records, supplyPlans, robotaxis, zoneNames, zoneByOpsCenter, zoneByCell });
  return Object.freeze({
    generated_at: generatedAt,
    summary: Object.freeze(sumSummaries(summaries)),
    zones: Object.freeze(summaries),
    records: Object.freeze(records.sort(compareTrackingRecords)),
    diagnostics: Object.freeze(diagnostics),
  });
}

function createZoneSummaries({ records, supplyPlans, robotaxis, zoneNames, zoneByOpsCenter, zoneByCell }) {
  const zoneIds = new Set([
    ...records.map((record) => record.target_zone_id),
    ...supplyPlans.map((plan) => plan.target_zone_id),
  ].filter(Boolean));
  if (!zoneIds.size) zoneIds.add("UNASSIGNED");
  return [...zoneIds].map((zoneId) => {
    const zoneRecords = records.filter((record) => (record.target_zone_id || "UNASSIGNED") === zoneId);
    const latestPlan = [...supplyPlans]
      .filter((plan) => plan.target_zone_id === zoneId && plan.plan_status !== "CANCELLED")
      .sort((left, right) => String(right.updated_at || right.created_at || "").localeCompare(String(left.updated_at || left.created_at || "")))[0] || null;
    const currentRegionalAssetQuantity = robotaxis.filter((robotaxi) => (
      CURRENT_ASSET_STATUSES.has(robotaxi.availability_status)
      && resolveRobotaxiZone(robotaxi, null, null, null, zoneByOpsCenter, zoneByCell) === zoneId
    )).length;
    const currentAvailableQuantity = robotaxis.filter((robotaxi) => (
      robotaxi.availability_status === "AVAILABLE"
      && robotaxi.available_for_dispatch !== false
      && resolveRobotaxiZone(robotaxi, null, null, null, zoneByOpsCenter, zoneByCell) === zoneId
    )).length;
    const quantityFor = (...stages) => zoneRecords.filter((record) => stages.includes(record.supply_stage)).reduce((total, record) => total + record.quantity, 0);
    const committedInboundQuantity = quantityFor(
      SupplyPositionStage.QUALIFIED_PENDING_ALLOCATION,
      SupplyPositionStage.ALLOCATED_PENDING_DELIVERY,
      SupplyPositionStage.IN_TRANSIT,
    );
    const productionPipelineQuantity = quantityFor(
      SupplyPositionStage.BATCH_PLANNED,
      SupplyPositionStage.IN_PRODUCTION,
      SupplyPositionStage.AWAITING_QUALITY_INSPECTION,
      SupplyPositionStage.IN_QUALITY_INSPECTION,
    );
    const requiredQuantity = Math.max(0, Number(latestPlan?.required_robotaxi_quantity ?? latestPlan?.required_supply_quantity ?? currentRegionalAssetQuantity));
    const currentGap = Math.max(0, requiredQuantity - currentRegionalAssetQuantity);
    return Object.freeze({
      target_zone_id: zoneId === "UNASSIGNED" ? null : zoneId,
      target_zone_name: zoneNames.get(zoneId) || (zoneId === "UNASSIGNED" ? "未分配区域" : zoneId),
      supply_plan_id: latestPlan?.supply_plan_id || null,
      required_robotaxi_quantity: requiredQuantity,
      current_available_quantity: currentAvailableQuantity,
      current_regional_asset_quantity: currentRegionalAssetQuantity,
      committed_inbound_quantity: committedInboundQuantity,
      production_pipeline_quantity: productionPipelineQuantity,
      plan_pending_release_quantity: quantityFor(SupplyPositionStage.PLAN_PENDING_RELEASE),
      quality_failed_quantity: quantityFor(SupplyPositionStage.QUALITY_FAILED),
      current_supply_gap_quantity: currentGap,
      committed_supply_gap_quantity: Math.max(0, currentGap - committedInboundQuantity),
      projected_supply_gap_quantity: Math.max(0, currentGap - committedInboundQuantity - productionPipelineQuantity),
    });
  }).sort((left, right) => String(left.target_zone_id || "").localeCompare(String(right.target_zone_id || "")));
}

function sumSummaries(summaries) {
  const fields = [
    "required_robotaxi_quantity", "current_available_quantity", "current_regional_asset_quantity",
    "committed_inbound_quantity", "production_pipeline_quantity", "plan_pending_release_quantity",
    "quality_failed_quantity", "current_supply_gap_quantity", "committed_supply_gap_quantity",
    "projected_supply_gap_quantity",
  ];
  return fields.reduce((summary, field) => ({ ...summary, [field]: summaries.reduce((total, item) => total + Number(item[field] || 0), 0) }), {});
}

function resolveRobotaxiStage(robotaxi, deliveryOrder, allocationResult) {
  if (robotaxi.availability_status === "RETIRED") return SupplyPositionStage.RETIRED;
  if (deliveryOrder?.delivery_status === "IN_DELIVERY" || robotaxi.availability_status === "IN_DELIVERY") return SupplyPositionStage.IN_TRANSIT;
  if (deliveryOrder?.delivery_status === "CREATED" || allocationResult) return SupplyPositionStage.ALLOCATED_PENDING_DELIVERY;
  if (robotaxi.availability_status === "PENDING_DELIVERY") return SupplyPositionStage.QUALIFIED_PENDING_ALLOCATION;
  if (["PENDING_ADMISSION", "PENDING_INSPECTION", "IN_INSPECTION"].includes(robotaxi.availability_status)) return SupplyPositionStage.PENDING_ADMISSION;
  if (robotaxi.availability_status === "AVAILABLE") return SupplyPositionStage.AVAILABLE;
  return SupplyPositionStage.IN_FLEET_OPERATION;
}

function resolveRobotaxiZone(robotaxi, deliveryOrder, allocationResult, plan, zoneByOpsCenter, zoneByCell) {
  return deliveryOrder?.target_zone_id
    || allocationResult?.target_zone_id
    || robotaxi.target_zone_id
    || robotaxi.zone_id
    || robotaxi.service_zone_id
    || zoneByOpsCenter.get(robotaxi.target_ops_center_id || robotaxi.ops_center_id || robotaxi.current_ops_center_id)
    || zoneByCell.get(robotaxi.current_cell_id || robotaxi.current_location_cell_id)
    || plan?.target_zone_id
    || robotaxi.planned_target_zone_id
    || null;
}

function createDeliveryByRobotaxi(orders, diagnostics) {
  const map = new Map();
  [...(orders || [])].sort((left, right) => String(right.updated_at || right.created_at || "").localeCompare(String(left.updated_at || left.created_at || ""))).forEach((order) => {
    if (order.delivery_status === "DELIVERED" || order.delivery_status === "CANCELLED") return;
    (order.robotaxi_ids || []).forEach((robotaxiId) => {
      if (map.has(robotaxiId)) diagnostics.push(createDiagnostic("MULTIPLE_OPEN_DELIVERY_ORDERS", robotaxiId, 1));
      else map.set(robotaxiId, order);
    });
  });
  return map;
}

function createAllocationByRobotaxi(results, deliveryByRobotaxi, diagnostics) {
  const map = new Map();
  [...(results || [])].sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || ""))).forEach((result) => {
    if (!['GENERATED', 'USED_FOR_DELIVERY'].includes(result.result_status)) return;
    (result.allocated_robotaxi_ids || []).forEach((robotaxiId) => {
      if (deliveryByRobotaxi.has(robotaxiId)) return;
      if (map.has(robotaxiId)) diagnostics.push(createDiagnostic("MULTIPLE_ACTIVE_ALLOCATIONS", robotaxiId, 1));
      else map.set(robotaxiId, result);
    });
  });
  return map;
}

function createZoneByCell(zones) {
  const map = new Map();
  (zones || []).filter((zone) => !zone.parent_zone_id).forEach((zone) => (zone.cell_ids || []).forEach((cellId) => map.set(cellId, zone.zone_id)));
  return map;
}

function createZoneByOpsCenter(opsCenters, zoneByCell) {
  return new Map((opsCenters || []).map((center) => [
    center.ops_center_id,
    center.zone_id || center.target_zone_id || (center.cell_ids || []).map((cellId) => zoneByCell.get(cellId)).find(Boolean) || null,
  ]));
}

function createTrackingRecord({ stage, sourceObjectType, sourceObjectId, targetZoneId, targetZoneName, supplyPlanId = null, productionBatchId = null, deliveryOrderId = null, targetOpsCenterId = null, readinessTaskId = null, quantity = 0, robotaxiIds = [], expectedAvailableDate = null, updatedAt = null }) {
  return Object.freeze({
    supply_tracking_record_id: `SUPPLY-POS-${stage}-${sourceObjectId}`,
    target_zone_id: targetZoneId,
    target_zone_name: targetZoneName,
    supply_stage: stage,
    source_object_type: sourceObjectType,
    source_object_id: sourceObjectId,
    supply_plan_id: supplyPlanId,
    production_batch_id: productionBatchId,
    delivery_order_id: deliveryOrderId,
    readiness_task_id: readinessTaskId,
    target_ops_center_id: targetOpsCenterId,
    supply_quantity: Math.max(0, Number(quantity || 0)),
    quantity: Math.max(0, Number(quantity || 0)),
    robotaxi_ids: Object.freeze([...robotaxiIds]),
    expected_available_date: expectedAvailableDate,
    source_updated_at: updatedAt,
  });
}

function createDiagnostic(type, sourceId, affectedQuantity) {
  return Object.freeze({ diagnostic_type: type, source_object_id: sourceId, affected_quantity: affectedQuantity });
}

function compareTrackingRecords(left, right) {
  const zoneOrder = String(left.target_zone_id || "").localeCompare(String(right.target_zone_id || ""));
  if (zoneOrder) return zoneOrder;
  return String(left.supply_tracking_record_id).localeCompare(String(right.supply_tracking_record_id));
}
