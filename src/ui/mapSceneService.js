const presentationRegistry = {
  zone: {
    collection: "zones",
    idField: "zone_id",
    nameField: "zone_name",
    typeField: "zone_type",
    profileTargetType: "ZONE",
    hoverFields: ["zone_status", "expected_robotaxi_demand", "peak_hour_demand", "supply_need_score"],
  },
  place: {
    collection: "places",
    idField: "place_id",
    nameField: "place_name",
    typeField: "place_type",
    profileTargetType: "PLACE",
    hoverFields: ["place_type", "potential_demand", "expected_robotaxi_demand", "peak_hour_demand"],
  },
  serviceArea: {
    collection: "serviceAreas",
    idField: "service_area_id",
    nameField: "service_area_name",
    typeField: "service_area_type",
    profileTargetType: "SERVICE_AREA",
    hoverFields: ["service_area_status", "service_capacity", "service_area_demand", "current_robotaxi_count"],
  },
  road: {
    collection: "roads",
    idField: "road_id",
    nameField: "road_name",
    typeField: "road_type",
    hoverFields: ["road_type", "road_status"],
  },
  opsCenter: {
    collection: "opsCenters",
    idField: "ops_center_id",
    nameField: "ops_center_name",
    typeField: "ops_center_status",
    hoverFields: ["ops_center_status", "capacity", "can_clean_robotaxi", "can_charge_robotaxi"],
  },
  robotaxi: {
    collection: "robotaxis",
    idField: "robotaxi_id",
    nameField: "robotaxi_id",
    typeField: "availability_status",
    hoverFields: ["availability_status", "motion_status", "battery_percent", "current_cell_id"],
  },
};

export function createMapScene(data = {}) {
  const mapCenterX = Number(data.maps?.[0]?.grid_cols || 0) / 2;
  const topLevelZones = (data.zones || []).filter((zone) => !zone.parent_zone_id);
  const zones = topLevelZones.map((zone) => {
    const bounds = boundsFromCellIds(zone.cell_ids);
    const labelInset = Math.min(3, bounds.width * 0.08);
    return {
      ...zone,
      bounds,
      labelX: bounds.centerX < mapCenterX ? bounds.centerX + labelInset : bounds.centerX - labelInset,
    };
  });
  const places = (data.places || []).map((place) => ({ ...place, bounds: boundsFromCellIds(place.cell_ids) }));
  const serviceAreas = (data.serviceAreas || []).map((area) => ({
    ...area,
    bounds: boundsFromCellIds(area.cell_ids || area.covered_cell_ids),
    path: cellRectPath(area.cell_ids || area.covered_cell_ids, 0.14),
  }));
  const segmentsByRoad = groupBy(data.roadSegments || [], "road_id");
  const roads = (data.roads || []).map((road) => {
    const segments = segmentsByRoad.get(road.road_id) || [];
    const paths = segments.map((segment) => cellSequencePoints(segment.cell_sequence));
    const cells = segments.flatMap((segment) => segment.cell_sequence || []);
    return { ...road, paths, bounds: boundsFromCellIds(cells) };
  });

  return {
    zones,
    places,
    serviceAreas,
    roads,
    staticNodeCount: 1 + zones.length * 2 + places.length * 2 + serviceAreas.length + roads.reduce((sum, road) => sum + road.paths.length, 0),
  };
}

export function getMapObjectPresentation(type, id, data = {}) {
  const registry = presentationRegistry[type];
  if (!registry) return null;
  const object = (data[registry.collection] || []).find((item) => item?.[registry.idField] === id);
  if (!object) return null;
  const profile = registry.profileTargetType
    ? (data.demandProfiles || []).find((item) => item.target_object_type === registry.profileTargetType && item.target_object_id === id)
    : null;
  const values = { ...object, ...(profile || {}) };
  return {
    type,
    id,
    title: object[registry.nameField] || id,
    subtitle: values[registry.typeField] || "",
    fields: registry.hoverFields
      .filter((field) => values[field] !== undefined && values[field] !== null && values[field] !== "")
      .map((field) => ({ field, value: values[field] })),
  };
}

export function resolveCellAtPoint({ x, y, map }) {
  const col = Math.floor(Number(x));
  const row = Math.floor(Number(y));
  if (!map || row < 0 || col < 0 || row >= map.grid_rows || col >= map.grid_cols) return null;
  return `C-${String(row).padStart(2, "0")}-${String(col).padStart(2, "0")}`;
}

function boundsFromCellIds(cellIds = []) {
  const cells = cellIds.map(parseCellId).filter((cell) => Number.isFinite(cell.row) && Number.isFinite(cell.col));
  if (!cells.length) return { x: 0, y: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  const minRow = Math.min(...cells.map((cell) => cell.row));
  const maxRow = Math.max(...cells.map((cell) => cell.row));
  const minCol = Math.min(...cells.map((cell) => cell.col));
  const maxCol = Math.max(...cells.map((cell) => cell.col));
  return {
    x: minCol,
    y: minRow,
    width: maxCol - minCol + 1,
    height: maxRow - minRow + 1,
    centerX: (minCol + maxCol + 1) / 2,
    centerY: (minRow + maxRow + 1) / 2,
  };
}

function cellRectPath(cellIds = [], inset = 0) {
  return cellIds.map((cellId) => {
    const { row, col } = parseCellId(cellId);
    const size = 1 - inset * 2;
    return `M${col + inset} ${row + inset}h${size}v${size}h-${size}Z`;
  }).join(" ");
}

function cellSequencePoints(cellIds = []) {
  return cellIds.map((cellId) => {
    const { row, col } = parseCellId(cellId);
    return `${col + 0.5},${row + 0.5}`;
  }).join(" ");
}

function parseCellId(cellId) {
  const [, row, col] = String(cellId || "").split("-");
  return { row: Number(row), col: Number(col) };
}

function groupBy(items, key) {
  const grouped = new Map();
  for (const item of items) {
    const value = item?.[key];
    const group = grouped.get(value) || [];
    group.push(item);
    grouped.set(value, group);
  }
  return grouped;
}
