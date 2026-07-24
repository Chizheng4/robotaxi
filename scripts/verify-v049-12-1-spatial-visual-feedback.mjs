import assert from "node:assert/strict";
import fs from "node:fs";

const adapterSource = fs.readFileSync(new URL("../src/ui/geospatialMapAdapter.js", import.meta.url), "utf8");
const catalogSource = fs.readFileSync(new URL("../src/services/geospatialCatalogService.js", import.meta.url), "utf8");
const mainSource = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const styleSource = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const designSource = fs.readFileSync(new URL("../doc/01-space-model/12-real-geospatial-operating-map-design.md", import.meta.url), "utf8");

for (const layerId of [
  "robotaxi-city-outside-mask",
  "robotaxi-city-boundary-halo",
  "robotaxi-city-boundary",
  "robotaxi-zone-boundary-halo",
  "robotaxi-zone-boundaries",
  "robotaxi-sub-zone-boundary-halo",
  "robotaxi-sub-zone-boundaries",
]) {
  assert(adapterSource.includes(layerId), `缺少空间范围图层：${layerId}`);
}

assert.match(adapterSource, /city:\s*\{[^}]*opacity:\s*0\.11/);
assert.match(adapterSource, /zone:\s*\{[^}]*opacity:\s*0\.22/);
assert(catalogSource.includes("createCityBoundaryMask(dataset)"));
assert(catalogSource.includes("boundaryRing.reverse()"));
assert.match(adapterSource, /robotaxi-city-boundary-label".*maxzoom:\s*9/);
assert(mainSource.includes("spatial-plan-action-feedback"));
assert(mainSource.includes('activePlan.operating_spatial_plan_status === "PUBLISHED"'));
assert(mainSource.includes('adapterRef.current?.fitGeometry(publishedFeature.geometry_geojson)'));
assert(styleSource.includes("grid-template-columns: repeat(auto-fit, minmax(96px, 1fr))"));
assert(designSource.includes("城市范围与正式运营区域视觉闭环"));

console.log("v049.12.1 城市范围与发布视觉闭环验证通过");
