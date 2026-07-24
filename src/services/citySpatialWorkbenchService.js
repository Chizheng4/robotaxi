import { materializeCitySpatialCatalog } from "./citySpatialObjectService.js?v=20260724-v049-12-0";

const COLLECTION_BY_PAGE = Object.freeze({
  cityZones: "zones",
  cityPlaces: "places",
  cityServiceAreas: "serviceAreas",
});

const OBJECT_TYPE_BY_PAGE = Object.freeze({
  cityZones: "ZONE",
  cityPlaces: "PLACE",
  cityServiceAreas: "SERVICE_AREA",
});

export function createCitySpatialWorkbench(baseCatalog = {}, plans = []) {
  const catalog = materializeCitySpatialCatalog(baseCatalog, plans);
  const pages = Object.fromEntries(Object.entries(COLLECTION_BY_PAGE).map(([page, collection]) => [
    page,
    featureRows(catalog[collection], OBJECT_TYPE_BY_PAGE[page]),
  ]));
  return Object.freeze({ catalog, pages: Object.freeze(pages) });
}

export function getCitySpatialObjectActions(row = {}) {
  return Object.freeze([
    Object.freeze({ key: "VIEW_MAP", label: "查看地图", enabled: true }),
    Object.freeze({ key: "VIEW_DETAIL", label: "查看详情", enabled: true }),
    Object.freeze({ key: "MANAGE_OBJECT", label: "管理对象", enabled: Boolean(row.spatial_object_id) }),
  ]);
}

export function isCitySpatialPage(page) {
  return Boolean(COLLECTION_BY_PAGE[page]);
}

function featureRows(collection = {}, objectType) {
  return (collection.features || []).map((feature) => {
    const properties = feature.properties || {};
    const {
      object_id: objectId,
      object_name: objectName,
      object_type: _objectType,
      object_status: objectStatus,
      ...businessProperties
    } = properties;
    return Object.freeze({
      ...businessProperties,
      spatial_object_id: objectId || feature.id,
      spatial_object_name: objectName || "",
      spatial_object_type: objectType,
      spatial_object_status: objectStatus || "ACTIVE",
      geometry_geojson: feature.geometry || null,
    });
  });
}
