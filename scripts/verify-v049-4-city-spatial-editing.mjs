import assert from "node:assert/strict";
import fs from "node:fs";
import { CITY_SPATIAL_CATALOG } from "../src/data/citySpatialCatalog.js";
import { GEOSPATIAL_MAP_DATASET } from "../src/data/geospatialReferenceData.js";
import { CITY_SPATIAL_SCENARIO_ID } from "../src/data/spatialScenarioInitialization.js";
import { materializeCitySpatialCatalog } from "../src/services/citySpatialObjectService.js";
import { createDraft, publishValidatedPlan, validateDraft } from "../src/services/operatingSpatialPlanService.js";

const place = CITY_SPATIAL_CATALOG.places.features.find((item) => item.properties.object_id === "GZ-P-0003");
assert.ok(place, "演示地点必须存在");
const editedGeometry = structuredClone(place.geometry);
editedGeometry.coordinates[0][1][0] += 0.0005;

const draft = createDraft({
  plans: [],
  catalog: CITY_SPATIAL_CATALOG,
  dataset: GEOSPATIAL_MAP_DATASET,
  spatialScenarioId: CITY_SPATIAL_SCENARIO_ID,
  target: {
    target_object_type: "PLACE",
    target_object_id: place.properties.object_id,
    target_object_name: place.properties.object_name,
    source_object_exists: true,
    zone_id: place.properties.zone_id,
    place_type: place.properties.place_type,
  },
  geometry: editedGeometry,
  now: "2026-07-22T10:00:00.000Z",
});
const validated = validateDraft(draft, { dataset: GEOSPATIAL_MAP_DATASET, catalog: CITY_SPATIAL_CATALOG });
assert.equal(validated.validation_status, "VALID", validated.validation_issues.join("；"));
const first = publishValidatedPlan(validated, { plans: [], now: "2026-07-22T10:01:00.000Z" });
const materialized = materializeCitySpatialCatalog(CITY_SPATIAL_CATALOG, first.plans);
assert.deepEqual(materialized.places.features.find((item) => item.properties.object_id === place.properties.object_id).geometry, editedGeometry);

const secondDraft = createDraft({
  plans: first.plans,
  catalog: materialized,
  dataset: GEOSPATIAL_MAP_DATASET,
  spatialScenarioId: CITY_SPATIAL_SCENARIO_ID,
  target: {
    target_object_type: "PLACE",
    target_object_id: place.properties.object_id,
    target_object_name: place.properties.object_name,
    source_object_exists: true,
    zone_id: place.properties.zone_id,
    place_type: place.properties.place_type,
  },
  geometry: editedGeometry,
  now: "2026-07-22T10:02:00.000Z",
});
const secondValidated = validateDraft(secondDraft, { dataset: GEOSPATIAL_MAP_DATASET, catalog: materialized });
const second = publishValidatedPlan(secondValidated, { plans: first.plans, now: "2026-07-22T10:03:00.000Z" });
assert.equal(second.plans.find((item) => item.operating_spatial_plan_id === first.published.operating_spatial_plan_id).operating_spatial_plan_status, "SUPERSEDED");
assert.equal(second.published.spatial_plan_version, 2);

const mainSource = fs.readFileSync("src/main.jsx", "utf8");
const styleSource = fs.readFileSync("src/styles.css", "utf8");
const mapAdapterSource = fs.readFileSync("src/ui/geospatialMapAdapter.js", "utf8");
assert(mainSource.includes("!mobileLayout && <Button"), "手机端不得显示运营区域规划入口");
assert(mainSource.includes("editorOpen && !mobileLayout"), "手机端不得挂载复杂空间编辑器");
assert(styleSource.includes(".spatial-plan-trigger") && styleSource.includes(".spatial-plan-editor { display: none !important; }"), "手机端规划入口必须有样式降级合同");
assert(mapAdapterSource.includes("addition?.id ?? addition"), "绘图适配器必须兼容 Terra Draw 的特征返回结构");
assert(mapAdapterSource.includes("fitGeometry(geometry)"), "编辑已有对象时必须自动聚焦其边界");

console.log("v049.4 城市地点边界编辑与版本替代验证通过");
