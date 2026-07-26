export const CITY_SPATIAL_VISUAL_TOKENS = Object.freeze({
  city: { fill: "#78a9a3", opacity: 0.15, line: "#315f73" },
  zone: { fill: "#78a58e", opacity: 0.27, line: "#315f5a" },
  subZone: { fill: "#78a9ad", opacity: 0.25, line: "#356b72" },
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

export const CITY_SPATIAL_ZOOM_BANDS = Object.freeze({
  cityScope: { min: 3.5, fillMax: 10.5, boundaryMax: 12 },
  administrativeUnits: { min: 6, max: 13 },
  zone: { min: 6, max: 13.5 },
  subZone: { min: 9, max: 15.5 },
  place: { min: 12, max: 18 },
  serviceArea: { min: 14, max: 19 },
  roads: { min: 13, max: 19 },
  route: { min: 12, max: 19 },
  opsCenter: { min: 11, max: 19 },
  robotaxi: { min: 14, max: 19 },
  cityLabel: { min: 4, max: 8.4 },
});

export const CITY_SPATIAL_LAYER_CONTRACT = Object.freeze({
  cityBoundary: { zoomBand: "cityScope", interactive: true, selectable: false },
  administrativeUnits: { zoomBand: "administrativeUnits", interactive: true, selectable: false },
  zones: { zoomBand: "zone", interactive: true, selectable: true },
  places: { zoomBand: "place", interactive: true, selectable: true },
  serviceAreas: { zoomBand: "serviceArea", interactive: true, selectable: true },
  roads: { zoomBand: "roads", interactive: true, selectable: true },
  route: { zoomBand: "route", interactive: true, selectable: true },
  opsCenters: { zoomBand: "opsCenter", interactive: true, selectable: true },
  robotaxis: { zoomBand: "robotaxi", interactive: true, selectable: true },
});

export const CITY_SPATIAL_LAYER_ORDER = Object.freeze(Object.keys(CITY_SPATIAL_LAYER_CONTRACT));
export const CITY_SPATIAL_STATE_OPACITY = Object.freeze({
  selectedDelta: 0.18,
  selectedMax: 0.42,
  hoveredDelta: 0.1,
  hoveredMax: 0.32,
});

export function isCitySpatialLayerVisible(layerKey, zoom, feature = null) {
  const contract = CITY_SPATIAL_LAYER_CONTRACT[layerKey];
  if (!contract) return true;
  const isSubZone = layerKey === "zones" && feature?.properties?.zone_level === "SUB_ZONE";
  const band = CITY_SPATIAL_ZOOM_BANDS[isSubZone ? "subZone" : contract.zoomBand];
  return zoom >= band.min && zoom < band.max;
}

export function getCitySpatialFitPadding(compact) {
  return compact ? 24 : 52;
}

export function getCitySpatialFillOpacity(baseOpacity, state = "default") {
  if (state === "selected") return Math.min(CITY_SPATIAL_STATE_OPACITY.selectedMax, baseOpacity + CITY_SPATIAL_STATE_OPACITY.selectedDelta);
  if (state === "hovered") return Math.min(CITY_SPATIAL_STATE_OPACITY.hoveredMax, baseOpacity + CITY_SPATIAL_STATE_OPACITY.hoveredDelta);
  return baseOpacity;
}

export function normalizeCitySpatialBounds(bounds) {
  if (!Array.isArray(bounds) || bounds.length !== 2) return null;
  const [[west, south], [east, north]] = bounds;
  if (![west, south, east, north].every(Number.isFinite)) return null;
  if (west >= east || south >= north) return null;
  return [[west, south], [east, north]];
}

export function createCitySpatialHoverPresentation(properties = {}) {
  const objectType = properties.object_type;
  const base = {
    title: properties.object_name || properties.object_id,
    fields: [],
  };
  if (objectType === "cityBoundary") {
    return { ...base, subtitle: "城市行政范围" };
  }
  if (objectType === "administrativeUnit") {
    return { ...base, subtitle: "城市行政区" };
  }
  if (!["zone", "place", "serviceArea"].includes(objectType)) return null;
  const candidateFields = [
    ["zone", "zone_level"],
    ["zone", "zone_structure_mode"],
    ["place", "place_type"],
    ["serviceArea", "service_area_type"],
    ["place", "zone_id"],
    ["serviceArea", "zone_id"],
    ["serviceArea", "place_id"],
  ];
  return {
    ...base,
    subtitle: properties.pending_initialization ? "已规划，待业务初始化" : "已发布空间对象",
    fields: candidateFields
      .filter(([type, field]) => type === objectType && properties[field])
      .slice(0, 3)
      .map(([, field]) => ({ field, value: properties[field] })),
  };
}
