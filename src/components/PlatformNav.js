const menuGroups = [
  {
    items: [{ id: "console", label: "运营中控台" }],
  },
  {
    id: "opsCenter",
    label: "运营中心管理",
    items: [{ id: "opsCenters", label: "运营中心列表" }],
  },
  {
    id: "robotaxi",
    label: "Robotaxi 管理",
    items: [{ id: "robotaxis", label: "Robotaxi 列表" }],
  },
  {
    id: "mapSpace",
    label: "地图空间管理",
    items: [
      { id: "maps", label: "地图管理" },
      { id: "cells", label: "网格单元管理" },
      { id: "roads", label: "道路管理" },
      { id: "roadNodes", label: "道路节点管理" },
      { id: "roadSegments", label: "道路片段管理" },
      { id: "places", label: "地点管理" },
      { id: "serviceAreas", label: "服务区管理" },
      { id: "zones", label: "Zone 管理" },
      { id: "routes", label: "Route 管理" },
    ],
  },
];

const expandedGroups = new Set();

export function renderPlatformNav({ activePage, onNavigate }) {
  const root = document.createElement("aside");
  root.className = "platform-nav";

  const brand = document.createElement("div");
  brand.className = "platform-brand";
  brand.textContent = "Robotaxi 运营平台";

  const nav = document.createElement("nav");
  nav.className = "platform-menu";
  nav.setAttribute("aria-label", "运营平台菜单");

  menuGroups.forEach((group) => {
    const section = document.createElement("section");
    section.className = "platform-menu-group";

    if (group.label) {
      const hasActiveChild = group.items.some((item) => item.id === activePage);
      const isExpanded = expandedGroups.has(group.id);
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "platform-menu-toggle";
      toggle.dataset.active = hasActiveChild ? "true" : "false";
      toggle.setAttribute("aria-expanded", String(isExpanded));

      const label = document.createElement("span");
      label.textContent = group.label;

      const chevron = document.createElement("span");
      chevron.className = "platform-menu-chevron";
      chevron.setAttribute("aria-hidden", "true");
      chevron.textContent = "›";

      toggle.append(label, chevron);
      toggle.addEventListener("click", () => {
        if (isExpanded) {
          expandedGroups.delete(group.id);
        } else {
          expandedGroups.add(group.id);
        }
        onNavigate(activePage);
      });
      section.append(toggle);

      if (!isExpanded) {
        nav.append(section);
        return;
      }
    }

    group.items.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = group.label ? "platform-menu-item platform-menu-child" : "platform-menu-item";
      button.dataset.active = activePage === item.id ? "true" : "false";
      button.textContent = item.label;
      button.addEventListener("click", () => {
        if (group.id) expandedGroups.add(group.id);
        onNavigate(item.id);
      });
      section.append(button);
    });

    nav.append(section);
  });

  root.append(brand, nav);
  return root;
}
