import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CITY_SPATIAL_VISUAL_TOKENS,
  CITY_SPATIAL_ZOOM_BANDS,
} from "../src/ui/geospatialMapAdapter.js";

const adapterSource = fs.readFileSync(new URL("../src/ui/geospatialMapAdapter.js", import.meta.url), "utf8");
const mainSource = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const indexSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const versionSource = fs.readFileSync(new URL("../VERSION.md", import.meta.url), "utf8");
const releaseVersion = versionSource.match(/^## (v[^\s]+)/m)?.[1];
const cacheVersion = releaseVersion?.replaceAll(".", "-");

assert(CITY_SPATIAL_ZOOM_BANDS.cityScope.min <= 4, "城市范围必须在广州全域视角前开始显示");
assert(CITY_SPATIAL_ZOOM_BANDS.cityScope.fillMax >= 10, "城市底衬必须覆盖城市与行政区过渡视角");
assert(CITY_SPATIAL_ZOOM_BANDS.cityScope.boundaryMax > CITY_SPATIAL_ZOOM_BANDS.cityScope.fillMax, "城市边界应在底衬退出后继续保留");
assert(CITY_SPATIAL_ZOOM_BANDS.cityLabel.max < 9, "平台城市标签进入区级视角后必须退出");
assert(CITY_SPATIAL_ZOOM_BANDS.zone.min <= 6, "正式运营区域必须在城市运营视角可见");
assert(CITY_SPATIAL_ZOOM_BANDS.subZone.min > CITY_SPATIAL_ZOOM_BANDS.zone.min, "二级区域必须晚于一级区域出现");
assert(CITY_SPATIAL_VISUAL_TOKENS.city.opacity >= 0.14, "城市范围底衬对比不足");
assert(CITY_SPATIAL_VISUAL_TOKENS.zone.opacity >= 0.25, "正式运营区域覆盖对比不足");

assert(adapterSource.includes("suppressDuplicateBasemapCityLabels()"), "缺少底图城市标签去重");
assert(adapterSource.includes('"Guangzhou"'), "缺少广州底图标签过滤合同");
assert(adapterSource.includes("shouldSitBelowBasemapLabels(sourceId)"), "空间范围图层未统一置于底图文字下方");
assert(adapterSource.includes("data.cityScopeRendered") || adapterSource.includes("dataset.cityScopeRendered"), "缺少城市范围真实渲染诊断");
assert(adapterSource.includes("dataset.operatingZoneRendered"), "缺少运营区域真实渲染诊断");
assert(adapterSource.includes('map.on("idle", emitVisualDiagnostics)'), "缺少地图稳定后视觉诊断");
assert(adapterSource.includes("Number.isFinite(minzoom) ? { minzoom } : {}"), "图层最小缩放不能以 undefined 传入 MapLibre");
assert(adapterSource.includes("Number.isFinite(maxzoom) ? { maxzoom } : {}"), "图层最大缩放不能以 undefined 传入 MapLibre");
assert(adapterSource.includes("Array.isArray(filter) ? { filter } : {}"), "图层过滤条件不能以 undefined 传入 MapLibre");
assert(adapterSource.includes("type: layer.type || definition.type"), "嵌套空间图层必须继承来源定义的图层类型");
assert(adapterSource.includes("dataset.layerInstallErrorCount"), "缺少图层安装失败计数");
assert(adapterSource.includes("dataset.mapErrorCount"), "缺少地图运行错误计数");
assert(!adapterSource.includes("dataset.businessLayerIds"), "运行诊断不应向 DOM 写入完整图层编号列表");
assert(mainSource.includes("getGeospatialUnavailableMessage(error)"), "城市底图异常必须使用统一用户提示");
assert(mainSource.includes("当前设备暂不支持城市底图，可切换网格仿真继续查看。"), "WebGL 降级提示不完整");
assert(cacheVersion, "无法读取当前发布版本");
assert(mainSource.includes(`geospatialMapAdapter.js?v=20260724-${cacheVersion}`), "地图适配器缓存版本未更新");
assert(indexSource.includes(`?v=${cacheVersion}`), "页面资源缓存版本未更新");

console.log("v049.12.2 城市与运营范围真实渲染合同验证通过");
