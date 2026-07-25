import assert from "node:assert/strict";

const [expectedVersion, expectedCommit] = process.argv.slice(2);
const manifestUrl = "https://robotaxi.xingbuild.top/deployment-manifest.json";
const timeoutAt = Date.now() + 12 * 60 * 1000;

assert(/^v\d+(?:\.\d+)+$/.test(expectedVersion || ""), "缺少有效发布版本号");
assert(/^[0-9a-f]{40}$/.test(expectedCommit || ""), "缺少有效发布提交");

console.log(`等待 EdgeOne 将 ${expectedVersion} 发布到正式域名...`);

while (Date.now() < timeoutAt) {
  const manifest = await readJson(`${manifestUrl}?t=${Date.now()}`);
  if (manifest?.version === expectedVersion && manifest?.commit === expectedCommit) {
    assert.equal(manifest.deployment_target, "EDGEONE", "公网部署目标不是 EdgeOne");
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
