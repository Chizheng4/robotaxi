import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { closeManagedBrowser, createBoundedCdpSender } from "./browser-process-lifecycle.mjs";

const root = process.cwd();
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const baseUrl = process.env.ROBOTAXI_MEDIA_CAPTURE_URL || "http://127.0.0.1:4173/?publicDemo=1&mediaCapture=1";
const mediaRoot = path.join(root, "media/evidence-drafts");
const assetsRoot = path.join(mediaRoot, "assets");
const manifestPath = path.join(mediaRoot, "manifest.json");
const handoffPath = path.join(mediaRoot, "xingbuild-handoff.draft.json");
const viewport = { width: 1280, height: 800 };
const profileDir = `/private/tmp/robotaxi-evidence-media-${Date.now()}`;
const version = execFileSync("git", ["log", "-1", "--format=%s"], { cwd: root, encoding: "utf8" }).trim().match(/v\d+(?:\.\d+)+/)?.[0] || "v-unversioned";
const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();

const scenes = [
  {
    id: "robotaxi-evidence-city-geographic-map-v1",
    scene: "city-geographic-map",
    route: "运营中控台",
    state: { mapMode: "CITY_GEOGRAPHIC", selectedObject: null, detailRail: "collapsed", dataOrigin: "publicDemo clean profile" },
    altZh: "Robotaxi 城市空间迭代，展示真实城市底图、行政区空间基底与运营区域规划入口；尚未进入城市模拟运行。",
    prepare: async ({ send }) => {
      await waitFor(send, `Boolean(document.querySelector('.geospatial-map-canvas'))`, "城市地理地图未渲染");
      await waitFor(send, `document.querySelector('.geospatial-map-canvas')?.childElementCount > 0`, "城市地理地图缺少渲染内容");
      const state = await evaluate(send, `({ mode: document.querySelector('.map-mode-switch .ant-segmented-item-selected')?.textContent?.trim() || '', error: document.querySelector('.geospatial-map-status')?.textContent?.trim() || '', detailCollapsed: document.querySelector('.workbench')?.classList.contains('detail-collapsed') })`);
      assert.equal(state.error, "", `城市地理地图进入错误状态：${state.error}`);
      assert.equal(state.detailCollapsed, true, "地图证据场景必须在未选中对象、详情收起状态采集");
      try {
        await clickSelector(send, ".spatial-plan-trigger", "未找到原生规划运营区域入口");
        await waitFor(send, `Boolean(document.querySelector('.spatial-plan-editor'))`, "运营区域规划面板未打开");
        const sourceSelectorOpened = await evaluate(send, `(() => { const controls = [...document.querySelectorAll('.spatial-plan-editor .ant-select')]; const node = controls.at(-1); node?.click(); return controls.length >= 4 && Boolean(node); })()`);
        assert.equal(sourceSelectorOpened, true, "未找到行政区选择器");
        await clickSelector(send, ".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option:not(.ant-select-item-option-disabled)", "未找到可选行政区");
        await waitFor(send, `Boolean(document.querySelector('.spatial-plan-editor .spatial-plan-reference'))`, "未形成可核验的行政区来源草稿");
        const planning = await evaluate(send, `({ source: document.querySelector('.spatial-plan-editor .spatial-plan-reference span')?.textContent?.trim() || '', publishDisabled: Boolean([...document.querySelectorAll('.spatial-plan-editor button')].find((node) => node.textContent.trim() === '发布')?.disabled), visibleMapObjects: document.querySelectorAll('.leaflet-interactive, .maplibregl-canvas').length })`);
        assert(planning.source, "规划草稿缺少行政区来源名称");
        assert.equal(planning.publishDisabled, false, "规划草稿未达到可核验的有效状态");
        return { anchor: ".geospatial-map-shell", observedMapMode: state.mode || "城市地理", planningSource: planning.source, planningStatus: "draft-not-published", planningLimitation: "城市模拟运行尚未启用", candidateStatus: "candidate", mediaRole: "in_progress_context" };
      } catch (error) {
        const planningEntryDomAvailable = await evaluate(send, `Boolean(document.querySelector('.spatial-plan-editor'))`);
        return { anchor: planningEntryDomAvailable ? ".geospatial-map-shell" : ".geospatial-map-canvas", observedMapMode: state.mode || "城市地理", visibleLayer: "city and administrative boundaries", planningEntryDomAvailable, planningStatus: "entry-only", planningLimitation: "城市模拟运行尚未启用；未形成可核验空间对象", candidateStatus: "candidate", mediaRole: "in_progress_context", captureLimitation: `规划编辑器未稳定完成选区：${error.message}` };
      }
    },
  },
  {
    id: "robotaxi-evidence-grid-simulation-operations-map-v1",
    scene: "grid-simulation-operations-map",
    route: "运营中控台 / 网格仿真",
    state: { mapMode: "GRID_SIMULATION", dataOrigin: "local simulation runtime", claims: "system simulation spatial objects only; not real city geography or commercial performance" },
    altZh: "Robotaxi 当前模拟运行的网格仿真运营中控台，展示两个模拟运营区域、道路与服务空间中的 Robotaxi 点位及其运营详情；不代表城市商业运营。",
    prepare: async ({ send }) => {
      await clickSelector(send, ".brand-title-button", "无法返回运营中控台");
      await waitFor(send, `Boolean(document.querySelector('.map-mode-switch'))`, "运营中控台地图模式入口未渲染");
      const switched = await evaluate(send, `(() => { const option = [...document.querySelectorAll('.map-mode-switch label, .map-mode-switch [role="radio"], .map-mode-switch .ant-segmented-item')].find((node) => node.textContent?.trim() === '网格仿真'); option?.click(); return Boolean(option); })()`);
      assert.equal(switched, true, "无法切换到网格仿真");
      await waitFor(send, `Boolean(document.querySelector('.zone-canvas-new'))`, "网格仿真地图未渲染");
      const initial = await evaluate(send, `({ zones: [...document.querySelectorAll('.map-zone-anchor text')].map((node) => node.textContent.trim()), robotaxiMarkerCount: document.querySelectorAll('.robotaxi-map-marker').length, detailCollapsed: document.querySelector('.workbench')?.classList.contains('detail-collapsed') })`);
      assert(initial.zones.includes("最小运营测试区") && initial.zones.includes("东部规划运营区"), "网格仿真必须显示两个运营区域");
      assert.equal(initial.robotaxiMarkerCount, 20, "网格仿真必须显示 20 个 Robotaxi 点位");
      assert.equal(initial.detailCollapsed, true, "网格仿真初始详情必须收起");
      const point = await evaluate(send, `(() => { const marker = document.querySelector('.robotaxi-map-object'); const halo = marker?.querySelector('.robotaxi-map-halo')?.getBoundingClientRect(); return halo ? { x: halo.left + halo.width / 2, y: halo.top + halo.height / 2 } : null; })()`);
      assert(point, "未找到可选择的 Robotaxi 点位");
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
      await waitFor(send, `document.querySelectorAll('.robotaxi-map-object[data-active="true"]').length === 1 && Boolean(document.querySelector('.object-inspector-summary[aria-label*="运营摘要"]'))`, "选择 Robotaxi 后未显示运营详情");
      const selected = await evaluate(send, `({ selectedRobotaxiCount: document.querySelectorAll('.robotaxi-map-object[data-active="true"]').length, detailExpanded: !document.querySelector('.workbench')?.classList.contains('detail-collapsed'), robotaxiMarkerCount: document.querySelectorAll('.robotaxi-map-marker').length })`);
      assert.equal(selected.detailExpanded, true, "选择 Robotaxi 后详情必须展开");
      return { anchor: ".map-stage", robotaxiMarkerCount: selected.robotaxiMarkerCount, selectedRobotaxiCount: selected.selectedRobotaxiCount, detailRail: "expanded", candidateStatus: "candidate", mediaRole: "current_system_evidence" };
    },
  },
  {
    id: "robotaxi-evidence-operating-model-v1",
    scene: "operating-model",
    route: "经营规划 / 经营模型",
    state: { page: "operatingModel", detailRail: "hidden", dataOrigin: "model definition" },
    altZh: "Robotaxi 经营模型，展示需求、供应、决策控制、服务、资产、财务与经营反馈之间的闭环关系。",
    prepare: async ({ send }) => {
      await clickMenuPath(send, ["经营规划", "经营模型"]);
      await waitFor(send, `Boolean(document.querySelector('[data-page="operatingModel"] .operating-model-panel'))`, "经营模型页面未渲染");
      const state = await evaluate(send, `({ names: [...document.querySelectorAll('.operating-model-domain h3')].map((node) => node.textContent.trim()), detailHidden: document.querySelector('.workbench')?.classList.contains('detail-hidden'), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth })`);
      assert.deepEqual(state.names, ["需求", "供应", "决策控制", "服务", "资产", "财务", "经营反馈"], "经营模型领域结构不符合场景合同");
      assert.equal(state.detailHidden, true, "经营模型证据场景不得显示详情栏");
      assert.equal(state.overflow, 0, "经营模型证据场景存在横向溢出");
      return { anchor: ".operating-model-panel", domainCount: state.names.length, candidateStatus: "candidate", mediaRole: "current_system_evidence" };
    },
  },
  {
    id: "robotaxi-evidence-operating-metrics-overview-v1",
    scene: "operating-metrics-overview",
    route: "经营分析 / 经营总览",
    state: { page: "operatingMetricsOverview", metricPeriod: "ALL", dataOrigin: "publicDemo clean profile", claims: "system capability and operating-loop demonstration only" },
    altZh: "Robotaxi 经营总览，展示模拟经营的规划基线、经营事实、指标结果与数据质量提示；不代表真实商业运营绩效。",
    prepare: async ({ send }) => {
      await clickMenuPath(send, ["经营分析", "经营总览"]);
      await waitFor(send, `Boolean(document.querySelector('[data-page="operatingMetricsOverview"] .metric-experience-panel'))`, "经营总览页面未渲染");
      await clickTextButton(send, "更新经营数据");
      await waitFor(send, `document.querySelectorAll('.metric-summary-card').length >= 3`, "经营总览未形成可展示的指标结果", 30000);
      const state = await evaluate(send, `({ cards: document.querySelectorAll('.metric-summary-card').length, quality: document.querySelector('.metric-quality-strip')?.textContent?.trim() || '', detailHidden: document.querySelector('.workbench')?.classList.contains('detail-hidden'), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth })`);
      assert(state.quality.includes("数据池"), "经营总览缺少数据池来源提示");
      assert.equal(state.detailHidden, true, "经营总览证据场景不得显示详情栏");
      assert.equal(state.overflow, 0, "经营总览证据场景存在横向溢出");
      return { anchor: ".metric-experience-panel", metricCardCount: state.cards, candidateStatus: "candidate", mediaRole: "current_system_evidence" };
    },
  },
];

assert(fs.existsSync(chromePath), "未找到 Google Chrome，无法采集证据媒体");
fs.mkdirSync(assetsRoot, { recursive: true });
const chrome = spawn(chromePath, ["--headless=new", "--no-first-run", "--disable-gpu", "--hide-scrollbars", "--remote-debugging-port=0", `--user-data-dir=${profileDir}`, `--window-size=${viewport.width},${viewport.height}`, baseUrl], { stdio: ["ignore", "ignore", "pipe"] });
let socket = null;
let stderr = "";
try {
  const devtoolsUrl = await waitForDevtools(chrome);
  const pageWebSocketUrl = await waitForPageWebSocketUrl(devtoolsUrl, baseUrl);
  socket = new WebSocket(pageWebSocketUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  const pending = new Map();
  let nextId = 1;
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });
  const send = createBoundedCdpSender(socket, pending, () => nextId++);
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: baseUrl });
  await waitFor(send, `Boolean(document.querySelector('.platform-login-shell, .workbench'))`, "入口页面未渲染");
  await loginIfNeeded(send);
  await waitFor(send, `Boolean(document.querySelector('.workbench'))`, "工作台未渲染");
  await waitFor(send, `Boolean(window.__robotaxiPublicDemoState)`, "公开演示初始化状态未形成", 30000);

  const assets = [];
  for (const scene of scenes) {
    await expandNavigationBeforeScenario(send);
    const observed = await scene.prepare({ send });
    const navigation = await collapseNavigationForCapture(send);
    await hideCaptureExcludedElements(send);
    await assertCaptureSafe(send);
    const fileName = `${scene.id}.png`;
    const filePath = path.join(assetsRoot, fileName);
    const screenshot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
    const png = Buffer.from(screenshot.result?.data || "", "base64");
    assert.equal(png.readUInt32BE(16), viewport.width, `${scene.id} 截图宽度错误`);
    assert.equal(png.readUInt32BE(20), viewport.height, `${scene.id} 截图高度错误`);
    fs.writeFileSync(filePath, png);
    assets.push({
      id: scene.id,
      scene: scene.scene,
      sceneVersion: "1",
      route: scene.route,
      state: { ...scene.state, screenshotAnchor: observed.anchor, ...observed, navigation },
      viewport: "1280x800",
      altZh: scene.altZh,
      robotaxiVersion: version,
      commit,
      sourcePage: baseUrl,
      capturedAt: new Date().toISOString(),
      assetPath: `assets/${fileName}`,
      assetSha256: crypto.createHash("sha256").update(png).digest("hex"),
      reviewStatus: "draft",
      publicStatus: "internal",
      candidateStatus: observed.candidateStatus || "candidate",
      mediaRole: observed.mediaRole || "current_system_evidence",
    });
  }
  const manifest = { schemaVersion: "1.0", reviewStatus: "draft", publicStatus: "internal", assets };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(handoffPath, `${JSON.stringify(createXingbuildHandoff(manifest), null, 2)}\n`);
  console.log(`已采集 ${assets.length} 份本地审核证据媒体草稿`);
} finally {
  await closeManagedBrowser({ browser: chrome, socket, profileDir });
}

function createXingbuildHandoff(manifest) {
  const byScene = new Map(manifest.assets.map((asset) => [asset.scene, asset]));
  const rows = [
    ["robotaxi-operations-current-simulation", "运营中控台", 1, "当前模拟运行", "网格仿真运营中控台展示当前可运行的网格模拟与系统内空间对象，不代表城市商业运营。", "当前可运行的网格模拟 → 运营中控台", "grid-simulation-operations-map"],
    ["robotaxi-operations-city-spatial-progress", "运营中控台", 2, "城市空间迭代", "真实城市底图与规划入口已形成城市空间基底；城市模拟运行尚未启用，仅作进行中语境。", "城市空间基底与规划入口 → 后续城市模拟运行", "city-geographic-map"],
    ["robotaxi-operating-model", "经营模型", 3, "经营模型", "展示需求、供应、决策控制、服务、资产、财务与经营反馈之间的系统闭环。", "经营模型 → 经营事实与指标分析", "operating-model"],
    ["robotaxi-operating-metrics-overview", "经营总览", 4, "经营总览", "展示模拟经营的规划基线、经营事实、指标结果与数据质量提示，不代表真实商业运营绩效。", "经营事实 → 指标结果与数据质量反馈", "operating-metrics-overview"],
  ];
  return {
    schemaVersion: "1.0-draft",
    reviewStatus: "draft",
    publicStatus: "internal",
    projectionContract: { desktop: "左侧短说明 + 右侧16:10证据图", mobile: "图上文下" },
    rows: rows.map(([id, group, order, title, shortDescription, loopRelation, scene]) => {
      const asset = byScene.get(scene);
      assert(asset, `交接草稿缺少场景：${scene}`);
      return { id, group, order, title, shortDescription, loopRelation, mediaAssetId: asset.id, altZh: asset.altZh, mediaRole: asset.mediaRole, robotaxiVersion: asset.robotaxiVersion, commit: asset.commit, stateBoundary: asset.mediaRole === "in_progress_context" ? "城市空间基底与规划入口已形成；城市模拟运行尚未启用，不作运营能力或商业运营主张。" : asset.scene === "grid-simulation-operations-map" ? "当前可运行的网格模拟；不代表城市商业运营。" : asset.scene === "operating-metrics-overview" ? "模拟经营数据；不代表真实商业运营绩效。" : "当前系统能力证据；仍需人工审核。", deepLink: null };
    }),
  };
}

async function waitForDevtools(browser) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Chrome DevTools 启动超时")), 8000);
    browser.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    browser.on("error", reject);
    browser.on("exit", (code) => reject(new Error(`Chrome 提前退出：${code}\n${stderr}`)));
  });
}

async function waitForPageWebSocketUrl(browserWebSocketUrl, expectedUrl) {
  const port = new URL(browserWebSocketUrl).port;
  for (let index = 0; index < 40; index += 1) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = pages.find((item) => item.type === "page" && item.url.startsWith(expectedUrl.split("?")[0]));
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* Chrome is still starting. */ }
    await delay(250);
  }
  throw new Error(`未找到 Chrome 页面调试端点：${expectedUrl}`);
}

async function evaluate(send, expression) {
  const result = await send("Runtime.evaluate", { expression: `(${expression})`, returnByValue: true });
  return result.result?.result?.value;
}

async function waitFor(send, expression, message, timeoutMs = 15000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (await evaluate(send, expression)) return;
    await delay(250);
  }
  throw new Error(message);
}

async function loginIfNeeded(send) {
  const loggedIn = await evaluate(send, `Boolean(document.querySelector('.workbench'))`);
  if (loggedIn) return;
  const submitted = await evaluate(send, `(() => { const input = document.querySelector('.platform-login-form input'); const form = document.querySelector('.platform-login-form'); if (!input || !form) return false; const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set; setter?.call(input, '金星'); input.dispatchEvent(new Event('input', { bubbles: true })); form.requestSubmit(); return true; })()`);
  assert.equal(submitted, true, "登录入口不可用");
}

async function clickMenuPath(send, labels) {
  for (const label of labels) {
    const clicked = await evaluate(send, `(() => { const node = [...document.querySelectorAll('.ant-menu-title-content')].find((item) => item.textContent.trim() === ${JSON.stringify(label)}); const target = node?.closest('.ant-menu-item, .ant-menu-submenu-title'); target?.click(); return Boolean(target); })()`);
    assert.equal(clicked, true, `未找到菜单：${label}`);
    await delay(350);
  }
}

async function clickTextButton(send, label) {
  const clicked = await evaluate(send, `(() => { const button = [...document.querySelectorAll('button')].find((node) => node.textContent.trim() === ${JSON.stringify(label)} && !node.disabled); button?.click(); return Boolean(button); })()`);
  assert.equal(clicked, true, `未找到可用按钮：${label}`);
}

async function clickSelector(send, selector, message) {
  const clicked = await evaluate(send, `(() => { const node = document.querySelector(${JSON.stringify(selector)}); node?.click(); return Boolean(node); })()`);
  assert.equal(clicked, true, message);
  await delay(250);
}

async function collapseNavigationForCapture(send) {
  const collapsed = await evaluate(send, `(() => { const trigger = document.querySelector('[aria-label="收起菜单"]'); trigger?.click(); return Boolean(trigger); })()`);
  if (collapsed) await waitFor(send, `Boolean(document.querySelector('.system-brand.collapsed'))`, "原生侧栏未收起");
  const state = await evaluate(send, `({ collapsed: Boolean(document.querySelector('.system-brand.collapsed')), label: document.querySelector('.brand-title-button')?.textContent?.trim() || '' })`);
  assert.equal(state.collapsed, true, "媒体采集必须使用原生收起侧栏状态");
  return "collapsed";
}

async function expandNavigationBeforeScenario(send) {
  const expanded = await evaluate(send, `(() => { const trigger = document.querySelector('[aria-label="展开菜单"]'); trigger?.click(); return Boolean(trigger); })()`);
  if (expanded) await waitFor(send, `!document.querySelector('.system-brand.collapsed')`, "原生侧栏未展开");
}

async function hideCaptureExcludedElements(send) {
  await evaluate(send, `(() => { document.querySelectorAll('.platform-user-trigger, .ant-message, .ant-notification').forEach((node) => { node.dataset.mediaCaptureDisplay = node.style.display; node.style.display = 'none'; }); return true; })()`);
}

async function assertCaptureSafe(send) {
  const state = await evaluate(send, `(() => ({ overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, debugVisible: [...document.querySelectorAll('body *')].some((node) => /DevTools|verifyBrowserLoad|mediaCapture=1/.test(node.textContent || '') && getComputedStyle(node).display !== 'none'), userVisible: Boolean(document.querySelector('.platform-user-trigger') && getComputedStyle(document.querySelector('.platform-user-trigger')).display !== 'none') }))()`);
  assert.equal(state.overflow, 0, "证据截图存在全局横向溢出");
  assert.equal(state.debugVisible, false, "证据截图存在调试文本");
  assert.equal(state.userVisible, false, "证据截图不得包含用户信息");
}

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
