import {
  LocationStatus,
  LocationType,
  RoadType,
  RouteStatus,
  ZoneStatus,
  createOperatingLocation,
  createRoute,
  createZone,
} from "../domain/types.js?v=20260527-ol";

const now = "2026-05-27T00:00:00+08:00";
const defaultGrid = {
  rows: 20,
  cols: 32,
  cell_size: 1,
  cell_unit: "grid_unit",
};

const defaultCapabilitiesByType = {
  [LocationType.RESIDENTIAL_AREA]: [true, true, true, true, true, false, false, true],
  [LocationType.OFFICE_AREA]: [true, true, true, false, true, false, false, true],
  [LocationType.METRO_STATION]: [true, true, true, false, true, false, false, true],
  [LocationType.SHOPPING_MALL]: [true, true, true, true, true, false, false, true],
  [LocationType.SCHOOL]: [true, true, true, false, true, false, false, true],
  [LocationType.HOSPITAL]: [true, true, true, false, true, false, false, true],
  [LocationType.PARKING_LOT]: [false, true, true, true, true, true, false, true],
  [LocationType.CHARGING_STATION]: [false, true, true, true, true, true, true, true],
  [LocationType.TRANSPORT_HUB]: [true, true, true, true, true, false, false, true],
  [LocationType.HOTEL]: [true, true, true, true, true, false, false, true],
};

const locationTemplates = [
  ["L-001", "North Residential Gate", LocationType.RESIDENTIAL_AREA, 5, 4],
  ["L-002", "Office Tower Entrance", LocationType.OFFICE_AREA, 12, 3],
  ["L-003", "Central Metro Exit", LocationType.METRO_STATION, 22, 5],
  ["L-004", "East Parking Lot", LocationType.PARKING_LOT, 28, 10],
  ["L-005", "South Charging Station", LocationType.CHARGING_STATION, 23, 17],
  ["L-006", "Community Plaza", LocationType.RESIDENTIAL_AREA, 10, 16],
  ["L-007", "Transit Hub", LocationType.TRANSPORT_HUB, 4, 11],
  ["L-008", "Shopping Mall Entrance", LocationType.SHOPPING_MALL, 16, 10],
  ["L-009", "West Hotel", LocationType.HOTEL, 3, 7],
  ["L-010", "Neighborhood School", LocationType.SCHOOL, 8, 18],
];

const routeTemplates = [
  ["R-001", "L-001", "L-002", RoadType.SECONDARY_ROAD, true],
  ["R-002", "L-002", "L-003", RoadType.MAIN_ROAD, true],
  ["R-003", "L-003", "L-004", RoadType.SECONDARY_ROAD, true],
  ["R-004", "L-004", "L-005", RoadType.CHARGING_ACCESS, true],
  ["R-005", "L-005", "L-006", RoadType.INTERNAL_ROAD, true],
  ["R-006", "L-006", "L-007", RoadType.SECONDARY_ROAD, true],
  ["R-007", "L-007", "L-001", RoadType.MAIN_ROAD, true],
  ["R-008", "L-008", "L-003", RoadType.INTERNAL_ROAD, true],
  ["R-009", "L-008", "L-006", RoadType.SECONDARY_ROAD, true],
  ["R-010", "L-002", "L-008", RoadType.MAIN_ROAD, true],
];

function distanceBetween(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 45);
}

export function createSampleData({ zoneCount = 1, locationCount = 8, pointCount } = {}) {
  const resolvedLocationCount = pointCount ?? locationCount;
  const zones = Array.from({ length: zoneCount }, (_, index) =>
    createZone({
      zone_id: `Z-${String(index + 1).padStart(3, "0")}`,
      zone_name: index === 0 ? "Minimum Operating Zone" : `Operating Zone ${index + 1}`,
      grid: { ...defaultGrid },
      zone_type: "Testing",
      operating_status: ZoneStatus.TESTING,
      service_policy_id: "SP-MIN-001",
      map_area_id: `MAP-ZONE-${index + 1}`,
      created_at: now,
      updated_at: now,
    }),
  );

  const activeZone = zones[0];
  const locations = createLocationTemplates(resolvedLocationCount, activeZone.grid).map(
    ([id, name, type, gridCol, gridRow], index) => createOperatingLocation({
      location_id: id,
      zone_id: activeZone.zone_id,
      location_name: name,
      location_type: type,
      longitude: Number((113.92 + gridCol / 1000).toFixed(6)),
      latitude: Number((22.52 + gridRow / 1000).toFixed(6)),
      grid_col: gridCol,
      grid_row: gridRow,
      x: gridCol + 0.5,
      y: gridRow + 0.5,
      operating_status: LocationStatus.ACTIVE,
      capabilities: createCapabilities(type),
      capacity: type === LocationType.CHARGING_STATION ? 4 : index % 3 + 1,
      demand_weight: createDemandWeight(type),
      service_priority: index % 3 + 1,
      created_at: now,
      updated_at: now,
    }),
  );

  const locationById = new Map(locations.map((location) => [location.location_id, location]));
  const routes = routeTemplates
    .filter(([, startId, endId]) => locationById.has(startId) && locationById.has(endId))
    .map(([id, startId, endId, roadType, isBidirectional]) => {
      const distance = distanceBetween(locationById.get(startId), locationById.get(endId));

      return createRoute({
        route_id: id,
        zone_id: activeZone.zone_id,
        start_location_id: startId,
        end_location_id: endId,
        distance,
        estimated_duration: Math.max(2, Math.round(distance / 420)),
        road_type: roadType,
        route_status: RouteStatus.ACTIVE,
        is_bidirectional: isBidirectional,
        created_at: now,
        updated_at: now,
      });
    });

  return { zones, locations, routes };
}

function createCapabilities(locationType) {
  const [
    canGenerateDemand,
    canPickup,
    canDropoff,
    canWait,
    canTempPark,
    canLongPark,
    canCharge,
    canDispatchTo,
  ] = defaultCapabilitiesByType[locationType];

  return {
    can_generate_demand: canGenerateDemand,
    can_pickup: canPickup,
    can_dropoff: canDropoff,
    can_wait: canWait,
    can_temp_park: canTempPark,
    can_long_park: canLongPark,
    can_charge: canCharge,
    can_dispatch_to: canDispatchTo,
  };
}

function createDemandWeight(locationType) {
  if (locationType === LocationType.OFFICE_AREA || locationType === LocationType.METRO_STATION) return 5;
  if (locationType === LocationType.RESIDENTIAL_AREA || locationType === LocationType.SHOPPING_MALL) return 4;
  if (locationType === LocationType.TRANSPORT_HUB || locationType === LocationType.HOTEL) return 3;
  return 1;
}

function createLocationTemplates(locationCount, grid) {
  if (locationCount <= locationTemplates.length) {
    return locationTemplates.slice(0, locationCount);
  }

  const generated = [...locationTemplates];
  const locationTypes = Object.values(LocationType);
  let col = 2;
  let row = 2;

  while (generated.length < locationCount && row < grid.rows - 1) {
    const locationNo = generated.length + 1;
    generated.push([
      `L-${String(locationNo).padStart(3, "0")}`,
      `Generated Location ${locationNo}`,
      locationTypes[locationNo % locationTypes.length],
      col,
      row,
    ]);

    col += 4;
    if (col >= grid.cols - 1) {
      col = 2;
      row += 3;
    }
  }

  return generated;
}
