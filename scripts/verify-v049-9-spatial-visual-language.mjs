import assert from "node:assert/strict";
import fs from "node:fs";
import { CITY_SPATIAL_VISUAL_TOKENS } from "../src/ui/geospatialMapAdapter.js";

const adapterSource = fs.readFileSync("src/ui/geospatialMapAdapter.js", "utf8");
const designSource = fs.readFileSync("doc/01-space-model/12-real-geospatial-operating-map-design.md", "utf8");

assert(CITY_SPATIAL_VISUAL_TOKENS.city);
assert(CITY_SPATIAL_VISUAL_TOKENS.zone);
assert(CITY_SPATIAL_VISUAL_TOKENS.subZone);
assert(CITY_SPATIAL_VISUAL_TOKENS.place.factory, "地点类型视觉合同必须覆盖工厂");
assert(CITY_SPATIAL_VISUAL_TOKENS.serviceArea.pickupDropoff, "服务区域必须具有独立视觉语义");

for (const layerId of [
  "robotaxi-zone-boundaries",
  "robotaxi-sub-zone-boundaries",
  "robotaxi-place-boundaries",
  "robotaxi-service-area-boundaries",
]) {
  assert(adapterSource.includes(layerId), `${layerId} 必须具有独立边界层`);
}

assert(adapterSource.includes('["feature-state", "selected"]'), "地图对象必须具有统一选中状态");
assert(adapterSource.includes('["feature-state", "hovered"]'), "地图对象必须具有统一悬停状态");
assert(adapterSource.includes('["get", "place_type"]'), "地点颜色必须来自地点类型");
assert(adapterSource.includes('["get", "service_area_type"]'), "服务区域颜色必须来自服务区域类型");
assert(adapterSource.includes("featureStateReference"), "标签交互必须映射回正式业务对象");
assert(designSource.includes("城市空间视觉语言"), "空间设计文档必须固定统一视觉语言");
assert(designSource.includes("低饱和半透明填充"), "视觉规则必须保护真实底图可读性");

console.log("v049.9 城市空间视觉语言验证通过");
