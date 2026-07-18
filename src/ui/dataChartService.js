const DEFAULT_POINT_SPACING = 64;
const DEFAULT_MIN_WIDTH = 620;
const MAX_RENDER_POINTS = 360;

export function createEchartsOption({ rows = [], series = [], variant = "LINE", zeroBased = false } = {}) {
  const sampledRows = sampleRows(rows, MAX_RENDER_POINTS);
  const activeSeries = series.filter((item) => item.visible !== false);
  const hasLongSeries = sampledRows.length > 36;
  return {
    animation: false,
    color: activeSeries.map((item) => item.color),
    grid: { left: 12, right: 18, top: 14, bottom: hasLongSeries ? 42 : 30, containLabel: true },
    tooltip: {
      trigger: "axis",
      triggerOn: "mousemove|click",
      confine: true,
      appendToBody: false,
      axisPointer: { type: "line", snap: true, lineStyle: { color: "#7890a8", width: 1 } },
      formatter: (params = []) => {
        const index = params[0]?.dataIndex ?? 0;
        const row = sampledRows[index];
        if (!row) return "";
        const values = params.map((param) => {
          const definition = activeSeries.find((item) => item.key === param.seriesId);
          const formatted = definition?.formatValue
            ? definition.formatValue(param.value, row.raw)
            : formatDataChartNumber(param.value);
          const unit = definition?.unit ? ` ${escapeHtml(definition.unit)}` : "";
          return `<span class="data-chart-tooltip-row"><i style="background:${escapeHtml(param.color)}"></i><span>${escapeHtml(definition?.label || param.seriesName)}</span><b>${escapeHtml(formatted)}${unit}</b></span>`;
        }).join("");
        return `<div class="data-chart-tooltip-content"><strong>${escapeHtml(row.tooltipLabel || row.label)}</strong>${values}</div>`;
      },
    },
    xAxis: {
      type: "category",
      boundaryGap: variant === "BAR",
      data: sampledRows.map((row) => row.label),
      axisLine: { lineStyle: { color: "#d6e0e9" } },
      axisTick: { show: false },
      axisLabel: { color: "#6b7d90", fontSize: 10, hideOverlap: true, interval: "auto", margin: 10 },
    },
    yAxis: {
      type: "value",
      min: zeroBased ? 0 : undefined,
      scale: !zeroBased,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#6b7d90", fontSize: 10, formatter: formatDataChartAxisNumber },
      splitLine: { lineStyle: { color: "#e7edf3" } },
    },
    // Long sequences use sampling and adaptive labels. Inside dataZoom captures
    // wheel/touch events and blocks the surrounding analysis canvas from scrolling.
    dataZoom: [],
    series: activeSeries.map((item) => ({
      id: item.key,
      name: item.label,
      type: variant === "BAR" ? "bar" : "line",
      data: sampledRows.map((row) => toFiniteNumber(row.values?.[item.key])),
      smooth: false,
      showSymbol: sampledRows.length <= 48,
      symbolSize: 5,
      sampling: variant === "LINE" ? "lttb" : undefined,
      large: variant === "BAR" && sampledRows.length > 120,
      lineStyle: { width: 2 },
      itemStyle: { color: item.color },
      emphasis: { focus: "series" },
    })),
    __sampledRows: sampledRows,
    __sampled: sampledRows.length < rows.length,
  };
}

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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
