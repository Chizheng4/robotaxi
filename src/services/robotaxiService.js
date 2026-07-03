import {
  BatteryOperationStatus,
  CleanlinessStatus,
  FailureSeverity,
  FailureStatus,
  FleetOperationStatus,
  MaintenanceStatus,
  RetirementStatus,
  TaskType,
} from "../domain/taskTypes.js";
import { createFleetOperationTask } from "./fleetOperationTaskService.js";

export function getOperationalHealth(robotaxi, context = {}) {
  return {
    robotaxi_id: robotaxi?.robotaxi_id || null,
    availability_status: robotaxi?.availability_status || null,
    motion_status: robotaxi?.motion_status || null,
    fleet_operation_status: robotaxi?.fleet_operation_status || FleetOperationStatus.NONE,
    cleanliness_status: robotaxi?.cleanliness_status || CleanlinessStatus.CLEAN,
    battery_operation_status: robotaxi?.battery_operation_status || BatteryOperationStatus.ENOUGH,
    maintenance_status: robotaxi?.maintenance_status || MaintenanceStatus.NORMAL,
    failure_status: robotaxi?.failure_status || FailureStatus.NONE,
    retirement_status: robotaxi?.retirement_status || RetirementStatus.ACTIVE,
    current_order_id: robotaxi?.current_order_id || null,
    current_task_id: robotaxi?.current_task_id || null,
    can_accept_service_order: canAcceptServiceOrder(robotaxi, context),
    can_accept_deployment_task: canAcceptDeploymentTask(robotaxi, context),
  };
}

export function canAcceptServiceOrder(robotaxi) {
  return isAvailableBase(robotaxi)
    && !robotaxi.current_order_id
    && !robotaxi.current_task_id;
}

export function canAcceptDeploymentTask(robotaxi) {
  return isAvailableBase(robotaxi)
    && !robotaxi.current_order_id
    && !robotaxi.current_task_id;
}

export function canAcceptSupplyRebalance(robotaxi, context) {
  return canAcceptDeploymentTask(robotaxi, context);
}

export function needsCleaning(robotaxi) {
  return robotaxi?.cleanliness_status === CleanlinessStatus.NEEDS_CLEANING
    || robotaxi?.needs_cleaning === true
    || robotaxi?.fleet_operation_status === FleetOperationStatus.NEED_CLEANING;
}

export function needsCharging(robotaxi) {
  return [BatteryOperationStatus.LOW, BatteryOperationStatus.CRITICAL].includes(robotaxi?.battery_operation_status)
    || robotaxi?.needs_charging === true
    || robotaxi?.fleet_operation_status === FleetOperationStatus.NEED_CHARGING;
}

export function needsMaintenance(robotaxi) {
  return [MaintenanceStatus.DUE, MaintenanceStatus.IN_MAINTENANCE].includes(robotaxi?.maintenance_status)
    || robotaxi?.needs_maintenance === true
    || robotaxi?.fleet_operation_status === FleetOperationStatus.NEED_MAINTENANCE;
}

export function hasActiveFailure(robotaxi) {
  return [FailureStatus.ALERTED, FailureStatus.REMOTE_HANDLING, FailureStatus.BROKEN].includes(robotaxi?.failure_status)
    || robotaxi?.fleet_operation_status === FleetOperationStatus.BROKEN;
}

export function shouldRetire(robotaxi) {
  return robotaxi?.retirement_status === RetirementStatus.RETIREMENT_CANDIDATE
    || robotaxi?.retirement_status === RetirementStatus.RETIRED
    || robotaxi?.availability_status === "RETIRED";
}


export function hasActiveFleetOperationTag(robotaxi) {
  return robotaxi?.needs_cleaning === true
    || robotaxi?.needs_charging === true
    || robotaxi?.needs_maintenance === true
    || hasActiveFailure(robotaxi);
}

export function resolveFleetInterruptionPolicy(robotaxi, currentWork = {}, trigger = {}) {
  const severity = trigger.failure_severity || trigger.severity;
  if (!robotaxi?.current_order_id && !robotaxi?.current_task_id) return "EXECUTE_NOW";
  if ([FailureSeverity.HIGH, FailureSeverity.CRITICAL].includes(severity)) return "INTERRUPT_CURRENT_WORK";
  if (robotaxi.current_order_id) return "WAIT_CURRENT_SERVICE_COMPLETION";
  if (robotaxi.current_task_id && trigger.task_type === TaskType.CHARGING && robotaxi.battery_operation_status === BatteryOperationStatus.CRITICAL) {
    return "INTERRUPT_CURRENT_WORK";
  }
  return currentWork.interruptible ? "INTERRUPTIBLE_WAIT_OR_REROUTE" : "WAIT_CURRENT_WORK_COMPLETION";
}

export function createFleetOperationTaskIfNeeded({ robotaxi, trigger = {}, context = {}, existingTasks = [] } = {}) {
  const taskType = trigger.task_type || resolveNextFleetOperationTaskType(robotaxi);
  if (!taskType) return { created: false, reason: "NO_FLEET_OPERATION_NEEDED" };
  return createFleetOperationTask({ robotaxi, taskType, trigger, context, existingTasks });
}

export function resolveNextFleetOperationTaskType(robotaxi) {
  if (shouldRetire(robotaxi)) return TaskType.RETIREMENT;
  if (hasActiveFailure(robotaxi)) return TaskType.FAILURE_HANDLING;
  if (needsMaintenance(robotaxi)) return TaskType.MAINTENANCE;
  if (needsCharging(robotaxi)) return TaskType.CHARGING;
  if (needsCleaning(robotaxi)) return TaskType.CLEANING;
  return null;
}

export function markUnavailableForFleetOperation(robotaxi, task = {}, occurredAt = null) {
  return {
    ...robotaxi,
    availability_status: "UNAVAILABLE",
    available_for_dispatch: false,
    fleet_operation_status: task.fleet_operation_status || robotaxi.fleet_operation_status || FleetOperationStatus.NONE,
    operation_blocking_reason: task.task_type || task.reason || robotaxi.operation_blocking_reason || null,
    updated_at: occurredAt || robotaxi.updated_at,
  };
}

export function markAvailableAfterFleetOperation(robotaxi, taskResult = {}, occurredAt = null) {
  return {
    ...robotaxi,
    availability_status: "AVAILABLE",
    available_for_dispatch: true,
    fleet_operation_status: FleetOperationStatus.NONE,
    operation_blocking_reason: null,
    pending_fleet_task_type: null,
    pending_fleet_task_id: null,
    current_task_id: null,
    current_task_type: null,
    current_task_status: null,
    cleanliness_status: taskResult.cleanliness_status || robotaxi.cleanliness_status,
    battery_operation_status: taskResult.battery_operation_status || robotaxi.battery_operation_status,
    maintenance_status: taskResult.maintenance_status || robotaxi.maintenance_status,
    failure_status: taskResult.failure_status || FailureStatus.NONE,
    updated_at: occurredAt || robotaxi.updated_at,
  };
}

export function markPendingInspection(robotaxi, reason = null, occurredAt = null) {
  return {
    ...robotaxi,
    availability_status: "PENDING_INSPECTION",
    available_for_dispatch: false,
    fleet_operation_status: FleetOperationStatus.READY_FOR_INSPECTION,
    operation_blocking_reason: reason,
    updated_at: occurredAt || robotaxi.updated_at,
  };
}

export function markRetired(robotaxi, reason = null, occurredAt = null) {
  return {
    ...robotaxi,
    availability_status: "RETIRED",
    available_for_dispatch: false,
    fleet_operation_status: FleetOperationStatus.RETIRED,
    retirement_status: RetirementStatus.RETIRED,
    operation_blocking_reason: reason || "RETIREMENT",
    current_task_id: null,
    current_task_type: null,
    current_task_status: null,
    current_order_id: null,
    updated_at: occurredAt || robotaxi.updated_at,
  };
}

function isAvailableBase(robotaxi) {
  return robotaxi?.availability_status === "AVAILABLE"
    && robotaxi?.retirement_status !== RetirementStatus.RETIRED
    && robotaxi?.failure_status !== FailureStatus.BROKEN
    && robotaxi?.available_for_dispatch !== false;
}
