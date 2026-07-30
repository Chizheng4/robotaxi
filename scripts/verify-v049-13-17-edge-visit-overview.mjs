import assert from "node:assert/strict";
import fs from "node:fs";
import {
  authenticate,
  listVisitRecords,
  qualifyVisit,
} from "../edge-functions/lib/visitAnalytics.js";

const service = read("src/ui/visitorAnalyticsService.js");
const main = read("src/main.jsx");
const index = read("index.html");
const edge = read("edge-functions/lib/visitAnalytics.js");
const dictionary = read("src/domain/fieldDictionary.js");
const docs = read("doc/common/edgeone-lightweight-visit-overview.md");
const kv = createKv();
const env = { visitKv: kv, visitAdminPassword: "test-admin-password", visitHashSecret: "test-secret-at-least-24-characters" };

assert.doesNotMatch(index, /CloudBase|cloudbase|robotaxi-visit-api-base/);
assert.doesNotMatch(service, /START_VISIT|HEARTBEAT_VISIT|END_VISIT|heartbeatInterval|active_duration_seconds|callCloudBase/i);
assert.match(service, /hostname !== productionHost/);
assert.match(service, /navigator\?\.webdriver/);
assert.match(service, /xingbuild_visit_excluded/);
assert.match(main, /markPlatformEntered\(\)/);
assert.match(main, /site === item\.key/);
assert.match(main, /本设备不计入访问记录/);
assert.doesNotMatch(main.slice(main.indexOf("function VisitorRecordsScreen"), main.indexOf("function ReleaseHistoryPanel")), /平均有效时长|formatActiveDuration|browser_type|referrer_type/);
assert.doesNotMatch(edge, /clientIp|Connecting-IP|X-Forwarded-For|X-Real-IP|coarse_region|page_path|referrer|active_duration|heartbeat|visit_started|visit_ended/i);
assert.match(edge, /`\$\{recordPrefix\}\$\{siteCode\}_\$\{qualifiedDate\}_\$\{visitorIdentifier\}`/);
assert.match(edge, /retentionDays = 30/);
assert.match(dictionary, /site_code: "站点"/);
assert.match(dictionary, /XINGBUILD: "xingbuild 网站"/);
assert.match(docs, /不宣称跨站去重/);

const seed = "visitor-seed-1234567890";
env.visitNow = "2026-07-30T08:00:00.000Z";
const first = await qualify("https://robotaxi.xingbuild.top/api/visits/qualify", {
  site_code: "ROBOTAXI",
  visitor_seed: seed,
  device_type: "DESKTOP",
  website_version: "v049.13.17",
});
env.visitNow = "2026-07-30T09:00:00.000Z";
const second = await qualify("https://robotaxi.xingbuild.top/api/visits/qualify", {
  site_code: "ROBOTAXI",
  visitor_seed: seed,
  device_type: "DESKTOP",
  website_version: "v049.13.17",
});
assert.equal(first.record.first_qualified_at, "2026-07-30T08:00:00.000Z");
assert.equal(second.record.first_qualified_at, first.record.first_qualified_at);
assert.equal(second.record.last_qualified_at, "2026-07-30T09:00:00.000Z");
assert.equal(kv.entries().filter(([key]) => key.startsWith("visit_ROBOTAXI_20260730_")).length, 1, "同站点同日必须幂等");
assert.match(kv.entries()[0][0], /^[A-Za-z0-9_]+$/, "KV key 只能包含字母数字下划线");
assert.deepEqual(Object.keys(second.record).sort(), [
  "device_type", "first_qualified_at", "last_qualified_at", "qualified_date", "site_code", "visitor_identifier", "website_version",
].sort());

env.visitNow = "2026-07-30T10:00:00.000Z";
await qualify("https://xingbuild.top/api/visits/qualify", {
  site_code: "XINGBUILD",
  visitor_seed: seed,
  device_type: "MOBILE",
  website_version: "v0.14.2",
});
assert.notEqual(
  kv.entries().find(([, value]) => JSON.parse(value).site_code === "ROBOTAXI")[1],
  kv.entries().find(([, value]) => JSON.parse(value).site_code === "XINGBUILD")[1],
  "两站对象必须独立",
);

const excluded = await qualify("https://robotaxi.xingbuild.top/api/visits/qualify", {
  site_code: "ROBOTAXI", visitor_seed: "excluded-seed-123456",
}, { Cookie: "xingbuild_visit_excluded=1" });
assert.equal(excluded.reason, "DEVICE_EXCLUDED");
const qa = await qualify("https://robotaxi.xingbuild.top/api/visits/qualify", {
  site_code: "ROBOTAXI", visitor_seed: "qa-seed-1234567890",
}, { "User-Agent": "verifyBrowserLoad RobotaxiQA" });
assert.equal(qa.reason, "AUTOMATED_QA");
await assert.rejects(() => qualify("https://robotaxi.xingbuild.top/api/visits/qualify", {
  site_code: "XINGBUILD", visitor_seed: seed,
}), /站点来源不匹配/);

const authResponse = await authenticate(request("https://robotaxi.xingbuild.top/api/visits/auth", {
  password: "test-admin-password",
}), env);
const all = await listVisitRecords(new Request("https://robotaxi.xingbuild.top/api/visits/records?period=30D&site=ALL", {
  headers: { Authorization: `Bearer ${authResponse.token}` },
}), env);
assert.equal(all.summary.qualified_visit_count, 2);
assert.equal(all.summary.unique_visitor_count, 2, "全部范围不得跨站去重");
assert.ok(all.generated_at);

kv.set("visit_ROBOTAXI_20260601_expired", JSON.stringify({
  ...second.record,
  qualified_date: "20260601",
  last_qualified_at: "2026-06-01T00:00:00.000Z",
}));
env.visitNow = new Date().toISOString();
await qualify("https://robotaxi.xingbuild.top/api/visits/qualify", {
  site_code: "ROBOTAXI", visitor_seed: "cleanup-seed-1234567890", qualified_at: new Date().toISOString(),
});
assert.equal(kv.has("visit_ROBOTAXI_20260601_expired"), false, "写入时应有界清理 30 天外记录");

console.log("v049.13.17 EdgeOne 轻量访问概览合同验证通过");

function qualify(url, body, headers = {}) {
  return qualifyVisit(request(url, body, headers), env);
}

function request(url, body, headers = {}) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function createKv() {
  const values = new Map();
  return {
    async get(key) { return values.get(key) || null; },
    async put(key, value) { values.set(key, value); },
    async delete(key) { values.delete(key); },
    async list({ prefix = "", limit = 100 }) {
      return { keys: [...values.keys()].filter((key) => key.startsWith(prefix)).slice(0, limit).map((name) => ({ name })), list_complete: true };
    },
    entries() { return [...values.entries()]; },
    set(key, value) { values.set(key, value); },
    has(key) { return values.has(key); },
  };
}

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
