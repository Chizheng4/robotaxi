import assert from "node:assert/strict";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { closeManagedBrowser, createBoundedCdpSender } from "./browser-process-lifecycle.mjs";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const targetUrl = process.env.ROBOTAXI_BROWSER_VERIFY_URL || "http://127.0.0.1:4173/?verifyBrowserLoad=1";
const profileDir = `/private/tmp/robotaxi-visit-browser-${Date.now()}`;
assert(fs.existsSync(chromePath), "未找到 Google Chrome");

const chrome = spawn(chromePath, [
  "--headless=new",
  "--no-first-run",
  "--disable-gpu",
  "--hide-scrollbars",
  "--remote-debugging-port=0",
  `--user-data-dir=${profileDir}`,
  "--window-size=1280,844",
  targetUrl,
], { stdio: ["ignore", "ignore", "pipe"] });

let stderr = "";
let socket;
try {
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
  const pageUrl = await waitForPageWebSocketUrl(devtoolsUrl, targetUrl);
  socket = new WebSocket(pageUrl);
  let nextId = 1;
  const pending = new Map();
  const exceptions = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
      return;
    }
    if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params?.exceptionDetails?.exception?.description || message.params?.exceptionDetails?.text);
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const send = createBoundedCdpSender(socket, pending, () => nextId++);
  await send("Runtime.enable");
  await send("Page.enable");
  await delay(2500);

  await evaluate(send, `(() => {
    sessionStorage.clear();
    localStorage.clear();
    document.cookie = "xingbuild_visit_excluded=; Path=/; Max-Age=0";
    location.reload();
  })()`);
  await delay(1800);
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await delay(250);
  await submitLogin(send, "访问");
  await delay(300);
  let state = await evaluate(send, `JSON.stringify({
    modal: Boolean(document.querySelector(".visitor-password-modal-root")),
    inputFont: getComputedStyle(document.querySelector("#visitor-record-password")).fontSize,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  })`);
  state = JSON.parse(state);
  assert(state.modal, "访问密码弹框未打开");
  assert.equal(state.inputFont, "16px");
  assert.equal(state.overflow, 0);

  await setReactInput(send, "#visitor-record-password", "金星");
  await evaluate(send, `document.querySelector(".visitor-password-form")?.requestSubmit()`);
  await delay(500);
  state = JSON.parse(await evaluate(send, `JSON.stringify({
    title: document.querySelector("#visitor-records-title")?.textContent?.trim(),
    ranges: [...document.querySelectorAll('[aria-label="站点范围"] button')].map((node) => node.textContent.trim()),
    periods: [...document.querySelectorAll('[aria-label="查看周期"] button')].map((node) => node.textContent.trim()),
    summary: [...document.querySelectorAll(".visitor-records-summary span")].map((node) => node.textContent.trim()),
    excludeButton: [...document.querySelectorAll(".visitor-records-header-actions button")].some((node) => node.textContent.includes("本设备不计入")),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  })`));
  assert.equal(state.title, "访问概览");
  assert.deepEqual(state.ranges, ["全部", "xingbuild 网站", "Robotaxi 运营平台"]);
  assert.deepEqual(state.periods, ["近 24 小时", "近 7 日", "近 30 日"]);
  assert.deepEqual(state.summary, ["有效访问", "匿名访客", "最近访问"]);
  assert(state.excludeButton);
  assert.equal(state.overflow, 0);

  state = JSON.parse(await evaluate(send, `JSON.stringify({
    viewport: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    panelRight: document.querySelector(".visitor-records-panel")?.getBoundingClientRect().right,
    actionsRight: document.querySelector(".visitor-records-header-actions")?.getBoundingClientRect().right
  })`));
  assert.equal(state.viewport, 390);
  assert.equal(state.overflow, 0);
  assert(state.panelRight <= 390 && state.actionsRight <= 390, `手机布局超出视口：${JSON.stringify(state)}`);

  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 844, deviceScaleFactor: 1, mobile: false });
  await delay(250);
  state = JSON.parse(await evaluate(send, `JSON.stringify({
    viewport: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    panelRight: document.querySelector(".visitor-records-panel")?.getBoundingClientRect().right
  })`));
  assert.equal(state.viewport, 1280);
  assert.equal(state.overflow, 0);
  assert(state.panelRight <= 1280, `桌面布局超出视口：${JSON.stringify(state)}`);
  await evaluate(send, `sessionStorage.clear(); location.reload()`);
  await delay(1500);
  await submitLogin(send, "金星");
  await delay(700);
  state = JSON.parse(await evaluate(send, `JSON.stringify({
    workbench: Boolean(document.querySelector(".workbench")),
    qaRecordCount: JSON.parse(localStorage.getItem("robotaxi.public.qualified.visits.v1") || "[]").length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  })`));
  assert(state.workbench, "金星登录后工作台未加载");
  assert.equal(state.qaRecordCount, 0, "自动 QA 不得形成访问记录");
  assert.equal(state.overflow, 0);
  assert.deepEqual(exceptions, [], `页面存在运行时异常：${exceptions.join("；")}`);

  console.log("v049.13.17 访问概览桌面、390 手机、弹框与 QA 排除浏览器验证通过");
} finally {
  await closeManagedBrowser({ browser: chrome, socket, profileDir });
}

async function submitLogin(send, value) {
  await setReactInput(send, ".platform-login-form input", value);
  await evaluate(send, `document.querySelector(".platform-login-form")?.requestSubmit()`);
}

async function setReactInput(send, selector, value) {
  const result = await evaluate(send, `(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    if (!input) return false;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  })()`);
  assert(result, `未找到输入框：${selector}`);
}

async function evaluate(send, expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.result?.exceptionDetails) throw new Error(result.result.exceptionDetails.text);
  return result.result?.result?.value;
}

async function waitForPageWebSocketUrl(devtoolsUrl, expectedUrl) {
  const endpoint = new URL("/json/list", devtoolsUrl.replace(/^ws:/, "http:"));
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const pages = await fetch(endpoint).then((response) => response.json()).catch(() => []);
    const page = pages.find((item) => item.type === "page" && item.url.startsWith(expectedUrl.split("?")[0]));
    if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    await delay(100);
  }
  throw new Error("未找到 Robotaxi 页面调试目标");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
