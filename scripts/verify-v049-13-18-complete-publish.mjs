import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const publish = read("publish-robotaxi.command");
const build = read("scripts/build-github-pages.mjs");
const verify = read("scripts/verify-github-pages-build.mjs");
const publicVerify = read("scripts/wait-for-github-pages.mjs");
const visitorService = read("src/ui/visitorAnalyticsService.js");
const main = read("src/main.jsx");
const workflow = read("doc/rules/01-iteration-workflow.md");
const execution = read("doc/rules/05-codex-execution-rules.md");

assert(!publish.includes('makers deploy dist --name'), "固定 publish 不得再次只部署静态 dist");
assert(publish.includes('EDGEONE_SOURCE_DIR="dist"'));
assert(publish.includes('EDGEONE_PREFLIGHT_DIR="$EDGEONE_SOURCE_DIR/.edgeone"'));
assert(publish.includes('makers deploy "$EDGEONE_SOURCE_DIR"'));
assert(!publish.includes('makers deploy "$EDGEONE_PREFLIGHT_DIR"'), "固定 publish 不得上传预构建目录");
assert(publish.includes('EXPECTED_VISIT_ENV_REVISION="rev-20260730-01"'));
assert(publish.includes("ROBOTAXI_REQUIRE_EDGEONE_BUILD=1"));
assert(build.includes('fs.cpSync(path.join(rootDir, "edge-functions")'));
assert(build.includes('execFileSync(edgeoneCli, ["makers", "build"]'));
assert(verify.includes('edgeoneOutputDir, "edge-functions/index.js"'));
for (const route of ["auth", "qualify", "records"]) {
  assert(verify.includes(`^/api/visits/${route}$`), `完整产物门禁缺少 ${route} 路由`);
}
assert(publicVerify.includes('"AUTOMATED_QA"'));
assert(publicVerify.includes("recordsResponse.status, 401"));
assert(publicVerify.includes('"ADMIN_PASSWORD_MISMATCH"'));
assert(publicVerify.includes("expectedEnvRevision"));
assert(visitorService.includes('contentType.toLowerCase().includes("application/json")'));
assert(visitorService.includes("访问概览服务未正确发布，请稍后重试"));
assert(visitorService.includes("if (!result?.token)"));
assert(main.includes('aria-busy={visitorPasswordLoading}'));
assert(main.includes('disabled={!visitorPassword || visitorPasswordLoading}'));
assert(workflow.includes("跨 Task 草案与 Engineering 串行交付"));
assert(workflow.includes("禁止修改当前迭代指针"));
assert(execution.includes("静态 manifest"));
assert(execution.includes("KV binding"));

console.log("v049.13.18 完整发布、访问反馈与串行交付合同验证通过");
