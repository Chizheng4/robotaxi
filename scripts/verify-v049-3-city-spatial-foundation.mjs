import assert from "node:assert/strict";
import { initializeMapSpace } from "../src/data/mapInitialization.js";
import { CITY_SPATIAL_CATALOG } from "../src/data/citySpatialCatalog.js";
import { GEOSPATIAL_MAP_DATASET } from "../src/data/geospatialReferenceData.js";
import { CITY_SPATIAL_SCENARIO_ID, GRID_SPATIAL_SCENARIO_ID } from "../src/data/spatialScenarioInitialization.js";
import { createCityGeographicScene } from "../src/services/geospatialCatalogService.js";
import { createDraft, publishValidatedPlan, validateDraft } from "../src/services/operatingSpatialPlanService.js";

const gridData = initializeMapSpace();
const gridSnapshot = JSON.stringify({
  activeSpatialScenarioId: gridData.activeSpatialScenarioId,
  zones: gridData.zones,
  places: gridData.places,
  serviceAreas: gridData.serviceAreas,
  orders: gridData.orders,
  tasks: gridData.tasks,
});
assert.equal(gridData.activeSpatialScenarioId, GRID_SPATIAL_SCENARIO_ID);

const baseScene = createCityGeographicScene({ catalog: CITY_SPATIAL_CATALOG, plans: [] }, GEOSPATIAL_MAP_DATASET);
assert.equal(baseScene.spatialScenarioId, CITY_SPATIAL_SCENARIO_ID);
assert.ok(baseScene.zones.features.every((feature) => feature.properties.zone_level === "ZONE"));
assert.ok(baseScene.places.features.every((feature) => feature.properties.zone_id && feature.properties.place_type));
assert.ok(baseScene.serviceAreas.features.every((feature) => feature.properties.zone_id && feature.properties.place_id));
assert.ok(baseScene.opsCenters.features.every((feature) => feature.properties.place_id));

const factoryGeometry = polygon(113.242, 23.112, 113.246, 23.116);
const factoryDraft = createDraft({
  plans: [],
  catalog: baseScene,
  dataset: GEOSPATIAL_MAP_DATASET,
  spatialScenarioId: CITY_SPATIAL_SCENARIO_ID,
  target: {
    target_object_type: "PLACE",
    target_object_name: "广州示范生产工厂",
    source_object_exists: false,
    zone_id: "Z-001",
    place_type: "FACTORY",
  },
  geometry: factoryGeometry,
  now: "2026-07-22T00:00:00.000Z",
});
assert.match(factoryDraft.spatial_plan_features[0].target_object_id, /^GZ-P-/);
const validatedFactory = validateDraft(factoryDraft, { dataset: GEOSPATIAL_MAP_DATASET, catalog: baseScene });
assert.equal(validatedFactory.validation_status, "VALID", validatedFactory.validation_issues.join("；"));
assert.equal(validatedFactory.impact_summary.simulation_runtime_changed, false);
assert.equal(validatedFactory.impact_summary.pending_initialization_count, 1);
const factoryPublication = publishValidatedPlan(validatedFactory, { plans: [], now: "2026-07-22T00:01:00.000Z" });
const factoryScene = createCityGeographicScene({ catalog: CITY_SPATIAL_CATALOG, plans: factoryPublication.plans }, GEOSPATIAL_MAP_DATASET);
const factory = factoryScene.places.features.find((feature) => feature.properties.object_name === "广州示范生产工厂");
assert.equal(factory.properties.place_type, "FACTORY");
assert.equal(factory.properties.zone_id, "Z-001");

const subZoneDraft = createDraft({
  plans: factoryPublication.plans,
  catalog: factoryScene,
  dataset: GEOSPATIAL_MAP_DATASET,
  spatialScenarioId: CITY_SPATIAL_SCENARIO_ID,
  target: {
    target_object_type: "ZONE",
    target_object_name: "核心服务子区域",
    source_object_exists: false,
    zone_level: "SUB_ZONE",
    parent_zone_id: "Z-001",
  },
  geometry: polygon(113.230, 23.120, 113.245, 23.135),
});
const validatedSubZone = validateDraft(subZoneDraft, { dataset: GEOSPATIAL_MAP_DATASET, catalog: factoryScene });
assert.equal(validatedSubZone.validation_status, "VALID", validatedSubZone.validation_issues.join("；"));
const subZonePublication = publishValidatedPlan(validatedSubZone, { plans: factoryPublication.plans });
const twoLevelScene = createCityGeographicScene({ catalog: CITY_SPATIAL_CATALOG, plans: subZonePublication.plans }, GEOSPATIAL_MAP_DATASET);
assert.equal(twoLevelScene.zones.features.find((feature) => feature.properties.object_id === "Z-001").properties.zone_structure_mode, "TWO_LEVEL");
assert.equal(twoLevelScene.zones.features.find((feature) => feature.properties.object_name === "核心服务子区域").properties.parent_zone_id, "Z-001");

const invalidThirdLevel = createDraft({
  plans: factoryPublication.plans,
  catalog: factoryScene,
  dataset: GEOSPATIAL_MAP_DATASET,
  spatialScenarioId: CITY_SPATIAL_SCENARIO_ID,
  target: {
    target_object_type: "ZONE",
    target_object_name: "无效三级区域",
    zone_level: "MICRO_ZONE",
  },
  geometry: polygon(113.231, 23.121, 113.235, 23.125),
});
const invalidResult = validateDraft(invalidThirdLevel, { dataset: GEOSPATIAL_MAP_DATASET, catalog: factoryScene });
assert.equal(invalidResult.validation_status, "INVALID");
assert.ok(invalidResult.validation_issues.some((issue) => issue.includes("只支持一级区域或二级子区域")));

assert.equal(JSON.stringify({
  activeSpatialScenarioId: gridData.activeSpatialScenarioId,
  zones: gridData.zones,
  places: gridData.places,
  serviceAreas: gridData.serviceAreas,
  orders: gridData.orders,
  tasks: gridData.tasks,
}), gridSnapshot, "城市空间对象发布不得改写网格业务事实");

console.log("v049.3 城市空间底层对象与网格运行隔离验证通过");

function polygon(minLng, minLat, maxLng, maxLat) {
  return {
    type: "Polygon",
    coordinates: [[
      [minLng, minLat],
      [maxLng, minLat],
      [maxLng, maxLat],
      [minLng, maxLat],
      [minLng, minLat],
    ]],
  };
}
