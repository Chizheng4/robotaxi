import assert from "node:assert/strict";
import fs from "node:fs";
import { spawn } from "node:child_process";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const targetUrl = process.env.ROBOTAXI_BROWSER_VERIFY_URL || "http://127.0.0.1:4173/?verifyBrowserLoad=1";
const viewport = process.env.ROBOTAXI_BROWSER_VIEWPORT || "1280,720";
const mobileAssertionEnabled = process.env.ROBOTAXI_BROWSER_ASSERT_MOBILE === "1";
const mapAssertionEnabled = process.env.ROBOTAXI_BROWSER_ASSERT_MAP === "1";
const planningAssertionEnabled = process.env.ROBOTAXI_BROWSER_ASSERT_PLANNING === "1";
const publicDemoAssertionEnabled = process.env.ROBOTAXI_BROWSER_ASSERT_PUBLIC_DEMO === "1";
const businessTargetAssertionEnabled = process.env.ROBOTAXI_BROWSER_ASSERT_BUSINESS_TARGET === "1";
const operatingOverviewAssertionEnabled = process.env.ROBOTAXI_BROWSER_ASSERT_OPERATING_OVERVIEW === "1";
const metricDetailsAssertionEnabled = process.env.ROBOTAXI_BROWSER_ASSERT_METRIC_DETAILS === "1";
const operatingModelAssertionEnabled = process.env.ROBOTAXI_BROWSER_ASSERT_OPERATING_MODEL === "1";
const screenshotPath = process.env.ROBOTAXI_BROWSER_SCREENSHOT || "";
const [viewportWidth, viewportHeight] = viewport.split(",").map(Number);
const browserWindowSize = planningAssertionEnabled && mobileAssertionEnabled ? "1440,900" : viewport;

assert(fs.existsSync(chromePath), "未找到 Google Chrome，无法执行真实浏览器白屏检查");

const chrome = spawn(chromePath, [
  "--headless=new",
  "--no-first-run",
  "--disable-gpu",
  "--hide-scrollbars",
  "--remote-debugging-port=0",
  `--user-data-dir=/private/tmp/robotaxi-browser-load-${Date.now()}`,
  `--window-size=${browserWindowSize}`,
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

  const clickElementCenter = async (selector, text = null) => {
    const result = await send("Runtime.evaluate", {
      expression: `(() => {
        const nodes = [...document.querySelectorAll(${JSON.stringify(selector)})];
        const target = ${text === null ? "nodes[0]" : `nodes.find((node) => node.textContent.trim() === ${JSON.stringify(text)})`};
        const rect = target?.getBoundingClientRect();
        return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null;
      })()`,
      returnByValue: true,
    });
    const point = result.result?.result?.value;
    assert(point, `未找到可点击元素：${selector}${text ? ` / ${text}` : ""}`);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
  };

  await send("Runtime.enable");
  await send("Log.enable");
  await send("Page.enable");
  if (mobileAssertionEnabled && !planningAssertionEnabled) {
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
  assert(entryState.hasLogin || entryState.hasWorkbench, `页面既未渲染登录入口也未渲染工作台：${JSON.stringify({ ...entryState, exceptions, messages })}`);
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

  if (publicDemoAssertionEnabled) {
    await delay(1200);
    const publicDemoResult = await send("Runtime.evaluate", {
      expression: `window.__robotaxiPublicDemoState || null`,
      returnByValue: true,
    });
    const publicDemoState = publicDemoResult.result?.result?.value;
    assert(publicDemoState?.forecastResultCount > 0, `线上演示引导必须自动生成需求预测结果：${JSON.stringify(publicDemoState)}`);
    assert(publicDemoState?.shortTermForecastResultCount > 0, `线上演示引导必须自动生成短期需求预测结果：${JSON.stringify(publicDemoState)}`);
    assert(publicDemoState?.simulationStatuses?.some((status) => status !== "READY"), `线上演示引导必须自动启动模拟运行：${JSON.stringify(publicDemoState)}`);
  }

  if (businessTargetAssertionEnabled) {
    const clickMenuLabel = async (label) => {
      const result = await send("Runtime.evaluate", {
        expression: `(() => {
          const node = [...document.querySelectorAll(".ant-menu-title-content")].find((item) => item.textContent.trim() === ${JSON.stringify(label)});
          const target = node?.closest(".ant-menu-item, .ant-menu-submenu-title");
          target?.click();
          return Boolean(target);
        })()`,
        returnByValue: true,
      });
      assert(result.result?.result?.value, `未找到菜单：${label}`);
      await delay(250);
    };
    await clickMenuLabel("经营规划");
    await clickMenuLabel("经营目标");
    await delay(800);
    const targetPageResult = await send("Runtime.evaluate", {
      expression: `JSON.stringify({
        hasPage: Boolean(document.querySelector('[data-page="businessTargets"]')),
        hasTable: Boolean(document.querySelector('.record-table-section')),
        bodyText: document.body?.innerText?.slice(0, 500) || ''
      })`,
      returnByValue: true,
    });
    const targetPage = JSON.parse(targetPageResult.result?.result?.value || "{}");
    assert(targetPage.hasPage && targetPage.hasTable, `经营目标页面加载失败：${JSON.stringify({ ...targetPage, exceptions, messages })}`);
  }

  if (operatingModelAssertionEnabled) {
    if (mobileAssertionEnabled) {
      await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 844, deviceScaleFactor: 1, mobile: false });
      await send("Runtime.evaluate", { expression: `document.querySelector('[aria-label="展开菜单"]')?.click()`, returnByValue: true });
      await delay(250);
    }
    const clickMenuLabel = async (label) => {
      const result = await send("Runtime.evaluate", {
        expression: `(() => {
          const node = [...document.querySelectorAll(".ant-menu-title-content")].find((item) => item.textContent.trim() === ${JSON.stringify(label)});
          const target = node?.closest(".ant-menu-item, .ant-menu-submenu-title");
          target?.click();
          return Boolean(target);
        })()`,
        returnByValue: true,
      });
      assert(result.result?.result?.value, `未找到菜单：${label}`);
      await delay(250);
    };
    await clickMenuLabel("经营规划");
    await clickMenuLabel("经营模型");
    if (mobileAssertionEnabled) {
      await send("Emulation.setDeviceMetricsOverride", { width: viewportWidth, height: viewportHeight, deviceScaleFactor: 1, mobile: true });
      await delay(350);
    }
    await delay(700);
    const modelResult = await send("Runtime.evaluate", {
      expression: `JSON.stringify({
        hasPanel: Boolean(document.querySelector('.operating-model-panel')),
        domainNames: [...document.querySelectorAll('.operating-model-domain h3')].map((node) => node.textContent.trim()),
        detailHidden: Boolean(document.querySelector('.workbench.detail-hidden')),
        documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        panelOverflow: (() => { const node = document.querySelector('.operating-model-panel'); return node ? node.scrollWidth - node.clientWidth : null; })()
      })`,
      returnByValue: true,
    });
    const modelState = JSON.parse(modelResult.result?.result?.value || "{}");
    assert(modelState.hasPanel, `经营模型页面加载失败：${JSON.stringify({ modelState, exceptions, messages })}`);
    assert.deepEqual(modelState.domainNames, ["需求", "供给", "服务", "资产", "财务", "经营反馈"]);
    assert(modelState.detailHidden, "经营模型分析画布不得混入对象详情面板");
    assert.equal(modelState.documentOverflow, 0, "经营模型不得产生页面级横向溢出");
    if (mobileAssertionEnabled) assert.equal(modelState.panelOverflow, 0, "手机经营模型不得产生内容横向溢出");
  }

  if (operatingOverviewAssertionEnabled) {
    if (mobileAssertionEnabled) {
      await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 844, deviceScaleFactor: 1, mobile: false });
      await send("Runtime.evaluate", { expression: `document.querySelector('[aria-label="展开菜单"]')?.click()`, returnByValue: true });
      await delay(250);
    }
    const clickMenuLabel = async (label) => {
      const result = await send("Runtime.evaluate", {
        expression: `(() => {
          const node = [...document.querySelectorAll(".ant-menu-title-content")].find((item) => item.textContent.trim() === ${JSON.stringify(label)});
          const target = node?.closest(".ant-menu-item, .ant-menu-submenu-title");
          target?.click();
          return Boolean(target);
        })()`,
        returnByValue: true,
      });
      assert(result.result?.result?.value, `未找到菜单：${label}`);
      await delay(250);
    };
    await clickMenuLabel("经营分析");
    await clickMenuLabel("经营总览");
    if (mobileAssertionEnabled) {
      await send("Emulation.setDeviceMetricsOverride", { width: viewportWidth, height: viewportHeight, deviceScaleFactor: 1, mobile: true });
      await delay(350);
    }
    await delay(800);
    const overviewResult = await send("Runtime.evaluate", {
      expression: `JSON.stringify({
        hasPage: Boolean(document.querySelector('[data-page="operatingMetricsOverview"]')),
        hasAnalysis: Boolean(document.querySelector('.metric-experience-panel')),
        hasSharedViewport: Boolean(document.querySelector('.analysis-content-viewport')),
        detailHidden: Boolean(document.querySelector('.workbench.detail-hidden')),
        documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        analysisOverflow: (() => { const node = document.querySelector('.metric-analysis-page'); return node ? node.scrollWidth - node.clientWidth : null; })(),
        overflowCandidates: (() => {
          const root = document.querySelector('.metric-analysis-page');
          if (!root) return [];
          return [...root.querySelectorAll('*')].map((node) => ({ className: String(node.className || '').slice(0, 100), overflow: node.scrollWidth - node.clientWidth, width: Math.round(node.getBoundingClientRect().width) })).filter((item) => item.overflow > 1).sort((a, b) => b.overflow - a.overflow).slice(0, 8);
        })(),
        bodyText: document.body?.innerText?.slice(0, 500) || ''
      })`,
      returnByValue: true,
    });
    const overview = JSON.parse(overviewResult.result?.result?.value || "{}");
    assert(overview.hasAnalysis && exceptions.length === 0, `经营总览页面加载失败：${JSON.stringify({ ...overview, exceptions, messages })}`);
    assert(overview.hasSharedViewport, "经营总览必须接入统一分析内容视口");
    assert(overview.detailHidden, "经营总览不得混入对象详情栏");
    assert.equal(overview.documentOverflow, 0, "经营总览不得产生页面级横向溢出");
    if (mobileAssertionEnabled) assert(overview.analysisOverflow <= 1, `手机经营总览不得产生内容横向溢出：${JSON.stringify(overview.overflowCandidates)}`);
  }

  if (metricDetailsAssertionEnabled) {
    if (mobileAssertionEnabled) {
      await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 844, deviceScaleFactor: 1, mobile: false });
      await send("Runtime.evaluate", { expression: `document.querySelector('[aria-label="展开菜单"]')?.click()`, returnByValue: true });
      await delay(250);
    }
    const clickMenuLabel = async (label) => {
      const result = await send("Runtime.evaluate", {
        expression: `(() => {
          const node = [...document.querySelectorAll(".ant-menu-title-content")].find((item) => item.textContent.trim() === ${JSON.stringify(label)});
          const target = node?.closest(".ant-menu-item, .ant-menu-submenu-title");
          target?.click();
          return Boolean(target);
        })()`,
        returnByValue: true,
      });
      assert(result.result?.result?.value, `未找到菜单：${label}`);
      await delay(250);
    };
    await clickMenuLabel("经营分析");
    await clickMenuLabel("数据计算");
    await clickMenuLabel("指标定义");
    await delay(600);
    await clickElementCenter(".record-table-section tbody tr");
    if (mobileAssertionEnabled) {
      await send("Emulation.setDeviceMetricsOverride", { width: viewportWidth, height: viewportHeight, deviceScaleFactor: 1, mobile: true });
      await delay(800);
      const mobileRowPointResult = await send("Runtime.evaluate", {
        expression: `(() => { const rect = document.querySelector(".record-table-section tbody tr")?.getBoundingClientRect(); return rect ? { x: Math.max(8, rect.left + 24), y: rect.top + rect.height / 2 } : null; })()`,
        returnByValue: true,
      });
      const mobileRowPoint = mobileRowPointResult.result?.result?.value;
      assert(mobileRowPoint, "手机指标定义列表必须存在可选择记录");
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: mobileRowPoint.x, y: mobileRowPoint.y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: mobileRowPoint.x, y: mobileRowPoint.y, button: "left", clickCount: 1 });
    }
    await delay(500);
    const metricDetailResult = await send("Runtime.evaluate", {
      expression: `JSON.stringify({
        tabLabels: [...document.querySelectorAll('.detail-tabs .ant-tabs-tab')].map((node) => node.textContent.trim()),
        bodyText: document.body?.innerText || ''
      })`,
      returnByValue: true,
    });
    const metricDetail = JSON.parse(metricDetailResult.result?.result?.value || "{}");
    assert.deepEqual(metricDetail.tabLabels, ["基础定义", "业务口径", "计算逻辑", "质量规则", "字段解释"], `指标定义详情未接入统一分组：${JSON.stringify(metricDetail)}`);
    assert(!metricDetail.bodyText.includes("指标英文名"), "指标定义详情不得显示英文指标名");
    assert.equal(exceptions.length, 0, `指标详情存在运行异常：${JSON.stringify(exceptions)}`);
  }

  if (planningAssertionEnabled) {
    const clickMenuItem = async (label) => {
      const clickResult = await send("Runtime.evaluate", {
        expression: `(() => {
          const labels = [...document.querySelectorAll(".ant-menu-title-content")].filter((node) => node.textContent.trim() === ${JSON.stringify(label)});
          const target = labels[0]?.closest(".ant-menu-item, .ant-menu-submenu-title");
          target?.click();
          return { count: labels.length, clicked: Boolean(target) };
        })()`,
        returnByValue: true,
      });
      const value = clickResult.result?.result?.value;
      assert.equal(value?.count, 1, `菜单 ${label} 必须唯一存在`);
      assert(value?.clicked, `菜单 ${label} 必须可以点击`);
      await delay(180);
    };
    await clickMenuItem("经营规划");
    await clickMenuItem("需求预测");
    await clickMenuItem("预测策略");
    await clickElementCenter(".row-action-menu-trigger");
    await delay(500);
    await clickElementCenter(".ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item", "执行");
    await delay(1500);
    if (mobileAssertionEnabled) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: viewportWidth,
        height: viewportHeight,
        deviceScaleFactor: 1,
        mobile: true,
      });
      await delay(300);
    }
    await send("Runtime.evaluate", {
      expression: `(() => {
        const chart = document.querySelector(".data-chart svg");
        const rect = chart?.getBoundingClientRect();
        if (!chart || !rect) return false;
        chart.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: rect.left + rect.width * 0.45, clientY: rect.top + rect.height * 0.45, pointerType: "mouse" }));
        return true;
      })()`,
      returnByValue: true,
    });
    await delay(120);
    const planningResult = await send("Runtime.evaluate", {
      expression: `(() => {
        const analysis = document.querySelector(".forecast-analysis");
        const summary = [...document.querySelectorAll(".analysis-summary-card")].map((node) => ({ label: node.querySelector("span")?.textContent, value: node.querySelector("strong")?.textContent }));
        const production = summary.find((item) => item.label === "计划生产数量");
        return {
          analysis: Boolean(analysis),
          url: location.href,
          hasWorkbench: Boolean(document.querySelector(".workbench")),
          bodyText: document.body?.innerText?.slice(0, 800) || "",
          pageTitle: document.querySelector(".page-title-block strong")?.textContent || document.querySelector(".platform-title-copy strong")?.textContent || "",
          visibleMessages: [...document.querySelectorAll(".ant-message-notice, .record-event-section")].map((node) => node.textContent.trim()).slice(0, 4),
          forecastRunRows: document.querySelectorAll('[data-page="longTermDemandForecastRuns"] tbody tr').length,
          chartCount: document.querySelectorAll(".data-chart").length,
          chartRowCount: document.querySelectorAll(".forecast-trend-grid").length,
          axisLabelCount: document.querySelectorAll(".data-chart-axis-label").length,
          tooltipVisible: Boolean(document.querySelector(".data-chart-tooltip")),
          chartScrollable: [...document.querySelectorAll(".data-chart-scroll")].some((node) => node.scrollWidth > node.clientWidth),
          hasDetailPanel: Boolean(document.querySelector(".object-inspector")),
          productionQuantity: Number(String(production?.value || "0").replaceAll(",", "")),
          horizontalOverflow: analysis ? analysis.scrollWidth - analysis.clientWidth : null,
        };
      })()`,
      returnByValue: true,
    });
    const planning = planningResult.result?.result?.value;
    assert(planning?.analysis, `策略执行后必须进入预测结果分析画布：${JSON.stringify({ ...planning, exceptions, messages })}`);
    assert.equal(planning.chartCount, 4, "预测结果必须展示需求、累计需求、生产交付和累计供给四张图");
    assert.equal(planning.chartRowCount, 2, "需求和供给各自使用独立纵向图表区域");
    assert(planning.axisLabelCount > 8, "预测趋势必须展示完整的周期刻度");
    assert(planning.tooltipVisible, "鼠标经过趋势图必须显示时间、指标和数值");
    if (mobileAssertionEnabled) assert(planning.chartScrollable, "窄屏长周期必须在图表内部横向浏览");
    assert.equal(planning.hasDetailPanel, false, "分析结果不得混入对象详情面板");
    assert(planning.productionQuantity > 0, "真实增长与缺口必须形成大于零的计划生产数量");
    assert.equal(planning.horizontalOverflow, 0, "预测分析画布不得产生整体横向溢出");
  }

  await send("Runtime.evaluate", { expression: `document.querySelector(".platform-user-trigger")?.click()`, returnByValue: true });
  await delay(100);
  await send("Runtime.evaluate", {
    expression: `[...document.querySelectorAll(".platform-account-action")].find((node) => node.textContent.trim() === "项目 README")?.click()`,
    returnByValue: true,
  });
  await delay(350);
  const readmePanelResult = await send("Runtime.evaluate", {
    expression: `(() => {
      const panel = document.querySelector(".project-readme-panel");
      const scroll = document.querySelector(".project-readme-scroll");
      const rect = panel?.getBoundingClientRect();
      const diagrams = [...(panel?.querySelectorAll(".project-readme-diagram svg") || [])];
      return { visible: Boolean(panel), hasTitle: Boolean(panel?.textContent.includes("Robotaxi 城市运营模拟平台")), scrollable: Boolean(scroll && scroll.scrollHeight > scroll.clientHeight), withinViewport: Boolean(rect && rect.left >= 0 && rect.right <= window.innerWidth + 1 && rect.top >= 0 && rect.bottom <= window.innerHeight + 1), diagramCount: diagrams.length, diagramsRendered: diagrams.every((diagram) => diagram.getBoundingClientRect().width > 0 && diagram.querySelectorAll("rect").length > 1), rawMermaidHidden: !panel?.textContent.includes("flowchart TB") };
    })()`,
    returnByValue: true,
  });
  const readmePanel = readmePanelResult.result?.result?.value;
  assert(readmePanel?.visible && readmePanel?.hasTitle && readmePanel?.scrollable && readmePanel?.withinViewport && readmePanel?.diagramCount >= 10 && readmePanel?.diagramsRendered && readmePanel?.rawMermaidHidden, `项目 README 浮层必须可读、可滚动并直接渲染结构图：${JSON.stringify(readmePanel)}`);
  await send("Runtime.evaluate", { expression: `document.querySelector('.project-readme-panel [aria-label="关闭项目说明"]')?.click()`, returnByValue: true });
  await delay(100);

  if (mapAssertionEnabled) {
    const initialMapState = await send("Runtime.evaluate", {
      expression: `({ detailCollapsed: document.querySelector(".workbench")?.classList.contains("detail-collapsed") })`,
      returnByValue: true,
    });
    assert(initialMapState.result?.result?.value?.detailCollapsed, "进入中控台时详情必须默认收起");
    const cellPointResult = await send("Runtime.evaluate", {
      expression: `(() => {
        const svg = document.querySelector(".zone-canvas-new");
        const scene = svg?.querySelector("g[transform]");
        if (!svg || !scene) return null;
        const point = svg.createSVGPoint();
        point.x = ${mobileAssertionEnabled ? 14.5 : 40.5};
        point.y = 20.5;
        const screenPoint = point.matrixTransform(scene.getScreenCTM());
        return { x: screenPoint.x, y: screenPoint.y, hitClass: document.elementFromPoint(screenPoint.x, screenPoint.y)?.getAttribute("class") || "" };
      })()`,
      returnByValue: true,
    });
    const cellPoint = cellPointResult.result?.result?.value;
    assert(cellPoint && /map-ground|zone-canvas-new/.test(cellPoint.hitClass), `Cell 必须可以通过真实命中层选择：${JSON.stringify(cellPoint)}`);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: cellPoint.x, y: cellPoint.y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: cellPoint.x, y: cellPoint.y, button: "left", clickCount: 1 });
    await delay(250);
    const selectedCellResult = await send("Runtime.evaluate", {
      expression: `({ selected: document.querySelectorAll(".map-selected-cell").length, expanded: !document.querySelector(".workbench")?.classList.contains("detail-collapsed") })`,
      returnByValue: true,
    });
    assert.equal(selectedCellResult.result?.result?.value?.selected, 1, "真实点击 Cell 后必须显示唯一选中框");
    assert.equal(selectedCellResult.result?.result?.value?.expanded, false, "真实点击空白 Cell 后详情必须保持收起");

    const blankPointResult = await send("Runtime.evaluate", {
      expression: `(() => {
        const svg = document.querySelector(".zone-canvas-new")?.getBoundingClientRect();
        const ground = document.querySelector(".map-ground")?.getBoundingClientRect();
        if (!svg || !ground) return null;
        const above = ground.top - svg.top > 8;
        return { x: svg.left + svg.width / 2, y: above ? ground.top - 4 : ground.bottom + 4 };
      })()`,
      returnByValue: true,
    });
    const blankPoint = blankPointResult.result?.result?.value;
    assert(blankPoint, "地图必须保留边界外画布留白");
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: blankPoint.x, y: blankPoint.y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: blankPoint.x, y: blankPoint.y, button: "left", clickCount: 1 });
    await delay(150);
    const collapsedAfterInitialBlank = await send("Runtime.evaluate", {
      expression: `document.querySelector(".workbench")?.classList.contains("detail-collapsed")`,
      returnByValue: true,
    });
    assert(collapsedAfterInitialBlank.result?.result?.value, "点击地图边界外留白后详情必须收起");
    if (!mobileAssertionEnabled) {
      const hoverTriggerResult = await send("Runtime.evaluate", {
        expression: `(() => {
          const place = document.querySelector(".map-place-object rect");
          if (!place) return null;
          const placeRect = place.getBoundingClientRect();
          const x = placeRect.left + placeRect.width / 2;
          const y = placeRect.top + placeRect.height / 2;
          const hit = document.elementFromPoint(x, y);
          return { x, y, hitClass: hit?.getAttribute("class") || hit?.parentElement?.getAttribute("class") || "" };
        })()`,
        returnByValue: true,
      });
      const hoverPoint = hoverTriggerResult.result?.result?.value;
      assert(hoverPoint && hoverPoint.hitClass.includes("map-place"), `地图地点必须处于真实鼠标命中层：${JSON.stringify(hoverPoint)}`);
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: hoverPoint.x, y: hoverPoint.y });
      await delay(100);
      const hoverVisibleResult = await send("Runtime.evaluate", {
        expression: `Boolean(document.querySelector(".map-hover-card"))`,
        returnByValue: true,
      });
      assert(hoverVisibleResult.result?.result?.value, "桌面地点悬浮摘要必须可用");
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: hoverPoint.x, y: hoverPoint.y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: hoverPoint.x, y: hoverPoint.y, button: "left", clickCount: 1 });
      await delay(150);
      const placeSelectionResult = await send("Runtime.evaluate", {
        expression: `(() => {
          const simple = document.querySelector(".object-inspector-content .compact-descriptions")?.getBoundingClientRect();
          return {
            selectedCells: document.querySelectorAll(".map-selected-cell").length,
            simpleLeft: simple?.left || null,
          };
        })()`,
        returnByValue: true,
      });
      assert.equal(placeSelectionResult.result?.result?.value?.selectedCells, 1, "点击地点后必须保留精确 Cell 选中框");
      const simpleLeft = placeSelectionResult.result?.result?.value?.simpleLeft;
      assert(simpleLeft, "语义详情必须显示基础字段");
      const relationTabResult = await send("Runtime.evaluate", {
        expression: `(() => {
          const tab = [...document.querySelectorAll(".detail-tabs .ant-tabs-tab")].find((item) => item.textContent.trim() === "关联与结构");
          tab?.click();
          return Boolean(tab);
        })()`,
        returnByValue: true,
      });
      assert(relationTabResult.result?.result?.value, "复杂字段必须进入统一关联与结构页签");
      await delay(100);
      const complexAlignmentResult = await send("Runtime.evaluate", {
        expression: `document.querySelector(".object-inspector-content .detail-block-list")?.getBoundingClientRect().left || null`,
        returnByValue: true,
      });
      assert(Math.abs(simpleLeft - complexAlignmentResult.result?.result?.value) <= 1, "详情跨页签内容必须共享统一左侧基线");
      for (const [label, mapX, mapY, expectedClass] of [
        ["道路", 14.5, 12.5, "map-road-cells"],
        ["服务区域", 18.5, 12.5, "service-area-cell"],
      ]) {
        const objectPointResult = await send("Runtime.evaluate", {
          expression: `(() => {
            const svg = document.querySelector(".zone-canvas-new");
            const scene = svg?.querySelector("g[transform]");
            if (!svg || !scene) return null;
            const point = svg.createSVGPoint();
            point.x = ${mapX};
            point.y = ${mapY};
            const screenPoint = point.matrixTransform(scene.getScreenCTM());
            const hit = document.elementFromPoint(screenPoint.x, screenPoint.y);
            return { x: screenPoint.x, y: screenPoint.y, hitClass: hit?.getAttribute("class") || "" };
          })()`,
          returnByValue: true,
        });
        const objectPoint = objectPointResult.result?.result?.value;
        assert(objectPoint?.hitClass.includes(expectedClass), `${label}必须处于真实鼠标命中层：${JSON.stringify(objectPoint)}`);
        await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: objectPoint.x, y: objectPoint.y });
        await delay(80);
        const objectHoverResult = await send("Runtime.evaluate", {
          expression: `Boolean(document.querySelector(".map-hover-card"))`,
          returnByValue: true,
        });
        assert(objectHoverResult.result?.result?.value, `桌面${label}悬浮摘要必须可用`);
      }
      await send("Runtime.evaluate", {
        expression: `document.querySelector(".detail-panel-new .panel-title button")?.click()`,
        returnByValue: true,
      });
      await delay(150);
    }
    const robotaxiPointResult = await send("Runtime.evaluate", {
      expression: `(() => {
        const robotaxi = document.querySelector(".robotaxi-map-object");
        const halo = robotaxi?.querySelector(".robotaxi-map-halo")?.getBoundingClientRect();
        if (!robotaxi || !halo) return null;
        const x = halo.left + halo.width / 2;
        const y = halo.top + halo.height / 2;
        const hit = document.elementFromPoint(x, y);
        return { x, y, hitClass: hit?.getAttribute("class") || "", parentClass: hit?.parentElement?.getAttribute("class") || "" };
      })()`,
      returnByValue: true,
    });
    const robotaxiPoint = robotaxiPointResult.result?.result?.value;
    assert(robotaxiPoint && `${robotaxiPoint.hitClass} ${robotaxiPoint.parentClass}`.includes("robotaxi-map-object"), `Robotaxi 必须处于真实点击命中层：${JSON.stringify(robotaxiPoint)}`);
    if (mobileAssertionEnabled) {
      await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: robotaxiPoint.x, y: robotaxiPoint.y }] });
      await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: robotaxiPoint.x, y: robotaxiPoint.y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: robotaxiPoint.x, y: robotaxiPoint.y, button: "left", clickCount: 1 });
    }
    await delay(250);
    if (mobileAssertionEnabled) {
      const touchSummaryResult = await send("Runtime.evaluate", {
        expression: `(() => {
          const card = document.querySelector(".map-hover-card.touch");
          const action = card?.querySelector(".map-hover-detail-action");
          const rect = card?.getBoundingClientRect();
          const withinViewport = Boolean(rect && rect.left >= 0 && rect.right <= window.innerWidth + 1 && rect.top >= 0 && rect.bottom <= window.innerHeight + 1);
          action?.click();
          return { visible: Boolean(card), action: Boolean(action), withinViewport };
        })()`,
        returnByValue: true,
      });
      const touchSummary = touchSummaryResult.result?.result?.value;
      assert(touchSummary?.visible && touchSummary?.action && touchSummary?.withinViewport, `手机对象摘要必须自适应可视区域：${JSON.stringify(touchSummary)}`);
      await delay(250);
    }
    const openBeforeClearResult = await send("Runtime.evaluate", {
      expression: `!document.querySelector(".workbench")?.classList.contains("detail-collapsed")`,
      returnByValue: true,
    });
    assert(openBeforeClearResult.result?.result?.value, "对象点击后详情必须处于展开状态");
    if (!mobileAssertionEnabled) {
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: blankPoint.x, y: blankPoint.y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: blankPoint.x, y: blankPoint.y, button: "left", clickCount: 1 });
      await delay(150);
      const collapsedAfterClearResult = await send("Runtime.evaluate", {
        expression: `document.querySelector(".workbench")?.classList.contains("detail-collapsed")`,
        returnByValue: true,
      });
      assert(collapsedAfterClearResult.result?.result?.value, "真实点击地图边界外留白后详情必须收起");
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: robotaxiPoint.x, y: robotaxiPoint.y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: robotaxiPoint.x, y: robotaxiPoint.y, button: "left", clickCount: 1 });
      await delay(150);
    }
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
      detailCollapsed: document.querySelector(".workbench")?.classList.contains("detail-collapsed"),
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
  if (mapAssertionEnabled && !mobileAssertionEnabled && !screenshotPath) {
    for (const label of ["运营管理", "运维支持", "运维策略管理", "运维策略配置"]) {
      await send("Runtime.evaluate", {
        expression: `(() => { const node = [...document.querySelectorAll(".ant-menu-title-content")].find((item) => item.textContent.trim() === ${JSON.stringify(label)}); (node?.closest(".ant-menu-submenu-title") || node)?.click(); })()`,
        returnByValue: true,
      });
      await delay(80);
    }
    await delay(250);
    const listInitialState = await send("Runtime.evaluate", {
      expression: `({ collapsed: document.querySelector(".workbench")?.classList.contains("detail-collapsed"), actionWidth: document.querySelector("th.ant-table-cell-fix-right")?.getBoundingClientRect().width || 0 })`,
      returnByValue: true,
    });
    assert(listInitialState.result?.result?.value?.collapsed, "首次进入无选择列表页时详情必须默认收起");
    assert(listInitialState.result?.result?.value?.actionWidth <= 140, `固定操作列必须保持紧凑：${JSON.stringify(listInitialState.result?.result?.value)}`);
    await clickElementCenter(".row-action-menu-trigger");
    await delay(120);
    const actionOnlyState = await send("Runtime.evaluate", {
      expression: `({ collapsed: document.querySelector(".workbench")?.classList.contains("detail-collapsed"), selectedRows: document.querySelectorAll(".active-table-row").length })`,
      returnByValue: true,
    });
    assert(actionOnlyState.result?.result?.value?.collapsed, "点击行内功能不得展开详情");
    assert.equal(actionOnlyState.result?.result?.value?.selectedRows, 0, "点击行内功能不得选中表格记录");
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
    const rowPointResult = await send("Runtime.evaluate", {
      expression: `(() => { const rect = document.querySelector(".ant-table-tbody tr")?.getBoundingClientRect(); return rect ? { x: rect.left + 40, y: rect.top + rect.height / 2 } : null; })()`,
      returnByValue: true,
    });
    const rowPoint = rowPointResult.result?.result?.value;
    assert(rowPoint, "运维策略列表必须存在可选择记录");
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: rowPoint.x, y: rowPoint.y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rowPoint.x, y: rowPoint.y, button: "left", clickCount: 1 });
    await delay(150);
    const selectedListState = await send("Runtime.evaluate", {
      expression: `({ expanded: !document.querySelector(".workbench")?.classList.contains("detail-collapsed"), menuTrigger: Boolean(document.querySelector(".row-action-menu-trigger")), actionText: document.querySelector(".row-action-cell")?.textContent?.trim() || "" })`,
      returnByValue: true,
    });
    assert(selectedListState.result?.result?.value?.expanded, "点击列表记录后详情必须自动展开");
    assert(selectedListState.result?.result?.value?.menuTrigger, `多动作记录必须显示统一下拉操作控件：${JSON.stringify(selectedListState.result?.result?.value)}`);
  }
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
    assert.equal(pageState.selectedCellCount, 1, `点击业务对象后必须同时保留唯一 Cell 选中框：${JSON.stringify(pageState)}`);
    assert.equal(pageState.selectedRobotaxiCount, 1, `点击 Robotaxi 后必须切换到唯一车辆详情：${JSON.stringify(pageState)}`);
    assert(pageState.robotaxiInspectorVisible, `Robotaxi 详情必须显示专用运营摘要：${JSON.stringify(pageState)}`);
    assert(["基础信息", "资产事实", "任务状态", "位置上下文", "行驶记录"].every((label) => pageState.robotaxiDetailTabLabels.includes(label)), `Robotaxi 详情必须保留完整分类：${JSON.stringify(pageState)}`);
    assert.equal(pageState.detailCollapsed, false, `点击 Robotaxi 后详情必须自动展开：${JSON.stringify(pageState)}`);
    assert.equal(pageState.hoverCardVisible, !mobileAssertionEnabled, `桌面选中对象后应保留摘要，手机进入详情后应关闭摘要：${JSON.stringify(pageState)}`);
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
