import {
  normalizePlanningPolygon,
} from "./geospatialMapAdapter.js?v=v049-13-15";
import {
  CITY_SPATIAL_LAYER_CONTRACT,
  CITY_SPATIAL_LAYER_ORDER,
  CITY_SPATIAL_VISUAL_TOKENS,
  getCitySpatialFitPadding,
  getCitySpatialFillOpacity,
  isCitySpatialLayerVisible,
  normalizeCitySpatialBounds,
} from "./geospatialPresentationContract.js?v=v049-13-15";

const EMPTY_COLLECTION = Object.freeze({ type: "FeatureCollection", features: [] });
const RASTER_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      globalThis.WebGLRenderingContext
      && (canvas.getContext("webgl2") || canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}

export function createGeospatialRasterMapAdapter(options = {}) {
  const Leaflet = globalThis.L;
  if (!Leaflet?.map || !Leaflet?.tileLayer || !Leaflet?.geoJSON) {
    throw new Error("二维地图引擎未加载");
  }

  let currentScene = options.scene;
  let selected = options.selected || null;
  let administrativeSelectionEnabled = false;
  let selectedAdministrativeUnitIds = new Set();
  let currentPhysicalSelection = [];
  let drawingPoints = [];
  let drawingLayer = null;
  let drawingFinish = null;
  let editing = false;
  let destroyed = false;
  const objectLayers = new Map();
  const sceneLayers = new Map();
  const appliedSourceVersions = new Map();
  const initialBounds = toLeafletBounds(currentScene?.bounds, Leaflet);
  const map = Leaflet.map(options.container, {
    attributionControl: true,
    zoomControl: false,
    doubleClickZoom: false,
    preferCanvas: false,
    minZoom: 3,
    maxZoom: 19,
  });

  Leaflet.tileLayer(RASTER_TILE_URL, {
    minZoom: 3,
    maxZoom: 19,
    maxNativeZoom: 19,
    detectRetina: true,
    updateWhenZooming: false,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  if (initialBounds) map.fitBounds(initialBounds, { padding: fitPadding(options.compact), animate: false });
  else map.setView([23.1291, 113.2644], 8);

  map.createPane("robotaxi-city");
  map.createPane("robotaxi-administrative");
  map.createPane("robotaxi-zone");
  map.createPane("robotaxi-place");
  map.createPane("robotaxi-service-area");
  map.createPane("robotaxi-line");
  map.createPane("robotaxi-point");
  setPaneOrder(map);
  installScene({ force: true });

  map.on("zoomend moveend", () => {
    if (destroyed) return;
    applyZoomVisibility();
    options.onViewChange?.(readCamera());
  });
  map.on("click", (event) => {
    if (editing) {
      drawingPoints.push([event.latlng.lng, event.latlng.lat]);
      renderDrawing();
      return;
    }
    if (event.originalEvent?.__robotaxiMapObjectHandled) return;
    options.onBlankClick?.();
  });

  requestAnimationFrame(() => {
    if (destroyed) return;
    map.invalidateSize(false);
    const stableBounds = toLeafletBounds(currentScene?.bounds, Leaflet);
    if (stableBounds) map.fitBounds(stableBounds, { padding: fitPadding(options.compact), animate: false });
    applyZoomVisibility();
    options.onViewChange?.(readCamera());
    options.onStatusChange?.({ status: "RASTER_READY", message: "" });
  });

  function installScene({ force = false } = {}) {
    for (const key of CITY_SPATIAL_LAYER_ORDER) {
      const collection = currentScene?.[key] || EMPTY_COLLECTION;
      const nextVersion = getSceneSourceVersion(currentScene, key, collection);
      if (!force && sceneLayers.has(key) && appliedSourceVersions.get(key) === nextVersion) continue;
      removeSceneLayer(key);
      const group = Leaflet.layerGroup();
      const geoJson = Leaflet.geoJSON(collection, {
        pane: paneFor(key),
        style: (feature) => featureStyle(key, feature, isSelectedFeature(feature)),
        pointToLayer: (feature, latlng) => Leaflet.circleMarker(latlng, pointStyle(key, isSelectedFeature(feature))),
        onEachFeature: (feature, layer) => bindFeature(key, feature, layer),
      });
      geoJson.addTo(group);
      sceneLayers.set(key, group);
      appliedSourceVersions.set(key, nextVersion);
    }
    applyZoomVisibility();
  }

  function bindFeature(key, feature, layer) {
    const properties = feature?.properties || {};
    const objectId = properties.object_id;
    if (objectId) objectLayers.set(`${key}:${objectId}`, { layer, feature, key });
    if (!CITY_SPATIAL_LAYER_CONTRACT[key]?.interactive) return;
    layer.on("mouseover", (event) => {
      if (editing) return;
      applyFeatureStyle(layer, key, feature, "hovered");
      options.onHover?.(properties, toContainerPoint(event));
    });
    layer.on("mouseout", () => {
      applyFeatureStyle(layer, key, feature, isSelectedFeature(feature) ? "selected" : "default");
      options.onHoverEnd?.();
    });
    layer.on("click", (event) => {
      if (editing) return;
      if (event.originalEvent) event.originalEvent.__robotaxiMapObjectHandled = true;
      if (key === "administrativeUnits" && administrativeSelectionEnabled) {
        options.onAdministrativeUnitSelect?.(properties);
        return;
      }
      if (CITY_SPATIAL_LAYER_CONTRACT[key]?.selectable) {
        options.onSelect?.(properties, toContainerPoint(event));
      }
    });
  }

  function toContainerPoint(event) {
    const point = map.latLngToContainerPoint(event.latlng);
    return { x: point.x, y: point.y };
  }

  function applyZoomVisibility() {
    const zoom = map.getZoom();
    for (const [key, group] of sceneLayers) {
      const shouldShow = isCitySpatialLayerVisible(key, zoom);
      if (shouldShow && !map.hasLayer(group)) group.addTo(map);
      if (!shouldShow && map.hasLayer(group)) map.removeLayer(group);
    }
  }

  function updateScene(nextScene) {
    currentScene = nextScene;
    installScene();
  }

  function updateSelection(nextSelected) {
    selected = nextSelected || null;
    for (const { layer, feature, key } of objectLayers.values()) {
      applyFeatureStyle(layer, key, feature, isSelectedFeature(feature) ? "selected" : "default");
    }
  }

  function updateAdministrativeSelection({ enabled = false, selectedIds = [] } = {}) {
    administrativeSelectionEnabled = Boolean(enabled);
    selectedAdministrativeUnitIds = new Set(selectedIds);
    for (const { layer, feature, key } of objectLayers.values()) {
      if (key !== "administrativeUnits") continue;
      applyFeatureStyle(
        layer,
        key,
        feature,
        selectedAdministrativeUnitIds.has(feature?.properties?.object_id) ? "selected" : "default",
      );
    }
  }

  function updatePhysicalSelection(features = []) {
    currentPhysicalSelection = features;
    renderPhysicalSelection();
  }

  function renderPhysicalSelection() {
    const previous = sceneLayers.get("physicalSelection");
    if (previous && map.hasLayer(previous)) map.removeLayer(previous);
    const collection = {
      type: "FeatureCollection",
      features: currentPhysicalSelection
        .filter((feature) => ["Polygon", "MultiPolygon"].includes(feature?.source_feature_geometry?.type))
        .map((feature, index) => ({
          type: "Feature",
          properties: { object_id: feature.source_feature_id || `physical-${index + 1}` },
          geometry: feature.source_feature_geometry,
        })),
    };
    const layer = Leaflet.geoJSON(collection, {
      pane: "robotaxi-service-area",
      style: { color: "#2f6f9d", weight: 2, opacity: 0.94, fillColor: "#5f91c9", fillOpacity: 0.22 },
    }).addTo(map);
    sceneLayers.set("physicalSelection", layer);
  }

  function fitScene() {
    const bounds = toLeafletBounds(currentScene?.bounds, Leaflet);
    if (bounds) map.fitBounds(bounds, { padding: fitPadding(options.compact), animate: true, duration: 0.24 });
  }

  function fitGeometry(geometry) {
    const layer = Leaflet.geoJSON({ type: "Feature", properties: {}, geometry });
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        paddingTopLeft: options.compact ? [48, 48] : [360, 84],
        paddingBottomRight: options.compact ? [48, 48] : [72, 72],
        maxZoom: 15,
        animate: true,
      });
    }
  }

  function focusPlanningParent(geometry, targetType) {
    if (geometry) {
      fitGeometry(geometry);
      return;
    }
    const minimumZoom = { ZONE: 8, PLACE: 13, SERVICE_AREA: 15 }[targetType] || 8;
    if (map.getZoom() < minimumZoom) map.setZoom(minimumZoom);
  }

  function startPolygonDrawing(onFinish) {
    stopDrawing();
    editing = true;
    drawingFinish = onFinish;
    options.container.classList.add("is-drawing");
  }

  function startPolygonEditing(geometry) {
    stopDrawing();
    const normalized = normalizePlanningPolygon(geometry);
    if (!normalized) throw new Error("当前对象没有可编辑的多边形边界");
    drawingPoints = normalized.coordinates[0].slice(0, -1);
    editing = true;
    options.container.classList.add("is-drawing");
    renderDrawing();
    fitGeometry(normalized);
  }

  function renderDrawing() {
    if (drawingLayer && map.hasLayer(drawingLayer)) map.removeLayer(drawingLayer);
    if (!drawingPoints.length) return;
    const latLngs = drawingPoints.map(([longitude, latitude]) => [latitude, longitude]);
    drawingLayer = (drawingPoints.length > 2
      ? Leaflet.polygon(latLngs, drawingStyle())
      : Leaflet.polyline(latLngs, drawingStyle())
    ).addTo(map);
  }

  function getDrawingGeometry() {
    return normalizePlanningPolygon({
      type: "LineString",
      coordinates: drawingPoints,
    });
  }

  function finishPolygonDrawing() {
    const geometry = getDrawingGeometry();
    if (!geometry) return { ok: false, message: "请至少选择三个不同的边界点" };
    editing = false;
    options.container.classList.remove("is-drawing");
    drawingFinish?.(geometry);
    drawingFinish = null;
    renderDrawing();
    return { ok: true, geometry };
  }

  function stopDrawing() {
    editing = false;
    drawingFinish = null;
    drawingPoints = [];
    options.container.classList.remove("is-drawing");
    if (drawingLayer && map.hasLayer(drawingLayer)) map.removeLayer(drawingLayer);
    drawingLayer = null;
  }

  function inspectPlanningGeometry() {
    return {
      status: "READY",
      message: "二维地图模式保留运营空间规划；底图物理要素采集需在 WebGL 模式完成",
      features: [],
      zoom: map.getZoom(),
      source_layer_count: 0,
    };
  }

  function readCamera() {
    const center = map.getCenter();
    return { center: [center.lng, center.lat], zoom: map.getZoom(), bearing: 0, pitch: 0 };
  }

  function clearSceneLayers() {
    for (const key of [...sceneLayers.keys()]) removeSceneLayer(key);
    sceneLayers.clear();
    objectLayers.clear();
    appliedSourceVersions.clear();
  }

  function removeSceneLayer(key) {
    const layer = sceneLayers.get(key);
    if (layer && map.hasLayer(layer)) map.removeLayer(layer);
    sceneLayers.delete(key);
    appliedSourceVersions.delete(key);
    const prefix = `${key}:`;
    for (const objectKey of objectLayers.keys()) {
      if (objectKey.startsWith(prefix)) objectLayers.delete(objectKey);
    }
  }

  return {
    renderer: "LEAFLET_RASTER",
    updateScene,
    updateSelection,
    updateAdministrativeSelection,
    updatePhysicalSelection,
    fitScene,
    fitGeometry,
    getCameraState: readCamera,
    zoomBy: (delta) => map.setZoom(Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), map.getZoom() + delta))),
    focusPlanningParent,
    inspectPlanningGeometry,
    startPolygonDrawing,
    finishPolygonDrawing,
    startPolygonEditing,
    getDrawingGeometry,
    restartPolygonDrawing: startPolygonDrawing,
    undoDrawing() {
      if (!editing || !drawingPoints.length) return false;
      drawingPoints.pop();
      renderDrawing();
      return true;
    },
    redoDrawing: () => false,
    clearDrawing: stopDrawing,
    stopDrawing,
    resize: () => map.invalidateSize(false),
    destroy() {
      destroyed = true;
      stopDrawing();
      clearSceneLayers();
      map.remove();
    },
  };

  function isSelectedFeature(feature) {
    const properties = feature?.properties || {};
    const objectId = properties.object_id;
    if (administrativeSelectionEnabled && selectedAdministrativeUnitIds.has(objectId)) return true;
    if (!selected || !objectId) return false;
    return selected.id === objectId && normalizeSelectedType(selected.type) === normalizeLayerType(properties.object_type);
  }
}

function applyFeatureStyle(layer, key, feature, state) {
  const selected = state === "selected";
  const hovered = state === "hovered";
  if (layer.setStyle) layer.setStyle(featureStyle(key, feature, selected, hovered));
  if (layer.setRadius) layer.setStyle(pointStyle(key, selected, hovered));
}

function featureStyle(key, feature, selected = false, hovered = false) {
  const accent = selected ? CITY_SPATIAL_VISUAL_TOKENS.selected : (hovered ? CITY_SPATIAL_VISUAL_TOKENS.hovered : null);
  const state = selected ? "selected" : (hovered ? "hovered" : "default");
  const common = { color: accent || "#8295a6", weight: selected ? 3.2 : (hovered ? 2.4 : 1.2), opacity: 0.9 };
  if (key === "cityBoundary") return { ...common, color: accent || CITY_SPATIAL_VISUAL_TOKENS.city.line, weight: selected ? 4 : (hovered ? 3.2 : 2.6), fillColor: CITY_SPATIAL_VISUAL_TOKENS.city.fill, fillOpacity: getCitySpatialFillOpacity(CITY_SPATIAL_VISUAL_TOKENS.city.opacity, state) };
  if (key === "administrativeUnits") return { ...common, color: accent || "#6f8490", fillColor: selected ? "#5f91c9" : "#ffffff", fillOpacity: getCitySpatialFillOpacity(0.035, state) };
  if (key === "zones") {
    const isSubZone = feature?.properties?.zone_level === "SUB_ZONE";
    const token = isSubZone ? CITY_SPATIAL_VISUAL_TOKENS.subZone : CITY_SPATIAL_VISUAL_TOKENS.zone;
    return { ...common, color: accent || token.line, weight: selected ? 3.6 : (hovered ? 2.8 : 2.2), fillColor: token.fill, fillOpacity: getCitySpatialFillOpacity(token.opacity, state) };
  }
  if (key === "places") return { ...common, color: accent || "#768998", fillColor: placeColor(feature?.properties?.place_type), fillOpacity: getCitySpatialFillOpacity(0.18, state) };
  if (key === "serviceAreas") return { ...common, color: accent || "#477d77", dashArray: "4 3", fillColor: serviceAreaColor(feature?.properties?.service_area_type), fillOpacity: getCitySpatialFillOpacity(0.22, state) };
  if (key === "route") return { color: accent || CITY_SPATIAL_VISUAL_TOKENS.selected, weight: 5, opacity: 0.92 };
  if (key === "roads") return { color: accent || "#8295a6", weight: selected ? 4 : 1.5, opacity: 0.72 };
  return common;
}

function pointStyle(key, selected = false, hovered = false) {
  const isVehicle = key === "robotaxis";
  return {
    pane: "robotaxi-point",
    radius: selected ? 7 : (hovered ? 6 : (isVehicle ? 4 : 6)),
    color: "#ffffff",
    weight: 1.5,
    fillColor: selected ? CITY_SPATIAL_VISUAL_TOKENS.selected : (isVehicle ? "#2f756c" : "#315c82"),
    fillOpacity: 0.94,
  };
}

function paneFor(key) {
  return {
    cityBoundary: "robotaxi-city",
    administrativeUnits: "robotaxi-administrative",
    zones: "robotaxi-zone",
    places: "robotaxi-place",
    serviceAreas: "robotaxi-service-area",
    roads: "robotaxi-line",
    route: "robotaxi-line",
    opsCenters: "robotaxi-point",
    robotaxis: "robotaxi-point",
  }[key] || "overlayPane";
}

function setPaneOrder(map) {
  const order = {
    "robotaxi-city": 410,
    "robotaxi-administrative": 420,
    "robotaxi-zone": 430,
    "robotaxi-place": 440,
    "robotaxi-service-area": 450,
    "robotaxi-line": 460,
    "robotaxi-point": 470,
  };
  for (const [pane, zIndex] of Object.entries(order)) map.getPane(pane).style.zIndex = String(zIndex);
}

function placeColor(type) {
  const colors = CITY_SPATIAL_VISUAL_TOKENS.place;
  return {
    RESIDENTIAL: colors.residential,
    OFFICE: colors.office,
    COMMERCIAL: colors.commercial,
    SCHOOL: colors.school,
    HOSPITAL: colors.hospital,
    METRO_STATION: colors.metro,
    HOTEL: colors.hotel,
    TRANSPORT_HUB: colors.transport,
    OPS_CENTER: colors.opsCenter,
    FACTORY: colors.factory,
  }[type] || colors.fallback;
}

function serviceAreaColor(type) {
  const colors = CITY_SPATIAL_VISUAL_TOKENS.serviceArea;
  return {
    PICKUP_DROPOFF: colors.pickupDropoff,
    TEMP_STOP: colors.temporaryStop,
    PARKING: colors.parking,
    STANDBY: colors.standby,
    MIXED: colors.mixed,
    OPS_CENTER_AREA: colors.opsCenter,
  }[type] || colors.fallback;
}

function normalizeSelectedType(type) {
  return { zone: "ZONE", place: "PLACE", serviceArea: "SERVICE_AREA", opsCenter: "OPS_CENTER", robotaxi: "ROBOTAXI" }[type] || String(type || "").toUpperCase();
}

function normalizeLayerType(type) {
  return String(type || "").replace(/CITY_/g, "");
}

function toLeafletBounds(bounds, Leaflet) {
  const normalized = normalizeCitySpatialBounds(bounds);
  if (!normalized) return null;
  const [[west, south], [east, north]] = normalized;
  return Leaflet.latLngBounds([south, west], [north, east]);
}

function fitPadding(compact) {
  const padding = getCitySpatialFitPadding(compact);
  return [padding, padding];
}

function getSceneSourceVersion(scene, key, collection) {
  const declaredVersion = scene?.sourceVersions?.[key];
  if (declaredVersion !== undefined) return String(declaredVersion);
  const features = collection?.features || [];
  return `${features.length}:${features.map((feature) => (
    feature?.id || feature?.properties?.object_id || ""
  )).join("|")}`;
}

function drawingStyle() {
  return {
    color: CITY_SPATIAL_VISUAL_TOKENS.selected,
    weight: 2.5,
    opacity: 0.96,
    fillColor: CITY_SPATIAL_VISUAL_TOKENS.selected,
    fillOpacity: 0.18,
  };
}
