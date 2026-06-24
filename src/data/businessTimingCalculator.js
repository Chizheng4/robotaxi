import { formatSimulationTimestamp } from "../domain/simulationTime.js";

export const TimingCalculationStatus = {
  NOT_CALCULATED: "NOT_CALCULATED",
  QUEUED: "QUEUED",
  CALCULATING: "CALCULATING",
  SUCCEEDED: "SUCCEEDED",
  PARTIALLY_SUCCEEDED: "PARTIALLY_SUCCEEDED",
  FAILED: "FAILED",
};

export const TimingDurationMode = {
  FIXED_DURATION: "FIXED_DURATION",
  PER_CELL_DURATION: "PER_CELL_DURATION",
};

const RULE_DEFINITIONS = [
  ["readinessTask", "WAITING_ASSIGNMENT", "READINESS_TASK_ASSIGN", "WAITING_CHECK", 3],
  ["readinessTask", "WAITING_CHECK", "READINESS_TASK_START", "CHECKING", 5],
  ["readinessTask", "CHECKING", "READINESS_TASK_PASS", "COMPLETED", 30],
  ["routeExecution", "WAITING_ROUTE", "ROUTE_PLAN", "MOVING", 8],
  ["routeExecution", "MOVING", "ROUTE_EXECUTION_STEP", "ARRIVED", 4, TimingDurationMode.PER_CELL_DURATION],
  ["routeExecution", "ARRIVED", "ARRIVAL_CONFIRM", "COMPLETED", 3],
  ["serviceOrder", "CREATED", "PRICING_EXECUTE", "WAITING_ROBOTAXI_CALL", 2],
  ["serviceOrder", "WAITING_ROBOTAXI_CALL", "ROBOTAXI_CALL", "WAITING_ROBOTAXI_ASSIGNMENT", 2],
  ["serviceOrder", "WAITING_ROBOTAXI_ASSIGNMENT", "ORDER_MATCHING_EXECUTE", "VEHICLE_ASSIGNED", 4],
  ["serviceOrder", "ARRIVED_DESTINATION", "SETTLEMENT_EXECUTE", "WAITING_PAYMENT", 5],
  ["serviceOrder", "WAITING_PAYMENT", "PAYMENT_EXECUTE", "COMPLETED", 3],
  ["trip", "PENDING", "TRIP_START", "ON_THE_WAY_PICKUP", 2],
  ["trip", "ON_THE_WAY_PICKUP", "TRIP_PICKUP_TRAVEL", "WAITING_CUSTOMER_BOARDING", 4, TimingDurationMode.PER_CELL_DURATION],
  ["trip", "WAITING_CUSTOMER_BOARDING", "PASSENGER_BOARD", "CUSTOMER_ONBOARD", 45],
  ["trip", "CUSTOMER_ONBOARD", "TRIP_DEPART", "ON_THE_WAY_DESTINATION", 2],
  ["trip", "ON_THE_WAY_DESTINATION", "TRIP_DESTINATION_TRAVEL", "ARRIVED_DESTINATION", 4, TimingDurationMode.PER_CELL_DURATION],
];

export function initializeDefaultWorkflowTimingProfile() {
  return {
    workflow_timing_profile_id: "WTP-001",
    profile_name: "标准运营工作流时效",
    profile_version: 1,
    profile_status: "ACTIVE",
    description: "用于模拟完成后计算业务状态时间线，不控制 Tick 执行速度。",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    timing_rules: RULE_DEFINITIONS.map((definition, index) => createRule(definition, index)),
  };
}

export function updateWorkflowTimingRule(profile, ruleId, value) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  return {
    ...profile,
    profile_version: Number(profile.profile_version || 0) + 1,
    updated_at: new Date().toISOString(),
    timing_rules: profile.timing_rules.map((rule) => rule.workflow_timing_rule_id === ruleId
      ? {
        ...rule,
        ...(rule.duration_mode === TimingDurationMode.PER_CELL_DURATION
          ? { seconds_per_cell: seconds }
          : { configured_duration_seconds: seconds }),
      }
      : rule),
  };
}

export function createBusinessTimingCalculation({
  simulationRun,
  profile,
  businessData,
  calculationRunId,
  algorithmVersion = "1.0.0",
}) {
  const startedAt = new Date().toISOString();
  const errors = [];
  const ruleMap = new Map(profile.timing_rules.map((rule) => [ruleKey(rule.business_object_type, rule.from_status, rule.action_type), rule]));
  const calculationContext = { calculationRunId, ruleMap, errors, businessData };

  const readinessTasks = mapRunObjects(businessData.readinessTasks, simulationRun, (item) => calculateReadinessTimeline(item, calculationContext));
  const routeResult = calculateDeploymentTimelines(businessData.deploymentTasks, businessData.routeExecutions, simulationRun, calculationContext);
  const serviceResult = calculateServiceTimelines(businessData.serviceOrders, businessData.trips, simulationRun, calculationContext);
  const derived = calculateDerivedRecords(businessData, simulationRun, calculationRunId);

  const objectCount = readinessTasks.length + routeResult.deploymentTasks.length + routeResult.routeExecutions.length
    + serviceResult.serviceOrders.length + serviceResult.trips.length + derived.objectCount;
  const failedObjectIds = new Set(errors.map((error) => error.business_object_id).filter(Boolean));
  const status = objectCount > 0 && failedObjectIds.size === objectCount
    ? TimingCalculationStatus.FAILED
    : errors.length > 0 || simulationRun.simulation_status !== "COMPLETED"
      ? TimingCalculationStatus.PARTIALLY_SUCCEEDED
      : TimingCalculationStatus.SUCCEEDED;
  const transitionCount = [
    ...readinessTasks,
    ...routeResult.deploymentTasks,
    ...routeResult.routeExecutions,
    ...serviceResult.serviceOrders,
    ...serviceResult.trips,
  ].reduce((total, item) => total + (item.simulation_status_transition_history?.length || 0), 0);

  return {
    businessData: {
      readinessTasks,
      deploymentTasks: routeResult.deploymentTasks,
      routeExecutions: routeResult.routeExecutions,
      serviceOrders: serviceResult.serviceOrders,
      trips: serviceResult.trips,
      pricingStrategyRuns: derived.pricingStrategyRuns,
      pricingDecisions: derived.pricingDecisions,
      orderMatchingRuns: derived.orderMatchingRuns,
      orderMatchingDecisions: derived.orderMatchingDecisions,
      routePlanningRuns: derived.routePlanningRuns,
      demandSimulationRuns: derived.demandSimulationRuns,
    },
    calculationRun: {
      business_timing_calculation_run_id: calculationRunId,
      simulation_run_id: simulationRun.simulation_run_id,
      simulation_timeline_id: simulationRun.simulation_timeline_id,
      workflow_timing_profile_id: profile.workflow_timing_profile_id,
      workflow_timing_profile_version: profile.profile_version,
      timing_profile_snapshot: clone(profile),
      calculation_status: status,
      calculation_progress_percent: 100,
      total_object_count: objectCount,
      processed_object_count: objectCount,
      total_transition_count: transitionCount,
      success_object_count: Math.max(0, objectCount - failedObjectIds.size),
      failed_object_count: failedObjectIds.size,
      calculation_errors: errors,
      algorithm_version: algorithmVersion,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    },
  };
}

function calculateReadinessTimeline(item, context) {
  const timeline = createTimeline(item, "readinessTask", "WAITING_ASSIGNMENT", context);
  advance(timeline, "readinessTask", "READINESS_TASK_ASSIGN", context);
  advance(timeline, "readinessTask", "READINESS_TASK_START", context);
  advance(timeline, "readinessTask", "READINESS_TASK_PASS", context);
  return projectTimeline(item, timeline, context.calculationRunId);
}

function calculateDeploymentTimelines(deploymentTasks = [], routeExecutions = [], simulationRun, context) {
  const deploymentById = new Map();
  const executionById = new Map();
  mapRunObjects(deploymentTasks, simulationRun).forEach((item) => deploymentById.set(item.task_id, item));
  mapRunObjects(routeExecutions, simulationRun).forEach((item) => executionById.set(item.route_execution_id, item));

  for (const execution of executionById.values()) {
    const taskId = execution.deployment_task_id || execution.task_id;
    const task = deploymentById.get(taskId);
    const anchor = earliestSimulationSeconds(execution, task);
    const routeTimeline = createTimeline(execution, "routeExecution", "WAITING_ROUTE", context, anchor);
    const taskTimeline = task ? createTimeline(task, "deploymentTask", "WAITING_START", context, anchor) : null;
    const moving = advance(routeTimeline, "routeExecution", "ROUTE_PLAN", context);
    if (taskTimeline && moving) appendProjected(taskTimeline, "WAITING_START", "ROUTE_PLAN", "MOVING", moving);
    const arrived = advance(routeTimeline, "routeExecution", "ROUTE_EXECUTION_STEP", context, movementSteps(execution, context.businessData));
    if (taskTimeline && arrived) appendProjected(taskTimeline, "MOVING", "ROUTE_EXECUTION_STEP", "ARRIVED", arrived);
    const completed = advance(routeTimeline, "routeExecution", "ARRIVAL_CONFIRM", context);
    if (taskTimeline && completed) appendProjected(taskTimeline, "ARRIVED", "ARRIVAL_CONFIRM", "COMPLETED", completed);
    executionById.set(execution.route_execution_id, projectTimeline(execution, routeTimeline, context.calculationRunId));
    if (task && taskTimeline) deploymentById.set(task.task_id, projectTimeline(task, taskTimeline, context.calculationRunId));
  }

  for (const task of deploymentById.values()) {
    if (task.business_timing_calculation_status) continue;
    const timeline = createTimeline(task, "deploymentTask", "WAITING_START", context);
    addError(context, "DEPENDENCY_MISSING", "deploymentTask", task.task_id, "未找到关联运营行驶记录");
    deploymentById.set(task.task_id, projectTimeline(task, timeline, context.calculationRunId, "FAILED"));
  }
  return { deploymentTasks: [...deploymentById.values()], routeExecutions: [...executionById.values()] };
}

function calculateServiceTimelines(serviceOrders = [], trips = [], simulationRun, context) {
  const orderById = new Map();
  const tripById = new Map();
  mapRunObjects(serviceOrders, simulationRun).forEach((item) => orderById.set(item.service_order_id, item));
  mapRunObjects(trips, simulationRun).forEach((item) => tripById.set(item.trip_id, item));

  for (const order of orderById.values()) {
    const orderTimeline = createTimeline(order, "serviceOrder", "CREATED", context);
    advance(orderTimeline, "serviceOrder", "PRICING_EXECUTE", context);
    advance(orderTimeline, "serviceOrder", "ROBOTAXI_CALL", context);
    const matched = advance(orderTimeline, "serviceOrder", "ORDER_MATCHING_EXECUTE", context);
    const trip = tripById.get(order.trip_id) || [...tripById.values()].find((item) => item.service_order_id === order.service_order_id);
    if (trip && matched) {
      const tripTimeline = createTimeline(trip, "trip", "PENDING", context, matched.calculatedSeconds);
      advance(tripTimeline, "trip", "TRIP_START", context);
      advance(tripTimeline, "trip", "TRIP_PICKUP_TRAVEL", context, tripMovementSteps(trip, context.businessData, "PICKUP"));
      advance(tripTimeline, "trip", "PASSENGER_BOARD", context);
      advance(tripTimeline, "trip", "TRIP_DEPART", context);
      const arrived = advance(tripTimeline, "trip", "TRIP_DESTINATION_TRAVEL", context, tripMovementSteps(trip, context.businessData, "DESTINATION"));
      if (arrived) appendProjected(orderTimeline, "VEHICLE_ASSIGNED", "TRIP_DESTINATION_TRAVEL", "ARRIVED_DESTINATION", arrived);
      tripById.set(trip.trip_id, projectTimeline(trip, tripTimeline, context.calculationRunId));
    } else if (!trip) {
      addError(context, "DEPENDENCY_MISSING", "serviceOrder", order.service_order_id, "未找到关联履约行驶记录");
    }
    if (orderTimeline.currentStatus === "ARRIVED_DESTINATION") {
      advance(orderTimeline, "serviceOrder", "SETTLEMENT_EXECUTE", context);
      advance(orderTimeline, "serviceOrder", "PAYMENT_EXECUTE", context);
    }
    orderById.set(order.service_order_id, projectTimeline(order, orderTimeline, context.calculationRunId, trip ? null : "PARTIALLY_SUCCEEDED"));
  }
  return { serviceOrders: [...orderById.values()], trips: [...tripById.values()] };
}

function calculateDerivedRecords(data, simulationRun, calculationRunId) {
  const keys = ["pricingStrategyRuns", "pricingDecisions", "orderMatchingRuns", "orderMatchingDecisions", "routePlanningRuns", "demandSimulationRuns"];
  const result = { objectCount: 0 };
  for (const key of keys) {
    result[key] = mapRunObjects(data[key], simulationRun).map((item) => {
      result.objectCount += 1;
      return {
        ...item,
        calculated_simulation_created_at: item.simulation_created_at || null,
        active_business_timing_calculation_run_id: calculationRunId,
        business_timing_calculation_status: "SUCCEEDED",
      };
    });
  }
  return result;
}

function createTimeline(item, objectType, initialStatus, context, anchor = null) {
  const seconds = anchor ?? parseSimulationTimestamp(item.simulation_created_at);
  const history = [{
    status_transition_id: `${context.calculationRunId}-${objectId(item, objectType)}-001`,
    transition_sequence: 1,
    from_status: null,
    action_type: `${objectType.toUpperCase()}_CREATE`,
    result_type: "SUCCESS",
    to_status: initialStatus,
    calculated_simulation_action_started_at: formatSimulationTimestamp(seconds),
    configured_duration_seconds: 0,
    movement_step_count: null,
    seconds_per_cell: null,
    calculated_simulation_status_changed_at: formatSimulationTimestamp(seconds),
    workflow_timing_rule_id: null,
    source_transition_id: null,
    business_timing_calculation_run_id: context.calculationRunId,
  }];
  return { item, objectType, history, currentStatus: initialStatus, currentSeconds: seconds };
}

function advance(timeline, objectType, actionType, context, stepCount = null) {
  const rule = context.ruleMap.get(ruleKey(objectType, timeline.currentStatus, actionType));
  if (!rule) {
    addError(context, "TIMING_RULE_MISSING", objectType, objectId(timeline.item, objectType), `${timeline.currentStatus} / ${actionType} 缺少时效规则`);
    return null;
  }
  const duration = rule.duration_mode === TimingDurationMode.PER_CELL_DURATION
    ? Math.max(0, Number(stepCount) || 0) * Math.max(0, Number(rule.seconds_per_cell) || 0)
    : Math.max(0, Number(rule.configured_duration_seconds) || 0);
  if (rule.duration_mode === TimingDurationMode.PER_CELL_DURATION && !(Number(stepCount) > 0)) {
    addError(context, "ROUTE_DATA_MISSING", objectType, objectId(timeline.item, objectType), `${actionType} 缺少有效移动步数`);
  }
  const started = timeline.currentSeconds;
  const changed = started + duration;
  const transition = createTransition(timeline, rule, actionType, duration, changed, stepCount);
  timeline.history.push(transition);
  timeline.currentStatus = rule.to_status;
  timeline.currentSeconds = changed;
  return { transition, calculatedSeconds: changed };
}

function appendProjected(timeline, fromStatus, actionType, toStatus, source) {
  const sourceTransition = source.transition;
  timeline.currentStatus = toStatus;
  timeline.currentSeconds = source.calculatedSeconds;
  timeline.history.push({
    ...sourceTransition,
    status_transition_id: `${timeline.history[0].business_timing_calculation_run_id}-${objectId(timeline.item, timeline.objectType)}-${String(timeline.history.length + 1).padStart(3, "0")}`,
    transition_sequence: timeline.history.length + 1,
    from_status: fromStatus,
    action_type: actionType,
    to_status: toStatus,
    source_transition_id: sourceTransition.status_transition_id,
  });
}

function projectTimeline(item, timeline, calculationRunId, forcedStatus = null) {
  const last = timeline.history[timeline.history.length - 1];
  const completed = ["COMPLETED", "FAILED", "CANCELLED"].includes(last.to_status);
  const matched = timeline.history.find((entry) => entry.to_status === "VEHICLE_ASSIGNED");
  const paid = timeline.objectType === "serviceOrder" && last.to_status === "COMPLETED" ? last : null;
  return {
    ...item,
    business_timing_calculation_status: forcedStatus || "SUCCEEDED",
    active_business_timing_calculation_run_id: calculationRunId,
    calculated_simulation_created_at: timeline.history[0].calculated_simulation_status_changed_at,
    calculated_simulation_updated_at: last.calculated_simulation_status_changed_at,
    calculated_simulation_completed_at: completed ? last.calculated_simulation_status_changed_at : null,
    calculated_simulation_matched_at: matched?.calculated_simulation_status_changed_at || null,
    calculated_simulation_payment_completed_at: paid?.calculated_simulation_status_changed_at || null,
    simulation_status_transition_history: timeline.history,
    business_timing_validation_result: forcedStatus === "FAILED" ? "FAIL" : "PASS",
    business_timing_failure_reason: forcedStatus ? "存在未完成的时间依赖" : null,
  };
}

function createTransition(timeline, rule, actionType, duration, changed, stepCount) {
  return {
    status_transition_id: `${timeline.history[0].business_timing_calculation_run_id}-${objectId(timeline.item, timeline.objectType)}-${String(timeline.history.length + 1).padStart(3, "0")}`,
    transition_sequence: timeline.history.length + 1,
    from_status: timeline.currentStatus,
    action_type: actionType,
    result_type: "SUCCESS",
    to_status: rule.to_status,
    calculated_simulation_action_started_at: formatSimulationTimestamp(timeline.currentSeconds),
    configured_duration_seconds: duration,
    movement_step_count: rule.duration_mode === TimingDurationMode.PER_CELL_DURATION ? Math.max(0, Number(stepCount) || 0) : null,
    seconds_per_cell: rule.duration_mode === TimingDurationMode.PER_CELL_DURATION ? rule.seconds_per_cell : null,
    calculated_simulation_status_changed_at: formatSimulationTimestamp(changed),
    workflow_timing_rule_id: rule.workflow_timing_rule_id,
    source_transition_id: timeline.history[timeline.history.length - 1]?.status_transition_id || null,
    business_timing_calculation_run_id: timeline.history[0].business_timing_calculation_run_id,
  };
}

function createRule(definition, index) {
  const [businessObjectType, fromStatus, actionType, toStatus, duration, durationMode = TimingDurationMode.FIXED_DURATION] = definition;
  return {
    workflow_timing_rule_id: `WTR-${String(index + 1).padStart(3, "0")}`,
    business_object_type: businessObjectType,
    from_status: fromStatus,
    action_type: actionType,
    to_status: toStatus,
    result_type: "SUCCESS",
    duration_mode: durationMode,
    configured_duration_seconds: durationMode === TimingDurationMode.FIXED_DURATION ? duration : null,
    seconds_per_cell: durationMode === TimingDurationMode.PER_CELL_DURATION ? duration : null,
    rule_status: "ACTIVE",
  };
}

function mapRunObjects(items = [], simulationRun, mapper = null) {
  const matched = items.filter((item) => item.simulation_run_id === simulationRun.simulation_run_id);
  return mapper ? matched.map(mapper) : matched;
}

function movementSteps(item, data) {
  const routeId = item.route_id || item.planned_route_id;
  const route = (data.routes || []).find((candidate) => candidate.route_id === routeId);
  if (Array.isArray(route?.route_steps)) return Math.max(0, route.route_steps.length - 1);
  return Math.max(0, Number(item.total_step_count || item.current_step_index) || 0);
}

function tripMovementSteps(trip, data, phase) {
  const history = Array.isArray(trip.route_history) ? trip.route_history : [];
  const routeIds = [trip.route_id, ...history.map((item) => item.route_id)].filter(Boolean);
  const routes = routeIds.map((id) => (data.routes || []).find((route) => route.route_id === id)).filter(Boolean);
  const phaseRoutes = routes.filter((route) => phase === "PICKUP"
    ? ["SERVICE_PICKUP", "SERVICE_ORDER_PICKUP_ROUTE"].includes(route.route_usage_type)
    : ["SERVICE_DROPOFF", "SERVICE_ORDER_DESTINATION_ROUTE"].includes(route.route_usage_type));
  const selected = phaseRoutes.length ? phaseRoutes : routes;
  const total = selected.reduce((sum, route) => sum + Math.max(0, (route.route_steps?.length || 1) - 1), 0);
  if (total > 0) return total;
  const recorded = Math.max(0, Number(trip.total_step_count || trip.current_step_index) || 0);
  return phase === "PICKUP" ? Math.ceil(recorded / 2) : Math.floor(recorded / 2);
}

function earliestSimulationSeconds(...items) {
  const values = items.filter(Boolean).map((item) => parseSimulationTimestamp(item.simulation_created_at));
  return values.length ? Math.min(...values) : 0;
}

function parseSimulationTimestamp(value) {
  const match = String(value || "").match(/Day\s+(\d+)\s+(\d{1,2}):(\d{2}):(\d{2})/i);
  if (!match) return 0;
  return (Number(match[1]) - 1) * 86400 + Number(match[2]) * 3600 + Number(match[3]) * 60 + Number(match[4]);
}

function objectId(item, objectType) {
  const field = {
    readinessTask: "task_id",
    deploymentTask: "task_id",
    routeExecution: "route_execution_id",
    serviceOrder: "service_order_id",
    trip: "trip_id",
  }[objectType];
  return item?.[field] || "UNKNOWN";
}

function ruleKey(objectType, fromStatus, actionType) {
  return `${objectType}:${fromStatus}:${actionType}`;
}

function addError(context, errorType, objectType, objectIdValue, message) {
  context.errors.push({
    error_type: errorType,
    business_object_type: objectType,
    business_object_id: objectIdValue,
    error_message: message,
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
