import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const draftRoot = process.env.ROBOTAXI_DRAFT_MEDIA_ROOT || path.join(root, "media/evidence-drafts");
const approvedRoot = process.env.ROBOTAXI_APPROVED_MEDIA_ROOT || path.join(root, "media/evidence-approved");
const approved = JSON.parse(fs.readFileSync(path.join(approvedRoot, "manifest.json"), "utf8"));
const schema = JSON.parse(fs.readFileSync(path.join(approvedRoot, "manifest.schema.json"), "utf8"));
const draftBytes = fs.readFileSync(path.join(draftRoot, "manifest.json"));
const draft = JSON.parse(draftBytes);

assert(schema.properties.reviewStatus.enum.includes("superseded"), "批准 schema 必须支持被取代的历史清单");
assert(schema.properties.publicStatus.enum.includes("internal"), "批准 schema 必须支持停止公开的历史清单");
assert.equal(draft.reviewStatus, "draft", "草稿源不得被就地批准");
assert.equal(draft.publicStatus, "internal", "草稿源不得被就地公开");
assert.equal(approved.reviewStatus, "superseded", "旧批准清单必须明确已被取代");
assert.equal(approved.publicStatus, "internal", "旧批准清单不得继续公开");
assert.equal(approved.approvalRecord.approvalStatus, "approved");
assert.equal(approved.approvalRecord.authority, "user");
assert.equal(approved.currentPublication.status, "suspended", "旧批准清单必须停止公开");
assert.equal(approved.sourceDraftManifestSha256, sha256(draftBytes), "批准清单来源草稿不一致");
assert.equal(approved.assets.length, 4, "批准清单只能包含四项授权媒体");
assert.equal(approved.rows.length, 4, "批准清单必须保留四行交接");
const expectedIds = new Set([
  "robotaxi-evidence-grid-simulation-operations-map-v1",
  "robotaxi-evidence-city-geographic-map-v1",
  "robotaxi-evidence-operating-model-v1",
  "robotaxi-evidence-operating-metrics-overview-v1",
]);
const sourceById = new Map(draft.assets.map((asset) => [asset.id, asset]));
for (const asset of approved.assets) {
  assert(expectedIds.delete(asset.id), `未授权或重复资产：${asset.id}`);
  assert.equal(asset.sourceAssetId, asset.id);
  assert(["revoked", "paused"].includes(asset.approvalStatus), `${asset.id} 必须停止公开，等待单项重审`);
  assert.equal(asset.publicStatus, "internal", `${asset.id} 停止公开后必须为 internal`);
  assert(asset.reviewRecord?.reason, `${asset.id} 必须保留本次状态转换原因`);
  const source = sourceById.get(asset.id);
  assert(source, `${asset.id} 缺少草稿来源`);
  assert.equal(source.candidateStatus, "candidate", `${asset.id} 草稿不具候选资格`);
  assert.notEqual(source.mediaRole, "rejected", `${asset.id} 草稿角色已拒绝`);
  for (const field of ["assetSha256", "robotaxiVersion", "commit", "altZh", "mediaRole"]) assert.equal(asset[field], source[field], `${asset.id} ${field} 与草稿来源不一致`);
  const bytes = fs.readFileSync(path.join(approvedRoot, asset.assetPath));
  assert.equal(sha256(bytes), asset.assetSha256, `${asset.id} 批准资产哈希不匹配`);
  assert.equal(asset.viewport, "1280x800");
}
assert.equal(expectedIds.size, 0, "存在未进入批准清单的授权资产");
const rowAssetIds = new Set();
for (const row of approved.rows) {
  const asset = approved.assets.find((item) => item.id === row.mediaAssetId);
  assert(asset, `${row.id} 缺少已归档资产`);
  assert.equal(rowAssetIds.has(row.mediaAssetId), false, `${row.id} 重复绑定批准资产`);
  rowAssetIds.add(row.mediaAssetId);
  for (const field of ["altZh", "mediaRole", "robotaxiVersion", "commit"]) assert.equal(row[field], asset[field], `${row.id} ${field} 与批准资产不一致`);
  assert.equal(row.deepLink, null, `${row.id} 不得提供深链`);
  assert.equal(row.publicStatus, "internal", `${row.id} 必须随资产停止公开`);
}
const city = approved.assets.find((asset) => asset.scene === "city-geographic-map");
assert.equal(city.mediaRole, "in_progress_context");
assert.match(city.stateBoundary, /尚未启用/);
assert.equal(city.approvalStatus, "revoked", "城市回退地图必须被撤销");
assert.equal(city.reviewStatus, "revoked");
assert.match(city.reviewRecord.reason, /Leaflet/);
const grid = approved.assets.find((asset) => asset.scene === "grid-simulation-operations-map");
assert.equal(grid.mediaRole, "current_system_evidence");
assert.match(grid.stateBoundary, /网格模拟/);
assert.equal(grid.approvalStatus, "paused");
assert.equal(grid.reviewStatus, "pending_review");
const metrics = approved.assets.find((asset) => asset.scene === "operating-metrics-overview");
assert.match(metrics.stateBoundary, /模拟经营数据/);
assert.equal(metrics.approvalStatus, "paused");
assert.equal(approved.assets.filter((asset) => asset.approvalStatus === "approved" && asset.reviewStatus === "approved" && asset.publicStatus === "public").length, 0, "重审前不得存在可公开媒体");
console.log("已取代作品媒体清单验证通过：城市已撤销，其余三项待重审");

function sha256(bytes) { return crypto.createHash("sha256").update(bytes).digest("hex"); }
