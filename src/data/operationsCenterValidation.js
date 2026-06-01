import {
  AvailabilityStatus,
  MotionStatus,
} from "../domain/operationsCenterTypes.js?v=20260601-ops";

export function validateOperationsCenter(data) {
  const mapIds = new Set(data.maps.map((map) => map.map_id));
  const cellById = new Map(data.cells.map((cell) => [cell.cell_id, cell]));
  const placeCellIds = new Set(data.places.flatMap((place) => place.cell_ids));
  const serviceAreaById = new Map(data.serviceAreas.map((area) => [area.service_area_id, area]));
  const segmentById = new Map(data.roadSegments.map((segment) => [segment.road_segment_id, segment]));
  const opsCenter = data.opsCenters[0];
  const opsCenterCellIds = new Set(opsCenter?.cell_ids || []);
  const ids = data.robotaxis.map((robotaxi) => robotaxi.robotaxi_id);

  return [
    check("OPS_CENTER_COUNT", "运营中心数量必须为 1", data.opsCenters.length === 1),
    check("OPS_CENTER_MAP_REF", "运营中心必须属于有效地图", mapIds.has(opsCenter?.map_id)),
    check("OPS_CENTER_CELL_REF", "运营中心覆盖网格必须存在", opsCenter?.cell_ids.length > 0 && opsCenter.cell_ids.every((id) => cellById.has(id))),
    check("OPS_CENTER_NO_PLACE_OVERLAP", "运营中心覆盖网格不得与地点重叠", opsCenter?.cell_ids.every((id) => !placeCellIds.has(id))),
    check("OPS_CENTER_CAPACITY", "运营中心容量必须大于等于初始化 Robotaxi 数量", opsCenter?.capacity >= data.robotaxis.length),
    check(
      "OPS_CENTER_REQUIRED_CAPABILITIES",
      "运营中心至少具备接收、停放、检查、投放能力",
      opsCenter?.can_receive_robotaxi && opsCenter.can_park_robotaxi && opsCenter.can_inspect_robotaxi && opsCenter.can_release_robotaxi,
    ),
    check(
      "OPS_CENTER_SERVICE_AREA_REF",
      "运营中心关联的服务区必须存在",
      opsCenter?.service_area_ids.length > 0 && opsCenter.service_area_ids.every((id) => serviceAreaById.has(id)),
    ),
    check(
      "OPS_CENTER_SERVICE_AREA_NEARBY",
      "运营中心关联的服务区必须位于附近接入道路",
      opsCenter?.service_area_ids.every((id) => {
        const area = serviceAreaById.get(id);
        const onAccessRoad = area?.segment_ids.some((segmentId) => segmentById.get(segmentId)?.road_id === "RD-005");
        return onAccessRoad && areCellGroupsNearby(opsCenter.cell_ids, area.covered_cell_ids);
      }),
    ),
    check("ROBOTAXI_COUNT", "Robotaxi 数量必须为 20", data.robotaxis.length === 20, `当前 ${data.robotaxis.length} 台 Robotaxi`),
    check("ROBOTAXI_ID_UNIQUE", "每台 Robotaxi 必须有唯一 robotaxi_id", new Set(ids).size === ids.length),
    check("ROBOTAXI_CELL_IN_OPS_CENTER", "每台 Robotaxi 必须位于运营中心覆盖网格内", data.robotaxis.every((robotaxi) => opsCenterCellIds.has(robotaxi.current_cell_id))),
    check("ROBOTAXI_PENDING_INSPECTION", "每台 Robotaxi 初始状态必须为待运维检查", data.robotaxis.every((robotaxi) => robotaxi.availability_status === AvailabilityStatus.PENDING_INSPECTION)),
    check("ROBOTAXI_PARKED", "每台 Robotaxi 初始运动状态必须为停车中", data.robotaxis.every((robotaxi) => robotaxi.motion_status === MotionStatus.PARKED)),
    check("ROBOTAXI_NO_INITIAL_TASK", "每台 Robotaxi 初始 current_task_id 必须为空", data.robotaxis.every((robotaxi) => robotaxi.current_task_id === null)),
    check("ROBOTAXI_NO_INITIAL_ROUTE", "每台 Robotaxi 初始 current_route_id 必须为空", data.robotaxis.every((robotaxi) => robotaxi.current_route_id === null)),
    check(
      "ROBOTAXI_RANGE_CALCULATION",
      "estimated_range_km 必须由 battery_percent 和 max_range_km 计算得到",
      data.robotaxis.every((robotaxi) => robotaxi.estimated_range_km === robotaxi.max_range_km * robotaxi.battery_percent / 100),
    ),
  ];
}

function areCellGroupsNearby(leftIds, rightIds) {
  return leftIds.some((leftId) =>
    rightIds.some((rightId) => manhattanDistance(parseCellId(leftId), parseCellId(rightId)) <= 4)
  );
}

function manhattanDistance(left, right) {
  return Math.abs(left.row - right.row) + Math.abs(left.col - right.col);
}

function parseCellId(cellId) {
  const [, row, col] = cellId.split("-");
  return {
    row: Number(row),
    col: Number(col),
  };
}

function check(rule_id, rule_name, passed, detail = "") {
  return {
    rule_id,
    rule_name,
    result: passed ? "PASS" : "FAIL",
    detail,
  };
}
