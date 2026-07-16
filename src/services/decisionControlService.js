const endedSuccessStatuses = new Set(["SUCCESS", "SUCCEEDED", "COMPLETED", "GENERATED", "DISPATCHED", "SELECTED"]);
const partialStatuses = new Set(["PARTIAL_SUCCESS", "PARTIALLY_SUCCEEDED", "WARN"]);
const failedStatuses = new Set(["FAILED", "REJECTED", "ERROR", "NO_CAPACITY", "NO_MATCHING_CAPABILITY"]);
const noActionStatuses = new Set(["NO_ACTION", "NO_CANDIDATE", "SKIPPED", "NO_ELIGIBLE_CENTER"]);
const runningStatuses = new Set(["QUEUED", "PENDING", "RUNNING", "EXECUTING", "CALCULATING"]);

const capability = (definition) => Object.freeze({
  ...definition,
  strategyIdFields: Object.freeze(definition.strategyIdFields || []),
  strategyNameFields: Object.freeze(definition.strategyNameFields || ["strategy_name", "policy_name"]),
  strategyStatusFields: Object.freeze(definition.strategyStatusFields || ["strategy_status", "policy_status"]),
  runIdFields: Object.freeze(definition.runIdFields || []),
  runStatusFields: Object.freeze(definition.runStatusFields || ["execution_status", "run_status", "run_result", "calculation_status", "simulation_result", "planning_result", "result_type"]),
  runStrategyIdFields: Object.freeze(definition.runStrategyIdFields || definition.strategyIdFields || []),
  resultRunIdFields: Object.freeze(definition.resultRunIdFields || definition.runIdFields || []),
  timeFields: Object.freeze(definition.timeFields || ["completed_at", "updated_at", "created_at", "started_at"]),
  effectMetricIds: Object.freeze(definition.effectMetricIds || []),
});

export const decisionCapabilityDefinitions = Object.freeze([
  capability({ id: "LONG_TERM_DEMAND_FORECAST", name: "长期需求预测", domain: "BUSINESS_PLANNING", valueStream: "经营规划", strategyPage: "longTermDemandForecastStrategies", runPage: "longTermDemandForecastRuns", resultPage: "longTermDemandForecasts", strategyCollection: "longTermDemandForecastStrategies", runCollection: "longTermDemandForecastRuns", resultCollection: "longTermDemandForecasts", strategyIdFields: ["forecast_strategy_id"], runIdFields: ["forecast_run_id"], runStatusFields: ["run_status", "forecast_run_status", "calculation_status", "result_type"], effectMetricIds: ["PERFORMANCE-DEMAND-001", "PERFORMANCE-SUPPLY-001"] }),
  capability({ id: "FLEET_ALLOCATION", name: "区域分配", domain: "SUPPLY", valueStream: "供应管理", strategyPage: "fleetAllocationStrategies", runPage: "fleetAllocationRuns", resultPage: "fleetAllocationResults", strategyCollection: "fleetAllocationStrategies", runCollection: "fleetAllocationRuns", resultCollection: "fleetAllocationResults", strategyIdFields: ["fleet_allocation_strategy_id"], runIdFields: ["fleet_allocation_run_id"], effectMetricIds: ["PERFORMANCE-SUPPLY-001"] }),
  capability({ id: "SUPPLY_DEMAND_BALANCE", name: "供需平衡", domain: "SUPPLY_DEMAND", valueStream: "供需投放", strategyPage: "supplyDemandBalanceStrategies", runPage: "supplyDemandBalanceRuns", resultPage: "supplyDemandBalanceResults", strategyCollection: "supplyDemandBalanceStrategies", runCollection: "supplyDemandBalanceRuns", resultCollection: "supplyDemandBalanceResults", strategyIdFields: ["supply_demand_balance_strategy_id"], runIdFields: ["supply_demand_balance_run_id"], effectMetricIds: ["PROCESS-ASSET-001", "PERFORMANCE-DEMAND-001"] }),
  capability({ id: "ROUTE_PLANNING", name: "路径规划", domain: "ROUTING", valueStream: "Robotaxi", strategyPage: "routePlanningStrategies", runPage: "routePlanningRuns", resultPage: "routes", strategyCollection: "routePlanningStrategies", runCollection: "routePlanningRuns", resultCollection: "routes", strategyIdFields: ["route_strategy_id"], runIdFields: ["route_planning_run_id"], runStatusFields: ["run_status", "planning_result", "execution_status"], effectMetricIds: ["PROCESS-ROUTE-001"] }),
  capability({ id: "DYNAMIC_PRICING", name: "动态定价", domain: "TRAVEL_SERVICE", valueStream: "出行服务", strategyPage: "pricingStrategies", runPage: "pricingStrategyRuns", resultPage: "pricingDecisions", strategyCollection: "pricingStrategies", runCollection: "pricingStrategyRuns", resultCollection: "pricingDecisions", strategyIdFields: ["pricing_strategy_id"], runIdFields: ["pricing_strategy_run_id"], effectMetricIds: ["OUTCOME-EFF-001", "OUTCOME-FIN-006"] }),
  capability({ id: "ORDER_MATCHING", name: "订单匹配", domain: "TRAVEL_SERVICE", valueStream: "出行服务", strategyPage: "orderMatchingStrategies", runPage: "orderMatchingRuns", resultPage: "orderMatchingDecisions", strategyCollection: "orderMatchingStrategies", runCollection: "orderMatchingRuns", resultCollection: "orderMatchingDecisions", strategyIdFields: ["order_matching_strategy_id"], runIdFields: ["order_matching_run_id"], effectMetricIds: ["PROCESS-MATCH-001", "OUTCOME-SERVICE-003"] }),
  capability({ id: "FLEET_OPERATION_POLICY", name: "运维策略", domain: "FLEET_OPERATION", valueStream: "运维支持", strategyPage: "fleetOperationPolicies", runPage: "fleetOperationPolicyRuns", resultPage: "fleetOperationPolicyResults", strategyCollection: "fleetOperationPolicies", runCollection: "fleetOperationPolicyRuns", resultCollection: "fleetOperationPolicyResults", strategyIdFields: ["fleet_operation_policy_id"], runIdFields: ["fleet_operation_policy_run_id"], effectMetricIds: ["PROCESS-ASSET-001"] }),
  capability({ id: "FLEET_OPERATION_DISPATCH", name: "运维调度", domain: "FLEET_OPERATION", valueStream: "运维支持", strategyPage: "fleetOperationDispatchStrategies", runPage: "fleetOperationDispatchRuns", resultPage: "fleetOperationDispatchDecisions", strategyCollection: "fleetOperationDispatchStrategies", runCollection: "fleetOperationDispatchRuns", resultCollection: "fleetOperationDispatchDecisions", strategyIdFields: ["fleet_operation_dispatch_strategy_id"], runIdFields: ["fleet_operation_dispatch_run_id"], effectMetricIds: ["PROCESS-ROUTE-001"] }),
  capability({ id: "ROBOTAXI_TASK_PLANNING", name: "任务规划", domain: "FLEET_OPERATION", valueStream: "运维支持", strategyPage: "robotaxiTaskPlanningStrategies", runPage: "robotaxiTaskPlanningRuns", resultPage: "robotaxiTaskPlanningResults", strategyCollection: "robotaxiTaskPlanningStrategies", runCollection: "robotaxiTaskPlanningRuns", resultCollection: "robotaxiTaskPlanningResults", strategyIdFields: ["robotaxi_task_planning_strategy_id"], runIdFields: ["robotaxi_task_planning_run_id"], effectMetricIds: ["PROCESS-ASSET-001"] }),
  capability({ id: "DEMAND_SIMULATION", name: "虚拟需求", domain: "SIMULATION", valueStream: "运营模拟", strategyPage: "demandSimulationStrategies", runPage: "demandSimulationRuns", resultPage: "demandSimulationResults", strategyCollection: "demandSimulationStrategies", runCollection: "demandSimulationRuns", resultCollection: "demandSimulationResults", strategyIdFields: ["demand_simulation_strategy_id"], runIdFields: ["demand_simulation_run_id"], runStatusFields: ["run_status", "simulation_result", "execution_status"], effectMetricIds: ["OUTCOME-SERVICE-001", "DEMAND-TREND-001"] }),
]);

export function createDecisionControlView({ collections = {}, metricRows = [], comparisons = [] } = {}) {
  const activities = [];
  const capabilities = decisionCapabilityDefinitions.map((definition) => {
    const strategies = collection(collections, definition.strategyCollection);
    const runs = collection(collections, definition.runCollection);
    const results = collection(collections, definition.resultCollection);
    const resultCountByRunId = countResultsByRun(results, definition.resultRunIdFields);
    const normalizedRuns = runs.map((run, index) => normalizeRun(run, definition, strategies, resultCountByRunId, index));
    activities.push(...normalizedRuns);
    const statusCounts = countBy(normalizedRuns, (run) => run.normalized_status);
    const completedCount = (statusCounts.SUCCESS || 0) + (statusCounts.PARTIAL || 0) + (statusCounts.FAILED || 0) + (statusCounts.NO_ACTION || 0);
    const runsWithResults = normalizedRuns.filter((run) => run.decision_result_count > 0).length;
    return Object.freeze({
      decision_capability_id: definition.id,
      decision_capability_name: definition.name,
      decision_domain: definition.domain,
      value_stream_name: definition.valueStream,
      strategy_page_key: definition.strategyPage,
      run_page_key: definition.runPage,
      result_page_key: definition.resultPage,
      strategy_count: strategies.length,
      active_strategy_count: strategies.filter(isActiveStrategy).length,
      run_count: runs.length,
      successful_run_count: statusCounts.SUCCESS || 0,
      partial_run_count: statusCounts.PARTIAL || 0,
      failed_run_count: statusCounts.FAILED || 0,
      no_action_run_count: statusCounts.NO_ACTION || 0,
      decision_result_count: results.length,
      decision_exception_count: (statusCounts.PARTIAL || 0) + (statusCounts.FAILED || 0),
      decision_execution_success_rate: completedCount ? (statusCounts.SUCCESS || 0) / completedCount : null,
      decision_result_coverage_rate: runs.length ? runsWithResults / runs.length : null,
      latest_run_at: normalizedRuns[0]?.occurred_at || null,
      effect_metric_ids: definition.effectMetricIds,
      effect_metrics: Object.freeze(resolveEffectMetrics(definition.effectMetricIds, metricRows, comparisons)),
    });
  });
  activities.sort((left, right) => String(right.occurred_at || "").localeCompare(String(left.occurred_at || "")));
  const completedActivities = activities.filter((item) => ["SUCCESS", "PARTIAL", "FAILED", "NO_ACTION"].includes(item.normalized_status));
  const successfulActivities = activities.filter((item) => item.normalized_status === "SUCCESS");
  const exceptionActivities = activities.filter((item) => ["PARTIAL", "FAILED"].includes(item.normalized_status));
  const runsWithResults = activities.filter((item) => item.decision_result_count > 0);
  const durationValues = completedActivities.map((item) => item.duration_seconds).filter(Number.isFinite);
  return Object.freeze({
    summary: Object.freeze({
      decision_capability_count: capabilities.length,
      strategy_count: capabilities.reduce((sum, item) => sum + item.strategy_count, 0),
      active_strategy_count: capabilities.reduce((sum, item) => sum + item.active_strategy_count, 0),
      run_count: activities.length,
      decision_result_count: capabilities.reduce((sum, item) => sum + item.decision_result_count, 0),
      decision_exception_count: exceptionActivities.length,
      decision_execution_success_rate: completedActivities.length ? successfulActivities.length / completedActivities.length : null,
      decision_result_coverage_rate: activities.length ? runsWithResults.length / activities.length : null,
      decision_exception_rate: completedActivities.length ? exceptionActivities.length / completedActivities.length : null,
      average_decision_duration_seconds: durationValues.length ? durationValues.reduce((sum, value) => sum + value, 0) / durationValues.length : null,
    }),
    capabilities: Object.freeze(capabilities),
    activities: Object.freeze(activities),
    exceptions: Object.freeze(exceptionActivities),
  });
}

export function validateDecisionCapabilityDefinitions(definitions = decisionCapabilityDefinitions) {
  const ids = new Set();
  const errors = [];
  definitions.forEach((item) => {
    if (!item.id || !item.name || !item.valueStream) errors.push("决策能力缺少编号、名称或价值流");
    if (ids.has(item.id)) errors.push(`决策能力编号重复：${item.id}`);
    ids.add(item.id);
    [item.strategyPage, item.runPage, item.resultPage, item.strategyCollection, item.runCollection, item.resultCollection].forEach((value) => {
      if (!value) errors.push(`决策能力合同不完整：${item.id}`);
    });
  });
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

function normalizeRun(run, definition, strategies, resultCountByRunId, index) {
  const runId = firstValue(run, definition.runIdFields) || `${definition.id}-RUN-${String(index + 1).padStart(4, "0")}`;
  const strategyId = firstValue(run, definition.runStrategyIdFields);
  const strategy = strategies.find((item) => definition.strategyIdFields.some((field) => item[field] === strategyId));
  const rawStatus = firstValue(run, definition.runStatusFields) || inferRunStatus(run);
  const occurredAt = firstValue(run, definition.timeFields);
  const startedAt = firstValue(run, ["started_at", "created_at"]);
  const completedAt = firstValue(run, ["completed_at", "updated_at"]);
  return Object.freeze({
    decision_activity_id: runId,
    decision_capability_id: definition.id,
    decision_capability_name: definition.name,
    decision_domain: definition.domain,
    value_stream_name: definition.valueStream,
    strategy_id: strategyId || firstValue(strategy, definition.strategyIdFields) || null,
    strategy_name: firstValue(strategy, definition.strategyNameFields) || definition.name,
    source_run_id: runId,
    source_status: rawStatus,
    normalized_status: normalizeStatus(rawStatus),
    trigger_type: firstValue(run, ["trigger_type", "trigger_source", "execution_mode"]) || null,
    candidate_count: finiteValue(run, ["candidate_count", "scanned_robotaxi_count", "scanned_count", "total_object_count"]),
    decision_result_count: resultCountByRunId.get(runId) || finiteValue(run, ["result_count", "decision_count", "generated_result_count", "generated_object_count"]) || 0,
    downstream_object_count: finiteValue(run, ["generated_task_count", "generated_order_count", "generated_object_count", "created_task_count"]) || arrayLength(run, ["generated_task_ids", "generated_object_ids", "created_object_ids"]),
    duration_seconds: calculateDurationSeconds(startedAt, completedAt),
    occurred_at: occurredAt,
    strategy_page_key: definition.strategyPage,
    run_page_key: definition.runPage,
    result_page_key: definition.resultPage,
    result_summary: firstValue(run, ["result_summary", "calculation_issue_summary", "failure_reason", "decision_reason"]) || null,
  });
}

function normalizeStatus(value) {
  const status = String(value || "").toUpperCase();
  if (endedSuccessStatuses.has(status)) return "SUCCESS";
  if (partialStatuses.has(status)) return "PARTIAL";
  if (failedStatuses.has(status)) return "FAILED";
  if (noActionStatuses.has(status)) return "NO_ACTION";
  if (runningStatuses.has(status)) return "RUNNING";
  return "UNKNOWN";
}

function inferRunStatus(run) {
  if (run.failure_reason) return "FAILED";
  if (firstValue(run, ["result_route_id", "selected_robotaxi_id", "generated_task_count", "result_summary"])) return "SUCCESS";
  return "UNKNOWN";
}

function countResultsByRun(results, runIdFields) {
  const counts = new Map();
  results.forEach((result) => {
    const runId = firstValue(result, runIdFields);
    if (runId) counts.set(runId, (counts.get(runId) || 0) + 1);
  });
  return counts;
}

function resolveEffectMetrics(metricIds, metricRows, comparisons) {
  const rows = [...(metricRows || []), ...(comparisons || [])];
  return metricIds.map((id) => rows.find((item) => item.metric_definition_id === id || item.performance_indicator_id === id)).filter(Boolean);
}

function isActiveStrategy(strategy) {
  return ["ACTIVE", "ENABLED"].includes(String(firstValue(strategy, ["strategy_status", "policy_status", "config_status"]) || "").toUpperCase());
}

function collection(collections, key) {
  return Array.isArray(collections?.[key]) ? collections[key] : [];
}

function firstValue(object, fields) {
  return (fields || []).map((field) => object?.[field]).find((value) => value !== undefined && value !== null && value !== "");
}

function finiteValue(object, fields) {
  const value = firstValue(object, fields);
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function arrayLength(object, fields) {
  const value = (fields || []).map((field) => object?.[field]).find(Array.isArray);
  return value?.length || 0;
}

function calculateDurationSeconds(startedAt, completedAt) {
  const start = Date.parse(startedAt || "");
  const end = Date.parse(completedAt || "");
  return Number.isFinite(start) && Number.isFinite(end) && end >= start ? (end - start) / 1000 : null;
}

function countBy(items, selector) {
  return items.reduce((counts, item) => {
    const key = selector(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}
