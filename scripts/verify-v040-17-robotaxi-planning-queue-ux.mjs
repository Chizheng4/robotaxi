import fs from "node:fs";

const main = fs.readFileSync("src/main.jsx", "utf8");
const styles = fs.readFileSync("src/styles.css", "utf8");
const planningService = fs.readFileSync("src/services/robotaxiTaskPlanningService.js", "utf8");
const planningTypes = fs.readFileSync("src/domain/robotaxiTaskPlanningTypes.js", "utf8");
const fieldDictionary = fs.readFileSync("src/domain/fieldDictionary.js", "utf8");
const fieldContract = fs.readFileSync("scripts/verify-field-display-contract.mjs", "utf8");

assertIncludes(main, "robotaxi-selected-summary", "Robotaxi 当前选中信息必须使用统一概览结构，避免独立卡片化");
assertIncludes(main, "<span>当前位置</span>", "Robotaxi 顶部概览必须展示当前位置");
assertIncludes(main, "<span>当前可触发运维</span>", "Robotaxi 顶部概览必须展示当前可触发运维");
assertIncludes(main, "pending_task_queue", "Robotaxi 详情必须展示待执行任务队列");
assertIncludes(main, "queue_sequence", "任务规划结果表必须展示排队序号");
assertIncludes(main, "const sequence = item.queue_sequence || index + 1", "Robotaxi 队列展示必须优先读取任务规划排队序号并兼容旧数据");
assertIncludes(styles, ".robotaxi-context-grid > div", "Robotaxi 顶部键值信息必须使用一致化分组布局");
assertNotIncludes(styles, ".robotaxi-focus-block", "Robotaxi 顶部不应继续使用旧卡片式焦点块");
assertIncludes(planningService, "queue_sequence: resolveQueueSequence(queue, priority)", "任务规划策略排队结果必须生成排队序号");
assertIncludes(planningTypes, "queue_sequence: result.queue_sequence || result.queue_entry?.queue_sequence || null", "任务规划结果对象必须持久展示排队序号");
assertIncludes(fieldDictionary, "queue_sequence: \"排队序号\"", "排队序号必须进入代码版字段字典");
assertIncludes(fieldContract, "queue_sequence: 1", "字段展示合同必须覆盖排队序号");

console.log("v040.17 Robotaxi 任务规划队列与顶部体验合同通过");

function assertIncludes(source, needle, message) {
  if (!source.includes(needle)) throw new Error(message);
}

function assertNotIncludes(source, needle, message) {
  if (source.includes(needle)) throw new Error(message);
}
