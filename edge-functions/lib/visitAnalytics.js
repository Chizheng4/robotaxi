const recordPrefix = "visit:";
const tokenLifetimeSeconds = 15 * 60;
const allowedPeriods = new Map([["1D", 1], ["7D", 7], ["30D", 30]]);

export async function handleCors(request, env) {
  const headers = corsHeaders(request, env);
  if (!headers) return json({ message: "请求来源不受信任" }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  return headers;
}

export function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = String(env.visitAllowedOrigin || "https://chizheng4.github.io").replace(/\/$/, "");
  const requestUrl = new URL(request.url);
  const sameOrigin = origin === requestUrl.origin;
  if (origin && origin !== allowedOrigin && !sameOrigin) return null;
  return {
    "Access-Control-Allow-Origin": origin || allowedOrigin,
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

export async function readJson(request) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 16_384) throw new HttpError(413, "请求内容过大");
  return request.json().catch(() => { throw new HttpError(400, "请求内容格式错误"); });
}

export async function startVisit(request, env) {
  const body = await readJson(request);
  const visitId = validVisitId(body.visit_id);
  const now = new Date().toISOString();
  const visitStartedAt = validIsoDate(body.started_at) || now;
  const key = recordKey(visitId, visitStartedAt);
  const existing = await getRecord(env, key);
  const visitorHash = await hashVisitor(request, env);
  const record = {
    visit_id: visitId,
    visitor_identifier: visitorHash.slice(0, 12),
    visit_started_at: visitStartedAt,
    visit_last_active_at: now,
    visit_ended_at: null,
    active_duration_seconds: 0,
    device_type: allowedValue(body.device_type, ["MOBILE", "DESKTOP"], "UNKNOWN_DEVICE"),
    page_path: cleanText(body.page_path, 300),
    referrer_type: classifyReferrer(body.referrer),
    timezone: cleanText(body.timezone, 80),
    coarse_region: readCoarseRegion(request),
    website_version: cleanText(body.website_version, 40),
    platform_entered: false,
    heartbeat_count: 0,
    ...(existing || {}),
    visit_last_active_at: now,
    device_type: allowedValue(body.device_type, ["MOBILE", "DESKTOP"], existing?.device_type || "UNKNOWN_DEVICE"),
    page_path: cleanText(body.page_path, 300),
    referrer_type: classifyReferrer(body.referrer),
    timezone: cleanText(body.timezone, 80),
    coarse_region: readCoarseRegion(request),
    website_version: cleanText(body.website_version, 40),
  };
  await requireKv(env).put(key, JSON.stringify(record));
  return record;
}

export async function heartbeatVisit(request, env) {
  const body = await readJson(request);
  const visitId = validVisitId(body.visit_id);
  const key = recordKey(visitId, requireVisitStartedAt(body.visit_started_at));
  const record = await getRecord(env, key);
  if (!record) throw new HttpError(404, "访问记录不存在");
  const activeDelta = Math.max(0, Math.min(60, Number(body.active_seconds) || 0));
  record.active_duration_seconds = Math.min(86_400, (Number(record.active_duration_seconds) || 0) + activeDelta);
  record.visit_last_active_at = new Date().toISOString();
  record.heartbeat_count = Math.min(2880, (Number(record.heartbeat_count) || 0) + 1);
  if (body.platform_entered === true) record.platform_entered = true;
  await requireKv(env).put(key, JSON.stringify(record));
  return record;
}

export async function endVisit(request, env) {
  const body = await readJson(request);
  const visitId = validVisitId(body.visit_id);
  const key = recordKey(visitId, requireVisitStartedAt(body.visit_started_at));
  const record = await getRecord(env, key);
  if (!record) return null;
  record.visit_last_active_at = new Date().toISOString();
  record.visit_ended_at = record.visit_last_active_at;
  await requireKv(env).put(key, JSON.stringify(record));
  return record;
}

export async function authenticate(request, env) {
  const body = await readJson(request);
  const expected = String(env.visitAdminPassword || "");
  if (!expected || !safeEqual(String(body.password || ""), expected)) throw new HttpError(401, "密码不正确");
  const now = Math.floor(Date.now() / 1000);
  const payload = { scope: "VISIT_RECORDS", issued_at: now, expires_at: now + tokenLifetimeSeconds };
  return { token: await signToken(payload, env), expires_at: payload.expires_at * 1000 };
}

export async function listVisitRecords(request, env) {
  await verifyAuthorization(request, env);
  const period = new URL(request.url).searchParams.get("period") || "7D";
  const days = allowedPeriods.get(period);
  if (!days) throw new HttpError(400, "不支持的查看周期");
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const records = [];
  const datePrefixes = listUtcDatePrefixes(days);
  for (const datePrefix of datePrefixes) {
    let cursor;
    do {
      const page = await requireKv(env).list({
        prefix: `${recordPrefix}${datePrefix}:`,
        limit: 100,
        ...(cursor ? { cursor } : {}),
      });
      const pageRecords = await Promise.all((page.keys || []).map((keyInfo) => getRecord(env, keyInfo.name || keyInfo.key)));
      for (const record of pageRecords) {
        if (record && Date.parse(record.visit_started_at) >= cutoff) records.push(record);
      }
      cursor = page.list_complete === false ? page.cursor : null;
    } while (cursor && records.length < 500);
    if (records.length >= 500) break;
  }
  records.sort((left, right) => Date.parse(right.visit_started_at) - Date.parse(left.visit_started_at));
  const visitorIds = new Set(records.map((record) => record.visitor_identifier).filter(Boolean));
  const activeSeconds = records.reduce((sum, record) => sum + (Number(record.active_duration_seconds) || 0), 0);
  return {
    period,
    generated_at: new Date().toISOString(),
    summary: {
      visit_count: records.length,
      unique_visitor_count: visitorIds.size,
      average_active_duration_seconds: records.length ? Math.round(activeSeconds / records.length) : 0,
      platform_entry_count: records.filter((record) => record.platform_entered).length,
    },
    records: records.slice(0, 200),
  };
}

export function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } });
}

export function errorResponse(error, headers = {}) {
  const status = error instanceof HttpError ? error.status : 503;
  return json({ message: error instanceof HttpError ? error.message : "访问记录服务暂时不可用" }, status, headers);
}

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function verifyAuthorization(request, env) {
  const token = String(request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) throw new HttpError(401, "访问记录登录已失效，请重新验证");
  const expected = await hmac(encodedPayload, requireSecret(env));
  if (!safeEqual(signature, expected)) throw new HttpError(401, "访问记录登录已失效，请重新验证");
  const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload)));
  if (payload.scope !== "VISIT_RECORDS" || Number(payload.expires_at) <= Date.now() / 1000) {
    throw new HttpError(401, "访问记录登录已失效，请重新验证");
  }
}

async function signToken(payload, env) {
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  return `${encoded}.${await hmac(encoded, requireSecret(env))}`;
}

async function hashVisitor(request, env) {
  const ip = request.eo?.clientIp || request.headers.get("EO-Connecting-IP") || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || request.headers.get("X-Real-IP") || "unknown";
  const userAgent = request.headers.get("User-Agent") || "unknown";
  return hmac(`${ip}|${userAgent}`, requireSecret(env));
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(signature));
}

function requireSecret(env) {
  const secret = String(env.visitHashSecret || "");
  if (secret.length < 16) throw new HttpError(503, "访问记录服务尚未完成安全配置");
  return secret;
}

function requireKv(env) {
  if (!env.visitKv?.get || !env.visitKv?.put || !env.visitKv?.list) throw new HttpError(503, "访问记录存储正在等待开通");
  return env.visitKv;
}

async function getRecord(env, key) {
  const value = await requireKv(env).get(key);
  if (!value) return null;
  try { return typeof value === "string" ? JSON.parse(value) : value; } catch { return null; }
}

function validVisitId(value) {
  const result = String(value || "");
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(result)) throw new HttpError(400, "访问编号无效");
  return result;
}

function validIsoDate(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function requireVisitStartedAt(value) {
  const result = validIsoDate(value);
  if (!result) throw new HttpError(400, "访问开始时间无效");
  return result;
}

function recordKey(visitId, startedAt) {
  return `${recordPrefix}${String(startedAt).slice(0, 10).replace(/-/g, "")}:${visitId}`;
}

function listUtcDatePrefixes(days) {
  const values = [];
  const now = new Date();
  for (let offset = 0; offset <= days; offset += 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset));
    values.push(date.toISOString().slice(0, 10).replace(/-/g, ""));
  }
  return values;
}

function cleanText(value, maxLength) { return String(value || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, maxLength); }
function allowedValue(value, allowed, fallback) { return allowed.includes(value) ? value : fallback; }
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
function readCoarseRegion(request) {
  return cleanText(
    request.eo?.geo?.regionName
      || request.eo?.geo?.countryName
      || request.headers.get("EO-Client-Province")
      || request.headers.get("EO-Client-Country")
      || "未知",
    80,
  );
}
function safeEqual(left, right) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}
function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
