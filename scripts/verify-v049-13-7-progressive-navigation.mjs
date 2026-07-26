import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const rules = fs.readFileSync(new URL("../doc/rules/04-frontend-ux-rules.md", import.meta.url), "utf8");

assert.match(
  source,
  /function WorkspaceNavigation\([\s\S]*?if \(collapsed\)[\s\S]*?<CollapsedNavigation[\s\S]*?return \(\s*<Menu/s,
  "展开和收缩导航必须由一个公共控件封装",
);
assert.match(
  source,
  /function buildCollapsedNavigationPanels\([\s\S]*?panels\.push\(\{ key: group\.key, label: group\.label, items: group\.children \}\)/,
  "收缩菜单必须按当前打开路径逐级构造面板",
);
assert.doesNotMatch(
  source,
  /function CollapsedNavigationNodes|<CollapsedNavigationNodes/,
  "收缩菜单不得递归渲染全部后代节点",
);
assert.match(
  source,
  /const expanded = isGroup && openPath\[panelIndex\] === item\.key;/,
  "每个层级只能有一个当前展开分组",
);
assert.match(
  source,
  /onMouseEnter=\{\(\) => \{[\s\S]*?\[\.\.\.openPath\.slice\(0, panelIndex\), item\.key\]/,
  "鼠标进入分组时必须只保留当前路径并打开下一级",
);
assert.match(
  source,
  /className=\{classNames\}[\s\S]*?<NavigationNodeContent label=\{item\.label\} \/>[\s\S]*?collapsed-navigation-chevron/,
  "分组和叶子必须共用标准菜单行，分组仅增加子级标识",
);
assert.match(
  styles,
  /\.collapsed-navigation-item\s*\{[^}]*min-height:\s*var\(--navigation-item-height\);/s,
  "所有浮层菜单节点必须继承标准导航行高",
);
assert.match(
  styles,
  /\.workspace-navigation-node\s*\{[^}]*font-size:\s*var\(--navigation-font-size\);[^}]*font-weight:\s*var\(--navigation-font-weight\);[^}]*line-height:\s*var\(--navigation-line-height\);/s,
  "所有浮层菜单文字必须通过共享节点继承标准字号、行高和常规字重",
);
assert.doesNotMatch(
  styles,
  /\.collapsed-navigation-section-title|\.collapsed-navigation-page/,
  "不得保留分组小标题或另一套页面行视觉",
);
assert.match(
  styles,
  /\.collapsed-navigation-panel\s*\{[\s\S]*?var\(--navigation-panel-inline-size,[\s\S]*?var\(--navigation-panel-max-width\)/s,
  "每一级菜单面板必须使用统一边界内的内容自适应宽度",
);
assert.match(
  rules,
  /收缩浮层只展示当前层级的直接子项[\s\S]*?禁止递归铺开整棵菜单树/,
  "前端规则必须固定逐级披露合同",
);

console.log("v049.13.7 收缩菜单逐级披露验证通过");
