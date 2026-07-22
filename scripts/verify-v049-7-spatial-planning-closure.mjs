import assert from "node:assert/strict";
import fs from "node:fs";
import { CITY_SPATIAL_CATALOG } from "../src/data/citySpatialCatalog.js";
import { GEOSPATIAL_MAP_DATASET } from "../src/data/geospatialReferenceData.js";
import { CITY_SPATIAL_SCENARIO_ID } from "../src/data/spatialScenarioInitialization.js";
import { CITY_SPATIAL_PLAN_CONTRACT_VERSION } from "../src/domain/operatingSpatialPlanTypes.js";
import { createCityGeographicScene } from "../src/services/geospatialCatalogService.js";
import { createDraft, publishValidatedPlan, validateDraft } from "../src/services/operatingSpatialPlanService.js";
import { inferSpatialRelationships } from "../src/services/spatialPlanningContextService.js";
import { polygon } from "./fixtures/city-spatial-catalog.mjs";

const legacyPlan = {
  operating_spatial_plan_id: "OSP-LEGACY-0001",
  operating_spatial_plan_status: "PUBLISHED",
  spatial_scenario_id: CITY_SPATIAL_SCENARIO_ID,
  spatial_plan_version: 1,
  published_at: "2026-07-21T00:00:00.000Z",
  spatial_plan_features: [{
    spatial_plan_feature_id: "OSP-LEGACY-0001-F01",
    target_object_type: "ZONE",
    target_object_id: "GZ-Z-LEGACY",
    target_object_name: "旧固定区域",
    geometry_geojson: polygon(113.20, 23.08, 113.32, 23.18),
  }],
};

let scene = createCityGeographicScene({ catalog: CITY_SPATIAL_CATALOG, plans: [legacyPlan] }, GEOSPATIAL_MAP_DATASET);
assert.equal(scene.zones.features.length, 0, "旧合同空间方案不得自动进入当前城市目录");
assert.equal(scene.cityBoundary.features.length, 1, "城市地图必须显示独立的广州受控范围参考");
assert.equal(scene.cityBoundary.features[0].properties.object_name, "广州受控演示范围");

const geometry = polygon(113.20, 23.08, 113.32, 23.18);
const inference = inferSpatialRelationships({
  targetType: "ZONE",
  geometry,
  catalog: scene,
  requestedZoneLevel: "ZONE",
});
assert.equal(inference.inference_status, "CONFIRMED");
const draft = createDraft({
  plans: [legacyPlan],
  catalog: scene,
  dataset: GEOSPATIAL_MAP_DATASET,
  spatialScenarioId: CITY_SPATIAL_SCENARIO_ID,
  target: {
    target_object_type: "ZONE",
    target_object_name: "广州测试运营区域",
    zone_level: "ZONE",
    zone_structure_mode: "FLAT",
    ...inference.relationships,
    relationship_inference_status: inference.inference_status,
  },
  geometry,
});
assert.equal(draft.spatial_plan_contract_version, CITY_SPATIAL_PLAN_CONTRACT_VERSION);
const validated = validateDraft(draft, { dataset: GEOSPATIAL_MAP_DATASET, catalog: scene });
assert.equal(validated.validation_status, "VALID", validated.validation_issues.join("；"));
const published = publishValidatedPlan(validated, { plans: [legacyPlan] });
scene = createCityGeographicScene({ catalog: CITY_SPATIAL_CATALOG, plans: published.plans }, GEOSPATIAL_MAP_DATASET);
assert.equal(scene.zones.features.length, 1, "当前合同发布方案必须进入城市目录");

const adapterSource = fs.readFileSync("src/ui/geospatialMapAdapter.js", "utf8");
const mainSource = fs.readFileSync("src/main.jsx", "utf8");
assert(adapterSource.includes("midpoints: true, draggable: true, deletable: true"), "编辑边界必须提供可拖动顶点和中点");
assert.match(
  adapterSource,
  /feature:\s*\{\s*draggable:\s*false,\s*coordinates:\s*\{\s*midpoints:\s*true,\s*draggable:\s*true,\s*deletable:\s*true\s*\}/s,
  "坐标编辑能力必须配置在 Terra Draw 的 feature 层级内",
);
assert(adapterSource.includes('sourceId !== "cityBoundary"'), "城市范围参考不得冒充可编辑业务对象");
assert(adapterSource.includes('sceneKey !== "cityBoundary"'), "业务对象标签必须与区域面共享选中和悬停交互");
assert(adapterSource.includes("finishPolygonDrawing"), "多边形绘制必须提供明确完成动作");
assert(mainSource.includes('setEditorMode("NEW")'));
assert(mainSource.includes('setEditorMode("EDIT")'));
assert(mainSource.includes("仅作为推荐，不会覆盖你的选择"));
assert(mainSource.includes('drawingBoundary ? "完成绘制"'), "用户必须能通过可见按钮完成绘制");
assert(!mainSource.includes('disabled={!selectedSpatialTarget}'), "新建空间对象时必须允许用户选择对象类型");

console.log("v049.7 城市空间规划闭环验证通过");
