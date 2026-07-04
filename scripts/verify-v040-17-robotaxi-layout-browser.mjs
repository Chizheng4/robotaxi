import assert from "node:assert/strict";
import fs from "node:fs";
import { spawn } from "node:child_process";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const targetUrl = process.env.ROBOTAXI_BROWSER_VERIFY_URL || "http://127.0.0.1:4173/?verifyRobotaxiLayout=1";
const viewport = process.env.ROBOTAXI_BROWSER_VIEWPORT || "1280,720";

assert(fs.existsSync(chromePath), "未找到 Google Chrome，无法执行 Robotaxi 布局检查");

const chrome = spawn(chromePath, [
  "--headless=new",
  "--no-first-run",
  "--disable-gpu",
  "--hide-scrollbars",
  "--remote-debugging-port=0",
  `--user-data-dir=/private/tmp/robotaxi-layout-${Date.now()}`,
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
  chrome.on("exit", (code) => reject(new Error(`Chrome 提前退出：${code}\n${stderr}`)));
});

try {
  const pageWebSocketUrl = await waitForPageWebSocketUrl(devtoolsUrl, targetUrl);
  const socket = new WebSocket(pageWebSocketUrl);
  let nextId = 1;
  const pending = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
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

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url: targetUrl });
  await delay(5000);
  await send("Runtime.evaluate", {
    expression: `
      (() => {
        const menuTitles = Array.from(document.querySelectorAll(".ant-menu-submenu-title, .ant-menu-item"));
        const robotaxiGroup = menuTitles.find((node) => node.innerText?.includes("Robotaxi 管理"));
        robotaxiGroup?.click();
      })()
    `,
  });
  await delay(500);
  await send("Runtime.evaluate", {
    expression: `
      (() => {
        const menuItems = Array.from(document.querySelectorAll(".ant-menu-item, .ant-menu-submenu-title"));
        const robotaxiList = menuItems.find((node) => node.innerText?.includes("Robotaxi 列表"));
        robotaxiList?.click();
      })()
    `,
  });
  await delay(1500);

  const result = await send("Runtime.evaluate", {
    expression: `JSON.stringify({
      hasPanel: Boolean(document.querySelector(".robotaxi-operation-panel")),
      hasSelectedSummary: Boolean(document.querySelector(".robotaxi-selected-card")),
      hasOldFocusBlock: Boolean(document.querySelector(".robotaxi-focus-block")),
      visibleText: document.querySelector(".robotaxi-operation-panel")?.innerText || "",
      bodyText: document.body.innerText.slice(0, 600),
      labelWidths: Array.from(document.querySelectorAll(".robotaxi-summary-item span")).map((node) => ({
        text: node.innerText,
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
      })),
    })`,
    returnByValue: true,
  });
  socket.close();
  const state = JSON.parse(result.result?.result?.value || "{}");
  assert.equal(state.hasPanel, true, `Robotaxi 页面缺少运营概览区域：${state.bodyText}`);
  assert.equal(state.hasSelectedSummary, true, "Robotaxi 页面未使用当前选中统一概览结构");
  assert.equal(state.hasOldFocusBlock, false, "Robotaxi 页面仍存在旧卡片式焦点块");
  ["当前 Robotaxi", "当前位置", "当前占用", "运维状态", "排队", "可触发"].forEach((text) => {
    assert.match(state.visibleText, new RegExp(text), `Robotaxi 概览缺少字段：${text}`);
  });
  const truncatedLabels = (state.labelWidths || []).filter((item) => item.scrollWidth > item.clientWidth + 1);
  assert.equal(truncatedLabels.length, 0, `Robotaxi 概览标签被截断：${JSON.stringify(truncatedLabels)}`);
  console.log(`v040.17 Robotaxi 浏览器布局验证通过 ${viewport}`);
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
      if (page?.webSocketDebuggerUrl) return page.webSocketUrl || page.webSocketDebuggerUrl;
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
