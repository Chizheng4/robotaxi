import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const currentMajorDir = path.join(root, "doc/common/current-iteration/major");
const historyMajorDir = path.join(root, "doc/common/iteration-history/major");
const currentMajorEntry = path.join(currentMajorDir, "major-current-iteration.md");

const entrySource = fs.readFileSync(currentMajorEntry, "utf8");
const declaredCurrentFiles = [
  ...entrySource.matchAll(/(?:计划|执行方案|方案设计|自动化执行计划)：`([^`]+)`/g),
].map((match) => path.basename(match[1])).filter(Boolean);

const allowedCurrentMajorFiles = new Set([
  "major-current-iteration.md",
  "operating-metrics-model-pending-plan.md",
]);
declaredCurrentFiles.forEach((file) => allowedCurrentMajorFiles.add(file));

const currentFiles = fs.readdirSync(currentMajorDir).filter((file) => file.endsWith(".md"));
const historyFiles = new Set(fs.readdirSync(historyMajorDir).filter((file) => file.endsWith(".md")));

for (const file of currentFiles) {
  const filePath = path.join(currentMajorDir, file);
  const fileSource = fs.readFileSync(filePath, "utf8");
  assert(
    allowedCurrentMajorFiles.has(file),
    `current major 目录存在未声明的计划文件：${file}`
  );
  assert(
    !historyFiles.has(file),
    `已归档计划仍留在 current major 目录：${file}`
  );
  if (file !== "major-current-iteration.md" && file !== "operating-metrics-model-pending-plan.md") {
    assert(
      !isCompletedMajorPlan(fileSource),
      `已完成的大版本计划不得继续留在 current major 目录：${file}`
    );
  }
}

console.log("当前迭代归档合同验证通过");

function isCompletedMajorPlan(source) {
  return /状态：已完成/.test(source) && !/状态：待执行/.test(source);
}
