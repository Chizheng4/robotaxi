export const CITY_SPATIAL_VISUAL_TOKENS = Object.freeze({
  city: { fill: "#6f9d98", opacity: 0.055, line: "#3f7084" },
  zone: { fill: "#78a58e", opacity: 0.145, line: "#4f7868" },
  subZone: { fill: "#78a9ad", opacity: 0.16, line: "#4c7f84" },
  place: {
    fallback: "#a5b3bd",
    residential: "#8fb89f",
    office: "#8ba9c8",
    commercial: "#d4ad68",
    school: "#a2b486",
    hospital: "#c99191",
    metro: "#73aeb1",
    hotel: "#b395b2",
    transport: "#7ea7b7",
    opsCenter: "#6f8a9d",
    factory: "#8d91a6",
  },
  serviceArea: {
    fallback: "#70a99f",
    pickupDropoff: "#5ca698",
    temporaryStop: "#8ea7b5",
    parking: "#839ab1",
    standby: "#8c9f86",
    mixed: "#769ca2",
    opsCenter: "#697f96",
  },
  selected: "#2f6fe4",
  hovered: "#416e83",
});

const SOURCE_DEFINITIONS = Object.freeze({
  cityBoundary: { type: "fill", layers: [
    { layerId: "robotaxi-city-extent-fill", type: "fill", minzoom: 5, maxzoom: 11, interactive: false },
    { layerId: "robotaxi-city-boundary", type: "line", minzoom: 5, maxzoom: 16, interactive: false },
  ] },
  zones: { type: "fill", layers: [
    { layerId: "robotaxi-zones", minzoom: 5, maxzoom: 13, filter: ["!=", ["get", "zone_level"], "SUB_ZONE"] },
    { layerId: "robotaxi-zone-boundaries", type: "line", minzoom: 5, maxzoom: 13, filter: ["!=", ["get", "zone_level"], "SUB_ZONE"], interactive: false },
    { layerId: "robotaxi-sub-zones", minzoom: 9, maxzoom: 15, filter: ["==", ["get", "zone_level"], "SUB_ZONE"] },
    { layerId: "robotaxi-sub-zone-boundaries", type: "line", minzoom: 9, maxzoom: 15, filter: ["==", ["get", "zone_level"], "SUB_ZONE"], interactive: false },
  ] },
  places: { type: "fill", layers: [
    { layerId: "robotaxi-places", type: "fill", minzoom: 12, maxzoom: 18 },
    { layerId: "robotaxi-place-boundaries", type: "line", minzoom: 12, maxzoom: 18, interactive: false },
  ] },
  serviceAreas: { type: "fill", layers: [
    { layerId: "robotaxi-service-areas", type: "fill", minzoom: 14 },
    { layerId: "robotaxi-service-area-boundaries", type: "line", minzoom: 14, interactive: false },
  ] },
  roads: { layerId: "robotaxi-roads", type: "line", minzoom: 13 },
  opsCenters: { layerId: "robotaxi-ops-centers", type: "circle", minzoom: 11 },
  robotaxis: { layerId: "robotaxi-vehicles", type: "circle", minzoom: 14 },
  route: { layerId: "robotaxi-selected-route", type: "line", minzoom: 12 },
});

const LABEL_DEFINITIONS = Object.freeze([
  { sceneKey: "cityBoundary", sourceId: "cityBoundaryLabels", layerId: "robotaxi-city-boundary-label", size: 12, minzoom: 5, maxzoom: 10 },
  { sceneKey: "zones", sourceId: "zoneLabels", layerId: "robotaxi-zone-labels", size: 12, minzoom: 5, maxzoom: 13, filter: ["!=", ["get", "zone_level"], "SUB_ZONE"] },
  { sceneKey: "zones", sourceId: "zoneLabels", layerId: "robotaxi-sub-zone-labels", size: 11, minzoom: 9, maxzoom: 15, filter: ["==", ["get", "zone_level"], "SUB_ZONE"] },
  { sceneKey: "places", sourceId: "placeLabels", layerId: "robotaxi-place-labels", size: 11, minzoom: 12, maxzoom: 18 },
  { sceneKey: "serviceAreas", sourceId: "serviceAreaLabels", layerId: "robotaxi-service-area-labels", size: 10, minzoom: 14 },
]);

const FALLBACK_STYLE = Object.freeze({
  version: 8,
  sources: {},
  layers: [{ id: "fallback-background", type: "background", paint: { "background-color": "#eef3f6" } }],
});

export function createGeospatialMapAdapter(options = {}) {
  const MapLibre = globalThis.maplibregl;
  if (!MapLibre?.Map) throw new Error("地图引擎未加载");
  let currentScene = options.scene;
  let ready = false;
  let destroyed = false;
  let fallbackApplied = false;
  let editing = false;
  let draw = null;
  let activeDrawFinish = null;
  let drawCompletionPending = false;
  let initialCamera = null;
  const appliedSourceVersions = {};
  const map = new MapLibre.Map({
    container: options.container,
    style: currentScene?.dataset?.basemap_style_url || cloneFallbackStyle(),
    bounds: currentScene?.bounds || undefined,
    fitBoundsOptions: { padding: options.compact ? 24 : 52, duration: 0 },
    attributionControl: false,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    maxPitch: 0,
  });

  map.addControl(new MapLibre.AttributionControl({ compact: true }), "bottom-left");

  const styleTimeout = setTimeout(() => {
    if (!ready && !destroyed) applyFallbackStyle();
  }, 5000);

  map.once("load", () => {
    ready = true;
    clearTimeout(styleTimeout);
    installScene();
    initialCamera = readCamera();
    emitViewChange();
  });
  map.on("style.load", () => {
    if (destroyed) return;
    ready = true;
    Object.keys(appliedSourceVersions).forEach((key) => delete appliedSourceVersions[key]);
    installScene();
  });
  map.on("error", (event) => {
    if (!ready && !fallbackApplied) applyFallbackStyle();
    options.onStatusChange?.({ status: fallbackApplied ? "FALLBACK" : "DEGRADED", message: event?.error?.message || "底图加载异常" });
  });
  map.on("moveend", emitViewChange);

  function emitViewChange() {
    if (destroyed) return;
    options.onViewChange?.(readCamera());
  }

  function applyFallbackStyle() {
    if (fallbackApplied || destroyed) return;
    fallbackApplied = true;
    options.onStatusChange?.({ status: "FALLBACK", message: "外部底图暂不可用，已保留运营对象图层" });
    map.setStyle(cloneFallbackStyle());
  }

  function installScene() {
    if (!map.isStyleLoaded()) return;
    for (const [sourceId, definition] of Object.entries(SOURCE_DEFINITIONS)) {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: "geojson", data: currentScene?.[sourceId] || emptyCollection() });
      }
      appliedSourceVersions[sourceId] = currentScene?.sourceVersions?.[sourceId] || "";
      for (const layerDefinition of layerDefinitions(definition)) {
        if (!map.getLayer(layerDefinition.layerId)) {
          const beforeId = layerDefinition.type === "fill" ? firstBasemapLabelLayerId() : undefined;
          const layer = createLayer(sourceId, layerDefinition);
          if (beforeId) map.addLayer(layer, beforeId);
          else map.addLayer(layer);
        }
        if (sourceId !== "cityBoundary" && layerDefinition.interactive !== false) bindLayerEvents(layerDefinition.layerId);
      }
    }
    installLabelLayers();
    updateSelection(options.selected || null);
  }

  function installLabelLayers() {
    if (!map.getStyle()?.glyphs) return;
    for (const definition of LABEL_DEFINITIONS) {
      const { sceneKey, sourceId, layerId, size, minzoom, maxzoom, filter } = definition;
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: "geojson", data: createLabelCollection(currentScene?.[sceneKey]) });
      }
      appliedSourceVersions[sourceId] = currentScene?.sourceVersions?.[sceneKey] || "";
      if (map.getLayer(layerId)) continue;
      map.addLayer({
        id: layerId,
        type: "symbol",
        source: sourceId,
        minzoom,
        maxzoom,
        filter,
        layout: {
          "text-field": ["get", "object_name"],
          "text-size": size,
          "text-font": ["Noto Sans Regular"],
          "text-allow-overlap": false,
          "text-ignore-placement": false,
        },
        paint: {
          "text-color": "#42576a",
          "text-halo-color": "rgba(255,255,255,0.92)",
          "text-halo-width": 1.2,
        },
      });
      if (sceneKey !== "cityBoundary") bindLayerEvents(layerId);
    }
  }

  const boundLayers = new Set();
  let hoveredReference = null;
  function bindLayerEvents(layerId) {
    if (boundLayers.has(layerId)) return;
    boundLayers.add(layerId);
    map.on("mouseenter", layerId, (event) => {
      if (editing) return;
      map.getCanvas().style.cursor = "pointer";
      const feature = event.features?.[0];
      if (feature) {
        updateHoverState(feature);
        options.onHover?.(feature.properties, event.point);
      }
    });
    map.on("mousemove", layerId, (event) => {
      if (editing) return;
      const feature = event.features?.[0];
      if (feature) {
        updateHoverState(feature);
        options.onHover?.(feature.properties, event.point);
      }
    });
    map.on("mouseleave", layerId, () => {
      if (editing) return;
      map.getCanvas().style.cursor = "";
      clearHoverState();
      options.onHoverEnd?.();
    });
    map.on("click", layerId, (event) => {
      if (editing) return;
      const feature = event.features?.[0];
      if (!feature) return;
      event.originalEvent.__robotaxiMapObjectHandled = true;
      options.onSelect?.(feature.properties, event.point);
    });
  }

  function updateHoverState(feature) {
    const next = featureStateReference(feature);
    if (hoveredReference && (hoveredReference.source !== next?.source || hoveredReference.id !== next?.id)) {
      map.setFeatureState(hoveredReference, { hovered: false });
    }
    hoveredReference = next;
    if (hoveredReference) map.setFeatureState(hoveredReference, { hovered: true });
  }

  function clearHoverState() {
    if (hoveredReference && map.getSource(hoveredReference.source)) map.setFeatureState(hoveredReference, { hovered: false });
    hoveredReference = null;
  }

  map.on("click", (event) => {
    if (editing) return;
    if (event.originalEvent.__robotaxiMapObjectHandled) return;
    options.onBlankClick?.();
  });

  function updateScene(nextScene) {
    currentScene = nextScene;
    if (!ready || !map.isStyleLoaded()) return;
    for (const sourceId of Object.keys(SOURCE_DEFINITIONS)) {
      const nextVersion = currentScene?.sourceVersions?.[sourceId] || "";
      if (appliedSourceVersions[sourceId] === nextVersion) continue;
      map.getSource(sourceId)?.setData(currentScene?.[sourceId] || emptyCollection());
      appliedSourceVersions[sourceId] = nextVersion;
    }
    for (const definition of LABEL_DEFINITIONS) {
      const { sceneKey } = definition;
      const nextVersion = currentScene?.sourceVersions?.[sceneKey] || "";
      if (appliedSourceVersions[definition.sourceId] === nextVersion) continue;
      map.getSource(definition.sourceId)?.setData(createLabelCollection(currentScene?.[sceneKey]));
      appliedSourceVersions[definition.sourceId] = nextVersion;
    }
  }

  let selectedReference = null;
  function updateSelection(selected) {
    if (!ready || !map.isStyleLoaded()) return;
    if (selectedReference) map.setFeatureState(selectedReference, { selected: false });
    selectedReference = selected ? selectionReference(selected) : null;
    if (selectedReference && map.getSource(selectedReference.source)) {
      map.setFeatureState(selectedReference, { selected: true });
    }
  }

  function fitScene() {
    map.stop?.();
    if (initialCamera) {
      map.easeTo({ ...initialCamera, duration: 240 });
      return;
    }
    if (currentScene?.bounds) {
      map.fitBounds(currentScene.bounds, { padding: options.compact ? 24 : 52, duration: 0 });
      initialCamera = readCamera();
    }
  }

  function readCamera() {
    const center = map.getCenter();
    return {
      center: [center.lng, center.lat],
      zoom: map.getZoom(),
      bearing: map.getBearing?.() || 0,
      pitch: map.getPitch?.() || 0,
    };
  }

  function zoomBy(delta) {
    map.easeTo({ zoom: Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), map.getZoom() + delta)), duration: 160 });
  }

  function fitGeometry(geometry) {
    fitPlanningGeometry(geometry, 0);
  }

  function fitPlanningGeometry(geometry, minimumZoom = 0) {
    const coordinates = geometry?.type === "Polygon" ? geometry.coordinates.flatMap((ring) => ring) : [];
    if (!coordinates.length) return;
    const bounds = coordinates.reduce(
      (result, coordinate) => result.extend(coordinate),
      new globalThis.maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
    );
    const padding = options.compact ? 48 : { top: 84, right: 72, bottom: 72, left: 360 };
    const camera = map.cameraForBounds?.(bounds, { padding, maxZoom: 15 });
    if (camera) {
      map.easeTo({ ...camera, zoom: Math.max(minimumZoom, camera.zoom), duration: 320 });
      return;
    }
    map.fitBounds(bounds, {
      padding,
      maxZoom: 15,
      duration: 320,
    });
  }

  function focusPlanningParent(geometry, targetType) {
    const minimumZoom = { ZONE: 8, PLACE: 13, SERVICE_AREA: 15 }[targetType] || 8;
    if (geometry) {
      fitPlanningGeometry(geometry, minimumZoom);
      return;
    }
    if (map.getZoom() < minimumZoom) map.easeTo({ zoom: minimumZoom, duration: 260 });
  }

  function inspectPlanningGeometry(geometry) {
    if (!ready || !map.isStyleLoaded() || geometry?.type !== "Polygon") {
      return { status: "MAP_NOT_READY", message: "地图尚未完成加载，请稍候再试", features: [], zoom: map.getZoom?.() ?? null };
    }
    const coordinates = geometry.coordinates?.[0] || [];
    if (!coordinates.length) return { status: "INVALID_GEOMETRY", message: "当前边界没有有效坐标", features: [], zoom: map.getZoom() };
    const tilesLoaded = !map.areTilesLoaded || map.areTilesLoaded();
    const pixels = coordinates.map((coordinate) => map.project(coordinate));
    const bounds = pixels.reduce((result, point) => ({
      minX: Math.min(result.minX, point.x), minY: Math.min(result.minY, point.y),
      maxX: Math.max(result.maxX, point.x), maxY: Math.max(result.maxY, point.y),
    }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    const ownLayers = new Set([
      ...Object.values(SOURCE_DEFINITIONS).flatMap((definition) => layerDefinitions(definition).map((item) => item.layerId)),
      ...LABEL_DEFINITIONS.map((definition) => definition.layerId),
    ]);
    const styleLayers = map.getStyle()?.layers || [];
    const vectorLayerRefs = new Map();
    for (const layer of styleLayers) {
      if (!layer.source || !layer["source-layer"] || ownLayers.has(layer.id)) continue;
      const key = `${layer.source}:${layer["source-layer"]}`;
      if (!vectorLayerRefs.has(key)) vectorLayerRefs.set(key, { source: layer.source, sourceLayer: layer["source-layer"] });
    }
    const sourceFeatures = [...vectorLayerRefs.values()].flatMap(({ source, sourceLayer }) => {
      try {
        return map.querySourceFeatures(source, { sourceLayer }).map((feature) => ({ ...feature, source, sourceLayer }));
      } catch (_error) {
        return [];
      }
    });
    const renderedFeatures = map.queryRenderedFeatures([[bounds.minX, bounds.minY], [bounds.maxX, bounds.maxY]])
      .filter((feature) => !ownLayers.has(feature.layer?.id));
    const features = [...sourceFeatures, ...renderedFeatures]
      .filter((feature) => featureTouchesPlanningGeometry(feature, geometry));
    const unique = new Map();
    for (const feature of features) {
      const category = classifyBasemapFeature(feature);
      const name = feature.properties?.name_zh || feature.properties?.name || feature.properties?.ref || "";
      const key = `${feature.source || ""}:${feature.sourceLayer || feature.layer?.["source-layer"] || ""}:${feature.id ?? name}:${category}`;
      if (unique.has(key)) continue;
      unique.set(key, {
        source_feature_id: feature.id == null ? null : String(feature.id),
        source_layer_id: feature.sourceLayer || feature.layer?.["source-layer"] || feature.layer?.id || "",
        source_feature_name: String(name || ""),
        feature_category: `MAP_${category}`,
      });
      if (unique.size >= 120) break;
    }
    if (!unique.size && !tilesLoaded) {
      return {
        status: "TILES_LOADING",
        message: "当前范围的底图要素仍在加载，请稍候再完成绘制",
        features: [],
        zoom: map.getZoom(),
        source_layer_count: vectorLayerRefs.size,
      };
    }
    return {
      status: "READY",
      message: unique.size ? `已识别 ${unique.size} 个底图参考要素` : "当前范围未识别到可用底图要素，请放大地图或调整边界",
      features: [...unique.values()],
      zoom: map.getZoom(),
      source_layer_count: vectorLayerRefs.size,
    };
  }

  function createDraw() {
    const Terra = globalThis.RobotaxiTerraDraw;
    if (!Terra?.TerraDraw || !Terra?.TerraDrawMapLibreGLAdapter) throw new Error("地图绘制组件未加载");
    stopDrawing();
    editing = true;
    draw = new Terra.TerraDraw({
      adapter: new Terra.TerraDrawMapLibreGLAdapter({ map, prefixId: "robotaxi-spatial-plan" }),
      modes: [new Terra.TerraDrawPolygonMode(), new Terra.TerraDrawSelectMode({
        flags: {
          polygon: {
            feature: {
              draggable: false,
              coordinates: { midpoints: true, draggable: true, deletable: true },
            },
          },
        },
      })],
      undoRedo: { sessionLevel: new Terra.TerraDrawSessionUndoRedo() },
    });
    draw.start();
    return draw;
  }

  function startPolygonDrawing(onFinish) {
    createDraw();
    activeDrawFinish = onFinish;
    drawCompletionPending = false;
    draw.on("finish", (id) => {
      const feature = draw?.getSnapshotFeature(id);
      if (!feature) return;
      completePolygonDrawing(feature.geometry);
    });
    draw.setMode("polygon");
  }

  function startPolygonEditing(geometry) {
    if (geometry?.type !== "Polygon") throw new Error("当前对象没有可编辑的多边形边界");
    createDraw();
    const [addition] = draw.addFeatures([{
      type: "Feature",
      properties: { mode: "polygon" },
      geometry: JSON.parse(JSON.stringify(geometry)),
    }]);
    const featureId = addition?.id ?? addition;
    if (featureId === undefined || featureId === null) throw new Error("当前边界无法载入地图编辑器");
    draw.setMode("select");
    draw.selectFeature?.(featureId);
    fitGeometry(geometry);
    return featureId;
  }

  function getDrawingGeometry() {
    const feature = draw?.getSnapshot?.().find((item) => ["Polygon", "LineString"].includes(item.geometry?.type));
    return normalizePlanningPolygon(feature?.geometry);
  }

  function finishPolygonDrawing() {
    if (!draw || !editing) return { ok: false, message: "当前没有正在绘制的边界" };
    const geometry = getDrawingGeometry();
    if (!geometry) return { ok: false, message: "请至少绘制三个不同的边界点" };
    return completePolygonDrawing(geometry);
  }

  function completePolygonDrawing(geometry) {
    if (drawCompletionPending) return { ok: false, message: "边界正在处理，请稍候" };
    const normalized = normalizePlanningPolygon(geometry);
    if (!normalized) return { ok: false, message: "请至少绘制三个不同的边界点" };
    drawCompletionPending = true;
    try {
      draw?.setMode("select");
      activeDrawFinish?.(normalized);
      return { ok: true, geometry: normalized };
    } finally {
      drawCompletionPending = false;
      activeDrawFinish = null;
    }
  }

  function stopDrawing() {
    if (draw) draw.stop();
    draw = null;
    editing = false;
    activeDrawFinish = null;
    drawCompletionPending = false;
  }

  function firstBasemapLabelLayerId() {
    return map.getStyle()?.layers?.find((layer) => (
      layer.type === "symbol" && !String(layer.id).startsWith("robotaxi-")
    ))?.id;
  }

  return {
    updateScene,
    updateSelection,
    fitScene,
    getCameraState: readCamera,
    zoomBy,
    focusPlanningParent,
    inspectPlanningGeometry,
    startPolygonDrawing,
    finishPolygonDrawing,
    startPolygonEditing,
    getDrawingGeometry,
    restartPolygonDrawing(onFinish) {
      startPolygonDrawing(onFinish);
    },
    undoDrawing: () => draw?.undo() || false,
    redoDrawing: () => draw?.redo() || false,
    clearDrawing: () => draw?.clear(),
    stopDrawing,
    resize: () => map.resize(),
    destroy() {
      destroyed = true;
      clearTimeout(styleTimeout);
      stopDrawing();
      map.remove();
    },
  };
}

export function normalizePlanningPolygon(geometry) {
  let ring = null;
  if (geometry?.type === "Polygon") ring = geometry.coordinates?.[0];
  if (geometry?.type === "LineString") ring = geometry.coordinates;
  if (!Array.isArray(ring)) return null;
  const unique = [];
  for (const point of ring) {
    if (!Array.isArray(point) || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) continue;
    const previous = unique[unique.length - 1];
    if (!previous || previous[0] !== point[0] || previous[1] !== point[1]) unique.push([point[0], point[1]]);
  }
  if (unique.length > 1 && unique[0][0] === unique[unique.length - 1][0] && unique[0][1] === unique[unique.length - 1][1]) unique.pop();
  if (unique.length < 3) return null;
  unique.push([...unique[0]]);
  return { type: "Polygon", coordinates: [unique] };
}

function createLayer(sourceId, { layerId, type, minzoom, maxzoom, filter }) {
  if (type === "fill") {
    const style = fillStyle(layerId);
    return {
      id: layerId,
      type,
      source: sourceId,
      minzoom,
      maxzoom,
      filter,
      paint: {
        "fill-color": style.color,
        "fill-opacity": ["case",
          ["boolean", ["feature-state", "selected"], false], Math.min(0.42, style.opacity + 0.18),
          ["boolean", ["feature-state", "hovered"], false], Math.min(0.32, style.opacity + 0.1),
          style.opacity,
        ],
        "fill-outline-color": style.line,
      },
    };
  }
  if (type === "circle") {
    const isVehicle = layerId === "robotaxi-vehicles";
    return {
      id: layerId,
      type,
      source: sourceId,
      paint: {
        "circle-radius": isVehicle ? ["interpolate", ["linear"], ["zoom"], 10, 3, 16, 6] : 7,
        "circle-color": ["case", ["boolean", ["feature-state", "selected"], false], "#2f6fe4", isVehicle ? "#2f756c" : "#315c82"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
        "circle-opacity": 0.92,
      },
    };
  }
  const boundaryStyle = lineStyle(layerId);
  return {
    id: layerId,
    type,
    source: sourceId,
    minzoom,
    maxzoom,
    filter,
    paint: {
      "line-color": boundaryStyle.color,
      "line-width": boundaryStyle.width,
      "line-opacity": boundaryStyle.opacity,
      ...(boundaryStyle.dasharray ? { "line-dasharray": boundaryStyle.dasharray } : {}),
    },
  };
}

function fillStyle(layerId) {
  if (layerId === "robotaxi-city-extent-fill") {
    return {
      color: CITY_SPATIAL_VISUAL_TOKENS.city.fill,
      opacity: CITY_SPATIAL_VISUAL_TOKENS.city.opacity,
      line: CITY_SPATIAL_VISUAL_TOKENS.city.line,
    };
  }
  if (layerId === "robotaxi-zones") {
    return {
      color: CITY_SPATIAL_VISUAL_TOKENS.zone.fill,
      opacity: CITY_SPATIAL_VISUAL_TOKENS.zone.opacity,
      line: CITY_SPATIAL_VISUAL_TOKENS.zone.line,
    };
  }
  if (layerId === "robotaxi-sub-zones") {
    return {
      color: CITY_SPATIAL_VISUAL_TOKENS.subZone.fill,
      opacity: CITY_SPATIAL_VISUAL_TOKENS.subZone.opacity,
      line: CITY_SPATIAL_VISUAL_TOKENS.subZone.line,
    };
  }
  if (layerId === "robotaxi-places") {
    const colors = CITY_SPATIAL_VISUAL_TOKENS.place;
    return {
      color: ["match", ["get", "place_type"],
        "RESIDENTIAL", colors.residential,
        "OFFICE", colors.office,
        "COMMERCIAL", colors.commercial,
        "SCHOOL", colors.school,
        "HOSPITAL", colors.hospital,
        "METRO_STATION", colors.metro,
        "HOTEL", colors.hotel,
        "TRANSPORT_HUB", colors.transport,
        "OPS_CENTER", colors.opsCenter,
        "FACTORY", colors.factory,
        colors.fallback,
      ],
      opacity: 0.18,
      line: "#768998",
    };
  }
  const colors = CITY_SPATIAL_VISUAL_TOKENS.serviceArea;
  return {
    color: ["match", ["get", "service_area_type"],
      "PICKUP_DROPOFF", colors.pickupDropoff,
      "TEMP_STOP", colors.temporaryStop,
      "PARKING", colors.parking,
      "STANDBY", colors.standby,
      "MIXED", colors.mixed,
      "OPS_CENTER_AREA", colors.opsCenter,
      colors.fallback,
    ],
    opacity: 0.22,
    line: "#477d77",
  };
}

function lineStyle(layerId) {
  if (layerId === "robotaxi-selected-route") {
    return { color: CITY_SPATIAL_VISUAL_TOKENS.selected, width: 5, opacity: 0.92 };
  }
  if (layerId === "robotaxi-city-boundary") {
    return {
      color: CITY_SPATIAL_VISUAL_TOKENS.city.line,
      width: ["interpolate", ["linear"], ["zoom"], 5, 1.1, 10, 1.8, 16, 2.2],
      opacity: 0.9,
      dasharray: [3, 2],
    };
  }
  const style = {
    "robotaxi-zone-boundaries": { line: CITY_SPATIAL_VISUAL_TOKENS.zone.line, width: [1.4, 2.6] },
    "robotaxi-sub-zone-boundaries": { line: CITY_SPATIAL_VISUAL_TOKENS.subZone.line, width: [1.2, 2.3] },
    "robotaxi-place-boundaries": { line: "#7b8993", width: [0.85, 1.8] },
    "robotaxi-service-area-boundaries": { line: "#477d77", width: [0.9, 1.9], dasharray: [2, 1.4] },
  }[layerId];
  if (style) {
    return {
      color: ["case",
        ["boolean", ["feature-state", "selected"], false], CITY_SPATIAL_VISUAL_TOKENS.selected,
        ["boolean", ["feature-state", "hovered"], false], CITY_SPATIAL_VISUAL_TOKENS.hovered,
        style.line,
      ],
      width: ["case",
        ["boolean", ["feature-state", "selected"], false], style.width[1],
        ["boolean", ["feature-state", "hovered"], false], (style.width[0] + style.width[1]) / 2,
        style.width[0],
      ],
      opacity: ["case",
        ["boolean", ["feature-state", "selected"], false], 0.98,
        ["boolean", ["feature-state", "hovered"], false], 0.9,
        0.72,
      ],
      dasharray: style.dasharray,
    };
  }
  return {
    color: ["case",
      ["boolean", ["feature-state", "selected"], false], CITY_SPATIAL_VISUAL_TOKENS.selected,
      "#8295a6",
    ],
    width: ["interpolate", ["linear"], ["zoom"], 10, 1.5, 16, 4],
    opacity: 0.7,
  };
}

function layerDefinitions(definition) {
  return definition.layers || [definition];
}

function classifyBasemapFeature(feature) {
  const token = `${feature.layer?.id || ""} ${feature.sourceLayer || feature.layer?.["source-layer"] || ""}`.toLowerCase();
  if (/water|river|lake|ocean/.test(token)) return "WATER";
  if (/road|street|transportation|highway|path/.test(token)) return "ROAD";
  if (/building/.test(token)) return "BUILDING";
  if (/poi|place|label/.test(token)) return "PLACE";
  if (/landuse|landcover|park|industrial|residential|commercial/.test(token)) return "LANDUSE";
  return "OTHER";
}

function featureTouchesPlanningGeometry(feature, planningGeometry) {
  const ring = planningGeometry?.coordinates?.[0];
  if (!ring?.length) return false;
  const lines = coordinateLines(feature.geometry);
  const points = lines.flat();
  if (!points.length) return false;
  if (points.some((point) => pointInRingInclusive(point, ring))) return true;
  if (ring.some((point) => pointInFeatureGeometry(point, feature.geometry))) return true;
  if (lines.some((line) => lineSegments(line).some(([start, end]) => (
    lineSegments(ring).some(([boundaryStart, boundaryEnd]) => segmentsIntersect(start, end, boundaryStart, boundaryEnd))
  )))) return true;
  return pointInRing(geometryCenter(feature.geometry), ring);
}

function coordinateLines(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Point") return [[geometry.coordinates]];
  if (geometry.type === "MultiPoint" || geometry.type === "LineString") return [geometry.coordinates];
  if (geometry.type === "MultiLineString" || geometry.type === "Polygon") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
  return [];
}

function lineSegments(line = []) {
  return line.slice(0, -1).map((point, index) => [point, line[index + 1]]);
}

function pointInFeatureGeometry(point, geometry) {
  if (geometry?.type === "Polygon") return geometry.coordinates.some((ring) => pointInRingInclusive(point, ring));
  if (geometry?.type === "MultiPolygon") return geometry.coordinates.some((polygon) => polygon.some((ring) => pointInRingInclusive(point, ring)));
  return false;
}

function pointInRingInclusive(point, ring) {
  if (lineSegments(ring).some(([start, end]) => pointOnSegment(point, start, end))) return true;
  return pointInRing(point, ring);
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  return (o1 === 0 && pointOnSegment(c, a, b))
    || (o2 === 0 && pointOnSegment(d, a, b))
    || (o3 === 0 && pointOnSegment(a, c, d))
    || (o4 === 0 && pointOnSegment(b, c, d));
}

function orientation(a, b, c) {
  const value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
  if (Math.abs(value) <= Number.EPSILON) return 0;
  return value > 0 ? 1 : 2;
}

function pointOnSegment(point, start, end) {
  const cross = (point[1] - start[1]) * (end[0] - start[0]) - (point[0] - start[0]) * (end[1] - start[1]);
  if (Math.abs(cross) > 1e-10) return false;
  return point[0] >= Math.min(start[0], end[0]) - 1e-10
    && point[0] <= Math.max(start[0], end[0]) + 1e-10
    && point[1] >= Math.min(start[1], end[1]) - 1e-10
    && point[1] <= Math.max(start[1], end[1]) + 1e-10;
}

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = ((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function selectionReference(selected) {
  const source = {
    zone: "zones",
    place: "places",
    serviceArea: "serviceAreas",
    road: "roads",
    opsCenter: "opsCenters",
    robotaxi: "robotaxis",
    route: "route",
  }[selected?.type];
  return source ? { source, id: selected.id } : null;
}

function featureStateReference(feature) {
  const properties = feature?.properties || {};
  const objectReference = selectionReference({
    type: properties.object_type,
    id: properties.object_id,
  });
  if (objectReference) return objectReference;
  return feature?.source && feature?.id !== undefined ? { source: feature.source, id: feature.id } : null;
}

function emptyCollection() {
  return { type: "FeatureCollection", features: [] };
}

function createLabelCollection(collection) {
  return {
    type: "FeatureCollection",
    features: (collection?.features || []).map((feature) => ({
      type: "Feature",
      id: `${feature.id}-label`,
      properties: feature.properties,
      geometry: {
        type: "Point",
        coordinates: geometryCenter(feature.geometry),
      },
    })),
  };
}

function geometryCenter(geometry) {
  const points = [];
  collectCoordinates(geometry?.coordinates, points);
  if (!points.length) return [0, 0];
  const bounds = points.reduce((result, point) => ({
    minX: Math.min(result.minX, point[0]),
    minY: Math.min(result.minY, point[1]),
    maxX: Math.max(result.maxX, point[0]),
    maxY: Math.max(result.maxY, point[1]),
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
  return [(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2];
}

function collectCoordinates(value, output) {
  if (!Array.isArray(value)) return;
  if (value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1])) {
    output.push(value);
    return;
  }
  value.forEach((item) => collectCoordinates(item, output));
}

function cloneFallbackStyle() {
  return JSON.parse(JSON.stringify(FALLBACK_STYLE));
}
