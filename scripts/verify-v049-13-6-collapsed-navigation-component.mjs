import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const rules = fs.readFileSync(new URL("../doc/rules/04-frontend-ux-rules.md", import.meta.url), "utf8");

assert.match(
  source,
  /collapsed\s*\?\s*\(\s*<CollapsedNavigation[\s\S]*?items=\{pageGroups\}[\s\S]*?activePage=\{activePage\}/,
  "侧栏收缩状态必须统一进入公共收缩导航组件",
);
assert.doesNotMatch(
  source,
  /inlineCollapsed=\{collapsed\}|triggerSubMenuAction="hover"/,
  "收缩导航不得继续依赖 Ant Design 自动 Tooltip 与子菜单 Popup 分支",
);
assert.match(
  source,
  /function CollapsedNavigation\([\s\S]*?function CollapsedNavigationFlyout\([\s\S]*?function CollapsedNavigationNodes\(/,
  "一级叶子、一级分组和深层节点必须由同一公共组件族递归渲染",
);
assert.match(
  source,
  /const activeRootKey = getRootMenuKey\(activePage\);[\s\S]*?const selected = item\.key === activeRootKey;/,
  "一级根菜单选中状态必须统一由当前页面导航路径计算",
);
assert.match(
  source,
  /useEffect\(\(\) => \{\s*setOpenKey\(null\);\s*\}, \[activePage\]\);/,
  "工作区页面变化后必须关闭导航浮层，避免 Tab 与菜单交互状态互相污染",
);
assert.match(
  source,
  /if \(hasChildren\) \{\s*setOpenKey\(item\.key\);/,
  "分组点击应确定打开统一浮层",
);
assert.doesNotMatch(
  source,
  /trigger=\{\["hover",\s*"focus"\]\}/,
  "焦点不应自动开关浮层，避免页面菜单项点击前因失焦被卸载",
);
assert.match(
  styles,
  /\.collapsed-navigation-popover\s*\{\s*--collapsed-navigation-width:\s*200px;/s,
  "所有收缩导航浮层必须共享稳定宽度",
);
assert.match(
  styles,
  /\.collapsed-navigation-page\s*\{[^}]*min-height:\s*36px;[^}]*border-radius:\s*6px;/s,
  "浮层菜单行必须继承标准导航尺寸",
);
assert.match(
  styles,
  /\.collapsed-navigation-page\.selected\s*\{[^}]*background:\s*var\(--accent-soft\);[^}]*box-shadow:\s*inset 3px 0 0 var\(--accent\);/s,
  "浮层当前页面必须使用完整统一选中视觉",
);
assert.doesNotMatch(
  styles,
  /\.ops-menu\.ant-menu-inline-collapsed/,
  "旧 Ant 收缩菜单样式应清除，避免形成第二套视觉合同",
);
assert.match(
  rules,
  /不得分别依赖组件库自动生成的 Tooltip 与子菜单 Popup/,
  "前端规则必须阻止收缩导航重新分叉",
);

console.log("v049.13.6 统一收缩导航组件验证通过");
