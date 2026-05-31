import { CellType } from "../domain/types.js?v=20260531-dict";

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
    check("CELL_COUNT", "Cell 总数必须为 1600", data.cells.length === 1600, `当前 ${data.cells.length} 个 Cell`),
    check("CELL_TYPE_EXCLUSIVE", "每个 Cell 只能有一个 base_cell_type", data.cells.every((cell) => typeof cell.base_cell_type === "string")),
    check(
      "ROAD_SEGMENT_ROAD_REF",
      "每个 RoadSegment 必须属于 Road",
      data.roadSegments.every((segment) => roadById.has(segment.road_id)),
    ),
    check(
      "ROAD_SEGMENT_NODE_REF",
      "每个 RoadSegment 必须有有效 start_node_id 和 end_node_id",
      data.roadSegments.every((segment) => nodeById.has(segment.start_node_id) && nodeById.has(segment.end_node_id)),
    ),
    check(
      "ROAD_SEGMENT_CELLS_ROAD",
      "RoadSegment 覆盖 Cell 必须是 ROAD",
      data.roadSegments.every((segment) => segment.cell_ids.every((cellId) => cellById.get(cellId)?.base_cell_type === CellType.ROAD)),
    ),
    check(
      "ROAD_SEGMENT_CELLS_CONTINUOUS",
      "RoadSegment 覆盖 Cell 应连续",
      data.roadSegments.every((segment) => areCellsContinuous(segment.cell_ids, cellById)),
    ),
    check(
      "PLACE_CELLS_PLACE",
      "Place 覆盖 Cell 必须是 PLACE",
      data.places.every((place) => place.cell_ids.every((cellId) => cellById.get(cellId)?.base_cell_type === CellType.PLACE)),
    ),
    check(
      "PLACE_HAS_SERVICE_AREA",
      "Place 必须至少关联一个附近 ServiceArea",
      data.places.every((place) => place.nearby_service_area_ids.length > 0),
    ),
    check(
      "SERVICE_AREA_CELLS_ROAD",
      "ServiceArea 覆盖 Cell 必须是 ROAD",
      data.serviceAreas.every((area) => area.covered_cell_ids.every((cellId) => cellById.get(cellId)?.base_cell_type === CellType.ROAD)),
    ),
    check(
      "SERVICE_AREA_SEGMENT_REF",
      "ServiceArea 必须关联 RoadSegment",
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
      "ServiceArea 不得定义 can_charge",
      data.serviceAreas.every((area) => !("can_charge" in area.customer_capabilities) && !("can_charge" in area.vehicle_capabilities)),
    ),
    check(
      "SERVICE_AREA_NO_ROAD_NODE_CELL",
      "ServiceArea 不得覆盖 RoadNode 所在 Cell",
      data.serviceAreas.every((area) => area.covered_cell_ids.every((cellId) => !roadNodeCellIds.has(cellId))),
    ),
    check(
      "SERVICE_AREA_NO_JUNCTION_CELL",
      "ServiceArea 不得覆盖连接两个及以上 RoadSegment 的路口 Cell",
      data.serviceAreas.every((area) => area.covered_cell_ids.every((cellId) => !junctionNodeCellIds.has(cellId))),
    ),
    check(
      "ZONE_PARENT_REF",
      "子 Zone 必须属于父 Zone",
      data.zones.every((zone) => !zone.parent_zone_id || zoneById.has(zone.parent_zone_id)),
    ),
    check(
      "ZONE_CHILD_WITHIN_PARENT",
      "子 Zone 覆盖范围不得超出父 Zone",
      data.zones.every((zone) => !zone.parent_zone_id || isSubset(zone.cell_ids, zoneById.get(zone.parent_zone_id).cell_ids)),
    ),
    check(
      "ROUTE_ENDPOINTS_ROAD",
      "Route 起终点必须是 ROAD Cell",
      data.routes.every((route) =>
        cellById.get(route.start_cell_id)?.base_cell_type === CellType.ROAD &&
        cellById.get(route.end_cell_id)?.base_cell_type === CellType.ROAD
      ),
    ),
    check(
      "ROUTE_SEGMENTS_CONTINUOUS",
      "Route road_segment_sequence 必须连续",
      data.routes.every((route) => isSegmentSequenceContinuous(route.road_segment_sequence, segmentById)),
    ),
    check(
      "ROUTE_SERVICE_ENDPOINTS",
      "Route 起终点如果用于服务，应位于 ServiceArea 覆盖范围内",
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
