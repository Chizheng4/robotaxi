import { getDetailTitle, getDisplayValue, getFieldLabel } from "../domain/fieldDictionary.js?v=20260603-v006";

export function renderObjectDetailPanel({ selectedObject, selectedType }) {
  const root = document.createElement("aside");
  root.className = "detail-panel";

  const heading = document.createElement("h2");
  heading.textContent = selectedObject ? getDetailTitle(selectedType) : "对象详情";
  root.append(heading);

  if (!selectedObject) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "请选择地图、网格、道路、地点、服务区、运营区域、路径方案、运营中心、作业人员或 Robotaxi 查看详情。";
    root.append(empty);
    return root;
  }

  const dl = document.createElement("dl");
  dl.className = "detail-list";

  Object.entries(selectedObject).forEach(([key, value]) => {
    const dt = document.createElement("dt");
    dt.textContent = getFieldLabel(key);

    const dd = document.createElement("dd");
    dd.textContent = formatValue(value);

    dl.append(dt, dd);
  });

  root.append(dl);
  return root;
}

function formatValue(value) {
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (typeof value === "boolean") return value ? "是" : "否";

  if (typeof value === "object" && value !== null) {
    return Object.entries(value)
      .map(([key, itemValue]) => `${getFieldLabel(key)}: ${formatValue(itemValue)}`)
      .join("; ");
  }

  return String(getDisplayValue(value ?? ""));
}
