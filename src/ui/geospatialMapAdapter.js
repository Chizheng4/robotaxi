const SOURCE_DEFINITIONS = Object.freeze({
  zones: { layerId: "robotaxi-zones", type: "fill" },
  places: { layerId: "robotaxi-places", type: "fill" },
  serviceAreas: { layerId: "robotaxi-service-areas", type: "fill" },
  roads: { layerId: "robotaxi-roads", type: "line" },
  opsCenters: { layerId: "robotaxi-ops-centers", type: "circle" },
  robotaxis: { layerId: "robotaxi-vehicles", type: "circle" },
  route: { layerId: "robotaxi-selected-route", type: "line" },
});

const LABEL_DEFINITIONS = Object.freeze({
  zones: { sourceId: "zoneLabels", layerId: "robotaxi-zone-labels", size: 12, minzoom: 3 },
  places: { sourceId: "placeLabels", layerId: "robotaxi-place-labels", size: 11, minzoom: 13 },
  serviceAreas: { sourceId: "serviceAreaLabels", layerId: "robotaxi-service-area-labels", size: 10, minzoom: 15 },
});

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
      if (!map.getLayer(definition.layerId)) map.addLayer(createLayer(sourceId, definition));
      bindLayerEvents(definition.layerId);
    }
    installLabelLayers();
    updateSelection(options.selected || null);
  }

  function installLabelLayers() {
    if (!map.getStyle()?.glyphs) return;
    for (const [sceneKey, definition] of Object.entries(LABEL_DEFINITIONS)) {
      const { sourceId, layerId, size, minzoom } = definition;
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
    }
  }

  const boundLayers = new Set();
  function bindLayerEvents(layerId) {
    if (boundLayers.has(layerId)) return;
    boundLayers.add(layerId);
    map.on("mouseenter", layerId, (event) => {
      if (editing) return;
      map.getCanvas().style.cursor = "pointer";
      const feature = event.features?.[0];
      if (feature) options.onHover?.(feature.properties, event.point);
    });
    map.on("mousemove", layerId, (event) => {
      if (editing) return;
      const feature = event.features?.[0];
      if (feature) options.onHover?.(feature.properties, event.point);
    });
    map.on("mouseleave", layerId, () => {
      if (editing) return;
      map.getCanvas().style.cursor = "";
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
    for (const [sceneKey, definition] of Object.entries(LABEL_DEFINITIONS)) {
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
    const coordinates = geometry?.type === "Polygon" ? geometry.coordinates.flatMap((ring) => ring) : [];
    if (!coordinates.length) return;
    const bounds = coordinates.reduce(
      (result, coordinate) => result.extend(coordinate),
      new globalThis.maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
    );
    map.fitBounds(bounds, {
      padding: options.compact ? 48 : { top: 84, right: 72, bottom: 72, left: 360 },
      maxZoom: 15,
      duration: 320,
    });
  }

  function createDraw() {
    const Terra = globalThis.RobotaxiTerraDraw;
    if (!Terra?.TerraDraw || !Terra?.TerraDrawMapLibreGLAdapter) throw new Error("地图绘制组件未加载");
    stopDrawing();
    editing = true;
    draw = new Terra.TerraDraw({
      adapter: new Terra.TerraDrawMapLibreGLAdapter({ map, prefixId: "robotaxi-spatial-plan" }),
      modes: [new Terra.TerraDrawPolygonMode(), new Terra.TerraDrawSelectMode()],
      undoRedo: { sessionLevel: new Terra.TerraDrawSessionUndoRedo() },
    });
    draw.start();
    return draw;
  }

  function startPolygonDrawing(onFinish) {
    createDraw();
    draw.on("finish", (id) => {
      const feature = draw?.getSnapshotFeature(id);
      if (!feature) return;
      draw.setMode("select");
      onFinish?.(JSON.parse(JSON.stringify(feature.geometry)));
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
    const feature = draw?.getSnapshot?.().find((item) => item.geometry?.type === "Polygon");
    return feature?.geometry ? JSON.parse(JSON.stringify(feature.geometry)) : null;
  }

  function stopDrawing() {
    if (draw) draw.stop();
    draw = null;
    editing = false;
  }

  return {
    updateScene,
    updateSelection,
    fitScene,
    getCameraState: readCamera,
    zoomBy,
    startPolygonDrawing,
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

function createLayer(sourceId, { layerId, type }) {
  if (type === "fill") {
    const colors = {
      "robotaxi-zones": ["#729c87", 0.09, "#507966"],
      "robotaxi-places": ["#d7ba78", 0.24, "#a48b54"],
      "robotaxi-service-areas": ["#56a596", 0.28, "#327a6d"],
    };
    const [color, opacity, outline] = colors[layerId];
    return {
      id: layerId,
      type,
      source: sourceId,
      paint: {
        "fill-color": color,
        "fill-opacity": ["case", ["boolean", ["feature-state", "selected"], false], Math.min(0.55, opacity + 0.18), opacity],
        "fill-outline-color": outline,
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
  return {
    id: layerId,
    type,
    source: sourceId,
    paint: {
      "line-color": layerId === "robotaxi-selected-route" ? "#2f6fe4" : ["case", ["boolean", ["feature-state", "selected"], false], "#2f6fe4", "#8295a6"],
      "line-width": layerId === "robotaxi-selected-route" ? 5 : ["interpolate", ["linear"], ["zoom"], 10, 1.5, 16, 4],
      "line-opacity": layerId === "robotaxi-selected-route" ? 0.92 : 0.7,
    },
  };
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
