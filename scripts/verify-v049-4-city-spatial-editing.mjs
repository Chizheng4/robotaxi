import assert from "node:assert/strict";
import fs from "node:fs";
import { CITY_SPATIAL_CATALOG } from "../src/data/citySpatialCatalog.js";
import { GEOSPATIAL_MAP_DATASET } from "../src/data/geospatialReferenceData.js";
import { CITY_SPATIAL_SCENARIO_ID } from "../src/data/spatialScenarioInitialization.js";
import { materializeCitySpatialCatalog } from "../src/services/citySpatialObjectService.js";
import { createCityGeographicScene } from "../src/services/geospatialCatalogService.js";
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

const serviceArea = CITY_SPATIAL_CATALOG.serviceAreas.features[0];
const deactivateDraft = createDraft({
  plans: second.plans,
  catalog: materialized,
  dataset: GEOSPATIAL_MAP_DATASET,
  spatialScenarioId: CITY_SPATIAL_SCENARIO_ID,
  target: {
    target_object_type: "SERVICE_AREA",
    target_object_id: serviceArea.properties.object_id,
    target_object_name: serviceArea.properties.object_name,
    source_object_exists: true,
  },
  geometry: serviceArea.geometry,
  changeType: "DEACTIVATE",
  now: "2026-07-22T10:04:00.000Z",
});
const deactivateValidated = validateDraft(deactivateDraft, { dataset: GEOSPATIAL_MAP_DATASET, catalog: materialized });
assert.equal(deactivateValidated.validation_status, "VALID", deactivateValidated.validation_issues.join("；"));
const deactivated = publishValidatedPlan(deactivateValidated, { plans: second.plans, now: "2026-07-22T10:05:00.000Z" });
const sceneAfterDeactivation = createCityGeographicScene({ catalog: CITY_SPATIAL_CATALOG, plans: deactivated.plans }, GEOSPATIAL_MAP_DATASET);
assert.equal(sceneAfterDeactivation.serviceAreas.features.some((item) => item.properties.object_id === serviceArea.properties.object_id), false, "停用对象不得继续显示在当前城市地图");

const zone = CITY_SPATIAL_CATALOG.zones.features[0];
const blockedZoneDraft = createDraft({
  plans: deactivated.plans,
  catalog: CITY_SPATIAL_CATALOG,
  dataset: GEOSPATIAL_MAP_DATASET,
  spatialScenarioId: CITY_SPATIAL_SCENARIO_ID,
  target: {
    target_object_type: "ZONE",
    target_object_id: zone.properties.object_id,
    target_object_name: zone.properties.object_name,
    source_object_exists: true,
  },
  geometry: zone.geometry,
  changeType: "DEACTIVATE",
});
const blockedZone = validateDraft(blockedZoneDraft, { dataset: GEOSPATIAL_MAP_DATASET, catalog: CITY_SPATIAL_CATALOG });
assert.equal(blockedZone.validation_status, "INVALID");
assert(blockedZone.validation_issues.some((issue) => issue.includes("下级对象")), "停用运营区域必须阻止遗留有效下级对象");

const mainSource = fs.readFileSync("src/main.jsx", "utf8");
const styleSource = fs.readFileSync("src/styles.css", "utf8");
const mapAdapterSource = fs.readFileSync("src/ui/geospatialMapAdapter.js", "utf8");
assert(mainSource.includes("!mobileLayout && <Button"), "手机端不得显示运营区域规划入口");
assert(mainSource.includes("editorOpen && !mobileLayout"), "手机端不得挂载复杂空间编辑器");
assert(mainSource.includes("编辑所选对象"), "地图选中空间对象后必须提供直接编辑入口");
assert(mainSource.includes("停用对象"), "空间对象必须通过版本化方案提供停用入口");
assert(styleSource.includes(".spatial-plan-trigger") && styleSource.includes(".spatial-plan-editor { display: none !important; }"), "手机端规划入口必须有样式降级合同");
assert(styleSource.includes(".map-page-new > .map-stage > .map-floating-actions"), "场景切换必须使用不受旧样式覆盖的左上角定位合同");
assert(mapAdapterSource.includes("addition?.id ?? addition"), "绘图适配器必须兼容 Terra Draw 的特征返回结构");
assert(mapAdapterSource.includes("fitGeometry(geometry)"), "编辑已有对象时必须自动聚焦其边界");
assert(mapAdapterSource.includes("initialCamera") && mapAdapterSource.includes("map.easeTo"), "城市地图复位必须恢复初始相机而不是重复计算无效视野");

console.log("v049.4 城市空间编辑、停用保护与地图控件验证通过");
