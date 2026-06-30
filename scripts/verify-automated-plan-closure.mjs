import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const currentMajorPath = path.join(root, "doc/common/current-iteration/major/major-current-iteration.md");
const currentMajor = fs.readFileSync(currentMajorPath, "utf8");
const planMatch = currentMajor.match(/doc\/common\/current-iteration\/major\/([^\s`]+\.md)/)
  || currentMajor.match(/方案设计：`([^`]+\.md)`/);

if (!planMatch) {
  console.log("自动执行计划收口合同验证通过");
  process.exit(0);
}

const planPath = planMatch[1].startsWith("doc/")
  ? path.join(root, planMatch[1])
  : path.join(root, "doc/common/current-iteration/major", planMatch[1]);
const plan = fs.readFileSync(planPath, "utf8");
const versionFile = fs.readFileSync(path.join(root, "VERSION.md"), "utf8");

const completedVersions = [];
const sectionRegex = /^### (v\d+(?:\.\d+)+)[^\n]*\n([\s\S]*?)(?=^### |\z)/gm;
let match;
while ((match = sectionRegex.exec(plan)) !== null) {
  if (/状态：已完成/.test(match[2])) completedVersions.push(match[1]);
}

if (completedVersions.length > 0) {
  const latestCompleted = completedVersions.sort(compareVersion)[completedVersions.length - 1];
  assert.ok(
    versionFile.includes(`## ${latestCompleted}`),
    `当前计划最新已完成版本 ${latestCompleted} 必须同步写入 VERSION.md`,
  );
}

console.log("自动执行计划收口合同验证通过");

function compareVersion(a, b) {
  const left = a.replace(/^v/, "").split(".").map(Number);
  const right = b.replace(/^v/, "").split(".").map(Number);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] || 0) - (right[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
