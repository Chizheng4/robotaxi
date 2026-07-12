import {
  AutomationLevel,
  AvailabilityStatus,
  MotionStatus,
  OpsCenterStatus,
  ServiceType,
  WorkerRole,
  WorkerStatus,
  createOpsCenter,
  createRobotaxi,
  createWorker,
} from "../domain/operationsCenterTypes.js?v=20260608-v018-bfs-route-planning";
import { ZONE1_OPS_CENTER_CELL_IDS } from "./spatialReferenceData.js?v=20260712-v042-0-5";

const ROBOTAXI_COUNT = 20;
const WORKER_COUNT = 10;

export function initializeOperationsCenter() {
  const opsCenter = createOpsCenter({
    ops_center_id: "OC-001",
    ops_center_name: "最小运营测试中心",
    place_id: "P-006",
    map_id: "M-001",
    cell_ids: ZONE1_OPS_CENTER_CELL_IDS,
    service_area_ids: ["SA-006"],
    operation_capability_zones: [
      createOperationCapabilityZone("CLEANING", ["C-33-32", "C-33-33", "C-33-34", "C-33-35", "C-34-32"], ["C-34-32"]),
      createOperationCapabilityZone("CHARGING", ["C-34-33", "C-35-32"], ["C-35-32"]),
      createOperationCapabilityZone("MAINTENANCE", ["C-34-34", "C-34-35", "C-35-33"], ["C-35-33"]),
      createOperationCapabilityZone("FAILURE_HANDLING", ["C-35-33", "C-35-34", "C-35-35"], ["C-35-33"]),
      createOperationCapabilityZone("RETIREMENT", ["C-34-33", "C-35-32", "C-35-33"], ["C-34-33"]),
    ],
    capacity: 20,
    ops_center_status: OpsCenterStatus.ACTIVE,
    can_receive_robotaxi: true,
    can_park_robotaxi: true,
    can_inspect_robotaxi: true,
    can_clean_robotaxi: true,
    can_charge_robotaxi: true,
    can_repair_robotaxi: true,
    can_release_robotaxi: true,
  });

  return {
    opsCenters: [opsCenter],
    robotaxis: createRobotaxis(opsCenter),
    workers: createWorkers(opsCenter),
  };
}

function createOperationCapabilityZone(taskType, workCellIds, dispatchTargetCellIds) {
  return {
    task_type: taskType,
    capability_type: taskType,
    work_cell_ids: workCellIds,
    parking_cell_ids: workCellIds,
    standby_cell_ids: ["C-35-28", "C-35-29", "C-35-30"],
    access_cell_ids: ["C-35-31"],
    dispatch_target_cell_ids: dispatchTargetCellIds,
  };
}

function createRobotaxis(opsCenter) {
  return Array.from({ length: ROBOTAXI_COUNT }, (_, index) => {
    const batteryPercent = 80 + (index % 21);

    return createRobotaxi({
      robotaxi_id: `RTX-${String(index + 1).padStart(3, "0")}`,
      fleet_id: "FLEET-001",
      model_name: "L4 Robotaxi Standard",
      automation_level: AutomationLevel.L4,
      seat_capacity: 4,
      battery_capacity_kwh: 75,
      max_range_km: 400,
      service_type: ServiceType.PASSENGER_RIDE,
      battery_percent: batteryPercent,
      current_battery_kwh: 75 * batteryPercent / 100,
      estimated_range_km: 400 * batteryPercent / 100,
      availability_status: AvailabilityStatus.PENDING_ADMISSION,
      motion_status: MotionStatus.PARKED,
      current_cell_id: opsCenter.cell_ids[index % opsCenter.cell_ids.length],
      current_route_id: null,
      current_task_id: null,
      current_order_id: null,
      available_for_dispatch: false,
      lifetime_distance_km: 0,
      lifetime_battery_consumed_kwh: 0,
      lifetime_battery_consumed_percent: 0,
      lifetime_charged_energy_kwh: 0,
      completed_service_order_count: 0,
      completed_cleaning_count: 0,
      completed_charging_count: 0,
      completed_maintenance_count: 0,
    });
  });
}

function createWorkers(opsCenter) {
  return Array.from({ length: WORKER_COUNT }, (_, index) => createWorker({
    worker_id: `WK-${String(index + 1).padStart(3, "0")}`,
    ops_center_id: opsCenter.ops_center_id,
    worker_name: `Worker-${String(index + 1).padStart(2, "0")}`,
    worker_role: WorkerRole.INSPECTION_OPERATOR,
    worker_status: WorkerStatus.IDLE,
    time_per_robotaxi: 2,
    max_robotaxi_per_day: 5,
    current_task_id: null,
  }));
}
