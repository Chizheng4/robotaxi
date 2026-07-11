import assert from "node:assert/strict";
import fs from "node:fs";
import { calculateResponsiveViewport } from "../src/ui/responsiveViewport.js";

const desktop = calculateResponsiveViewport({
  width: 1440,
  layoutHeight: 900,
  visualHeight: 900,
  stableHeight: 900,
});
assert.equal(desktop.mode, "desktop");
assert.equal(desktop.keyboardOpen, false);

const mobile = calculateResponsiveViewport({
  width: 390,
  layoutHeight: 844,
  visualHeight: 844,
  stableHeight: 844,
});
assert.equal(mobile.mode, "mobile");
assert.equal(mobile.keyboardInset, 0);

const mobileKeyboard = calculateResponsiveViewport({
  width: 390,
  layoutHeight: 844,
  visualHeight: 490,
  stableHeight: 844,
  editableFocused: true,
});
assert.equal(mobileKeyboard.mode, "mobile");
assert.equal(mobileKeyboard.keyboardOpen, true);
assert.equal(mobileKeyboard.keyboardInset, 354);

const compact = calculateResponsiveViewport({
  width: 768,
  layoutHeight: 1024,
  visualHeight: 1024,
  stableHeight: 1024,
});
assert.equal(compact.mode, "compact");

const styles = fs.readFileSync("src/styles.css", "utf8");
const mainSource = fs.readFileSync("src/main.jsx", "utf8");
assert(styles.includes("--app-viewport-height"), "缺少统一可视高度变量");
assert(styles.includes('html[data-keyboard-open="true"] .platform-login-panel'), "登录页缺少键盘打开状态");
assert(styles.includes("font-size: 16px"), "手机输入框必须避免浏览器自动放大");
assert(mainSource.includes("responsiveViewport.attachResponsiveViewport()"), "平台启动前必须接入统一视口服务");

console.log("v041.4 手机响应式视口基础验证通过");
