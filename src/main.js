import { renderObjectDetailPanel } from "./components/ObjectDetailPanel.js?v=20260527-ol";
import { renderPlatformNav } from "./components/PlatformNav.js?v=20260527-ol";
import { renderRecordTable } from "./components/RecordTable.js?v=20260527-ol";
import { renderZoneCanvas } from "./components/ZoneCanvas.js?v=20260527-ol";
import { createSampleData } from "./data/sampleData.js?v=20260527-ol";

const data = createSampleData({ zoneCount: 1, locationCount: 8 });
const app = document.querySelector("#app");

let activePage = "console";
let selected = { type: "zone", id: data.zones[0].zone_id };

function navigate(page) {
  activePage = page;
  render();
}

function selectObject(type, id) {
  selected = { type, id };
  render();
}

function getSelectedObject() {
  if (selected.type === "zone") {
    return data.zones.find((zone) => zone.zone_id === selected.id);
  }

  if (selected.type === "location") {
    return data.locations.find((location) => location.location_id === selected.id);
  }

  if (selected.type === "route") {
    return data.routes.find((route) => route.route_id === selected.id);
  }

  return null;
}

function render() {
  const selectedObject = getSelectedObject();

  app.replaceChildren(
    renderPlatformNav({ activePage, onNavigate: navigate }),
    renderMainContent(),
    renderObjectDetailPanel({
      selectedObject,
      selectedType: selected.type,
    }),
  );
}

function renderMainContent() {
  if (activePage === "console") {
    return renderZoneCanvas({
      zone: data.zones[0],
      locations: data.locations,
      routes: data.routes,
      selected,
      onSelect: selectObject,
    });
  }

  const rowsByPage = {
    zones: data.zones,
    locations: data.locations,
    routes: data.routes,
  };

  return renderRecordTable({
    page: activePage,
    rows: rowsByPage[activePage],
    locations: data.locations,
    selected,
    onSelect: selectObject,
  });
}

render();
