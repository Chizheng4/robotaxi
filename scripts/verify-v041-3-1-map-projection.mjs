import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { createRobotaxiMapProjections } from "../src/ui/robotaxiMapProjection.js";

const robotaxis = Array.from({ length: 10_000 }, (_, index) => ({
  robotaxi_id: `RTX-${String(index + 1).padStart(5, "0")}`,
  current_cell_id: index % 10 === 0 ? null : `C-${index % 40}-${Math.floor(index / 40) % 40}`,
}));
const snapshot = JSON.stringify(robotaxis);
const startedAt = performance.now();
const projections = createRobotaxiMapProjections(robotaxis);
const elapsedMs = performance.now() - startedAt;

assert.equal(projections.length, 9_000, "只应投影存在当前位置的 Robotaxi");
assert.equal(JSON.stringify(robotaxis), snapshot, "地图投影不得修改 Robotaxi 业务对象");
assert(projections.every((item) => item.vehicle && item.cellId), "每个投影必须引用原车辆和当前位置");
assert(projections.every((item) => Number.isFinite(item.offsetX) && Number.isFinite(item.offsetY)), "车辆偏移必须稳定可计算");
assert.equal(new Set(projections.map((item) => item.vehicle.robotaxi_id)).size, projections.length, "每辆有位置的 Robotaxi 只能生成一个投影");
assert(elapsedMs < 500, `10,000 台 Robotaxi 投影耗时过高：${elapsedMs.toFixed(2)}ms`);

console.log(`v041.3.1 Robotaxi 地图投影验证通过：10,000 台耗时 ${elapsedMs.toFixed(2)}ms`);
