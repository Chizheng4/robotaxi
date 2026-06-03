const cellClass = {
  EMPTY: "cell-empty",
  ROAD: "cell-road",
  PLACE: "cell-place",
  BLOCKED: "cell-blocked",
};

export function renderMapCanvas({ data, selected, onSelect }) {
  const map = data.maps[0];
  const placeTypeByCellId = createPlaceTypeByCellId(data.places);
  const selectedRoute = selected?.type === "route"
    ? data.routes.find((route) => route.route_id === selected.id)
    : null;
  const highlightedCells = new Set(selectedRoute ? routeCellIds(selectedRoute, data.roadSegments) : []);

  const root = document.createElement("main");
  root.className = "zone-canvas-panel";

  const header = document.createElement("div");
  header.className = "canvas-header";

  const title = document.createElement("h1");
  title.textContent = map.map_name;

  const status = document.createElement("span");
  status.className = "status-pill";
  status.textContent = `${map.grid_cols} x ${map.grid_rows} / ${map.cell_size_m}m`;

  header.append(title, status);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "zone-canvas");
  svg.setAttribute("viewBox", `0 0 ${map.grid_cols} ${map.grid_rows}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Robotaxi simulation map");

  svg.append(renderCells(data.cells, selected, highlightedCells, placeTypeByCellId, onSelect));
  svg.append(renderServiceAreas(data.serviceAreas, selected));
  svg.append(renderOpsCenters(data.opsCenters || [], selected));
  svg.append(renderRoadNodes(data.roadNodes, selected));
  svg.append(renderMapBoundary(map, selected, onSelect));

  root.append(header, svg, renderLegend());
  return root;
}

function renderCells(cells, selected, highlightedCells, placeTypeByCellId, onSelect) {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "map-cells");

  cells.forEach((cell) => {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", cell.col);
    rect.setAttribute("y", cell.row);
    rect.setAttribute("width", 1);
    rect.setAttribute("height", 1);
    rect.setAttribute("class", `map-cell ${getCellClass(cell, placeTypeByCellId)}`);
    rect.dataset.active = selected?.type === "cell" && selected?.id === cell.cell_id ? "true" : "false";
    rect.dataset.route = highlightedCells.has(cell.cell_id) ? "true" : "false";
    rect.addEventListener("click", () => onSelect("cell", cell.cell_id));
    group.append(rect);
  });

  return group;
}

function createPlaceTypeByCellId(places) {
  const placeTypeByCellId = new Map();
  places.forEach((place) => {
    place.cell_ids.forEach((cellId) => placeTypeByCellId.set(cellId, place.place_type));
  });
  return placeTypeByCellId;
}

function getCellClass(cell, placeTypeByCellId) {
  if (cell.base_cell_type !== "PLACE") return cellClass[cell.base_cell_type];

  const placeType = placeTypeByCellId.get(cell.cell_id);
  if (!placeType) return cellClass.PLACE;
  return `${cellClass.PLACE} cell-place-${placeType.toLowerCase().replaceAll("_", "-")}`;
}

function renderServiceAreas(serviceAreas, selected) {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "service-area-layer");

  serviceAreas.forEach((area) => {
    area.covered_cell_ids.forEach((cellId) => {
      const { row, col } = parseCellId(cellId);
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", col + 0.12);
      rect.setAttribute("y", row + 0.12);
      rect.setAttribute("width", 0.76);
      rect.setAttribute("height", 0.76);
      rect.setAttribute("class", "service-area-cell");
      rect.dataset.active = selected?.type === "serviceArea" && selected?.id === area.service_area_id ? "true" : "false";
      group.append(rect);
    });
  });

  return group;
}

function renderRoadNodes(roadNodes, selected) {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "road-node-layer");

  roadNodes.forEach((node) => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", node.col + 0.5);
    circle.setAttribute("cy", node.row + 0.5);
    circle.setAttribute("r", 0.22);
    circle.setAttribute("class", "road-node");
    circle.dataset.active = selected?.type === "roadNode" && selected?.id === node.road_node_id ? "true" : "false";
    group.append(circle);
  });

  return group;
}

function renderOpsCenters(opsCenters, selected) {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "ops-center-layer");

  opsCenters.forEach((opsCenter) => {
    opsCenter.cell_ids.forEach((cellId) => {
      const { row, col } = parseCellId(cellId);
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", col + 0.06);
      rect.setAttribute("y", row + 0.06);
      rect.setAttribute("width", 0.88);
      rect.setAttribute("height", 0.88);
      rect.setAttribute("class", "ops-center-cell");
      rect.dataset.active = selected?.type === "opsCenter" && selected?.id === opsCenter.ops_center_id ? "true" : "false";
      group.append(rect);
    });
  });

  return group;
}

function renderMapBoundary(map, selected) {
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", 0);
  rect.setAttribute("y", 0);
  rect.setAttribute("width", map.grid_cols);
  rect.setAttribute("height", map.grid_rows);
  rect.setAttribute("class", "zone-boundary map-boundary");
  rect.dataset.active = selected?.type === "map" && selected?.id === map.map_id ? "true" : "false";
  return rect;
}

function renderLegend() {
  const legend = document.createElement("div");
  legend.className = "legend";

  [
    ["cell-empty", "空白网格"],
    ["cell-road", "道路网格"],
    ["place-residential-swatch", "住宅地点"],
    ["place-office-swatch", "办公地点"],
    ["place-commercial-swatch", "商业地点"],
    ["place-hospital-swatch", "医院学校"],
    ["place-metro-station-swatch", "地铁接驳"],
    ["place-ops-center-swatch", "运营中心地点"],
    ["service-area-swatch", "服务区域"],
    ["ops-center-swatch", "运营中心覆盖"],
    ["route-swatch", "选中路径"],
    ["road-node-swatch", "道路节点"],
  ].forEach(([className, label]) => {
    const item = document.createElement("span");
    item.className = "legend-item";
    item.innerHTML = `<span class="legend-dot ${className}"></span>${label}`;
    legend.append(item);
  });

  return legend;
}

function routeCellIds(route, roadSegments) {
  const segmentById = new Map(roadSegments.map((segment) => [segment.road_segment_id, segment]));
  return route.road_segment_sequence.flatMap((segmentId) => segmentById.get(segmentId)?.cell_ids || []);
}

function parseCellId(cellId) {
  const [, row, col] = cellId.split("-");
  return {
    row: Number(row),
    col: Number(col),
  };
}
