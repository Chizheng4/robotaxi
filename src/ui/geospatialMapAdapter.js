const SOURCE_DEFINITIONS = Object.freeze({
  zones: { type: "fill", layers: [
    { layerId: "robotaxi-zones", minzoom: 5, maxzoom: 13, filter: ["!=", ["get", "zone_level"], "SUB_ZONE"] },
    { layerId: "robotaxi-sub-zones", minzoom: 9, maxzoom: 15, filter: ["==", ["get", "zone_level"], "SUB_ZONE"] },
  ] },
  places: { layerId: "robotaxi-places", type: "fill", minzoom: 12, maxzoom: 18 },
  serviceAreas: { layerId: "robotaxi-service-areas", type: "fill", minzoom: 14 },
  roads: { layerId: "robotaxi-roads", type: "line", minzoom: 13 },
  opsCenters: { layerId: "robotaxi-ops-centers", type: "circle", minzoom: 11 },
  robotaxis: { layerId: "robotaxi-vehicles", type: "circle", minzoom: 14 },
  route: { layerId: "robotaxi-selected-route", type: "line", minzoom: 12 },
});

const LABEL_DEFINITIONS = Object.freeze([
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
      for (const layerDefinition of layerDefinitions(definition)) {
        if (!map.getLayer(layerDefinition.layerId)) {
          const beforeId = layerDefinition.type === "fill" ? firstBasemapLabelLayerId() : undefined;
          const layer = createLayer(sourceId, layerDefinition);
          if (beforeId) map.addLayer(layer, beforeId);
          else map.addLayer(layer);
        }
        bindLayerEvents(layerDefinition.layerId);
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
    if (!ready || !map.isStyleLoaded() || geometry?.type !== "Polygon") return [];
    const coordinates = geometry.coordinates?.[0] || [];
    if (!coordinates.length) return [];
    const pixels = coordinates.map((coordinate) => map.project(coordinate));
    const bounds = pixels.reduce((result, point) => ({
      minX: Math.min(result.minX, point.x), minY: Math.min(result.minY, point.y),
      maxX: Math.max(result.maxX, point.x), maxY: Math.max(result.maxY, point.y),
    }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    const ownLayers = new Set([
      ...Object.values(SOURCE_DEFINITIONS).flatMap((definition) => layerDefinitions(definition).map((item) => item.layerId)),
      ...LABEL_DEFINITIONS.map((definition) => definition.layerId),
    ]);
    const features = map.queryRenderedFeatures([[bounds.minX, bounds.minY], [bounds.maxX, bounds.maxY]])
      .filter((feature) => !ownLayers.has(feature.layer?.id))
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
      if (unique.size >= 80) break;
    }
    return [...unique.values()];
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

function createLayer(sourceId, { layerId, type, minzoom, maxzoom, filter }) {
  if (type === "fill") {
    const colors = {
      "robotaxi-zones": ["#729c87", 0.09, "#507966"],
      "robotaxi-sub-zones": ["#79a58d", 0.12, "#4f7f69"],
      "robotaxi-places": ["#d7ba78", 0.24, "#a48b54"],
      "robotaxi-service-areas": ["#56a596", 0.28, "#327a6d"],
    };
    const [color, opacity, outline] = colors[layerId];
    return {
      id: layerId,
      type,
      source: sourceId,
      minzoom,
      maxzoom,
      filter,
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
    minzoom,
    maxzoom,
    filter,
    paint: {
      "line-color": layerId === "robotaxi-selected-route" ? "#2f6fe4" : ["case", ["boolean", ["feature-state", "selected"], false], "#2f6fe4", "#8295a6"],
      "line-width": layerId === "robotaxi-selected-route" ? 5 : ["interpolate", ["linear"], ["zoom"], 10, 1.5, 16, 4],
      "line-opacity": layerId === "robotaxi-selected-route" ? 0.92 : 0.7,
    },
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
