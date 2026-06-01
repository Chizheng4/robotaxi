import {
  CellType,
  Direction,
  NodeType,
  PeakPattern,
  PlaceType,
  RoadType,
  RouteStatus,
  Status,
  ZoneLevel,
  ZoneStatus,
  ZoneType,
  createCell,
  createMap,
  createPlace,
  createRoad,
  createRoadNode,
  createRoadSegment,
  createRoute,
  createServiceArea,
  createZone,
} from "../domain/types.js?v=20260601-ops";

const MAP_ID = "M-001";
const CELL_SIZE_M = 50;
const GRID_ROWS = 40;
const GRID_COLS = 40;

export function initializeMapSpace() {
  const map = createMap({
    map_id: MAP_ID,
    map_name: "20台Robotaxi最小运营模拟地图",
    map_width_m: 2000,
    map_height_m: 2000,
    cell_size_m: CELL_SIZE_M,
    grid_cols: GRID_COLS,
    grid_rows: GRID_ROWS,
    total_cells: GRID_ROWS * GRID_COLS,
    coordinate_type: "SIMULATION_GRID",
  });

  const cells = createCells(map);
  const cellById = new Map(cells.map((cell) => [cell.cell_id, cell]));
  const roadNodes = createRoadNodes(map);
  const roadSegments = createRoadSegments(map, roadNodes);

  roadSegments.forEach((segment) => {
    segment.cell_ids.forEach((cellId) => setCellType(cellById, cellId, CellType.ROAD, true));
  });

  const roads = createRoads(map, roadSegments);
  const places = createPlaces(map);

  places.forEach((place) => {
    place.cell_ids.forEach((cellId) => setCellType(cellById, cellId, CellType.PLACE, false));
  });

  const serviceAreas = createServiceAreas(map);
  attachServiceAreasToSegments(roadSegments, serviceAreas);
  attachServiceAreasToPlaces(places, serviceAreas);

  const zones = createZones(map, cells, roadSegments, places, serviceAreas);
  const routes = createRoutes(map, roadSegments);

  return {
    maps: [map],
    cells,
    roads,
    roadNodes,
    roadSegments,
    places,
    serviceAreas,
    zones,
    routes,
  };
}

function createCells(map) {
  const cells = [];

  for (let row = 0; row < map.grid_rows; row += 1) {
    for (let col = 0; col < map.grid_cols; col += 1) {
      cells.push(createCell({
        cell_id: cellId(row, col),
        map_id: map.map_id,
        row,
        col,
        base_cell_type: CellType.EMPTY,
        traversable: false,
      }));
    }
  }

  return cells;
}

function createRoads(map, roadSegments) {
  const definitions = [
    ["RD-001", "西侧纵向主路", RoadType.MAIN_ROAD],
    ["RD-002", "东侧纵向主路", RoadType.MAIN_ROAD],
    ["RD-003", "北侧横向主路", RoadType.MAIN_ROAD],
    ["RD-004", "南侧横向主路", RoadType.SECONDARY_ROAD],
    ["RD-005", "运营中心接入道路", RoadType.ACCESS_ROAD],
  ];

  return definitions.map(([roadId, roadName, roadType]) => createRoad({
    road_id: roadId,
    map_id: map.map_id,
    road_name: roadName,
    road_type: roadType,
    road_status: Status.ACTIVE,
    road_segment_ids: roadSegments
      .filter((segment) => segment.road_id === roadId)
      .map((segment) => segment.road_segment_id),
  }));
}

function createRoadNodes(map) {
  const definitions = [
    ["RN-001", 0, 10, NodeType.ROAD_ENDPOINT],
    ["RN-002", 12, 10, NodeType.INTERSECTION],
    ["RN-003", 28, 10, NodeType.INTERSECTION],
    ["RN-004", 39, 10, NodeType.ROAD_ENDPOINT],
    ["RN-005", 0, 25, NodeType.ROAD_ENDPOINT],
    ["RN-006", 12, 25, NodeType.INTERSECTION],
    ["RN-007", 28, 25, NodeType.INTERSECTION],
    ["RN-008", 39, 25, NodeType.ROAD_ENDPOINT],
    ["RN-009", 12, 0, NodeType.ROAD_ENDPOINT],
    ["RN-010", 12, 39, NodeType.ROAD_ENDPOINT],
    ["RN-011", 28, 0, NodeType.ROAD_ENDPOINT],
    ["RN-012", 28, 39, NodeType.ROAD_ENDPOINT],
    ["RN-013", 35, 25, NodeType.INTERSECTION],
    ["RN-014", 35, 31, NodeType.ENTRANCE_EXIT],
  ];

  return definitions.map(([roadNodeId, row, col, nodeType]) => createRoadNode({
    road_node_id: roadNodeId,
    map_id: map.map_id,
    cell_id: cellId(row, col),
    row,
    col,
    x: col * map.cell_size_m,
    y: row * map.cell_size_m,
    node_type: nodeType,
    node_status: Status.ACTIVE,
  }));
}

function createRoadSegments(map, roadNodes) {
  const nodeById = new Map(roadNodes.map((node) => [node.road_node_id, node]));
  const definitions = [
    ["RS-001", "RD-001", "RN-001", "RN-002", rangeCells({ col: 10, rowStart: 0, rowEnd: 12 })],
    ["RS-002", "RD-001", "RN-002", "RN-003", rangeCells({ col: 10, rowStart: 12, rowEnd: 28 })],
    ["RS-003", "RD-001", "RN-003", "RN-004", rangeCells({ col: 10, rowStart: 28, rowEnd: 39 })],
    ["RS-004", "RD-002", "RN-005", "RN-006", rangeCells({ col: 25, rowStart: 0, rowEnd: 12 })],
    ["RS-005", "RD-002", "RN-006", "RN-007", rangeCells({ col: 25, rowStart: 12, rowEnd: 28 })],
    ["RS-006", "RD-002", "RN-007", "RN-013", rangeCells({ col: 25, rowStart: 28, rowEnd: 35 })],
    ["RS-007", "RD-003", "RN-009", "RN-002", rangeCells({ row: 12, colStart: 0, colEnd: 10 })],
    ["RS-008", "RD-003", "RN-002", "RN-006", rangeCells({ row: 12, colStart: 10, colEnd: 25 })],
    ["RS-009", "RD-003", "RN-006", "RN-010", rangeCells({ row: 12, colStart: 25, colEnd: 39 })],
    ["RS-010", "RD-004", "RN-011", "RN-003", rangeCells({ row: 28, colStart: 0, colEnd: 10 })],
    ["RS-011", "RD-004", "RN-003", "RN-007", rangeCells({ row: 28, colStart: 10, colEnd: 25 })],
    ["RS-012", "RD-004", "RN-007", "RN-012", rangeCells({ row: 28, colStart: 25, colEnd: 39 })],
    ["RS-013", "RD-002", "RN-013", "RN-008", rangeCells({ col: 25, rowStart: 35, rowEnd: 39 })],
    ["RS-014", "RD-005", "RN-013", "RN-014", rangeCells({ row: 35, colStart: 25, colEnd: 31 })],
  ];

  return definitions.map(([segmentId, roadId, startNodeId, endNodeId, cellIds]) => {
    const startNode = nodeById.get(startNodeId);
    const endNode = nodeById.get(endNodeId);

    return createRoadSegment({
      road_segment_id: segmentId,
      road_id: roadId,
      map_id: map.map_id,
      start_node_id: startNodeId,
      end_node_id: endNodeId,
      cell_ids: cellIds,
      distance_m: distanceBetweenNodes(startNode, endNode, map.cell_size_m),
      direction: Direction.TWO_WAY,
      speed_limit_kmh: 40,
      traversable: true,
      segment_status: Status.ACTIVE,
      service_area_ids: [],
    });
  });
}

function createPlaces(map) {
  const definitions = [
    ["P-001", "住宅生活区", PlaceType.RESIDENTIAL, rectCells(2, 10, 2, 8), 0.9, PeakPattern.MORNING_OUTBOUND],
    ["P-002", "办公区", PlaceType.OFFICE, rectCells(2, 10, 28, 37), 0.85, PeakPattern.EVENING_OUTBOUND],
    ["P-003", "商业中心", PlaceType.COMMERCIAL, rectCells(15, 23, 15, 23), 0.75, PeakPattern.ALL_DAY_STABLE],
    ["P-004", "医院学校片区", PlaceType.HOSPITAL, rectCells(30, 37, 2, 9), 0.55, PeakPattern.ALL_DAY_STABLE],
    ["P-005", "地铁接驳点", PlaceType.METRO_STATION, rectCells(24, 27, 27, 31), 0.8, PeakPattern.ALL_DAY_STABLE],
  ];

  return definitions.map(([placeId, placeName, placeType, cellIds, demandWeight, peakPattern]) => createPlace({
    place_id: placeId,
    map_id: map.map_id,
    place_name: placeName,
    place_type: placeType,
    place_status: Status.ACTIVE,
    cell_ids: cellIds,
    demand_weight: demandWeight,
    peak_pattern: peakPattern,
    nearby_service_area_ids: [],
  }));
}

function createServiceAreas(map) {
  const serviceDefaults = {
    customer_capabilities: {
      can_pickup: true,
      can_dropoff: true,
      can_wait: true,
    },
    vehicle_capabilities: {
      can_stop_for_service: true,
      can_short_wait: true,
      can_stage: false,
      can_long_park: false,
    },
    max_vehicle_capacity: 3,
  };

  const stageDefaults = {
    customer_capabilities: {
      can_pickup: false,
      can_dropoff: false,
      can_wait: false,
    },
    vehicle_capabilities: {
      can_stop_for_service: false,
      can_short_wait: true,
      can_stage: true,
      can_long_park: false,
    },
    max_vehicle_capacity: 6,
  };

  const definitions = [
    ["SA-001", "住宅区东侧接驾区", ["RS-001"], rangeCells({ col: 10, rowStart: 5, rowEnd: 7 }), serviceDefaults],
    ["SA-002", "办公区西侧接驾区", ["RS-004"], rangeCells({ col: 25, rowStart: 5, rowEnd: 7 }), serviceDefaults],
    ["SA-003", "商业中心北侧上下客区", ["RS-008"], rangeCells({ row: 12, colStart: 17, colEnd: 20 }), serviceDefaults],
    ["SA-004", "医院学校东侧上下客区", ["RS-010"], rangeCells({ row: 28, colStart: 5, colEnd: 8 }), serviceDefaults],
    ["SA-005", "地铁站南侧接驳区", ["RS-012"], rangeCells({ row: 28, colStart: 26, colEnd: 27 }), serviceDefaults],
    ["SA-006", "运营中心接入道路待命区", ["RS-014"], rangeCells({ row: 35, colStart: 28, colEnd: 30 }), stageDefaults],
  ];

  return definitions.map(([serviceAreaId, name, segmentIds, coveredCellIds, defaults]) => createServiceArea({
    service_area_id: serviceAreaId,
    map_id: map.map_id,
    name,
    segment_ids: segmentIds,
    covered_cell_ids: coveredCellIds,
    customer_capabilities: { ...defaults.customer_capabilities },
    vehicle_capabilities: { ...defaults.vehicle_capabilities },
    max_vehicle_capacity: defaults.max_vehicle_capacity,
    status: Status.ACTIVE,
  }));
}

function createZones(map, cells, roadSegments, places, serviceAreas) {
  const definitions = [
    ["Z-001", null, "最小运营测试区", ZoneLevel.ZONE, ZoneType.MIXED_ZONE, rectCells(0, 39, 0, 39)],
    ["Z-001-A", "Z-001", "住宅生活子区", ZoneLevel.SUB_ZONE, ZoneType.RESIDENTIAL_ZONE, rectCells(0, 14, 0, 14)],
    ["Z-001-B", "Z-001", "办公通勤子区", ZoneLevel.SUB_ZONE, ZoneType.OFFICE_ZONE, rectCells(0, 14, 25, 39)],
    ["Z-001-C", "Z-001", "商业交通子区", ZoneLevel.SUB_ZONE, ZoneType.COMMERCIAL_ZONE, rectCells(12, 30, 12, 30)],
    ["Z-001-D", "Z-001", "医院学校子区", ZoneLevel.SUB_ZONE, ZoneType.MIXED_ZONE, rectCells(28, 39, 0, 14)],
  ];

  const zoneIds = definitions.map(([zoneId]) => zoneId);

  return definitions.map(([zoneId, parentZoneId, zoneName, zoneLevel, zoneType, cellIds]) => {
    const cellSet = new Set(cellIds);

    return createZone({
      zone_id: zoneId,
      map_id: map.map_id,
      parent_zone_id: parentZoneId,
      zone_name: zoneName,
      zone_level: zoneLevel,
      zone_type: zoneType,
      zone_status: ZoneStatus.TESTING,
      cell_ids: cells.filter((cell) => cellSet.has(cell.cell_id)).map((cell) => cell.cell_id),
      road_segment_ids: roadSegments
        .filter((segment) => segment.cell_ids.some((cellId) => cellSet.has(cellId)))
        .map((segment) => segment.road_segment_id),
      place_ids: places
        .filter((place) => place.cell_ids.some((cellId) => cellSet.has(cellId)))
        .map((place) => place.place_id),
      service_area_ids: serviceAreas
        .filter((area) => area.covered_cell_ids.some((cellId) => cellSet.has(cellId)))
        .map((area) => area.service_area_id),
      sub_zone_ids: parentZoneId ? [] : zoneIds.filter((id) => id !== zoneId),
    });
  });
}

function createRoutes(map, roadSegments) {
  const segmentById = new Map(roadSegments.map((segment) => [segment.road_segment_id, segment]));
  const definitions = [
    ["RT-001", "C-06-10", "C-06-25", ["RS-001", "RS-008", "RS-004"], ["SA-001", "SA-002"], "住宅区接驾区到办公区接驾区"],
    ["RT-002", "C-06-10", "C-12-18", ["RS-001", "RS-008"], ["SA-001", "SA-003"], "住宅区到商业中心"],
    ["RT-003", "C-12-18", "C-28-26", ["RS-008", "RS-005", "RS-012"], ["SA-003", "SA-005"], "商业中心到地铁接驳区"],
    ["RT-004", "C-28-06", "C-28-26", ["RS-010", "RS-011", "RS-012"], ["SA-004", "SA-005"], "医院学校区到地铁接驳区"],
    ["RT-005", "C-35-29", "C-06-25", ["RS-014", "RS-006", "RS-005", "RS-004"], ["SA-006", "SA-002"], "运营中心待命区到办公区"],
  ];

  return definitions.map(([routeId, startCellId, endCellId, segmentSequence, serviceAreaIds, routeName]) => {
    const totalDistance = segmentSequence.reduce((sum, segmentId) => sum + segmentById.get(segmentId).distance_m, 0);

    return createRoute({
      route_id: routeId,
      route_name: routeName,
      map_id: map.map_id,
      start_cell_id: startCellId,
      end_cell_id: endCellId,
      road_segment_sequence: segmentSequence,
      related_service_area_ids: serviceAreaIds,
      total_distance_m: totalDistance,
      estimated_time_s: Math.round(totalDistance / (40 * 1000 / 3600)),
      route_status: RouteStatus.ACTIVE,
    });
  });
}

function attachServiceAreasToSegments(roadSegments, serviceAreas) {
  roadSegments.forEach((segment) => {
    segment.service_area_ids = serviceAreas
      .filter((area) => area.segment_ids.includes(segment.road_segment_id))
      .map((area) => area.service_area_id);
  });
}

function attachServiceAreasToPlaces(places, serviceAreas) {
  const relation = {
    "P-001": ["SA-001"],
    "P-002": ["SA-002"],
    "P-003": ["SA-003"],
    "P-004": ["SA-004"],
    "P-005": ["SA-005"],
  };

  places.forEach((place) => {
    place.nearby_service_area_ids = relation[place.place_id] || [];
  });
}

function setCellType(cellById, id, type, traversable) {
  const cell = cellById.get(id);
  if (!cell) return;

  cell.base_cell_type = type;
  cell.traversable = traversable;
}

function distanceBetweenNodes(startNode, endNode, cellSizeM) {
  const rowDelta = Math.abs(startNode.row - endNode.row);
  const colDelta = Math.abs(startNode.col - endNode.col);
  return Math.max(rowDelta, colDelta) * cellSizeM;
}

function rangeCells({ row, col, rowStart, rowEnd, colStart, colEnd }) {
  const cells = [];

  if (typeof col === "number") {
    for (let currentRow = rowStart; currentRow <= rowEnd; currentRow += 1) {
      cells.push(cellId(currentRow, col));
    }
    return cells;
  }

  for (let currentCol = colStart; currentCol <= colEnd; currentCol += 1) {
    cells.push(cellId(row, currentCol));
  }

  return cells;
}

function rectCells(rowStart, rowEnd, colStart, colEnd) {
  const cells = [];

  for (let row = rowStart; row <= rowEnd; row += 1) {
    for (let col = colStart; col <= colEnd; col += 1) {
      cells.push(cellId(row, col));
    }
  }

  return cells;
}

function cellId(row, col) {
  return `C-${String(row).padStart(2, "0")}-${String(col).padStart(2, "0")}`;
}
