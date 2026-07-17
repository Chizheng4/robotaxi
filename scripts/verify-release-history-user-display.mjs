import assert from "node:assert/strict";
import fs from "node:fs";
import { parseReleaseHistory } from "./generate-release-history.mjs";

const markdown = fs.readFileSync("VERSION.md", "utf8");
const releases = parseReleaseHistory(markdown);
const latest = releases[0];
const versionCount = (markdown.match(/^##\s+v\d[^\s]*\s*$/gm) || []).length;

assert.equal(latest.version, "v047.1.1", "网站更新记录必须与最新工程版本一致");
assert.equal(releases.length, versionCount, "网站更新记录必须包含全部历史版本");
assert.equal(latest.audienceSource, "curated", "最新版本必须提供人工整理的用户文案");
assert(latest.audienceTitle.length > 0, "最新版本缺少用户标题");
assert(latest.audienceChanges.length >= 1, "最新版本缺少用户更新要点");
assert(latest.audienceChanges.length <= 4, "用户更新要点应保持紧凑");
assert(!latest.audienceChanges.some((change) => change.includes("`")), "用户文案不得显示 Markdown 代码标记");
assert(releases.every((release) => release.audienceTitle.length > 0), "所有历史版本必须生成用户标题");
assert(releases.every((release) => release.audienceChanges.length > 0), "所有历史版本必须生成用户更新要点");
assert(!releases.some((release) => release.audienceChanges.some((change) => change.includes("`"))), "历史用户文案不得显示 Markdown 代码标记");

const recentVersions = releases.filter((release) => ["v041.3.1", "v041.3.0", "v041.2.16", "v041.2.15", "v041.2.14"].includes(release.version));
assert.equal(recentVersions.length, 5, "近期公开演示版本记录不完整");
assert(recentVersions.every((release) => release.audienceSource === "curated"), "近期公开演示版本必须使用用户友好文案");

const mainSource = fs.readFileSync("src/main.jsx", "utf8");
assert(mainSource.includes("release.audienceTitle"), "前端必须展示用户标题");
assert(mainSource.includes("release.audienceChanges"), "前端必须展示用户更新要点");
assert(mainSource.includes('aria-label="更新记录"'), "前端更新记录需要明确的可访问名称");
assert(mainSource.includes("查看更多更新"), "前端必须按需展开完整历史过程");
assert(mainSource.includes("releaseHistory.slice(0, initialVisibleCount)"), "前端首屏不得一次渲染全部历史版本");

console.log("网站用户友好更新记录合同验证通过");
