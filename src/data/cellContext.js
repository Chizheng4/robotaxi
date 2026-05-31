export function createCellContext(cell, data) {
  const relatedRoadSegments = data.roadSegments.filter((segment) => segment.cell_ids.includes(cell.cell_id));
  const relatedRoadIds = new Set(relatedRoadSegments.map((segment) => segment.road_id));
  const relatedRoads = data.roads.filter((road) => relatedRoadIds.has(road.road_id));
  const relatedRoadNodes = data.roadNodes.filter((node) => node.cell_id === cell.cell_id);
  const relatedServiceAreas = data.serviceAreas.filter((area) => area.covered_cell_ids.includes(cell.cell_id));
  const relatedPlaces = data.places.filter((place) => place.cell_ids.includes(cell.cell_id));
  const relatedZones = data.zones.filter((zone) => zone.cell_ids.includes(cell.cell_id));
  const isRoadNodeCell = relatedRoadNodes.length > 0;

  return {
    ...cell,
    related_map: formatItems(data.maps, "map_id", "map_name"),
    related_zones: formatItems(relatedZones, "zone_id", "zone_name"),
    related_roads: formatItems(relatedRoads, "road_id", "road_name"),
    related_road_segments: formatItems(relatedRoadSegments, "road_segment_id"),
    related_road_nodes: formatItems(relatedRoadNodes, "road_node_id", "node_type"),
    related_service_areas: formatItems(relatedServiceAreas, "service_area_id", "name"),
    related_places: formatItems(relatedPlaces, "place_id", "place_name"),
    service_eligibility: getServiceEligibility(cell, isRoadNodeCell, relatedServiceAreas),
  };
}

function formatItems(items, idKey, nameKey) {
  if (items.length === 0) return "无关联";

  return items
    .map((item) => nameKey ? `${item[idKey]} ${item[nameKey]}` : item[idKey])
    .join(", ");
}

function getServiceEligibility(cell, isRoadNodeCell, relatedServiceAreas) {
  if (isRoadNodeCell) return "不可作为服务区域：该 Cell 是道路节点 / 路口";
  if (cell.base_cell_type !== "ROAD") return "不可作为服务区域：仅 ROAD Cell 可承载 ServiceArea";
  if (relatedServiceAreas.length > 0) return "可服务：已被 ServiceArea 覆盖";
  return "可通行但当前不可服务：未配置 ServiceArea";
}
