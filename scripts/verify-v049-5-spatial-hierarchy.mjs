import assert from "node:assert/strict";
import fs from "node:fs";
import { CITY_SPATIAL_CATALOG } from "../src/data/citySpatialCatalog.js";
import { GEOSPATIAL_MAP_DATASET } from "../src/data/geospatialReferenceData.js";
import { CITY_SPATIAL_SCENARIO_ID } from "../src/data/spatialScenarioInitialization.js";
import { validateCitySpatialCatalog } from "../src/services/citySpatialObjectService.js";
import { createDraft, validateDraft } from "../src/services/operatingSpatialPlanService.js";
import {
  geometryContains,
  summarizeSpatialCoverage,
  validatePolygonGeometry,
} from "../src/services/spatialTopologyService.js";

const polygon = (coordinates) => ({ type: "Polygon", coordinates: [[...coordinates, coordinates[0]]] });
const outer = polygon([[113, 22], [114, 22], [114, 23], [113, 23]]);
const inner = polygon([[113.2, 22.2], [113.8, 22.2], [113.8, 22.8], [113.2, 22.8]]);
const crossing = polygon([[112.9, 22.4], [113.5, 22.4], [113.5, 22.6], [112.9, 22.6]]);
const selfCrossing = polygon([[113, 22], [114, 23], [114, 22], [113, 23]]);

assert.equal(geometryContains(outer, inner), true, "有效子区域必须被父区域包含");
assert.equal(geometryContains(outer, crossing), false, "跨越父区域边界的子对象必须被拒绝");
assert(validatePolygonGeometry(selfCrossing, []).some((issue) => issue.includes("交叉")), "自交边界必须被拒绝");

const coverage = summarizeSpatialCoverage({
  targetType: "SERVICE_AREA",
  sourceFeatures: [{ feature_category: "MAP_WATER" }],
});
assert.equal(coverage.water_reference_count, 1);
assert(coverage.coverage_issues.some((issue) => issue.includes("水域")), "纯水域服务区域必须形成阻断问题");

const brokenCatalog = structuredClone(CITY_SPATIAL_CATALOG);
brokenCatalog.places.features[0].geometry = crossing;
assert(validateCitySpatialCatalog(brokenCatalog, []).some((issue) => issue.includes("边界必须位于")), "完整目录校验必须识别已有对象越界");

const serviceArea = CITY_SPATIAL_CATALOG.serviceAreas.features[0];
const waterOnlyDraft = createDraft({
  plans: [],
  catalog: CITY_SPATIAL_CATALOG,
  dataset: GEOSPATIAL_MAP_DATASET,
  spatialScenarioId: CITY_SPATIAL_SCENARIO_ID,
  target: {
    target_object_type: "SERVICE_AREA",
    target_object_id: serviceArea.properties.object_id,
    target_object_name: serviceArea.properties.object_name,
    source_object_exists: true,
    zone_id: serviceArea.properties.zone_id,
    place_id: serviceArea.properties.place_id,
    service_area_type: serviceArea.properties.service_area_type,
    source_feature_snapshot: [{ feature_category: "MAP_WATER" }],
  },
  geometry: serviceArea.geometry,
});
const waterOnlyValidation = validateDraft(waterOnlyDraft, { dataset: GEOSPATIAL_MAP_DATASET, catalog: CITY_SPATIAL_CATALOG });
assert.equal(waterOnlyValidation.validation_status, "INVALID");
assert(waterOnlyValidation.validation_issues.some((issue) => issue.includes("水域")));

const adapterSource = fs.readFileSync("src/ui/geospatialMapAdapter.js", "utf8");
const mainSource = fs.readFileSync("src/main.jsx", "utf8");
assert(adapterSource.includes("minzoom") && adapterSource.includes("maxzoom"), "地图对象必须按语义缩放层级展示");
assert(adapterSource.includes("queryRenderedFeatures"), "规划边界必须引用当前真实底图要素");
assert(adapterSource.includes("robotaxi-sub-zone-labels"), "二级区域必须具有独立层级展示合同");
assert(adapterSource.includes("firstBasemapLabelLayerId"), "业务区域填充必须保留底图原生文字层级");
assert(adapterSource.includes("cameraForBounds"), "父级聚焦和目标缩放必须使用同一次相机计算");
assert(mainSource.includes("source_feature_snapshot: sourceFeatureSnapshot"), "规划草稿必须保存底图要素快照");
assert(mainSource.includes("editorOpen && !mobileLayout"), "手机端不得挂载运营区域编辑器");

console.log("v049.5 空间层级、底图参考和语义缩放验证通过");
