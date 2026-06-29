import fs from "node:fs";
import assert from "node:assert/strict";
import {
  clearEndedTimedOperations,
  canClearAllTimedOperations,
  filterTimedOperationsByObjectType,
  getTimedOperationObjectTypeOptions,
} from "../src/data/timedOperationDiagnostics.js";

const sampleOperations = [
  { timed_operation_id: "TO-001", operation_status: "PENDING", object_type: "serviceOrder" },
  { timed_operation_id: "TO-002", operation_status: "RUNNING", object_type: "trip" },
  { timed_operation_id: "TO-003", operation_status: "COMPLETED", object_type: "trip" },
  { timed_operation_id: "TO-004", operation_status: "FAILED", object_type: "routeExecution" },
  { timed_operation_id: "TO-005", operation_status: "CANCELLED", object_type: "serviceOrder" },
];

assert.deepEqual(
  clearEndedTimedOperations(sampleOperations).map((operation) => operation.timed_operation_id),
  ["TO-001", "TO-002"],
  "清空已结束作业必须保留等待中和执行中作业",
);

assert.equal(canClearAllTimedOperations([{ simulation_status: "RUNNING" }]), false, "运行中不得清空全部时间作业");
assert.equal(canClearAllTimedOperations([{ simulation_status: "DRAINING" }]), false, "收尾执行中不得清空全部时间作业");
assert.equal(canClearAllTimedOperations([{ simulation_status: "PAUSED" }]), false, "暂停中不得清空全部时间作业");
assert.equal(canClearAllTimedOperations([{ simulation_status: "COMPLETED" }]), true, "结束后的运行允许清空全部时间作业");

assert.deepEqual(
  filterTimedOperationsByObjectType(sampleOperations, "trip").map((operation) => operation.timed_operation_id),
  ["TO-002", "TO-003"],
  "业务单类型筛选必须按 object_type 精确过滤",
);

assert.deepEqual(
  getTimedOperationObjectTypeOptions(sampleOperations),
  ["serviceOrder", "trip", "routeExecution"],
  "业务单类型选项必须来自当前时间作业数据",
);

const mainSource = fs.readFileSync("src/main.jsx", "utf8");
assert.match(mainSource, /setTimedOperations\(\[\]\)/, "重置模拟数据必须清空内存中的时间作业");
assert.match(mainSource, /clearEndedTimedOperations/, "时间作业页面必须使用统一清理规则");
assert.match(mainSource, /getActiveSimulationRunForTimedOperationClear/, "清空全部时间作业必须检查活跃模拟运行");
assert.match(mainSource, /filters\.objectType/, "时间作业页面必须支持业务单类型过滤");

console.log("v033.1 时间作业诊断合同检查通过。");
