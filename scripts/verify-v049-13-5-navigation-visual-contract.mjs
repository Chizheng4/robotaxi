import assert from "node:assert/strict";
import fs from "node:fs";
import {
  getNavigationRootKey,
  navigationGroups,
} from "../src/ui/navigationRegistry.js";

const styles = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const rules = fs.readFileSync(new URL("../doc/rules/04-frontend-ux-rules.md", import.meta.url), "utf8");

assert.equal(getNavigationRootKey("console"), "console", "一级叶子页面必须解析为自身根菜单");
assert.equal(
  getNavigationRootKey("longTermDemandForecastStrategies"),
  "businessPlanning",
  "深层页面必须解析为所属一级根菜单",
);
assert(
  navigationGroups.some((item) => item.key === "console" && !item.children?.length),
  "导航合同必须覆盖一级叶子页面",
);
assert(
  navigationGroups.some((item) => item.key === "businessPlanning" && item.children?.length),
  "导航合同必须覆盖一级分组页面",
);

assert.match(
  styles,
  /\.ops-menu\.ant-menu-inline-collapsed\s*>\s*\.ant-menu-submenu-selected\s*>\s*\.ant-menu-submenu-title\s*\{[^}]*background:\s*#e5eefb\s*!important;[^}]*box-shadow:\s*inset 2px 0 0 var\(--accent\);/s,
  "深层页面所属一级菜单必须继承完整选中背景和边缘标记",
);
assert.match(
  styles,
  /\.ant-menu-inline-collapsed-tooltip\s+\.ant-tooltip-arrow\s*\{\s*display:\s*none;/s,
  "一级叶子浮层不得保留深色气泡箭头",
);
assert.match(
  styles,
  /\.ant-menu-inline-collapsed-tooltip\s+\.ant-tooltip-inner\s*\{[^}]*border:\s*1px solid var\(--line\);[^}]*background:\s*var\(--navigation-surface\);/s,
  "一级叶子浮层必须继承统一浅色导航表面",
);
assert.match(
  rules,
  /一级叶子与一级分组必须使用一致的浅色导航浮层视觉/,
  "前端规则必须固定收缩菜单的统一浮层合同",
);
assert.match(
  rules,
  /一级根菜单都必须使用同一完整选中背景/,
  "前端规则必须固定跨层级根菜单选中合同",
);

console.log("v049.13.5 收缩菜单视觉合同验证通过");
