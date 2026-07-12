import {
  CellType,
  AllowedDirection,
  Direction,
  NodeType,
  PeakPattern,
  PlaceType,
  RoadType,
  RouteStatus,
  SegmentStatus,
  ServiceAreaStatus,
  ServiceAreaType,
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
} from "../domain/types.js?v=20260608-v018-bfs-route-planning";
import { ZONE1_OPS_CENTER_CELL_IDS } from "./spatialReferenceData.js?v=20260712-v042-0-5";

const MAP_ID = "M-001";
const CELL_SIZE_M = 50;
const GRID_ROWS = 40;
const GRID_COLS = 84;

export function initializeMapSpace() {
  const map = createMap({
    map_id: MAP_ID,
    map_name: "双区域 Robotaxi 运营网络地图",
    map_width_m: GRID_COLS * CELL_SIZE_M,
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
    segment.cell_sequence.forEach((cellId) => setCellType(cellById, cellId, CellType.ROAD, true));
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
  return {
    maps: [map],
    cells,
    roads,
    roadNodes,
    roadSegments,
    places,
    serviceAreas,
    zones,
    routes: [],
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
    ["RD-006", "区域连接通道", RoadType.MAIN_ROAD],
    ["RD-101", "东部西侧纵向主路", RoadType.MAIN_ROAD],
    ["RD-102", "东部东侧纵向主路", RoadType.MAIN_ROAD],
    ["RD-103", "东部北侧横向主路", RoadType.MAIN_ROAD],
    ["RD-104", "东部南侧横向主路", RoadType.SECONDARY_ROAD],
    ["RD-105", "东部运营中心接入道路", RoadType.ACCESS_ROAD],
    ["RD-106", "跨区域外围环路", RoadType.MAIN_ROAD],
  ];

  return definitions.map(([roadId, roadName, roadType]) => createRoad({
    road_id: roadId,
    map_id: map.map_id,
    road_name: roadName,
    road_type: roadType,
    road_status: roadId.startsWith("RD-1") || roadId === "RD-006" ? Status.PLANNED : Status.ACTIVE,
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
    ["RN-101", 0, 54, NodeType.ROAD_ENDPOINT],
    ["RN-102", 12, 54, NodeType.INTERSECTION],
    ["RN-103", 28, 54, NodeType.INTERSECTION],
    ["RN-104", 39, 54, NodeType.ROAD_ENDPOINT],
    ["RN-105", 0, 69, NodeType.ROAD_ENDPOINT],
    ["RN-106", 12, 69, NodeType.INTERSECTION],
    ["RN-107", 28, 69, NodeType.INTERSECTION],
    ["RN-108", 39, 69, NodeType.ROAD_ENDPOINT],
    ["RN-109", 12, 44, NodeType.ROAD_ENDPOINT],
    ["RN-110", 12, 83, NodeType.ROAD_ENDPOINT],
    ["RN-111", 28, 44, NodeType.ROAD_ENDPOINT],
    ["RN-112", 28, 83, NodeType.ROAD_ENDPOINT],
    ["RN-113", 35, 69, NodeType.INTERSECTION],
    ["RN-114", 35, 77, NodeType.ENTRANCE_EXIT],
    ["RN-115", 0, 0, NodeType.ROAD_ENDPOINT],
    ["RN-116", 0, 83, NodeType.ROAD_ENDPOINT],
    ["RN-117", 39, 83, NodeType.ROAD_ENDPOINT],
    ["RN-118", 39, 0, NodeType.ROAD_ENDPOINT],
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
    node_status: roadNodeId.startsWith("RN-1") && Number(roadNodeId.slice(3)) >= 100 ? Status.PLANNED : Status.ACTIVE,
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
    ["RS-015", "RD-006", "RN-010", "RN-109", rangeCells({ row: 12, colStart: 39, colEnd: 44 })],
    ["RS-101", "RD-101", "RN-101", "RN-102", rangeCells({ col: 54, rowStart: 0, rowEnd: 12 })],
    ["RS-102", "RD-101", "RN-102", "RN-103", rangeCells({ col: 54, rowStart: 12, rowEnd: 28 })],
    ["RS-103", "RD-101", "RN-103", "RN-104", rangeCells({ col: 54, rowStart: 28, rowEnd: 39 })],
    ["RS-104", "RD-102", "RN-105", "RN-106", rangeCells({ col: 69, rowStart: 0, rowEnd: 12 })],
    ["RS-105", "RD-102", "RN-106", "RN-107", rangeCells({ col: 69, rowStart: 12, rowEnd: 28 })],
    ["RS-106", "RD-102", "RN-107", "RN-113", rangeCells({ col: 69, rowStart: 28, rowEnd: 35 })],
    ["RS-107", "RD-103", "RN-109", "RN-102", rangeCells({ row: 12, colStart: 44, colEnd: 54 })],
    ["RS-108", "RD-103", "RN-102", "RN-106", rangeCells({ row: 12, colStart: 54, colEnd: 69 })],
    ["RS-109", "RD-103", "RN-106", "RN-110", rangeCells({ row: 12, colStart: 69, colEnd: 83 })],
    ["RS-110", "RD-104", "RN-111", "RN-103", rangeCells({ row: 28, colStart: 44, colEnd: 54 })],
    ["RS-111", "RD-104", "RN-103", "RN-107", rangeCells({ row: 28, colStart: 54, colEnd: 69 })],
    ["RS-112", "RD-104", "RN-107", "RN-112", rangeCells({ row: 28, colStart: 69, colEnd: 83 })],
    ["RS-113", "RD-102", "RN-113", "RN-108", rangeCells({ col: 69, rowStart: 35, rowEnd: 39 })],
    ["RS-114", "RD-105", "RN-113", "RN-114", rangeCells({ row: 35, colStart: 69, colEnd: 77 })],
    ["RS-115", "RD-106", "RN-115", "RN-001", rangeCells({ row: 0, colStart: 0, colEnd: 10 })],
    ["RS-116", "RD-106", "RN-001", "RN-005", rangeCells({ row: 0, colStart: 10, colEnd: 25 })],
    ["RS-117", "RD-106", "RN-005", "RN-101", rangeCells({ row: 0, colStart: 25, colEnd: 54 })],
    ["RS-118", "RD-106", "RN-101", "RN-105", rangeCells({ row: 0, colStart: 54, colEnd: 69 })],
    ["RS-119", "RD-106", "RN-105", "RN-116", rangeCells({ row: 0, colStart: 69, colEnd: 83 })],
    ["RS-120", "RD-106", "RN-116", "RN-110", rangeCells({ col: 83, rowStart: 0, rowEnd: 12 })],
    ["RS-121", "RD-106", "RN-110", "RN-112", rangeCells({ col: 83, rowStart: 12, rowEnd: 28 })],
    ["RS-122", "RD-106", "RN-112", "RN-117", rangeCells({ col: 83, rowStart: 28, rowEnd: 39 })],
    ["RS-123", "RD-106", "RN-118", "RN-004", rangeCells({ row: 39, colStart: 0, colEnd: 10 })],
    ["RS-124", "RD-106", "RN-004", "RN-008", rangeCells({ row: 39, colStart: 10, colEnd: 25 })],
    ["RS-125", "RD-106", "RN-008", "RN-104", rangeCells({ row: 39, colStart: 25, colEnd: 54 })],
    ["RS-126", "RD-106", "RN-104", "RN-108", rangeCells({ row: 39, colStart: 54, colEnd: 69 })],
    ["RS-127", "RD-106", "RN-108", "RN-117", rangeCells({ row: 39, colStart: 69, colEnd: 83 })],
    ["RS-128", "RD-106", "RN-115", "RN-009", rangeCells({ col: 0, rowStart: 0, rowEnd: 12 })],
    ["RS-129", "RD-106", "RN-009", "RN-011", rangeCells({ col: 0, rowStart: 12, rowEnd: 28 })],
    ["RS-130", "RD-106", "RN-011", "RN-118", rangeCells({ col: 0, rowStart: 28, rowEnd: 39 })],
  ];

  return definitions.map(([segmentId, roadId, startNodeId, endNodeId, cellIds]) => {
    const startNode = nodeById.get(startNodeId);
    const endNode = nodeById.get(endNodeId);
    const distanceM = distanceBetweenNodes(startNode, endNode, map.cell_size_m);

    return createRoadSegment({
      road_segment_id: segmentId,
      road_id: roadId,
      map_id: map.map_id,
      start_node_id: startNodeId,
      end_node_id: endNodeId,
      cell_ids: cellIds,
      cell_sequence: cellIds,
      distance_m: distanceM,
      total_distance_km: distanceM / 1000,
      direction: inferSegmentDirection(startNode, endNode),
      allowed_direction: AllowedDirection.BIDIRECTIONAL,
      speed_limit_kmh: 40,
      traversable: true,
      segment_status: segmentId.startsWith("RS-1") || segmentId === "RS-015" ? SegmentStatus.PLANNED : SegmentStatus.ACTIVE,
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
    ["P-006", "最小运营测试中心", PlaceType.OPS_CENTER, ZONE1_OPS_CENTER_CELL_IDS, 0.2, PeakPattern.MORNING_OUTBOUND],
    ["P-101", "东部滨水居住区", PlaceType.RESIDENTIAL, rectCells(2, 10, 46, 52), 0.82, PeakPattern.MORNING_OUTBOUND],
    ["P-102", "东部科技办公区", PlaceType.OFFICE, rectCells(2, 10, 72, 81), 0.92, PeakPattern.EVENING_OUTBOUND],
    ["P-103", "东部城市商业中心", PlaceType.COMMERCIAL, rectCells(15, 23, 59, 67), 0.78, PeakPattern.ALL_DAY_STABLE],
    ["P-104", "东部综合交通枢纽", PlaceType.TRANSPORT_HUB, rectCells(30, 37, 46, 52), 0.88, PeakPattern.ALL_DAY_STABLE],
    ["P-105", "东部酒店会展区", PlaceType.HOTEL, rectCells(29, 33, 72, 81), 0.68, PeakPattern.EVENT_DRIVEN],
    ["P-106", "东部规划运营中心", PlaceType.OPS_CENTER, rectCells(34, 35, 78, 79), 0.2, PeakPattern.LOW_DEMAND],
  ];

  return definitions.map(([placeId, placeName, placeType, cellIds, demandWeight, peakPattern]) => createPlace({
    place_id: placeId,
    map_id: map.map_id,
    place_name: placeName,
    place_type: placeType,
    place_status: placeId.startsWith("P-1") ? Status.PLANNED : Status.ACTIVE,
    cell_ids: cellIds,
    demand_weight: demandWeight,
    peak_pattern: peakPattern,
    nearby_service_area_ids: [],
  }));
}

function createServiceAreas(map) {
  const definitions = [
    ["SA-001", "住宅区东侧接驾区", ServiceAreaType.PICKUP_DROPOFF, ["RS-001"], rangeCells({ col: 10, rowStart: 5, rowEnd: 7 }), "service", 3],
    ["SA-002", "办公区西侧接驾区", ServiceAreaType.PICKUP_DROPOFF, ["RS-004"], rangeCells({ col: 25, rowStart: 5, rowEnd: 7 }), "service", 3],
    ["SA-003", "商业中心北侧上下客区", ServiceAreaType.MIXED, ["RS-008"], rangeCells({ row: 12, colStart: 17, colEnd: 20 }), "service", 4],
    ["SA-004", "医院学校东侧上下客区", ServiceAreaType.PICKUP_DROPOFF, ["RS-010"], rangeCells({ row: 28, colStart: 5, colEnd: 8 }), "service", 4],
    ["SA-005", "地铁站南侧接驳区", ServiceAreaType.MIXED, ["RS-012"], rangeCells({ row: 28, colStart: 26, colEnd: 27 }), "service", 2],
    ["SA-006", "运营中心接入道路待命区", ServiceAreaType.OPS_CENTER_AREA, ["RS-014"], rangeCells({ row: 35, colStart: 28, colEnd: 30 }), "stage", 6],
    ["SA-101", "东部居住区接驾区", ServiceAreaType.PICKUP_DROPOFF, ["RS-101"], rangeCells({ col: 54, rowStart: 5, rowEnd: 7 }), "service", 3],
    ["SA-102", "东部办公区接驾区", ServiceAreaType.PICKUP_DROPOFF, ["RS-104"], rangeCells({ col: 69, rowStart: 5, rowEnd: 7 }), "service", 3],
    ["SA-103", "东部商业中心上下客区", ServiceAreaType.MIXED, ["RS-108"], rangeCells({ row: 12, colStart: 61, colEnd: 64 }), "service", 4],
    ["SA-104", "东部交通枢纽接驳区", ServiceAreaType.MIXED, ["RS-110"], rangeCells({ row: 28, colStart: 49, colEnd: 52 }), "service", 4],
    ["SA-105", "东部会展区上下客区", ServiceAreaType.PICKUP_DROPOFF, ["RS-112"], rangeCells({ row: 28, colStart: 74, colEnd: 76 }), "service", 3],
    ["SA-106", "东部运营中心规划待命区", ServiceAreaType.OPS_CENTER_AREA, ["RS-114"], rangeCells({ row: 35, colStart: 72, colEnd: 74 }), "stage", 6],
  ];

  return definitions.map(([serviceAreaId, serviceAreaName, serviceAreaType, segmentIds, cellIds, capabilityMode, capacity]) => {
    const pickupCellIds = capabilityMode === "service" ? [cellIds[0]] : [];
    const dropoffCellIds = capabilityMode === "service" ? [cellIds[0]] : [];
    const tempStopCellIds = capabilityMode === "service" ? cellIds : [cellIds[0]];
    const parkingCellIds = capabilityMode === "stage" ? cellIds.slice(1) : [];
    const standbyCellIds = capabilityMode === "stage" ? cellIds : cellIds.slice(1);

    return createServiceArea({
      service_area_id: serviceAreaId,
      map_id: map.map_id,
      service_area_name: serviceAreaName,
      service_area_type: serviceAreaType,
      service_area_status: serviceAreaId.startsWith("SA-1") ? ServiceAreaStatus.PLANNED : ServiceAreaStatus.ACTIVE,
      cell_ids: cellIds,
      segment_ids: segmentIds,
      road_segment_ids: segmentIds,
      place_ids: [],
      zone_id: serviceAreaId.startsWith("SA-1") ? "Z-002" : "Z-001",
      pickup_cell_ids: pickupCellIds,
      dropoff_cell_ids: dropoffCellIds,
      temp_stop_cell_ids: tempStopCellIds,
      parking_cell_ids: parkingCellIds,
      standby_cell_ids: standbyCellIds,
      occupied_cell_ids: [],
      unavailable_cell_ids: [],
      capacity,
      current_robotaxi_count: 0,
      name: serviceAreaName,
      covered_cell_ids: cellIds,
      max_vehicle_capacity: capacity,
      status: ServiceAreaStatus.ACTIVE,
      customer_capabilities: {
        can_pickup: pickupCellIds.length > 0,
        can_dropoff: dropoffCellIds.length > 0,
        can_wait: standbyCellIds.length > 0,
      },
      vehicle_capabilities: {
        can_stop_for_service: pickupCellIds.length > 0 || dropoffCellIds.length > 0,
        can_short_wait: tempStopCellIds.length > 0,
        can_stage: standbyCellIds.length > 0,
        can_long_park: parkingCellIds.length > 0,
      },
    });
  });
}

function createZones(map, cells, roadSegments, places, serviceAreas) {
  const definitions = [
    ["Z-001", null, "最小运营测试区", ZoneLevel.ZONE, ZoneType.MIXED_ZONE, rectCells(0, 39, 0, 39)],
    ["Z-001-A", "Z-001", "住宅生活子区", ZoneLevel.SUB_ZONE, ZoneType.RESIDENTIAL_ZONE, rectCells(0, 14, 0, 14)],
    ["Z-001-B", "Z-001", "办公通勤子区", ZoneLevel.SUB_ZONE, ZoneType.OFFICE_ZONE, rectCells(0, 14, 25, 39)],
    ["Z-001-C", "Z-001", "商业交通子区", ZoneLevel.SUB_ZONE, ZoneType.COMMERCIAL_ZONE, rectCells(12, 30, 12, 30)],
    ["Z-001-D", "Z-001", "医院学校子区", ZoneLevel.SUB_ZONE, ZoneType.MIXED_ZONE, rectCells(28, 39, 0, 14)],
    ["Z-001-E", "Z-001", "运营支持子区", ZoneLevel.SUB_ZONE, ZoneType.SUPPORT_ZONE, rectCells(33, 36, 28, 35)],
    ["Z-002", null, "东部规划运营区", ZoneLevel.ZONE, ZoneType.MIXED_ZONE, rectCells(0, 39, 44, 83)],
    ["Z-002-A", "Z-002", "东部居住子区", ZoneLevel.SUB_ZONE, ZoneType.RESIDENTIAL_ZONE, rectCells(0, 14, 44, 57)],
    ["Z-002-B", "Z-002", "东部办公子区", ZoneLevel.SUB_ZONE, ZoneType.OFFICE_ZONE, rectCells(0, 14, 69, 83)],
    ["Z-002-C", "Z-002", "东部商业子区", ZoneLevel.SUB_ZONE, ZoneType.COMMERCIAL_ZONE, rectCells(12, 27, 57, 69)],
    ["Z-002-D", "Z-002", "东部枢纽会展子区", ZoneLevel.SUB_ZONE, ZoneType.TRANSPORT_ZONE, rectCells(28, 39, 44, 83)],
    ["Z-002-E", "Z-002", "东部运营支持子区", ZoneLevel.SUB_ZONE, ZoneType.SUPPORT_ZONE, rectCells(34, 36, 69, 79)],
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
      zone_status: zoneId.startsWith("Z-002") ? ZoneStatus.PLANNED : ZoneStatus.TESTING,
      cell_ids: cells.filter((cell) => cellSet.has(cell.cell_id)).map((cell) => cell.cell_id),
      road_segment_ids: roadSegments
        .filter((segment) => segment.cell_sequence.some((cellId) => cellSet.has(cellId)))
        .map((segment) => segment.road_segment_id),
      place_ids: places
        .filter((place) => place.cell_ids.some((cellId) => cellSet.has(cellId)))
        .map((place) => place.place_id),
      service_area_ids: serviceAreas
        .filter((area) => area.cell_ids.some((cellId) => cellSet.has(cellId)))
        .map((area) => area.service_area_id),
      sub_zone_ids: parentZoneId ? [] : definitions.filter(([, parentId]) => parentId === zoneId).map(([id]) => id),
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
    const routeSteps = createRouteStepsFromSegments(segmentSequence, roadSegments, startCellId, endCellId);

    return createRoute({
      route_id: routeId,
      route_name: routeName,
      map_id: map.map_id,
      start_cell_id: startCellId,
      end_cell_id: endCellId,
      road_segment_sequence: segmentSequence,
      route_steps: routeSteps,
      total_step_count: Math.max(0, routeSteps.length - 1),
      related_service_area_ids: serviceAreaIds,
      total_distance_m: totalDistance,
      route_status: RouteStatus.ACTIVE,
    });
  });
}

function attachServiceAreasToSegments(roadSegments, serviceAreas) {
  roadSegments.forEach((segment) => {
    segment.service_area_ids = serviceAreas
      .filter((area) => area.road_segment_ids.includes(segment.road_segment_id))
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
    "P-006": ["SA-006"],
    "P-101": ["SA-101"],
    "P-102": ["SA-102"],
    "P-103": ["SA-103"],
    "P-104": ["SA-104"],
    "P-105": ["SA-105"],
    "P-106": ["SA-106"],
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

function inferSegmentDirection(startNode, endNode) {
  if (startNode.col === endNode.col) return startNode.row <= endNode.row ? Direction.SOUTH : Direction.NORTH;
  if (startNode.row === endNode.row) return startNode.col <= endNode.col ? Direction.EAST : Direction.WEST;
  return Direction.MIXED;
}

function createRouteStepsFromSegments(segmentSequence, roadSegments, startCellId, endCellId) {
  const segmentById = new Map(roadSegments.map((segment) => [segment.road_segment_id, segment]));
  const pathCells = [];

  segmentSequence.forEach((segmentId, index) => {
    const segment = segmentById.get(segmentId);
    if (!segment) return;

    const previousCellId = pathCells[pathCells.length - 1]?.cell_id || startCellId;
    const nextSegment = segmentById.get(segmentSequence[index + 1]);
    const segmentStartCellId = index === 0 ? startCellId : previousCellId;
    const segmentEndCellId = nextSegment ? sharedEndpointCellId(segment, nextSegment) : endCellId;
    const segmentPath = sliceSegmentCells(segment.cell_sequence, segmentStartCellId, segmentEndCellId);

    segmentPath.forEach((cellId) => {
      if (pathCells[pathCells.length - 1]?.cell_id === cellId) return;
      pathCells.push({ cell_id: cellId, road_segment_id: segmentId });
    });
  });

  return pathCells.map((item, index) => {
    return {
      step_index: index,
      cell_id: item.cell_id,
      road_segment_id: item.road_segment_id,
      road_node_id: null,
      direction: Direction.UNKNOWN,
      distance_km: index === 0 ? 0 : CELL_SIZE_M / 1000,
      is_origin_step: index === 0,
      is_target_step: index === pathCells.length - 1,
    };
  });
}

function sharedEndpointCellId(segment, nextSegment) {
  const segmentEndpoints = [
    segment.cell_sequence[0],
    segment.cell_sequence[segment.cell_sequence.length - 1],
  ];
  const nextEndpoints = new Set([
    nextSegment.cell_sequence[0],
    nextSegment.cell_sequence[nextSegment.cell_sequence.length - 1],
  ]);
  return segmentEndpoints.find((cellId) => nextEndpoints.has(cellId)) || segmentEndpoints[segmentEndpoints.length - 1];
}

function sliceSegmentCells(cellSequence, startCellId, endCellId) {
  const startIndex = cellSequence.indexOf(startCellId);
  const endIndex = cellSequence.indexOf(endCellId);
  if (startIndex < 0 || endIndex < 0) return cellSequence;
  if (startIndex <= endIndex) return cellSequence.slice(startIndex, endIndex + 1);
  return cellSequence.slice(endIndex, startIndex + 1).reverse();
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
