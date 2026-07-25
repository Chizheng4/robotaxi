import assert from "node:assert/strict";
import fs from "node:fs";
import {
  getNavigationOpenKeys,
  resolveNavigationOpenKeys,
} from "../src/ui/navigationRegistry.js";

const mainSource = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");

assert.deepEqual(
  getNavigationOpenKeys("longTermDemandForecastStrategies"),
  ["businessPlanning", "demandForecastManagement"],
  "经营规划页面必须保留完整导航路径",
);
assert.deepEqual(
  resolveNavigationOpenKeys("longTermDemandForecastStrategies", true),
  [],
  "侧栏收缩时不得保留父菜单展开状态",
);
assert.deepEqual(
  resolveNavigationOpenKeys("longTermDemandForecastStrategies", false),
  ["businessPlanning", "demandForecastManagement"],
  "侧栏展开时必须同步定位当前页面",
);
assert.deepEqual(
  resolveNavigationOpenKeys("decisionCenter", true),
  [],
  "侧栏收缩时一级页面也不得触发菜单浮层",
);

assert.match(
  mainSource,
  /useEffect\(\(\) => \{\s*setOpenMenuKeys\(getOpenKeysForPage\(activePage, collapsed\)\);\s*\}, \[activePage, collapsed\]\);/,
  "页面激活和侧栏状态必须通过统一导航合同同步",
);
assert.match(
  mainSource,
  /function handleMenuOpenChange\(keys\) \{\s*if \(collapsed\) \{\s*setOpenMenuKeys\(\[\]\);\s*return;/,
  "侧栏收缩时必须拒绝受控菜单展开状态",
);
assert.doesNotMatch(
  mainSource,
  /function setActivePageAndMenu\(page\) \{\s*setActivePage\(page\);\s*setOpenMenuKeys/,
  "页面激活不得直接操纵菜单展开状态",
);

console.log("v049.13.3 统一导航状态验证通过");
