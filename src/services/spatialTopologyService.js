const EPSILON = 1e-10;

export function validatePolygonGeometry(geometry, issues = []) {
  const rings = polygonOuterRings(geometry);
  if (!rings.length) {
    issues.push("请绘制至少三个顶点的闭合区域");
    return issues;
  }
  for (const ring of rings) {
    if (ring.length < 4) issues.push("请绘制至少三个顶点的闭合区域");
    if (!samePoint(ring[0], ring[ring.length - 1])) issues.push("区域边界必须闭合");
    if (ring.some((point) => !validCoordinate(point))) issues.push("区域包含无效经纬度坐标");
    if (Math.abs(signedArea(ring)) < EPSILON) issues.push("区域面积过小或边界无效");
    if (hasSelfIntersection(ring)) issues.push("区域边界存在交叉，请调整边界后重试");
  }
  return issues;
}

export function geometryContains(containerGeometry, childGeometry) {
  const containers = polygonOuterRings(containerGeometry);
  const children = polygonOuterRings(childGeometry);
  if (!containers.length || !children.length) return false;
  return children.every((child) => containers.some((container) => (
    child.slice(0, -1).every((point) => pointInPolygonInclusive(point, container))
    && !ringsCross(container, child)
  )));
}

export function geometryIntersects(leftGeometry, rightGeometry) {
  const leftRings = polygonOuterRings(leftGeometry);
  const rightRings = polygonOuterRings(rightGeometry);
  return leftRings.some((left) => rightRings.some((right) => (
    ringsIntersect(left, right)
    || pointInPolygonInclusive(left[0], right)
    || pointInPolygonInclusive(right[0], left)
  )));
}

export function geometryBounds(geometry) {
  const points = polygonOuterRings(geometry).flat();
  if (!points.length) return null;
  return points.reduce((bounds, point) => ({
    minLng: Math.min(bounds.minLng, point[0]),
    minLat: Math.min(bounds.minLat, point[1]),
    maxLng: Math.max(bounds.maxLng, point[0]),
    maxLat: Math.max(bounds.maxLat, point[1]),
  }), { minLng: Infinity, minLat: Infinity, maxLng: -Infinity, maxLat: -Infinity });
}

export function summarizeSpatialCoverage({ targetType, sourceFeatures = [] } = {}) {
  const counts = {
    MAP_ROAD: 0,
    MAP_BUILDING: 0,
    MAP_PLACE: 0,
    MAP_WATER: 0,
    MAP_LANDUSE: 0,
    MAP_OTHER: 0,
  };
  for (const feature of sourceFeatures) counts[feature.feature_category] = (counts[feature.feature_category] || 0) + 1;
  const issues = [];
  if (["PLACE", "SERVICE_AREA"].includes(targetType) && !counts.MAP_ROAD) {
    issues.push("当前边界内未识别到道路参考，请放大地图并确认服务位置可接入道路");
  }
  if (targetType === "SERVICE_AREA" && counts.MAP_WATER && !counts.MAP_ROAD && !counts.MAP_BUILDING && !counts.MAP_LANDUSE) {
    issues.push("服务区域不能只覆盖水域或不可服务空间");
  }
  return {
    source_feature_count: sourceFeatures.length,
    source_feature_category_counts: counts,
    road_reference_count: counts.MAP_ROAD,
    building_reference_count: counts.MAP_BUILDING,
    place_reference_count: counts.MAP_PLACE,
    water_reference_count: counts.MAP_WATER,
    coverage_issues: issues,
  };
}

export function polygonOuterRings(geometry) {
  if (geometry?.type === "Polygon" && Array.isArray(geometry.coordinates?.[0])) {
    return [geometry.coordinates[0]];
  }
  if (geometry?.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.map((polygon) => polygon?.[0]).filter(Array.isArray);
  }
  return [];
}

function validCoordinate(point) {
  return Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1])
    && point[0] >= -180 && point[0] <= 180 && point[1] >= -90 && point[1] <= 90;
}

function samePoint(left, right) {
  return Array.isArray(left) && Array.isArray(right)
    && Math.abs(left[0] - right[0]) <= EPSILON && Math.abs(left[1] - right[1]) <= EPSILON;
}

function signedArea(ring) {
  return ring.slice(0, -1).reduce((sum, point, index) => {
    const next = ring[index + 1];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2;
}

function pointInPolygonInclusive(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const current = ring[i];
    const previous = ring[j];
    if (pointOnSegment(point, previous, current)) return true;
    const crosses = ((current[1] > point[1]) !== (previous[1] > point[1]))
      && point[0] < ((previous[0] - current[0]) * (point[1] - current[1])) / (previous[1] - current[1]) + current[0];
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointOnSegment(point, start, end) {
  const cross = (point[1] - start[1]) * (end[0] - start[0]) - (point[0] - start[0]) * (end[1] - start[1]);
  if (Math.abs(cross) > EPSILON) return false;
  return point[0] >= Math.min(start[0], end[0]) - EPSILON
    && point[0] <= Math.max(start[0], end[0]) + EPSILON
    && point[1] >= Math.min(start[1], end[1]) - EPSILON
    && point[1] <= Math.max(start[1], end[1]) + EPSILON;
}

function hasSelfIntersection(ring) {
  for (let left = 0; left < ring.length - 1; left += 1) {
    for (let right = left + 1; right < ring.length - 1; right += 1) {
      if (Math.abs(left - right) <= 1 || (left === 0 && right === ring.length - 2)) continue;
      if (segmentsIntersect(ring[left], ring[left + 1], ring[right], ring[right + 1])) return true;
    }
  }
  return false;
}

function ringsCross(left, right) {
  for (let i = 0; i < left.length - 1; i += 1) {
    for (let j = 0; j < right.length - 1; j += 1) {
      if (segmentsProperlyIntersect(left[i], left[i + 1], right[j], right[j + 1])) return true;
    }
  }
  return false;
}

function ringsIntersect(left, right) {
  for (let i = 0; i < left.length - 1; i += 1) {
    for (let j = 0; j < right.length - 1; j += 1) {
      if (segmentsIntersect(left[i], left[i + 1], right[j], right[j + 1])) return true;
    }
  }
  return false;
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

function segmentsProperlyIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0 && o1 !== o2 && o3 !== o4;
}

function orientation(a, b, c) {
  const value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
  if (Math.abs(value) <= EPSILON) return 0;
  return value > 0 ? 1 : 2;
}
