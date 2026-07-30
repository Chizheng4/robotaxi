import assert from "node:assert/strict";
import fs from "node:fs";

const publish = fs.readFileSync("publish-robotaxi.command", "utf8");
const publicVerify = fs.readFileSync("scripts/wait-for-github-pages.mjs", "utf8");
const buildVerify = fs.readFileSync("scripts/verify-github-pages-build.mjs", "utf8");

assert(publish.includes('EDGEONE_SOURCE_DIR="dist"'), "正式发布必须从完整源包目录启动 Makers 构建");
assert(publish.includes('EDGEONE_PREFLIGHT_DIR="$EDGEONE_SOURCE_DIR/.edgeone"'), "发布前必须保留预构建完整产物门禁");
assert(publish.includes('makers deploy "$EDGEONE_SOURCE_DIR" --name "$EDGEONE_PROJECT" --env production'));
assert(!publish.includes('makers deploy "$EDGEONE_PREFLIGHT_DIR"'), "正式发布不得上传预构建 .edgeone 目录");
assert(!/\b(?:env|environment)\s+(?:ls|list|pull|get)\b/i.test(publish), "固定发布不得读取或输出 Production 环境变量");
assert(!publish.includes("visitAdminPassword"));
assert(!publish.includes("visitHashSecret"));

assert(publicVerify.includes('"__ROBOTAXI_INTENTIONALLY_INVALID_DIAGNOSTIC__"'));
assert(publicVerify.includes('authPayload.code, "ADMIN_PASSWORD_MISMATCH"'));
assert(publicVerify.includes("authPayload.env_revision, expectedEnvRevision"));
assert(publicVerify.includes('["code", "env_revision", "message"]'));
assert(buildVerify.includes("findEnvironmentFiles(outputDir)"));

console.log("v049.13.21 Makers Production 环境注入发布合同验证通过");
