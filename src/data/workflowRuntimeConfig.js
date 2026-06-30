import { TimingDurationMode } from "../domain/workflowTransitionRegistry.js";

const RUNTIME_RULES = {
  readiness_check_seconds: {
    objectType: "readinessTask",
    fromState: "CHECKING",
    actionType: "READINESS_TASK_PASS",
    valueKey: "configured_duration_seconds",
  },
  cell_travel_seconds: {
    objectType: "routeExecution",
    fromState: "MOVING",
    actionType: "ROUTE_EXECUTION_STEP",
    valueKey: "seconds_per_cell",
  },
  arrival_detection_seconds: {
    objectType: "routeExecution",
    fromState: "ARRIVED",
    actionType: "ARRIVAL_CONFIRM",
    valueKey: "configured_duration_seconds",
  },
  order_assignment_wait_seconds: {
    objectType: "serviceOrder",
    fromState: "WAITING_ROBOTAXI_ASSIGNMENT",
    actionType: "ORDER_MATCHING_EXECUTE",
    valueKey: "configured_duration_seconds",
  },
  assignment_max_wait_seconds: {
    objectType: "serviceOrder",
    fromState: "WAITING_ROBOTAXI_ASSIGNMENT",
    actionType: "ORDER_MATCHING_EXECUTE",
    valueKey: "configured_duration_seconds",
  },
  order_matching_retry_seconds: {
    objectType: "serviceOrder",
    fromState: "WAITING_ROBOTAXI_ASSIGNMENT",
    actionType: "ORDER_MATCHING_EXECUTE",
    valueKey: "configured_duration_seconds",
  },
  passenger_boarding_seconds: {
    objectType: "trip",
    fromState: "WAITING_CUSTOMER_BOARDING",
    actionType: "PASSENGER_BOARD",
    valueKey: "configured_duration_seconds",
  },
  passenger_dropoff_seconds: {
    objectType: "trip",
    fromState: "ARRIVED_DESTINATION",
    actionType: "PASSENGER_DROPOFF",
    valueKey: "configured_duration_seconds",
  },
  settlement_seconds: {
    objectType: "serviceOrder",
    fromState: "SETTLING",
    actionType: "SETTLEMENT_EXECUTE",
    valueKey: "configured_duration_seconds",
  },
  payment_seconds: {
    objectType: "serviceOrder",
    fromState: "WAITING_PAYMENT",
    actionType: "PAYMENT_EXECUTE",
    valueKey: "configured_duration_seconds",
  },
};

export function getActiveWorkflowTimingProfile(profiles = []) {
  return (profiles || []).find((profile) => profile?.profile_status === "ACTIVE") || profiles?.[0] || null;
}

export function resolveWorkflowRuntimeSeconds({ workflowTimingProfile, key, fallbackSeconds }) {
  const ruleSpec = RUNTIME_RULES[key];
  const rule = ruleSpec ? findTimingRule(workflowTimingProfile, ruleSpec) : null;
  if (!rule) return fallbackSeconds;
  const value = rule ? rule[ruleSpec.valueKey] : null;
  if (value === null || value === undefined) return fallbackSeconds;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : fallbackSeconds;
}

export function resolveTimingRuleSeconds({ workflowTimingProfile, objectType, fromState, actionType, fallbackSeconds }) {
  return resolveTimingRuleDuration({ workflowTimingProfile, objectType, fromState, actionType, fallbackSeconds }).durationSeconds;
}

export function resolveTimingRuleDuration({ workflowTimingProfile, objectType, fromState, actionType, fallbackSeconds, movementStepCount = null }) {
  const rule = findTimingRule(workflowTimingProfile, { objectType, fromState, actionType });
  if (!rule) return { durationSeconds: fallbackSeconds, rule: null, secondsPerCell: null };
  const value = rule.duration_mode === TimingDurationMode.PER_CELL_DURATION
    ? rule.seconds_per_cell
    : rule.configured_duration_seconds;
  const seconds = Number(value);
  const normalizedSeconds = Number.isFinite(seconds) && seconds >= 0 ? seconds : fallbackSeconds;
  const durationSeconds = rule.duration_mode === TimingDurationMode.PER_CELL_DURATION
    ? Math.max(0, Number(movementStepCount) || 0) * Math.max(0, Number(normalizedSeconds) || 0)
    : normalizedSeconds;
  return {
    durationSeconds,
    rule,
    secondsPerCell: rule.duration_mode === TimingDurationMode.PER_CELL_DURATION ? normalizedSeconds : null,
  };
}

function findTimingRule(workflowTimingProfile, { objectType, fromState, actionType }) {
  return (workflowTimingProfile?.timing_rules || []).find((rule) =>
    rule.business_object_type === objectType
    && rule.from_status === fromState
    && rule.action_type === actionType
  );
}
