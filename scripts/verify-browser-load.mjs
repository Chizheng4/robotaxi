import assert from "node:assert/strict";
import fs from "node:fs";
import { spawn } from "node:child_process";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const targetUrl = process.env.ROBOTAXI_BROWSER_VERIFY_URL || "http://127.0.0.1:4173/?verifyBrowserLoad=1";
const viewport = process.env.ROBOTAXI_BROWSER_VIEWPORT || "1280,720";
const mobileAssertionEnabled = process.env.ROBOTAXI_BROWSER_ASSERT_MOBILE === "1";
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

  const result = await send("Runtime.evaluate", {
    expression: `JSON.stringify({
      title: document.title,
      hasApp: Boolean(document.querySelector("#app")),
      hasWorkbench: Boolean(document.querySelector(".workbench")),
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      siderWidth: document.querySelector(".ops-sider")?.getBoundingClientRect().width || 0,
      bodyText: document.body.innerText.slice(0, 500)
    })`,
    returnByValue: true,
  });
  socket.close();

  const pageState = JSON.parse(result.result?.result?.value || "{}");
  assert(pageState.hasApp, `页面缺少 #app 容器：${JSON.stringify(pageState)}`);
  assert(pageState.hasWorkbench, `页面未渲染工作台主体，可能白屏：${JSON.stringify(pageState)}\n${exceptions.join("\n")}\n${messages.join("\n")}`);
  assert.equal(exceptions.length, 0, `浏览器运行时异常：${exceptions.join("\n")}`);
  if (mobileAssertionEnabled) {
    assert(pageState.viewportWidth <= 480, `手机验证视口未生效：${JSON.stringify(pageState)}`);
    assert(pageState.siderWidth <= 64, `手机首屏菜单未收起：${JSON.stringify(pageState)}`);
    assert(pageState.documentWidth <= pageState.viewportWidth + 1, `手机页面出现全局横向溢出：${JSON.stringify(pageState)}`);
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
