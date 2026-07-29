import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "robotaxi-approved-media-test-"));
const draftRoot = path.join(fixtureRoot, "draft");
const approvedRoot = path.join(fixtureRoot, "approved");
fs.cpSync(path.join(root, "media/evidence-drafts"), draftRoot, { recursive: true });
fs.cpSync(path.join(root, "media/evidence-approved"), approvedRoot, { recursive: true });
try {
  expectRejected("premature-reapproval", (manifest) => { manifest.assets[0].approvalStatus = "approved"; manifest.assets[0].reviewStatus = "approved"; manifest.assets[0].publicStatus = "public"; });
  expectRejected("hash-mismatch", (manifest) => { manifest.assets[1].assetSha256 = "0".repeat(64); });
  console.log("未批准、撤销与哈希不匹配资产均被批准边界拒绝");
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

function expectRejected(name, mutate) {
  const manifestPath = path.join(approvedRoot, "manifest.json");
  const original = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  mutate(original);
  fs.writeFileSync(manifestPath, `${JSON.stringify(original, null, 2)}\n`);
  const result = spawnSync(process.execPath, ["scripts/verify-approved-evidence-media.mjs"], {
    cwd: root,
    env: { ...process.env, ROBOTAXI_DRAFT_MEDIA_ROOT: draftRoot, ROBOTAXI_APPROVED_MEDIA_ROOT: approvedRoot },
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0, `${name} 资产意外通过批准边界`);
  fs.writeFileSync(manifestPath, `${JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, "media/evidence-approved/manifest.json"), "utf8")), null, 2)}\n`);
}
