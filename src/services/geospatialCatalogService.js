const EMPTY_COLLECTION = Object.freeze({ type: "FeatureCollection", features: [] });

export function createGeospatialScene(data = {}, dataset, projectionConfig = {}) {
  const map = (data.maps || []).find((item) => item.map_id === dataset?.map_id) || data.maps?.[0];
  if (!map || !dataset) return createEmptyScene(dataset);
  const projector = createCellProjector(map, dataset, projectionConfig);
  const route = resolveSelectedRoute(data);

  return {
    dataset,
    bounds: projector.mapBounds,
    zones: featureCollection((data.zones || [])
      .filter((zone) => !zone.parent_zone_id)
      .map((zone) => areaFeature("zone", zone.zone_id, zone.zone_name, zone.cell_ids, zone, projector))),
    places: featureCollection((data.places || [])
      .map((place) => areaFeature("place", place.place_id, place.place_name, place.cell_ids, place, projector))),
    serviceAreas: featureCollection((data.serviceAreas || [])
      .map((area) => areaFeature("serviceArea", area.service_area_id, area.service_area_name, area.cell_ids || area.covered_cell_ids, area, projector))),
    roads: featureCollection(createRoadFeatures(data, projector)),
    opsCenters: featureCollection((data.opsCenters || []).map((center) => pointFeature(
      "opsCenter",
      center.ops_center_id,
      center.ops_center_name,
      representativeCell(center.cell_ids, center.current_cell_id),
      center,
      projector,
    ))),
    robotaxis: featureCollection((data.robotaxis || data.robotaxi || []).map((robotaxi) => pointFeature(
      "robotaxi",
      robotaxi.robotaxi_id,
      robotaxi.robotaxi_id,
      robotaxi.current_cell_id,
      robotaxi,
      projector,
    )).filter(Boolean)),
    route: route ? featureCollection([routeFeature(route, data.roadSegments || [], projector)].filter(Boolean)) : EMPTY_COLLECTION,
  };
}

export function projectCellToLongitudeLatitude(cellId, map, dataset, projectionConfig = {}) {
  return createCellProjector(map, dataset, projectionConfig).cellCenter(cellId);
}

export function validateGeospatialScene(scene) {
  const errors = [];
  if (!scene?.dataset?.map_dataset_id) errors.push("缺少地图数据集编号");
  if (scene?.dataset?.coordinate_reference_system !== "EPSG:4326") errors.push("当前仅支持 EPSG:4326 地理事实");
  for (const key of ["zones", "places", "serviceAreas", "roads", "opsCenters", "robotaxis", "route"]) {
    if (scene?.[key]?.type !== "FeatureCollection") errors.push(`${key} 不是有效地理图层`);
  }
  return { valid: errors.length === 0, errors };
}

function createCellProjector(map, dataset, config) {
  const latitude = Number(dataset.center_latitude);
  const longitude = Number(dataset.center_longitude);
  const metersPerDegreeLatitude = 111320;
  const metersPerDegreeLongitude = metersPerDegreeLatitude * Math.cos(latitude * Math.PI / 180);
  const cellSize = Number(map.cell_size_m || 50);
  const anchorRow = Number(config.anchor_cell_row ?? map.grid_rows / 2);
  const anchorCol = Number(config.anchor_cell_col ?? map.grid_cols / 2);
  const angle = Number(config.rotation_degrees || 0) * Math.PI / 180;

  function project(row, col) {
    const east = (col - anchorCol) * cellSize;
    const north = (anchorRow - row) * cellSize;
    const rotatedEast = east * Math.cos(angle) - north * Math.sin(angle);
    const rotatedNorth = east * Math.sin(angle) + north * Math.cos(angle);
    return [longitude + rotatedEast / metersPerDegreeLongitude, latitude + rotatedNorth / metersPerDegreeLatitude];
  }

  function cellCenter(cellId) {
    const cell = parseCellId(cellId);
    return cell ? project(cell.row + 0.5, cell.col + 0.5) : null;
  }

  function cellPolygon(cellId) {
    const cell = parseCellId(cellId);
    if (!cell) return null;
    const points = [
      project(cell.row, cell.col),
      project(cell.row, cell.col + 1),
      project(cell.row + 1, cell.col + 1),
      project(cell.row + 1, cell.col),
    ];
    return [...points, points[0]];
  }

  const corners = [
    project(0, 0),
    project(0, map.grid_cols),
    project(map.grid_rows, map.grid_cols),
    project(map.grid_rows, 0),
  ];
  return {
    cellCenter,
    cellPolygon,
    mapBounds: [
      [Math.min(...corners.map(([lng]) => lng)), Math.min(...corners.map(([, lat]) => lat))],
      [Math.max(...corners.map(([lng]) => lng)), Math.max(...corners.map(([, lat]) => lat))],
    ],
  };
}

function areaFeature(objectType, id, name, cellIds = [], source, projector) {
  const polygons = [...new Set(cellIds || [])].map(projector.cellPolygon).filter(Boolean);
  return {
    type: "Feature",
    id,
    properties: objectProperties(objectType, id, name, source),
    geometry: { type: "MultiPolygon", coordinates: polygons.map((polygon) => [polygon]) },
  };
}

function pointFeature(objectType, id, name, cellId, source, projector) {
  const coordinates = projector.cellCenter(cellId);
  if (!coordinates) return null;
  return {
    type: "Feature",
    id,
    properties: objectProperties(objectType, id, name, source),
    geometry: { type: "Point", coordinates },
  };
}

function createRoadFeatures(data, projector) {
  const segmentsByRoad = new Map();
  for (const segment of data.roadSegments || []) {
    const list = segmentsByRoad.get(segment.road_id) || [];
    list.push(segment);
    segmentsByRoad.set(segment.road_id, list);
  }
  return (data.roads || []).flatMap((road) => {
    const segments = segmentsByRoad.get(road.road_id) || [];
    return segments.map((segment) => ({
      type: "Feature",
      id: segment.road_segment_id,
      properties: objectProperties("road", road.road_id, road.road_name, { ...road, ...segment }),
      geometry: {
        type: "LineString",
        coordinates: (segment.cell_sequence || segment.cell_ids || []).map(projector.cellCenter).filter(Boolean),
      },
    })).filter((feature) => feature.geometry.coordinates.length > 1);
  });
}

function routeFeature(route, roadSegments, projector) {
  const cells = Array.isArray(route.route_steps)
    ? route.route_steps.map((step) => step.cell_id)
    : (route.road_segment_sequence || []).flatMap((segmentId) => roadSegments.find((item) => item.road_segment_id === segmentId)?.cell_sequence || []);
  const coordinates = cells.map(projector.cellCenter).filter(Boolean);
  if (coordinates.length < 2) return null;
  return {
    type: "Feature",
    id: route.route_id,
    properties: objectProperties("route", route.route_id, route.route_id, route),
    geometry: { type: "LineString", coordinates },
  };
}

function resolveSelectedRoute(data) {
  const selectedRouteId = data.selectedRouteId || data.selectedRobotaxi?.current_route_id;
  return selectedRouteId ? (data.routes || []).find((route) => route.route_id === selectedRouteId) : null;
}

function representativeCell(cellIds = [], fallback = null) {
  if (fallback) return fallback;
  if (!cellIds?.length) return null;
  const parsed = cellIds.map(parseCellId).filter(Boolean);
  const row = Math.round(parsed.reduce((sum, cell) => sum + cell.row, 0) / parsed.length);
  const col = Math.round(parsed.reduce((sum, cell) => sum + cell.col, 0) / parsed.length);
  return `C-${String(row).padStart(2, "0")}-${String(col).padStart(2, "0")}`;
}

function objectProperties(objectType, id, name, source = {}) {
  return {
    object_type: objectType,
    object_id: id,
    object_name: name || id,
    object_status: source.zone_status || source.place_status || source.service_area_status || source.road_status || source.ops_center_status || source.availability_status || source.route_status || "",
  };
}

function featureCollection(features) {
  return { type: "FeatureCollection", features: features.filter(Boolean) };
}

function createEmptyScene(dataset) {
  return {
    dataset,
    bounds: null,
    zones: EMPTY_COLLECTION,
    places: EMPTY_COLLECTION,
    serviceAreas: EMPTY_COLLECTION,
    roads: EMPTY_COLLECTION,
    opsCenters: EMPTY_COLLECTION,
    robotaxis: EMPTY_COLLECTION,
    route: EMPTY_COLLECTION,
  };
}

function parseCellId(cellId) {
  const match = String(cellId || "").match(/^C-(\d+)-(\d+)$/);
  return match ? { row: Number(match[1]), col: Number(match[2]) } : null;
}
