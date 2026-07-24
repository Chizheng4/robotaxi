import { GUANGZHOU_ADMINISTRATIVE_DISTRICT_DATASET } from "../data/guangzhouAdministrativeDistricts.js?v=20260724-v049-10-0";

const DISTRICT_TYPE = "ADMINISTRATIVE_DISTRICT";

export function getGuangzhouAdministrativeUnits() {
  return GUANGZHOU_ADMINISTRATIVE_DISTRICT_DATASET.feature_collection.features.map((feature) => ({
    spatial_unit_id: `CN-44-${feature.properties.adcode}`,
    spatial_unit_name: feature.properties.name,
    spatial_unit_type: DISTRICT_TYPE,
    administrative_code: String(feature.properties.adcode),
    administrative_level: "DISTRICT",
    source_dataset_id: GUANGZHOU_ADMINISTRATIVE_DISTRICT_DATASET.source_dataset_id,
    source_dataset_version: GUANGZHOU_ADMINISTRATIVE_DISTRICT_DATASET.source_dataset_version,
    geometry_geojson: clone(feature.geometry),
    center_coordinates: clone(feature.properties.centroid || feature.properties.center),
  }));
}

export function getAdministrativeUnitOptions() {
  return getGuangzhouAdministrativeUnits().map((unit) => ({
    value: unit.spatial_unit_id,
    label: unit.spatial_unit_name,
  }));
}

export function createAdministrativeUnitReferences(spatialUnitIds = []) {
  const byId = new Map(getGuangzhouAdministrativeUnits().map((unit) => [unit.spatial_unit_id, unit]));
  return [...new Set(spatialUnitIds)].map((id) => {
    const unit = byId.get(id);
    if (!unit) throw new Error(`未找到行政区空间单元：${id}`);
    return {
      source_spatial_unit_id: unit.spatial_unit_id,
      source_spatial_unit_name: unit.spatial_unit_name,
      source_spatial_unit_type: unit.spatial_unit_type,
      administrative_code: unit.administrative_code,
      administrative_level: unit.administrative_level,
      source_dataset_id: unit.source_dataset_id,
      source_dataset_version: unit.source_dataset_version,
    };
  });
}

export function deriveGeometryFromAdministrativeUnits(spatialUnitIds = []) {
  const selected = resolveUnits(spatialUnitIds);
  if (!selected.length) throw new Error("请至少选择一个广州市行政区");
  if (selected.length === 1) return clone(selected[0].geometry_geojson);
  return {
    type: "MultiPolygon",
    coordinates: selected.flatMap((unit) => (
      unit.geometry_geojson.type === "MultiPolygon"
        ? clone(unit.geometry_geojson.coordinates)
        : [clone(unit.geometry_geojson.coordinates)]
    )),
  };
}

export function createAdministrativeUnitCollection() {
  return {
    type: "FeatureCollection",
    features: getGuangzhouAdministrativeUnits().map((unit) => ({
      type: "Feature",
      id: unit.spatial_unit_id,
      properties: {
        object_type: "administrativeUnit",
        object_id: unit.spatial_unit_id,
        object_name: unit.spatial_unit_name,
        spatial_unit_type: unit.spatial_unit_type,
        administrative_code: unit.administrative_code,
        administrative_level: unit.administrative_level,
        source_dataset_id: unit.source_dataset_id,
        source_dataset_version: unit.source_dataset_version,
      },
      geometry: clone(unit.geometry_geojson),
    })),
  };
}

export function validateAdministrativeUnitReferences(references = [], issues = []) {
  const units = new Map(getGuangzhouAdministrativeUnits().map((unit) => [unit.spatial_unit_id, unit]));
  if (!references.length) {
    issues.push("行政区域方案至少需要一个来源行政区");
    return issues;
  }
  for (const reference of references) {
    const unit = units.get(reference.source_spatial_unit_id);
    if (!unit) {
      issues.push(`来源行政区 ${reference.source_spatial_unit_id || "未知"} 不存在`);
      continue;
    }
    if (reference.source_dataset_id !== unit.source_dataset_id
      || reference.source_dataset_version !== unit.source_dataset_version) {
      issues.push(`${unit.spatial_unit_name}的地理数据版本与当前目录不一致`);
    }
  }
  return issues;
}

function resolveUnits(spatialUnitIds = []) {
  const units = new Map(getGuangzhouAdministrativeUnits().map((unit) => [unit.spatial_unit_id, unit]));
  return [...new Set(spatialUnitIds)].map((id) => units.get(id)).filter(Boolean);
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}
