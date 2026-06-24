import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("src/main.jsx", "utf8");
const styles = fs.readFileSync("src/styles.css", "utf8");
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

assert.match(source, /function StructuredDetailValue\(/, "复杂字段必须使用统一结构化详情组件");
assert.match(source, /function StructuredDetailNode\(/, "复杂详情必须支持嵌套分组");
assert.match(source, /return <StructuredDetailValue value=\{value\} fieldKey=\{key\} \/>/, "对象和数组必须接入结构化详情组件");
assert.match(source, /<details className="structured-detail">/, "复杂详情必须默认折叠并支持按需展开");
assert.match(source, /<dt>\{getFieldLabel\(key\)\}<\/dt>/, "复杂详情字段必须通过统一字段字典显示中文");
assert.match(styles, /\.structured-detail-field\s*\{[\s\S]*?grid-template-columns:/, "复杂详情必须使用稳定键值对齐");
assert.match(styles, /\.structured-detail-group-body\s*\{[\s\S]*?border-left:/, "嵌套详情必须使用轻量层级引导");

console.log("模拟业务双创建时间页面验证通过");
