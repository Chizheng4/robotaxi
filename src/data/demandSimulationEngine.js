import { CustomerStatus } from "../domain/customerTypes.js?v=20260611-v019-1-customer";
import {
  CustomerOriginLocationType,
  DemandSimulationFailureReason,
  DemandSimulationResult,
  createDemandSimulationRun,
} from "../domain/demandSimulationTypes.js?v=20260611-v019-2-demand-simulation";

export function runDemandSimulation({ strategy, data, orderChannel, runId, randomSeed, createdAt }) {
  const random = createSeededRandom(randomSeed);
  const activeCustomers = (data.customers || []).filter((customer) => customer.customer_status === CustomerStatus.ACTIVE);
  if (activeCustomers.length === 0) {
    return createFailedRun({ strategy, orderChannel, runId, randomSeed, createdAt, failureReason: DemandSimulationFailureReason.NO_ACTIVE_CUSTOMER });
  }

  const customer = pickRandom(activeCustomers, random);
  const locationType = pickWeightedLocationType(strategy.location_type_weights, random);
  const origin = chooseOrigin(locationType, data, random);
  if (!origin?.customer_origin_cell_id) {
    return createFailedRun({ strategy, orderChannel, runId, randomSeed, createdAt, customerId: customer.customer_id, locationType, failureReason: getOriginFailureReason(locationType) });
  }

  const pickup = findNearestPickup(origin.customer_origin_cell_id, data, random);
  if (!pickup) {
    return createFailedRun({ strategy, orderChannel, runId, randomSeed, createdAt, customerId: customer.customer_id, locationType, ...origin, failureReason: DemandSimulationFailureReason.NO_AVAILABLE_PICKUP_CELL });
  }

  const dropoff = chooseDropoff(data, pickup.pickup_service_area_id, random);
  if (!dropoff) {
    return createFailedRun({ strategy, orderChannel, runId, randomSeed, createdAt, customerId: customer.customer_id, locationType, ...origin, ...pickup, failureReason: DemandSimulationFailureReason.NO_AVAILABLE_DROPOFF_CELL });
  }

  return createDemandSimulationRun({
    demand_simulation_run_id: runId,
    demand_simulation_strategy_id: strategy.demand_simulation_strategy_id,
    strategy_name: strategy.strategy_name,
    simulation_algorithm: strategy.simulation_algorithm,
    simulation_result: DemandSimulationResult.SUCCESS,
    order_channel: orderChannel,
    customer_id: customer.customer_id,
    customer_origin_location_type: locationType,
    ...origin,
    ...pickup,
    ...dropoff,
    random_seed: randomSeed,
    failure_reason: null,
    created_at: createdAt,
  });
}

function createFailedRun({ strategy, orderChannel, runId, randomSeed, createdAt, customerId = null, locationType = null, failureReason, ...context }) {
  return createDemandSimulationRun({
    demand_simulation_run_id: runId,
    demand_simulation_strategy_id: strategy.demand_simulation_strategy_id,
    strategy_name: strategy.strategy_name,
    simulation_algorithm: strategy.simulation_algorithm,
    simulation_result: DemandSimulationResult.FAILED,
    order_channel: orderChannel,
    customer_id: customerId,
    customer_origin_location_type: locationType,
    customer_origin_place_id: context.customer_origin_place_id || null,
    customer_origin_road_segment_id: context.customer_origin_road_segment_id || null,
    customer_origin_cell_id: context.customer_origin_cell_id || null,
    pickup_service_area_id: context.pickup_service_area_id || null,
    pickup_cell_id: context.pickup_cell_id || null,
    dropoff_service_area_id: context.dropoff_service_area_id || null,
    dropoff_cell_id: context.dropoff_cell_id || null,
    random_seed: randomSeed,
    failure_reason: failureReason,
    created_at: createdAt,
  });
}

function pickWeightedLocationType(weights = {}, random) {
  const entries = [
    [CustomerOriginLocationType.PLACE, Number(weights.PLACE ?? 0.6)],
    [CustomerOriginLocationType.ROAD_SEGMENT, Number(weights.ROAD_SEGMENT ?? 0.3)],
    [CustomerOriginLocationType.CELL, Number(weights.CELL ?? 0.1)],
  ];
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = random() * totalWeight;
  for (const [type, weight] of entries) {
    cursor -= weight;
    if (cursor <= 0) return type;
  }
  return CustomerOriginLocationType.PLACE;
}

function chooseOrigin(locationType, data, random) {
  if (locationType === CustomerOriginLocationType.PLACE) {
    const places = (data.places || []).filter((place) => place.place_status === "Active" && place.cell_ids?.length > 0);
    const place = pickRandom(places, random);
    if (!place) return null;
    return {
      customer_origin_place_id: place.place_id,
      customer_origin_road_segment_id: null,
      customer_origin_cell_id: pickRandom(place.cell_ids, random),
    };
  }

  if (locationType === CustomerOriginLocationType.ROAD_SEGMENT) {
    const segments = (data.roadSegments || []).filter((segment) => segment.segment_status === "ACTIVE" && segment.cell_sequence?.length > 0);
    const segment = pickRandom(segments, random);
    if (!segment) return null;
    return {
      customer_origin_place_id: null,
      customer_origin_road_segment_id: segment.road_segment_id,
      customer_origin_cell_id: pickRandom(segment.cell_sequence, random),
    };
  }

  const cells = (data.cells || []).filter((cell) => cell.traversable);
  const cell = pickRandom(cells, random);
  if (!cell) return null;
  return {
    customer_origin_place_id: null,
    customer_origin_road_segment_id: null,
    customer_origin_cell_id: cell.cell_id,
  };
}

function findNearestPickup(originCellId, data, random) {
  const originCell = getCell(originCellId, data);
  if (!originCell) return null;
  const candidates = getPickupCandidates(data)
    .map((candidate) => ({
      ...candidate,
      distance: manhattanDistance(originCell, getCell(candidate.pickup_cell_id, data)),
    }))
    .filter((candidate) => Number.isFinite(candidate.distance));
  if (candidates.length === 0) return null;
  const nearestDistance = Math.min(...candidates.map((candidate) => candidate.distance));
  const nearest = candidates.filter((candidate) => candidate.distance === nearestDistance);
  const selected = pickRandom(nearest, random);
  return {
    pickup_service_area_id: selected.service_area_id,
    pickup_cell_id: selected.pickup_cell_id,
  };
}

function chooseDropoff(data, pickupServiceAreaId, random) {
  const candidates = getDropoffCandidates(data);
  if (candidates.length === 0) return null;
  const preferred = candidates.filter((candidate) => candidate.service_area_id !== pickupServiceAreaId);
  const selected = pickRandom(preferred.length > 0 ? preferred : candidates, random);
  return {
    dropoff_service_area_id: selected.service_area_id,
    dropoff_cell_id: selected.dropoff_cell_id,
  };
}

function getPickupCandidates(data) {
  return (data.serviceAreas || [])
    .filter((area) => area.service_area_status === "ACTIVE")
    .flatMap((area) => (area.pickup_cell_ids || [])
      .filter((cellId) => isAvailableCell(area, cellId, true))
      .map((cellId) => ({ service_area_id: area.service_area_id, pickup_cell_id: cellId })));
}

function getDropoffCandidates(data) {
  return (data.serviceAreas || [])
    .filter((area) => area.service_area_status === "ACTIVE")
    .flatMap((area) => (area.dropoff_cell_ids || [])
      .filter((cellId) => isAvailableCell(area, cellId, false))
      .map((cellId) => ({ service_area_id: area.service_area_id, dropoff_cell_id: cellId })));
}

function isAvailableCell(area, cellId, checkOccupied) {
  if ((area.unavailable_cell_ids || []).includes(cellId)) return false;
  if (checkOccupied && (area.occupied_cell_ids || []).includes(cellId)) return false;
  return true;
}

function getCell(cellId, data) {
  return (data.cells || []).find((cell) => cell.cell_id === cellId);
}

function manhattanDistance(left, right) {
  if (!left || !right) return Infinity;
  return Math.abs(left.row - right.row) + Math.abs(left.col - right.col);
}

function pickRandom(items, random) {
  if (!items || items.length === 0) return null;
  return items[Math.floor(random() * items.length)];
}

function getOriginFailureReason(locationType) {
  if (locationType === CustomerOriginLocationType.PLACE) return DemandSimulationFailureReason.NO_AVAILABLE_PLACE;
  if (locationType === CustomerOriginLocationType.ROAD_SEGMENT) return DemandSimulationFailureReason.NO_AVAILABLE_ROAD_SEGMENT;
  return DemandSimulationFailureReason.CUSTOMER_LOCATION_INVALID;
}

function createSeededRandom(seed) {
  let state = hashSeed(seed || `${Date.now()}`);
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function hashSeed(seed) {
  return String(seed).split("").reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 2166136261);
}
