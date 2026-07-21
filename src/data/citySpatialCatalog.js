import { CITY_SPATIAL_SCENARIO_ID } from "./spatialScenarioInitialization.js?v=20260721-v049-2-0";

const CATALOG_VERSION = "2026.07.21-city-1";

export const CITY_SPATIAL_CATALOG = Object.freeze({
  spatial_scenario_id: CITY_SPATIAL_SCENARIO_ID,
  spatial_catalog_version: CATALOG_VERSION,
  source_type: "CITY_GEOGRAPHIC_INITIALIZATION",
  zones: collection([
    polygon("zone", "Z-001", "最小运营测试区", box(113.224, 23.105, 113.267, 23.151)),
    polygon("zone", "Z-002", "东部规划运营区", box(113.278, 23.105, 113.326, 23.151)),
  ]),
  places: collection([
    polygon("place", "P-001", "住宅生活区", box(113.228, 23.139, 113.239, 23.148)),
    polygon("place", "P-002", "办公区", box(113.247, 23.139, 113.259, 23.148)),
    polygon("place", "P-003", "商业中心", box(113.239, 23.121, 113.251, 23.132)),
    polygon("place", "P-004", "医院学校片区", box(113.228, 23.108, 113.240, 23.117)),
    polygon("place", "P-005", "地铁接驳点", box(113.253, 23.110, 113.261, 23.118)),
    polygon("place", "P-006", "最小运营测试中心", box(113.258, 23.106, 113.264, 23.112)),
    polygon("place", "P-101", "东部滨水居住区", box(113.282, 23.139, 113.294, 23.148)),
    polygon("place", "P-102", "东部科技办公区", box(113.307, 23.139, 113.320, 23.148)),
    polygon("place", "P-103", "东部城市商业中心", box(113.299, 23.121, 113.311, 23.132)),
    polygon("place", "P-104", "东部综合交通枢纽", box(113.282, 23.108, 113.294, 23.117)),
    polygon("place", "P-105", "东部酒店会展区", box(113.309, 23.108, 113.321, 23.117)),
    polygon("place", "P-106", "东部规划运营中心", box(113.319, 23.106, 113.324, 23.112)),
  ]),
  serviceAreas: collection([
    ...serviceAreaSet("SA-00", 113.240, 23.136),
    ...serviceAreaSet("SA-10", 113.296, 23.136),
  ]),
  opsCenters: collection([
    point("opsCenter", "OC-001", "最小运营测试中心", [113.261, 23.109]),
    point("opsCenter", "OC-002", "东部规划运营中心", [113.3215, 23.109]),
  ]),
  roads: collection([]),
  robotaxis: collection([]),
  route: collection([]),
});

function serviceAreaSet(prefix, lng, lat) {
  return Array.from({ length: 6 }, (_, index) => {
    const id = `${prefix}${index + 1}`;
    const names = prefix === "SA-00"
      ? ["住宅区东侧接驾区", "办公区西侧接驾区", "商业中心北侧上下客区", "医院学校东侧上下客区", "地铁站南侧接驳区", "运营中心接入道路待命区"]
      : ["东部居住区接驾区", "东部办公区接驾区", "东部商业中心上下客区", "东部交通枢纽接驳区", "东部会展区上下客区", "东部运营中心规划待命区"];
    const offsetX = (index % 3) * 0.006;
    const offsetY = Math.floor(index / 3) * -0.021;
    return polygon("serviceArea", id, names[index], box(lng + offsetX, lat + offsetY, lng + offsetX + 0.003, lat + offsetY + 0.002));
  });
}

function polygon(type, id, name, coordinates) {
  return feature(type, id, name, { type: "Polygon", coordinates: [coordinates] });
}

function point(type, id, name, coordinates) {
  return feature(type, id, name, { type: "Point", coordinates });
}

function feature(type, id, name, geometry) {
  return {
    type: "Feature",
    id,
    properties: {
      object_type: type,
      object_id: id,
      object_name: name,
      object_status: "ACTIVE",
      spatial_scenario_id: CITY_SPATIAL_SCENARIO_ID,
      spatial_catalog_version: CATALOG_VERSION,
    },
    geometry,
  };
}

function collection(features) {
  return { type: "FeatureCollection", features };
}

function box(minLng, minLat, maxLng, maxLat) {
  return [[minLng, minLat], [maxLng, minLat], [maxLng, maxLat], [minLng, maxLat], [minLng, minLat]];
}
