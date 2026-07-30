import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CITY_SPATIAL_VISUAL_TOKENS,
  CITY_SPATIAL_ZOOM_BANDS,
  CITY_SPATIAL_LAYER_CONTRACT,
  createCitySpatialHoverPresentation,
  getCitySpatialFillOpacity,
  isCitySpatialLayerVisible,
  normalizeCitySpatialBounds,
} from "../src/ui/geospatialPresentationContract.js";

const adapterSource = fs.readFileSync(new URL("../src/ui/geospatialMapAdapter.js", import.meta.url), "utf8");
const presentationContractSource = fs.readFileSync(new URL("../src/ui/geospatialPresentationContract.js", import.meta.url), "utf8");
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
assert(CITY_SPATIAL_LAYER_CONTRACT.cityBoundary.interactive, "城市范围必须支持统一悬浮反馈");
assert(CITY_SPATIAL_LAYER_CONTRACT.administrativeUnits.interactive, "行政区域必须支持统一悬浮反馈");
assert.equal(CITY_SPATIAL_LAYER_CONTRACT.cityBoundary.selectable, false, "城市物理范围不能被业务对象选择");
assert(getCitySpatialFillOpacity(0.15, "hovered") > getCitySpatialFillOpacity(0.15), "悬浮区域必须产生清晰视觉反馈");
assert(isCitySpatialLayerVisible("zones", 8), "运营区域必须在城市运营视角显示");
assert(!isCitySpatialLayerVisible("places", 8), "地点不得在城市级视角制造信息噪音");
assert.deepEqual(normalizeCitySpatialBounds([[112, 22], [114, 24]]), [[112, 22], [114, 24]], "地图边界合同异常");
assert.equal(normalizeCitySpatialBounds([[114, 24], [112, 22]]), null, "无效地图边界必须被拒绝");
assert.deepEqual(createCitySpatialHoverPresentation({
  object_type: "cityBoundary",
  object_id: "CN-44-440100",
  object_name: "广州市行政范围",
}), {
  title: "广州市行政范围",
  subtitle: "城市行政范围",
  fields: [],
});
assert.deepEqual(createCitySpatialHoverPresentation({
  object_type: "administrativeUnit",
  object_id: "CN-44-440103",
  object_name: "荔湾区",
}), {
  title: "荔湾区",
  subtitle: "城市行政区",
  fields: [],
});

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
assert(adapterSource.includes("export function supportsWebGL()"), "MapLibre 适配器缺少 WebGL 能力检测");
assert(mainSource.includes("geospatialMapAdapter.supportsWebGL()"), "城市地图入口未校验完整引擎能力");
assert(mainSource.includes('status: "UNAVAILABLE"'), "引擎不可用时缺少诚实的不可用状态");
assert(mainSource.includes("城市空间规划暂不可用"), "不可用状态未明确关闭城市空间规划");
assert(mainSource.includes("切换网格仿真"), "不可用状态缺少网格仿真切换入口");
assert(!mainSource.includes("geospatialRasterMapAdapter"), "运行主路径不得依赖第二地图引擎");
assert(!mainSource.includes("activateRasterRenderer"), "运行主路径不得保留双引擎切换");
assert(!mainSource.includes('status: "RASTER_READY"'), "运行主路径不得保留二维引擎状态");
assert(!mainSource.includes("GeospatialCompatibilityMap"), "不得重新引入静态城市地图占位实现");
assert(adapterSource.includes("CITY_SPATIAL_LAYER_CONTRACT"), "矢量地图不得脱离统一对象交互合同");
assert(presentationContractSource.includes("CITY_SPATIAL_LAYER_CONTRACT"), "缺少统一地图交付合同");
assert(mainSource.includes("hoverEndTimerRef"), "重叠空间图层必须共享悬停交接机制");
assert(mainSource.includes("clearTimeout(hoverEndTimerRef.current)"), "进入相邻空间图层时必须取消过早清除浮动信息");
assert(mainSource.includes("containerRef.current.replaceChildren()"), "地图重试前必须清理失败的引擎节点");
assert(adapterSource.includes("cloneFallbackStyle()"), "外部底图失败必须保留 MapLibre 本地样式");
assert(adapterSource.includes("已保留运营对象图层"), "底图失败状态必须说明运营对象仍可用");
assert(!indexSource.toLowerCase().includes("leaflet"), "页面不得加载 Leaflet 资源");
assert(cacheVersion, "无法读取当前发布版本");
assert(mainSource.includes(`geospatialMapAdapter.js?v=${cacheVersion}`), "矢量地图适配器缓存版本未更新");
assert(adapterSource.includes(`geospatialPresentationContract.js?v=${cacheVersion}`), "矢量地图交付合同缓存版本未更新");
assert(indexSource.includes(`?v=${cacheVersion}`), "页面资源缓存版本未更新");

console.log(`${releaseVersion} MapLibre 单引擎城市地图合同验证通过`);
