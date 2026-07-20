import assert from "node:assert/strict";
import fs from "node:fs";
import { authenticate, heartbeatVisit, listVisitRecords, startVisit } from "../edge-functions/lib/visitAnalytics.js";

class MemoryKv {
  values = new Map();
  async put(key, value) { this.values.set(key, value); }
  async get(key) { return this.values.get(key) || null; }
  async list({ prefix = "", limit = 100, cursor } = {}) {
    const allKeys = [...this.values.keys()].filter((key) => key.startsWith(prefix)).sort();
    const offset = Number(cursor || 0);
    const keys = allKeys.slice(offset, offset + limit).map((name) => ({ name }));
    const nextOffset = offset + keys.length;
    return { keys, list_complete: nextOffset >= allKeys.length, cursor: nextOffset >= allKeys.length ? undefined : String(nextOffset) };
  }
}

const kv = new MemoryKv();
const env = {
  visitKv: kv,
  visitAdminPassword: "test-password",
  visitHashSecret: "test-secret-longer-than-sixteen-characters",
  visitAllowedOrigin: "https://chizheng4.github.io",
};

const startRequest = jsonRequest("https://api.example.com/api/visits/start", {
  visit_id: "visitor-session-0001",
  started_at: new Date().toISOString(),
  website_version: "v048.0.0",
  page_path: "/robotaxi/",
  device_type: "MOBILE",
  timezone: "Asia/Shanghai",
}, { "EO-Connecting-IP": "203.0.113.88", "User-Agent": "Visitor Browser" });
const started = await startVisit(startRequest, env);
assert.equal(started.device_type, "MOBILE");
assert.equal(started.website_version, "v048.0.0");
assert.ok(started.visitor_identifier.length === 12);
assert.doesNotMatch(JSON.stringify(started), /203\.0\.113\.88/, "访问记录不得保存原始 IP");

const heartbeat = await heartbeatVisit(jsonRequest("https://api.example.com/api/visits/heartbeat", {
  visit_id: started.visit_id,
  visit_started_at: started.visit_started_at,
  active_seconds: 30,
  platform_entered: true,
}), env);
assert.equal(heartbeat.active_duration_seconds, 30);
assert.equal(heartbeat.platform_entered, true);

const restarted = await startVisit(jsonRequest("https://api.example.com/api/visits/start", {
  visit_id: started.visit_id,
  started_at: started.visit_started_at,
  website_version: "v048.0.0",
  page_path: "/robotaxi/",
  device_type: "MOBILE",
  timezone: "Asia/Shanghai",
}, { "EO-Connecting-IP": "203.0.113.88", "User-Agent": "Visitor Browser" }), env);
assert.equal(restarted.active_duration_seconds, 30, "同一标签页刷新不得清空已累计有效时长");
assert.equal(restarted.platform_entered, true, "同一标签页刷新不得清空进入平台标记");

const auth = await authenticate(jsonRequest("https://api.example.com/api/visits/auth", { password: "test-password" }), env);
assert.ok(auth.token.includes("."));

const recordsRequest = new Request("https://api.example.com/api/visits/records?period=7D", {
  headers: { Authorization: `Bearer ${auth.token}`, Origin: "https://chizheng4.github.io" },
});
const records = await listVisitRecords(recordsRequest, env);
assert.equal(records.summary.visit_count, 1);
assert.equal(records.summary.unique_visitor_count, 1);
assert.equal(records.summary.platform_entry_count, 1);
assert.equal(records.summary.average_active_duration_seconds, 30);
assert.ok([...kv.values.keys()][0].startsWith(`visit:${started.visit_started_at.slice(0, 10).replace(/-/g, "")}:`));

await assert.rejects(
  () => authenticate(jsonRequest("https://api.example.com/api/visits/auth", { password: "wrong" }), env),
  /密码不正确/,
);

const mainSource = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const styleSource = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const indexSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert.match(mainSource, /String\(value \|\| ""\)\.trim\(\) === "访问"/);
assert.match(mainSource, /VisitorRecordsScreen/);
assert.match(styleSource, /\.visitor-records-shell/);
assert.match(styleSource, /@media \(max-width: 767px\)[\s\S]*\.visitor-records-panel/);
assert.match(indexSource, /robotaxi-visit-api-base/);

const clientServiceSource = fs.readFileSync(new URL("../src/ui/visitorAnalyticsService.js", import.meta.url), "utf8");
assert.match(clientServiceSource, /EDGEONE_KV/);
assert.match(clientServiceSource, /LOCAL_PREVIEW/);
assert.match(clientServiceSource, /UNAVAILABLE/);
assert.match(clientServiceSource, /isLoopback/);
assert.match(clientServiceSource, /localRecordsKey/);
assert.match(clientServiceSource, /if \(storageMode === "UNAVAILABLE"\) return \(\) => \{\};/);

console.log("v048.0.0 访问记录服务验证通过");

function jsonRequest(url, body, extraHeaders = {}) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://chizheng4.github.io", ...extraHeaders },
    body: JSON.stringify(body),
  });
}
