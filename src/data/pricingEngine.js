import {
  PricingFailureReason,
  PricingResult,
  PricingStage,
  createPricingDecision,
  createPricingStrategyRun,
} from "../domain/pricingTypes.js?v=20260611-v019-4-pricing";

const DEFAULT_CELL_TRAVEL_SECONDS = 6;

export function runPricingEstimate({ strategy, serviceOrder, data, pricingStrategyRunId, pricingDecisionId, createdAt, routeEstimate = null }) {
  if (!strategy || strategy.strategy_status !== "ACTIVE") {
    return createFailedResult({ strategy, serviceOrder, pricingStrategyRunId, createdAt, failureReason: PricingFailureReason.PRICING_STRATEGY_NOT_FOUND });
  }
  if (!hasValidConfig(strategy)) {
    return createFailedResult({ strategy, serviceOrder, pricingStrategyRunId, createdAt, failureReason: PricingFailureReason.PRICING_CONFIG_MISSING });
  }

  const estimate = routeEstimate || estimateRoute(data, serviceOrder.pickup_cell_id, serviceOrder.dropoff_cell_id);
  if (!estimate) {
    return createFailedResult({ strategy, serviceOrder, pricingStrategyRunId, createdAt, failureReason: PricingFailureReason.ROUTE_ESTIMATION_FAILED });
  }

  const distanceFee = roundMoney(estimate.estimated_distance_km * strategy.distance_unit_price);
  const timeFee = roundMoney(estimate.estimated_duration_min * strategy.time_unit_price);
  const basePrice = roundMoney(strategy.base_fare + distanceFee + timeFee);
  const dynamicMultiplier = roundFactor(
    strategy.supply_demand_multiplier *
    strategy.time_period_multiplier *
    strategy.service_area_multiplier *
    strategy.channel_multiplier
  );
  const quotedPrice = roundMoney(basePrice * dynamicMultiplier);
  const pricingBreakdown = {
    price_estimation_route_id: estimate.route_id || null,
    route_step_count: estimate.route_step_count ?? null,
    cell_travel_seconds: estimate.cell_travel_seconds || DEFAULT_CELL_TRAVEL_SECONDS,
    base_fare: strategy.base_fare,
    estimated_distance_km: estimate.estimated_distance_km,
    distance_unit_price: strategy.distance_unit_price,
    distance_fee: distanceFee,
    estimated_duration_min: estimate.estimated_duration_min,
    time_unit_price: strategy.time_unit_price,
    time_fee: timeFee,
    base_price: basePrice,
    dynamic_multiplier: dynamicMultiplier,
    estimated_price: quotedPrice,
    quoted_price: quotedPrice,
  };
  const run = createPricingStrategyRun({
    pricing_strategy_run_id: pricingStrategyRunId,
    pricing_strategy_id: strategy.pricing_strategy_id,
    pricing_algorithm: strategy.pricing_algorithm,
    service_order_id: serviceOrder.service_order_id,
    pricing_stage: PricingStage.ESTIMATE,
    input_snapshot: {
      pickup_cell_id: serviceOrder.pickup_cell_id,
      dropoff_cell_id: serviceOrder.dropoff_cell_id,
      order_channel: serviceOrder.order_channel,
      price_estimation_route_id: estimate.route_id || null,
      route_step_count: estimate.route_step_count ?? null,
      cell_travel_seconds: estimate.cell_travel_seconds || DEFAULT_CELL_TRAVEL_SECONDS,
    },
    output_snapshot: pricingBreakdown,
    run_result: PricingResult.SUCCESS,
    failure_reason: null,
    created_at: createdAt,
  });
  const decision = createPricingDecision({
    pricing_decision_id: pricingDecisionId,
    pricing_strategy_run_id: pricingStrategyRunId,
    pricing_strategy_id: strategy.pricing_strategy_id,
    pricing_algorithm: strategy.pricing_algorithm,
    service_order_id: serviceOrder.service_order_id,
    order_channel: serviceOrder.order_channel,
    pickup_service_area_id: serviceOrder.pickup_service_area_id,
    dropoff_service_area_id: serviceOrder.dropoff_service_area_id,
    price_estimation_route_id: estimate.route_id || null,
    estimated_distance_km: estimate.estimated_distance_km,
    estimated_duration_min: estimate.estimated_duration_min,
    actual_distance_km: null,
    actual_duration_min: null,
    fulfillment_distance_km: null,
    fulfillment_duration_min: null,
    base_fare: strategy.base_fare,
    distance_unit_price: strategy.distance_unit_price,
    time_unit_price: strategy.time_unit_price,
    distance_fee: distanceFee,
    time_fee: timeFee,
    base_price: basePrice,
    dynamic_multiplier: dynamicMultiplier,
    estimated_price: quotedPrice,
    quoted_price: quotedPrice,
    final_price: null,
    pricing_stage: PricingStage.ESTIMATE,
    pricing_result: PricingResult.SUCCESS,
    pricing_breakdown_snapshot: pricingBreakdown,
    pricing_explanation: "本次价格由价格预估路径距离、预估时间、起步价和当前动态系数组成。",
    failure_reason: null,
    created_at: createdAt,
  });
  return { run, decision };
}

function createFailedResult({ strategy, serviceOrder, pricingStrategyRunId, createdAt, failureReason }) {
  return {
    run: createPricingStrategyRun({
      pricing_strategy_run_id: pricingStrategyRunId,
      pricing_strategy_id: strategy?.pricing_strategy_id || null,
      pricing_algorithm: strategy?.pricing_algorithm || null,
      service_order_id: serviceOrder?.service_order_id || null,
      pricing_stage: PricingStage.ESTIMATE,
      input_snapshot: serviceOrder ? {
        pickup_cell_id: serviceOrder.pickup_cell_id,
        dropoff_cell_id: serviceOrder.dropoff_cell_id,
        order_channel: serviceOrder.order_channel,
      } : null,
      output_snapshot: null,
      run_result: PricingResult.FAILED,
      failure_reason: failureReason,
      created_at: createdAt,
    }),
    decision: null,
  };
}

function hasValidConfig(strategy) {
  return ["base_fare", "distance_unit_price", "time_unit_price", "supply_demand_multiplier", "time_period_multiplier", "service_area_multiplier", "channel_multiplier"]
    .every((key) => Number.isFinite(Number(strategy[key])));
}

function estimateRoute(data, pickupCellId, dropoffCellId) {
  const pickup = (data.cells || []).find((cell) => cell.cell_id === pickupCellId);
  const dropoff = (data.cells || []).find((cell) => cell.cell_id === dropoffCellId);
  if (!pickup || !dropoff) return null;
  const cellSizeM = data.maps?.[0]?.cell_size_m || 50;
  const stepCount = Math.abs(pickup.row - dropoff.row) + Math.abs(pickup.col - dropoff.col);
  const estimatedDistanceKm = Number(((Math.max(1, stepCount) * cellSizeM) / 1000).toFixed(2));
  const estimatedDurationMin = Math.max(1, Math.ceil((Math.max(1, stepCount) * DEFAULT_CELL_TRAVEL_SECONDS) / 60));
  return {
    estimated_distance_km: estimatedDistanceKm,
    estimated_duration_min: estimatedDurationMin,
    route_step_count: Math.max(1, stepCount),
    cell_travel_seconds: DEFAULT_CELL_TRAVEL_SECONDS,
  };
}

function roundMoney(value) {
  return Number(Number(value).toFixed(2));
}

function roundFactor(value) {
  return Number(Number(value).toFixed(3));
}
