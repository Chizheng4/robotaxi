import { getDisplayValue, getFieldLabel } from "../domain/fieldDictionary.js?v=20260601-values";

const tableConfig = {
  maps: {
    title: "地图管理",
    description: "地图是 Robotaxi 运营模拟中的空间容器。",
    columns: ["map_id", "map_name", "map_width_m", "map_height_m", "cell_size_m", "grid_cols", "grid_rows", "total_cells", "coordinate_type"],
  },
  cells: {
    title: "网格单元管理",
    description: "网格单元是地图的最小空间单元，用于表达基础空间事实。",
    columns: ["cell_id", "row", "col", "base_cell_type", "traversable"],
  },
  roads: {
    title: "道路管理",
    description: "道路用于表达完整道路语义，由多个道路片段组成。",
    columns: ["road_id", "road_name", "road_type", "road_status", "road_segment_ids"],
  },
  roadNodes: {
    title: "道路节点管理",
    description: "道路节点是道路网络中的连接点。",
    columns: ["road_node_id", "cell_id", "row", "col", "node_type", "node_status"],
  },
  roadSegments: {
    title: "道路片段管理",
    description: "道路片段是道路网络的最小计算和通行单元。",
    columns: ["road_segment_id", "road_id", "start_node_id", "end_node_id", "distance_m", "direction", "speed_limit_kmh", "service_area_ids"],
  },
  places: {
    title: "地点管理",
    description: "地点表示会产生出行需求的建筑或土地使用区域。",
    columns: ["place_id", "place_name", "place_type", "demand_weight", "peak_pattern", "nearby_service_area_ids", "cell_count"],
  },
  serviceAreas: {
    title: "服务区管理",
    description: "服务区是道路片段上的人车服务接口空间。",
    columns: ["service_area_id", "name", "segment_ids", "customer_capabilities", "vehicle_capabilities", "max_vehicle_capacity", "covered_cell_count"],
  },
  zones: {
    title: "运营区域管理",
    description: "运营区域用于经营统计和管理。",
    columns: ["zone_id", "parent_zone_id", "zone_name", "zone_level", "zone_type", "zone_status", "cell_count", "place_ids", "service_area_ids"],
  },
  routes: {
    title: "路径方案管理",
    description: "路径方案是基于道路片段序列生成的车辆移动路径结果。",
    columns: ["route_id", "route_name", "start_cell_id", "end_cell_id", "road_segment_sequence", "related_service_area_ids", "total_distance_m", "estimated_time_s", "route_status"],
  },
  opsCenters: {
    title: "运营中心管理",
    description: "运营中心是 Robotaxi 进入运营闭环的供给侧设施。",
    columns: ["ops_center_id", "ops_center_name", "map_id", "cell_ids", "service_area_ids", "capacity", "ops_center_status"],
  },
  robotaxis: {
    title: "Robotaxi 管理",
    description: "Robotaxi 是等待运维检查后进入运营闭环的自动驾驶车辆资产。",
    columns: ["robotaxi_id", "fleet_id", "model_name", "automation_level", "battery_percent", "estimated_range_km", "availability_status", "motion_status", "current_cell_id"],
  },
  validations: {
    title: "初始化校验",
    description: "根据 initialization-map.md 规则检查生成后的空间对象数据。",
    columns: ["rule_id", "rule_name", "result", "detail"],
  },
};

export function renderRecordTable({ page, rows, selected, onSelect }) {
  const config = tableConfig[page];
  const root = document.createElement("main");
  root.className = "record-page";

  const header = document.createElement("div");
  header.className = "record-header";

  const title = document.createElement("h1");
  title.textContent = config.title;

  const description = document.createElement("p");
  description.textContent = `${config.description} 当前 ${rows.length} 条记录。`;

  header.append(title, description);

  const tableWrap = document.createElement("div");
  tableWrap.className = "record-table-wrap";

  const table = document.createElement("table");
  table.className = "record-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  config.columns.forEach((key) => {
    const th = document.createElement("th");
    th.textContent = getFieldLabel(key);
    headRow.append(th);
  });
  thead.append(headRow);

  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const objectType = getObjectType(page);
    const objectId = getObjectId(page, row);
    tr.dataset.active = selected?.type === objectType && selected?.id === objectId ? "true" : "false";
    tr.addEventListener("click", () => onSelect(objectType, objectId));

    config.columns.forEach((key) => {
      const td = document.createElement("td");
      td.textContent = getCellValue(key, row);
      tr.append(td);
    });

    tbody.append(tr);
  });

  table.append(thead, tbody);
  tableWrap.append(table);
  root.append(header, tableWrap);
  return root;
}

function getCellValue(key, row) {
  if (key === "cell_count") return String(row.cell_ids?.length ?? 0);
  if (key === "covered_cell_count") return String(row.covered_cell_ids?.length ?? 0);
  if (Array.isArray(row[key])) return row[key].join(" → ");
  if (typeof row[key] === "boolean") return row[key] ? "是" : "否";
  if (typeof row[key] === "object" && row[key] !== null) return summarizeObject(row[key]);
  return String(getDisplayValue(row[key] ?? ""));
}

function summarizeObject(value) {
  return Object.entries(value)
    .filter(([, itemValue]) => itemValue === true)
    .map(([key]) => getFieldLabel(key))
    .join(", ");
}

function getObjectType(page) {
  const mapping = {
    maps: "map",
    cells: "cell",
    roads: "road",
    roadNodes: "roadNode",
    roadSegments: "roadSegment",
    places: "place",
    serviceAreas: "serviceArea",
    zones: "zone",
    routes: "route",
    opsCenters: "opsCenter",
    robotaxis: "robotaxi",
    validations: "validation",
  };

  return mapping[page];
}

function getObjectId(page, row) {
  const mapping = {
    maps: "map_id",
    cells: "cell_id",
    roads: "road_id",
    roadNodes: "road_node_id",
    roadSegments: "road_segment_id",
    places: "place_id",
    serviceAreas: "service_area_id",
    zones: "zone_id",
    routes: "route_id",
    opsCenters: "ops_center_id",
    robotaxis: "robotaxi_id",
    validations: "rule_id",
  };

  return row[mapping[page]];
}
