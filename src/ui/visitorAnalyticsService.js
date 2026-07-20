const visitSessionKey = "robotaxi.public.visit.v1";
const localRecordsKey = "robotaxi.public.visit.records.v1";
const localPreviewPassword = "金星";
const heartbeatIntervalMs = 30_000;
let startPromise = Promise.resolve();
let localRecordsToken = null;

export function getApiBase(documentRef = globalThis.document) {
  return String(documentRef?.querySelector?.('meta[name="robotaxi-visit-api-base"]')?.content || "")
    .trim()
    .replace(/\/$/, "");
}

export function isConfigured(documentRef = globalThis.document) {
  return Boolean(getApiBase(documentRef));
}

export function getStorageMode(documentRef = globalThis.document, locationRef = globalThis.location) {
  if (isConfigured(documentRef)) return "EDGEONE_KV";
  return isLoopback(locationRef?.hostname) ? "LOCAL_PREVIEW" : "UNAVAILABLE";
}

export function startVisitTracking({ version = "未知版本", onError } = {}) {
  if (typeof window === "undefined") return () => {};
  const storageMode = getStorageMode();
  if (storageMode === "UNAVAILABLE") return () => {};
  const session = readOrCreateSession();
  let lastHeartbeatAt = Date.now();
  startPromise = storageMode === "LOCAL_PREVIEW"
    ? Promise.resolve(startLocalVisit(session, version))
    : post("/api/visits/start", createVisitPayload(session, version));
  startPromise = startPromise.catch(onError || ignoreFailure);

  const heartbeat = (force = false) => {
    if (!force && document.visibilityState !== "visible") return;
    const now = Date.now();
    const activeSeconds = Math.max(1, Math.min(60, Math.round((now - lastHeartbeatAt) / 1000)));
    lastHeartbeatAt = now;
    const payload = {
      visit_id: session.visit_id,
      visit_started_at: session.started_at,
      active_seconds: activeSeconds,
    };
    const operation = storageMode === "LOCAL_PREVIEW"
      ? Promise.resolve(heartbeatLocalVisit(payload))
      : post("/api/visits/heartbeat", payload);
    void operation.catch(onError || ignoreFailure);
  };
  const intervalId = window.setInterval(heartbeat, heartbeatIntervalMs);
  const handleVisibility = () => {
    if (document.visibilityState === "visible") lastHeartbeatAt = Date.now();
    else heartbeat(true);
  };
  const handlePageHide = () => endTrackingSession(session, storageMode);
  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("pagehide", handlePageHide);
  return () => {
    window.clearInterval(intervalId);
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("pagehide", handlePageHide);
    endTrackingSession(session, storageMode);
  };
}

export async function authenticateVisitorRecords(password) {
  const storageMode = getStorageMode();
  if (storageMode === "LOCAL_PREVIEW") {
    if (String(password || "") !== localPreviewPassword) throw new Error("本地预览密码不正确");
    localRecordsToken = globalThis.crypto?.randomUUID?.() || `local-${Date.now()}`;
    return { token: localRecordsToken, storage_mode: storageMode };
  }
  if (storageMode === "UNAVAILABLE") throw new Error("访问记录服务正在等待 EdgeOne 配置完成");
  const result = await post("/api/visits/auth", { password: String(password || "") });
  if (!result?.token) throw new Error("访问记录验证失败");
  return result;
}

export function markPlatformEntered() {
  if (typeof window === "undefined") return;
  const storageMode = getStorageMode();
  if (storageMode === "UNAVAILABLE") return;
  const session = readOrCreateSession();
  const payload = {
    visit_id: session.visit_id,
    visit_started_at: session.started_at,
    active_seconds: 0,
    platform_entered: true,
  };
  void startPromise.then(() => storageMode === "LOCAL_PREVIEW"
    ? heartbeatLocalVisit(payload)
    : post("/api/visits/heartbeat", payload)).catch(ignoreFailure);
}

export async function loadVisitorRecords({ token, period = "7D" }) {
  if (!token) throw new Error("访问记录登录已失效，请重新验证");
  if (getStorageMode() === "LOCAL_PREVIEW") {
    if (token !== localRecordsToken) throw new Error("访问记录登录已失效，请重新验证");
    return loadLocalVisitorRecords(period);
  }
  const result = await request(`/api/visits/records?period=${encodeURIComponent(period)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return normalizeVisitorRecords(result);
}

export function formatActiveDuration(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  if (value < 60) return `${Math.round(value)} 秒`;
  if (value < 3600) return `${Math.round(value / 60)} 分钟`;
  const hours = Math.floor(value / 3600);
  const minutes = Math.round((value % 3600) / 60);
  return minutes ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`;
}

function normalizeVisitorRecords(payload = {}) {
  return {
    period: payload.period || "7D",
    generated_at: payload.generated_at || null,
    storage_mode: payload.storage_mode || "EDGEONE_KV",
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
  try {
    window.sessionStorage.setItem(visitSessionKey, JSON.stringify(session));
  } catch {
    // Tracking stays best-effort and must never block the public demo.
  }
  return session;
}

function createVisitPayload(session, version) {
  const mobile = window.matchMedia?.("(max-width: 767px)")?.matches;
  return {
    ...session,
    website_version: version,
    page_path: `${window.location.pathname}${window.location.search}`.slice(0, 300),
    referrer: String(document.referrer || "").slice(0, 500),
    device_type: mobile ? "MOBILE" : "DESKTOP",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "未知",
  };
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
    page_path: payload.page_path,
    referrer_type: classifyLocalReferrer(payload.referrer),
    coarse_region: "本地环境",
    website_version: version,
    platform_entered: false,
  };
  if (existingIndex >= 0) {
    records[existingIndex] = {
      ...record,
      ...records[existingIndex],
      visit_last_active_at: record.visit_last_active_at,
      device_type: record.device_type,
      page_path: record.page_path,
      referrer_type: record.referrer_type,
      website_version: record.website_version,
    };
  }
  else records.push(record);
  writeLocalRecords(records);
  return record;
}

function heartbeatLocalVisit(payload) {
  const records = readLocalRecords();
  const record = records.find((item) => item.visit_id === payload.visit_id);
  if (!record) return null;
  record.active_duration_seconds = Math.min(86_400, (Number(record.active_duration_seconds) || 0) + Math.max(0, Math.min(60, Number(payload.active_seconds) || 0)));
  record.visit_last_active_at = new Date().toISOString();
  if (payload.platform_entered === true) record.platform_entered = true;
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
  const records = readLocalRecords()
    .filter((record) => Date.parse(record.visit_started_at) >= cutoff)
    .sort((left, right) => Date.parse(right.visit_started_at) - Date.parse(left.visit_started_at));
  const activeSeconds = records.reduce((sum, record) => sum + (Number(record.active_duration_seconds) || 0), 0);
  return normalizeVisitorRecords({
    period,
    generated_at: new Date().toISOString(),
    storage_mode: "LOCAL_PREVIEW",
    summary: {
      visit_count: records.length,
      unique_visitor_count: new Set(records.map((record) => record.visitor_identifier)).size,
      average_active_duration_seconds: records.length ? Math.round(activeSeconds / records.length) : 0,
      platform_entry_count: records.filter((record) => record.platform_entered).length,
    },
    records,
  });
}

function readLocalRecords() {
  try {
    const records = JSON.parse(window.localStorage.getItem(localRecordsKey));
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

function writeLocalRecords(records) {
  try {
    window.localStorage.setItem(localRecordsKey, JSON.stringify(records.slice(-500)));
  } catch {
    // Local preview remains best-effort when browser storage is unavailable.
  }
}

function classifyLocalReferrer(value) {
  if (!value) return "DIRECT_VISIT";
  try {
    return new URL(value).hostname === window.location.hostname ? "DIRECT_VISIT" : "EXTERNAL_REFERRAL";
  } catch {
    return "EXTERNAL_REFERRAL";
  }
}

function isLoopback(hostname) {
  return ["localhost", "127.0.0.1", "::1"].includes(String(hostname || "").toLowerCase());
}

function endTrackingSession(session, storageMode) {
  if (storageMode === "LOCAL_PREVIEW") endLocalVisit(session);
  else sendEnd(session);
}

function sendEnd(session) {
  const apiBase = getApiBase();
  if (!apiBase || !session?.visit_id || !session?.started_at) return;
  const body = JSON.stringify({ visit_id: session.visit_id, visit_started_at: session.started_at });
  if (navigator.sendBeacon) {
    navigator.sendBeacon(`${apiBase}/api/visits/end`, new Blob([body], { type: "text/plain;charset=UTF-8" }));
    return;
  }
  void fetch(`${apiBase}/api/visits/end`, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(ignoreFailure);
}

async function post(path, body) {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function request(path, options = {}) {
  const apiBase = getApiBase();
  if (!apiBase) throw new Error("访问记录服务正在等待 EdgeOne 配置完成");
  const response = await fetch(`${apiBase}${path}`, { ...options, mode: "cors", credentials: "omit" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "访问记录服务暂时不可用");
  return payload;
}

function ignoreFailure() {}
