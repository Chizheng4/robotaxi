import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const mediaRoot = path.join(root, "media/evidence-drafts");
const schema = JSON.parse(fs.readFileSync(path.join(mediaRoot, "manifest.schema.json"), "utf8"));
const manifestPath = path.join(mediaRoot, "manifest.json");
const handoffPath = path.join(mediaRoot, "xingbuild-handoff.draft.json");

assert.equal(schema.properties.reviewStatus.const, "draft", "媒体 schema 必须只允许 draft 审核状态");
assert.equal(schema.properties.publicStatus.const, "internal", "媒体 schema 必须只允许 internal 公开状态");
assert(fs.existsSync(manifestPath), "缺少本地审核媒体 manifest");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
assert.equal(manifest.schemaVersion, "1.0");
assert.equal(manifest.reviewStatus, "draft", "manifest 不得标记为 approved");
assert.equal(manifest.publicStatus, "internal", "manifest 不得标记为 public");
assert.equal(manifest.assets.length, 4, "当前媒体清单必须包含四个展示场景");

const expectedScenes = new Set(["city-geographic-map", "grid-simulation-operations-map", "operating-model", "operating-metrics-overview"]);
const seenIds = new Set();
for (const asset of manifest.assets) {
  assert(expectedScenes.delete(asset.scene) === true, `场景重复或未登记：${asset.scene}`);
  assert(!seenIds.has(asset.id), `媒体 ID 重复：${asset.id}`);
  seenIds.add(asset.id);
  assert.equal(asset.sceneVersion, "1");
  assert.equal(asset.viewport, "1280x800");
  assert.equal(asset.reviewStatus, "draft", `${asset.id} 不得写入批准状态`);
  assert.equal(asset.publicStatus, "internal", `${asset.id} 不得写入公开状态`);
  assert(["candidate", "rejected"].includes(asset.candidateStatus), `${asset.id} 必须明确候选状态`);
  assert(["current_system_evidence", "in_progress_context", "rejected"].includes(asset.mediaRole), `${asset.id} 必须使用受控媒体角色`);
  assert.match(asset.altZh, /^[^\n]{8,}$/);
  assert.match(asset.commit, /^[0-9a-f]{40}$/);
  assert.match(asset.assetSha256, /^[0-9a-f]{64}$/);
  assert.match(asset.sourcePage, /^http:\/\/127\.0\.0\.1:4173\//);
  assert.doesNotMatch(JSON.stringify(asset), /"reviewStatus"\s*:\s*"approved"|"publicStatus"\s*:\s*"public"/i, `${asset.id} 不得包含批准或公开状态值`);
  const assetFile = path.join(mediaRoot, asset.assetPath);
  assert(fs.existsSync(assetFile), `缺少 PNG：${asset.assetPath}`);
  const png = fs.readFileSync(assetFile);
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG", `${asset.id} 必须是 PNG`);
  assert.equal(png.readUInt32BE(16), 1280, `${asset.id} 宽度必须为 1280`);
  assert.equal(png.readUInt32BE(20), 800, `${asset.id} 高度必须为 800`);
  const hash = crypto.createHash("sha256").update(png).digest("hex");
  assert.equal(hash, asset.assetSha256, `${asset.id} 的 SHA-256 与 manifest 不一致`);
}
const mapAsset = manifest.assets.find((asset) => asset.scene === "city-geographic-map");
assert(mapAsset, "缺少城市地理地图草稿");
assert.equal(mapAsset.candidateStatus, "candidate", "城市图只能作为经准确界定的进行中语境候选");
assert.equal(mapAsset.mediaRole, "in_progress_context", "城市图不得作为当前系统运营证据");
assert.equal(mapAsset.state?.mapMode, "CITY_GEOGRAPHIC");
assert.equal(mapAsset.state?.planningEntryDomAvailable, true, "城市图必须通过原生规划入口进入采集状态，而非只采集底图");
assert.match(mapAsset.altZh, /尚未进入城市模拟运行/, "城市图 alt 必须明确尚未进入城市模拟运行");
assert.doesNotMatch(mapAsset.altZh, /城市商业运营|运营对象/, "城市图不得含运营性表述");
const simulationMapAsset = manifest.assets.find((asset) => asset.scene === "grid-simulation-operations-map");
assert(simulationMapAsset, "缺少网格仿真运营中控台草稿");
assert.equal(simulationMapAsset.candidateStatus, "candidate", "网格仿真地图必须完成系统对象验收后才可作为候选");
assert.equal(simulationMapAsset.state?.mapMode, "GRID_SIMULATION");
assert.equal(simulationMapAsset.state?.dataOrigin, "local simulation runtime");
assert(Number(simulationMapAsset.state?.robotaxiMarkerCount) >= 20, "网格仿真地图必须显示完整 Robotaxi 点位");
assert.equal(simulationMapAsset.mediaRole, "current_system_evidence");
assert.match(simulationMapAsset.altZh, /不代表城市商业运营/);
for (const scene of ["operating-model", "operating-metrics-overview"]) {
  const asset = manifest.assets.find((item) => item.scene === scene);
  assert.equal(asset?.mediaRole, "current_system_evidence", `${scene} 必须是当前系统证据候选`);
}
assert(fs.existsSync(handoffPath), "缺少 xingbuild 受控交接草稿");
const handoff = JSON.parse(fs.readFileSync(handoffPath, "utf8"));
assert.equal(handoff.reviewStatus, "draft");
assert.equal(handoff.publicStatus, "internal");
assert.deepEqual(handoff.projectionContract, { desktop: "左侧短说明 + 右侧16:10证据图", mobile: "图上文下" });
const expectedRows = ["robotaxi-operations-current-simulation", "robotaxi-operations-city-spatial-progress", "robotaxi-operating-model", "robotaxi-operating-metrics-overview"];
assert.deepEqual(handoff.rows.map((row) => row.id), expectedRows, "交接草稿必须保持四行稳定 ID 与顺序");
for (const row of handoff.rows) {
  const asset = manifest.assets.find((item) => item.id === row.mediaAssetId);
  assert(asset, `${row.id} 未绑定 manifest 资产`);
  assert.equal(row.altZh, asset.altZh, `${row.id} 的 alt 必须来自资产`);
  assert.equal(row.mediaRole, asset.mediaRole, `${row.id} 的媒体角色必须与资产一致`);
  assert.equal(row.robotaxiVersion, asset.robotaxiVersion);
  assert.equal(row.commit, asset.commit);
  assert.equal(row.deepLink, null, `${row.id} 不得猜测深链`);
  assert.doesNotMatch(JSON.stringify(row), /"reviewStatus"\s*:\s*"approved"|"publicStatus"\s*:\s*"public"/i);
}
const cityRow = handoff.rows.find((row) => row.id === "robotaxi-operations-city-spatial-progress");
assert.equal(cityRow.mediaRole, "in_progress_context");
assert.match(cityRow.stateBoundary, /尚未启用/);
assert.equal(expectedScenes.size, 0, `缺少场景：${[...expectedScenes].join("、")}`);
console.log("本地审核证据媒体合同验证通过");
