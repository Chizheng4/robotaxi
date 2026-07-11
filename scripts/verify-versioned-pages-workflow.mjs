import assert from "node:assert/strict";
import fs from "node:fs";

const workflow = fs.readFileSync(".github/workflows/deploy-pages.yml", "utf8");
const publishCommand = fs.readFileSync("publish-robotaxi.command", "utf8");

assert(workflow.includes("github.event.head_commit.message"), "Actions 运行名称必须显示版本提交说明");
assert(/push:\s*\n\s+branches:\s*\n\s+- main/.test(workflow), "Pages 必须由 main 版本提交稳定触发");
assert(workflow.includes("verify-release-version.mjs"), "Pages 构建前必须校验标签与 VERSION.md");
assert(workflow.includes('git tag --points-at HEAD --list "$RELEASE_VERSION"'), "Pages 必须校验 HEAD 版本标签");
assert(workflow.includes("git log -1 --format=%s"), "Pages 必须校验版本提交说明");
assert(publishCommand.includes("git push origin main --follow-tags"), "双击发布命令必须同时推送 main 和版本标签");
assert(publishCommand.includes("verify-release-version.mjs"), "双击发布命令必须先校验版本号");
assert(publishCommand.includes("wait-for-github-pages.mjs"), "双击发布命令必须等待并校验公网版本");

console.log("GitHub Pages 版本化发布工作流验证通过");
