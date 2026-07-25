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
  "侧栏收缩时不得由页面状态主动展开父菜单",
);
assert.deepEqual(
  resolveNavigationOpenKeys("longTermDemandForecastStrategies", false),
  ["businessPlanning", "demandForecastManagement"],
  "侧栏展开时必须同步定位当前页面",
);

assert.match(
  mainSource,
  /function CollapsedNavigation\([\s\S]*?trigger=\{\["hover"\]\}/,
  "侧栏收缩时必须保留鼠标悬停打开子菜单的标准交互",
);
assert.match(
  mainSource,
  /if \(hasChildren\) \{\s*setRootOpenState\(item,\s*true\);/,
  "分组菜单必须通过点击支持键盘和触控打开",
);
assert.match(
  mainSource,
  /open=\{openKey === item\.key\}[\s\S]*?onOpenChange=\{\(open\) => setRootOpenState\(item,\s*open\)\}/,
  "收缩导航浮层必须使用独立交互状态，不得复用页面菜单展开状态",
);
assert.match(
  mainSource,
  /function handleMenuOpenChange\(keys\) \{\s*if \(collapsed\) return;/,
  "收缩状态的悬浮子菜单不得写入页面导航状态",
);
assert.doesNotMatch(
  mainSource,
  /function setActivePageAndMenu\(page\) \{\s*setActivePage\(page\);\s*setOpenMenuKeys/,
  "工作台页签激活不得直接操纵菜单展开状态",
);

console.log("v049.13.4 菜单与工作台交互合同验证通过");
