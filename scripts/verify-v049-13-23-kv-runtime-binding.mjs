import assert from "node:assert/strict";
import {
  authenticate,
  listVisitRecords,
  qualifyVisit,
} from "../edge-functions/lib/visitAnalytics.js";

const baseEnv = {
  visitAdminPassword: "test-admin-password",
  visitHashSecret: "test-secret-at-least-24-characters",
  visitNow: "2026-07-30T08:00:00.000Z",
};

try {
  const globalKv = createKv();
  const fallbackKv = createKv();
  globalThis.visitKv = globalKv;
  await qualifyVisit(qualifyRequest("global-priority-seed"), { ...baseEnv, visitKv: fallbackKv });
  assert.equal(globalKv.size(), 1, "Production 全局 binding 必须优先");
  assert.equal(fallbackKv.size(), 0, "全局 binding 存在时不得退回文本 env");

  delete globalThis.visitKv;
  await qualifyVisit(qualifyRequest("env-fallback-seed"), { ...baseEnv, visitKv: fallbackKv });
  assert.equal(fallbackKv.size(), 1, "本地专项允许使用 context.env fallback");

  await assert.rejects(
    () => qualifyVisit(qualifyRequest("missing-binding-seed"), baseEnv),
    /访问概览存储尚未完成配置/,
  );
  globalThis.visitKv = { get() {}, put() {}, list() {} };
  await assert.rejects(
    () => qualifyVisit(qualifyRequest("incomplete-binding-seed"), { ...baseEnv, visitKv: fallbackKv }),
    /访问概览存储尚未完成配置/,
    "Production 全局 binding 能力不完整时不得被 env fallback 掩盖",
  );

  const pagedKv = createPagedKv([
    [record("visit_ROBOTAXI_20260730_a", "ROBOTAXI", "a")],
    [record("visit_XINGBUILD_20260730_b", "XINGBUILD", "b")],
  ]);
  globalThis.visitKv = pagedKv;
  const auth = await authenticate(authRequest(), baseEnv);
  const result = await listVisitRecords(recordsRequest(auth.token), baseEnv);
  assert.equal(result.summary.qualified_visit_count, 2);
  assert.equal(pagedKv.scanCalls(), 2, "complete=false + cursor 必须继续，complete=true 必须停止");

  const legacyKv = createPagedKv([[record("visit_ROBOTAXI_20260730_legacy", "ROBOTAXI", "legacy")]], true);
  globalThis.visitKv = legacyKv;
  const legacyResult = await listVisitRecords(recordsRequest(auth.token), baseEnv);
  assert.equal(legacyResult.summary.qualified_visit_count, 1, "旧 mock 的 list_complete 仅作有界兼容");

  const cyclingKv = createCyclingKv();
  globalThis.visitKv = cyclingKv;
  const boundedResult = await listVisitRecords(recordsRequest(auth.token), baseEnv);
  assert.equal(boundedResult.summary.qualified_visit_count, 0);
  assert.equal(cyclingKv.scanCalls(), 6, "异常 cursor 最多扫描 5 页，并保留 1 次既有有界清理");
} finally {
  delete globalThis.visitKv;
}

console.log("v049.13.23 EdgeOne KV 运行时 binding 与有界分页验证通过");

function qualifyRequest(seed) {
  return new Request("https://robotaxi.xingbuild.top/api/visits/qualify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      site_code: "ROBOTAXI",
      visitor_seed: seed.padEnd(20, "0"),
      device_type: "DESKTOP",
      website_version: "v049.13.23",
    }),
  });
}

function authRequest() {
  return new Request("https://robotaxi.xingbuild.top/api/visits/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "test-admin-password" }),
  });
}

function recordsRequest(token) {
  return new Request("https://robotaxi.xingbuild.top/api/visits/records?period=30D&site=ALL", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function record(key, siteCode, visitorIdentifier) {
  return [key, JSON.stringify({
    site_code: siteCode,
    qualified_date: "20260730",
    visitor_identifier: visitorIdentifier,
    first_qualified_at: "2026-07-30T08:00:00.000Z",
    last_qualified_at: new Date().toISOString(),
    device_type: "DESKTOP",
    website_version: "v049.13.23",
  })];
}

function createKv() {
  const values = new Map();
  return {
    async get(key) { return values.get(key) || null; },
    async put(key, value) { values.set(key, value); },
    async delete(key) { values.delete(key); },
    async list({ prefix = "", limit = 100 }) {
      return {
        keys: [...values.keys()].filter((key) => key.startsWith(prefix)).slice(0, limit).map((key) => ({ key })),
        complete: true,
        cursor: null,
      };
    },
    size() { return values.size; },
  };
}

function createPagedKv(pages, legacy = false) {
  const values = new Map(pages.flat());
  let scanCount = 0;
  return {
    async get(key) { return values.get(key) || null; },
    async put(key, value) { values.set(key, value); },
    async delete(key) { values.delete(key); },
    async list({ prefix = "", cursor } = {}) {
      if (prefix === "visit_" && scanCount < pages.length) {
        const index = cursor ? Number(cursor) : 0;
        const complete = index >= pages.length - 1;
        scanCount += 1;
        return {
          keys: pages[index].map(([key]) => ({ key })),
          ...(legacy ? { list_complete: complete } : { complete }),
          cursor: complete ? null : String(index + 1),
        };
      }
      return { keys: [], ...(legacy ? { list_complete: true } : { complete: true }), cursor: null };
    },
    scanCalls() { return scanCount; },
  };
}

function createCyclingKv() {
  let scanCount = 0;
  return {
    async get() { return null; },
    async put() {},
    async delete() {},
    async list({ prefix = "" } = {}) {
      if (prefix === "visit_") scanCount += 1;
      return { keys: [], complete: false, cursor: "same-cursor" };
    },
    scanCalls() { return scanCount; },
  };
}
