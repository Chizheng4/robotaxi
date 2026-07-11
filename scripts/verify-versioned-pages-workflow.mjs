import assert from "node:assert/strict";
import fs from "node:fs";

const workflow = fs.readFileSync(".github/workflows/deploy-pages.yml", "utf8");
const publishCommand = fs.readFileSync("publish-robotaxi.command", "utf8");

assert(workflow.includes('run-name: ${{ github.ref_type == \'tag\' && github.ref_name || inputs.version }}'), "Actions 运行名称必须显示发布版本");
assert(/push:\s*\n\s+tags:\s*\n\s+- "v\*"/.test(workflow), "Pages 必须由 v* 标签触发");
assert(!/push:\s*\n\s+branches:/.test(workflow), "Pages 不应再由无版本号的 main 推送直接触发");
assert(workflow.includes("verify-release-version.mjs"), "Pages 构建前必须校验标签与 VERSION.md");
assert(publishCommand.includes("git push origin main --follow-tags"), "双击发布命令必须同时推送 main 和版本标签");
assert(publishCommand.includes("verify-release-version.mjs"), "双击发布命令必须先校验版本号");

console.log("GitHub Pages 版本化发布工作流验证通过");
