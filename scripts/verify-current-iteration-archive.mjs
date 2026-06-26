import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const currentMajorDir = path.join(root, "doc/common/current-iteration/major");
const historyMajorDir = path.join(root, "doc/common/iteration-history/major");
const currentMajorEntry = path.join(currentMajorDir, "major-current-iteration.md");

const entrySource = fs.readFileSync(currentMajorEntry, "utf8");
const executingPlanMatch = entrySource.match(/执行方案：`([^`]+)`/);
const executingPlanFile = executingPlanMatch?.[1] || null;

const allowedCurrentMajorFiles = new Set([
  "major-current-iteration.md",
  "operating-metrics-model-pending-plan.md",
]);
if (executingPlanFile) allowedCurrentMajorFiles.add(executingPlanFile);

const currentFiles = fs.readdirSync(currentMajorDir).filter((file) => file.endsWith(".md"));
const historyFiles = new Set(fs.readdirSync(historyMajorDir).filter((file) => file.endsWith(".md")));

for (const file of currentFiles) {
  assert(
    allowedCurrentMajorFiles.has(file),
    `current major 目录存在未声明的计划文件：${file}`
  );
  assert(
    !historyFiles.has(file),
    `已归档计划仍留在 current major 目录：${file}`
  );
}

console.log("当前迭代归档合同验证通过");
