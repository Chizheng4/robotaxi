import assert from "node:assert/strict";
import fs from "node:fs";

const publish = fs.readFileSync("publish-robotaxi.command", "utf8");
const sourceFiles = [
  "dist/edge-functions/api/visits/auth.js",
  "dist/edge-functions/api/visits/qualify.js",
  "dist/edge-functions/api/visits/records.js",
  "dist/edge-functions/lib/visitAnalytics.js",
];
for (const file of sourceFiles) {
  assert(fs.existsSync(file), `EdgeOne 源包缺少 ${file}`);
  assert(publish.includes(`"$EDGEONE_SOURCE_DIR/${file.replace(/^dist\//, "")}"`), `固定 publish 未检查 ${file}`);
}
assert(!publish.includes('"$EDGEONE_SOURCE_DIR/edge-functions/index.js"'), "源包不得错误要求编译入口");
assert(!publish.includes('"$EDGEONE_SOURCE_DIR/edge-functions/config.json"'), "源包不得错误要求编译配置");

const prebuiltIndex = "dist/.edgeone/edge-functions/index.js";
const prebuiltConfig = "dist/.edgeone/edge-functions/config.json";
assert(fs.existsSync(prebuiltIndex), "EdgeOne 预构建产物缺少编译入口");
assert(fs.existsSync(prebuiltConfig), "EdgeOne 预构建产物缺少路由配置");
assert(publish.includes('"$EDGEONE_PREFLIGHT_DIR/edge-functions/index.js"'));
assert(publish.includes('"$EDGEONE_PREFLIGHT_DIR/edge-functions/config.json"'));

const routes = new Set(JSON.parse(fs.readFileSync(prebuiltConfig, "utf8")).routes.map((route) => route.src));
for (const route of ["^/api/visits/auth$", "^/api/visits/qualify$", "^/api/visits/records$"]) {
  assert(routes.has(route), `EdgeOne 预构建路由缺少 ${route}`);
}

console.log("v049.13.22 EdgeOne 源包与预构建双层门禁验证通过");
