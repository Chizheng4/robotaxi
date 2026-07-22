import { CITY_SPATIAL_SCENARIO_ID } from "../../src/data/spatialScenarioInitialization.js";

export function createCitySpatialCatalogFixture() {
  return {
    spatial_scenario_id: CITY_SPATIAL_SCENARIO_ID,
    spatial_catalog_version: "TEST-CITY-SPATIAL-CATALOG-001",
    source_type: "TEST_FIXTURE",
    zones: collection([
      feature("GZ-Z-0001", "zone", "测试运营区域", polygon(113.20, 23.08, 113.32, 23.18), {
        zone_level: "ZONE",
        zone_structure_mode: "FLAT",
      }),
    ]),
    places: collection([
      feature("GZ-P-0003", "place", "测试商业中心", polygon(113.24, 23.11, 113.25, 23.12), {
        zone_id: "GZ-Z-0001",
        place_type: "COMMERCIAL",
      }),
    ]),
    serviceAreas: collection([
      feature("GZ-SA-0001", "serviceArea", "测试商业中心接驳区", polygon(113.248, 23.112, 113.254, 23.118), {
        zone_id: "GZ-Z-0001",
        place_id: "GZ-P-0003",
        service_area_type: "PICKUP_DROPOFF",
      }),
    ]),
    opsCenters: collection([]),
    roads: collection([]),
    robotaxis: collection([]),
    route: collection([]),
  };
}

export function polygon(minLng, minLat, maxLng, maxLat) {
  return {
    type: "Polygon",
    coordinates: [[
      [minLng, minLat], [maxLng, minLat], [maxLng, maxLat], [minLng, maxLat], [minLng, minLat],
    ]],
  };
}

function feature(id, type, name, geometry, extra = {}) {
  return {
    type: "Feature",
    id,
    properties: {
      object_id: id,
      object_type: type,
      object_name: name,
      object_status: "ACTIVE",
      ...extra,
    },
    geometry,
  };
}

function collection(features) {
  return { type: "FeatureCollection", features };
}
