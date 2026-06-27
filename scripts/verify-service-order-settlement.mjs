import assert from "node:assert/strict";
import { cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as realTripTypes from "../src/domain/tripTypes.js";
import { getDisplayValue } from "../src/domain/fieldDictionary.js";

const tempModulePath = join(tmpdir(), `robotaxi-service-order-settlement-${Date.now()}.mjs`);
cpSync(new URL("../src/domain/serviceOrderSettlement.js", import.meta.url), tempModulePath);
const settlement = await import(`file://${tempModulePath}`);

assert.equal(realTripTypes.TripStatus.SETTLING, undefined);
const normalizedLegacyTrip = realTripTypes.normalizeTripRecord({
  trip_id: "TRIP-LEGACY-001",
  trip_status: "SETTLING",
  trip_phase: "DESTINATION",
  created_at: "2026-06-24T00:00:00.000Z",
});
assert.equal(normalizedLegacyTrip.trip_status, "COMPLETED");
assert.equal(normalizedLegacyTrip.trip_phase, "COMPLETED");
assert.equal(getDisplayValue("SETTLING", "order_status"), "结算中");
assert.equal(getDisplayValue("COMPLETED", "trip_status"), "已完成");
assert.equal(getDisplayValue("SETTLING", "trip_status"), "已完成");

const serviceOrderTypes = {
  ServiceOrderStatus: {
    SETTLING: "SETTLING",
    WAITING_PAYMENT: "WAITING_PAYMENT",
  },
  PaymentStatus: {
    WAITING_PAYMENT: "WAITING_PAYMENT",
  },
};

const tripTypes = {
  TripStatus: {
    COMPLETED: "COMPLETED",
    ARRIVED_DESTINATION: "ARRIVED_DESTINATION",
    SETTLING: "SETTLING",
  },
};

const pricingTypes = {
  PricingStage: {
    FINAL: "FINAL",
  },
  PricingResult: {
    SUCCESS: "SUCCESS",
    FAILED: "FAILED",
  },
  PricingFailureReason: {
    PRICING_STRATEGY_NOT_FOUND: "PRICING_STRATEGY_NOT_FOUND",
    PRICING_CONFIG_MISSING: "PRICING_CONFIG_MISSING",
    INVALID_DISTANCE: "INVALID_DISTANCE",
    INVALID_DURATION: "INVALID_DURATION",
  },
  createPricingStrategyRun: (run) => run,
  createPricingDecision: (decision) => decision,
};

const trip = {
  trip_id: "TRIP-TEST-001",
  service_order_id: "SO-TEST-001",
  robotaxi_id: "RTX-001",
  trip_status: "COMPLETED",
  distance_traveled_km: 12.4,
  time_elapsed: "31",
};

const serviceOrder = {
  service_order_id: "SO-TEST-001",
  order_status: "SETTLING",
  order_channel: "OWN_APP_SIMULATED_ORDER",
  customer_id: "CU-001",
  matched_robotaxi_id: "RTX-001",
  trip_id: "TRIP-TEST-001",
  pickup_service_area_id: "SA-001",
  dropoff_service_area_id: "SA-002",
  estimated_distance_km: 10,
  estimated_duration_min: 24,
  quote_base_fare: 12,
  quote_distance_unit_price: 2.4,
  quote_time_unit_price: 0.6,
  quoted_price: 54,
  pricing_breakdown_snapshot: {
    dynamic_multiplier: 1.1,
  },
};

const syncedOrder = settlement.createServiceOrderActualSnapshotFromTrip(
  serviceOrder,
  trip,
  serviceOrderTypes,
  tripTypes,
);
assert.equal(syncedOrder.order_status, "SETTLING");
assert.equal(syncedOrder.trip_total_distance_km, 12.4);
assert.equal(syncedOrder.trip_total_duration_min, 31);

const input = settlement.buildServiceOrderSettlementInput({
  serviceOrder: syncedOrder,
  trip,
  serviceOrderTypes,
  tripTypes,
});
assert.equal(input.failure_reason, null);
assert.equal(input.settlementOrder.fulfillment_distance_km, 12.4);
assert.equal(input.settlementOrder.fulfillment_duration_min, 31);

const strategy = {
  pricing_strategy_id: "DPS-002",
  pricing_algorithm: "BASIC_FINAL_FARE_CALCULATION",
  strategy_status: "ACTIVE",
};

const result = settlement.runFinalFareCalculation({
  strategy,
  serviceOrder: input.settlementOrder,
  pricingStrategyRunId: "DPR-TEST-001",
  pricingDecisionId: "PD-TEST-001",
  createdAt: "2026-06-16T00:00:00.000Z",
  pricingTypes,
});
assert.equal(result.run.run_result, "SUCCESS");
assert.equal(result.run.input_snapshot.fulfillment_distance_source, "TRIP_TOTAL_DISTANCE");
assert.equal(result.run.input_snapshot.fulfillment_duration_source, "TRIP_TIME_ELAPSED");
assert.equal(result.decision.fulfillment_distance_km, 12.4);
assert.equal(result.decision.fulfillment_duration_min, 31);
assert.equal(result.decision.final_price, 66.4);

const settledOrder = settlement.applyServiceOrderSettlementResult({
  order: serviceOrder,
  settlementOrder: input.settlementOrder,
  result,
  serviceOrderTypes,
});
assert.equal(settledOrder.order_status, "WAITING_PAYMENT");
assert.equal(settledOrder.payment_status, "WAITING_PAYMENT");
assert.equal(settledOrder.final_pricing_decision_id, "PD-TEST-001");
assert.equal(settledOrder.final_price, 66.4);

const invalidInput = settlement.buildServiceOrderSettlementInput({
  serviceOrder: { ...syncedOrder, trip_total_distance_km: 0 },
  trip: { ...trip, total_distance_km: 0, distance_traveled_km: 0 },
  serviceOrderTypes,
  tripTypes,
});
assert.equal(invalidInput.failure_reason, "INVALID_ACTUAL_DISTANCE");

console.log("服务订单结算闭环代码级验证通过");
