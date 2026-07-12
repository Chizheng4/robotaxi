const STATIC_COLLECTIONS = ["maps", "cells", "roads", "roadNodes", "roadSegments", "places", "zones"];
const ID_FIELDS = {
  maps: "map_id",
  cells: "cell_id",
  roads: "road_id",
  roadNodes: "road_node_id",
  roadSegments: "road_segment_id",
  places: "place_id",
  serviceAreas: "service_area_id",
  zones: "zone_id",
  routes: "route_id",
  demandProfiles: "profile_id",
};

export function mergeSpatialCatalog(runtimeData = {}, catalogData = {}) {
  const merged = { ...runtimeData };

  for (const collection of STATIC_COLLECTIONS) {
    merged[collection] = mergeById({
      catalogRecords: catalogData[collection],
      runtimeRecords: runtimeData[collection],
      idField: ID_FIELDS[collection],
      catalogOwnsExisting: true,
    });
  }

  merged.serviceAreas = mergeById({
    catalogRecords: catalogData.serviceAreas,
    runtimeRecords: runtimeData.serviceAreas,
    idField: ID_FIELDS.serviceAreas,
    catalogOwnsExisting: false,
  });
  merged.routes = mergeById({
    catalogRecords: catalogData.routes,
    runtimeRecords: runtimeData.routes,
    idField: ID_FIELDS.routes,
    catalogOwnsExisting: false,
  });
  merged.demandProfiles = mergeById({
    catalogRecords: catalogData.demandProfiles,
    runtimeRecords: runtimeData.demandProfiles,
    idField: ID_FIELDS.demandProfiles,
    catalogOwnsExisting: false,
  });

  return merged;
}

export function isOperationalZone(zone) {
  return Boolean(zone && ["Testing", "Active"].includes(zone.zone_status));
}

export function isOperationalPlace(place) {
  return place?.place_status === "Active";
}

export function isOperationalServiceArea(serviceArea) {
  return serviceArea?.service_area_status === "ACTIVE";
}

function mergeById({ catalogRecords = [], runtimeRecords = [], idField, catalogOwnsExisting }) {
  const runtimeById = new Map((runtimeRecords || []).map((record) => [record?.[idField], record]));
  const catalogIds = new Set();
  const merged = (catalogRecords || []).map((catalogRecord) => {
    const id = catalogRecord?.[idField];
    catalogIds.add(id);
    const runtimeRecord = runtimeById.get(id);
    if (!runtimeRecord) return catalogRecord;
    return catalogOwnsExisting
      ? { ...runtimeRecord, ...catalogRecord }
      : { ...catalogRecord, ...runtimeRecord };
  });

  for (const runtimeRecord of runtimeRecords || []) {
    if (!catalogIds.has(runtimeRecord?.[idField])) merged.push(runtimeRecord);
  }
  return merged;
}
