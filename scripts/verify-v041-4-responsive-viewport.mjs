import assert from "node:assert/strict";
import fs from "node:fs";
import { attachResponsiveViewport, calculateResponsiveViewport } from "../src/ui/responsiveViewport.js";

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

const repeatedKeyboardCycle = calculateResponsiveViewport({
  width: 390,
  layoutHeight: 490,
  visualHeight: 490,
  visualOffsetTop: 0,
  stableHeight: 844,
  editableFocused: true,
});
assert.equal(repeatedKeyboardCycle.keyboardOpen, true, "重复聚焦不得把键盘高度误记为稳定视口");
assert.equal(repeatedKeyboardCycle.keyboardInset, 354);

const compact = calculateResponsiveViewport({
  width: 768,
  layoutHeight: 1024,
  visualHeight: 1024,
  stableHeight: 1024,
});
assert.equal(compact.mode, "compact");

const styles = fs.readFileSync("src/styles.css", "utf8");
const mainSource = fs.readFileSync("src/main.jsx", "utf8");
const indexSource = fs.readFileSync("index.html", "utf8");
assert(styles.includes("--app-viewport-height"), "缺少统一可视高度变量");
assert(styles.includes('html[data-keyboard-open="true"] .platform-login-panel'), "登录页缺少键盘打开状态");
assert(styles.includes("font-size: 16px"), "手机输入框必须避免浏览器自动放大");
assert(!styles.includes('padding-top: calc(var(--app-viewport-offset-top) + max(16px, env(safe-area-inset-top)))'), "登录页不得重复补偿浏览器可视视口平移");
assert(styles.includes("position: fixed;\n  inset: 0;"), "登录画布必须脱离可滚动页面并稳定覆盖首屏");
assert(styles.includes("top: clamp(72px, 12svh, 108px)"), "手机登录表单必须锚定在首屏上半部安全区");
assert(!styles.includes("\n  padding-bottom: calc(var(--keyboard-inset) + 16px)"), "登录页不得在可视高度内再次增加键盘高度");
assert(!mainSource.includes("autoFocus"), "登录页不得自动聚焦并触发 WebView 原生滚动");
assert(!indexSource.includes("interactive-widget=resizes-content"), "不得同时要求浏览器重排布局视口和平台计算可视视口");
assert(mainSource.includes("responsiveViewport.attachResponsiveViewport()"), "平台启动前必须接入统一视口服务");

const cycle = createViewportCycleHarness();
cycle.focusInput();
cycle.resizeViewport(490, 28);
assert.equal(cycle.root.dataset.keyboardOpen, "true");
cycle.scrollViewport(52);
cycle.scrollViewport(76);
cycle.blurInput();
cycle.resizeViewport(844, 0);
cycle.flushFocusSettle();
assert.equal(cycle.root.dataset.keyboardOpen, "false", "键盘关闭后必须恢复关闭状态");
cycle.focusInput();
cycle.resizeViewport(490, 28);
assert.equal(cycle.root.dataset.keyboardOpen, "true", "再次聚焦必须从稳定视口重新计算");
assert.equal(cycle.root.style.values.get("--keyboard-inset"), "326px", "重复键盘周期不得累计位移");
cycle.detach();

console.log("v041.4 手机响应式视口基础验证通过");

function createViewportCycleHarness() {
  const windowListeners = new Map();
  const documentListeners = new Map();
  const visualListeners = new Map();
  const frames = [];
  const timers = [];
  const loginShell = { scrollTop: 96 };
  const root = {
    dataset: {},
    style: {
      values: new Map(),
      setProperty(key, value) { this.values.set(key, value); },
    },
  };
  const input = { matches: () => true, closest: () => ({}) };
  const body = { matches: () => false };
  const visualViewport = {
    width: 390,
    height: 844,
    offsetTop: 0,
    addEventListener(type, handler) { visualListeners.set(type, handler); },
    removeEventListener(type) { visualListeners.delete(type); },
  };
  const windowRef = {
    innerWidth: 390,
    innerHeight: 844,
    visualViewport,
    requestAnimationFrame(handler) { frames.push(handler); return frames.length; },
    cancelAnimationFrame() {},
    setTimeout(handler) { timers.push(handler); return timers.length; },
    clearTimeout() {},
    addEventListener(type, handler) { windowListeners.set(type, handler); },
    removeEventListener(type) { windowListeners.delete(type); },
  };
  const documentRef = {
    documentElement: root,
    activeElement: body,
    querySelector: () => loginShell,
    addEventListener(type, handler) { documentListeners.set(type, handler); },
    removeEventListener(type) { documentListeners.delete(type); },
  };
  const detach = attachResponsiveViewport(windowRef, documentRef);
  const flushFrames = () => {
    while (frames.length) frames.shift()();
  };
  return {
    root,
    detach,
    focusInput() {
      documentRef.activeElement = input;
      documentListeners.get("focusin")?.();
      flushFrames();
    },
    blurInput() {
      documentRef.activeElement = body;
      documentListeners.get("focusout")?.();
    },
    resizeViewport(height, offsetTop) {
      visualViewport.height = height;
      visualViewport.offsetTop = offsetTop;
      windowRef.innerHeight = height;
      visualListeners.get("resize")?.();
      flushFrames();
    },
    scrollViewport(offsetTop) {
      visualViewport.offsetTop = offsetTop;
      visualListeners.get("scroll")?.();
      flushFrames();
    },
    flushFocusSettle() {
      while (timers.length) timers.shift()();
      flushFrames();
    },
  };
}
