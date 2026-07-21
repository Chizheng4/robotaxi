import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { initializeMapSpace } from "../src/data/mapInitialization.js";
import { GEOSPATIAL_MAP_DATASET, GEOSPATIAL_PROJECTION_CONFIG } from "../src/data/geospatialReferenceData.js";
import { createGeospatialScene } from "../src/services/geospatialCatalogService.js";
import {
  cancelDraft,
  createDraft,
  getPublishedFeatures,
  publishValidatedPlan,
  validateDraft,
} from "../src/services/operatingSpatialPlanService.js";

const data = initializeMapSpace();
const targetZone = data.zones.find((zone) => !zone.parent_zone_id);
assert.ok(targetZone, "缺少可用于空间规划验证的运营区域");
assert.deepEqual(data.operatingSpatialPlans, [], "地图初始化必须包含独立的空运营空间方案集合");

const originalCellIds = [...targetZone.cell_ids];
const geometry = {
  type: "Polygon",
  coordinates: [[
    [113.255, 23.115],
    [113.275, 23.115],
    [113.275, 23.135],
    [113.255, 23.135],
    [113.255, 23.115],
  ]],
};
const draft = createDraft({
  plans: [],
  dataset: GEOSPATIAL_MAP_DATASET,
  target: {
    target_object_type: "ZONE",
    target_object_id: targetZone.zone_id,
    target_object_name: targetZone.zone_name,
  },
  geometry,
  now: "2026-07-21T00:00:00.000Z",
});
const validated = validateDraft(draft, {
  dataset: GEOSPATIAL_MAP_DATASET,
  catalog: data,
});
assert.equal(validated.operating_spatial_plan_status, "VALIDATED", validated.validation_issues.join("；"));
assert.equal(validated.impact_summary.existing_projection_update_count, 1);
assert.equal(validated.impact_summary.simulation_runtime_changed, false);

const { plans, published } = publishValidatedPlan(validated, {
  plans: [validated],
  now: "2026-07-21T00:01:00.000Z",
});
assert.equal(published.operating_spatial_plan_status, "PUBLISHED");
assert.equal(getPublishedFeatures(plans).length, 1);

const scene = createGeospatialScene({ ...data, operatingSpatialPlans: plans }, GEOSPATIAL_MAP_DATASET, GEOSPATIAL_PROJECTION_CONFIG);
const projectedZone = scene.zones.features.find((feature) => feature.properties.object_id === targetZone.zone_id);
assert.deepEqual(projectedZone.geometry, geometry, "已发布空间方案没有覆盖目标对象的地理投影");
assert.deepEqual(targetZone.cell_ids, originalCellIds, "发布地理投影不应改写旧网格空间事实");

const invalidDraft = createDraft({
  plans,
  dataset: GEOSPATIAL_MAP_DATASET,
  target: {
    target_object_type: "PLACE",
    target_object_id: data.places[0].place_id,
    target_object_name: data.places[0].place_name,
  },
  geometry: {
    type: "Polygon",
    coordinates: [[[120, 30], [120.1, 30], [120.1, 30.1], [120, 30.1], [120, 30]]],
  },
});
const invalidResult = validateDraft(invalidDraft, { dataset: GEOSPATIAL_MAP_DATASET, catalog: data });
assert.equal(invalidResult.operating_spatial_plan_status, "DRAFT");
assert.ok(invalidResult.validation_issues.some((issue) => issue.includes("广州受控演示范围")));
const cancelledDraft = cancelDraft(invalidResult, "2026-07-21T00:02:00.000Z");
assert.equal(cancelledDraft.operating_spatial_plan_status, "CANCELLED", "取消草稿必须形成可追溯的已取消状态");
assert.equal(getPublishedFeatures([published, cancelledDraft]).length, 1, "取消草稿不能改变已发布空间投影");

const startedAt = performance.now();
for (let index = 0; index < 100; index += 1) {
  createGeospatialScene({ ...data, operatingSpatialPlans: plans }, GEOSPATIAL_MAP_DATASET, GEOSPATIAL_PROJECTION_CONFIG);
}
const elapsedMs = performance.now() - startedAt;
assert.ok(elapsedMs < 500, `运营空间投影重复生成耗时过高：${elapsedMs.toFixed(2)}ms`);

console.log(`v049.1 广州运营空间建模验证通过：100 次投影 ${elapsedMs.toFixed(2)}ms`);
