import assert from "node:assert/strict";
import fs from "node:fs";
import { createReleaseHistorySource, parseReleaseHistory } from "./generate-release-history.mjs";

const checkMode = process.argv.includes("--check");
const versionMarkdown = fs.readFileSync("VERSION.md", "utf8");
const latestVersion = versionMarkdown.match(/^##\s+(v\d+(?:\.\d+)+)\s*$/m)?.[1];

assert(latestVersion, "VERSION.md 缺少有效的最新版本号");

const cacheToken = latestVersion.replaceAll(".", "-");
const expectedReleaseSource = createReleaseHistorySource(versionMarkdown);
const releases = parseReleaseHistory(versionMarkdown);
const indexPath = "index.html";
const verificationPath = "scripts/verify-release-history-user-display.mjs";
const releaseHistoryPath = "src/ui/releaseHistory.js";
const currentIndex = fs.readFileSync(indexPath, "utf8");
const currentVerification = fs.readFileSync(verificationPath, "utf8");
const versionAssertionPattern = /assert\.equal\(latest\.version,\s*"v\d+(?:\.\d+)+"/;
assert(versionAssertionPattern.test(currentVerification), "最新版本检查脚本格式无法自动同步");
const nextIndex = currentIndex
  .replace(/src\/styles\.css\?v=[^"']+/g, `src/styles.css?v=${cacheToken}`)
  .replace(/src\/main\.bundle\.js\?v=[^"']+/g, `src/main.bundle.js?v=${cacheToken}`);
const nextVerification = currentVerification.replace(
  versionAssertionPattern,
  `assert.equal(latest.version, "${latestVersion}"`,
);

assert.equal(releases[0]?.version, latestVersion, "站内更新记录无法识别 VERSION.md 最新版本");

if (checkMode) {
  assert.equal(currentIndex, nextIndex, "index.html 缓存标识与最新版本不一致，请执行版本元数据同步");
  assert(currentVerification.includes(`latest.version, "${latestVersion}"`), "站内更新记录检查版本与最新版本不一致");
  assert.equal(fs.readFileSync(releaseHistoryPath, "utf8"), expectedReleaseSource, "站内更新记录与 VERSION.md 不一致");
  console.log(`版本元数据同步检查通过：${latestVersion}`);
} else {
  fs.writeFileSync(indexPath, nextIndex);
  fs.writeFileSync(verificationPath, nextVerification);
  fs.writeFileSync(releaseHistoryPath, expectedReleaseSource);
  console.log(`版本元数据已同步：${latestVersion}`);
}
