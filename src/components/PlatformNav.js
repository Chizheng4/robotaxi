const menuItems = [
  { id: "console", label: "运营中控台" },
  { id: "maps", label: "地图管理" },
  { id: "cells", label: "网格单元管理" },
  { id: "roads", label: "道路管理" },
  { id: "roadNodes", label: "道路节点管理" },
  { id: "roadSegments", label: "道路片段管理" },
  { id: "places", label: "地点管理" },
  { id: "serviceAreas", label: "服务区域管理" },
  { id: "zones", label: "运营区域管理" },
  { id: "routes", label: "路径方案管理" },
  { id: "validations", label: "初始化校验" },
];

export function renderPlatformNav({ activePage, onNavigate }) {
  const root = document.createElement("aside");
  root.className = "platform-nav";

  const brand = document.createElement("div");
  brand.className = "platform-brand";
  brand.textContent = "Robotaxi 运营平台";

  const nav = document.createElement("nav");
  nav.className = "platform-menu";
  nav.setAttribute("aria-label", "运营平台菜单");

  menuItems.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "platform-menu-item";
    button.dataset.active = activePage === item.id ? "true" : "false";
    button.textContent = item.label;
    button.addEventListener("click", () => onNavigate(item.id));
    nav.append(button);
  });

  root.append(brand, nav);
  return root;
}
