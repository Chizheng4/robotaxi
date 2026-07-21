export const SpatialMode = Object.freeze({
  SIMULATION_GRID: "SIMULATION_GRID",
  GEOSPATIAL: "GEOSPATIAL",
});

export const CoordinateReferenceSystem = Object.freeze({
  WGS84: "EPSG:4326",
});

export const BasemapProvider = Object.freeze({
  OPEN_FREE_MAP: "OPEN_FREE_MAP",
  LOCAL_FALLBACK: "LOCAL_FALLBACK",
});

export function createMapDataset(input = {}) {
  return {
    map_dataset_id: input.map_dataset_id,
    map_dataset_version: input.map_dataset_version,
    map_id: input.map_id,
    spatial_mode: input.spatial_mode || SpatialMode.GEOSPATIAL,
    coordinate_reference_system: input.coordinate_reference_system || CoordinateReferenceSystem.WGS84,
    center_longitude: Number(input.center_longitude),
    center_latitude: Number(input.center_latitude),
    basemap_provider: input.basemap_provider || BasemapProvider.OPEN_FREE_MAP,
    basemap_style_url: input.basemap_style_url || "",
    data_attribution: input.data_attribution || "",
    dataset_status: input.dataset_status || "ACTIVE",
  };
}

