import { geometryBounds, geometryContains, geometryIntersects } from "./spatialTopologyService.js?v=20260722-v049-6-0";

export const SpatialPlanningZoomBand = Object.freeze({
  CITY: "CITY",
  ZONE: "ZONE",
  PLACE: "PLACE",
  SERVICE_AREA: "SERVICE_AREA",
});

export function resolvePlanningContext({ zoom = 0, catalog = {} } = {}) {
  const activeZones = features(catalog.zones);
  const hasFirstLevelZone = activeZones.some((feature) => (feature.properties?.zone_level || "ZONE") === "ZONE");
  if (zoom < 10) return context(SpatialPlanningZoomBand.CITY, "ZONE", "ZONE", "当前视角适合规划一级运营区域");
  if (zoom < 12) return hasFirstLevelZone
    ? context(SpatialPlanningZoomBand.ZONE, "ZONE", "SUB_ZONE", "当前视角可规划二级子区域")
    : context(SpatialPlanningZoomBand.ZONE, "ZONE", "ZONE", "请先规划一级运营区域");
  if (zoom < 14) return context(SpatialPlanningZoomBand.PLACE, "PLACE", null, "当前视角适合规划地点");
  return context(SpatialPlanningZoomBand.SERVICE_AREA, "SERVICE_AREA", null, "当前视角适合规划服务区域");
}

export function inferSpatialRelationships({ targetType, geometry, catalog = {}, existingObjectId = null, requestedZoneLevel = null } = {}) {
  const zones = features(catalog.zones).filter((feature) => objectId(feature) !== existingObjectId);
  const places = features(catalog.places).filter((feature) => objectId(feature) !== existingObjectId);
  const serviceAreas = features(catalog.serviceAreas).filter((feature) => objectId(feature) !== existingObjectId);
  const containingZones = zones.filter((feature) => geometryContains(feature.geometry, geometry)).sort(compareArea);
  const containingPlaces = places.filter((feature) => geometryContains(feature.geometry, geometry)).sort(compareArea);
  const intersectingPlaces = places.filter((feature) => geometryIntersects(feature.geometry, geometry)).sort(compareArea);
  const issues = [];
  const conflicts = [];
  const contained = [];

  for (const feature of [...zones, ...places, ...serviceAreas]) {
    if (!geometryIntersects(feature.geometry, geometry)) continue;
    if (targetType === "SERVICE_AREA" && feature.properties?.object_type === "place") continue;
    if (geometryContains(geometry, feature.geometry)) contained.push(reference(feature));
    else if (!geometryContains(feature.geometry, geometry)) conflicts.push(reference(feature));
  }
  if (conflicts.length) issues.push(`边界与 ${conflicts.length} 个既有空间对象发生部分重叠，请调整为完整包含或完全分离`);

  if (targetType === "ZONE") {
    const parent = containingZones.find((feature) => (feature.properties?.zone_level || "ZONE") === "ZONE");
    if (requestedZoneLevel === "SUB_ZONE" && !parent) issues.push("二级子区域必须完整位于一个一级运营区域内");
    if (requestedZoneLevel === "ZONE" && parent) issues.push("一级运营区域不能位于另一个一级运营区域内；请改为二级子区域或调整边界");
    const resolvedLevel = requestedZoneLevel || (parent ? "SUB_ZONE" : "ZONE");
    return result({
      zone_level: resolvedLevel,
      parent_zone_id: resolvedLevel === "SUB_ZONE" && parent ? objectId(parent) : null,
      zone_structure_mode: resolvedLevel === "SUB_ZONE" ? null : (contained.some((item) => item.object_type === "zone") ? "TWO_LEVEL" : "FLAT"),
    }, contained, conflicts, issues);
  }

  const directZone = containingZones[0];
  if (!directZone) issues.push(targetType === "PLACE" ? "地点必须完整位于运营区域内" : "服务区域必须完整位于运营区域内");
  if (targetType === "PLACE") {
    return result({ zone_id: directZone ? objectId(directZone) : null }, contained, conflicts, issues);
  }

  const placeCandidates = containingPlaces.length ? containingPlaces : intersectingPlaces;
  const relatedPlace = placeCandidates[0];
  if (!relatedPlace) issues.push("服务区域必须位于或紧邻一个已发布地点");
  if (placeCandidates.length > 1) issues.push("服务区域同时关联多个地点，请缩小边界以明确唯一地点");
  if (relatedPlace?.properties?.zone_id && directZone && relatedPlace.properties.zone_id !== objectId(directZone)) {
    issues.push("服务区域与关联地点不属于同一运营区域");
  }
  return result({
    zone_id: directZone ? objectId(directZone) : relatedPlace?.properties?.zone_id || null,
    place_id: relatedPlace ? objectId(relatedPlace) : null,
  }, contained, conflicts, issues);
}

function context(zoomBand, targetType, zoneLevel, message) {
  return { zoom_band: zoomBand, recommended_target_type: targetType, recommended_zone_level: zoneLevel, message };
}

function result(relationships, contained, conflicts, issues) {
  return {
    relationships,
    contained_object_refs: contained,
    conflict_object_refs: conflicts,
    inference_status: issues.length ? "REQUIRES_ADJUSTMENT" : "CONFIRMED",
    issues,
  };
}

function features(collection) {
  return (collection?.features || []).filter((feature) => feature.properties?.object_status !== "DISABLED");
}

function objectId(feature) {
  return feature?.properties?.object_id || feature?.id || null;
}

function reference(feature) {
  return {
    object_type: feature.properties?.object_type || "",
    object_id: objectId(feature),
    object_name: feature.properties?.object_name || objectId(feature),
  };
}

function compareArea(left, right) {
  return boundsArea(left.geometry) - boundsArea(right.geometry);
}

function boundsArea(geometry) {
  const bounds = geometryBounds(geometry);
  return bounds ? (bounds.maxLng - bounds.minLng) * (bounds.maxLat - bounds.minLat) : Infinity;
}
