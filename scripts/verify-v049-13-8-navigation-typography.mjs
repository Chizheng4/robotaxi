import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const rules = fs.readFileSync(new URL("../doc/rules/04-frontend-ux-rules.md", import.meta.url), "utf8");
const design = fs.readFileSync(
  new URL("../doc/common/current-iteration/minor/v049.13.8-navigation-typography-design.md", import.meta.url),
  "utf8",
);

assert.match(
  source,
  /function NavigationNodeContent\(\{ label \}\)[\s\S]*?workspace-navigation-node/,
  "展开与收缩导航必须共享节点内容控件",
);
assert.match(
  source,
  /function createMenuItems[\s\S]*?label:\s*<NavigationNodeContent label=\{item\.label\} \/>/,
  "展开菜单必须使用共享节点内容控件",
);
assert.match(
  source,
  /function CollapsedNavigationLevel[\s\S]*?<NavigationNodeContent label=\{item\.label\} \/>/,
  "收缩浮层必须使用共享节点内容控件",
);
assert.match(
  source,
  /function getCollapsedNavigationPanelWidth[\s\S]*?collapsedNavigationPanelSize\.min[\s\S]*?collapsedNavigationPanelSize\.max/,
  "浮层面板宽度必须按内容计算并受统一边界约束",
);
assert.match(
  source,
  /--navigation-panel-inline-size": `\$\{getCollapsedNavigationPanelWidth\(panel\)\}px`/,
  "每一级浮层必须独立接收内容宽度",
);
assert.doesNotMatch(
  source,
  /--collapsed-navigation-panel-count/,
  "浮层总宽度不得继续按层级数量乘固定宽度",
);

assert.match(
  styles,
  /--font-family:[^;]+;[\s\S]*?--navigation-font-size:\s*var\(--font-sm\);[\s\S]*?--navigation-item-height:\s*36px;/,
  "全站字体与导航尺寸必须使用根级语义令牌",
);
assert.match(
  styles,
  /\.ops-menu \.ant-menu-item,[\s\S]*?font-size:\s*var\(--navigation-font-size\);[\s\S]*?font-weight:\s*var\(--navigation-font-weight\);/,
  "展开菜单必须使用统一导航字体令牌",
);
assert.match(
  styles,
  /\.collapsed-navigation-item\s*\{[\s\S]*?font-size:\s*var\(--navigation-font-size\);[\s\S]*?font-weight:\s*var\(--navigation-font-weight\);/,
  "收缩菜单必须使用统一导航字体令牌",
);
assert.match(
  styles,
  /\.collapsed-navigation-flyout\s*\{\s*width:\s*max-content;/,
  "级联浮层必须按实际面板内容收敛总宽度",
);
assert.doesNotMatch(
  styles,
  /--collapsed-navigation-width:\s*200px|calc\(var\(--collapsed-navigation-width\)\s*\*/,
  "不得保留固定面板宽度和倍乘留白",
);

assert.match(
  rules,
  /同一导航节点必须复用同一节点内容控件和导航视觉令牌/,
  "长期规则必须固定导航节点复用合同",
);
assert.match(
  rules,
  /每一级面板必须按该级最长可见中文内容独立计算宽度/,
  "长期规则必须固定内容自适应空间合同",
);
assert.match(design, /## 验收[\s\S]*?空白/, "本次方案必须包含视觉验收目标");

console.log("v049.13.8 导航字体与空间统一验证通过");
