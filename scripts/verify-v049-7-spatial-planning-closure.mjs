import assert from "node:assert/strict";
import fs from "node:fs";
import { CITY_SPATIAL_CATALOG } from "../src/data/citySpatialCatalog.js";
import { GEOSPATIAL_MAP_DATASET } from "../src/data/geospatialReferenceData.js";
import { CITY_SPATIAL_SCENARIO_ID } from "../src/data/spatialScenarioInitialization.js";
import { CITY_SPATIAL_PLAN_CONTRACT_VERSION } from "../src/domain/operatingSpatialPlanTypes.js";
import { createCityGeographicScene } from "../src/services/geospatialCatalogService.js";
import { createDraft, publishValidatedPlan, validateDraft } from "../src/services/operatingSpatialPlanService.js";
import { inferSpatialRelationships } from "../src/services/spatialPlanningContextService.js";
import { GUANGZHOU_ADMINISTRATIVE_BOUNDARY } from "../src/data/guangzhouAdministrativeBoundary.js";
import { normalizePlanningPolygon } from "../src/ui/geospatialMapAdapter.js";
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
assert.equal(scene.cityBoundary.features[0].properties.object_name, "广州市行政范围");
assert.equal(scene.cityBoundary.features[0].properties.reference_type, "ADMINISTRATIVE_BOUNDARY");
assert(GUANGZHOU_ADMINISTRATIVE_BOUNDARY.geometry.coordinates[0].length > 100, "广州行政边界不得退化为矩形范围");

const completedGeometry = normalizePlanningPolygon({
  type: "LineString",
  coordinates: [[113.2, 23.08], [113.32, 23.08], [113.32, 23.18], [113.2, 23.18]],
});
assert.equal(completedGeometry.type, "Polygon");
assert.deepEqual(completedGeometry.coordinates[0][0], completedGeometry.coordinates[0].at(-1), "明确完成动作必须稳定闭合边界");
assert.equal(normalizePlanningPolygon({ type: "LineString", coordinates: [[1, 1], [2, 2]] }), null, "不足三个点不得形成草稿");

const geometry = polygon(113.25, 23.10, 113.30, 23.15);
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

let repeatedPlans = [];
for (let index = 0; index < 25; index += 1) {
  const repeatedDraft = createDraft({
    plans: repeatedPlans,
    catalog: createCityGeographicScene({ catalog: CITY_SPATIAL_CATALOG, plans: repeatedPlans }, GEOSPATIAL_MAP_DATASET),
    dataset: GEOSPATIAL_MAP_DATASET,
    spatialScenarioId: CITY_SPATIAL_SCENARIO_ID,
    target: { target_object_type: "ZONE", target_object_name: `重复规划验证 ${index + 1}`, zone_level: "ZONE", zone_structure_mode: "FLAT" },
    geometry,
  });
  const repeatedValidated = validateDraft(repeatedDraft, { dataset: GEOSPATIAL_MAP_DATASET, catalog: scene });
  assert.equal(repeatedValidated.validation_status, "VALID", `第 ${index + 1} 次规划必须稳定通过`);
  repeatedPlans = publishValidatedPlan(repeatedValidated, { plans: repeatedPlans }).plans;
}
assert.equal(repeatedPlans.length, 25, "重复规划不得丢失或静默失败");

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
assert(!adapterSource.includes('dispatchEvent(new KeyboardEvent("keyup"'), "完成绘制不得依赖伪造键盘事件");
assert(adapterSource.includes("querySourceFeatures"), "底图采集必须读取已加载矢量源要素，而不是只依赖可见图层");
assert(adapterSource.includes("areTilesLoaded"), "底图要素未加载完成时不得静默形成空草稿");
assert(mainSource.includes('setEditorMode("NEW")'));
assert(
  mainSource.includes('usesAdministrativeUnits ? "EDIT_ADMIN" : "EDIT"'),
  "已发布对象编辑必须区分行政区事实复用和自由边界编辑",
);
assert(mainSource.includes("仅作为推荐，不会覆盖你的选择"));
assert(mainSource.includes('drawingBoundary ? "完成选择"'), "用户必须能通过可见按钮完成空间选择");
assert(!mainSource.includes('disabled={!selectedSpatialTarget}'), "新建空间对象时必须允许用户选择对象类型");

console.log("v049.8 城市空间规划可靠性验证通过");
