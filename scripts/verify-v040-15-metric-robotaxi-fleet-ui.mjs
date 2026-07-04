import fs from "node:fs";

const main = fs.readFileSync("src/main.jsx", "utf8");
const styles = fs.readFileSync("src/styles.css", "utf8");
const dictionary = fs.readFileSync("src/domain/fieldDictionary.js", "utf8");
const dictionaryDoc = fs.readFileSync("doc/rules/field-dictionary.md", "utf8");

function assertIncludes(source, needle, message) {
  if (!source.includes(needle)) {
    throw new Error(message);
  }
}

assertIncludes(
  main,
  "allRows={actions.metricObservations || rows}",
  "经营分析洞察栏必须使用统一指标池，不能只使用当前页面过滤后的行",
);
assertIncludes(
  main,
  "row.metric_period_type === metricPeriodType",
  "经营分析洞察栏必须按当前统计周期读取统一指标池",
);
assertIncludes(
  main,
  "function RobotaxiOperationPanel",
  "Robotaxi 管理页必须保留运营状态体验面板",
);
assertIncludes(
  main,
  "actions.robotaxiOperationActionMap?.get(row.robotaxi_id)",
  "Robotaxi 行操作必须复用缓存后的任务规划预览结果",
);
assertIncludes(
  main,
  "function getFleetOperationStatusDisplay",
  "运维任务状态必须按任务类型转换为新闭环展示文案",
);
assertIncludes(
  styles,
  ".robotaxi-operation-panel",
  "Robotaxi 运营体验面板缺少样式定义",
);
assertIncludes(dictionary, 'WAITING_ROBOTAXI_AVAILABLE: "任务排队中"', "字段字典缺少任务排队中文展示");
assertIncludes(dictionary, 'WAITING_RESOURCE_ASSIGNMENT: "待分配作业人员"', "字段字典缺少作业人员分配中文展示");
assertIncludes(dictionaryDoc, "|WAITING_ROBOTAXI_AVAILABLE|任务排队中|", "文档字段字典缺少任务排队中文展示");
assertIncludes(dictionaryDoc, "|WAITING_RESOURCE_ASSIGNMENT|待分配作业人员|", "文档字段字典缺少作业人员分配中文展示");

console.log("v040.15 经营分析、Robotaxi 管理和运维状态展示合同通过");
