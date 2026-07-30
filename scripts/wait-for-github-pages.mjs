import assert from "node:assert/strict";

const [expectedVersion, expectedCommit, expectedEnvRevision] = process.argv.slice(2);
const manifestUrl = "https://robotaxi.xingbuild.top/deployment-manifest.json";
const timeoutAt = Date.now() + 12 * 60 * 1000;

assert(/^v\d+(?:\.\d+)+$/.test(expectedVersion || ""), "缺少有效发布版本号");
assert(/^[0-9a-f]{40}$/.test(expectedCommit || ""), "缺少有效发布提交");
assert(/^rev-[a-zA-Z0-9_-]+$/.test(expectedEnvRevision || ""), "缺少有效非秘密环境修订标识");

console.log(`等待 EdgeOne 将 ${expectedVersion} 发布到正式域名...`);

while (Date.now() < timeoutAt) {
  const manifest = await readJson(`${manifestUrl}?t=${Date.now()}`);
  if (manifest?.version === expectedVersion && manifest?.commit === expectedCommit) {
    assert.equal(manifest.deployment_target, "EDGEONE", "公网部署目标不是 EdgeOne");
    await verifyProductionFunctions();
    console.log(`EdgeOne 正式域名验证通过：${manifest.version} (${manifest.commit.slice(0, 8)})`);
    process.exit(0);
  }
  await delay(5000);
}

throw new Error(`EdgeOne 正式域名验证超时：期望 ${expectedVersion} (${expectedCommit.slice(0, 8)})，请检查 EdgeOne 构建部署记录`);

async function readJson(url) {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyProductionFunctions() {
  const qualifyResponse = await fetch("https://robotaxi.xingbuild.top/api/visits/qualify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "RobotaxiQA verifyBrowserLoad",
      "X-Robotaxi-QA": "verifyBrowserLoad",
    },
    body: JSON.stringify({
      site_code: "ROBOTAXI",
      visitor_seed: "robotaxiqa-nonwrite-probe",
      device_type: "DESKTOP",
      website_version: expectedVersion,
    }),
    signal: AbortSignal.timeout(15000),
  });
  assert.match(qualifyResponse.headers.get("content-type") || "", /^application\/json\b/i, "qualify 未返回 JSON，Edge Functions 可能缺失");
  assert.equal(qualifyResponse.status, 200, "qualify 公网 QA 请求失败");
  const qualifyPayload = await qualifyResponse.json();
  assert.deepEqual(qualifyPayload, { recorded: false, reason: "AUTOMATED_QA" }, "qualify 未正确排除自动 QA");

  const recordsResponse = await fetch("https://robotaxi.xingbuild.top/api/visits/records?period=7D&site=ALL", {
    headers: { Accept: "application/json", "User-Agent": "RobotaxiQA verifyBrowserLoad" },
    signal: AbortSignal.timeout(15000),
  });
  assert.match(recordsResponse.headers.get("content-type") || "", /^application\/json\b/i, "records 未返回 JSON，Edge Functions 可能缺失");
  assert.equal(recordsResponse.status, 401, "records 未授权请求必须被拒绝");
  const recordsPayload = await recordsResponse.json();
  assert.equal(recordsPayload?.message, "访问概览登录已失效，请重新验证", "records 未授权响应合同不正确");

  const authResponse = await fetch("https://robotaxi.xingbuild.top/api/visits/auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "RobotaxiQA invalid-password-diagnostic",
      "X-Robotaxi-QA": "invalid-password-diagnostic",
    },
    body: JSON.stringify({ password: "__ROBOTAXI_INTENTIONALLY_INVALID_DIAGNOSTIC__" }),
    signal: AbortSignal.timeout(15000),
  });
  assert.match(authResponse.headers.get("content-type") || "", /^application\/json\b/i, "auth 未返回 JSON，Edge Functions 可能缺失");
  assert.equal(authResponse.status, 401, "auth 故意无效密码必须被拒绝");
  const authPayload = await authResponse.json();
  assert.deepEqual(Object.keys(authPayload).sort(), ["code", "env_revision", "message"], "auth 诊断响应包含未授权字段");
  assert.equal(authPayload.code, "ADMIN_PASSWORD_MISMATCH", `auth Production 环境异常：${authPayload.code || "NO_CODE"}`);
  assert.equal(authPayload.env_revision, expectedEnvRevision, "auth Production 环境修订未进入当前部署");
  console.log(`EdgeOne 正式函数验证通过：自动 QA 未写入，未授权查询已拒绝，环境修订 ${authPayload.env_revision}`);
}
