export const ZoneStatus = {
  PLANNED: "Planned",
  TESTING: "Testing",
  ACTIVE: "Active",
  RESTRICTED: "Restricted",
  SUSPENDED: "Suspended",
  CLOSED: "Closed",
};

export const LocationType = {
  RESIDENTIAL_AREA: "RESIDENTIAL_AREA",
  OFFICE_AREA: "OFFICE_AREA",
  METRO_STATION: "METRO_STATION",
  SHOPPING_MALL: "SHOPPING_MALL",
  SCHOOL: "SCHOOL",
  HOSPITAL: "HOSPITAL",
  PARKING_LOT: "PARKING_LOT",
  CHARGING_STATION: "CHARGING_STATION",
  TRANSPORT_HUB: "TRANSPORT_HUB",
  HOTEL: "HOTEL",
};

export const LocationStatus = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  RESTRICTED: "Restricted",
  DISABLED: "Disabled",
};

export const RoadType = {
  MAIN_ROAD: "MAIN_ROAD",
  SECONDARY_ROAD: "SECONDARY_ROAD",
  INTERNAL_ROAD: "INTERNAL_ROAD",
  PARKING_ACCESS: "PARKING_ACCESS",
  CHARGING_ACCESS: "CHARGING_ACCESS",
};

export const RouteStatus = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  RESTRICTED: "Restricted",
  CLOSED: "Closed",
};

export function createZone(zone) {
  return zone;
}

export function createOperatingLocation(location) {
  return location;
}

export function createRoute(route) {
  return route;
}
