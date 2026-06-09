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

const ROBOTAXI_COUNT = 20;
const WORKER_COUNT = 10;

export function initializeOperationsCenter() {
  const opsCenter = createOpsCenter({
    ops_center_id: "OC-001",
    ops_center_name: "最小运营测试中心",
    place_id: "P-006",
    map_id: "M-001",
    cell_ids: ["C-34-32", "C-34-33", "C-35-32", "C-35-33"],
    service_area_ids: ["SA-006"],
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
      estimated_range_km: 400 * batteryPercent / 100,
      availability_status: AvailabilityStatus.PENDING_INSPECTION,
      motion_status: MotionStatus.PARKED,
      current_cell_id: opsCenter.cell_ids[index % opsCenter.cell_ids.length],
      current_route_id: null,
      current_task_id: null,
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
