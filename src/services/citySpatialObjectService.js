import { PlaceType, ServiceAreaType, ZoneLevel } from "../domain/types.js?v=20260722-v049-4-0";
import { ZoneStructureMode } from "../domain/operatingSpatialPlanTypes.js?v=20260722-v049-5-0";
import { geometryContains } from "./spatialTopologyService.js?v=20260722-v049-5-0";

const OBJECT_CONFIG = Object.freeze({
  ZONE: { collection: "zones", prefix: "GZ-Z", objectType: "zone" },
  PLACE: { collection: "places", prefix: "GZ-P", objectType: "place" },
  SERVICE_AREA: { collection: "serviceAreas", prefix: "GZ-SA", objectType: "serviceArea" },
});

export function createCityObjectId(targetType, plans = [], catalog = {}) {
  const config = OBJECT_CONFIG[targetType];
  if (!config) throw new Error("不支持的城市空间对象类型");
  const ids = [
    ...collectCatalogIds(catalog, config.collection),
    ...(plans || []).flatMap((plan) => (plan.spatial_plan_features || [])
      .filter((feature) => feature.target_object_type === targetType)
      .map((feature) => feature.target_object_id)),
  ].filter(Boolean);
  const sequence = Math.max(0, ...ids.map((id) => Number(String(id).match(/(\d+)$/)?.[1] || 0))) + 1;
  return `${config.prefix}-${String(sequence).padStart(4, "0")}`;
}

export function materializeCitySpatialCatalog(baseCatalog = {}, plans = []) {
  const catalog = clone(baseCatalog);
  for (const plan of publishedPlans(plans, baseCatalog.spatial_scenario_id)) {
    for (const feature of plan.spatial_plan_features || []) {
      applyFeature(catalog, feature, plan);
    }
  }
  catalog.spatial_catalog_version = createCatalogVersion(baseCatalog.spatial_catalog_version, plans);
  return catalog;
}

export function validateSpatialPlanFeature(feature, catalog = {}, issues = []) {
  const targetType = feature.target_object_type;
  if (targetType === "ZONE") validateZone(feature, catalog, issues);
  if (targetType === "PLACE") validatePlace(feature, catalog, issues);
  if (targetType === "SERVICE_AREA") validateServiceArea(feature, catalog, issues);
  return issues;
}

export function validateCitySpatialCatalog(catalog = {}, issues = []) {
  const zones = activeFeatures(catalog.zones);
  const places = activeFeatures(catalog.places);
  const serviceAreas = activeFeatures(catalog.serviceAreas);
  for (const zone of zones) {
    const properties = zone.properties || {};
    if ((properties.zone_level || ZoneLevel.ZONE) === ZoneLevel.SUB_ZONE) {
      const parent = findFeature(catalog.zones, properties.parent_zone_id);
      if (!parent) issues.push(`${properties.object_name}缺少有效的一级运营区域`);
      else if (!geometryContains(parent.geometry, zone.geometry)) issues.push(`${properties.object_name}边界必须位于一级运营区域内`);
      continue;
    }
    const children = zones.filter((item) => item.properties?.parent_zone_id === properties.object_id);
    const expectsChildren = properties.zone_structure_mode === ZoneStructureMode.TWO_LEVEL;
    if (expectsChildren && !children.length) issues.push(`${properties.object_name}采用两级区域结构，但没有二级子区域`);
    if (!expectsChildren && children.length) issues.push(`${properties.object_name}采用一级区域结构，不能包含二级子区域`);
  }
  for (const item of [...places, ...serviceAreas]) {
    const zone = findFeature(catalog.zones, item.properties?.zone_id);
    if (!zone) issues.push(`${item.properties?.object_name || "空间对象"}缺少有效的直接归属区域`);
    else if (!geometryContains(zone.geometry, item.geometry)) issues.push(`${item.properties?.object_name || "空间对象"}边界必须位于直接归属区域内`);
    if (zone?.properties?.zone_level === ZoneLevel.ZONE
      && zone.properties.zone_structure_mode === ZoneStructureMode.TWO_LEVEL) {
      issues.push(`${item.properties?.object_name || "空间对象"}必须直接归属二级子区域`);
    }
  }
  for (const serviceArea of serviceAreas) {
    const place = findFeature(catalog.places, serviceArea.properties?.place_id);
    if (!place) issues.push(`${serviceArea.properties?.object_name || "服务区域"}缺少有效的关联地点`);
    else if (place.properties?.zone_id !== serviceArea.properties?.zone_id) {
      issues.push(`${serviceArea.properties?.object_name || "服务区域"}与关联地点必须归属同一运营区域`);
    }
  }
  return issues;
}

export function createCitySpatialImpact(feature) {
  return {
    city_object_id: feature.target_object_id,
    city_object_type: feature.target_object_type,
    grid_runtime_changed: false,
    business_runtime_enabled: false,
  };
}

export function getCitySpatialPlanningContract() {
  return {
    zoneLevels: [ZoneLevel.ZONE, ZoneLevel.SUB_ZONE],
    zoneStructureModes: Object.values(ZoneStructureMode),
    placeTypes: Object.values(PlaceType),
    serviceAreaTypes: Object.values(ServiceAreaType),
  };
}

function validateZone(feature, catalog, issues) {
  const level = feature.zone_level || ZoneLevel.ZONE;
  if (![ZoneLevel.ZONE, ZoneLevel.SUB_ZONE].includes(level)) {
    issues.push("城市运营区域只支持一级区域或二级子区域");
    return;
  }
  if (level === ZoneLevel.ZONE && feature.parent_zone_id) issues.push("一级运营区域不能设置父级区域");
  if (level === ZoneLevel.SUB_ZONE) {
    const parent = findFeature(catalog.zones, feature.parent_zone_id);
    if (!parent) issues.push("二级子区域必须选择有效的一级运营区域");
    else if ((parent.properties?.zone_level || ZoneLevel.ZONE) !== ZoneLevel.ZONE) issues.push("二级子区域的父级必须是一级运营区域");
    else if (!geometryContains(parent.geometry, feature.geometry_geojson)) issues.push("二级子区域边界必须位于一级运营区域内");
  }
}

function validatePlace(feature, catalog, issues) {
  if (!Object.values(PlaceType).includes(feature.place_type)) issues.push("请选择有效的地点类型");
  const zone = findFeature(catalog.zones, feature.zone_id);
  if (!zone) issues.push("地点必须归属有效运营区域");
  else if (!geometryContains(zone.geometry, feature.geometry_geojson)) issues.push("地点边界必须位于所选运营区域内");
  else if ((zone.properties?.zone_level || ZoneLevel.ZONE) === ZoneLevel.ZONE
    && zone.properties?.zone_structure_mode === ZoneStructureMode.TWO_LEVEL) {
    issues.push("两级区域中的地点必须直接归属二级子区域");
  }
}

function validateServiceArea(feature, catalog, issues) {
  const zone = findFeature(catalog.zones, feature.zone_id);
  const place = findFeature(catalog.places, feature.place_id);
  if (!zone) issues.push("服务区域必须归属有效运营区域");
  if (!place) issues.push("服务区域必须关联有效地点");
  if (zone && !geometryContains(zone.geometry, feature.geometry_geojson)) issues.push("服务区域边界必须位于所选运营区域内");
  if (zone && (zone.properties?.zone_level || ZoneLevel.ZONE) === ZoneLevel.ZONE
    && zone.properties?.zone_structure_mode === ZoneStructureMode.TWO_LEVEL) {
    issues.push("两级区域中的服务区域必须直接归属二级子区域");
  }
  if (place && place.properties?.zone_id && place.properties.zone_id !== feature.zone_id) issues.push("服务区域与关联地点必须归属同一运营区域");
}

function applyFeature(catalog, feature, plan) {
  const config = OBJECT_CONFIG[feature.target_object_type];
  if (!config || !feature.target_object_id) return;
  const collection = catalog[config.collection] || { type: "FeatureCollection", features: [] };
  const existing = (collection.features || []).findIndex((item) => item.properties?.object_id === feature.target_object_id);
  if (feature.spatial_change_type === "DEACTIVATE") {
    if (existing < 0) return;
    const features = [...(collection.features || [])];
    features[existing] = {
      ...features[existing],
      properties: {
        ...features[existing].properties,
        object_status: "DISABLED",
        operating_spatial_plan_id: plan.operating_spatial_plan_id,
        spatial_plan_id: plan.operating_spatial_plan_id,
        spatial_catalog_version: plan.spatial_plan_version,
      },
    };
    catalog[config.collection] = { type: "FeatureCollection", features };
    return;
  }
  const properties = {
    object_type: config.objectType,
    object_id: feature.target_object_id,
    object_name: feature.target_object_name,
    object_status: "ACTIVE",
    spatial_scenario_id: plan.spatial_scenario_id,
    spatial_catalog_version: plan.spatial_plan_version,
    operating_spatial_plan_id: plan.operating_spatial_plan_id,
    spatial_plan_id: plan.operating_spatial_plan_id,
    zone_id: feature.zone_id || null,
    parent_zone_id: feature.parent_zone_id || null,
    zone_level: feature.zone_level || null,
    zone_structure_mode: feature.zone_structure_mode || null,
    place_type: feature.place_type || null,
    place_id: feature.place_id || null,
    service_area_type: feature.service_area_type || null,
    source_feature_snapshot: clone(feature.source_feature_snapshot || []),
    spatial_validation_summary: clone(feature.spatial_validation_summary || null),
  };
  const next = {
    type: "Feature",
    id: feature.target_object_id,
    properties,
    geometry: clone(feature.geometry_geojson),
  };
  const features = [...(collection.features || [])];
  if (existing >= 0) {
    next.properties = { ...features[existing].properties, ...properties };
    features[existing] = next;
  } else {
    features.push(next);
  }
  catalog[config.collection] = { type: "FeatureCollection", features };
}

function activeFeatures(collection) {
  return (collection?.features || []).filter((feature) => feature.properties?.object_status !== "DISABLED");
}

function publishedPlans(plans, scenarioId) {
  return (plans || [])
    .filter((plan) => plan.operating_spatial_plan_status === "PUBLISHED" && (!scenarioId || plan.spatial_scenario_id === scenarioId))
    .sort((left, right) => String(left.published_at || "").localeCompare(String(right.published_at || "")));
}

function createCatalogVersion(baseVersion, plans) {
  const latest = publishedPlans(plans).at(-1);
  return latest ? `${baseVersion}+${latest.operating_spatial_plan_id}-v${latest.spatial_plan_version}` : baseVersion;
}

function collectCatalogIds(catalog, collectionName) {
  return (catalog?.[collectionName]?.features || []).map((feature) => feature.properties?.object_id || feature.id);
}

function findFeature(collection, id) {
  return (collection?.features || []).find((feature) => feature.properties?.object_status !== "DISABLED"
    && (feature.properties?.object_id || feature.id) === id) || null;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}
