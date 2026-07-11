import assert from "node:assert/strict";

const [expectedVersion, expectedCommit] = process.argv.slice(2);
const repository = "Chizheng4/robotaxi";
const actionsUrl = `https://api.github.com/repos/${repository}/actions/runs?per_page=20`;
const manifestUrl = "https://chizheng4.github.io/robotaxi/deployment-manifest.json";
const timeoutAt = Date.now() + 12 * 60 * 1000;

assert(/^v\d+(?:\.\d+)+$/.test(expectedVersion || ""), "缺少有效发布版本号");
assert(/^[0-9a-f]{40}$/.test(expectedCommit || ""), "缺少有效发布提交");

console.log(`等待 ${expectedVersion} 的 GitHub Actions...`);
let actionCompleted = false;
while (Date.now() < timeoutAt) {
  const payload = await readJson(`${actionsUrl}&t=${Date.now()}`);
  const run = payload?.workflow_runs?.find((item) => item.head_sha === expectedCommit);
  if (run?.status === "completed") {
    assert.equal(run.conclusion, "success", `GitHub Actions 执行失败：${run.html_url}`);
    console.log(`GitHub Actions 已完成：${run.display_title}`);
    actionCompleted = true;
    break;
  }
  await delay(5000);
}

assert(actionCompleted, "等待 GitHub Actions 超时，请打开 Actions 页面检查");
console.log("等待公网网站切换到最新版本...");

while (Date.now() < timeoutAt) {
  const manifest = await readJson(`${manifestUrl}?t=${Date.now()}`);
  if (manifest?.version === expectedVersion && manifest?.commit === expectedCommit) {
    console.log(`公网版本验证通过：${manifest.version} (${manifest.commit.slice(0, 8)})`);
    process.exit(0);
  }
  await delay(5000);
}

throw new Error(`公网版本验证超时：期望 ${expectedVersion} (${expectedCommit.slice(0, 8)})`);

async function readJson(url) {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
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
