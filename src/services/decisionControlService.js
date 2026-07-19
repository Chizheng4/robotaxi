import {
  CalculationTraceOwner,
  DecisionResultArtifactKind,
  validateDecisionExplanationContract,
} from "../domain/decisionExplanationContract.js";

const endedSuccessStatuses = new Set(["SUCCESS", "SUCCEEDED", "COMPLETED", "GENERATED", "DISPATCHED", "SELECTED"]);
const partialStatuses = new Set(["PARTIAL_SUCCESS", "PARTIALLY_SUCCEEDED", "WARN"]);
const failedStatuses = new Set(["FAILED", "REJECTED", "ERROR", "NO_CAPACITY", "NO_MATCHING_CAPABILITY"]);
const noActionStatuses = new Set(["NO_ACTION", "NO_CANDIDATE", "SKIPPED", "NO_ELIGIBLE_CENTER"]);
const runningStatuses = new Set(["QUEUED", "PENDING", "RUNNING", "EXECUTING", "CALCULATING"]);
const terminalBusinessStatuses = new Set(["ROBOTAXI_ASSIGNMENT_FAILED", "MATCH_FAILED", "MATCHING_FAILED", "CANCELLED", "FAILED"]);
const waitingBusinessStatuses = new Set(["WAITING_ROBOTAXI_ASSIGNMENT", "WAITING_FOR_VEHICLE"]);

const capability = (definition) => Object.freeze({
  ...definition,
  strategyIdFields: Object.freeze(definition.strategyIdFields || []),
  strategyNameFields: Object.freeze(definition.strategyNameFields || ["strategy_name", "policy_name"]),
  strategyStatusFields: Object.freeze(definition.strategyStatusFields || ["strategy_status", "policy_status"]),
  runIdFields: Object.freeze(definition.runIdFields || []),
  runStatusFields: Object.freeze(definition.runStatusFields || ["execution_status", "run_status", "run_result", "calculation_status", "simulation_result", "planning_result", "result_type"]),
  runStrategyIdFields: Object.freeze(definition.runStrategyIdFields || definition.strategyIdFields || []),
  resultRunIdFields: Object.freeze(definition.resultRunIdFields || definition.runIdFields || []),
  sourceObjectIdFields: Object.freeze(definition.sourceObjectIdFields || ["service_order_id", "task_id", "robotaxi_id", "zone_id", "simulation_run_id"]),
  timeFields: Object.freeze(definition.timeFields || ["completed_at", "updated_at", "created_at", "started_at"]),
  effectMetricIds: Object.freeze(definition.effectMetricIds || []),
  downstreamPageKeys: Object.freeze(definition.downstreamPageKeys || []),
  calculationTraceOwner: definition.calculationTraceOwner || CalculationTraceOwner.EXECUTION,
});

export const decisionCapabilityDefinitions = Object.freeze([
  capability({ id: "LONG_TERM_DEMAND_FORECAST", name: "长期需求预测", domain: "BUSINESS_PLANNING", valueStream: "经营规划", strategyPage: "longTermDemandForecastStrategies", runPage: "longTermDemandForecastRuns", resultPage: "longTermDemandForecasts", strategyCollection: "longTermDemandForecastStrategies", runCollection: "longTermDemandForecastRuns", resultCollection: "longTermDemandForecasts", strategyIdFields: ["forecast_strategy_id"], runIdFields: ["forecast_run_id"], resultRunIdFields: ["forecast_run_id"], resultArtifactKind: DecisionResultArtifactKind.ANALYSIS_RESULT, downstreamPageKeys: ["supplyDecisionRuns", "supplyPlans"], runStatusFields: ["run_status", "forecast_run_status", "calculation_status", "result_type"], effectMetricIds: ["PERFORMANCE-DEMAND-001", "PERFORMANCE-SUPPLY-001"] }),
  capability({ id: "SUPPLY_DECISION", name: "供应决策", domain: "BUSINESS_PLANNING", valueStream: "经营规划", strategyPage: "supplyDecisionStrategies", runPage: "supplyDecisionRuns", resultPage: "supplyPlans", strategyCollection: "supplyDecisionStrategies", runCollection: "supplyDecisionRuns", resultCollection: "supplyPlans", strategyIdFields: ["supply_decision_strategy_id"], runIdFields: ["supply_decision_run_id"], resultRunIdFields: ["supply_decision_run_id"], resultArtifactKind: DecisionResultArtifactKind.PLAN_DOCUMENT, downstreamPageKeys: ["productionBatches"], effectMetricIds: ["PERFORMANCE-SUPPLY-001"] }),
  capability({ id: "DELIVERY_ORCHESTRATION", name: "交付编排", domain: "SUPPLY", valueStream: "供应管理", strategyPage: "fleetAllocationStrategies", runPage: "fleetAllocationRuns", resultPage: "fleetAllocationResults", strategyCollection: "fleetAllocationStrategies", runCollection: "fleetAllocationRuns", resultCollection: "fleetAllocationResults", strategyIdFields: ["fleet_allocation_strategy_id"], runIdFields: ["fleet_allocation_run_id"], resultRunIdFields: ["fleet_allocation_run_id"], resultArtifactKind: DecisionResultArtifactKind.DECISION_RECORD, downstreamPageKeys: ["robotaxiDeliveryOrders"], effectMetricIds: ["PERFORMANCE-SUPPLY-001"] }),
  capability({ id: "SHORT_TERM_DEMAND_FORECAST", name: "短期需求预测", domain: "SUPPLY_DEMAND", valueStream: "供需投放", strategyPage: "shortTermDemandForecastStrategies", runPage: "shortTermDemandForecastRuns", resultPage: "shortTermDemandForecastResults", strategyCollection: "shortTermDemandForecastStrategies", runCollection: "shortTermDemandForecastRuns", resultCollection: "shortTermDemandForecastResults", strategyIdFields: ["short_term_forecast_strategy_id"], runIdFields: ["short_term_forecast_run_id"], resultRunIdFields: ["short_term_forecast_run_id"], resultArtifactKind: DecisionResultArtifactKind.ANALYSIS_RESULT, downstreamPageKeys: ["deploymentDecisionRuns", "deploymentPlans"], effectMetricIds: ["PERFORMANCE-DEMAND-001"] }),
  capability({ id: "DEPLOYMENT_DECISION", name: "投放决策", domain: "SUPPLY_DEMAND", valueStream: "供需投放", strategyPage: "deploymentDecisionStrategies", runPage: "deploymentDecisionRuns", resultPage: "deploymentPlans", strategyCollection: "deploymentDecisionStrategies", runCollection: "deploymentDecisionRuns", resultCollection: "deploymentPlans", strategyIdFields: ["deployment_decision_strategy_id"], runIdFields: ["deployment_decision_run_id"], resultRunIdFields: ["deployment_decision_run_id"], resultArtifactKind: DecisionResultArtifactKind.PLAN_DOCUMENT, downstreamPageKeys: ["deploymentTasks"], effectMetricIds: ["PROCESS-ASSET-001", "PERFORMANCE-DEMAND-001"] }),
  capability({ id: "ROUTE_PLANNING", name: "路径规划", domain: "ROUTING", valueStream: "Robotaxi", strategyPage: "routePlanningStrategies", runPage: "routePlanningRuns", resultPage: "routes", strategyCollection: "routePlanningStrategies", runCollection: "routePlanningRuns", resultCollection: "routes", strategyIdFields: ["route_strategy_id"], runIdFields: ["route_planning_run_id"], resultRunIdFields: ["route_planning_run_id"], resultArtifactKind: DecisionResultArtifactKind.OPERATIONAL_OBJECT, downstreamPageKeys: ["routeExecutions", "serviceFulfillmentRecords"], runStatusFields: ["run_status", "planning_result", "execution_status"], effectMetricIds: ["PROCESS-ROUTE-001"] }),
  capability({ id: "DYNAMIC_PRICING", name: "动态定价", domain: "TRAVEL_SERVICE", valueStream: "出行服务", strategyPage: "pricingStrategies", runPage: "pricingStrategyRuns", resultPage: "pricingDecisions", strategyCollection: "pricingStrategies", runCollection: "pricingStrategyRuns", resultCollection: "pricingDecisions", strategyIdFields: ["pricing_strategy_id"], runIdFields: ["pricing_strategy_run_id"], resultRunIdFields: ["pricing_strategy_run_id"], resultArtifactKind: DecisionResultArtifactKind.DECISION_RECORD, downstreamPageKeys: ["serviceOrders"], effectMetricIds: ["OUTCOME-EFF-001", "OUTCOME-FIN-006"] }),
  capability({ id: "ORDER_MATCHING", name: "订单匹配", domain: "TRAVEL_SERVICE", valueStream: "出行服务", strategyPage: "orderMatchingStrategies", runPage: "orderMatchingRuns", resultPage: "orderMatchingDecisions", strategyCollection: "orderMatchingStrategies", runCollection: "orderMatchingRuns", resultCollection: "orderMatchingDecisions", strategyIdFields: ["order_matching_strategy_id"], runIdFields: ["order_matching_run_id"], resultRunIdFields: ["order_matching_run_id"], resultArtifactKind: DecisionResultArtifactKind.DECISION_RECORD, downstreamPageKeys: ["serviceOrders", "serviceFulfillmentRecords"], sourceObjectType: "serviceOrder", sourceObjectIdFields: ["service_order_id"], effectMetricIds: ["PROCESS-MATCH-001", "OUTCOME-SERVICE-003"] }),
  capability({ id: "FLEET_OPERATION_POLICY", name: "运维策略", domain: "FLEET_OPERATION", valueStream: "运维支持", strategyPage: "fleetOperationPolicies", runPage: "fleetOperationPolicyRuns", resultPage: "fleetOperationPolicyResults", strategyCollection: "fleetOperationPolicies", runCollection: "fleetOperationPolicyRuns", resultCollection: "fleetOperationPolicyResults", strategyIdFields: ["fleet_operation_policy_id"], runIdFields: ["fleet_operation_policy_run_id"], resultRunIdFields: ["fleet_operation_policy_run_id"], resultArtifactKind: DecisionResultArtifactKind.DECISION_RECORD, downstreamPageKeys: ["cleaningTasks", "chargingTasks", "maintenanceTasks"], effectMetricIds: ["PROCESS-ASSET-001"] }),
  capability({ id: "FLEET_OPERATION_DISPATCH", name: "运维调度", domain: "FLEET_OPERATION", valueStream: "运维支持", strategyPage: "fleetOperationDispatchStrategies", runPage: "fleetOperationDispatchRuns", resultPage: "fleetOperationDispatchDecisions", strategyCollection: "fleetOperationDispatchStrategies", runCollection: "fleetOperationDispatchRuns", resultCollection: "fleetOperationDispatchDecisions", strategyIdFields: ["fleet_operation_dispatch_strategy_id"], runIdFields: ["fleet_operation_dispatch_run_id"], resultRunIdFields: ["fleet_operation_dispatch_run_id"], resultArtifactKind: DecisionResultArtifactKind.DECISION_RECORD, downstreamPageKeys: ["routeExecutions"], effectMetricIds: ["PROCESS-ROUTE-001"] }),
  capability({ id: "ROBOTAXI_TASK_PLANNING", name: "任务规划", domain: "FLEET_OPERATION", valueStream: "运维支持", strategyPage: "robotaxiTaskPlanningStrategies", runPage: "robotaxiTaskPlanningRuns", resultPage: "robotaxiTaskPlanningResults", strategyCollection: "robotaxiTaskPlanningStrategies", runCollection: "robotaxiTaskPlanningRuns", resultCollection: "robotaxiTaskPlanningResults", strategyIdFields: ["robotaxi_task_planning_strategy_id"], runIdFields: ["robotaxi_task_planning_run_id"], resultRunIdFields: ["robotaxi_task_planning_run_id"], resultArtifactKind: DecisionResultArtifactKind.DECISION_RECORD, downstreamPageKeys: ["cleaningTasks", "chargingTasks", "maintenanceTasks", "failureHandlingTasks", "retirementTasks"], effectMetricIds: ["PROCESS-ASSET-001"] }),
  capability({ id: "DEMAND_SIMULATION", name: "需求模拟", domain: "SIMULATION", valueStream: "运营模拟", strategyPage: "demandSimulationStrategies", runPage: "demandSimulationRuns", resultPage: "demandSimulationResults", strategyCollection: "demandSimulationStrategies", runCollection: "demandSimulationRuns", resultCollection: "demandSimulationResults", strategyIdFields: ["demand_simulation_strategy_id"], runIdFields: ["demand_simulation_run_id"], resultRunIdFields: ["demand_simulation_run_id"], resultArtifactKind: DecisionResultArtifactKind.SIMULATION_RESULT, downstreamPageKeys: ["serviceOrders"], runStatusFields: ["run_status", "simulation_result", "execution_status"], effectMetricIds: ["OUTCOME-SERVICE-001", "DEMAND-TREND-001"] }),
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
    const processes = createDecisionProcesses(normalizedRuns, collections);
    const exceptionProcesses = processes.filter((item) => item.exception_attempt_count > 0);
    const completedProcesses = processes.filter((item) => ["SUCCESS", "PARTIAL", "FAILED", "NO_ACTION"].includes(item.final_decision_status));
    const affectedObjects = uniqueProcessObjectIds(exceptionProcesses);
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
      result_artifact_kind: definition.resultArtifactKind,
      calculation_trace_owner: definition.calculationTraceOwner,
      downstream_page_keys: definition.downstreamPageKeys,
      decision_process_count: processes.length,
      decision_exception_count: exceptionProcesses.length,
      decision_exception_attempt_count: exceptionProcesses.reduce((sum, item) => sum + item.exception_attempt_count, 0),
      affected_business_object_count: affectedObjects.size,
      recovered_exception_process_count: exceptionProcesses.filter((item) => item.business_impact_status === "RECOVERED_AFTER_RETRY").length,
      unresolved_exception_process_count: exceptionProcesses.filter(isUnresolvedProcess).length,
      terminal_impact_object_count: uniqueProcessObjectIds(exceptionProcesses.filter((item) => item.business_impact_status === "TERMINAL_FAILURE")).size,
      decision_execution_success_rate: completedCount ? (statusCounts.SUCCESS || 0) / completedCount : null,
      decision_result_coverage_rate: runs.length ? runsWithResults / runs.length : null,
      decision_exception_rate: completedProcesses.length ? exceptionProcesses.length / completedProcesses.length : null,
      decision_exception_attempt_rate: completedCount ? exceptionProcesses.reduce((sum, item) => sum + item.exception_attempt_count, 0) / completedCount : null,
      latest_run_at: normalizedRuns[0]?.occurred_at || null,
      effect_metric_ids: definition.effectMetricIds,
      effect_metrics: Object.freeze(resolveEffectMetrics(definition.effectMetricIds, metricRows, comparisons)),
    });
  });
  activities.sort((left, right) => String(right.occurred_at || "").localeCompare(String(left.occurred_at || "")));
  const processes = createDecisionProcesses(activities, collections)
    .sort((left, right) => String(right.latest_attempt_at || "").localeCompare(String(left.latest_attempt_at || "")));
  const completedActivities = activities.filter((item) => ["SUCCESS", "PARTIAL", "FAILED", "NO_ACTION"].includes(item.normalized_status));
  const successfulActivities = activities.filter((item) => item.normalized_status === "SUCCESS");
  const exceptionActivities = activities.filter((item) => ["PARTIAL", "FAILED"].includes(item.normalized_status));
  const exceptionProcesses = processes.filter((item) => item.exception_attempt_count > 0);
  const completedProcesses = processes.filter((item) => ["SUCCESS", "PARTIAL", "FAILED", "NO_ACTION"].includes(item.final_decision_status));
  const unresolvedProcesses = exceptionProcesses.filter(isUnresolvedProcess);
  const affectedObjects = uniqueProcessObjectIds(exceptionProcesses);
  const sourceRecords = decisionCapabilityDefinitions.flatMap((definition) => [
    ...collection(collections, definition.strategyCollection),
    ...collection(collections, definition.runCollection),
    ...collection(collections, definition.resultCollection),
  ]);
  const sourceUpdatedAt = latestTimestamp(sourceRecords);
  const metricUpdatedAt = latestTimestamp([...(metricRows || []), ...(comparisons || [])]);
  const sourceRecordCount = sourceRecords.length;
  const runsWithResults = activities.filter((item) => item.decision_result_count > 0);
  const durationValues = completedActivities.map((item) => item.duration_seconds).filter(Number.isFinite);
  return Object.freeze({
    summary: Object.freeze({
      decision_capability_count: capabilities.length,
      strategy_count: capabilities.reduce((sum, item) => sum + item.strategy_count, 0),
      active_strategy_count: capabilities.reduce((sum, item) => sum + item.active_strategy_count, 0),
      run_count: activities.length,
      decision_process_count: processes.length,
      decision_result_count: capabilities.reduce((sum, item) => sum + item.decision_result_count, 0),
      decision_exception_count: exceptionProcesses.length,
      decision_exception_attempt_count: exceptionActivities.length,
      affected_business_object_count: affectedObjects.size,
      recovered_exception_process_count: exceptionProcesses.filter((item) => item.business_impact_status === "RECOVERED_AFTER_RETRY").length,
      unresolved_exception_process_count: unresolvedProcesses.length,
      terminal_impact_object_count: uniqueProcessObjectIds(exceptionProcesses.filter((item) => item.business_impact_status === "TERMINAL_FAILURE")).size,
      decision_execution_success_rate: completedActivities.length ? successfulActivities.length / completedActivities.length : null,
      decision_result_coverage_rate: activities.length ? runsWithResults.length / activities.length : null,
      decision_exception_rate: completedProcesses.length ? exceptionProcesses.length / completedProcesses.length : null,
      decision_exception_attempt_rate: completedActivities.length ? exceptionActivities.length / completedActivities.length : null,
      average_decision_duration_seconds: durationValues.length ? durationValues.reduce((sum, value) => sum + value, 0) / durationValues.length : null,
      projection_version: "DECISION_CONTROL_V2",
      projection_generated_at: new Date().toISOString(),
      decision_source_version: createSourceVersion(sourceRecordCount, sourceUpdatedAt),
      source_record_count: sourceRecordCount,
      source_updated_at: sourceUpdatedAt,
      metric_updated_at: metricUpdatedAt,
      metrics_need_recalculation: Boolean(sourceUpdatedAt && (!metricUpdatedAt || Date.parse(sourceUpdatedAt) > Date.parse(metricUpdatedAt))),
    }),
    capabilities: Object.freeze(capabilities),
    activities: Object.freeze(activities),
    processes: Object.freeze(processes),
    exceptions: Object.freeze(exceptionProcesses),
    unresolvedExceptions: Object.freeze(unresolvedProcesses),
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
    errors.push(...validateDecisionExplanationContract(item));
  });
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateDecisionPageArchitecture(pageRegistry = {}, definitions = decisionCapabilityDefinitions) {
  const errors = [];
  const expectedResultKinds = {
    [DecisionResultArtifactKind.ANALYSIS_RESULT]: ["result"],
    [DecisionResultArtifactKind.DECISION_RECORD]: ["result"],
    [DecisionResultArtifactKind.PLAN_DOCUMENT]: ["document"],
    [DecisionResultArtifactKind.OPERATIONAL_OBJECT]: ["object"],
    [DecisionResultArtifactKind.SIMULATION_RESULT]: ["result"],
  };
  definitions.forEach((definition) => {
    const strategyPage = pageRegistry[definition.strategyPage];
    const runPage = pageRegistry[definition.runPage];
    const resultPage = pageRegistry[definition.resultPage];
    if (strategyPage?.resourceKind !== "configuration") errors.push(`${definition.id}策略页面必须是配置对象`);
    if (runPage?.resourceKind !== "execution") errors.push(`${definition.id}执行页面必须是执行记录`);
    if (!expectedResultKinds[definition.resultArtifactKind]?.includes(resultPage?.resourceKind)) {
      errors.push(`${definition.id}结果页面性质与决策结果性质不一致`);
    }
    definition.downstreamPageKeys.forEach((pageKey) => {
      if (!pageRegistry[pageKey]) errors.push(`${definition.id}引用未知下游页面：${pageKey}`);
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
  const sourceObjectId = firstValue(run, definition.sourceObjectIdFields);
  const sourceObjectType = definition.sourceObjectType || inferSourceObjectType(run, sourceObjectId);
  const normalizedStatus = normalizeStatus(rawStatus);
  const resultSummary = firstValue(run, ["result_summary", "calculation_issue_summary", "failure_reason", "decision_reason"]) || null;
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
    normalized_status: normalizedStatus,
    source_business_object_type: sourceObjectType,
    source_business_object_id: sourceObjectId || null,
    exception_category: classifyException(normalizedStatus, resultSummary),
    trigger_type: firstValue(run, ["trigger_type", "trigger_source", "execution_mode"]) || null,
    candidate_count: finiteValue(run, ["candidate_count", "scanned_robotaxi_count", "scanned_count", "total_object_count"]),
    decision_result_count: resultCountByRunId.get(runId) || finiteValue(run, ["result_count", "decision_count", "generated_result_count", "generated_object_count"]) || 0,
    downstream_object_count: finiteValue(run, ["generated_task_count", "generated_order_count", "generated_object_count", "created_task_count"]) || arrayLength(run, ["generated_task_ids", "generated_object_ids", "created_object_ids"]),
    duration_seconds: calculateDurationSeconds(startedAt, completedAt),
    occurred_at: occurredAt,
    strategy_page_key: definition.strategyPage,
    run_page_key: definition.runPage,
    result_page_key: definition.resultPage,
    result_summary: resultSummary,
  });
}

function createDecisionProcesses(activities, collections) {
  const groups = new Map();
  activities.forEach((activity) => {
    const objectKey = activity.source_business_object_id || activity.source_run_id;
    const key = `${activity.decision_capability_id}:${objectKey}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(activity);
  });
  const serviceOrders = new Map(collection(collections, "serviceOrders").map((item) => [item.service_order_id, item]));
  return [...groups.entries()].map(([key, attempts]) => {
    const ordered = [...attempts].sort((left, right) => String(left.occurred_at || "").localeCompare(String(right.occurred_at || "")));
    const first = ordered[0];
    const latest = ordered[ordered.length - 1];
    const exceptionAttempts = ordered.filter((item) => ["PARTIAL", "FAILED"].includes(item.normalized_status));
    const sourceObject = first.source_business_object_type === "serviceOrder"
      ? serviceOrders.get(first.source_business_object_id)
      : null;
    const businessImpactStatus = resolveBusinessImpactStatus(ordered, sourceObject);
    return Object.freeze({
      decision_process_id: key,
      decision_capability_id: first.decision_capability_id,
      decision_capability_name: first.decision_capability_name,
      value_stream_name: first.value_stream_name,
      source_business_object_type: first.source_business_object_type,
      source_business_object_id: first.source_business_object_id,
      decision_attempt_count: ordered.length,
      exception_attempt_count: exceptionAttempts.length,
      exception_category: exceptionAttempts.at(-1)?.exception_category || null,
      business_impact_status: businessImpactStatus,
      final_decision_status: latest.normalized_status,
      first_attempt_at: first.occurred_at,
      latest_attempt_at: latest.occurred_at,
      result_summary: exceptionAttempts.at(-1)?.result_summary || latest.result_summary,
      strategy_page_key: latest.strategy_page_key,
      run_page_key: latest.run_page_key,
      result_page_key: latest.result_page_key,
      source_run_ids: Object.freeze(ordered.map((item) => item.source_run_id)),
    });
  });
}

function classifyException(status, reason) {
  if (status === "PARTIAL") return "PARTIAL_RESULT";
  if (status !== "FAILED") return null;
  const code = String(reason || "").toUpperCase();
  if (["NO_AVAILABLE_ROBOTAXI", "BATTERY_NOT_ENOUGH", "NO_CAPACITY", "NO_CANDIDATE"].some((item) => code.includes(item))) return "RESOURCE_SHORTAGE";
  if (["ROBOTAXI_STATE_INVALID", "ROBOTAXI_ALREADY_ASSIGNED"].some((item) => code.includes(item))) return "ELIGIBILITY_CONFLICT";
  if (["PICKUP_CELL_UNREACHABLE", "NO_MATCHING_CAPABILITY", "NO_ELIGIBLE_CENTER"].some((item) => code.includes(item))) return "SPATIAL_CAPABILITY";
  if (["UNKNOWN", "ERROR", "EXCEPTION"].some((item) => code.includes(item))) return "SYSTEM_EXCEPTION";
  return "STRATEGY_EXECUTION";
}

function resolveBusinessImpactStatus(attempts, sourceObject) {
  const hadException = attempts.some((item) => ["PARTIAL", "FAILED"].includes(item.normalized_status));
  const latest = attempts.at(-1);
  if (!hadException) return "NO_IMPACT";
  if (latest.normalized_status === "SUCCESS") return "RECOVERED_AFTER_RETRY";
  const businessStatus = String(sourceObject?.order_status || "").toUpperCase();
  if (waitingBusinessStatuses.has(businessStatus)) return "PENDING_RETRY";
  if (terminalBusinessStatuses.has(businessStatus)) return "TERMINAL_FAILURE";
  return "IMPACT_UNCONFIRMED";
}

function isUnresolvedProcess(process) {
  return !["NO_IMPACT", "RECOVERED_AFTER_RETRY"].includes(process.business_impact_status);
}

function uniqueProcessObjectIds(processes) {
  return new Set(processes.map((item) => item.source_business_object_id || item.decision_process_id));
}

function inferSourceObjectType(run, sourceObjectId) {
  if (!sourceObjectId) return null;
  if (run.service_order_id) return "serviceOrder";
  if (run.task_id) return "task";
  if (run.robotaxi_id) return "robotaxi";
  if (run.zone_id) return "zone";
  if (run.simulation_run_id) return "simulationRun";
  return "businessObject";
}

function latestTimestamp(records) {
  return records
    .map((item) => firstValue(item, ["completed_at", "calculated_at", "observed_at", "updated_at", "created_at", "started_at"]))
    .filter(Boolean)
    .sort((left, right) => String(right).localeCompare(String(left)))[0] || null;
}

function createSourceVersion(recordCount, updatedAt) {
  return `DC-${recordCount}-${String(updatedAt || "EMPTY").replace(/[^0-9]/g, "").slice(0, 14) || "0"}`;
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
