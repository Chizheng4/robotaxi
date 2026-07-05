import assert from "node:assert/strict";
import fs from "node:fs";

import { initializeMapSpace } from "../src/data/mapInitialization.js";
import { initializeOperationsCenter } from "../src/data/operationsCenterInitialization.js";
import { validateOperationsCenter } from "../src/data/operationsCenterValidation.js";
import { initializeDefaultCostModelProfile } from "../src/data/costModelCalculator.js";
import { dispatchFleetOperationDestination } from "../src/services/fleetOperationDispatchService.js";
import { passReadinessTask } from "../src/services/businessActionService.js";

const mapData = initializeMapSpace();
const opsData = initializeOperationsCenter();
const data = { ...mapData, ...opsData };

const validations = validateOperationsCenter(data);
assert.equal(validations.find((item) => item.rule_id === "OPS_CENTER_OPERATION_ZONE_TARGETS")?.result, "PASS", "运维职能区域目的网格必须通过校验");
assert.equal(validations.find((item) => item.rule_id === "OPS_CENTER_OPERATION_ACCESS_ROAD")?.result, "PASS", "接入道路不得作为作业目的地");

const dispatch = dispatchFleetOperationDestination({
  task: { task_id: "TASK-MNT-V04022", task_type: "MAINTENANCE" },
  robotaxi: { robotaxi_id: "RT-V04022", current_cell_id: "C-35-31" },
  opsCenters: data.opsCenters,
  cells: data.cells,
  context: {
    now: () => "2026-07-05T12:00:00.000Z",
    nextDispatchRunId: () => "FODR-V04022",
    nextDispatchDecisionId: () => "FODD-V04022",
  },
});
assert.equal(dispatch.targetCellId, "C-35-33", "维修任务应选择维修职能目的 Cell");
assert.notEqual(dispatch.targetCellId, "C-35-31", "运维调度不得选择接入道路 Cell 作为作业目的地");
assert.equal(dispatch.dispatchSkipped, undefined, "Robotaxi 只在接入道路时不能被判定为已在作业点");

const readinessTask = {
  task_id: "TASK-RC-V04022",
  task_status: "CHECKING",
  robotaxi_id: "RT-V04022",
  worker_id: "WK-V04022",
  simulation_run_id: "SIM-V04022",
  simulation_status_transition_history: [
    {
      status_transition_id: "ST-OLD-001",
      transition_sequence: 1,
      to_status: "CHECKING",
      simulation_status_changed_at: "Day 1 00:00:00",
      configured_duration_seconds: 0,
    },
  ],
};
const readinessResult = passReadinessTask({
  state: {
    readinessTasks: [readinessTask],
    robotaxis: [{ robotaxi_id: "RT-V04022" }],
    costModelProfiles: [initializeDefaultCostModelProfile()],
    costRecords: [],
  },
  objectId: readinessTask.task_id,
  runtime: createRuntime(),
});
assert.equal(readinessResult.success, true, "准入完成动作必须成功");
const completedTask = readinessResult.updates.readinessTasks[0];
const latestTransition = completedTask.simulation_status_transition_history.at(-1);
assert.equal(latestTransition.to_status, "COMPLETED", "状态变更必须即时写入时间线");
assert.equal(latestTransition.time_mode, "SIMULATION", "模拟动作时间线必须标记时间模式");
assert.equal(latestTransition.trigger_source, "SIMULATION_TIMED_OPERATION", "模拟时间作业触发必须写入触发来源");
assert.ok(latestTransition.occurred_at, "状态时间线必须记录真实发生时间");
assert.ok(latestTransition.simulation_occurred_at, "状态时间线必须记录模拟发生时间");
assert.equal(readinessResult.updates.costRecords.length, 1, "准入任务完成必须生成增量成本事实");
assert.equal(readinessResult.updates.costRecords[0].source_object_type, "readinessTask");

const simulationActionsSource = fs.readFileSync(new URL("../src/services/simulationActions.js", import.meta.url), "utf8");
assert.match(simulationActionsSource, /"costRecords"/, "模拟运行缓冲层必须包含成本记录集合");
assert.match(simulationActionsSource, /"revenueRecords"/, "模拟运行缓冲层必须包含收入记录集合");

console.log("v040.22 业务事实与模拟运行边界合同验证通过");

function createRuntime() {
  let sequence = 0;
  return {
    nextId: (prefix) => `${prefix}-V04022-${String(++sequence).padStart(3, "0")}`,
    now: () => "2026-07-05T12:00:00.000Z",
    simulationTime: () => "Day 1 00:00:30",
    timeContext: {
      time_mode: "SIMULATION",
      simulation_run_id: "SIM-V04022",
      simulation_timeline_id: "SIM-TL-V04022",
      simulation_seconds: 30,
    },
    context: { action: { actionType: "READINESS_TASK_PASS" } },
    audit: (options = {}) => ({
      record_source: "SIMULATION",
      simulation_run_id: "SIM-V04022",
      simulation_updated_at: "Day 1 00:00:30",
      ...(options.completed ? { simulation_completed_at: "Day 1 00:00:30" } : {}),
    }),
  };
}
