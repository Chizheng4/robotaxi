const cloudbase = require("@cloudbase/js-sdk");
const crypto = require("node:crypto");

const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });
const db = app.database();
const command = db.command;
const collection = db.collection("visitor_sessions");
const allowedPeriods = new Map([["1D", 1], ["7D", 7], ["30D", 30]]);
const allowedActions = new Set(["START_VISIT", "HEARTBEAT_VISIT", "END_VISIT", "AUTHENTICATE", "LIST_RECORDS"]);
const tokenLifetimeSeconds = 15 * 60;

exports.main = async (event = {}) => {
  try {
    const action = String(event.action || "");
    if (!allowedActions.has(action)) throw new ServiceError("不支持的访问记录操作", "INVALID_ACTION");
    const payload = event.payload && typeof event.payload === "object" ? event.payload : {};
    if (JSON.stringify(payload).length > 16_384) throw new ServiceError("请求内容过大", "PAYLOAD_TOO_LARGE");
    const handlers = {
      START_VISIT: startVisit,
      HEARTBEAT_VISIT: heartbeatVisit,
      END_VISIT: endVisit,
      AUTHENTICATE: authenticate,
      LIST_RECORDS: listRecords,
    };
    return { succeeded: true, data: await handlers[action](payload), request_id: event.requestId || null };
  } catch (error) {
    console.error("visitorAnalytics", error?.code || "UNEXPECTED_ERROR", error?.message || error);
    return {
      succeeded: false,
      code: error instanceof ServiceError ? error.code : "SERVICE_UNAVAILABLE",
      message: error instanceof ServiceError ? error.message : "访问记录服务暂时不可用",
    };
  }
};

async function startVisit(payload) {
  const visitId = requireId(payload.visit_id, "访问编号无效");
  const startedAt = validIsoDate(payload.started_at) || new Date().toISOString();
  const now = new Date().toISOString();
  const doc = collection.doc(visitId);
  const existing = await doc.get().then((result) => {
    if (Array.isArray(result.data)) return result.data[0] || null;
    return result.data || null;
  }).catch(() => null);
  const record = {
    visit_id: visitId,
    visitor_identifier: hashValue(requireVisitorSeed(payload.visitor_seed)).slice(0, 12),
    visit_started_at: startedAt,
    visit_last_active_at: now,
    visit_ended_at: null,
    active_duration_seconds: Number(existing?.active_duration_seconds) || 0,
    device_type: allowedValue(payload.device_type, ["MOBILE", "DESKTOP"], "UNKNOWN_DEVICE"),
    browser_type: allowedValue(payload.browser_type, ["WECHAT_BROWSER", "EDGE_BROWSER", "CHROME_BROWSER", "SAFARI_BROWSER", "OTHER_BROWSER"], "OTHER_BROWSER"),
    referrer_type: classifyReferrer(payload.referrer),
    timezone: cleanText(payload.timezone, 80),
    website_version: cleanText(payload.website_version, 40),
    platform_entered: true,
    heartbeat_count: Number(existing?.heartbeat_count) || 0,
    created_at: existing?.created_at || now,
    updated_at: now,
  };
  await doc.set(record);
  return sanitizeRecord(record);
}

async function heartbeatVisit(payload) {
  const visitId = requireId(payload.visit_id, "访问编号无效");
  const activeDelta = Math.max(0, Math.min(300, Number(payload.active_seconds) || 0));
  await collection.doc(visitId).update({
    active_duration_seconds: command.inc(activeDelta),
    heartbeat_count: command.inc(1),
    visit_last_active_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return { visit_id: visitId };
}

async function endVisit(payload) {
  const visitId = requireId(payload.visit_id, "访问编号无效");
  const endedAt = new Date().toISOString();
  await collection.doc(visitId).update({ visit_last_active_at: endedAt, visit_ended_at: endedAt, updated_at: endedAt }).catch(() => null);
  return { visit_id: visitId, visit_ended_at: endedAt };
}

async function authenticate(payload) {
  const expected = String(process.env.VISIT_ADMIN_PASSWORD || "");
  const actual = String(payload.password || "");
  if (!expected || !safeEqual(actual, expected)) throw new ServiceError("密码不正确", "AUTHENTICATION_FAILED");
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = { scope: "VISIT_RECORDS", issued_at: now, expires_at: now + tokenLifetimeSeconds };
  return { token: signToken(tokenPayload), expires_at: tokenPayload.expires_at * 1000, storage_mode: "CLOUDBASE_DATABASE" };
}

async function listRecords(payload) {
  verifyToken(payload.token);
  const period = String(payload.period || "7D");
  const days = allowedPeriods.get(period);
  if (!days) throw new ServiceError("不支持的查看周期", "INVALID_PERIOD");
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const result = await collection.where({ visit_started_at: command.gte(cutoff) }).orderBy("visit_started_at", "desc").limit(200).get();
  const records = (result.data || []).map(sanitizeRecord);
  const activeSeconds = records.reduce((sum, record) => sum + (Number(record.active_duration_seconds) || 0), 0);
  return {
    period,
    generated_at: new Date().toISOString(),
    storage_mode: "CLOUDBASE_DATABASE",
    summary: {
      visit_count: records.length,
      unique_visitor_count: new Set(records.map((record) => record.visitor_identifier).filter(Boolean)).size,
      average_active_duration_seconds: records.length ? Math.round(activeSeconds / records.length) : 0,
      platform_entry_count: records.filter((record) => record.platform_entered).length,
    },
    records,
  };
}

function sanitizeRecord(record = {}) {
  return {
    visit_id: record.visit_id,
    visitor_identifier: record.visitor_identifier,
    visit_started_at: record.visit_started_at,
    visit_last_active_at: record.visit_last_active_at,
    visit_ended_at: record.visit_ended_at || null,
    active_duration_seconds: Number(record.active_duration_seconds) || 0,
    device_type: record.device_type || "UNKNOWN_DEVICE",
    browser_type: record.browser_type || "OTHER_BROWSER",
    referrer_type: record.referrer_type || "DIRECT_VISIT",
    website_version: record.website_version || "未知版本",
    platform_entered: record.platform_entered === true,
  };
}

function signToken(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${hashValue(encoded)}`;
}

function verifyToken(token) {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature || !safeEqual(signature, hashValue(encoded))) throw new ServiceError("访问记录登录已失效，请重新验证", "TOKEN_INVALID");
  let payload;
  try { payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")); } catch { throw new ServiceError("访问记录登录已失效，请重新验证", "TOKEN_INVALID"); }
  if (payload.scope !== "VISIT_RECORDS" || Number(payload.expires_at) <= Date.now() / 1000) throw new ServiceError("访问记录登录已失效，请重新验证", "TOKEN_EXPIRED");
}

function hashValue(value) {
  const secret = String(process.env.VISIT_TOKEN_SECRET || "");
  if (secret.length < 24) throw new ServiceError("访问记录服务尚未完成安全配置", "SECURITY_CONFIG_MISSING");
  return crypto.createHmac("sha256", secret).update(String(value)).digest("base64url");
}

function requireVisitorSeed(value) {
  const result = String(value || "");
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(result)) throw new ServiceError("匿名访客标识无效", "VISITOR_SEED_INVALID");
  return result;
}

function requireId(value, message) {
  const result = String(value || "");
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(result)) throw new ServiceError(message, "IDENTIFIER_INVALID");
  return result;
}

function classifyReferrer(value) {
  const referrer = cleanText(value, 500);
  if (!referrer) return "DIRECT_VISIT";
  try {
    const host = new URL(referrer).hostname;
    if (/github\.com$/.test(host)) return "GITHUB_REFERRAL";
    if (/weixin|wechat/.test(host)) return "WECHAT_REFERRAL";
    return "EXTERNAL_REFERRAL";
  } catch { return "EXTERNAL_REFERRAL"; }
}

function validIsoDate(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function cleanText(value, maxLength) {
  return String(value || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, maxLength);
}

function allowedValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

class ServiceError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}
