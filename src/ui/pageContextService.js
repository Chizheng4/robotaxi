import { resolvePagePresentation as resolveRegisteredPagePresentation } from "./pageArchitectureRegistry.js";

const PAGE_DESCRIPTION_OVERRIDES = Object.freeze({
  operatingModel: "统一解释需求、供给、服务、资产、财务和经营反馈，连接经营规划、业务执行与经营分析。",
  decisionCenter: "统一观察跨价值流策略能力、执行过程、异常和经营效果，源策略仍由各业务服务独立拥有。",
  operatingMetricsOverview: "汇总经营目标、预测基线与实际经营结果，识别整体达成情况和关键偏差。",
  financialMetrics: "对比收入、成本、利润及经营目标，解释财务结果与计划的差异。",
  serviceMetrics: "分析订单需求、履约效率和服务趋势，判断需求变化与服务能力是否匹配。",
  processDiagnostics: "诊断匹配、路径、资产和数据质量过程，定位经营偏差的业务原因。",
  metricDefinitions: "统一管理指标名称、含义、公式、单位、时间口径和来源对象。",
  metricObservations: "查看统一经营数据池生成的指标事实和来源引用。",
  metricCalculationRuns: "查看每次经营数据更新的可用结果、质量问题和建议处理方式。",
  businessTargets: "设定经营周期内的订单、服务、资产和经济目标，作为预测与分析的统一基线。",
  demandProfiles: "管理地点、服务区域和 Zone 的需求事实与增长假设，为长期需求预测提供输入。",
  supplyProductionProfiles: "描述 Robotaxi 生产、质检和交付能力，为供给计划提供能力约束。",
  longTermDemandForecasts: "展示需求增长、Robotaxi 缺口、建议生产与交付趋势，连接经营规划和供应执行。",
  console: "在统一地图空间观察运营区域、地点、服务区域、道路、运营中心和 Robotaxi。",
});

export function resolvePageContext({ page, menuLabel, config } = {}) {
  const title = menuLabel || config?.title || "业务页面";
  const description = PAGE_DESCRIPTION_OVERRIDES[page] || normalizeDescription(config?.description, title);
  return Object.freeze({ page, title, description });
}

export function resolvePagePresentation(page) {
  return resolveRegisteredPagePresentation(page);
}

function normalizeDescription(description, title) {
  const text = String(description || "").trim();
  if (text) return text;
  return `${title}用于展示当前业务对象、状态和可执行操作。`;
}
