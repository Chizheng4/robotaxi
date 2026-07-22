import {
  CITY_SPATIAL_CATALOG_VERSION,
  CITY_SPATIAL_SCENARIO_ID,
} from "./spatialScenarioInitialization.js?v=20260722-v049-4-0";

const CATALOG_VERSION = CITY_SPATIAL_CATALOG_VERSION;

export const CITY_SPATIAL_CATALOG = Object.freeze({
  spatial_scenario_id: CITY_SPATIAL_SCENARIO_ID,
  spatial_catalog_version: CATALOG_VERSION,
  source_type: "CITY_GEOGRAPHIC_PLANNING",
  zones: collection([]),
  places: collection([]),
  serviceAreas: collection([]),
  opsCenters: collection([]),
  roads: collection([]),
  robotaxis: collection([]),
  route: collection([]),
});

function collection(features) {
  return { type: "FeatureCollection", features };
}
