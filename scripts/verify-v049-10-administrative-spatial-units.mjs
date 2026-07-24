import assert from "node:assert/strict";
import { CITY_SPATIAL_CATALOG } from "../src/data/citySpatialCatalog.js";
import { GEOSPATIAL_MAP_DATASET } from "../src/data/geospatialReferenceData.js";
import {
  OperatingSpatialPlanStatus,
  SpatialFormationMode,
  SpatialPlanTargetType,
  ZoneStructureMode,
} from "../src/domain/operatingSpatialPlanTypes.js";
import {
  createAdministrativeUnitReferences,
  getGuangzhouAdministrativeUnits,
} from "../src/services/geographicSpatialUnitService.js";
import {
  createDraft,
  publishValidatedPlan,
  validateDraft,
} from "../src/services/operatingSpatialPlanService.js";
import { materializeCitySpatialCatalog } from "../src/services/citySpatialObjectService.js";

const units = getGuangzhouAdministrativeUnits();
assert.equal(units.length, 11, "广州行政区空间目录必须完整包含 11 个区");
const liwan = units.find((unit) => unit.administrative_code === "440103");
assert(liwan, "行政区空间目录必须包含荔湾区");
assert.equal(liwan.spatial_unit_name, "荔湾区");
assert.equal(liwan.geometry_geojson.type, "MultiPolygon");

const fakeGeometry = {
  type: "Polygon",
  coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
};
const draft = createDraft({
  plans: [],
  dataset: GEOSPATIAL_MAP_DATASET,
  catalog: CITY_SPATIAL_CATALOG,
  spatialScenarioId: CITY_SPATIAL_CATALOG.spatial_scenario_id,
  target: {
    target_object_type: SpatialPlanTargetType.ZONE,
    target_object_name: "荔湾运营区域",
    zone_level: "ZONE",
    zone_structure_mode: ZoneStructureMode.FLAT,
    spatial_formation_mode: SpatialFormationMode.ADMINISTRATIVE_UNIT_REUSE,
    source_spatial_unit_ids: [liwan.spatial_unit_id],
  },
  geometry: fakeGeometry,
});

const feature = draft.spatial_plan_features[0];
assert.notDeepEqual(feature.geometry_geojson, fakeGeometry, "行政区来源边界不能被页面几何覆盖");
assert.deepEqual(feature.geometry_geojson, liwan.geometry_geojson, "运营区域边界必须由来源空间单元派生");
assert.equal(feature.source_spatial_unit_refs[0].source_spatial_unit_id, liwan.spatial_unit_id);

const validated = validateDraft(draft, {
  dataset: GEOSPATIAL_MAP_DATASET,
  catalog: CITY_SPATIAL_CATALOG,
});
assert.equal(validated.operating_spatial_plan_status, OperatingSpatialPlanStatus.DRAFT);
assert.deepEqual(validated.validation_issues, []);

const { plans, published } = publishValidatedPlan(validated, { plans: [] });
assert.equal(published.operating_spatial_plan_status, OperatingSpatialPlanStatus.PUBLISHED);
const catalog = materializeCitySpatialCatalog(CITY_SPATIAL_CATALOG, plans);
const zone = catalog.zones.features.find((item) => item.properties.object_id === feature.target_object_id);
assert(zone, "发布后必须形成正式城市运营区域");
assert.equal(zone.properties.spatial_formation_mode, SpatialFormationMode.ADMINISTRATIVE_UNIT_REUSE);
assert.equal(zone.properties.source_spatial_unit_refs[0].administrative_code, "440103");

assert.throws(
  () => createAdministrativeUnitReferences(["CN-44-UNKNOWN"]),
  /未找到行政区空间单元/,
  "无效来源空间单元必须被服务阻止",
);

const invalidTarget = createDraft({
  plans: [],
  dataset: GEOSPATIAL_MAP_DATASET,
  catalog: CITY_SPATIAL_CATALOG,
  spatialScenarioId: CITY_SPATIAL_CATALOG.spatial_scenario_id,
  target: {
    target_object_type: SpatialPlanTargetType.PLACE,
    target_object_name: "错误地点",
    spatial_formation_mode: SpatialFormationMode.ADMINISTRATIVE_UNIT_REUSE,
    source_spatial_unit_ids: [liwan.spatial_unit_id],
  },
});
assert(validateDraft(invalidTarget, {
  dataset: GEOSPATIAL_MAP_DATASET,
  catalog: CITY_SPATIAL_CATALOG,
}).validation_issues.includes("行政区域只能用于形成运营区域"));

const invalidCombination = createDraft({
  plans: [],
  dataset: GEOSPATIAL_MAP_DATASET,
  catalog: CITY_SPATIAL_CATALOG,
  spatialScenarioId: CITY_SPATIAL_CATALOG.spatial_scenario_id,
  target: {
    target_object_type: SpatialPlanTargetType.ZONE,
    target_object_name: "错误组合",
    zone_level: "ZONE",
    zone_structure_mode: ZoneStructureMode.FLAT,
    spatial_formation_mode: SpatialFormationMode.ADMINISTRATIVE_UNIT_COMBINATION,
    source_spatial_unit_ids: [liwan.spatial_unit_id],
  },
});
assert(validateDraft(invalidCombination, {
  dataset: GEOSPATIAL_MAP_DATASET,
  catalog: CITY_SPATIAL_CATALOG,
}).validation_issues.includes("组合行政区域时至少选择两个行政区"));

console.log("v049.10 地理事实驱动的运营区域规划验证通过");
