export const CellType = {
  EMPTY: "EMPTY",
  ROAD: "ROAD",
  PLACE: "PLACE",
  BLOCKED: "BLOCKED",
};

export const RoadType = {
  MAIN_ROAD: "MAIN_ROAD",
  SECONDARY_ROAD: "SECONDARY_ROAD",
  INTERNAL_ROAD: "INTERNAL_ROAD",
  ACCESS_ROAD: "ACCESS_ROAD",
};

export const Status = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  RESTRICTED: "Restricted",
  CLOSED: "Closed",
};

export const NodeType = {
  INTERSECTION: "INTERSECTION",
  ROAD_ENDPOINT: "ROAD_ENDPOINT",
  ENTRANCE_EXIT: "ENTRANCE_EXIT",
  RAMP_NODE: "RAMP_NODE",
  TURNING_POINT: "TURNING_POINT",
};

export const Direction = {
  TWO_WAY: "TWO_WAY",
  ONE_WAY: "ONE_WAY",
};

export const PlaceType = {
  RESIDENTIAL: "RESIDENTIAL",
  OFFICE: "OFFICE",
  COMMERCIAL: "COMMERCIAL",
  SCHOOL: "SCHOOL",
  HOSPITAL: "HOSPITAL",
  METRO_STATION: "METRO_STATION",
  HOTEL: "HOTEL",
  TRANSPORT_HUB: "TRANSPORT_HUB",
  OPS_CENTER: "OPS_CENTER",
};

export const PeakPattern = {
  MORNING_OUTBOUND: "MORNING_OUTBOUND",
  EVENING_INBOUND: "EVENING_INBOUND",
  EVENING_OUTBOUND: "EVENING_OUTBOUND",
  ALL_DAY_STABLE: "ALL_DAY_STABLE",
  WEEKEND_PEAK: "WEEKEND_PEAK",
  EVENT_DRIVEN: "EVENT_DRIVEN",
  LOW_DEMAND: "LOW_DEMAND",
};

export const ZoneLevel = {
  CITY: "CITY",
  OPERATING_REGION: "OPERATING_REGION",
  ZONE: "ZONE",
  SUB_ZONE: "SUB_ZONE",
  MICRO_ZONE: "MICRO_ZONE",
};

export const ZoneType = {
  RESIDENTIAL_ZONE: "RESIDENTIAL_ZONE",
  OFFICE_ZONE: "OFFICE_ZONE",
  COMMERCIAL_ZONE: "COMMERCIAL_ZONE",
  TRANSPORT_ZONE: "TRANSPORT_ZONE",
  MIXED_ZONE: "MIXED_ZONE",
  SUPPORT_ZONE: "SUPPORT_ZONE",
};

export const ZoneStatus = {
  PLANNED: "Planned",
  TESTING: "Testing",
  ACTIVE: "Active",
  RESTRICTED: "Restricted",
  SUSPENDED: "Suspended",
  CLOSED: "Closed",
};

export const RouteStatus = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  BLOCKED: "Blocked",
  DEPRECATED: "Deprecated",
};

export function createMap(map) {
  return map;
}

export function createCell(cell) {
  return cell;
}

export function createRoad(road) {
  return road;
}

export function createRoadNode(roadNode) {
  return roadNode;
}

export function createRoadSegment(roadSegment) {
  return roadSegment;
}

export function createPlace(place) {
  return place;
}

export function createServiceArea(serviceArea) {
  return serviceArea;
}

export function createZone(zone) {
  return zone;
}

export function createRoute(route) {
  return route;
}
