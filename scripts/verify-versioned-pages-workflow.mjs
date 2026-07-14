import assert from "node:assert/strict";
import fs from "node:fs";

const workflow = fs.readFileSync(".github/workflows/deploy-pages.yml", "utf8");
const publishCommand = fs.readFileSync("publish-robotaxi.command", "utf8");

assert(workflow.includes("github.event.head_commit.message"), "Actions 运行名称必须显示版本提交说明");
assert(/push:\s*\n\s+branches:\s*\n\s+- main/.test(workflow), "Pages 必须由受保护的 main 环境触发");
assert(workflow.includes("verify-release-version.mjs"), "Pages 构建前必须校验标签与 VERSION.md");
assert(workflow.includes("git fetch --force --tags origin"), "Pages 校验前必须显式同步版本标签");
assert(workflow.includes('git rev-parse "$RELEASE_VERSION^{}"'), "Pages 必须校验标签指向当前提交");
assert(!workflow.includes("git log -1 --format=%s"), "Pages 发布不得依赖提交说明格式");
assert(publishCommand.includes("git -c http.version=HTTP/1.1 push"), "双击发布命令必须规避不稳定的 HTTP/2 推送链路");
assert(publishCommand.includes("max_attempts=3"), "双击发布命令必须对临时网络失败进行有限重试");
assert(publishCommand.includes("--connect-timeout 10"), "双击发布命令必须在完整检查前快速探测 GitHub 网络");
const tagPushIndex = publishCommand.indexOf('push_with_retry "$HEAD_TAG"');
const mainPushIndex = publishCommand.indexOf("push_with_retry main");
assert(tagPushIndex >= 0 && mainPushIndex > tagPushIndex, "双击发布命令必须先推送标签再用 main 触发受保护环境发布");
assert(publishCommand.includes("verify-release-version.mjs"), "双击发布命令必须先校验版本号");
assert(publishCommand.includes("wait-for-github-pages.mjs"), "双击发布命令必须等待并校验公网版本");

console.log("GitHub Pages 版本化发布工作流验证通过");
