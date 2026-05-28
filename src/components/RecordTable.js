const tableConfig = {
  zones: {
    title: "运营区域管理",
    description: "Zone 是最小运营闭环中的空间经营边界。",
    columns: [
      ["zone_id", "区域编号"],
      ["zone_name", "区域名称"],
      ["grid_size", "网格规模"],
      ["cell_size", "最小格边长"],
      ["zone_type", "区域类型"],
      ["operating_status", "运营状态"],
      ["service_policy_id", "服务策略"],
      ["map_area_id", "地图区域"],
    ],
  },
  locations: {
    title: "运营位置管理",
    description: "OperatingLocation 是 Zone 内被运营系统识别和使用的现实空间位置。",
    columns: [
      ["location_id", "位置编号"],
      ["location_name", "位置名称"],
      ["location_type", "地点类型"],
      ["operating_status", "运营状态"],
      ["capabilities", "运营能力"],
      ["capacity", "容量"],
      ["demand_weight", "需求权重"],
      ["coordinates", "网格坐标"],
    ],
  },
  routes: {
    title: "路径管理",
    description: "Route 是两个 OperatingLocation 之间的可行驶空间连接。",
    columns: [
      ["route_id", "路径编号"],
      ["start_location_name", "起点位置"],
      ["end_location_name", "终点位置"],
      ["road_type", "道路类型"],
      ["route_status", "路径状态"],
      ["is_bidirectional", "是否双向"],
      ["distance", "距离"],
      ["estimated_duration", "预计时长"],
    ],
  },
};

export function renderRecordTable({ page, rows, locations, selected, onSelect }) {
  const config = tableConfig[page];
  const root = document.createElement("main");
  root.className = "record-page";

  const header = document.createElement("div");
  header.className = "record-header";

  const title = document.createElement("h1");
  title.textContent = config.title;

  const description = document.createElement("p");
  description.textContent = config.description;

  header.append(title, description);

  const tableWrap = document.createElement("div");
  tableWrap.className = "record-table-wrap";

  const table = document.createElement("table");
  table.className = "record-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  config.columns.forEach(([, label]) => {
    const th = document.createElement("th");
    th.textContent = label;
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

    config.columns.forEach(([key]) => {
      const td = document.createElement("td");
      td.textContent = getCellValue(key, row, locations);
      tr.append(td);
    });

    tbody.append(tr);
  });

  table.append(thead, tbody);
  tableWrap.append(table);
  root.append(header, tableWrap);
  return root;
}

function getCellValue(key, row, locations) {
  if (key === "grid_size") return `${row.grid.cols} x ${row.grid.rows}`;
  if (key === "cell_size") return `${row.grid.cell_size} ${row.grid.cell_unit}`;
  if (key === "coordinates") return `col:${row.grid_col}, row:${row.grid_row}`;
  if (key === "capabilities") return summarizeCapabilities(row.capabilities);
  if (key === "distance") return `${row.distance} m`;
  if (key === "estimated_duration") return `${row.estimated_duration} min`;
  if (key === "is_bidirectional") return row.is_bidirectional ? "Yes" : "No";
  if (key === "start_location_name") return getLocationName(locations, row.start_location_id);
  if (key === "end_location_name") return getLocationName(locations, row.end_location_id);
  return String(row[key] ?? "");
}

function summarizeCapabilities(capabilities) {
  return Object.entries(capabilities)
    .filter(([, value]) => value)
    .map(([key]) => key.replace("can_", ""))
    .join(", ");
}

function getLocationName(locations, locationId) {
  const location = locations.find((item) => item.location_id === locationId);
  return location ? `${location.location_name} (${location.location_id})` : locationId;
}

function getObjectType(page) {
  if (page === "zones") return "zone";
  if (page === "locations") return "location";
  return "route";
}

function getObjectId(page, row) {
  if (page === "zones") return row.zone_id;
  if (page === "locations") return row.location_id;
  return row.route_id;
}
