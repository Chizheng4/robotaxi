const visitorSeedKey = "robotaxi.public.visitor.seed.v2";
const localRecordsKey = "robotaxi.public.qualified.visits.v1";
const exclusionCookieName = "xingbuild_visit_excluded";
const localPreviewPassword = "金星";
const productionHost = "robotaxi.xingbuild.top";
const siteCode = "ROBOTAXI";
let localRecordsToken = null;
let currentVersion = "未知版本";

export function startVisitTracking({ version = "未知版本" } = {}) {
  currentVersion = version;
  return () => {};
}

export function markPlatformEntered() {
  if (typeof window === "undefined" || !shouldQualifyVisit()) return;
  void qualifyVisit().catch(() => {
    // 访问概览是独立反馈能力，失败不得影响平台登录和运行。
  });
}

export async function authenticateVisitorRecords(password) {
  if (isLocalPreview()) {
    if (String(password || "") !== localPreviewPassword) throw new Error("本地预览密码不正确");
    localRecordsToken = globalThis.crypto?.randomUUID?.() || `local-${Date.now()}`;
    return { token: localRecordsToken, storage_mode: "LOCAL_PREVIEW" };
  }
  const result = await callApi("/api/visits/auth", {
    method: "POST",
    body: JSON.stringify({ password: String(password || "") }),
  });
  if (!result?.token) throw new Error("访问概览服务返回异常，请稍后重试");
  return result;
}

export async function loadVisitorRecords({ token, period = "7D", site = "ALL" }) {
  if (!token) throw new Error("访问概览登录已失效，请重新验证");
  if (isLocalPreview()) {
    if (token !== localRecordsToken) throw new Error("访问概览登录已失效，请重新验证");
    return loadLocalVisitorRecords(period, site);
  }
  return normalizeVisitorRecords(await callApi(`/api/visits/records?period=${encodeURIComponent(period)}&site=${encodeURIComponent(site)}`, {
    headers: { Authorization: `Bearer ${token}` },
  }));
}

export function isDeviceExcluded() {
  return new RegExp(`(?:^|;\\s*)${exclusionCookieName}=1(?:;|$)`).test(globalThis.document?.cookie || "");
}

export function setDeviceExcluded(excluded) {
  if (!globalThis.document) return;
  const hostname = globalThis.location?.hostname || "";
  const parentDomain = hostname === "xingbuild.top" || hostname.endsWith(".xingbuild.top")
    ? "; Domain=.xingbuild.top"
    : "";
  if (excluded) {
    globalThis.document.cookie = `${exclusionCookieName}=1; Path=/; Max-Age=31536000; SameSite=Lax${parentDomain}${globalThis.location?.protocol === "https:" ? "; Secure" : ""}`;
  } else {
    globalThis.document.cookie = `${exclusionCookieName}=; Path=/; Max-Age=0; SameSite=Lax${parentDomain}${globalThis.location?.protocol === "https:" ? "; Secure" : ""}`;
  }
}

export function formatVisitTime(value) {
  if (!value) return "暂无";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function shouldQualifyVisit() {
  const hostname = globalThis.location?.hostname || "";
  if (isDeviceExcluded()) return false;
  if (hostname !== productionHost && !isLocalPreview()) return false;
  if (isAutomatedQa()) return false;
  return true;
}

async function qualifyVisit() {
  const payload = createQualifiedPayload();
  if (isLocalPreview()) {
    qualifyLocalVisit(payload);
    return;
  }
  await callApi("/api/visits/qualify", { method: "POST", body: JSON.stringify(payload) });
}

function createQualifiedPayload() {
  return {
    site_code: siteCode,
    visitor_seed: readOrCreateVisitorSeed(),
    device_type: window.matchMedia?.("(max-width: 767px)")?.matches ? "MOBILE" : "DESKTOP",
    website_version: currentVersion,
  };
}

function readOrCreateVisitorSeed() {
  try {
    const existing = window.localStorage.getItem(visitorSeedKey);
    if (/^[a-zA-Z0-9-]{16,100}$/.test(existing || "")) return existing;
    const created = globalThis.crypto?.randomUUID?.() || `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(visitorSeedKey, created);
    return created;
  } catch {
    return globalThis.crypto?.randomUUID?.() || `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function isAutomatedQa() {
  return Boolean(
    globalThis.navigator?.webdriver
    || /verifybrowserload|robotaxiqa|playwright|puppeteer|headlesschrome|lighthouse|pagespeed/i.test(globalThis.navigator?.userAgent || "")
    || /(?:^|[.-])preview(?:[.-]|$)/i.test(globalThis.location?.hostname || ""),
  );
}

function isLocalPreview() {
  return ["localhost", "127.0.0.1"].includes(globalThis.location?.hostname || "");
}

async function callApi(path, options = {}) {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("访问概览服务未正确发布，请稍后重试");
  }
  const result = await response.json().catch(() => null);
  if (!result || typeof result !== "object") throw new Error("访问概览服务返回异常，请稍后重试");
  if (!response.ok) throw new Error(result?.message || "访问概览服务暂时不可用");
  return result;
}

function normalizeVisitorRecords(payload = {}) {
  return {
    period: payload.period || "7D",
    site: payload.site || "ALL",
    generated_at: payload.generated_at || null,
    consistency_note: payload.consistency_note || "",
    storage_mode: payload.storage_mode || "EDGEONE_KV",
    summary: {
      qualified_visit_count: Number(payload.summary?.qualified_visit_count) || 0,
      unique_visitor_count: Number(payload.summary?.unique_visitor_count) || 0,
      latest_qualified_at: payload.summary?.latest_qualified_at || null,
    },
    records: Array.isArray(payload.records) ? payload.records : [],
  };
}

function qualifyLocalVisit(payload) {
  const records = readLocalRecords();
  const qualifiedAt = new Date().toISOString();
  const qualifiedDate = qualifiedAt.slice(0, 10).replace(/-/g, "");
  const visitorIdentifier = readOrCreateVisitorSeed().replace(/-/g, "").slice(0, 24);
  const key = `${payload.site_code}_${qualifiedDate}_${visitorIdentifier}`;
  const existing = records.find((record) => record.local_key === key);
  if (existing) {
    existing.last_qualified_at = qualifiedAt;
    existing.device_type = payload.device_type;
    existing.website_version = payload.website_version;
  } else {
    records.push({
      local_key: key,
      site_code: payload.site_code,
      qualified_date: qualifiedDate,
      visitor_identifier: visitorIdentifier,
      first_qualified_at: qualifiedAt,
      last_qualified_at: qualifiedAt,
      device_type: payload.device_type,
      website_version: payload.website_version,
    });
  }
  writeLocalRecords(records.filter((record) => Date.parse(record.last_qualified_at) >= Date.now() - 30 * 86_400_000));
}

function loadLocalVisitorRecords(period, requestedSite) {
  const allowedDays = { "1D": 1, "7D": 7, "30D": 30 };
  const days = allowedDays[period];
  if (!days) throw new Error("不支持的查看周期");
  if (!["ALL", "XINGBUILD", "ROBOTAXI"].includes(requestedSite)) throw new Error("站点范围无效");
  const cutoff = Date.now() - days * 86_400_000;
  const records = readLocalRecords()
    .filter((record) => Date.parse(record.last_qualified_at) >= cutoff)
    .filter((record) => requestedSite === "ALL" || record.site_code === requestedSite)
    .sort((left, right) => Date.parse(right.last_qualified_at) - Date.parse(left.last_qualified_at));
  return normalizeVisitorRecords({
    period,
    site: requestedSite,
    generated_at: new Date().toISOString(),
    storage_mode: "LOCAL_PREVIEW",
    summary: {
      qualified_visit_count: records.length,
      unique_visitor_count: new Set(records.map((record) => `${record.site_code}:${record.visitor_identifier}`)).size,
      latest_qualified_at: records[0]?.last_qualified_at || null,
    },
    records,
  });
}

function readLocalRecords() {
  try {
    const records = JSON.parse(window.localStorage.getItem(localRecordsKey));
    return Array.isArray(records) ? records : [];
  } catch { return []; }
}

function writeLocalRecords(records) {
  try { window.localStorage.setItem(localRecordsKey, JSON.stringify(records)); } catch { /* 本地预览尽力保存。 */ }
}
