import assert from "node:assert/strict";
import fs from "node:fs";

const workflow = fs.readFileSync(".github/workflows/deploy-pages.yml", "utf8");
const publishCommand = fs.readFileSync("publish-robotaxi.command", "utf8");

assert(workflow.includes("github.ref_name"), "Actions 运行名称必须使用发布标签版本号");
assert(/push:\s*\n\s+tags:\s*\n\s+- ["']v\*["']/.test(workflow), "Pages 必须由版本标签触发");
assert(workflow.includes("verify-release-version.mjs"), "Pages 构建前必须校验标签与 VERSION.md");
assert(workflow.includes('git rev-parse "$RELEASE_VERSION^{}"'), "Pages 必须校验标签指向当前提交");
assert(!workflow.includes("git log -1 --format=%s"), "Pages 发布不得依赖提交说明格式");
assert(publishCommand.includes("git -c http.version=HTTP/1.1 push"), "双击发布命令必须规避不稳定的 HTTP/2 推送链路");
assert(publishCommand.includes("max_attempts=3"), "双击发布命令必须对临时网络失败进行有限重试");
assert(publishCommand.includes("--connect-timeout 10"), "双击发布命令必须在完整检查前快速探测 GitHub 网络");
const tagPushIndex = publishCommand.indexOf('push_with_retry "$HEAD_TAG"');
const mainPushIndex = publishCommand.indexOf("push_with_retry main");
assert(mainPushIndex >= 0 && tagPushIndex > mainPushIndex, "双击发布命令必须先推送 main 再用版本标签触发发布");
assert(publishCommand.includes("verify-release-version.mjs"), "双击发布命令必须先校验版本号");
assert(publishCommand.includes("wait-for-github-pages.mjs"), "双击发布命令必须等待并校验公网版本");

console.log("GitHub Pages 版本化发布工作流验证通过");
