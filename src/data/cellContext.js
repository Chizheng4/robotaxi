import { getDisplayValue } from "../domain/fieldDictionary.js?v=20260608-v017-route-management";

export function createCellContext(cell, data) {
  const relatedRoadSegments = data.roadSegments.filter((segment) => segment.cell_sequence.includes(cell.cell_id));
  const relatedRoadIds = new Set(relatedRoadSegments.map((segment) => segment.road_id));
  const relatedRoads = data.roads.filter((road) => relatedRoadIds.has(road.road_id));
  const relatedRoadNodes = data.roadNodes.filter((node) => node.cell_id === cell.cell_id);
  const relatedServiceAreas = data.serviceAreas.filter((area) => area.cell_ids.includes(cell.cell_id));
  const relatedPlaces = data.places.filter((place) => place.cell_ids.includes(cell.cell_id));
  const relatedZones = data.zones.filter((zone) => zone.cell_ids.includes(cell.cell_id));
  const relatedOpsCenters = data.opsCenters?.filter((opsCenter) => opsCenter.cell_ids.includes(cell.cell_id)) || [];
  const relatedRobotaxis = data.robotaxis?.filter((robotaxi) => robotaxi.current_cell_id === cell.cell_id) || [];
  const isRoadNodeCell = relatedRoadNodes.length > 0;

  return {
    ...cell,
    related_map: formatItems(data.maps, "map_id", "map_name"),
    related_zones: formatItems(relatedZones, "zone_id", "zone_name"),
    related_roads: formatItems(relatedRoads, "road_id", "road_name"),
    related_road_segments: formatItems(relatedRoadSegments, "road_segment_id"),
    related_road_nodes: formatItems(relatedRoadNodes, "road_node_id", "node_type"),
    related_service_areas: formatItems(relatedServiceAreas, "service_area_id", "service_area_name"),
    related_places: formatItems(relatedPlaces, "place_id", "place_name"),
    related_ops_centers: formatItems(relatedOpsCenters, "ops_center_id", "ops_center_name"),
    related_robotaxis: formatItems(relatedRobotaxis, "robotaxi_id"),
    operational_space_coverage: getOperationalSpaceCoverage(relatedOpsCenters),
    service_eligibility: getServiceEligibility(cell, isRoadNodeCell, relatedServiceAreas),
  };
}

function formatItems(items, idKey, nameKey) {
  if (items.length === 0) return "无关联";

  return items
    .map((item) => nameKey ? `${item[idKey]} ${getDisplayValue(item[nameKey])}` : item[idKey])
    .join(", ");
}

function getServiceEligibility(cell, isRoadNodeCell, relatedServiceAreas) {
  if (isRoadNodeCell) return "不可作为服务区域：该 Cell 是道路节点 / 路口";
  if (cell.base_cell_type !== "ROAD") return "不可作为服务区域：仅道路区域网格可承载服务区";
  if (relatedServiceAreas.length > 0) return "可服务：已被服务区覆盖";
  return "可通行但当前不可服务：未配置服务区";
}

function getOperationalSpaceCoverage(relatedOpsCenters) {
  if (relatedOpsCenters.length === 0) return "无运营设施覆盖";
  return `运营中心：${formatItems(relatedOpsCenters, "ops_center_id", "ops_center_name")}`;
}
