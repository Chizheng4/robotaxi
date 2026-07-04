import fs from "node:fs";

const main = fs.readFileSync("src/main.jsx", "utf8");
const styles = fs.readFileSync("src/styles.css", "utf8");
const planningService = fs.readFileSync("src/services/robotaxiTaskPlanningService.js", "utf8");
const planningTypes = fs.readFileSync("src/domain/robotaxiTaskPlanningTypes.js", "utf8");
const fieldDictionary = fs.readFileSync("src/domain/fieldDictionary.js", "utf8");
const fieldContract = fs.readFileSync("scripts/verify-field-display-contract.mjs", "utf8");

assertIncludes(main, "robotaxi-selected-card", "Robotaxi 当前选中信息必须使用统一摘要结构，避免碎片化键值格");
assertIncludes(main, "label=\"当前位置\"", "Robotaxi 顶部概览必须展示当前位置");
assertIncludes(main, "RobotaxiLocationPopover", "Robotaxi 顶部当前位置必须支持悬浮查看完整信息");
assertIncludes(main, "当前可触发运维", "Robotaxi 顶部概览必须展示当前可触发运维");
assertIncludes(main, "pending_task_queue", "Robotaxi 详情必须展示待执行任务队列");
assertIncludes(main, "queue_sequence", "任务规划结果表必须展示排队序号");
assertIncludes(main, "const sequence = item.queue_sequence || index + 1", "Robotaxi 队列展示必须优先读取任务规划排队序号并兼容旧数据");
assertIncludes(styles, ".robotaxi-selected-meta-scroll", "Robotaxi 顶部摘要必须支持横向滚动以适配详情展开");
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
