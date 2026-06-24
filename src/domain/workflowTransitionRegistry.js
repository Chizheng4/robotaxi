export const WorkflowTransitionMode = {
  DIRECT: "DIRECT",
  PROJECTED: "PROJECTED",
  COMPATIBILITY: "COMPATIBILITY",
  EXCEPTION: "EXCEPTION",
};

export const TimingDurationMode = {
  FIXED_DURATION: "FIXED_DURATION",
  PER_CELL_DURATION: "PER_CELL_DURATION",
};

const F = TimingDurationMode.FIXED_DURATION;
const C = TimingDurationMode.PER_CELL_DURATION;
const D = WorkflowTransitionMode.DIRECT;
const P = WorkflowTransitionMode.PROJECTED;

export const normalWorkflowTransitions = [
  transition("READINESS_ASSIGN", "readinessTask", "WAITING_ASSIGNMENT", "READINESS_TASK_ASSIGN", "WAITING_CHECK", D, "readiness-assign", F, 3),
  transition("READINESS_START", "readinessTask", "WAITING_CHECK", "READINESS_TASK_START", "CHECKING", D, "readiness-start", F, 5),
  transition("READINESS_PASS", "readinessTask", "CHECKING", "READINESS_TASK_PASS", "COMPLETED", D, "readiness-pass", F, 30, "default_readiness_passed"),

  transition("ROUTE_PLAN", "routeExecution", "WAITING_ROUTE", "ROUTE_PLAN", "MOVING", D, "deployment-route-plan", F, 8),
  transition("ROUTE_MOVE", "routeExecution", "MOVING", "ROUTE_EXECUTION_STEP", "ARRIVED", D, "deployment-route-move", C, 4),
  transition("ROUTE_ARRIVAL", "routeExecution", "ARRIVED", "ARRIVAL_CONFIRM", "COMPLETED", D, "deployment-arrival", F, 3, "default_deployment_arrival_normal"),
  projection("DEPLOYMENT_PLAN", "deploymentTask", "WAITING_START", "ROUTE_PLAN", "MOVING", "deployment-route-plan", F, 8, "routeExecution", "WAITING_ROUTE", "ROUTE_PLAN"),
  projection("DEPLOYMENT_MOVE", "deploymentTask", "MOVING", "ROUTE_EXECUTION_STEP", "ARRIVED", "deployment-route-move", C, 4, "routeExecution", "MOVING", "ROUTE_MOVE"),
  projection("DEPLOYMENT_ARRIVAL", "deploymentTask", "ARRIVED", "ARRIVAL_CONFIRM", "COMPLETED", "deployment-arrival", F, 3, "routeExecution", "ARRIVED", "ROUTE_ARRIVAL"),

  transition("ORDER_PRICE", "serviceOrder", "WAITING_PRICE_ESTIMATE", "PRICING_EXECUTE", "WAITING_ROBOTAXI_CALL", D, "order-price", F, 2, "auto_pricing_enabled"),
  transition("ORDER_CALL", "serviceOrder", "WAITING_ROBOTAXI_CALL", "ROBOTAXI_CALL", "WAITING_ROBOTAXI_ASSIGNMENT", D, "order-call", F, 2),
  transition("ORDER_MATCH", "serviceOrder", "WAITING_ROBOTAXI_ASSIGNMENT", "ORDER_MATCHING_EXECUTE", "ON_THE_WAY_PICKUP", D, "order-match", F, 4, "auto_order_matching_enabled"),
  projection("ORDER_PICKUP_ARRIVAL", "serviceOrder", "ON_THE_WAY_PICKUP", "TRIP_STEP_EXECUTE", "WAITING_CUSTOMER_BOARDING", "trip-pickup-move", C, 4, "trip", "ON_THE_WAY_PICKUP", "TRIP_PICKUP_MOVE"),
  projection("ORDER_BOARD", "serviceOrder", "WAITING_CUSTOMER_BOARDING", "PASSENGER_BOARD", "CUSTOMER_ONBOARD", "trip-board", F, 45, "trip", "WAITING_CUSTOMER_BOARDING", "TRIP_BOARD"),
  projection("ORDER_DESTINATION_PLAN", "serviceOrder", "CUSTOMER_ONBOARD", "ROUTE_PLAN", "ON_THE_WAY_DESTINATION", "trip-destination-plan", F, 8, "trip", "CUSTOMER_ONBOARD", "TRIP_DESTINATION_PLAN"),
  projection("ORDER_DESTINATION_ARRIVAL", "serviceOrder", "ON_THE_WAY_DESTINATION", "TRIP_STEP_EXECUTE", "ARRIVED_DESTINATION", "trip-destination-move", C, 4, "trip", "ON_THE_WAY_DESTINATION", "TRIP_DESTINATION_MOVE"),
  projection("ORDER_DROPOFF", "serviceOrder", "ARRIVED_DESTINATION", "PASSENGER_DROPOFF", "SETTLING", "trip-dropoff", F, 30, "trip", "ARRIVED_DESTINATION", "TRIP_DROPOFF"),
  transition("ORDER_SETTLE", "serviceOrder", "SETTLING", "SETTLEMENT_EXECUTE", "WAITING_PAYMENT", D, "order-settlement", F, 5),
  transition("ORDER_PAY", "serviceOrder", "WAITING_PAYMENT", "PAYMENT_EXECUTE", "COMPLETED", D, "order-payment", F, 3, "auto_payment_enabled"),

  transition("TRIP_PICKUP_PLAN", "trip", "WAITING_ROUTE", "ROUTE_PLAN", "ON_THE_WAY_PICKUP", D, "trip-pickup-plan", F, 8, "auto_trip_progress_enabled"),
  transition("TRIP_PICKUP_MOVE", "trip", "ON_THE_WAY_PICKUP", "TRIP_STEP_EXECUTE", "WAITING_CUSTOMER_BOARDING", D, "trip-pickup-move", C, 4, "auto_trip_progress_enabled"),
  transition("TRIP_BOARD", "trip", "WAITING_CUSTOMER_BOARDING", "PASSENGER_BOARD", "CUSTOMER_ONBOARD", D, "trip-board", F, 45, "auto_trip_progress_enabled"),
  transition("TRIP_DESTINATION_PLAN", "trip", "CUSTOMER_ONBOARD", "ROUTE_PLAN", "ON_THE_WAY_DESTINATION", D, "trip-destination-plan", F, 8, "auto_trip_progress_enabled"),
  transition("TRIP_DESTINATION_MOVE", "trip", "ON_THE_WAY_DESTINATION", "TRIP_STEP_EXECUTE", "ARRIVED_DESTINATION", D, "trip-destination-move", C, 4, "auto_trip_progress_enabled"),
  transition("TRIP_DROPOFF", "trip", "ARRIVED_DESTINATION", "PASSENGER_DROPOFF", "COMPLETED", D, "trip-dropoff", F, 30, "auto_trip_progress_enabled"),
];

export const preservedWorkflowTransitions = [
  transition("ORDER_CREATED_COMPAT", "serviceOrder", "CREATED", "PRICING_EXECUTE", "WAITING_ROBOTAXI_CALL", WorkflowTransitionMode.COMPATIBILITY, null, null, null, "auto_pricing_enabled", false),
  transition("ORDER_MATCH_RETRY", "serviceOrder", "ROBOTAXI_ASSIGNMENT_FAILED", "ORDER_MATCHING_EXECUTE", "ON_THE_WAY_PICKUP", WorkflowTransitionMode.EXCEPTION, null, null, null, "auto_order_matching_enabled", false),
  transition("TRIP_PENDING_COMPAT", "trip", "PENDING", "ROUTE_PLAN", "ON_THE_WAY_PICKUP", WorkflowTransitionMode.COMPATIBILITY, null, null, null, "auto_trip_progress_enabled", false),
  transition("TRIP_ASSIGNED_COMPAT", "trip", "ASSIGNED", "ROUTE_PLAN", "ON_THE_WAY_PICKUP", WorkflowTransitionMode.COMPATIBILITY, null, null, null, "auto_trip_progress_enabled", false),
  transition("TRIP_ARRIVED_PICKUP_COMPAT", "trip", "ARRIVED_PICKUP", "PASSENGER_BOARD", "CUSTOMER_ONBOARD", WorkflowTransitionMode.COMPATIBILITY, null, null, null, "auto_trip_progress_enabled", false),
  transition("TRIP_PASSENGER_ONBOARD_COMPAT", "trip", "PASSENGER_ONBOARD", "ROUTE_PLAN", "ON_THE_WAY_DESTINATION", WorkflowTransitionMode.COMPATIBILITY, null, null, null, "auto_trip_progress_enabled", false),
];

export const workflowTransitionRegistry = [...normalWorkflowTransitions, ...preservedWorkflowTransitions];

export function getExecutableTransitions(objectType, fromState) {
  return workflowTransitionRegistry.filter((item) =>
    item.business_object_type === objectType
    && item.from_status === fromState
    && item.transition_mode !== WorkflowTransitionMode.PROJECTED
  );
}

export function getTimingTransitions() {
  return normalWorkflowTransitions.filter((item) => item.timing_enabled !== false);
}

function projection(id, objectType, fromState, actionType, toState, groupId, durationMode, durationValue, sourceObjectType, sourceFromStatus, sourceTransitionId) {
  return {
    ...transition(id, objectType, fromState, actionType, toState, P, groupId, durationMode, durationValue),
    duration_source_type: "INHERITED",
    source_business_object_type: sourceObjectType,
    source_from_status: sourceFromStatus,
    source_transition_definition_id: sourceTransitionId,
  };
}

function transition(id, objectType, fromState, actionType, toState, mode, groupId, durationMode, durationValue, condition = null, timingEnabled = true) {
  return {
    workflow_transition_definition_id: id,
    business_object_type: objectType,
    from_status: fromState,
    action_type: actionType,
    to_status: toState,
    result_type: "SUCCESS",
    transition_mode: mode,
    condition,
    timing_rule_group_id: groupId,
    duration_mode: durationMode,
    default_duration_value: durationValue,
    duration_source_type: mode === P ? "INHERITED" : "CONFIGURED",
    timing_enabled: timingEnabled,
  };
}
