export const OperatingSpatialPlanStatus = Object.freeze({
  DRAFT: "DRAFT",
  VALIDATED: "VALIDATED",
  PUBLISHED: "PUBLISHED",
  CANCELLED: "CANCELLED",
});

export const SpatialPlanTargetType = Object.freeze({
  ZONE: "ZONE",
  PLACE: "PLACE",
  SERVICE_AREA: "SERVICE_AREA",
});

export const SpatialPlanValidationStatus = Object.freeze({
  VALID: "VALID",
  INVALID: "INVALID",
});

export function createOperatingSpatialPlan(input = {}) {
  return {
    operating_spatial_plan_id: input.operating_spatial_plan_id,
    operating_spatial_plan_name: input.operating_spatial_plan_name,
    operating_spatial_plan_status: input.operating_spatial_plan_status || OperatingSpatialPlanStatus.DRAFT,
    spatial_plan_version: Number(input.spatial_plan_version || 1),
    map_dataset_id: input.map_dataset_id,
    map_dataset_version: input.map_dataset_version,
    coordinate_reference_system: input.coordinate_reference_system || "EPSG:4326",
    spatial_plan_features: Array.isArray(input.spatial_plan_features) ? input.spatial_plan_features : [],
    validation_status: input.validation_status || SpatialPlanValidationStatus.INVALID,
    validation_issues: Array.isArray(input.validation_issues) ? input.validation_issues : [],
    impact_summary: input.impact_summary || null,
    created_at: input.created_at,
    updated_at: input.updated_at,
    published_at: input.published_at || null,
  };
}

export function createSpatialPlanFeature(input = {}) {
  return {
    spatial_plan_feature_id: input.spatial_plan_feature_id,
    target_object_type: input.target_object_type,
    target_object_id: input.target_object_id || null,
    target_object_name: input.target_object_name,
    geometry_type: input.geometry_geojson?.type || input.geometry_type || "Polygon",
    geometry_geojson: input.geometry_geojson,
    parent_zone_id: input.parent_zone_id || null,
  };
}
