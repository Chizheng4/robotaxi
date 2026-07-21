import {
  OperatingSpatialPlanStatus,
  SpatialPlanTargetType,
  SpatialPlanValidationStatus,
  createOperatingSpatialPlan,
  createSpatialPlanFeature,
} from "../domain/operatingSpatialPlanTypes.js?v=20260721-v049-1-0";

const ALLOWED_TARGET_TYPES = new Set(Object.values(SpatialPlanTargetType));

export function createDraft({ plans = [], dataset, target, geometry, now = new Date().toISOString() }) {
  const sequence = nextSequence(plans);
  const planId = `OSP-${String(sequence).padStart(4, "0")}`;
  const previousVersions = plans.filter((plan) => plan.spatial_plan_features?.some((feature) => (
    feature.target_object_type === target.target_object_type
    && feature.target_object_id
    && feature.target_object_id === target.target_object_id
  )));
  return createOperatingSpatialPlan({
    operating_spatial_plan_id: planId,
    operating_spatial_plan_name: `${target.target_object_name || "未命名对象"}运营空间方案`,
    operating_spatial_plan_status: OperatingSpatialPlanStatus.DRAFT,
    spatial_plan_version: Math.max(0, ...previousVersions.map((plan) => Number(plan.spatial_plan_version || 0))) + 1,
    map_dataset_id: dataset.map_dataset_id,
    map_dataset_version: dataset.map_dataset_version,
    coordinate_reference_system: dataset.coordinate_reference_system,
    spatial_plan_features: [createSpatialPlanFeature({
      spatial_plan_feature_id: `${planId}-F01`,
      ...target,
      geometry_geojson: clone(geometry),
    })],
    validation_status: SpatialPlanValidationStatus.INVALID,
    created_at: now,
    updated_at: now,
  });
}

export function validateDraft(plan, { dataset, catalog = {} } = {}) {
  assertEditable(plan);
  const issues = [];
  if (!plan.operating_spatial_plan_name?.trim()) issues.push("请填写运营空间方案名称");
  if (plan.map_dataset_id !== dataset?.map_dataset_id || plan.map_dataset_version !== dataset?.map_dataset_version) {
    issues.push("方案引用的地图数据集版本与当前地图不一致");
  }
  if (plan.coordinate_reference_system !== "EPSG:4326") issues.push("当前只支持 WGS84 经纬度几何");
  if (!plan.spatial_plan_features?.length) issues.push("方案至少需要一个空间要素");

  for (const feature of plan.spatial_plan_features || []) {
    validateFeature(feature, dataset, catalog, issues);
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
    throw new Error("运营空间方案校验通过后才能发布");
  }
  const supersededIds = new Set(plan.spatial_plan_features
    .filter((feature) => feature.target_object_id)
    .map((feature) => `${feature.target_object_type}:${feature.target_object_id}`));
  const nextPlans = plans.map((item) => {
    if (item.operating_spatial_plan_status !== OperatingSpatialPlanStatus.PUBLISHED) return item;
    const overlaps = item.spatial_plan_features?.some((feature) => supersededIds.has(`${feature.target_object_type}:${feature.target_object_id}`));
    return overlaps ? { ...item, operating_spatial_plan_status: OperatingSpatialPlanStatus.CANCELLED, updated_at: now } : item;
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

export function getPublishedFeatures(plans = []) {
  return plans
    .filter((plan) => plan.operating_spatial_plan_status === OperatingSpatialPlanStatus.PUBLISHED)
    .flatMap((plan) => (plan.spatial_plan_features || []).map((feature) => ({
      ...clone(feature),
      operating_spatial_plan_id: plan.operating_spatial_plan_id,
      spatial_plan_version: plan.spatial_plan_version,
      published_at: plan.published_at,
    })));
}

function validateFeature(feature, dataset, catalog, issues) {
  if (!ALLOWED_TARGET_TYPES.has(feature.target_object_type)) issues.push("请选择运营区域、地点或服务区域");
  if (!feature.target_object_name?.trim()) issues.push("请填写目标对象名称");
  if (feature.target_object_id && !targetExists(feature, catalog)) issues.push(`目标对象 ${feature.target_object_id} 不存在`);
  const ring = feature.geometry_geojson?.type === "Polygon" ? feature.geometry_geojson.coordinates?.[0] : null;
  if (!Array.isArray(ring) || ring.length < 4) {
    issues.push("请在地图上绘制至少三个顶点的闭合区域");
    return;
  }
  if (!samePoint(ring[0], ring[ring.length - 1])) issues.push("区域边界必须闭合");
  if (ring.some((point) => !validCoordinate(point))) issues.push("区域包含无效经纬度坐标");
  if (Math.abs(polygonArea(ring)) < 1e-10) issues.push("区域面积过小或边界无效");
  const bounds = dataset?.geographic_bounds;
  if (Array.isArray(bounds) && ring.some((point) => !insideBounds(point, bounds))) issues.push("区域超出广州受控演示范围");
}

function targetExists(feature, catalog) {
  const collection = {
    ZONE: catalog.zones,
    PLACE: catalog.places,
    SERVICE_AREA: catalog.serviceAreas,
  }[feature.target_object_type] || [];
  const key = { ZONE: "zone_id", PLACE: "place_id", SERVICE_AREA: "service_area_id" }[feature.target_object_type];
  return collection.some((item) => item[key] === feature.target_object_id);
}

function createImpactSummary(plan) {
  const existing = plan.spatial_plan_features.filter((feature) => feature.target_object_id).length;
  const created = plan.spatial_plan_features.length - existing;
  return {
    affected_feature_count: plan.spatial_plan_features.length,
    existing_projection_update_count: existing,
    pending_initialization_count: created,
    demand_profile_recalculation_required: true,
    route_reassessment_required: true,
    simulation_runtime_changed: false,
  };
}

function assertEditable(plan) {
  if (!plan || ![OperatingSpatialPlanStatus.DRAFT, OperatingSpatialPlanStatus.VALIDATED].includes(plan.operating_spatial_plan_status)) {
    throw new Error("当前运营空间方案不可编辑");
  }
}

function nextSequence(plans) {
  return Math.max(0, ...plans.map((plan) => Number(String(plan.operating_spatial_plan_id || "").match(/(\d+)$/)?.[1] || 0))) + 1;
}

function validCoordinate(point) {
  return Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1])
    && point[0] >= -180 && point[0] <= 180 && point[1] >= -90 && point[1] <= 90;
}

function insideBounds(point, bounds) {
  return point[0] >= bounds[0][0] && point[0] <= bounds[1][0] && point[1] >= bounds[0][1] && point[1] <= bounds[1][1];
}

function samePoint(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left[0] === right[0] && left[1] === right[1];
}

function polygonArea(ring) {
  return ring.slice(0, -1).reduce((sum, point, index) => {
    const next = ring[index + 1];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}
