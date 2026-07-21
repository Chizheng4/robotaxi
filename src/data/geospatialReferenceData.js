import {
  BasemapProvider,
  CoordinateReferenceSystem,
  SpatialMode,
  createMapDataset,
} from "../domain/geospatialTypes.js?v=20260721-v049-0-0";

export const GEOSPATIAL_MAP_DATASET = Object.freeze(createMapDataset({
  map_dataset_id: "MAP-DATASET-GZ-DEMO-001",
  map_dataset_version: "2026.07.21-1",
  map_id: "M-001",
  spatial_mode: SpatialMode.GEOSPATIAL,
  coordinate_reference_system: CoordinateReferenceSystem.WGS84,
  center_longitude: 113.2644,
  center_latitude: 23.1291,
  basemap_provider: BasemapProvider.OPEN_FREE_MAP,
  basemap_style_url: "https://tiles.openfreemap.org/styles/liberty",
  data_attribution: "底图 © OpenFreeMap；地图数据 © OpenStreetMap contributors",
  geographic_bounds: [[112.9, 22.75], [114.05, 23.95]],
}));

export const GEOSPATIAL_PROJECTION_CONFIG = Object.freeze({
  map_dataset_id: GEOSPATIAL_MAP_DATASET.map_dataset_id,
  anchor_cell_row: 20,
  anchor_cell_col: 42,
  rotation_degrees: -8,
});
