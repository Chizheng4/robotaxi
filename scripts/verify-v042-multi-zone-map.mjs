import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { initializeMapSpace } from "../src/data/mapInitialization.js";
import { validateMapSpace } from "../src/data/mapValidation.js";
import { initializeSpatialBusinessProfiles } from "../src/data/spatialBusinessProfileInitialization.js";
import { getDefaultDeploymentTarget, getRandomDeploymentTarget } from "../src/services/routePlanningService.js";
import { mergeSpatialCatalog } from "../src/services/spatialCatalogService.js";
import { createMapScene, getMapObjectPresentation } from "../src/ui/mapSceneService.js";

const mapData = initializeMapSpace();
const profileData = initializeSpatialBusinessProfiles(mapData);
const data = { ...mapData, ...profileData, robotaxi: [] };
const map = data.maps[0];

assert.equal(map.grid_rows, 40, "地图行数必须保持 40");
assert.equal(map.grid_cols, 84, "双区域地图列数必须为 84");
assert.equal(data.cells.length, 3360, "地图网格总数必须与地图定义一致");
assert.deepEqual(validateMapSpace(data).filter((result) => result.result !== "PASS"), [], "双区域空间初始化必须通过地图校验");

const zone1 = data.zones.find((zone) => zone.zone_id === "Z-001");
const zone2 = data.zones.find((zone) => zone.zone_id === "Z-002");
assert.equal(zone1.cell_ids.length, 1600, "Zone 1 空间边界不得改变");
assert(zone1.cell_ids.every((cellId) => Number(cellId.split("-")[2]) <= 39), "Zone 1 不得跨入 Zone 2");
assert.equal(zone2.zone_status, "Planned", "Zone 2 必须保持规划态");
const outerRing = data.roads.find((road) => road.road_id === "RD-106");
assert.equal(outerRing.road_status, "Planned", "跨区域外围环路必须保持规划态");
assert.equal(outerRing.road_segment_ids.length, 16, "跨区域外围环路必须由连续道路片段构成");
assert(["C-00-00", "C-00-83", "C-39-00", "C-39-83"].every((cellId) => data.roadNodes.some((node) => node.cell_id === cellId)), "外围环路四角必须存在道路节点");
assert(data.roadSegments.some((segment) => segment.road_segment_id === "RS-015" && segment.cell_sequence.includes("C-12-40")), "两个区域必须通过中部道路连接");

const exactIds = (records, field, prefix) => records
  .filter((record) => record[field].startsWith(prefix) && Number(record[field].split("-")[1]) < 100)
  .map((record) => record[field])
  .sort();
assert.deepEqual(exactIds(data.roads, "road_id", "RD-"), ["RD-001", "RD-002", "RD-003", "RD-004", "RD-005", "RD-006"], "Zone 1 道路编号不得改写");
assert.deepEqual(exactIds(data.places, "place_id", "P-"), ["P-001", "P-002", "P-003", "P-004", "P-005", "P-006"], "Zone 1 地点编号不得改写");
assert.deepEqual(exactIds(data.serviceAreas, "service_area_id", "SA-"), ["SA-001", "SA-002", "SA-003", "SA-004", "SA-005", "SA-006"], "Zone 1 服务区域编号不得改写");

assert(data.places.filter((place) => place.place_id.startsWith("P-1")).every((place) => place.place_status === "Planned"), "Zone 2 地点必须保持规划态");
const zone1OpsCenterPlace = data.places.find((place) => place.place_id === "P-006");
assert.equal(zone1OpsCenterPlace.cell_ids.length, 12, "Zone 1 运营中心必须使用 3 × 4 的空间范围");
assert(zone1OpsCenterPlace.cell_ids.every((cellId) => data.cells.find((cell) => cell.cell_id === cellId)?.base_cell_type === "PLACE"), "运营中心扩容 Cell 必须保持地点空间类型");
assert(data.serviceAreas.filter((area) => area.service_area_id.startsWith("SA-1")).every((area) => area.service_area_status === "PLANNED"), "Zone 2 服务区域必须保持规划态");
assert(data.demandProfiles.filter((profile) => /-(?:P|SA)-1|Z-002/.test(`${profile.target_object_type}-${profile.target_object_id}`)).every((profile) => profile.profile_status === "DRAFT"), "Zone 2 画像必须保持草稿态");

for (let index = 0; index < 40; index += 1) {
  const options = { originCellId: "C-35-31", seed: `v042-${index}` };
  assert(!getDefaultDeploymentTarget(data, options)?.target_service_area_id.startsWith("SA-1"), "默认投放不得进入规划中的 Zone 2");
  assert(!getRandomDeploymentTarget(data, options)?.target_service_area_id.startsWith("SA-1"), "随机投放不得进入规划中的 Zone 2");
}

const oldSnapshot = {
  ...data,
  maps: [{ ...map, map_name: "旧快照", grid_cols: 40, map_width_m: 2000, total_cells: 1600 }],
  cells: data.cells.filter((cell) => Number(cell.col) < 40),
  roads: data.roads.filter((road) => !road.road_id.startsWith("RD-1") && road.road_id !== "RD-006"),
  roadNodes: data.roadNodes.filter((node) => !node.road_node_id.startsWith("RN-1")),
  roadSegments: data.roadSegments.filter((segment) => !segment.road_segment_id.startsWith("RS-1")),
  places: data.places.filter((place) => !place.place_id.startsWith("P-1")),
  serviceAreas: data.serviceAreas.filter((area) => !area.service_area_id.startsWith("SA-1")).map((area, index) => index === 0 ? { ...area, current_robotaxi_count: 7 } : area),
  zones: data.zones.filter((zone) => !zone.zone_id.startsWith("Z-002")),
  demandProfiles: data.demandProfiles.filter((profile) => !String(profile.target_object_id).match(/^(P|SA)-1|^Z-002/)),
};
const migrated = mergeSpatialCatalog(oldSnapshot, data);
assert.equal(migrated.maps[0].grid_cols, 84, "旧快照必须自动获得当前空间目录");
assert(migrated.zones.some((zone) => zone.zone_id === "Z-002"), "旧快照迁移后必须可见 Zone 2");
assert.equal(migrated.serviceAreas.find((area) => area.service_area_id === "SA-001").current_robotaxi_count, 7, "空间目录升级不得覆盖运行态服务区数据");

const startedAt = performance.now();
let scene;
for (let index = 0; index < 100; index += 1) scene = createMapScene(data);
const elapsedMs = performance.now() - startedAt;
assert(scene.staticNodeCount < 200, "地图不得按全部网格生成交互节点");
assert(elapsedMs < 500, `地图轻量场景生成耗时过高：${elapsedMs.toFixed(2)}ms`);

const zonePresentation = getMapObjectPresentation("zone", "Z-001", data);
assert.equal(zonePresentation.title, zone1.zone_name, "地图名称必须来自当前 Zone 对象");
const changedProfileData = {
  ...data,
  demandProfiles: data.demandProfiles.map((profile) => profile.target_object_id === "Z-001" ? { ...profile, baseline_addressable_daily_orders: 987.65 } : profile),
};
assert.equal(
  getMapObjectPresentation("zone", "Z-001", changedProfileData).fields.find((item) => item.field === "baseline_addressable_daily_orders").value,
  987.65,
  "画像更新后地图必须读取当前画像值，不得保留页面副本",
);

console.log(`v042.0 多区域地图验证通过：100 次场景生成 ${elapsedMs.toFixed(2)}ms，静态节点估算 ${scene.staticNodeCount}`);
