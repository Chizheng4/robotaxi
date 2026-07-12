import assert from "node:assert/strict";
import fs from "node:fs";
import { spawn } from "node:child_process";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const targetUrl = process.env.ROBOTAXI_BROWSER_VERIFY_URL || "http://127.0.0.1:4173/?verifyBrowserLoad=1";
const viewport = process.env.ROBOTAXI_BROWSER_VIEWPORT || "1280,720";
const mobileAssertionEnabled = process.env.ROBOTAXI_BROWSER_ASSERT_MOBILE === "1";
const mapAssertionEnabled = process.env.ROBOTAXI_BROWSER_ASSERT_MAP === "1";
const screenshotPath = process.env.ROBOTAXI_BROWSER_SCREENSHOT || "";
const [viewportWidth, viewportHeight] = viewport.split(",").map(Number);

assert(fs.existsSync(chromePath), "未找到 Google Chrome，无法执行真实浏览器白屏检查");

const chrome = spawn(chromePath, [
  "--headless=new",
  "--no-first-run",
  "--disable-gpu",
  "--hide-scrollbars",
  "--remote-debugging-port=0",
  `--user-data-dir=/private/tmp/robotaxi-browser-load-${Date.now()}`,
  `--window-size=${viewport}`,
  targetUrl,
], { stdio: ["ignore", "ignore", "pipe"] });

let stderr = "";
const devtoolsUrl = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("Chrome DevTools 启动超时")), 8000);
  chrome.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
    const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (match) {
      clearTimeout(timer);
      resolve(match[1]);
    }
  });
  chrome.on("error", reject);
  chrome.on("exit", (code) => {
    reject(new Error(`Chrome 提前退出：${code}\n${stderr}`));
  });
});

try {
  const pageWebSocketUrl = await waitForPageWebSocketUrl(devtoolsUrl, targetUrl);
  const messages = [];
  const exceptions = [];
  const socket = new WebSocket(pageWebSocketUrl);
  let nextId = 1;
  const pending = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
      return;
    }
    if (message.method === "Runtime.exceptionThrown") {
      const details = message.params?.exceptionDetails || {};
      exceptions.push(JSON.stringify({
        text: details.text,
        exception: details.exception?.description || details.exception?.value,
        url: details.url,
        lineNumber: details.lineNumber,
        columnNumber: details.columnNumber,
      }));
    }
    if (message.method === "Log.entryAdded") {
      messages.push(message.params?.entry?.text || "");
    }
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  const send = (method, params = {}) => new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });

  await send("Runtime.enable");
  await send("Log.enable");
  await send("Page.enable");
  if (mobileAssertionEnabled) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: viewportWidth,
      height: viewportHeight,
      deviceScaleFactor: 1,
      mobile: true,
    });
  }
  await send("Page.navigate", { url: targetUrl });
  await delay(5000);

  const entryResult = await send("Runtime.evaluate", {
    expression: `JSON.stringify({
      hasLogin: Boolean(document.querySelector(".platform-login-shell")),
      hasWorkbench: Boolean(document.querySelector(".workbench"))
    })`,
    returnByValue: true,
  });
  const entryState = JSON.parse(entryResult.result?.result?.value || "{}");
  assert(entryState.hasLogin || entryState.hasWorkbench, `页面既未渲染登录入口也未渲染工作台：${JSON.stringify(entryState)}`);
  if (entryState.hasLogin) {
    const loginResult = await send("Runtime.evaluate", {
      expression: `(() => {
        const input = document.querySelector(".platform-login-form input");
        const form = document.querySelector(".platform-login-form");
        if (!input || !form) return { submitted: false };
        const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        valueSetter?.call(input, "金星");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        form.requestSubmit();
        return { submitted: true };
      })()`,
      returnByValue: true,
    });
    assert(loginResult.result?.result?.value?.submitted, "登录入口缺少可提交的输入框或表单");
    await delay(2500);
  }

  if (mapAssertionEnabled) {
    const cellSelectionResult = await send("Runtime.evaluate", {
      expression: `(() => {
        const svg = document.querySelector(".zone-canvas-new");
        const scene = svg?.querySelector("g[transform]");
        if (!svg || !scene) return { clicked: false };
        const point = svg.createSVGPoint();
        point.x = 15.5;
        point.y = 20.5;
        const screenPoint = point.matrixTransform(scene.getScreenCTM());
        svg.dispatchEvent(new MouseEvent("click", {
          bubbles: true,
          clientX: screenPoint.x,
          clientY: screenPoint.y,
        }));
        return { clicked: true };
      })()`,
      returnByValue: true,
    });
    assert(cellSelectionResult.result?.result?.value?.clicked, "地图缺少可执行的 Cell 点击入口");
    await delay(250);

    const hoverTriggerResult = await send("Runtime.evaluate", {
      expression: `(() => {
        const place = document.querySelector(".map-place-object rect");
        if (!place) return { triggered: false };
        const placeRect = place.getBoundingClientRect();
        place.dispatchEvent(new PointerEvent("pointerover", {
          bubbles: true,
          pointerType: "mouse",
          clientX: placeRect.left + placeRect.width / 2,
          clientY: placeRect.top + placeRect.height / 2,
        }));
        return { triggered: true };
      })()`,
      returnByValue: true,
    });
    assert(hoverTriggerResult.result?.result?.value?.triggered, "地图地点必须保留悬浮入口");
    await delay(100);
    const hoverVisibleResult = await send("Runtime.evaluate", {
      expression: `Boolean(document.querySelector(".map-hover-card"))`,
      returnByValue: true,
    });
    assert(hoverVisibleResult.result?.result?.value, "选中对象后，地点悬浮摘要仍必须可用");
    const robotaxiClickResult = await send("Runtime.evaluate", {
      expression: `(() => {
        const robotaxi = document.querySelector(".robotaxi-map-object");
        robotaxi?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        return { robotaxiClicked: Boolean(robotaxi) };
      })()`,
      returnByValue: true,
    });
    assert(robotaxiClickResult.result?.result?.value?.robotaxiClicked, "地图 Robotaxi 必须保留详情点击入口");
    await delay(250);
  }

  const result = await send("Runtime.evaluate", {
    expression: `JSON.stringify({
      title: document.title,
      hasApp: Boolean(document.querySelector("#app")),
      hasWorkbench: Boolean(document.querySelector(".workbench")),
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      siderWidth: document.querySelector(".ops-sider")?.getBoundingClientRect().width || 0,
      mapVisible: Boolean(document.querySelector(".zone-canvas-new")),
      mapSceneNodeCount: document.querySelector(".zone-canvas-new g")?.querySelectorAll("*").length || 0,
      zoneLabels: [...document.querySelectorAll(".map-zone-anchor text")].map((node) => node.textContent),
      robotaxiMarkerCount: document.querySelectorAll(".robotaxi-map-marker").length,
      selectedCellCount: document.querySelectorAll(".map-selected-cell").length,
      selectedRobotaxiCount: document.querySelectorAll('.robotaxi-map-object[data-active="true"]').length,
      robotaxiInspectorVisible: Boolean(document.querySelector('.object-inspector-summary[aria-label*="运营摘要"]')),
      robotaxiDetailTabLabels: [...document.querySelectorAll(".detail-tabs .ant-tabs-tab")].map((node) => node.textContent.trim()),
      hoverCardVisible: Boolean(document.querySelector(".map-hover-card")),
      visibleMapAnchorCount: [...document.querySelectorAll(".map-zone-anchor, .map-place-anchor")].filter((node) => {
        const rect = node.getBoundingClientRect();
        const stage = document.querySelector(".map-stage")?.getBoundingClientRect();
        return getComputedStyle(node).display !== "none" && stage && rect.right > stage.left && rect.left < stage.right && rect.bottom > stage.top && rect.top < stage.bottom;
      }).length,
      mapAnchorRects: [...document.querySelectorAll(".map-zone-anchor, .map-place-anchor")].slice(0, 5).map((node) => {
        const rect = node.getBoundingClientRect();
        return { label: node.textContent, display: getComputedStyle(node).display, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
      }),
      bodyText: document.body.innerText.slice(0, 500)
    })`,
    returnByValue: true,
  });
  if (screenshotPath) {
    const screenshot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.result?.data || "", "base64"));
  }
  socket.close();

  const pageState = JSON.parse(result.result?.result?.value || "{}");
  assert(pageState.hasApp, `页面缺少 #app 容器：${JSON.stringify(pageState)}`);
  assert(pageState.hasWorkbench, `页面未渲染工作台主体，可能白屏：${JSON.stringify(pageState)}\n${exceptions.join("\n")}\n${messages.join("\n")}`);
  assert.equal(exceptions.length, 0, `浏览器运行时异常：${exceptions.join("\n")}`);
  if (mobileAssertionEnabled) {
    assert(pageState.viewportWidth <= 480, `手机验证视口未生效：${JSON.stringify(pageState)}`);
    assert(pageState.siderWidth <= 64, `手机首屏菜单未收起：${JSON.stringify(pageState)}`);
    assert(pageState.documentWidth <= pageState.viewportWidth + 1, `手机页面出现全局横向溢出：${JSON.stringify(pageState)}`);
    if (mapAssertionEnabled) assert(pageState.visibleMapAnchorCount >= 1, `手机地图可视区域缺少轻量空间标签：${JSON.stringify(pageState)}`);
  }
  if (mapAssertionEnabled) {
    assert(pageState.mapVisible, `运营中控台地图未显示：${JSON.stringify(pageState)}`);
    assert(pageState.mapSceneNodeCount < 500, `地图 DOM 节点超过性能预算：${JSON.stringify(pageState)}`);
    assert(pageState.zoneLabels.includes("最小运营测试区"), `地图缺少 Zone 1：${JSON.stringify(pageState)}`);
    assert(pageState.zoneLabels.includes("东部规划运营区"), `地图缺少 Zone 2：${JSON.stringify(pageState)}`);
    assert.equal(pageState.robotaxiMarkerCount, 20, `存在当前位置的 20 辆 Robotaxi 必须全部生成地图点位：${JSON.stringify(pageState)}`);
    assert.equal(pageState.selectedRobotaxiCount, 1, `点击 Robotaxi 后必须切换到唯一车辆详情：${JSON.stringify(pageState)}`);
    assert(pageState.robotaxiInspectorVisible, `Robotaxi 详情必须显示专用运营摘要：${JSON.stringify(pageState)}`);
    assert(["基础信息", "资产事实", "任务状态", "位置上下文", "行驶记录"].every((label) => pageState.robotaxiDetailTabLabels.includes(label)), `Robotaxi 详情必须保留完整分类：${JSON.stringify(pageState)}`);
    assert.equal(pageState.hoverCardVisible, false, `点击 Cell 后不得残留其他对象悬浮提示：${JSON.stringify(pageState)}`);
    assert(pageState.documentWidth <= pageState.viewportWidth + 1, `地图页面出现全局横向溢出：${JSON.stringify(pageState)}`);
  }
  console.log("真实浏览器加载验证通过");
} finally {
  chrome.kill("SIGTERM");
}

async function waitForPageWebSocketUrl(browserWebSocketUrl, expectedUrl) {
  const port = new URL(browserWebSocketUrl).port;
  for (let index = 0; index < 40; index += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const pages = await response.json();
      const page = pages.find((item) => item.type === "page" && item.url.startsWith(expectedUrl.split("?")[0]));
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch (error) {
      // Chrome may need a moment before the JSON endpoint is ready.
    }
    await delay(250);
  }
  throw new Error(`未找到 Chrome 页面调试端点：${expectedUrl}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
