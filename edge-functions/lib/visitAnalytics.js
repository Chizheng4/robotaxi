const recordPrefix = "visit_";
const tokenLifetimeSeconds = 15 * 60;
const retentionDays = 30;
const cleanupLimit = 100;
const listLimit = 500;
const listPageLimit = Math.ceil(listLimit / cleanupLimit);
const allowedPeriods = new Map([["1D", 1], ["7D", 7], ["30D", 30]]);
const allowedSites = new Set(["ALL", "XINGBUILD", "ROBOTAXI"]);
const productionHosts = new Map([
  ["xingbuild.top", "XINGBUILD"],
  ["www.xingbuild.top", "XINGBUILD"],
  ["robotaxi.xingbuild.top", "ROBOTAXI"],
]);
const automatedAgentPattern = /verifybrowserload|robotaxiqa|playwright|puppeteer|headlesschrome|lighthouse|pagespeed|edgeone.*preview/i;

export async function handleCors(request) {
  const headers = corsHeaders(request);
  if (!headers) return json({ message: "请求来源不受信任" }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  return headers;
}

export function corsHeaders(request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("Origin") || "";
  if (!productionHosts.has(requestUrl.hostname)) return null;
  if (origin) {
    let originHost;
    try { originHost = new URL(origin).hostname; } catch { return null; }
    if (originHost !== requestUrl.hostname || !productionHosts.has(originHost)) return null;
  }
  return {
    "Access-Control-Allow-Origin": origin || requestUrl.origin,
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

export async function readJson(request) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 8_192) throw new HttpError(413, "请求内容过大");
  return request.json().catch(() => { throw new HttpError(400, "请求内容格式错误"); });
}

export async function qualifyVisit(request, env) {
  const body = await readJson(request);
  const siteCode = validSiteCode(body.site_code, false);
  const requestHost = new URL(request.url).hostname;
  if (productionHosts.get(requestHost) !== siteCode) throw new HttpError(403, "站点来源不匹配");
  if (isExcludedRequest(request)) return { recorded: false, reason: "DEVICE_EXCLUDED" };
  if (isAutomatedRequest(request)) return { recorded: false, reason: "AUTOMATED_QA" };

  const visitorSeed = requireVisitorSeed(body.visitor_seed);
  const qualifiedAt = new Date(env.visitNow || Date.now()).toISOString();
  const qualifiedDate = formatQualifiedDate(qualifiedAt);
  const visitorIdentifier = (await hmacHex(`${siteCode}|${visitorSeed}`, requireSecret(env))).slice(0, 24);
  const key = `${recordPrefix}${siteCode}_${qualifiedDate}_${visitorIdentifier}`;
  const existing = await getRecord(env, key);
  const record = {
    site_code: siteCode,
    qualified_date: qualifiedDate,
    visitor_identifier: visitorIdentifier,
    first_qualified_at: existing?.first_qualified_at || qualifiedAt,
    last_qualified_at: qualifiedAt,
    device_type: allowedValue(body.device_type, ["MOBILE", "DESKTOP"], existing?.device_type || "UNKNOWN_DEVICE"),
    website_version: cleanText(body.website_version, 40),
  };
  await requireKv(env).put(key, JSON.stringify(record));
  await cleanupExpiredRecords(env);
  return { recorded: true, record };
}

export async function authenticate(request, env) {
  const body = await readJson(request);
  const expected = String(env.visitAdminPassword || "");
  const envRevision = String(env.visitEnvRevision || "") || null;
  if (!expected) {
    throw new HttpError(401, "访问密码尚未完成配置", {
      code: "ADMIN_PASSWORD_MISSING",
      env_revision: envRevision,
    });
  }
  if (hasInvisibleCharacters(expected)) {
    throw new HttpError(401, "访问密码配置包含不可见字符，请重新保存", {
      code: "ADMIN_PASSWORD_HAS_INVISIBLE_CHARS",
      env_revision: envRevision,
    });
  }
  if (!safeEqual(String(body.password || ""), expected)) {
    throw new HttpError(401, "密码不正确", {
      code: "ADMIN_PASSWORD_MISMATCH",
      env_revision: envRevision,
    });
  }
  const now = Math.floor(Date.now() / 1000);
  const payload = { scope: "VISIT_RECORDS", issued_at: now, expires_at: now + tokenLifetimeSeconds };
  return { token: await signToken(payload, env), expires_at: payload.expires_at * 1000 };
}

export async function listVisitRecords(request, env) {
  await verifyAuthorization(request, env);
  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "7D";
  const days = allowedPeriods.get(period);
  if (!days) throw new HttpError(400, "不支持的查看周期");
  const site = validSiteCode(url.searchParams.get("site") || "ALL", true);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const records = await scanRecords(env, site, cutoff);
  records.sort((left, right) => Date.parse(right.last_qualified_at) - Date.parse(left.last_qualified_at));
  await cleanupExpiredRecords(env);
  const visitorKeys = new Set(records.map((record) => `${record.site_code}:${record.visitor_identifier}`));
  return {
    period,
    site,
    generated_at: new Date().toISOString(),
    consistency_note: "EdgeOne KV 最多可能约 60 秒后显示最新记录",
    summary: {
      qualified_visit_count: records.length,
      unique_visitor_count: visitorKeys.size,
      latest_qualified_at: records[0]?.last_qualified_at || null,
    },
    records: records.slice(0, 100),
  };
}

export function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } });
}

export function errorResponse(error, headers = {}) {
  const status = error instanceof HttpError ? error.status : 503;
  return json({
    message: error instanceof HttpError ? error.message : "访问概览服务暂时不可用",
    ...(error instanceof HttpError && error.code ? { code: error.code, env_revision: error.env_revision } : {}),
  }, status, headers);
}

export class HttpError extends Error {
  constructor(status, message, diagnostics = {}) {
    super(message);
    this.status = status;
    this.code = diagnostics.code;
    this.env_revision = diagnostics.env_revision;
  }
}

function hasInvisibleCharacters(value) {
  return /[\p{White_Space}\p{Cc}\p{Cf}]/u.test(value);
}

async function scanRecords(env, site, cutoff) {
  const kv = requireKv(env);
  const prefix = site === "ALL" ? recordPrefix : `${recordPrefix}${site}_`;
  const records = [];
  let cursor;
  let pageCount = 0;
  do {
    const page = await kv.list({ prefix, limit: cleanupLimit, ...(cursor ? { cursor } : {}) });
    const values = await Promise.all((page.keys || []).map((entry) => getRecord(env, entry.name || entry.key)));
    for (const record of values) {
      if (isAllowedRecord(record) && Date.parse(record.last_qualified_at) >= cutoff) records.push(record);
    }
    pageCount += 1;
    cursor = isListComplete(page) ? null : page.cursor;
  } while (cursor && records.length < listLimit && pageCount < listPageLimit);
  return records;
}

async function cleanupExpiredRecords(env) {
  const kv = requireKv(env);
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const page = await kv.list({ prefix: recordPrefix, limit: cleanupLimit });
  const entries = page.keys || [];
  const records = await Promise.all(entries.map((entry) => getRecord(env, entry.name || entry.key)));
  await Promise.all(entries.map((entry, index) => {
    const record = records[index];
    if (record && Date.parse(record.last_qualified_at) < cutoff) return kv.delete(entry.name || entry.key);
    return null;
  }));
}

async function verifyAuthorization(request, env) {
  const token = String(request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) throw new HttpError(401, "访问概览登录已失效，请重新验证");
  const expected = await hmacBase64Url(encodedPayload, requireSecret(env));
  if (!safeEqual(signature, expected)) throw new HttpError(401, "访问概览登录已失效，请重新验证");
  const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload)));
  if (payload.scope !== "VISIT_RECORDS" || Number(payload.expires_at) <= Date.now() / 1000) {
    throw new HttpError(401, "访问概览登录已失效，请重新验证");
  }
}

async function signToken(payload, env) {
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  return `${encoded}.${await hmacBase64Url(encoded, requireSecret(env))}`;
}

async function hmacHex(value, secret) {
  const bytes = await hmacBytes(value, secret);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacBase64Url(value, secret) {
  return toBase64Url(await hmacBytes(value, secret));
}

async function hmacBytes(value, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

function requireSecret(env) {
  const secret = String(env.visitHashSecret || "");
  if (secret.length < 24) throw new HttpError(503, "访问概览服务尚未完成安全配置");
  return secret;
}

function requireKv(env) {
  const kv = typeof visitKv !== "undefined" ? visitKv : env?.visitKv;
  if (!kv?.get || !kv?.put || !kv?.list || !kv?.delete) {
    throw new HttpError(503, "访问概览存储尚未完成配置");
  }
  return kv;
}

function isListComplete(page) {
  if (typeof page?.complete === "boolean") return page.complete;
  if (typeof page?.list_complete === "boolean") return page.list_complete;
  return true;
}

async function getRecord(env, key) {
  const value = await requireKv(env).get(key);
  if (!value) return null;
  try { return typeof value === "string" ? JSON.parse(value) : value; } catch { return null; }
}

function isExcludedRequest(request) {
  return /(?:^|;\s*)xingbuild_visit_excluded=1(?:;|$)/.test(request.headers.get("Cookie") || "");
}

function isAutomatedRequest(request) {
  return automatedAgentPattern.test([
    request.headers.get("User-Agent"),
    request.headers.get("X-Robotaxi-QA"),
    request.headers.get("Sec-CH-UA"),
  ].filter(Boolean).join(" "));
}

function validSiteCode(value, allowAll) {
  const site = String(value || "").toUpperCase();
  if (!allowedSites.has(site) || (!allowAll && site === "ALL")) throw new HttpError(400, "站点范围无效");
  return site;
}

function requireVisitorSeed(value) {
  const seed = String(value || "");
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(seed)) throw new HttpError(400, "匿名访客标识无效");
  return seed;
}

function formatQualifiedDate(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value)).replace(/-/g, "");
}

function isAllowedRecord(record) {
  if (!record || !["XINGBUILD", "ROBOTAXI"].includes(record.site_code)) return false;
  const keys = Object.keys(record).sort().join(",");
  return keys === [
    "device_type",
    "first_qualified_at",
    "last_qualified_at",
    "qualified_date",
    "site_code",
    "visitor_identifier",
    "website_version",
  ].sort().join(",");
}

function cleanText(value, maxLength) {
  return String(value || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, maxLength);
}
function allowedValue(value, allowed, fallback) { return allowed.includes(value) ? value : fallback; }
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
