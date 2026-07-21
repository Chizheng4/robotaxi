const visitSessionKey = "robotaxi.public.visit.v2";
const visitorSeedKey = "robotaxi.public.visitor.seed.v1";
const localRecordsKey = "robotaxi.public.visit.records.v2";
const localPreviewPassword = "金星";
const heartbeatIntervalMs = 300_000;
let localRecordsToken = null;
let tracker = null;

export function getVisitorAnalyticsApi(documentRef = globalThis.document) {
  return String(documentRef?.querySelector?.('meta[name="robotaxi-visit-api-base"]')?.content || "").trim();
}

export function isConfigured(documentRef = globalThis.document) {
  return /^https:\/\//.test(getVisitorAnalyticsApi(documentRef));
}

export function getStorageMode(documentRef = globalThis.document, locationRef = globalThis.location) {
  if (isConfigured(documentRef)) return "CLOUDBASE_DATABASE";
  return isLoopback(locationRef?.hostname) ? "LOCAL_PREVIEW" : "UNAVAILABLE";
}

export function startVisitTracking({ version = "未知版本", onError } = {}) {
  if (typeof window === "undefined") return () => {};
  tracker = { version, onError: onError || ignoreFailure, started: false, cleanup: null };
  return () => {
    tracker?.cleanup?.();
    tracker = null;
  };
}

export function markPlatformEntered() {
  if (typeof window === "undefined" || !tracker || tracker.started) return;
  tracker.started = true;
  tracker.cleanup = beginTrackedSession(tracker.version, tracker.onError);
}

export async function authenticateVisitorRecords(password) {
  const storageMode = getStorageMode();
  if (storageMode === "LOCAL_PREVIEW") {
    if (String(password || "") !== localPreviewPassword) throw new Error("本地预览密码不正确");
    localRecordsToken = globalThis.crypto?.randomUUID?.() || `local-${Date.now()}`;
    return { token: localRecordsToken, storage_mode: storageMode };
  }
  if (storageMode === "UNAVAILABLE") throw new Error("访问记录服务尚未完成 CloudBase 配置");
  const result = await callCloudBase("AUTHENTICATE", { password: String(password || "") });
  if (!result?.token) throw new Error("访问记录验证失败");
  return result;
}

export async function loadVisitorRecords({ token, period = "7D" }) {
  if (!token) throw new Error("访问记录登录已失效，请重新验证");
  if (getStorageMode() === "LOCAL_PREVIEW") {
    if (token !== localRecordsToken) throw new Error("访问记录登录已失效，请重新验证");
    return loadLocalVisitorRecords(period);
  }
  return normalizeVisitorRecords(await callCloudBase("LIST_RECORDS", { token, period }));
}

export function formatActiveDuration(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  if (value < 60) return `${Math.round(value)} 秒`;
  if (value < 3600) return `${Math.round(value / 60)} 分钟`;
  const hours = Math.floor(value / 3600);
  const minutes = Math.round((value % 3600) / 60);
  return minutes ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`;
}

function beginTrackedSession(version, onError) {
  const storageMode = getStorageMode();
  if (storageMode === "UNAVAILABLE") return () => {};
  const session = readOrCreateSession();
  const payload = createVisitPayload(session, version);
  let lastActiveAt = Date.now();
  let stopped = false;
  const startPromise = storageMode === "LOCAL_PREVIEW"
    ? Promise.resolve(startLocalVisit(session, version))
    : callCloudBase("START_VISIT", payload);
  void startPromise.catch(onError);

  const heartbeat = (force = false) => {
    if (stopped || (!force && document.visibilityState !== "visible")) return;
    const now = Date.now();
    const activeSeconds = Math.max(0, Math.min(heartbeatIntervalMs / 1000, Math.round((now - lastActiveAt) / 1000)));
    lastActiveAt = now;
    if (!activeSeconds) return;
    const heartbeatPayload = { visit_id: session.visit_id, active_seconds: activeSeconds };
    const operation = storageMode === "LOCAL_PREVIEW"
      ? Promise.resolve(heartbeatLocalVisit(heartbeatPayload))
      : startPromise.then(() => callCloudBase("HEARTBEAT_VISIT", heartbeatPayload));
    void operation.catch(onError);
  };
  const intervalId = window.setInterval(heartbeat, heartbeatIntervalMs);
  const handleVisibility = () => {
    if (document.visibilityState === "visible") lastActiveAt = Date.now();
    else heartbeat(true);
  };
  const handlePageHide = () => heartbeat(true);
  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("pagehide", handlePageHide);
  return () => {
    heartbeat(true);
    stopped = true;
    window.clearInterval(intervalId);
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("pagehide", handlePageHide);
    if (storageMode === "LOCAL_PREVIEW") endLocalVisit(session);
    else void startPromise.then(() => callCloudBase("END_VISIT", { visit_id: session.visit_id })).catch(onError);
  };
}

function normalizeVisitorRecords(payload = {}) {
  return {
    period: payload.period || "7D",
    generated_at: payload.generated_at || null,
    storage_mode: payload.storage_mode || "CLOUDBASE_DATABASE",
    summary: {
      visit_count: Number(payload.summary?.visit_count) || 0,
      unique_visitor_count: Number(payload.summary?.unique_visitor_count) || 0,
      average_active_duration_seconds: Number(payload.summary?.average_active_duration_seconds) || 0,
      platform_entry_count: Number(payload.summary?.platform_entry_count) || 0,
    },
    records: Array.isArray(payload.records) ? payload.records : [],
  };
}

function readOrCreateSession() {
  try {
    const existing = JSON.parse(window.sessionStorage.getItem(visitSessionKey));
    if (existing?.visit_id && existing?.started_at) return existing;
  } catch {
    // A fresh per-tab session is enough when storage is unavailable or invalid.
  }
  const session = {
    visit_id: globalThis.crypto?.randomUUID?.() || `visit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    started_at: new Date().toISOString(),
  };
  try { window.sessionStorage.setItem(visitSessionKey, JSON.stringify(session)); } catch { /* Best effort only. */ }
  return session;
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

function createVisitPayload(session, version) {
  const mobile = window.matchMedia?.("(max-width: 767px)")?.matches;
  return {
    ...session,
    visitor_seed: readOrCreateVisitorSeed(),
    website_version: version,
    referrer: String(document.referrer || "").slice(0, 500),
    device_type: mobile ? "MOBILE" : "DESKTOP",
    browser_type: detectBrowserType(navigator.userAgent),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "未知",
  };
}

async function callCloudBase(action, payload) {
  const api = getVisitorAnalyticsApi();
  if (!api) throw new Error("访问记录服务尚未完成 CloudBase 配置");
  const response = await fetch(api, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
    cache: "no-store",
    keepalive: action === "END_VISIT",
  });
  const result = await response.json().catch(() => null);
  if (!response.ok && !result) throw new Error("访问记录服务暂时不可用");
  if (result?.succeeded === false) throw new Error(result.message || "访问记录服务暂时不可用");
  return result?.data ?? result;
}

function detectBrowserType(userAgent = "") {
  if (/MicroMessenger/i.test(userAgent)) return "WECHAT_BROWSER";
  if (/Edg/i.test(userAgent)) return "EDGE_BROWSER";
  if (/CriOS|Chrome/i.test(userAgent)) return "CHROME_BROWSER";
  if (/Safari/i.test(userAgent)) return "SAFARI_BROWSER";
  return "OTHER_BROWSER";
}

function startLocalVisit(session, version) {
  const payload = createVisitPayload(session, version);
  const records = readLocalRecords();
  const existingIndex = records.findIndex((record) => record.visit_id === session.visit_id);
  const record = {
    visit_id: session.visit_id,
    visitor_identifier: "本机预览",
    visit_started_at: session.started_at,
    visit_last_active_at: new Date().toISOString(),
    visit_ended_at: null,
    active_duration_seconds: 0,
    device_type: payload.device_type,
    browser_type: payload.browser_type,
    referrer_type: classifyLocalReferrer(payload.referrer),
    website_version: version,
    platform_entered: true,
  };
  if (existingIndex >= 0) records[existingIndex] = { ...record, ...records[existingIndex], visit_last_active_at: record.visit_last_active_at };
  else records.push(record);
  writeLocalRecords(records);
  return record;
}

function heartbeatLocalVisit(payload) {
  const records = readLocalRecords();
  const record = records.find((item) => item.visit_id === payload.visit_id);
  if (!record) return null;
  record.active_duration_seconds = Math.min(86_400, (Number(record.active_duration_seconds) || 0) + Math.max(0, Math.min(300, Number(payload.active_seconds) || 0)));
  record.visit_last_active_at = new Date().toISOString();
  writeLocalRecords(records);
  return record;
}

function endLocalVisit(session) {
  const records = readLocalRecords();
  const record = records.find((item) => item.visit_id === session.visit_id);
  if (!record) return;
  record.visit_last_active_at = new Date().toISOString();
  record.visit_ended_at = record.visit_last_active_at;
  writeLocalRecords(records);
}

function loadLocalVisitorRecords(period) {
  const allowedDays = { "1D": 1, "7D": 7, "30D": 30 };
  const days = allowedDays[period];
  if (!days) throw new Error("不支持的查看周期");
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const records = readLocalRecords().filter((record) => Date.parse(record.visit_started_at) >= cutoff).sort((left, right) => Date.parse(right.visit_started_at) - Date.parse(left.visit_started_at));
  const activeSeconds = records.reduce((sum, record) => sum + (Number(record.active_duration_seconds) || 0), 0);
  return normalizeVisitorRecords({
    period,
    generated_at: new Date().toISOString(),
    storage_mode: "LOCAL_PREVIEW",
    summary: {
      visit_count: records.length,
      unique_visitor_count: new Set(records.map((record) => record.visitor_identifier)).size,
      average_active_duration_seconds: records.length ? Math.round(activeSeconds / records.length) : 0,
      platform_entry_count: records.length,
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
  try { window.localStorage.setItem(localRecordsKey, JSON.stringify(records.slice(-500))); } catch { /* Preview remains best effort. */ }
}

function classifyLocalReferrer(value) {
  if (!value) return "DIRECT_VISIT";
  try { return new URL(value).hostname === window.location.hostname ? "DIRECT_VISIT" : "EXTERNAL_REFERRAL"; }
  catch { return "EXTERNAL_REFERRAL"; }
}

function isLoopback(hostname) {
  return ["localhost", "127.0.0.1", "::1"].includes(String(hostname || "").toLowerCase());
}

function ignoreFailure() {}
