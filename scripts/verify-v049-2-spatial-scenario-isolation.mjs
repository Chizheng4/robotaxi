import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { initializeMapSpace } from "../src/data/mapInitialization.js";
import { CITY_SPATIAL_CATALOG } from "../src/data/citySpatialCatalog.js";
import { GEOSPATIAL_MAP_DATASET } from "../src/data/geospatialReferenceData.js";
import {
  CITY_SPATIAL_SCENARIO_ID,
  GRID_SPATIAL_SCENARIO_ID,
} from "../src/data/spatialScenarioInitialization.js";
import {
  canUseScenarioForBusinessRuntime,
  getActiveBusinessScenario,
  getCityGeographicScenario,
  getGridSimulationScenario,
} from "../src/services/spatialScenarioService.js";
import { createCityGeographicScene } from "../src/services/geospatialCatalogService.js";
import { createDraft, publishValidatedPlan, validateDraft } from "../src/services/operatingSpatialPlanService.js";
import { createCitySpatialCatalogFixture } from "./fixtures/city-spatial-catalog.mjs";

const data = initializeMapSpace();
const grid = getGridSimulationScenario(data);
const city = getCityGeographicScenario(data);
assert.equal(data.spatialScenarios.length, 2);
assert.equal(getActiveBusinessScenario(data).spatial_scenario_id, GRID_SPATIAL_SCENARIO_ID);
assert.equal(canUseScenarioForBusinessRuntime(grid), true);
assert.equal(canUseScenarioForBusinessRuntime(city), false);

assert.equal(CITY_SPATIAL_CATALOG.zones.features.length, 0, "正式城市目录必须保持空状态");
const fixtureCatalog = createCitySpatialCatalogFixture();
const baseScene = createCityGeographicScene({ catalog: fixtureCatalog, plans: [] }, GEOSPATIAL_MAP_DATASET);
assert.equal(baseScene.spatialScenarioId, CITY_SPATIAL_SCENARIO_ID);
assert.equal(baseScene.zones.features.length, 1);
assert.ok(baseScene.places.features.length > 0);
assert.ok(baseScene.serviceAreas.features.length > 0);
assert.equal(baseScene.roads.features.length, 0, "城市地理不得显示网格模拟道路");
assert.equal(baseScene.robotaxis.features.length, 0, "城市地理不得显示网格车辆位置");
assert.equal(baseScene.route.features.length, 0, "城市地理不得显示网格路线");
assert.ok(data.roads.length > 0 && data.cells.length > 0, "网格仿真数据必须保持独立可用");

const target = baseScene.zones.features[0];
const draft = createDraft({
  plans: [],
  dataset: GEOSPATIAL_MAP_DATASET,
  spatialScenarioId: CITY_SPATIAL_SCENARIO_ID,
  target: {
    target_object_type: "ZONE",
    target_object_id: target.properties.object_id,
    target_object_name: target.properties.object_name,
  },
  geometry: target.geometry,
});
const validated = validateDraft(draft, { dataset: GEOSPATIAL_MAP_DATASET, catalog: baseScene });
assert.equal(validated.validation_status, "VALID");
const { published } = publishValidatedPlan(validated, { plans: [] });
const foreignPlan = { ...published, operating_spatial_plan_id: "OSP-FOREIGN", spatial_scenario_id: GRID_SPATIAL_SCENARIO_ID };
const isolatedScene = createCityGeographicScene({ catalog: fixtureCatalog, plans: [foreignPlan] }, GEOSPATIAL_MAP_DATASET);
assert.equal(isolatedScene.zones.features[0].properties.spatial_plan_id, undefined);
const publishedScene = createCityGeographicScene({ catalog: fixtureCatalog, plans: [published] }, GEOSPATIAL_MAP_DATASET);
assert.equal(publishedScene.zones.features[0].properties.spatial_plan_id, published.operating_spatial_plan_id);

const started = performance.now();
for (let index = 0; index < 500; index += 1) {
  createCityGeographicScene({ catalog: fixtureCatalog, plans: [published] }, GEOSPATIAL_MAP_DATASET);
}
const elapsed = performance.now() - started;
assert.ok(elapsed < 500, `城市地理场景生成耗时过高：${elapsed.toFixed(2)}ms`);
console.log(`v049.2 双空间场景隔离验证通过：500 次场景生成 ${elapsed.toFixed(2)}ms`);
