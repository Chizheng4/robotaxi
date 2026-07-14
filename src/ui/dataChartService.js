const DEFAULT_POINT_SPACING = 64;
const DEFAULT_MIN_WIDTH = 620;
const MAX_RENDER_POINTS = 360;

export function createDataChartModel({
  rows = [],
  series = [],
  variant = "LINE",
  minWidth = DEFAULT_MIN_WIDTH,
  pointSpacing = DEFAULT_POINT_SPACING,
  height = 226,
  zeroBased = variant === "BAR",
} = {}) {
  const sampledRows = sampleRows(rows, MAX_RENDER_POINTS);
  const visibleSeries = series.filter((item) => item.visible !== false);
  const values = sampledRows.flatMap((row) => visibleSeries.map((item) => toFiniteNumber(row.values?.[item.key])));
  const scale = createValueScale(values, { zeroBased });
  const padding = { left: 52, right: 20, top: 18, bottom: 48 };
  const plotWidth = Math.max(1, (sampledRows.length - 1) * pointSpacing);
  const width = Math.max(minWidth, padding.left + padding.right + plotWidth);
  const effectivePlotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const stepX = sampledRows.length <= 1 ? 0 : effectivePlotWidth / (sampledRows.length - 1);
  const points = visibleSeries.map((item) => ({
    ...item,
    points: sampledRows.map((row, index) => ({
      x: sampledRows.length === 1 ? padding.left + effectivePlotWidth / 2 : padding.left + index * stepX,
      y: padding.top + (1 - (toFiniteNumber(row.values?.[item.key]) - scale.min) / scale.range) * plotHeight,
      value: toFiniteNumber(row.values?.[item.key]),
      row,
      index,
    })),
  }));
  return {
    rows: sampledRows,
    series: points,
    variant,
    width,
    height,
    padding,
    plotWidth: effectivePlotWidth,
    plotHeight,
    stepX,
    yTicks: scale.ticks.map((value) => ({
      value,
      y: padding.top + (1 - (value - scale.min) / scale.range) * plotHeight,
    })),
    sampled: sampledRows.length < rows.length,
    sourceRowCount: rows.length,
  };
}

export function findNearestDataChartIndex(model, svgX) {
  if (!model?.rows?.length) return null;
  if (model.rows.length === 1 || model.stepX <= 0) return 0;
  const index = Math.round((svgX - model.padding.left) / model.stepX);
  return Math.max(0, Math.min(model.rows.length - 1, index));
}

export function formatDataChartNumber(value, maximumFractionDigits = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "无";
  return numeric.toLocaleString("zh-CN", { maximumFractionDigits });
}

export function formatDataChartAxisNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  return numeric.toLocaleString("zh-CN", { notation: "compact", maximumFractionDigits: 1 });
}

function createValueScale(values, { zeroBased }) {
  const finiteValues = values.filter(Number.isFinite);
  const dataMin = finiteValues.length ? Math.min(...finiteValues) : 0;
  const dataMax = finiteValues.length ? Math.max(...finiteValues) : 1;
  const dataRange = Math.max(1, dataMax - dataMin);
  const paddedMin = zeroBased ? Math.min(0, dataMin) : Math.max(0, dataMin - dataRange * 0.08);
  const paddedMax = dataMax + dataRange * 0.1;
  const step = niceStep(Math.max(1, paddedMax - paddedMin) / 4);
  const min = zeroBased ? 0 : Math.floor(paddedMin / step) * step;
  const max = Math.max(step, Math.ceil(paddedMax / step) * step);
  const ticks = [];
  for (let value = min; value <= max + step * 0.01; value += step) ticks.push(round(value));
  return { min, max, range: Math.max(1, max - min), ticks };
}

function niceStep(value) {
  const exponent = Math.floor(Math.log10(Math.max(value, Number.EPSILON)));
  const fraction = value / (10 ** exponent);
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * (10 ** exponent);
}

function sampleRows(rows, maxPoints) {
  if (rows.length <= maxPoints) return rows;
  const lastIndex = rows.length - 1;
  return Array.from({ length: maxPoints }, (_, index) => rows[Math.round(index * lastIndex / (maxPoints - 1))]);
}

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function round(value) {
  return Number(value.toFixed(8));
}
