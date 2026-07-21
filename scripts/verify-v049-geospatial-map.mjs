import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { initializeMapSpace } from "../src/data/mapInitialization.js";
import { GEOSPATIAL_MAP_DATASET, GEOSPATIAL_PROJECTION_CONFIG } from "../src/data/geospatialReferenceData.js";
import { createGeospatialScene, validateGeospatialScene } from "../src/services/geospatialCatalogService.js";

const mapSpace = initializeMapSpace();
const route = {
  route_id: "ROUTE-GEO-VERIFY-001",
  route_status: "PLANNED",
  route_steps: [
    { cell_id: "C-12-10" },
    { cell_id: "C-12-11" },
    { cell_id: "C-12-12" },
  ],
};
const robotaxis = Array.from({ length: 10000 }, (_, index) => ({
  robotaxi_id: `RTX-GEO-${String(index + 1).padStart(5, "0")}`,
  current_cell_id: `C-${String(index % 40).padStart(2, "0")}-${String(index % 84).padStart(2, "0")}`,
  availability_status: "AVAILABLE",
}));

const startedAt = performance.now();
const scene = createGeospatialScene({
  ...mapSpace,
  robotaxis,
  routes: [route],
  selectedRouteId: route.route_id,
}, GEOSPATIAL_MAP_DATASET, GEOSPATIAL_PROJECTION_CONFIG);
const elapsedMs = performance.now() - startedAt;
const validation = validateGeospatialScene(scene);

assert.equal(validation.valid, true, validation.errors.join("；"));
assert.equal(scene.dataset.coordinate_reference_system, "EPSG:4326");
assert.equal(scene.zones.features.length, 2, "双 Zone 地理投影缺失");
assert.equal(scene.places.features.length, mapSpace.places.length, "地点投影数量不一致");
assert.equal(scene.serviceAreas.features.length, mapSpace.serviceAreas.length, "服务区域投影数量不一致");
assert.equal(scene.robotaxis.features.length, 10000, "Robotaxi 地理投影数量不一致");
assert.equal(scene.route.features.length, 1, "选中路径未形成地理 LineString");
assert.ok(scene.route.features[0].geometry.coordinates.length >= 3, "路径几何点不足");
assert.ok(elapsedMs < 500, `10,000 台 Robotaxi 地理投影耗时过高：${elapsedMs.toFixed(2)}ms`);

console.log(`v049.0 真实地理地图验证通过：10,000 台 Robotaxi 投影 ${elapsedMs.toFixed(2)}ms`);

