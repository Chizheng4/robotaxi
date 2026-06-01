import {
  AutomationLevel,
  AvailabilityStatus,
  MotionStatus,
  OpsCenterStatus,
  ServiceType,
  createOpsCenter,
  createRobotaxi,
} from "../domain/operationsCenterTypes.js?v=20260601-ops";

const ROBOTAXI_COUNT = 20;

export function initializeOperationsCenter() {
  const opsCenter = createOpsCenter({
    ops_center_id: "OC-001",
    ops_center_name: "最小运营测试中心",
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
