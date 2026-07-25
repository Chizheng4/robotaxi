import assert from "node:assert/strict";
import fs from "node:fs";

const publishCommand = fs.readFileSync("publish-robotaxi.command", "utf8");

assert(!fs.existsSync(".github/workflows/deploy-pages.yml"), "GitHub Pages 自动部署工作流必须停用，避免形成第二个生产站点");
assert(publishCommand.includes("git -c http.version=HTTP/1.1 push"), "双击发布命令必须规避不稳定的 HTTP/2 推送链路");
assert(publishCommand.includes("DEFAULT_GITHUB_PROXY=\"http://127.0.0.1:7897\""), "双击发布命令必须自动探测本地 GitHub 代理");
assert(publishCommand.includes('http.proxy="$GITHUB_PROXY"'), "Git 推送必须复用发布命令探测到的代理");
assert(publishCommand.includes("NODE_USE_ENV_PROXY=1"), "公网版本等待必须复用发布命令探测到的代理");
assert(publishCommand.includes("--noproxy '*'"), "本地代理不可用时必须支持直连回退");
assert(publishCommand.includes("max_attempts=3"), "双击发布命令必须对临时网络失败进行有限重试");
assert(publishCommand.includes("--connect-timeout 10"), "双击发布命令必须在完整检查前快速探测 GitHub 网络");
const tagPushIndex = publishCommand.indexOf('push_with_retry "$HEAD_TAG"');
const mainPushIndex = publishCommand.indexOf("push_with_retry main");
assert(tagPushIndex >= 0 && mainPushIndex > tagPushIndex, "双击发布命令必须先推送标签再用 main 触发受保护环境发布");
assert(publishCommand.includes("verify-release-version.mjs"), "双击发布命令必须先校验版本号");
assert(publishCommand.includes("wait-for-github-pages.mjs"), "双击发布命令必须等待并校验公网版本");
assert(publishCommand.includes("https://robotaxi.xingbuild.top/"), "双击发布命令必须以个人正式域名作为上线结果");
assert(!publishCommand.includes("https://chizheng4.github.io/robotaxi/"), "双击发布命令不得继续报告旧 GitHub Pages 地址");

console.log("EdgeOne 正式域名版本化发布工作流验证通过");
