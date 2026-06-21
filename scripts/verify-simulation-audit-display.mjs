import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("src/main.jsx", "utf8");
const pairedColumns = [
  "serviceOrders",
  "readinessTasks",
  "deploymentTasks",
  "routeExecutions",
  "serviceFulfillmentRecords",
];

for (const page of pairedColumns) {
  const pagePattern = new RegExp(`${page}: \\{[\\s\\S]*?columns: \\[[^\\]]*?"created_at", "simulation_created_at"`);
  assert.match(source, pagePattern, `${page} 必须相邻显示创建时间和模拟创建时间`);
}

const detailTypes = ["readinessTask", "deploymentTask", "routeExecution", "serviceOrder", "trip"];
for (const type of detailTypes) {
  const detailStart = source.indexOf(`if (selectedType === "${type}")`);
  assert.notEqual(detailStart, -1, `${type} 必须使用标准详情配置`);
  const nextDetail = source.indexOf("if (selectedType ===", detailStart + 1);
  const detailSource = source.slice(detailStart, nextDetail === -1 ? source.length : nextDetail);
  assert.match(detailSource, /"created_at", "simulation_created_at"/, `${type} 详情必须相邻显示双创建时间`);
}

console.log("模拟业务双创建时间页面验证通过");
