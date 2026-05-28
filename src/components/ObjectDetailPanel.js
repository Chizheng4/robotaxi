const titleByType = {
  zone: "Zone Detail",
  location: "OperatingLocation Detail",
  route: "Route Detail",
};

export function renderObjectDetailPanel({ selectedObject, selectedType }) {
  const root = document.createElement("aside");
  root.className = "detail-panel";

  const heading = document.createElement("h2");
  heading.textContent = selectedObject ? titleByType[selectedType] : "Object Detail";
  root.append(heading);

  if (!selectedObject) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Select a Zone, OperatingLocation, or Route to inspect its business attributes.";
    root.append(empty);
    return root;
  }

  const dl = document.createElement("dl");
  dl.className = "detail-list";

  Object.entries(selectedObject).forEach(([key, value]) => {
    const dt = document.createElement("dt");
    dt.textContent = key;

    const dd = document.createElement("dd");
    dd.textContent = formatValue(value);

    dl.append(dt, dd);
  });

  root.append(dl);
  return root;
}

function formatValue(value) {
  if (Array.isArray(value)) {
    return value.map((point) => `(${point.x}, ${point.y})`).join(" ");
  }

  if (typeof value === "object" && value !== null) {
    return Object.entries(value)
      .map(([key, itemValue]) => `${key}: ${itemValue}`)
      .join(", ");
  }

  return String(value);
}
