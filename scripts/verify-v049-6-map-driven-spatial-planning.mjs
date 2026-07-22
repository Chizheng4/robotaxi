import assert from "node:assert/strict";
import fs from "node:fs";
import { CITY_SPATIAL_CATALOG } from "../src/data/citySpatialCatalog.js";
import { GEOSPATIAL_MAP_DATASET } from "../src/data/geospatialReferenceData.js";
import { CITY_SPATIAL_SCENARIO_ID } from "../src/data/spatialScenarioInitialization.js";
import { createCityGeographicScene } from "../src/services/geospatialCatalogService.js";
import { createDraft, publishValidatedPlan, validateDraft } from "../src/services/operatingSpatialPlanService.js";
import { inferSpatialRelationships, resolvePlanningContext } from "../src/services/spatialPlanningContextService.js";
import { polygon } from "./fixtures/city-spatial-catalog.mjs";

assert.equal(CITY_SPATIAL_CATALOG.zones.features.length, 0);
assert.equal(CITY_SPATIAL_CATALOG.places.features.length, 0);
assert.equal(CITY_SPATIAL_CATALOG.serviceAreas.features.length, 0);
assert.equal(resolvePlanningContext({ zoom: 8, catalog: CITY_SPATIAL_CATALOG }).recommended_target_type, "ZONE");
assert.equal(resolvePlanningContext({ zoom: 13, catalog: CITY_SPATIAL_CATALOG }).recommended_target_type, "PLACE");
assert.equal(resolvePlanningContext({ zoom: 15, catalog: CITY_SPATIAL_CATALOG }).recommended_target_type, "SERVICE_AREA");

let plans = [];
let scene = createCityGeographicScene({ catalog: CITY_SPATIAL_CATALOG, plans }, GEOSPATIAL_MAP_DATASET);

({ plans, scene } = publishObject({
  plans,
  scene,
  targetType: "ZONE",
  name: "广州测试运营区域",
  geometry: polygon(113.23, 23.10, 113.28, 23.14),
  extra: { zone_structure_mode: "FLAT" },
}));
assert.equal(scene.zones.features.length, 1);

({ plans, scene } = publishObject({
  plans,
  scene,
  targetType: "ZONE",
  name: "核心服务子区域",
  geometry: polygon(113.24, 23.105, 113.275, 23.13),
}));
const subZone = scene.zones.features.find((feature) => feature.properties.zone_level === "SUB_ZONE");
const parentZone = scene.zones.features.find((feature) => feature.properties.zone_level === "ZONE");
assert.equal(subZone.properties.parent_zone_id, parentZone.properties.object_id);
assert.equal(parentZone.properties.zone_structure_mode, "TWO_LEVEL");

({ plans, scene } = publishObject({
  plans,
  scene,
  targetType: "PLACE",
  name: "珠江新城办公区",
  geometry: polygon(113.255, 23.112, 113.266, 23.123),
  extra: { place_type: "OFFICE" },
}));
const place = scene.places.features[0];
assert.equal(place.properties.zone_id, subZone.properties.object_id);

({ plans, scene } = publishObject({
  plans,
  scene,
  targetType: "SERVICE_AREA",
  name: "珠江新城接驳区",
  geometry: polygon(113.264, 23.114, 113.270, 23.121),
  extra: { service_area_type: "PICKUP_DROPOFF" },
}));
const serviceArea = scene.serviceAreas.features[0];
assert.equal(serviceArea.properties.place_id, place.properties.object_id);
assert.equal(serviceArea.properties.zone_id, subZone.properties.object_id);

const conflict = inferSpatialRelationships({
  targetType: "PLACE",
  geometry: polygon(113.26, 23.118, 113.279, 23.135),
  catalog: scene,
});
assert.equal(conflict.inference_status, "REQUIRES_ADJUSTMENT");
assert.ok(conflict.conflict_object_refs.length > 0);

const mainSource = fs.readFileSync("src/main.jsx", "utf8");
const adapterSource = fs.readFileSync("src/ui/geospatialMapAdapter.js", "utf8");
assert(mainSource.includes("resolvePlanningContext"), "规划编辑器必须消费地图视角上下文");
assert(mainSource.includes("inferSpatialRelationships"), "空间归属必须由几何服务自动推断");
assert(!mainSource.includes("请选择直接归属区域"), "不得要求用户手工拼接空间归属");
assert(adapterSource.includes("onViewChange"), "地图适配器必须向规划服务提供统一相机视角");
assert(adapterSource.includes('feature-state", "hovered"'), "发布区域必须具有统一悬停视觉状态");

console.log("v049.6 地图驱动城市空间规划验证通过");

function publishObject({ plans: currentPlans, scene: currentScene, targetType, name, geometry, extra = {} }) {
  const inference = inferSpatialRelationships({ targetType, geometry, catalog: currentScene });
  assert.equal(inference.inference_status, "CONFIRMED", inference.issues.join("；"));
  const draft = createDraft({
    plans: currentPlans,
    catalog: currentScene,
    dataset: GEOSPATIAL_MAP_DATASET,
    spatialScenarioId: CITY_SPATIAL_SCENARIO_ID,
    target: {
      target_object_type: targetType,
      target_object_name: name,
      source_object_exists: false,
      ...extra,
      ...inference.relationships,
      relationship_inference_status: inference.inference_status,
      contained_object_refs: inference.contained_object_refs,
      conflict_object_refs: inference.conflict_object_refs,
    },
    geometry,
  });
  const validated = validateDraft(draft, { dataset: GEOSPATIAL_MAP_DATASET, catalog: currentScene });
  assert.equal(validated.validation_status, "VALID", validated.validation_issues.join("；"));
  const published = publishValidatedPlan(validated, { plans: currentPlans });
  return {
    plans: published.plans,
    scene: createCityGeographicScene({ catalog: CITY_SPATIAL_CATALOG, plans: published.plans }, GEOSPATIAL_MAP_DATASET),
  };
}
