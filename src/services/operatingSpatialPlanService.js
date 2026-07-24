import {
  OperatingSpatialPlanStatus,
  CITY_SPATIAL_PLAN_CONTRACT_VERSION,
  SpatialPlanChangeType,
  SpatialPlanTargetType,
  SpatialPlanValidationStatus,
  SpatialFormationMode,
  createOperatingSpatialPlan,
  createSpatialPlanFeature,
} from "../domain/operatingSpatialPlanTypes.js?v=20260724-v049-10-0";
import {
  createAdministrativeUnitReferences,
  deriveGeometryFromAdministrativeUnits,
  validateAdministrativeUnitReferences,
} from "./geographicSpatialUnitService.js?v=20260724-v049-10-0";
import {
  createCityObjectId,
  createCitySpatialImpact,
  getCitySpatialPlanningContract,
  materializeCitySpatialCatalog,
  validateCitySpatialCatalog,
  validateSpatialPlanFeature,
} from "./citySpatialObjectService.js?v=20260724-v049-10-0";
import {
  geometryContains,
  summarizeSpatialCoverage,
  validatePolygonGeometry,
} from "./spatialTopologyService.js?v=20260724-v049-10-0";
import { GUANGZHOU_ADMINISTRATIVE_BOUNDARY } from "../data/guangzhouAdministrativeBoundary.js?v=20260722-v049-8-0";

export { getCitySpatialPlanningContract };

const ALLOWED_TARGET_TYPES = new Set(Object.values(SpatialPlanTargetType));

export function createDraft({ plans = [], dataset, catalog = {}, spatialScenarioId, target, geometry, changeType = SpatialPlanChangeType.UPSERT, now = new Date().toISOString() }) {
  if (!spatialScenarioId) throw new Error("缺少空间场景，不能创建运营区域方案");
  const sequence = nextSequence(plans);
  const planId = `OSP-${String(sequence).padStart(4, "0")}`;
  const previousVersions = plans.filter((plan) => plan.spatial_scenario_id === spatialScenarioId && plan.spatial_plan_features?.some((feature) => (
    feature.target_object_type === target.target_object_type
    && feature.target_object_id
    && feature.target_object_id === target.target_object_id
  )));
  const targetObjectId = target.target_object_id || createCityObjectId(target.target_object_type, plans, catalog);
  const administrativeFormation = [
    SpatialFormationMode.ADMINISTRATIVE_UNIT_REUSE,
    SpatialFormationMode.ADMINISTRATIVE_UNIT_COMBINATION,
  ].includes(target.spatial_formation_mode);
  const spatialUnitIds = target.source_spatial_unit_ids || [];
  const sourceSpatialUnitRefs = administrativeFormation
    ? createAdministrativeUnitReferences(spatialUnitIds)
    : clone(target.source_spatial_unit_refs || []);
  const effectiveGeometry = administrativeFormation
    ? deriveGeometryFromAdministrativeUnits(spatialUnitIds)
    : geometry;
  return createOperatingSpatialPlan({
    operating_spatial_plan_id: planId,
    operating_spatial_plan_name: `${target.target_object_name || "未命名对象"}运营区域方案`,
    operating_spatial_plan_status: OperatingSpatialPlanStatus.DRAFT,
    spatial_scenario_id: spatialScenarioId,
    spatial_plan_version: Math.max(0, ...previousVersions.map((plan) => Number(plan.spatial_plan_version || 0))) + 1,
    spatial_plan_contract_version: CITY_SPATIAL_PLAN_CONTRACT_VERSION,
    map_dataset_id: dataset.map_dataset_id,
    map_dataset_version: dataset.map_dataset_version,
    coordinate_reference_system: dataset.coordinate_reference_system,
    spatial_plan_features: [createSpatialPlanFeature({
      spatial_plan_feature_id: `${planId}-F01`,
      ...target,
      spatial_change_type: changeType,
      target_object_id: targetObjectId,
      source_object_exists: target.source_object_exists ?? Boolean(target.target_object_id),
      geometry_geojson: clone(effectiveGeometry),
      spatial_formation_mode: target.spatial_formation_mode || SpatialFormationMode.MAP_FEATURE_SELECTION,
      source_spatial_unit_refs: sourceSpatialUnitRefs,
      source_feature_snapshot: clone(target.source_feature_snapshot || []),
      spatial_validation_summary: clone(target.spatial_validation_summary || null),
      planning_zoom_band: target.planning_zoom_band || null,
      relationship_inference_status: target.relationship_inference_status || null,
      contained_object_refs: clone(target.contained_object_refs || []),
      conflict_object_refs: clone(target.conflict_object_refs || []),
    })],
    validation_status: SpatialPlanValidationStatus.INVALID,
    created_at: now,
    updated_at: now,
  });
}

export function validateDraft(plan, { dataset, catalog = {} } = {}) {
  assertEditable(plan);
  const issues = [];
  if (!plan.operating_spatial_plan_name?.trim()) issues.push("请填写运营区域方案名称");
  if (!plan.spatial_scenario_id) issues.push("方案缺少空间场景");
  if (plan.spatial_plan_contract_version !== CITY_SPATIAL_PLAN_CONTRACT_VERSION) issues.push("当前方案不符合城市空间规划合同，请重新创建方案");
  if (plan.map_dataset_id !== dataset?.map_dataset_id || plan.map_dataset_version !== dataset?.map_dataset_version) {
    issues.push("方案引用的地图数据集版本与当前地图不一致");
  }
  if (plan.coordinate_reference_system !== "EPSG:4326") issues.push("当前只支持 WGS84 经纬度几何");
  if (!plan.spatial_plan_features?.length) issues.push("方案至少需要一个空间要素");

  const effectiveCatalog = materializeCitySpatialCatalog(catalog, []);
  for (const feature of plan.spatial_plan_features || []) {
    validateFeature(feature, dataset, effectiveCatalog, issues);
    if (feature.spatial_change_type !== SpatialPlanChangeType.DEACTIVATE) {
      validateSpatialPlanFeature(feature, effectiveCatalog, issues);
    }
  }
  if (!issues.length) {
    const candidateCatalog = materializeCitySpatialCatalog(effectiveCatalog, [{
      ...plan,
      operating_spatial_plan_status: OperatingSpatialPlanStatus.PUBLISHED,
      published_at: plan.updated_at || new Date().toISOString(),
    }]);
    validateCitySpatialCatalog(candidateCatalog, issues);
  }

  const valid = issues.length === 0;
  const now = new Date().toISOString();
  return {
    ...clone(plan),
    operating_spatial_plan_status: valid ? OperatingSpatialPlanStatus.VALIDATED : OperatingSpatialPlanStatus.DRAFT,
    validation_status: valid ? SpatialPlanValidationStatus.VALID : SpatialPlanValidationStatus.INVALID,
    validation_issues: issues,
    impact_summary: valid ? createImpactSummary(plan) : null,
    updated_at: now,
  };
}

export function publishValidatedPlan(plan, { plans = [], now = new Date().toISOString() } = {}) {
  if (plan?.operating_spatial_plan_status !== OperatingSpatialPlanStatus.VALIDATED
    || plan.validation_status !== SpatialPlanValidationStatus.VALID) {
    throw new Error("运营区域方案校验通过后才能发布");
  }
  const supersededIds = new Set(plan.spatial_plan_features
    .filter((feature) => feature.target_object_id)
    .map((feature) => `${feature.target_object_type}:${feature.target_object_id}`));
  const nextPlans = plans.map((item) => {
    if (item.operating_spatial_plan_status !== OperatingSpatialPlanStatus.PUBLISHED) return item;
    const overlaps = item.spatial_scenario_id === plan.spatial_scenario_id
      && item.spatial_plan_features?.some((feature) => supersededIds.has(`${feature.target_object_type}:${feature.target_object_id}`));
    return overlaps ? {
      ...item,
      operating_spatial_plan_status: OperatingSpatialPlanStatus.SUPERSEDED,
      superseded_at: now,
      superseded_by_plan_id: plan.operating_spatial_plan_id,
      updated_at: now,
    } : item;
  });
  const published = {
    ...clone(plan),
    operating_spatial_plan_status: OperatingSpatialPlanStatus.PUBLISHED,
    published_at: now,
    updated_at: now,
  };
  return { plans: [...nextPlans.filter((item) => item.operating_spatial_plan_id !== published.operating_spatial_plan_id), published], published };
}

export function cancelDraft(plan, now = new Date().toISOString()) {
  if (plan?.operating_spatial_plan_status === OperatingSpatialPlanStatus.PUBLISHED) {
    throw new Error("已发布方案不能直接取消，请创建新版本");
  }
  return { ...clone(plan), operating_spatial_plan_status: OperatingSpatialPlanStatus.CANCELLED, updated_at: now };
}

export function upsertPlan(plans = [], plan) {
  return [...plans.filter((item) => item.operating_spatial_plan_id !== plan.operating_spatial_plan_id), plan];
}

export function getPublishedFeatures(plans = [], { spatialScenarioId } = {}) {
  return plans
    .filter((plan) => plan.operating_spatial_plan_status === OperatingSpatialPlanStatus.PUBLISHED
      && plan.spatial_plan_contract_version === CITY_SPATIAL_PLAN_CONTRACT_VERSION
      && (!spatialScenarioId || plan.spatial_scenario_id === spatialScenarioId))
    .flatMap((plan) => (plan.spatial_plan_features || []).map((feature) => ({
      ...clone(feature),
      operating_spatial_plan_id: plan.operating_spatial_plan_id,
      spatial_plan_version: plan.spatial_plan_version,
      published_at: plan.published_at,
    })));
}

export function normalizePlanScenarios(plans = [], defaultSpatialScenarioId) {
  return plans.map((plan) => plan.spatial_scenario_id ? plan : { ...plan, spatial_scenario_id: defaultSpatialScenarioId });
}

function validateFeature(feature, dataset, catalog, issues) {
  if (!ALLOWED_TARGET_TYPES.has(feature.target_object_type)) issues.push("请选择运营区域、地点或服务区域");
  if (!feature.target_object_name?.trim()) issues.push("请填写目标对象名称");
  if (feature.source_object_exists && feature.target_object_id && !targetExists(feature, catalog)) issues.push(`目标对象 ${feature.target_object_id} 不存在`);
  if (feature.spatial_change_type === SpatialPlanChangeType.DEACTIVATE) {
    validateDeactivation(feature, catalog, issues);
    return;
  }
  const administrativeFormation = [
    SpatialFormationMode.ADMINISTRATIVE_UNIT_REUSE,
    SpatialFormationMode.ADMINISTRATIVE_UNIT_COMBINATION,
  ].includes(feature.spatial_formation_mode);
  if (administrativeFormation) {
    if (feature.target_object_type !== SpatialPlanTargetType.ZONE) issues.push("行政区域只能用于形成运营区域");
    validateAdministrativeUnitReferences(feature.source_spatial_unit_refs, issues);
    if (feature.spatial_formation_mode === SpatialFormationMode.ADMINISTRATIVE_UNIT_REUSE
      && feature.source_spatial_unit_refs.length !== 1) {
      issues.push("直接采用行政区域时只能选择一个行政区");
    }
    if (feature.spatial_formation_mode === SpatialFormationMode.ADMINISTRATIVE_UNIT_COMBINATION
      && feature.source_spatial_unit_refs.length < 2) {
      issues.push("组合行政区域时至少选择两个行政区");
    }
  }
  const geometryIssues = [];
  validatePolygonGeometry(feature.geometry_geojson, geometryIssues);
  issues.push(...geometryIssues);
  const coordinates = flattenGeometryCoordinates(feature.geometry_geojson);
  if (!coordinates.length || geometryIssues.length) return;
  const bounds = dataset?.geographic_bounds;
  if (Array.isArray(bounds) && coordinates.some((point) => !insideBounds(point, bounds))) issues.push("区域超出广州受控演示范围");
  if (!administrativeFormation
    && !geometryContains(GUANGZHOU_ADMINISTRATIVE_BOUNDARY.geometry, feature.geometry_geojson)) {
    issues.push("区域必须完整位于广州市行政范围内");
  }
  if (feature.source_feature_snapshot?.length) {
    const coverage = summarizeSpatialCoverage({
      targetType: feature.target_object_type,
      sourceFeatures: feature.source_feature_snapshot,
    });
    feature.spatial_validation_summary = coverage;
    issues.push(...coverage.coverage_issues.filter((issue) => issue.includes("不能只覆盖")));
  }
  if (feature.relationship_inference_status === "REQUIRES_ADJUSTMENT") {
    issues.push("空间关系存在冲突，请调整边界后重新规划");
  }
  if (feature.conflict_object_refs?.length) {
    issues.push(`边界与 ${feature.conflict_object_refs.length} 个既有空间对象部分重叠`);
  }
}

function validateDeactivation(feature, catalog, issues) {
  if (!feature.source_object_exists || !feature.target_object_id) {
    issues.push("只有已发布的城市空间对象可以停用");
    return;
  }
  const active = (collection) => (collection?.features || []).filter((item) => item.properties?.object_status !== "DISABLED");
  if (feature.target_object_type === "ZONE") {
    const dependencies = [
      ...active(catalog.zones).filter((item) => item.properties?.parent_zone_id === feature.target_object_id),
      ...active(catalog.places).filter((item) => item.properties?.zone_id === feature.target_object_id),
      ...active(catalog.serviceAreas).filter((item) => item.properties?.zone_id === feature.target_object_id),
      ...active(catalog.opsCenters).filter((item) => item.properties?.zone_id === feature.target_object_id),
    ];
    if (dependencies.length) issues.push(`该运营区域仍关联 ${dependencies.length} 个有效空间对象，请先调整或停用下级对象`);
  }
  if (feature.target_object_type === "PLACE") {
    const serviceAreas = active(catalog.serviceAreas).filter((item) => item.properties?.place_id === feature.target_object_id);
    const opsCenters = active(catalog.opsCenters).filter((item) => item.properties?.place_id === feature.target_object_id);
    if (serviceAreas.length || opsCenters.length) {
      issues.push(`该地点仍关联 ${serviceAreas.length + opsCenters.length} 个有效服务区域或运营中心，请先处理关联对象`);
    }
  }
}

function targetExists(feature, catalog) {
  const source = {
    ZONE: catalog.zones,
    PLACE: catalog.places,
    SERVICE_AREA: catalog.serviceAreas,
  }[feature.target_object_type] || [];
  const collection = Array.isArray(source) ? source : source.features || [];
  const key = { ZONE: "zone_id", PLACE: "place_id", SERVICE_AREA: "service_area_id" }[feature.target_object_type];
  return collection.some((item) => (item[key] || item.properties?.object_id) === feature.target_object_id);
}

function createImpactSummary(plan) {
  const existing = plan.spatial_plan_features.filter((feature) => feature.source_object_exists).length;
  const created = plan.spatial_plan_features.length - existing;
  return {
    affected_feature_count: plan.spatial_plan_features.length,
    existing_projection_update_count: existing,
    pending_initialization_count: created,
    demand_profile_recalculation_required: true,
    route_reassessment_required: true,
    simulation_runtime_changed: false,
    city_spatial_objects: plan.spatial_plan_features.map(createCitySpatialImpact),
  };
}

function assertEditable(plan) {
  if (!plan || ![OperatingSpatialPlanStatus.DRAFT, OperatingSpatialPlanStatus.VALIDATED].includes(plan.operating_spatial_plan_status)) {
    throw new Error("当前运营区域方案不可编辑");
  }
}

function nextSequence(plans) {
  return Math.max(0, ...plans.map((plan) => Number(String(plan.operating_spatial_plan_id || "").match(/(\d+)$/)?.[1] || 0))) + 1;
}

function insideBounds(point, bounds) {
  return point[0] >= bounds[0][0] && point[0] <= bounds[1][0] && point[1] >= bounds[0][1] && point[1] <= bounds[1][1];
}

function flattenGeometryCoordinates(geometry) {
  const output = [];
  const visit = (value) => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1])) {
      output.push(value);
      return;
    }
    value.forEach(visit);
  };
  visit(geometry?.coordinates);
  return output;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}
