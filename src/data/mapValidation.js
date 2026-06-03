import { CellType } from "../domain/types.js?v=20260603-v006";

export function validateMapSpace(data) {
  const cellById = new Map(data.cells.map((cell) => [cell.cell_id, cell]));
  const roadById = new Map(data.roads.map((road) => [road.road_id, road]));
  const nodeById = new Map(data.roadNodes.map((node) => [node.road_node_id, node]));
  const segmentById = new Map(data.roadSegments.map((segment) => [segment.road_segment_id, segment]));
  const serviceCellIds = new Set(data.serviceAreas.flatMap((area) => area.covered_cell_ids));
  const roadNodeCellIds = new Set(data.roadNodes.map((node) => node.cell_id));
  const junctionNodeCellIds = new Set(
    data.roadNodes
      .filter((node) => connectedSegmentCount(node.road_node_id, data.roadSegments) >= 2)
      .map((node) => node.cell_id),
  );
  const zoneById = new Map(data.zones.map((zone) => [zone.zone_id, zone]));

  return [
    check("CELL_COUNT", "网格单元总数必须为 1600", data.cells.length === 1600, `当前 ${data.cells.length} 个网格单元`),
    check("CELL_TYPE_EXCLUSIVE", "每个网格单元只能有一个基础空间类型", data.cells.every((cell) => typeof cell.base_cell_type === "string")),
    check(
      "ROAD_SEGMENT_ROAD_REF",
      "每个道路片段必须属于有效道路",
      data.roadSegments.every((segment) => roadById.has(segment.road_id)),
    ),
    check(
      "ROAD_SEGMENT_NODE_REF",
      "每个道路片段必须有有效起点和终点道路节点",
      data.roadSegments.every((segment) => nodeById.has(segment.start_node_id) && nodeById.has(segment.end_node_id)),
    ),
    check(
      "ROAD_SEGMENT_CELLS_ROAD",
      "道路片段覆盖的网格必须是道路区域",
      data.roadSegments.every((segment) => segment.cell_ids.every((cellId) => cellById.get(cellId)?.base_cell_type === CellType.ROAD)),
    ),
    check(
      "ROAD_SEGMENT_CELLS_CONTINUOUS",
      "道路片段覆盖的网格应连续",
      data.roadSegments.every((segment) => areCellsContinuous(segment.cell_ids, cellById)),
    ),
    check(
      "PLACE_CELLS_PLACE",
      "地点覆盖的网格必须是地点区域",
      data.places.every((place) => place.cell_ids.every((cellId) => cellById.get(cellId)?.base_cell_type === CellType.PLACE)),
    ),
    check(
      "PLACE_HAS_SERVICE_AREA",
      "地点必须至少关联一个附近服务区",
      data.places.every((place) => place.nearby_service_area_ids.length > 0),
    ),
    check(
      "SERVICE_AREA_CELLS_ROAD",
      "服务区覆盖的网格必须是道路区域",
      data.serviceAreas.every((area) => area.covered_cell_ids.every((cellId) => cellById.get(cellId)?.base_cell_type === CellType.ROAD)),
    ),
    check(
      "SERVICE_AREA_SEGMENT_REF",
      "服务区必须关联道路片段",
      data.serviceAreas.every((area) => area.segment_ids.length > 0 && area.segment_ids.every((segmentId) => segmentById.has(segmentId))),
    ),
    check(
      "SERVICE_AREA_STOP_FOR_SERVICE",
      "can_pickup 或 can_dropoff 为 true 时，can_stop_for_service 必须为 true",
      data.serviceAreas.every((area) => {
        const needsStop = area.customer_capabilities.can_pickup || area.customer_capabilities.can_dropoff;
        return !needsStop || area.vehicle_capabilities.can_stop_for_service;
      }),
    ),
    check(
      "SERVICE_AREA_NO_CHARGE",
      "服务区不得定义充电能力",
      data.serviceAreas.every((area) => !("can_charge" in area.customer_capabilities) && !("can_charge" in area.vehicle_capabilities)),
    ),
    check(
      "SERVICE_AREA_NO_ROAD_NODE_CELL",
      "服务区不得覆盖道路节点所在网格",
      data.serviceAreas.every((area) => area.covered_cell_ids.every((cellId) => !roadNodeCellIds.has(cellId))),
    ),
    check(
      "SERVICE_AREA_NO_JUNCTION_CELL",
      "服务区不得覆盖连接两个及以上道路片段的路口网格",
      data.serviceAreas.every((area) => area.covered_cell_ids.every((cellId) => !junctionNodeCellIds.has(cellId))),
    ),
    check(
      "ZONE_PARENT_REF",
      "子运营区域必须属于父运营区域",
      data.zones.every((zone) => !zone.parent_zone_id || zoneById.has(zone.parent_zone_id)),
    ),
    check(
      "ZONE_CHILD_WITHIN_PARENT",
      "子运营区域覆盖范围不得超出父运营区域",
      data.zones.every((zone) => !zone.parent_zone_id || isSubset(zone.cell_ids, zoneById.get(zone.parent_zone_id).cell_ids)),
    ),
    check(
      "ROUTE_ENDPOINTS_ROAD",
      "路径方案起终点必须是道路区域网格",
      data.routes.every((route) =>
        cellById.get(route.start_cell_id)?.base_cell_type === CellType.ROAD &&
        cellById.get(route.end_cell_id)?.base_cell_type === CellType.ROAD
      ),
    ),
    check(
      "ROUTE_SEGMENTS_CONTINUOUS",
      "路径方案的道路片段序列必须连续",
      data.routes.every((route) => isSegmentSequenceContinuous(route.road_segment_sequence, segmentById)),
    ),
    check(
      "ROUTE_SERVICE_ENDPOINTS",
      "路径方案起终点如果用于服务，应位于服务区覆盖范围内",
      data.routes.every((route) => serviceCellIds.has(route.start_cell_id) && serviceCellIds.has(route.end_cell_id)),
    ),
  ];
}

function connectedSegmentCount(nodeId, roadSegments) {
  return roadSegments.filter((segment) => segment.start_node_id === nodeId || segment.end_node_id === nodeId).length;
}

function check(rule_id, rule_name, passed, detail = "") {
  return {
    rule_id,
    rule_name,
    result: passed ? "PASS" : "FAIL",
    detail,
  };
}

function areCellsContinuous(cellIds, cellById) {
  const cells = cellIds.map((cellId) => cellById.get(cellId)).filter(Boolean);
  if (cells.length !== cellIds.length || cells.length === 0) return false;

  const sameRow = cells.every((cell) => cell.row === cells[0].row);
  const sameCol = cells.every((cell) => cell.col === cells[0].col);
  if (!sameRow && !sameCol) return false;

  const values = cells.map((cell) => (sameRow ? cell.col : cell.row)).sort((a, b) => a - b);
  return values.every((value, index) => index === 0 || value === values[index - 1] + 1);
}

function isSubset(childIds, parentIds) {
  const parentSet = new Set(parentIds);
  return childIds.every((id) => parentSet.has(id));
}

function isSegmentSequenceContinuous(segmentIds, segmentById) {
  const segments = segmentIds.map((segmentId) => segmentById.get(segmentId));
  if (segments.some((segment) => !segment)) return false;

  for (let index = 1; index < segments.length; index += 1) {
    const previous = segments[index - 1];
    const current = segments[index];
    const previousNodes = [previous.start_node_id, previous.end_node_id];
    const currentNodes = [current.start_node_id, current.end_node_id];
    const sharesNode = previousNodes.some((nodeId) => currentNodes.includes(nodeId));

    if (!sharesNode) return false;
  }

  return true;
}
