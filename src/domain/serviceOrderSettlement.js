export function buildServiceOrderSettlementInput({
  serviceOrder,
  trip,
  serviceOrderTypes,
  tripTypes,
}) {
  if (!serviceOrder) {
    return {
      settlementOrder: null,
      failure_reason: "SERVICE_ORDER_NOT_FOUND",
    };
  }

  if (!trip) {
    return {
      settlementOrder: null,
      failure_reason: "TRIP_NOT_FOUND",
    };
  }

  if (serviceOrder.order_status !== serviceOrderTypes.ServiceOrderStatus.SETTLING) {
    return {
      settlementOrder: null,
      failure_reason: "SERVICE_ORDER_NOT_SETTLING",
    };
  }

  if (trip.trip_status !== tripTypes.TripStatus.COMPLETED) {
    return {
      settlementOrder: null,
      failure_reason: "TRIP_NOT_COMPLETED",
    };
  }

  const fulfillmentDistanceKm = Number(trip.total_distance_km || trip.distance_traveled_km || serviceOrder.trip_total_distance_km);
  const fulfillmentDurationMin = parseElapsedMinutes(trip.time_elapsed || serviceOrder.trip_total_duration_min);

  if (!Number.isFinite(fulfillmentDistanceKm) || fulfillmentDistanceKm <= 0) {
    return {
      settlementOrder: null,
      failure_reason: "INVALID_ACTUAL_DISTANCE",
    };
  }

  if (!Number.isFinite(fulfillmentDurationMin) || fulfillmentDurationMin <= 0) {
    return {
      settlementOrder: null,
      failure_reason: "INVALID_ACTUAL_DURATION",
    };
  }

  return {
    settlementOrder: {
      ...serviceOrder,
      trip_id: trip.trip_id,
      matched_robotaxi_id: serviceOrder.matched_robotaxi_id || trip.robotaxi_id || null,
      trip_total_distance_km: fulfillmentDistanceKm,
      trip_total_duration_min: fulfillmentDurationMin,
      fulfillment_distance_km: fulfillmentDistanceKm,
      fulfillment_duration_min: fulfillmentDurationMin,
      final_distance_source: "TRIP_TOTAL_DISTANCE",
      final_duration_source: "TRIP_TIME_ELAPSED",
    },
    failure_reason: null,
  };
}

export function runFinalFareCalculation({
  strategy,
  serviceOrder,
  pricingStrategyRunId,
  pricingDecisionId,
  createdAt,
  pricingTypes,
}) {
  const fulfillmentDistanceKm = Number(serviceOrder?.fulfillment_distance_km ?? serviceOrder?.trip_total_distance_km ?? 0);
  const fulfillmentDurationMin = Number(serviceOrder?.fulfillment_duration_min ?? serviceOrder?.trip_total_duration_min ?? 0);
  const hasStrategy = strategy && strategy.strategy_status === "ACTIVE";
  const pricingSnapshot = serviceOrder?.pricing_breakdown_snapshot || {};
  const distanceUnitPrice = Number(serviceOrder?.quote_distance_unit_price ?? pricingSnapshot.distance_unit_price);
  const timeUnitPrice = Number(serviceOrder?.quote_time_unit_price ?? pricingSnapshot.time_unit_price);
  const baseFare = Number(serviceOrder?.quote_base_fare ?? pricingSnapshot.base_fare);
  const dynamicMultiplier = Number(pricingSnapshot.dynamic_multiplier ?? 1);
  const hasPricingInputs = [baseFare, distanceUnitPrice, timeUnitPrice, dynamicMultiplier].every(Number.isFinite);
  const failureReason = !hasStrategy
    ? pricingTypes.PricingFailureReason.PRICING_STRATEGY_NOT_FOUND
    : !hasPricingInputs
      ? pricingTypes.PricingFailureReason.PRICING_CONFIG_MISSING
      : fulfillmentDistanceKm <= 0
        ? pricingTypes.PricingFailureReason.INVALID_DISTANCE
        : fulfillmentDurationMin <= 0
          ? pricingTypes.PricingFailureReason.INVALID_DURATION
          : null;
  const success = !failureReason;
  const distanceFee = roundMoney(fulfillmentDistanceKm * distanceUnitPrice);
  const timeFee = roundMoney(fulfillmentDurationMin * timeUnitPrice);
  const basePrice = roundMoney(baseFare + distanceFee + timeFee);
  const finalPrice = roundMoney(basePrice * dynamicMultiplier);
  const run = pricingTypes.createPricingStrategyRun({
    pricing_strategy_run_id: pricingStrategyRunId,
    pricing_strategy_id: strategy?.pricing_strategy_id || null,
    pricing_algorithm: strategy?.pricing_algorithm || null,
    service_order_id: serviceOrder?.service_order_id || null,
    pricing_stage: pricingTypes.PricingStage.FINAL,
    input_snapshot: {
      fulfillment_distance_km: fulfillmentDistanceKm,
      fulfillment_duration_min: fulfillmentDurationMin,
      fulfillment_distance_source: serviceOrder?.final_distance_source || "TRIP_TOTAL_DISTANCE",
      fulfillment_duration_source: serviceOrder?.final_duration_source || "TRIP_TIME_ELAPSED",
      trip_id: serviceOrder?.trip_id || null,
      quote_base_fare: serviceOrder?.quote_base_fare,
      quote_distance_unit_price: serviceOrder?.quote_distance_unit_price,
      quote_time_unit_price: serviceOrder?.quote_time_unit_price,
      quote_dynamic_multiplier: dynamicMultiplier,
      quoted_price: serviceOrder?.quoted_price,
    },
    output_snapshot: success ? { final_price: finalPrice, base_price: basePrice, fulfillment_distance_km: fulfillmentDistanceKm, fulfillment_duration_min: fulfillmentDurationMin, distance_fee: distanceFee, time_fee: timeFee, dynamic_multiplier: dynamicMultiplier } : null,
    run_result: success ? pricingTypes.PricingResult.SUCCESS : pricingTypes.PricingResult.FAILED,
    failure_reason: failureReason,
    created_at: createdAt,
  });

  return {
    run,
    decision: success ? pricingTypes.createPricingDecision({
      pricing_decision_id: pricingDecisionId,
      pricing_strategy_run_id: pricingStrategyRunId,
      pricing_strategy_id: strategy.pricing_strategy_id,
      pricing_algorithm: strategy.pricing_algorithm,
      service_order_id: serviceOrder.service_order_id,
      order_channel: serviceOrder.order_channel,
      pickup_service_area_id: serviceOrder.pickup_service_area_id,
      dropoff_service_area_id: serviceOrder.dropoff_service_area_id,
      estimated_distance_km: serviceOrder.estimated_distance_km,
      estimated_duration_min: serviceOrder.estimated_duration_min,
      actual_distance_km: null,
      actual_duration_min: null,
      fulfillment_distance_km: fulfillmentDistanceKm,
      fulfillment_duration_min: fulfillmentDurationMin,
      base_fare: baseFare,
      distance_unit_price: distanceUnitPrice,
      time_unit_price: timeUnitPrice,
      distance_fee: distanceFee,
      time_fee: timeFee,
      base_price: basePrice,
      dynamic_multiplier: dynamicMultiplier,
      estimated_price: serviceOrder.estimated_price,
      quoted_price: serviceOrder.quoted_price,
      final_price: finalPrice,
      pricing_stage: pricingTypes.PricingStage.FINAL,
      pricing_result: pricingTypes.PricingResult.SUCCESS,
      pricing_breakdown_snapshot: { final_price: finalPrice, base_price: basePrice, fulfillment_distance_km: fulfillmentDistanceKm, fulfillment_duration_min: fulfillmentDurationMin, distance_fee: distanceFee, time_fee: timeFee, dynamic_multiplier: dynamicMultiplier },
      pricing_explanation: "最终费用由履约距离、履约时长、预估价格快照和最终费用计算策略生成。",
      failure_reason: null,
      created_at: createdAt,
    }) : null,
  };
}

export function applyServiceOrderSettlementResult({
  order,
  settlementOrder,
  result,
  serviceOrderTypes,
}) {
  return {
    ...order,
    trip_id: settlementOrder.trip_id,
    order_status: result.decision ? serviceOrderTypes.ServiceOrderStatus.WAITING_PAYMENT : order.order_status,
    payment_status: result.decision ? serviceOrderTypes.PaymentStatus.WAITING_PAYMENT : order.payment_status,
    trip_total_distance_km: settlementOrder.trip_total_distance_km,
    trip_total_duration_min: settlementOrder.trip_total_duration_min,
    final_pricing_decision_id: result.decision?.pricing_decision_id || order.final_pricing_decision_id,
    final_price: result.decision?.final_price ?? order.final_price,
    pricing_explanation: result.decision?.pricing_explanation || order.pricing_explanation,
    failure_reason: result.decision ? null : result.run.failure_reason,
  };
}

export function createServiceOrderActualSnapshotFromTrip(order, trip, serviceOrderTypes, tripTypes) {
  const shouldPersistActuals = trip && [
    tripTypes.TripStatus.ARRIVED_DESTINATION,
    tripTypes.TripStatus.COMPLETED,
  ].includes(trip.trip_status);

  if (!shouldPersistActuals) {
    return {
      ...order,
      trip_id: trip?.trip_id || order.trip_id,
    };
  }

  return {
    ...order,
    trip_id: trip.trip_id,
    order_status: trip.trip_status === tripTypes.TripStatus.COMPLETED
      ? serviceOrderTypes.ServiceOrderStatus.SETTLING
      : order.order_status,
    trip_total_distance_km: Number(trip.total_distance_km || trip.distance_traveled_km || 0),
    trip_total_duration_min: parseElapsedMinutes(trip.time_elapsed),
    failure_reason: null,
  };
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function parseElapsedMinutes(elapsed) {
  if (Number.isFinite(Number(elapsed))) return Number(elapsed);
  const parts = String(elapsed || "0").split(":").map((part) => Number.parseInt(part, 10) || 0);
  if (parts.length >= 3) return parts[0] * 60 + parts[1] + Math.ceil(parts[2] / 60);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}
