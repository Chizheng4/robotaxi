const menuItems = [
  { id: "console", label: "运营中控台" },
  { id: "zones", label: "运营区域管理" },
  { id: "locations", label: "运营位置管理" },
  { id: "routes", label: "路径管理" },
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
