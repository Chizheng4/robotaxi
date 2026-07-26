import assert from "node:assert/strict";
import fs from "node:fs";

const browserVerificationSource = fs.readFileSync("scripts/verify-browser-load.mjs", "utf8");
const layoutVerificationSource = fs.readFileSync("scripts/verify-v040-17-robotaxi-layout-browser.mjs", "utf8");
const lifecycleSource = fs.readFileSync("scripts/browser-process-lifecycle.mjs", "utf8");
const mapAdapterSource = fs.readFileSync("src/ui/geospatialMapAdapter.js", "utf8");
const rasterAdapterSource = fs.readFileSync("src/ui/geospatialRasterMapAdapter.js", "utf8");

for (const [name, source] of [
  ["真实浏览器加载验证", browserVerificationSource],
  ["Robotaxi 布局验证", layoutVerificationSource],
]) {
  assert(source.includes("createBoundedCdpSender"), `${name}缺少 DevTools 调用超时`);
  assert(source.includes("closeManagedBrowser"), `${name}缺少统一浏览器释放`);
  assert(source.includes("profileDir"), `${name}缺少独立临时目录生命周期`);
  assert(!source.includes('chrome.kill("SIGTERM")'), `${name}仍直接终止 Chrome 而不等待释放`);
}

assert(lifecycleSource.includes('browser.kill("SIGTERM")'), "受控浏览器释放缺少正常终止");
assert(lifecycleSource.includes('browser.kill("SIGKILL")'), "受控浏览器释放缺少超时后的有界终止");
assert(lifecycleSource.includes("fs.rmSync(profileDir"), "受控浏览器释放缺少临时目录清理");
assert(lifecycleSource.includes("Chrome DevTools 调用超时"), "DevTools 调用缺少有界超时");

assert(mapAdapterSource.includes("visualDiagnosticsRevision"), "矢量地图视觉诊断缺少变化版本");
assert(mapAdapterSource.includes("inspectedVisualDiagnosticsRevision === visualDiagnosticsRevision"), "矢量地图视觉诊断缺少重复抑制");
assert(!mapAdapterSource.includes('map.once("idle", emitVisualDiagnostics)'), "场景更新仍重复注册一次性 idle 诊断");
assert(rasterAdapterSource.includes("appliedSourceVersions"), "二维地图缺少语义场景版本");
assert(rasterAdapterSource.includes("getSceneSourceVersion"), "二维地图未按来源版本增量更新");
assert(!rasterAdapterSource.includes("clearSceneLayers();\n    objectLayers.clear();"), "二维地图仍在每次更新时完整重建场景");

console.log("浏览器与地图资源生命周期验证通过");
