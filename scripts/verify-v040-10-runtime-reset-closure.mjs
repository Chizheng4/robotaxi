import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("src/main.jsx", "utf8");
const resetStart = source.indexOf("function resetRuntime() {");
assert.notEqual(resetStart, -1, "resetRuntime 必须存在");
const resetEnd = source.indexOf("function clearSimulationEvents()", resetStart);
assert.notEqual(resetEnd, -1, "resetRuntime 后必须存在 clearSimulationEvents");
const resetBody = source.slice(resetStart, resetEnd);

[
  "simActionsRef.current?.cleanup?.()",
  "autoFinanceCalculationRunIdsRef.current.clear()",
  "setMetricCalculationRuns([])",
  "setMetricObservations([])",
  "setMetricPeriodType(\"ALL\")",
  "setMetricCalculationInProgress(false)",
  "setCostCalculationRuns([])",
  "setCostRecords([])",
  "setRevenueCalculationRuns([])",
  "setRevenueRecords([])",
  "setFleetOperationDispatchRuns([])",
  "setFleetOperationDispatchDecisions([])",
  "setTaskDispatchRuns([])",
  "setTaskDispatchResults([])",
].forEach((expected) => {
  assert.ok(resetBody.includes(expected), `resetRuntime 必须包含 ${expected}`);
});

[
  "fleetOperationDispatchRunSequence = 0",
  "fleetOperationDispatchDecisionSequence = 0",
  "taskDispatchRunSequence = 0",
  "taskDispatchResultSequence = 0",
].forEach((expected) => {
  assert.ok(resetBody.includes(expected), `resetRuntime 必须重置序列 ${expected}`);
});

console.log("v040.10 运行态重置闭环验证通过");
