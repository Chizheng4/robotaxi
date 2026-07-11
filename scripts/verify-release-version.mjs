import assert from "node:assert/strict";
import fs from "node:fs";

const expectedVersion = process.argv[2];
const versionSource = fs.readFileSync("VERSION.md", "utf8");
const currentVersion = versionSource.match(/^##\s+(v[^\s]+)/m)?.[1];

assert(expectedVersion, "缺少待发布版本号");
assert(/^v\d+(?:\.\d+)+$/.test(expectedVersion), `发布版本号格式错误：${expectedVersion}`);
assert.equal(expectedVersion, currentVersion, `发布标签 ${expectedVersion} 与 VERSION.md 最新版本 ${currentVersion} 不一致`);

console.log(`发布版本验证通过：${currentVersion}`);
