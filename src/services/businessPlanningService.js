import { createRobotaxi } from "../domain/operationsCenterTypes.js?v=20260608-v018-bfs-route-planning";

export const SupplyProductionProfileStatus = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
};

export const BusinessTargetStatus = {
  ACTIVE: "ACTIVE",
  DRAFT: "DRAFT",
  ARCHIVED: "ARCHIVED",
};

export const LongTermDemandForecastStrategyStatus = {
  ACTIVE: "ACTIVE",
  DRAFT: "DRAFT",
  ARCHIVED: "ARCHIVED",
};

export const LongTermDemandForecastRunStatus = {
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
};

export const LongTermDemandForecastResultStatus = {
  GENERATED: "GENERATED",
};

export const SupplyPlanStatus = {
  DRAFT: "DRAFT",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
};

export const ProductionBatchStatus = {
  PLANNED: "PLANNED",
  IN_PRODUCTION: "IN_PRODUCTION",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

export const FleetAllocationStrategyStatus = {
  ACTIVE: "ACTIVE",
  DRAFT: "DRAFT",
  ARCHIVED: "ARCHIVED",
};

export function initializeDefaultBusinessTargets(now = defaultNow()) {
  const forecastStartDate = now.slice(0, 10);
  const planningHorizonYears = 3;
  return [{
    business_target_id: "BT-001",
    target_name: "三年运营增长目标",
    target_status: BusinessTargetStatus.ACTIVE,
    target_version: "1.0.0",
    planning_horizon_years: planningHorizonYears,
    forecast_start_date: forecastStartDate,
    forecast_end_date: addDaysIsoDate(now, planningHorizonYears * 365),
    target_zone_ids: ["Z-001"],
    target_revenue_amount: 1200000,
    target_service_order_count: 50000,
    target_fleet_size: 35,
    target_asset_utilization_rate: 0.72,
    target_order_fulfillment_rate: 0.85,
    created_at: now,
    updated_at: now,
  }];
}

export function updateBusinessTargetConfig({
  businessTarget,
  patch = {},
  context = {},
} = {}) {
  if (!businessTarget?.business_target_id) return { succeeded: false, reason: "BUSINESS_TARGET_REQUIRED", businessTarget: null };
  const occurredAt = resolveNow(context);
  const numericFields = [
    "planning_horizon_years",
    "target_revenue_amount",
    "target_service_order_count",
    "target_fleet_size",
    "target_asset_utilization_rate",
    "target_order_fulfillment_rate",
  ];
  const normalizedPatch = { ...patch };
  numericFields.forEach((field) => {
    if (field in normalizedPatch) normalizedPatch[field] = Math.max(0, Number(normalizedPatch[field] || 0));
  });
  const horizonYears = Math.max(1, Number(normalizedPatch.planning_horizon_years ?? businessTarget.planning_horizon_years ?? 3));
  const forecastStartDate = normalizedPatch.forecast_start_date || businessTarget.forecast_start_date || occurredAt.slice(0, 10);
  return {
    succeeded: true,
    businessTarget: {
      ...businessTarget,
      ...normalizedPatch,
      planning_horizon_years: horizonYears,
      forecast_start_date: forecastStartDate,
      forecast_end_date: addDaysIsoDate(forecastStartDate, horizonYears * 365),
      target_status: normalizedPatch.target_status || businessTarget.target_status || BusinessTargetStatus.ACTIVE,
      updated_at: occurredAt,
    },
  };
}

export const FleetAllocationRunStatus = {
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
};

export const FleetAllocationResultStatus = {
  GENERATED: "GENERATED",
  USED_FOR_DELIVERY: "USED_FOR_DELIVERY",
};

export const RobotaxiDeliveryOrderStatus = {
  CREATED: "CREATED",
  IN_DELIVERY: "IN_DELIVERY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
};

export function initializeDefaultSupplyProductionProfiles(now = defaultNow()) {
  return [{
    profile_id: "SPP-001",
    profile_name: "自有生产能力画像",
    profile_status: SupplyProductionProfileStatus.ACTIVE,
    production_lead_time_days: 180,
    annual_production_capacity: 120,
    monthly_production_capacity: 10,
    ramp_up_months: 3,
    delivery_capacity: 20,
    inspection_lead_time_days: 3,
    effective_from: "2026-01-01",
    effective_to: null,
    created_at: now,
    updated_at: now,
  }];
}

export function updateSupplyProductionProfileConfig({
  profile,
  patch = {},
  context = {},
} = {}) {
  if (!profile?.profile_id) return { succeeded: false, reason: "SUPPLY_PRODUCTION_PROFILE_REQUIRED", profile: null };
  const occurredAt = resolveNow(context);
  const numericFields = [
    "production_lead_time_days",
    "annual_production_capacity",
    "monthly_production_capacity",
    "ramp_up_months",
    "delivery_capacity",
    "inspection_lead_time_days",
  ];
  const normalizedPatch = { ...patch };
  numericFields.forEach((field) => {
    if (field in normalizedPatch) normalizedPatch[field] = Math.max(0, Number(normalizedPatch[field] || 0));
  });
  return {
    succeeded: true,
    profile: {
      ...profile,
      ...normalizedPatch,
      profile_status: normalizedPatch.profile_status || profile.profile_status || SupplyProductionProfileStatus.ACTIVE,
      updated_at: occurredAt,
    },
  };
}

export function initializeDefaultLongTermDemandForecastStrategies(now = defaultNow()) {
  return [{
    forecast_strategy_id: "LDF-STR-001",
    strategy_name: "长期需求预测策略",
    strategy_type: "ZONE_DEMAND_TO_FLEET_REQUIREMENT",
    strategy_status: LongTermDemandForecastStrategyStatus.ACTIVE,
    strategy_version: "1.0.0",
    target_zone_ids: ["Z-001"],
    forecast_horizon_years: 3,
    demand_buffer_ratio: 0.15,
    fleet_utilization_target: 0.72,
    vehicle_available_hours_per_day: 12,
    average_trip_duration_min: 30,
    created_at: now,
    updated_at: now,
  }];
}

export function initializeDefaultFleetAllocationStrategies(now = defaultNow()) {
  return [{
    fleet_allocation_strategy_id: "FAS-001",
    strategy_name: "区域分配策略",
    strategy_status: FleetAllocationStrategyStatus.ACTIVE,
    strategy_version: "1.0.0",
    allocation_algorithm: "ZONE_SUPPLY_URGENCY_ALLOCATION",
    target_zone_ids: ["Z-001"],
    target_ops_center_ids: ["OC-001"],
    urgency_weight: 0.5,
    demand_gap_weight: 0.3,
    production_ready_weight: 0.2,
    max_robotaxi_per_delivery_order: 20,
    created_at: now,
    updated_at: now,
  }];
}

export function executeLongTermDemandForecastStrategy({
  strategy,
  businessTargets = [],
  demandProfiles = [],
  supplyProductionProfiles = [],
  robotaxis = [],
  context = {},
} = {}) {
  const startedAt = resolveNow(context);
  if (!strategy?.forecast_strategy_id || strategy.strategy_status !== LongTermDemandForecastStrategyStatus.ACTIVE) {
    const failedRun = createForecastRun({
      runId: resolveRunId(context),
      strategy,
      runStatus: LongTermDemandForecastRunStatus.FAILED,
      startedAt,
      completedAt: startedAt,
      resultCount: 0,
      failureReason: "FORECAST_STRATEGY_NOT_ACTIVE",
    });
    return { run: failedRun, results: [] };
  }

  const activeProductionProfile = supplyProductionProfiles.find((item) => item.profile_status === SupplyProductionProfileStatus.ACTIVE)
    || supplyProductionProfiles[0]
    || null;
  const activeBusinessTarget = businessTargets.find((item) => item.target_status === BusinessTargetStatus.ACTIVE)
    || businessTargets[0]
    || null;
  const targetZoneIds = Array.isArray(strategy.target_zone_ids) && strategy.target_zone_ids.length
    ? strategy.target_zone_ids
    : Array.isArray(activeBusinessTarget?.target_zone_ids) && activeBusinessTarget.target_zone_ids.length
      ? activeBusinessTarget.target_zone_ids
    : unique(demandProfiles.filter((item) => item.target_object_type === "ZONE" && item.profile_status === "ACTIVE").map((item) => item.target_object_id));
  const zoneProfiles = demandProfiles.filter((profile) => profile.target_object_type === "ZONE" && targetZoneIds.includes(profile.target_object_id));
  const runId = resolveRunId(context);
  const resultBaseId = resolveResultBaseId(context);
  const completedAt = resolveNow(context);
  const results = zoneProfiles.map((profile, index) => createForecastResult({
    resultId: `${resultBaseId}-${String(index + 1).padStart(3, "0")}`,
    runId,
    strategy,
    businessTarget: activeBusinessTarget,
    profile,
    productionProfile: activeProductionProfile,
    robotaxis,
    occurredAt: completedAt,
  }));
  const run = createForecastRun({
    runId,
    strategy,
    runStatus: LongTermDemandForecastRunStatus.SUCCEEDED,
    startedAt,
    completedAt,
    resultCount: results.length,
    failureReason: results.length ? null : "NO_ZONE_DEMAND_PROFILE",
    targetZoneIds,
    businessTarget: activeBusinessTarget,
    productionProfile: activeProductionProfile,
  });
  return { run, results };
}

export function createSupplyPlanFromForecast({
  forecast,
  supplyProductionProfiles = [],
  context = {},
} = {}) {
  const occurredAt = resolveNow(context);
  if (!forecast?.forecast_result_id) {
    return { succeeded: false, reason: "FORECAST_RESULT_REQUIRED", supplyPlan: null };
  }
  const plannedRobotaxiCount = Math.max(0, Number(forecast.planned_production_quantity ?? forecast.fleet_gap_quantity ?? forecast.required_fleet_quantity ?? 0));
  if (plannedRobotaxiCount <= 0) {
    return { succeeded: false, reason: "NO_FLEET_GAP", supplyPlan: null };
  }
  const productionProfile = supplyProductionProfiles.find((item) => item.profile_id === forecast.supply_production_profile_id)
    || supplyProductionProfiles.find((item) => item.profile_status === SupplyProductionProfileStatus.ACTIVE)
    || supplyProductionProfiles[0]
    || {};
  const supplyPlan = withLifecycleStatus({
    supply_plan_id: resolveSupplyPlanId(context),
    plan_name: `${forecast.zone_name || forecast.zone_id || "区域"}生产计划`,
    plan_status: SupplyPlanStatus.DRAFT,
    forecast_id: forecast.forecast_result_id,
    forecast_result_id: forecast.forecast_result_id,
    forecast_run_id: forecast.forecast_run_id,
    target_zone_id: forecast.zone_id,
    target_zone_name: forecast.zone_name,
    supply_production_profile_id: productionProfile.profile_id || null,
    planned_robotaxi_count: plannedRobotaxiCount,
    required_fleet_quantity: forecast.required_fleet_quantity ?? null,
    current_fleet_quantity: forecast.current_fleet_quantity ?? null,
    fleet_gap_quantity: forecast.fleet_gap_quantity ?? plannedRobotaxiCount,
    feasible_production_quantity: forecast.feasible_production_quantity ?? null,
    production_gap_quantity: forecast.production_gap_quantity ?? null,
    production_lead_time_days: productionProfile.production_lead_time_days ?? null,
    planned_start_date: forecast.production_start_date || occurredAt.slice(0, 10),
    planned_end_date: forecast.supply_completion_date || addDaysIsoDate(occurredAt, Number(productionProfile.production_lead_time_days || 180)),
    created_at: occurredAt,
    updated_at: occurredAt,
  }, {
    objectType: "supplyPlan",
    idField: "supply_plan_id",
    statusField: "plan_status",
    fromStatus: null,
    toStatus: SupplyPlanStatus.DRAFT,
    actionType: "SUPPLY_PLAN_CREATE",
    resultType: "SUPPLY_PLAN_CREATED",
    occurredAt,
  });
  return { succeeded: true, supplyPlan };
}

export function confirmSupplyPlan({ supplyPlan, context = {} } = {}) {
  if (!supplyPlan?.supply_plan_id) return { succeeded: false, reason: "SUPPLY_PLAN_REQUIRED", supplyPlan: null };
  if (supplyPlan.plan_status !== SupplyPlanStatus.DRAFT) return { succeeded: false, reason: "SUPPLY_PLAN_NOT_DRAFT", supplyPlan };
  const occurredAt = resolveNow(context);
  return {
    succeeded: true,
    supplyPlan: withLifecycleStatus({
      ...supplyPlan,
      plan_status: SupplyPlanStatus.CONFIRMED,
      confirmed_at: occurredAt,
      updated_at: occurredAt,
    }, {
      objectType: "supplyPlan",
      idField: "supply_plan_id",
      statusField: "plan_status",
      fromStatus: supplyPlan.plan_status,
      toStatus: SupplyPlanStatus.CONFIRMED,
      actionType: "SUPPLY_PLAN_CONFIRM",
      resultType: "SUPPLY_PLAN_CONFIRMED",
      occurredAt,
    }),
  };
}

export function cancelSupplyPlan({ supplyPlan, context = {} } = {}) {
  if (!supplyPlan?.supply_plan_id) return { succeeded: false, reason: "SUPPLY_PLAN_REQUIRED", supplyPlan: null };
  if ([SupplyPlanStatus.CANCELLED].includes(supplyPlan.plan_status)) return { succeeded: false, reason: "SUPPLY_PLAN_ALREADY_CANCELLED", supplyPlan };
  const occurredAt = resolveNow(context);
  return {
    succeeded: true,
    supplyPlan: withLifecycleStatus({
      ...supplyPlan,
      plan_status: SupplyPlanStatus.CANCELLED,
      cancelled_at: occurredAt,
      updated_at: occurredAt,
    }, {
      objectType: "supplyPlan",
      idField: "supply_plan_id",
      statusField: "plan_status",
      fromStatus: supplyPlan.plan_status,
      toStatus: SupplyPlanStatus.CANCELLED,
      actionType: "SUPPLY_PLAN_CANCEL",
      resultType: "SUPPLY_PLAN_CANCELLED",
      occurredAt,
    }),
  };
}

export function createProductionBatchFromSupplyPlan({ supplyPlan, context = {} } = {}) {
  const occurredAt = resolveNow(context);
  if (!supplyPlan?.supply_plan_id) return { succeeded: false, reason: "SUPPLY_PLAN_REQUIRED", productionBatch: null };
  if (supplyPlan.plan_status !== SupplyPlanStatus.CONFIRMED) return { succeeded: false, reason: "SUPPLY_PLAN_NOT_CONFIRMED", productionBatch: null };
  const plannedQuantity = Math.max(0, Number(supplyPlan.planned_robotaxi_count || 0));
  if (plannedQuantity <= 0) return { succeeded: false, reason: "NO_PLANNED_ROBOTAXI_COUNT", productionBatch: null };
  const productionBatch = withLifecycleStatus({
    production_batch_id: resolveProductionBatchId(context),
    batch_name: `${supplyPlan.plan_name || supplyPlan.supply_plan_id}生产批次`,
    batch_status: ProductionBatchStatus.PLANNED,
    supply_plan_id: supplyPlan.supply_plan_id,
    target_zone_id: supplyPlan.target_zone_id,
    target_zone_name: supplyPlan.target_zone_name,
    planned_robotaxi_count: plannedQuantity,
    produced_robotaxi_count: 0,
    produced_robotaxi_ids: [],
    production_started_at: null,
    production_completed_at: null,
    created_at: occurredAt,
    updated_at: occurredAt,
  }, {
    objectType: "productionBatch",
    idField: "production_batch_id",
    statusField: "batch_status",
    fromStatus: null,
    toStatus: ProductionBatchStatus.PLANNED,
    actionType: "PRODUCTION_BATCH_CREATE",
    resultType: "PRODUCTION_BATCH_CREATED",
    occurredAt,
  });
  return { succeeded: true, productionBatch };
}

export function startProductionBatch({ productionBatch, context = {} } = {}) {
  if (!productionBatch?.production_batch_id) return { succeeded: false, reason: "PRODUCTION_BATCH_REQUIRED", productionBatch: null };
  if (productionBatch.batch_status !== ProductionBatchStatus.PLANNED) return { succeeded: false, reason: "PRODUCTION_BATCH_NOT_PLANNED", productionBatch };
  const occurredAt = resolveNow(context);
  return {
    succeeded: true,
    productionBatch: withLifecycleStatus({
      ...productionBatch,
      batch_status: ProductionBatchStatus.IN_PRODUCTION,
      production_started_at: occurredAt,
      updated_at: occurredAt,
    }, {
      objectType: "productionBatch",
      idField: "production_batch_id",
      statusField: "batch_status",
      fromStatus: productionBatch.batch_status,
      toStatus: ProductionBatchStatus.IN_PRODUCTION,
      actionType: "PRODUCTION_BATCH_START",
      resultType: "PRODUCTION_BATCH_STARTED",
      occurredAt,
    }),
  };
}

export function completeProductionBatch({
  productionBatch,
  existingRobotaxis = [],
  opsCenters = [],
  context = {},
} = {}) {
  if (!productionBatch?.production_batch_id) return { succeeded: false, reason: "PRODUCTION_BATCH_REQUIRED", productionBatch: null, robotaxis: [] };
  if (productionBatch.batch_status !== ProductionBatchStatus.IN_PRODUCTION) return { succeeded: false, reason: "PRODUCTION_BATCH_NOT_IN_PRODUCTION", productionBatch, robotaxis: [] };
  const occurredAt = resolveNow(context);
  const plannedQuantity = Math.max(0, Number(productionBatch.planned_robotaxi_count || 0));
  const opsCenter = opsCenters[0] || {};
  const existingIds = new Set((existingRobotaxis || []).map((item) => item.robotaxi_id));
  const robotaxis = Array.from({ length: plannedQuantity }, (_, index) => {
    const robotaxiId = resolveRobotaxiId(context, existingIds, index);
    existingIds.add(robotaxiId);
    return createProducedRobotaxi({
      robotaxiId,
      productionBatch,
      opsCenter,
      occurredAt,
      index,
    });
  });
  const completedBatch = withLifecycleStatus({
    ...productionBatch,
    batch_status: ProductionBatchStatus.COMPLETED,
    produced_robotaxi_count: robotaxis.length,
    produced_robotaxi_ids: robotaxis.map((item) => item.robotaxi_id),
    production_completed_at: occurredAt,
    updated_at: occurredAt,
  }, {
    objectType: "productionBatch",
    idField: "production_batch_id",
    statusField: "batch_status",
    fromStatus: productionBatch.batch_status,
    toStatus: ProductionBatchStatus.COMPLETED,
    actionType: "PRODUCTION_BATCH_COMPLETE",
    resultType: "PRODUCTION_BATCH_COMPLETED",
    occurredAt,
  });
  return { succeeded: true, productionBatch: completedBatch, robotaxis };
}

export function executeFleetAllocationStrategy({
  strategy,
  robotaxis = [],
  supplyPlans = [],
  productionBatches = [],
  opsCenters = [],
  context = {},
} = {}) {
  const occurredAt = resolveNow(context);
  const runId = resolveFleetAllocationRunId(context);
  if (!strategy?.fleet_allocation_strategy_id || strategy.strategy_status !== FleetAllocationStrategyStatus.ACTIVE) {
    return {
      run: createFleetAllocationRun({ runId, strategy, runStatus: FleetAllocationRunStatus.FAILED, occurredAt, resultCount: 0, failureReason: "FLEET_ALLOCATION_STRATEGY_NOT_ACTIVE" }),
      results: [],
    };
  }
  const allocatedIds = new Set();
  const eligibleRobotaxis = (robotaxis || []).filter((robotaxi) => {
    if (allocatedIds.has(robotaxi.robotaxi_id)) return false;
    return robotaxi.availability_status === "PENDING_DELIVERY";
  });
  const opsCenter = opsCenters[0] || {};
  const targetZoneIds = Array.isArray(strategy.target_zone_ids) && strategy.target_zone_ids.length ? strategy.target_zone_ids : unique(supplyPlans.map((item) => item.target_zone_id));
  const results = targetZoneIds.map((zoneId, index) => {
    const zonePlan = (supplyPlans || []).find((plan) => plan.target_zone_id === zoneId && plan.plan_status !== SupplyPlanStatus.CANCELLED) || {};
    const batchRobotaxiIds = new Set((productionBatches || [])
      .filter((batch) => !zoneId || batch.target_zone_id === zoneId)
      .flatMap((batch) => batch.produced_robotaxi_ids || []));
    const candidates = eligibleRobotaxis.filter((robotaxi) => (
      !batchRobotaxiIds.size || batchRobotaxiIds.has(robotaxi.robotaxi_id)
    ) && !allocatedIds.has(robotaxi.robotaxi_id));
    const quantity = Math.min(
      candidates.length,
      Math.max(0, Number(zonePlan.planned_robotaxi_count || candidates.length)),
      Number(strategy.max_robotaxi_per_delivery_order || candidates.length || 0),
    );
    const allocatedRobotaxis = candidates.slice(0, quantity);
    allocatedRobotaxis.forEach((robotaxi) => allocatedIds.add(robotaxi.robotaxi_id));
    return {
      fleet_allocation_result_id: resolveFleetAllocationResultId(context, index),
      fleet_allocation_run_id: runId,
      fleet_allocation_strategy_id: strategy.fleet_allocation_strategy_id,
      result_status: FleetAllocationResultStatus.GENERATED,
      target_zone_id: zoneId,
      target_ops_center_id: opsCenter.ops_center_id || strategy.target_ops_center_ids?.[0] || null,
      supply_plan_id: zonePlan.supply_plan_id || null,
      allocated_quantity: allocatedRobotaxis.length,
      allocated_robotaxi_ids: allocatedRobotaxis.map((item) => item.robotaxi_id),
      candidate_robotaxi_ids: candidates.map((item) => item.robotaxi_id),
      strategy_snapshot: { ...strategy },
      created_at: occurredAt,
    };
  }).filter((result) => result.allocated_quantity > 0);
  return {
    run: createFleetAllocationRun({
      runId,
      strategy,
      runStatus: FleetAllocationRunStatus.SUCCEEDED,
      occurredAt,
      resultCount: results.length,
      failureReason: results.length ? null : "NO_ELIGIBLE_ROBOTAXI",
    }),
    results,
  };
}

export function createDeliveryOrderFromAllocationResult({ allocationResult, context = {} } = {}) {
  const occurredAt = resolveNow(context);
  if (!allocationResult?.fleet_allocation_result_id) return { succeeded: false, reason: "ALLOCATION_RESULT_REQUIRED", deliveryOrder: null };
  if (!Array.isArray(allocationResult.allocated_robotaxi_ids) || !allocationResult.allocated_robotaxi_ids.length) {
    return { succeeded: false, reason: "NO_ALLOCATED_ROBOTAXI", deliveryOrder: null };
  }
  const deliveryOrder = withLifecycleStatus({
    delivery_order_id: resolveDeliveryOrderId(context),
    delivery_order_name: `${allocationResult.target_zone_id || "区域"}区域交付单`,
    delivery_status: RobotaxiDeliveryOrderStatus.CREATED,
    fleet_allocation_result_id: allocationResult.fleet_allocation_result_id,
    fleet_allocation_run_id: allocationResult.fleet_allocation_run_id,
    target_zone_id: allocationResult.target_zone_id,
    target_ops_center_id: allocationResult.target_ops_center_id,
    robotaxi_ids: [...allocationResult.allocated_robotaxi_ids],
    robotaxi_count: allocationResult.allocated_robotaxi_ids.length,
    delivered_robotaxi_ids: [],
    readiness_task_ids: [],
    created_at: occurredAt,
    updated_at: occurredAt,
  }, {
    objectType: "robotaxiDeliveryOrder",
    idField: "delivery_order_id",
    statusField: "delivery_status",
    fromStatus: null,
    toStatus: RobotaxiDeliveryOrderStatus.CREATED,
    actionType: "DELIVERY_ORDER_CREATE",
    resultType: "DELIVERY_ORDER_CREATED",
    occurredAt,
  });
  return { succeeded: true, deliveryOrder };
}

export function startDeliveryOrder({ deliveryOrder, robotaxis = [], context = {} } = {}) {
  if (!deliveryOrder?.delivery_order_id) return { succeeded: false, reason: "DELIVERY_ORDER_REQUIRED", deliveryOrder: null, robotaxis };
  if (deliveryOrder.delivery_status !== RobotaxiDeliveryOrderStatus.CREATED) return { succeeded: false, reason: "DELIVERY_ORDER_NOT_CREATED", deliveryOrder, robotaxis };
  const occurredAt = resolveNow(context);
  const startedOrder = withLifecycleStatus({
    ...deliveryOrder,
    delivery_status: RobotaxiDeliveryOrderStatus.IN_DELIVERY,
    delivery_started_at: occurredAt,
    updated_at: occurredAt,
  }, {
    objectType: "robotaxiDeliveryOrder",
    idField: "delivery_order_id",
    statusField: "delivery_status",
    fromStatus: deliveryOrder.delivery_status,
    toStatus: RobotaxiDeliveryOrderStatus.IN_DELIVERY,
    actionType: "DELIVERY_ORDER_START",
    resultType: "DELIVERY_ORDER_STARTED",
    occurredAt,
  });
  const nextRobotaxis = updateRobotaxisForDelivery(robotaxis, deliveryOrder.robotaxi_ids, {
    availability_status: "IN_DELIVERY",
    target_zone_id: deliveryOrder.target_zone_id,
    target_ops_center_id: deliveryOrder.target_ops_center_id,
    updated_at: occurredAt,
  });
  return { succeeded: true, deliveryOrder: startedOrder, robotaxis: nextRobotaxis };
}

export function completeDeliveryOrder({ deliveryOrder, robotaxis = [], readinessTasks = [], context = {} } = {}) {
  if (!deliveryOrder?.delivery_order_id) return { succeeded: false, reason: "DELIVERY_ORDER_REQUIRED", deliveryOrder: null, robotaxis, readinessTasks };
  if (deliveryOrder.delivery_status !== RobotaxiDeliveryOrderStatus.IN_DELIVERY) return { succeeded: false, reason: "DELIVERY_ORDER_NOT_IN_DELIVERY", deliveryOrder, robotaxis, readinessTasks };
  const occurredAt = resolveNow(context);
  const deliveredIds = [...(deliveryOrder.robotaxi_ids || [])];
  const newReadinessTasks = deliveredIds.map((robotaxiId, index) => createDeliveryReadinessTask({
    robotaxiId,
    deliveryOrder,
    occurredAt,
    taskId: resolveReadinessTaskId(context, index),
  }));
  const completedOrder = withLifecycleStatus({
    ...deliveryOrder,
    delivery_status: RobotaxiDeliveryOrderStatus.DELIVERED,
    delivered_robotaxi_ids: deliveredIds,
    readiness_task_ids: newReadinessTasks.map((task) => task.task_id),
    delivery_completed_at: occurredAt,
    updated_at: occurredAt,
  }, {
    objectType: "robotaxiDeliveryOrder",
    idField: "delivery_order_id",
    statusField: "delivery_status",
    fromStatus: deliveryOrder.delivery_status,
    toStatus: RobotaxiDeliveryOrderStatus.DELIVERED,
    actionType: "DELIVERY_ORDER_COMPLETE",
    resultType: "DELIVERY_ORDER_DELIVERED",
    occurredAt,
  });
  const nextRobotaxis = updateRobotaxisForDelivery(robotaxis, deliveredIds, {
    availability_status: "PENDING_ADMISSION",
    available_for_dispatch: false,
    current_task_id: null,
    current_task_type: null,
    current_task_status: null,
    target_zone_id: deliveryOrder.target_zone_id,
    target_ops_center_id: deliveryOrder.target_ops_center_id,
    updated_at: occurredAt,
  });
  return {
    succeeded: true,
    deliveryOrder: completedOrder,
    robotaxis: nextRobotaxis,
    readinessTasks: [...newReadinessTasks, ...(readinessTasks || [])],
  };
}

export function completeSupplyManagementLoopFromForecast({
  forecast,
  supplyProductionProfiles = [],
  fleetAllocationStrategies = [],
  existingRobotaxis = [],
  existingSupplyPlans = [],
  opsCenters = [],
  readinessTasks = [],
  context = {},
} = {}) {
  const supplyPlanResult = createSupplyPlanFromForecast({
    forecast,
    supplyProductionProfiles,
    context,
  });
  if (!supplyPlanResult.succeeded) {
    return { succeeded: false, reason: supplyPlanResult.reason, step: "CREATE_SUPPLY_PLAN", supplyPlan: null };
  }

  const confirmedPlanResult = confirmSupplyPlan({
    supplyPlan: supplyPlanResult.supplyPlan,
    context,
  });
  if (!confirmedPlanResult.succeeded) {
    return {
      succeeded: false,
      reason: confirmedPlanResult.reason,
      step: "CONFIRM_SUPPLY_PLAN",
      supplyPlan: supplyPlanResult.supplyPlan,
    };
  }

  const batchCreateResult = createProductionBatchFromSupplyPlan({
    supplyPlan: confirmedPlanResult.supplyPlan,
    context,
  });
  if (!batchCreateResult.succeeded) {
    return {
      succeeded: false,
      reason: batchCreateResult.reason,
      step: "CREATE_PRODUCTION_BATCH",
      supplyPlan: confirmedPlanResult.supplyPlan,
    };
  }

  const startedBatchResult = startProductionBatch({
    productionBatch: batchCreateResult.productionBatch,
    context,
  });
  if (!startedBatchResult.succeeded) {
    return {
      succeeded: false,
      reason: startedBatchResult.reason,
      step: "START_PRODUCTION_BATCH",
      supplyPlan: confirmedPlanResult.supplyPlan,
      productionBatch: batchCreateResult.productionBatch,
    };
  }

  const completedBatchResult = completeProductionBatch({
    productionBatch: startedBatchResult.productionBatch,
    existingRobotaxis,
    opsCenters,
    context,
  });
  if (!completedBatchResult.succeeded) {
    return {
      succeeded: false,
      reason: completedBatchResult.reason,
      step: "COMPLETE_PRODUCTION_BATCH",
      supplyPlan: confirmedPlanResult.supplyPlan,
      productionBatch: startedBatchResult.productionBatch,
    };
  }

  const strategy = (fleetAllocationStrategies || []).find((item) => item.strategy_status === FleetAllocationStrategyStatus.ACTIVE)
    || (fleetAllocationStrategies || [])[0];
  const allRobotaxisAfterProduction = [
    ...(completedBatchResult.robotaxis || []),
    ...(existingRobotaxis || []),
  ];
  const allocation = executeFleetAllocationStrategy({
    strategy,
    robotaxis: allRobotaxisAfterProduction,
    supplyPlans: [confirmedPlanResult.supplyPlan, ...(existingSupplyPlans || [])],
    productionBatches: [completedBatchResult.productionBatch],
    opsCenters,
    context,
  });
  if (!allocation.results?.length) {
    return {
      succeeded: false,
      reason: allocation.run?.failure_reason || "NO_ELIGIBLE_ROBOTAXI",
      step: "EXECUTE_FLEET_ALLOCATION",
      supplyPlan: confirmedPlanResult.supplyPlan,
      productionBatch: completedBatchResult.productionBatch,
      robotaxis: allRobotaxisAfterProduction,
      fleetAllocationRun: allocation.run,
      fleetAllocationResults: [],
    };
  }

  const deliveryCreateResult = createDeliveryOrderFromAllocationResult({
    allocationResult: allocation.results[0],
    context,
  });
  if (!deliveryCreateResult.succeeded) {
    return {
      succeeded: false,
      reason: deliveryCreateResult.reason,
      step: "CREATE_DELIVERY_ORDER",
      supplyPlan: confirmedPlanResult.supplyPlan,
      productionBatch: completedBatchResult.productionBatch,
      robotaxis: allRobotaxisAfterProduction,
      fleetAllocationRun: allocation.run,
      fleetAllocationResults: allocation.results,
    };
  }

  const deliveryStartedResult = startDeliveryOrder({
    deliveryOrder: deliveryCreateResult.deliveryOrder,
    robotaxis: allRobotaxisAfterProduction,
    context,
  });
  if (!deliveryStartedResult.succeeded) {
    return {
      succeeded: false,
      reason: deliveryStartedResult.reason,
      step: "START_DELIVERY_ORDER",
      supplyPlan: confirmedPlanResult.supplyPlan,
      productionBatch: completedBatchResult.productionBatch,
      robotaxis: allRobotaxisAfterProduction,
      fleetAllocationRun: allocation.run,
      fleetAllocationResults: allocation.results,
      deliveryOrder: deliveryCreateResult.deliveryOrder,
    };
  }

  const deliveryCompletedResult = completeDeliveryOrder({
    deliveryOrder: deliveryStartedResult.deliveryOrder,
    robotaxis: deliveryStartedResult.robotaxis,
    readinessTasks,
    context,
  });
  if (!deliveryCompletedResult.succeeded) {
    return {
      succeeded: false,
      reason: deliveryCompletedResult.reason,
      step: "COMPLETE_DELIVERY_ORDER",
      supplyPlan: confirmedPlanResult.supplyPlan,
      productionBatch: completedBatchResult.productionBatch,
      robotaxis: deliveryStartedResult.robotaxis,
      fleetAllocationRun: allocation.run,
      fleetAllocationResults: allocation.results,
      deliveryOrder: deliveryStartedResult.deliveryOrder,
    };
  }

  const usedAllocationResults = allocation.results.map((result, index) => (
    index === 0 ? { ...result, result_status: FleetAllocationResultStatus.USED_FOR_DELIVERY } : result
  ));
  return {
    succeeded: true,
    supplyPlan: confirmedPlanResult.supplyPlan,
    productionBatch: completedBatchResult.productionBatch,
    robotaxis: deliveryCompletedResult.robotaxis,
    fleetAllocationRun: allocation.run,
    fleetAllocationResults: usedAllocationResults,
    deliveryOrder: deliveryCompletedResult.deliveryOrder,
    readinessTasks: deliveryCompletedResult.readinessTasks,
    producedRobotaxiIds: completedBatchResult.productionBatch.produced_robotaxi_ids || [],
    readinessTaskIds: deliveryCompletedResult.deliveryOrder.readiness_task_ids || [],
  };
}

export function createBusinessOperationEvent({
  page = null,
  businessObjectType = null,
  businessObjectId = null,
  actionType,
  resultType,
  eventResult = "SUCCESS",
  message = "",
  occurredAt = null,
} = {}) {
  return {
    source_page: page,
    business_object_type: businessObjectType,
    business_object_id: businessObjectId,
    action_type: actionType,
    result_type: resultType || eventResult,
    event_type: actionType,
    event_result: eventResult,
    message,
    occurred_at: occurredAt || defaultNow(),
  };
}

function createForecastRun({
  runId,
  strategy,
  businessTarget,
  productionProfile,
  runStatus,
  startedAt,
  completedAt,
  resultCount,
  failureReason = null,
  targetZoneIds = [],
}) {
  return {
    forecast_run_id: runId,
    forecast_strategy_id: strategy?.forecast_strategy_id || null,
    business_target_id: businessTarget?.business_target_id || null,
    supply_production_profile_id: productionProfile?.profile_id || null,
    strategy_name: strategy?.strategy_name || null,
    strategy_version: strategy?.strategy_version || null,
    run_status: runStatus,
    target_zone_ids: targetZoneIds,
    forecast_start_date: businessTarget?.forecast_start_date || startedAt.slice(0, 10),
    forecast_end_date: businessTarget?.forecast_end_date || addDaysIsoDate(startedAt, Number(strategy?.forecast_horizon_years || 3) * 365),
    started_at: startedAt,
    completed_at: completedAt,
    result_count: resultCount,
    failure_reason: failureReason,
    strategy_snapshot: strategy ? { ...strategy } : null,
    business_target_snapshot: businessTarget ? { ...businessTarget } : null,
    production_profile_snapshot: productionProfile ? { ...productionProfile } : null,
  };
}

function createForecastResult({ resultId, runId, strategy, businessTarget, profile, productionProfile, robotaxis, occurredAt }) {
  const baselineDailyDemand = Number(profile.expected_robotaxi_demand || profile.service_area_demand || profile.potential_demand || 0);
  const bufferRatio = Number(strategy.demand_buffer_ratio ?? 0.15);
  const utilizationTarget = Math.max(0.1, Number(strategy.fleet_utilization_target ?? 0.72));
  const targetHorizonYears = Math.max(1, Number(businessTarget?.planning_horizon_years || 0));
  const strategyHorizonYears = Math.max(1, Number(strategy.forecast_horizon_years || 0));
  const productionLeadTimeDays = Math.max(0, Number(productionProfile?.production_lead_time_days || 0));
  const productionHorizonYears = Math.max(1, Math.ceil(productionLeadTimeDays / 365));
  const forecastHorizonYears = Math.max(targetHorizonYears, strategyHorizonYears, productionHorizonYears);
  const growthRate = Number(profile.growth_rate ?? strategy.growth_rate ?? 0.08);
  const growthFactor = Number(profile.growth_factor || profile.demand_growth_factor || ((1 + growthRate) ** forecastHorizonYears));
  const forecastDailyDemand = baselineDailyDemand * growthFactor;
  const peakDemandRatio = Number(profile.peak_demand_ratio ?? profile.peak_demand_factor ?? 0.15);
  const forecastPeakHourDemand = forecastDailyDemand * peakDemandRatio;
  const averageTripDurationMin = Math.max(1, Number(strategy.average_trip_duration_min || 30));
  const vehicleAvailableHoursPerDay = Math.max(1, Number(strategy.vehicle_available_hours_per_day || 12));
  const targetDailyOrders = Number(businessTarget?.target_service_order_count || 0) / Math.max(1, forecastHorizonYears * 365);
  const targetPeakHourDemand = targetDailyOrders * peakDemandRatio;
  const demandFleetRequirement = Math.ceil((forecastPeakHourDemand * averageTripDurationMin) / 60);
  const targetServiceFleetRequirement = Math.ceil((targetPeakHourDemand * averageTripDurationMin) / 60);
  const targetFleetSize = Math.max(0, Number(businessTarget?.target_fleet_size || 0));
  const productivityFleetRequirement = Math.ceil((forecastDailyDemand * (1 + bufferRatio)) / Math.max(1, (vehicleAvailableHoursPerDay * 60) / averageTripDurationMin) / utilizationTarget);
  const requiredFleetQuantity = Math.max(demandFleetRequirement, targetServiceFleetRequirement, targetFleetSize, productivityFleetRequirement);
  const currentFleetQuantity = robotaxis.filter((item) => item.target_zone_id === profile.target_object_id || item.service_zone_id === profile.target_object_id || profile.target_object_id === "Z-001").length;
  const fleetGapQuantity = Math.max(0, requiredFleetQuantity - currentFleetQuantity);
  const annualProductionCapacity = Math.max(0, Number(productionProfile?.annual_production_capacity || 0));
  const monthlyProductionCapacity = Math.max(0, Number(productionProfile?.monthly_production_capacity || annualProductionCapacity / 12 || 0));
  const deliveryCapacity = Math.max(0, Number(productionProfile?.delivery_capacity || fleetGapQuantity || 0));
  const feasibleProductionQuantity = Math.floor(Math.min(
    annualProductionCapacity * forecastHorizonYears || fleetGapQuantity,
    monthlyProductionCapacity * 12 * forecastHorizonYears || fleetGapQuantity,
    Math.max(deliveryCapacity, fleetGapQuantity),
  ));
  const plannedProductionQuantity = Math.max(0, Math.min(fleetGapQuantity, feasibleProductionQuantity || fleetGapQuantity));
  const productionGapQuantity = Math.max(0, fleetGapQuantity - plannedProductionQuantity);
  const productionStartDate = businessTarget?.forecast_start_date || occurredAt.slice(0, 10);
  const supplyCompletionDate = addDaysIsoDate(productionStartDate, productionLeadTimeDays);
  return {
    forecast_result_id: resultId,
    forecast_id: resultId,
    forecast_name: `${profile.target_object_name || profile.target_object_id}需求预测`,
    forecast_status: LongTermDemandForecastResultStatus.GENERATED,
    forecast_period: `${forecastHorizonYears}年`,
    forecast_strategy_id: strategy.forecast_strategy_id,
    forecast_run_id: runId,
    business_target_id: businessTarget?.business_target_id || null,
    zone_id: profile.target_object_id,
    zone_name: profile.target_object_name,
    demand_profile_id: profile.profile_id,
    supply_production_profile_id: productionProfile?.profile_id || null,
    baseline_daily_demand: roundNumber(baselineDailyDemand, 2),
    growth_factor: roundNumber(growthFactor, 4),
    forecast_daily_demand: roundNumber(forecastDailyDemand, 2),
    forecast_peak_hour_demand: roundNumber(forecastPeakHourDemand, 2),
    expected_robotaxi_demand: roundNumber(forecastDailyDemand, 2),
    target_service_order_count: businessTarget?.target_service_order_count ?? null,
    target_fleet_size: targetFleetSize || null,
    target_asset_utilization_rate: businessTarget?.target_asset_utilization_rate ?? null,
    target_order_fulfillment_rate: businessTarget?.target_order_fulfillment_rate ?? null,
    vehicle_available_hours_per_day: vehicleAvailableHoursPerDay,
    average_trip_duration_min: averageTripDurationMin,
    required_fleet_quantity: requiredFleetQuantity,
    current_fleet_quantity: currentFleetQuantity,
    fleet_gap_quantity: fleetGapQuantity,
    production_lead_time_days: productionLeadTimeDays,
    production_start_date: productionStartDate,
    supply_completion_date: supplyCompletionDate,
    feasible_production_quantity: feasibleProductionQuantity,
    planned_production_quantity: plannedProductionQuantity,
    production_gap_quantity: productionGapQuantity,
    confidence_level: 0.82,
    demand_buffer_ratio: bufferRatio,
    fleet_utilization_target: utilizationTarget,
    business_target_snapshot: businessTarget ? { ...businessTarget } : null,
    demand_profile_snapshot: profile ? { ...profile } : null,
    production_profile_snapshot: productionProfile ? { ...productionProfile } : null,
    created_at: occurredAt,
  };
}

function createFleetAllocationRun({ runId, strategy, runStatus, occurredAt, resultCount, failureReason = null }) {
  return {
    fleet_allocation_run_id: runId,
    fleet_allocation_strategy_id: strategy?.fleet_allocation_strategy_id || null,
    strategy_name: strategy?.strategy_name || null,
    strategy_version: strategy?.strategy_version || null,
    run_status: runStatus,
    target_zone_ids: strategy?.target_zone_ids || [],
    target_ops_center_ids: strategy?.target_ops_center_ids || [],
    started_at: occurredAt,
    completed_at: occurredAt,
    result_count: resultCount,
    failure_reason: failureReason,
    strategy_snapshot: strategy ? { ...strategy } : null,
  };
}

function createProducedRobotaxi({ robotaxiId, productionBatch, opsCenter, occurredAt, index }) {
  const batteryPercent = 100;
  const currentCellId = opsCenter.cell_ids?.[index % Math.max(1, opsCenter.cell_ids.length)] || "C-34-32";
  return createRobotaxi({
    robotaxi_id: robotaxiId,
    fleet_id: `FLEET-${productionBatch.target_zone_id || "NEW"}`,
    model_name: "L4 Robotaxi Standard",
    automation_level: "L4",
    seat_capacity: 4,
    battery_capacity_kwh: 75,
    max_range_km: 400,
    service_type: "PASSENGER_RIDE",
    battery_percent: batteryPercent,
    current_battery_kwh: 75,
    estimated_range_km: 400,
    availability_status: "PENDING_DELIVERY",
    motion_status: "PARKED",
    current_cell_id: currentCellId,
    current_route_id: null,
    current_task_id: null,
    current_order_id: null,
    available_for_dispatch: false,
    production_batch_id: productionBatch.production_batch_id,
    target_zone_id: productionBatch.target_zone_id,
    target_ops_center_id: opsCenter.ops_center_id || null,
    produced_at: occurredAt,
    created_at: occurredAt,
    updated_at: occurredAt,
    lifetime_distance_km: 0,
    lifetime_battery_consumed_kwh: 0,
    lifetime_battery_consumed_percent: 0,
    lifetime_charged_energy_kwh: 0,
    completed_service_order_count: 0,
    completed_cleaning_count: 0,
    completed_charging_count: 0,
    completed_maintenance_count: 0,
  });
}

function createDeliveryReadinessTask({ robotaxiId, deliveryOrder, occurredAt, taskId }) {
  return withLifecycleStatus({
    task_id: taskId,
    task_type: "READINESS_CHECK",
    task_status: "WAITING_ASSIGNMENT",
    trigger_type: "DELIVERY_ORDER",
    trigger_source: "ROBOTAXI_DELIVERY_ORDER",
    trigger_object_type: "robotaxiDeliveryOrder",
    trigger_object_id: deliveryOrder.delivery_order_id,
    robotaxi_id: robotaxiId,
    ops_center_id: deliveryOrder.target_ops_center_id,
    worker_id: null,
    check_result: null,
    issue_type: null,
    created_at: occurredAt,
    updated_at: occurredAt,
  }, {
    objectType: "readinessTask",
    idField: "task_id",
    statusField: "task_status",
    fromStatus: null,
    toStatus: "WAITING_ASSIGNMENT",
    actionType: "READINESS_TASK_CREATE",
    resultType: "READINESS_CREATED",
    occurredAt,
  });
}

function updateRobotaxisForDelivery(robotaxis = [], robotaxiIds = [], patch = {}) {
  const targetIds = new Set(robotaxiIds || []);
  return (robotaxis || []).map((robotaxi) => targetIds.has(robotaxi.robotaxi_id) ? { ...robotaxi, ...patch } : robotaxi);
}

function withLifecycleStatus(item, {
  objectType,
  idField,
  statusField,
  fromStatus,
  toStatus,
  actionType,
  resultType,
  occurredAt,
} = {}) {
  const history = Array.isArray(item?.simulation_status_transition_history) ? item.simulation_status_transition_history : [];
  const nextStatus = toStatus ?? item?.[statusField] ?? null;
  const previousStatus = fromStatus !== undefined ? fromStatus : item?.[statusField] ?? null;
  return {
    ...item,
    simulation_status_transition_history: [
      ...history,
      {
        status_transition_id: `ST-${String(history.length + 1).padStart(4, "0")}`,
        transition_sequence: history.length + 1,
        business_object_type: objectType,
        business_object_id: item?.[idField] || null,
        from_status: previousStatus,
        action_type: actionType,
        result_type: resultType,
        to_status: nextStatus,
        occurred_at: occurredAt,
        simulation_occurred_at: null,
        time_mode: "REAL_TIME",
        trigger_source: "MANUAL_OR_SERVICE",
      },
    ],
  };
}

function resolveNow(context = {}) {
  return typeof context.now === "function" ? context.now() : defaultNow();
}

function resolveRunId(context = {}) {
  return typeof context.nextRunId === "function" ? context.nextRunId() : `LDF-RUN-${Date.now()}`;
}

function resolveResultBaseId(context = {}) {
  return typeof context.nextResultBaseId === "function" ? context.nextResultBaseId() : `LDF-RES-${Date.now()}`;
}

function resolveSupplyPlanId(context = {}) {
  return typeof context.nextSupplyPlanId === "function" ? context.nextSupplyPlanId() : `FPP-${Date.now()}`;
}

function resolveProductionBatchId(context = {}) {
  return typeof context.nextProductionBatchId === "function" ? context.nextProductionBatchId() : `PB-${Date.now()}`;
}

function resolveFleetAllocationRunId(context = {}) {
  return typeof context.nextFleetAllocationRunId === "function" ? context.nextFleetAllocationRunId() : `FAR-${Date.now()}`;
}

function resolveFleetAllocationResultId(context = {}, index = 0) {
  return typeof context.nextFleetAllocationResultId === "function" ? context.nextFleetAllocationResultId(index) : `FAR-RES-${Date.now()}-${index + 1}`;
}

function resolveDeliveryOrderId(context = {}) {
  return typeof context.nextDeliveryOrderId === "function" ? context.nextDeliveryOrderId() : `RDO-${Date.now()}`;
}

function resolveReadinessTaskId(context = {}, index = 0) {
  return typeof context.nextReadinessTaskId === "function" ? context.nextReadinessTaskId(index) : `TASK-RC-${Date.now()}-${index + 1}`;
}

function resolveRobotaxiId(context = {}, existingIds = new Set(), index = 0) {
  if (typeof context.nextRobotaxiId === "function") return context.nextRobotaxiId(index);
  let cursor = existingIds.size + index + 1;
  let robotaxiId = `RTX-${String(cursor).padStart(3, "0")}`;
  while (existingIds.has(robotaxiId)) {
    cursor += 1;
    robotaxiId = `RTX-${String(cursor).padStart(3, "0")}`;
  }
  return robotaxiId;
}

function addDaysIsoDate(isoDateTime, days = 0) {
  const date = new Date(isoDateTime);
  date.setUTCDate(date.getUTCDate() + Math.max(0, Math.floor(Number(days || 0))));
  return date.toISOString().slice(0, 10);
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function roundNumber(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(Number(value || 0) * factor) / factor;
}

function defaultNow() {
  return new Date().toISOString();
}
