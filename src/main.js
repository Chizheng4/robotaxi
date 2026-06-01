import { renderMapCanvas } from "./components/MapCanvas.js?v=20260601-ops";
import { renderObjectDetailPanel } from "./components/ObjectDetailPanel.js?v=20260601-values";
import { renderPlatformNav } from "./components/PlatformNav.js?v=20260601-menu";
import { renderRecordTable } from "./components/RecordTable.js?v=20260601-values";
import { createCellContext } from "./data/cellContext.js?v=20260601-values";
import { initializeMapSpace } from "./data/mapInitialization.js?v=20260601-ops";
import { validateMapSpace } from "./data/mapValidation.js?v=20260601-values";
import { initializeOperationsCenter } from "./data/operationsCenterInitialization.js?v=20260601-ops";
import { validateOperationsCenter } from "./data/operationsCenterValidation.js?v=20260601-values";

const data = {
  ...initializeMapSpace(),
  ...initializeOperationsCenter(),
};
const validations = [
  ...validateMapSpace(data),
  ...validateOperationsCenter(data),
];
const app = document.querySelector("#app");

let activePage = "console";
let selected = { type: "map", id: data.maps[0].map_id };

function navigate(page) {
  activePage = page;
  render();
}

function selectObject(type, id) {
  selected = { type, id };
  render();
}

function getSelectedObject() {
  if (selected.type === "cell") {
    const cell = data.cells.find((item) => item.cell_id === selected.id);
    return cell ? createCellContext(cell, data) : null;
  }

  const collections = {
    map: data.maps,
    road: data.roads,
    roadNode: data.roadNodes,
    roadSegment: data.roadSegments,
    place: data.places,
    serviceArea: data.serviceAreas,
    zone: data.zones,
    route: data.routes,
    opsCenter: data.opsCenters,
    robotaxi: data.robotaxis,
    validation: validations,
  };

  return collections[selected.type]?.find((item) => getObjectId(selected.type, item) === selected.id) || null;
}

function render() {
  app.replaceChildren(
    renderPlatformNav({ activePage, onNavigate: navigate }),
    renderMainContent(),
    renderObjectDetailPanel({
      selectedObject: getSelectedObject(),
      selectedType: selected.type,
    }),
  );
}

function renderMainContent() {
  if (activePage === "console") {
    return renderMapCanvas({
      data,
      selected,
      onSelect: selectObject,
    });
  }

  return renderRecordTable({
    page: activePage,
    rows: rowsByPage()[activePage],
    selected,
    onSelect: selectObject,
  });
}

function rowsByPage() {
  return {
    maps: data.maps,
    cells: data.cells,
    roads: data.roads,
    roadNodes: data.roadNodes,
    roadSegments: data.roadSegments,
    places: data.places,
    serviceAreas: data.serviceAreas,
    zones: data.zones,
    routes: data.routes,
    opsCenters: data.opsCenters,
    robotaxis: data.robotaxis,
    validations,
  };
}

function getObjectId(type, item) {
  const mapping = {
    map: "map_id",
    cell: "cell_id",
    road: "road_id",
    roadNode: "road_node_id",
    roadSegment: "road_segment_id",
    place: "place_id",
    serviceArea: "service_area_id",
    zone: "zone_id",
    route: "route_id",
    opsCenter: "ops_center_id",
    robotaxi: "robotaxi_id",
    validation: "rule_id",
  };

  return item[mapping[type]];
}

render();
