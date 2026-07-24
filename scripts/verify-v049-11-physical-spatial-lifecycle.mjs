import assert from "node:assert/strict";
import { GEOSPATIAL_MAP_DATASET } from "../src/data/geospatialReferenceData.js";
import { CITY_SPATIAL_SCENARIO_ID } from "../src/data/spatialScenarioInitialization.js";
import { SpatialFormationMode } from "../src/domain/operatingSpatialPlanTypes.js";
import { materializeCitySpatialCatalog } from "../src/services/citySpatialObjectService.js";
import {
  cancelDraft,
  createDraft,
  publishPlan,
  replaceDraftPhysicalUnits,
  validateDraft,
} from "../src/services/operatingSpatialPlanService.js";
import { createCitySpatialCatalogFixture } from "./fixtures/city-spatial-catalog.mjs";

const baseCatalog = createCitySpatialCatalogFixture();
const referencePlace = baseCatalog.places.features[0];
const sourceGeometry = structuredClone(referencePlace.geometry);
const roughSelection = {
  type: "Polygon",
  coordinates: [[
    [113.1, 23.0],
    [113.5, 23.0],
    [113.5, 23.4],
    [113.1, 23.0],
  ]],
};
const sourceUnit = {
  source_feature_id: "BUILDING-TEST-001",
  source_id: "openfreemap",
  source_layer_id: "building",
  source_feature_name: "测试建筑",
  feature_category: "MAP_BUILDING",
  source_dataset_id: GEOSPATIAL_MAP_DATASET.map_dataset_id,
  source_dataset_version: GEOSPATIAL_MAP_DATASET.map_dataset_version,
  source_feature_geometry: sourceGeometry,
};

const draft = createDraft({
  plans: [],
  dataset: GEOSPATIAL_MAP_DATASET,
  catalog: baseCatalog,
  spatialScenarioId: CITY_SPATIAL_SCENARIO_ID,
  target: {
    target_object_type: "PLACE",
    target_object_name: "物理单元测试地点",
    zone_id: referencePlace.properties.zone_id,
    place_type: referencePlace.properties.place_type,
    spatial_formation_mode: SpatialFormationMode.PHYSICAL_UNIT_SELECTION,
    source_feature_snapshot: [sourceUnit],
    selection_geometry_geojson: roughSelection,
  },
  geometry: roughSelection,
  now: "2026-07-24T10:00:00.000Z",
});
assert.deepEqual(draft.spatial_plan_features[0].geometry_geojson, sourceGeometry, "正式几何必须由地图物理单元派生");
assert.deepEqual(draft.spatial_plan_features[0].selection_geometry_geojson, roughSelection, "粗略选择范围只作为审计事实保存");

const validated = validateDraft(draft, { dataset: GEOSPATIAL_MAP_DATASET, catalog: baseCatalog });
assert.equal(validated.operating_spatial_plan_status, "DRAFT", "校验不能改变草稿生命周期");
assert.equal(validated.validation_status, "VALID", validated.validation_issues.join("；"));
const excluded = replaceDraftPhysicalUnits(validated, [], {
  dataset: GEOSPATIAL_MAP_DATASET,
  catalog: baseCatalog,
});
assert.equal(excluded.validation_status, "INVALID", "排除全部物理单元后必须阻止发布");
assert.equal(excluded.spatial_plan_features[0].source_feature_snapshot.length, 0);

const first = publishPlan(validated, {
  plans: [validated],
  dataset: GEOSPATIAL_MAP_DATASET,
  catalog: baseCatalog,
  now: "2026-07-24T10:01:00.000Z",
});
assert.equal(first.published.operating_spatial_plan_status, "PUBLISHED");
const createdId = first.published.spatial_plan_features[0].target_object_id;
const activeCatalog = materializeCitySpatialCatalog(baseCatalog, first.plans);
const created = activeCatalog.places.features.find((item) => item.properties.object_id === createdId);
assert(created, "发布必须创建正式城市空间对象");
assert.equal(created.properties.object_status, "ACTIVE");
assert.equal(created.properties.object_version_status, "CURRENT");
assert.equal(created.properties.source_feature_snapshot[0].source_feature_id, sourceUnit.source_feature_id);

const deactivateDraft = createDraft({
  plans: first.plans,
  dataset: GEOSPATIAL_MAP_DATASET,
  catalog: activeCatalog,
  spatialScenarioId: CITY_SPATIAL_SCENARIO_ID,
  target: {
    target_object_type: "PLACE",
    target_object_id: createdId,
    target_object_name: "物理单元测试地点",
    source_object_exists: true,
  },
  geometry: sourceGeometry,
  changeType: "DEACTIVATE",
});
const deactivateResult = publishPlan(deactivateDraft, {
  plans: first.plans,
  dataset: GEOSPATIAL_MAP_DATASET,
  catalog: activeCatalog,
  now: "2026-07-24T10:02:00.000Z",
});
const inactiveCatalog = materializeCitySpatialCatalog(baseCatalog, deactivateResult.plans);
assert.equal(
  inactiveCatalog.places.features.find((item) => item.properties.object_id === createdId).properties.object_status,
  "INACTIVE",
  "停用必须保留对象和历史，而不是删除",
);

const activateDraft = createDraft({
  plans: deactivateResult.plans,
  dataset: GEOSPATIAL_MAP_DATASET,
  catalog: inactiveCatalog,
  spatialScenarioId: CITY_SPATIAL_SCENARIO_ID,
  target: {
    target_object_type: "PLACE",
    target_object_id: createdId,
    target_object_name: "物理单元测试地点",
    source_object_exists: true,
  },
  geometry: sourceGeometry,
  changeType: "ACTIVATE",
});
const activateResult = publishPlan(activateDraft, {
  plans: deactivateResult.plans,
  dataset: GEOSPATIAL_MAP_DATASET,
  catalog: inactiveCatalog,
  now: "2026-07-24T10:03:00.000Z",
});
const reactivatedCatalog = materializeCitySpatialCatalog(baseCatalog, activateResult.plans);
assert.equal(
  reactivatedCatalog.places.features.find((item) => item.properties.object_id === createdId).properties.object_status,
  "ACTIVE",
  "启用必须恢复正式对象，且不能重新创建对象编号",
);

const cancelled = cancelDraft(createDraft({
  plans: activateResult.plans,
  dataset: GEOSPATIAL_MAP_DATASET,
  catalog: reactivatedCatalog,
  spatialScenarioId: CITY_SPATIAL_SCENARIO_ID,
  target: {
    target_object_type: "PLACE",
    target_object_id: createdId,
    target_object_name: "物理单元测试地点",
    source_object_exists: true,
    zone_id: referencePlace.properties.zone_id,
    place_type: referencePlace.properties.place_type,
  },
  geometry: sourceGeometry,
}));
assert.equal(cancelled.operating_spatial_plan_status, "CANCELLED");

const adapterSource = await import("node:fs").then(({ readFileSync }) => readFileSync(
  new URL("../src/ui/geospatialMapAdapter.js", import.meta.url),
  "utf8",
));
const pageSource = await import("node:fs").then(({ readFileSync }) => readFileSync(
  new URL("../src/main.jsx", import.meta.url),
  "utf8",
));
assert.match(adapterSource, /updatePhysicalSelection/, "地图适配器必须提供统一物理单元选择图层");
assert.match(pageSource, /updatePhysicalSelection\(/, "规划页面必须把草稿中的物理单元同步到地图图层");
assert.match(pageSource, /excludePhysicalUnit/, "规划页面必须允许排除误选地图物理单元");
assert.match(pageSource, /createActivationPlan/, "规划页面必须提供已停用对象的重新启用入口");
assert.doesNotMatch(pageSource, />校验</, "物理选择校验必须自动执行，页面不应保留手动校验动作");
assert.doesNotMatch(pageSource, /采用所选区域/, "行政区选择后应自动形成草稿，不应保留重复确认动作");

console.log("v049.11 地图物理单元、自动校验与空间对象生命周期验证通过");
