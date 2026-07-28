import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const draftRoot = path.join(root, "media/evidence-drafts");
const approvedRoot = path.join(root, "media/evidence-approved");
const approvedAssetsRoot = path.join(approvedRoot, "assets");
const draftManifestPath = path.join(draftRoot, "manifest.json");
const draftHandoffPath = path.join(draftRoot, "xingbuild-handoff.draft.json");
const approvedManifestPath = path.join(approvedRoot, "manifest.json");
const approvedAssetIds = new Set([
  "robotaxi-evidence-grid-simulation-operations-map-v1",
  "robotaxi-evidence-city-geographic-map-v1",
  "robotaxi-evidence-operating-model-v1",
  "robotaxi-evidence-operating-metrics-overview-v1",
]);

assert(fs.existsSync(draftManifestPath), "缺少草稿媒体 manifest");
assert(fs.existsSync(draftHandoffPath), "缺少草稿交接文件");
const draftManifestBytes = fs.readFileSync(draftManifestPath);
const draft = JSON.parse(draftManifestBytes);
const handoff = JSON.parse(fs.readFileSync(draftHandoffPath, "utf8"));
assert.equal(draft.reviewStatus, "draft", "只能从 draft 媒体源晋级");
assert.equal(draft.publicStatus, "internal", "草稿源必须保持 internal");
assert.equal(handoff.reviewStatus, "draft", "草稿交接必须保持 draft");
assert.equal(handoff.publicStatus, "internal", "草稿交接必须保持 internal");
assert.equal(draft.assets.length, 4, "本次授权只能包含四项既有媒体");
assert.equal(handoff.rows.length, 4, "本次授权只能包含四行既有交接");

const assetsById = new Map(draft.assets.map((asset) => [asset.id, asset]));
assert.deepEqual(new Set(assetsById.keys()), approvedAssetIds, "草稿资产必须与批准范围精确一致");
for (const asset of draft.assets) {
  assert.equal(asset.reviewStatus, "draft");
  assert.equal(asset.publicStatus, "internal");
  assert.equal(asset.candidateStatus, "candidate", `${asset.id} 未获候选资格，不能晋级`);
  assert.notEqual(asset.mediaRole, "rejected", `${asset.id} 被拒绝，不能晋级`);
  const sourcePath = path.join(draftRoot, asset.assetPath);
  const bytes = fs.readFileSync(sourcePath);
  assert.equal(sha256(bytes), asset.assetSha256, `${asset.id} 草稿文件哈希不匹配，不能晋级`);
}

for (const row of handoff.rows) {
  const asset = assetsById.get(row.mediaAssetId);
  assert(asset, `${row.id} 未绑定授权资产`);
  assert.equal(row.altZh, asset.altZh, `${row.id} alt 与资产不一致`);
  assert.equal(row.mediaRole, asset.mediaRole, `${row.id} 媒体角色与资产不一致`);
  assert.equal(row.robotaxiVersion, asset.robotaxiVersion, `${row.id} 版本与资产不一致`);
  assert.equal(row.commit, asset.commit, `${row.id} commit 与资产不一致`);
  assert.equal(row.deepLink, null, `${row.id} 不得添加猜测深链`);
}

fs.mkdirSync(approvedAssetsRoot, { recursive: true });
const assets = draft.assets.map((source) => {
  const sourcePath = path.join(draftRoot, source.assetPath);
  const targetPath = path.join(approvedRoot, source.assetPath);
  if (fs.existsSync(targetPath)) {
    assert.equal(sha256(fs.readFileSync(targetPath)), source.assetSha256, `${source.id} 已批准目录存在不同内容，拒绝覆盖`);
  } else {
    fs.copyFileSync(sourcePath, targetPath);
  }
  return {
    id: source.id,
    sourceAssetId: source.id,
    scene: source.scene,
    viewport: source.viewport,
    assetPath: source.assetPath,
    assetSha256: source.assetSha256,
    robotaxiVersion: source.robotaxiVersion,
    commit: source.commit,
    altZh: source.altZh,
    mediaRole: source.mediaRole,
    stateBoundary: boundaryFor(source.scene),
    approvalStatus: "approved",
  };
});

const approved = {
  schemaVersion: "1.0",
  reviewStatus: "approved",
  publicStatus: "public",
  approvalRecord: {
    approvalId: "robotaxi-portfolio-media-2026-07-28",
    approvalStatus: "approved",
    authority: "user",
    approvedAt: "2026-07-28",
    scope: "四项 Robotaxi 作品媒体及既定事实边界",
  },
  sourceDraftManifestSha256: sha256(draftManifestBytes),
  projectionContract: handoff.projectionContract,
  rows: handoff.rows.map((row) => ({
    id: row.id, group: row.group, order: row.order, title: row.title, shortDescription: row.shortDescription,
    loopRelation: row.loopRelation, mediaAssetId: row.mediaAssetId, altZh: row.altZh, mediaRole: row.mediaRole,
    robotaxiVersion: row.robotaxiVersion, commit: row.commit, stateBoundary: row.stateBoundary, deepLink: null,
  })),
  assets,
};
fs.writeFileSync(approvedManifestPath, `${JSON.stringify(approved, null, 2)}\n`);
console.log("已从 draft/internal 生成独立 approved/public 媒体边界");

function sha256(bytes) { return crypto.createHash("sha256").update(bytes).digest("hex"); }
function boundaryFor(scene) {
  if (scene === "city-geographic-map") return "真实城市底图与规划入口的进行中语境；城市模拟运行尚未启用，不作运营能力或商业运营主张。";
  if (scene === "grid-simulation-operations-map") return "当前可运行的网格模拟；不代表城市商业运营。";
  if (scene === "operating-metrics-overview") return "模拟经营数据；不代表真实商业运营绩效。";
  return "当前系统能力证据；仅限已授权作品展示。";
}
