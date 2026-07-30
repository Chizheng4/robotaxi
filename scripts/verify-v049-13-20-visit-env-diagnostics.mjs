import assert from "node:assert/strict";
import fs from "node:fs";
import {
  authenticate,
  errorResponse,
} from "../edge-functions/lib/visitAnalytics.js";

const knownPassword = "diagnostic-test-password";
const knownRevision = "visit-env-revision-test";
const baseEnv = {
  visitAdminPassword: knownPassword,
  visitHashSecret: "test-secret-at-least-24-characters",
  visitEnvRevision: knownRevision,
};

await assertDiagnostic({}, "ADMIN_PASSWORD_MISSING", knownRevision, {
  visitEnvRevision: knownRevision,
});
await assertDiagnostic({}, "ADMIN_PASSWORD_MISSING", null, {});
await assertDiagnostic({}, "ADMIN_PASSWORD_HAS_INVISIBLE_CHARS", knownRevision, {
  ...baseEnv,
  visitAdminPassword: `${knownPassword}\u200b`,
});
await assertDiagnostic({}, "ADMIN_PASSWORD_HAS_INVISIBLE_CHARS", knownRevision, {
  ...baseEnv,
  visitAdminPassword: ` ${knownPassword}`,
});
await assertDiagnostic({}, "ADMIN_PASSWORD_MISMATCH", knownRevision, baseEnv);

const succeeded = await authenticate(createRequest({ password: knownPassword }), baseEnv);
assert.match(succeeded.token, /^[^.]+\.[^.]+$/);
assert.equal(typeof succeeded.expires_at, "number");
assert.deepEqual(Object.keys(succeeded).sort(), ["expires_at", "token"], "成功响应不得增加诊断字段");

const edgeSource = read("edge-functions/lib/visitAnalytics.js");
const serviceSource = read("src/ui/visitorAnalyticsService.js");
assert.match(edgeSource, /ADMIN_PASSWORD_MISSING/);
assert.match(edgeSource, /ADMIN_PASSWORD_HAS_INVISIBLE_CHARS/);
assert.match(edgeSource, /ADMIN_PASSWORD_MISMATCH/);
assert.match(edgeSource, /String\(env\.visitEnvRevision \|\| ""\) \|\| null/);
assert.match(serviceSource, /ADMIN_PASSWORD_MISSING: "访问密码尚未完成配置"/);
assert.match(serviceSource, /ADMIN_PASSWORD_HAS_INVISIBLE_CHARS: "访问密码配置包含不可见字符，请重新保存"/);
assert.match(serviceSource, /ADMIN_PASSWORD_MISMATCH: "密码不正确"/);
assert.doesNotMatch(serviceSource, /throw new Error\(result\?\.code/);

const originalLocation = globalThis.location;
const originalFetch = globalThis.fetch;
Object.defineProperty(globalThis, "location", {
  configurable: true,
  value: { hostname: "robotaxi.xingbuild.top" },
});
const { authenticateVisitorRecords } = await import("../src/ui/visitorAnalyticsService.js");
await assertFrontendMessage(authenticateVisitorRecords, "ADMIN_PASSWORD_MISSING", "访问密码尚未完成配置");
await assertFrontendMessage(authenticateVisitorRecords, "ADMIN_PASSWORD_HAS_INVISIBLE_CHARS", "访问密码配置包含不可见字符，请重新保存");
await assertFrontendMessage(authenticateVisitorRecords, "ADMIN_PASSWORD_MISMATCH", "密码不正确");
globalThis.fetch = originalFetch;
if (originalLocation === undefined) delete globalThis.location;
else Object.defineProperty(globalThis, "location", { configurable: true, value: originalLocation });

console.log("v049.13.20 访问密码无泄密环境诊断合同验证通过");

async function assertDiagnostic(body, expectedCode, expectedRevision, env) {
  let captured;
  try {
    await authenticate(createRequest(body), env);
  } catch (error) {
    captured = error;
  }
  assert(captured, `必须返回诊断失败：${expectedCode}`);
  const response = errorResponse(captured);
  const payload = await response.json();
  assert.equal(response.status, 401);
  assert.equal(payload.code, expectedCode);
  assert.equal(payload.env_revision, expectedRevision);
  assert.deepEqual(Object.keys(payload).sort(), ["code", "env_revision", "message"]);
  const serialized = JSON.stringify(payload);
  assert(!serialized.includes(knownPassword), "诊断响应不得泄漏密码");
  assert.doesNotMatch(serialized, /length|hash|prefix|suffix|partial|character/i, "诊断响应不得泄漏可猜测信息");
}

function createRequest(body) {
  return new Request("https://robotaxi.xingbuild.top/api/visits/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function assertFrontendMessage(authenticateVisitorRecords, code, expectedMessage) {
  globalThis.fetch = async () => new Response(JSON.stringify({
    code,
    env_revision: knownRevision,
    message: "不得直接使用的服务端文案",
  }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
  await assert.rejects(
    () => authenticateVisitorRecords("diagnostic-client-input"),
    (error) => error.message === expectedMessage,
    `前端必须把 ${code} 映射为中文文案`,
  );
}

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
