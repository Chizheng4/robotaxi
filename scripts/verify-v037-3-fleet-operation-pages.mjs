import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const navigationSource = fs.readFileSync(new URL("../src/ui/navigationRegistry.js", import.meta.url), "utf8");

const pages = [
  ["cleaningTasks", "cleaningTask"],
  ["chargingTasks", "chargingTask"],
  ["maintenanceTasks", "maintenanceTask"],
  ["failureHandlingTasks", "failureHandlingTask"],
  ["retirementTasks", "retirementTask"],
];

for (const [page, objectType] of pages) {
  assert.match(navigationSource, new RegExp(`page\\("${page}",`), `${page} 未接入菜单`);
  assert.match(source, new RegExp(`${page}: \\{\\n\\s+title:`), `${page} 未接入表格配置`);
  assert.match(source, new RegExp(`${page}: "${objectType}"`), `${page} 未接入 pageObjectType`);
  assert.match(source, new RegExp(`${objectType}: "task_id"`), `${objectType} 未接入 idFieldByType`);
  assert.match(source, new RegExp(`${page}: "task_status"`), `${page} 未接入状态字段`);
  assert.match(source, new RegExp(`const \\[${page}, set${capitalize(page)}\\] = useState`), `${page} 未接入运行态 state`);
  assert.match(source, new RegExp(`set${capitalize(page)}\\(Array\\.isArray\\(snapshot\\.${page}\\)`), `${page} 未接入快照恢复`);
  assert.match(source, new RegExp(`${page}: ${page}\\.map`), `${page} 未接入 rowsByPage`);
}

assert.match(source, /saveRuntimeSnapshot\(\{[\s\S]*cleaningTasks[\s\S]*retirementTasks/, "Fleet Operations 任务未进入运行快照保存");

console.log("v037.3 Fleet Operations 页面接入验证通过");

function capitalize(value) {
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}
