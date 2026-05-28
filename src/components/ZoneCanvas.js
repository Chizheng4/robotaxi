const locationLabel = {
  RESIDENTIAL_AREA: "RA",
  OFFICE_AREA: "OF",
  METRO_STATION: "MS",
  SHOPPING_MALL: "SM",
  SCHOOL: "SC",
  HOSPITAL: "HP",
  PARKING_LOT: "PK",
  CHARGING_STATION: "CH",
  TRANSPORT_HUB: "TH",
  HOTEL: "HT",
};

export function renderZoneCanvas({ zone, locations, routes, selected, onSelect }) {
  const grid = zone.grid;
  const root = document.createElement("main");
  root.className = "zone-canvas-panel";

  const header = document.createElement("div");
  header.className = "canvas-header";

  const title = document.createElement("h1");
  title.textContent = zone.zone_name;

  const status = document.createElement("span");
  status.className = "status-pill";
  status.textContent = zone.operating_status;

  header.append(title, status);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "zone-canvas");
  svg.setAttribute("viewBox", `0 0 ${grid.cols} ${grid.rows}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Zone canvas showing operating locations and routes");

  svg.append(renderGrid(grid));
  svg.append(renderBoundary(zone, selected, onSelect));
  routes.forEach((route) => svg.append(renderRoute(route, locations, selected, onSelect)));
  locations.forEach((location) => svg.append(renderLocation(location, selected, onSelect)));

  const legend = renderLegend();
  root.append(header, svg, legend);
  return root;
}

function renderGrid(grid) {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "zone-grid");

  for (let col = 1; col < grid.cols; col += 1) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", col);
    line.setAttribute("y1", 0);
    line.setAttribute("x2", col);
    line.setAttribute("y2", grid.rows);
    group.append(line);
  }

  for (let row = 1; row < grid.rows; row += 1) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", 0);
    line.setAttribute("y1", row);
    line.setAttribute("x2", grid.cols);
    line.setAttribute("y2", row);
    group.append(line);
  }

  return group;
}

function renderBoundary(zone, selected, onSelect) {
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", 0);
  rect.setAttribute("y", 0);
  rect.setAttribute("width", zone.grid.cols);
  rect.setAttribute("height", zone.grid.rows);
  rect.setAttribute("class", "zone-boundary");
  rect.dataset.active = selected?.type === "zone" && selected?.id === zone.zone_id ? "true" : "false";
  rect.addEventListener("click", () => onSelect("zone", zone.zone_id));
  return rect;
}

function renderRoute(route, locations, selected, onSelect) {
  const start = locations.find((location) => location.location_id === route.start_location_id);
  const end = locations.find((location) => location.location_id === route.end_location_id);
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

  if (!start || !end) return group;

  const hitLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
  hitLine.setAttribute("x1", start.x);
  hitLine.setAttribute("y1", start.y);
  hitLine.setAttribute("x2", end.x);
  hitLine.setAttribute("y2", end.y);
  hitLine.setAttribute("class", "route-hit-line");

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", start.x);
  line.setAttribute("y1", start.y);
  line.setAttribute("x2", end.x);
  line.setAttribute("y2", end.y);
  line.setAttribute("class", `route-line road-${route.road_type.toLowerCase()}`);
  line.dataset.active = selected?.type === "route" && selected?.id === route.route_id ? "true" : "false";

  group.classList.add("route-group");
  group.addEventListener("click", () => onSelect("route", route.route_id));
  group.append(hitLine, line);

  return group;
}

function renderLocation(location, selected, onSelect) {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", `location-node location-${location.location_type.toLowerCase()}`);
  group.dataset.active = selected?.type === "location" && selected?.id === location.location_id ? "true" : "false";
  group.addEventListener("click", () => onSelect("location", location.location_id));

  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", location.x);
  circle.setAttribute("cy", location.y);
  circle.setAttribute("r", "0.55");

  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("x", location.x);
  label.setAttribute("y", location.y + 0.18);
  label.textContent = locationLabel[location.location_type] || "OL";

  group.append(circle, label);
  return group;
}

function renderLegend() {
  const legend = document.createElement("div");
  legend.className = "legend";

  Object.entries(locationLabel).forEach(([type, label]) => {
    const item = document.createElement("span");
    item.className = "legend-item";
    item.innerHTML = `<span class="legend-dot location-${type.toLowerCase()}"></span>${label} ${type}`;
    legend.append(item);
  });

  return legend;
}
