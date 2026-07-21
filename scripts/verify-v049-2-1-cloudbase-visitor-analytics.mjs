import assert from "node:assert/strict";
import fs from "node:fs";

const service = read("src/ui/visitorAnalyticsService.js");
const main = read("src/main.jsx");
const index = read("index.html");
const cloudFunction = read("cloudfunctions/visitorAnalytics/index.js");
const dictionary = read("src/domain/fieldDictionary.js");
const documentation = read("doc/common/cloudbase-visitor-analytics.md");

assert.match(index, /robotaxi-visit-api-base/);
assert.doesNotMatch(index, /robotaxi-cloudbase-env/);
assert.match(service, /CLOUDBASE_DATABASE/);
assert.match(service, /fetch\(api/);
assert.doesNotMatch(service, /cloudbase\.esm|signInAnonymously|anonymousAuthProvider/);
assert.match(service, /export function markPlatformEntered/);
assert.match(service, /tracker\.cleanup = beginTrackedSession/);
assert.doesNotMatch(service.match(/export function startVisitTracking[\s\S]*?\n}/)?.[0] || "", /beginTrackedSession/,
  "初始化访问服务时不得直接创建访问记录");
assert.match(main, /visitorAnalyticsService\.markPlatformEntered\(\)/);
assert.match(cloudFunction, /collection\("visitor_sessions"\)/);
assert.match(cloudFunction, /require\("@cloudbase\/node-sdk"\)/);
assert.match(cloudFunction, /SYMBOL_CURRENT_ENV/);
assert.match(cloudFunction, /Access-Control-Allow-Origin/);
assert.match(cloudFunction, /https:\/\/chizheng4\.github\.io/);
assert.match(cloudFunction, /VISIT_ADMIN_PASSWORD/);
assert.match(cloudFunction, /VISIT_TOKEN_SECRET/);
assert.match(cloudFunction, /START_VISIT/);
assert.match(cloudFunction, /LIST_RECORDS/);
assert.doesNotMatch(cloudFunction, /EO-Connecting-IP|x-forwarded-for|remoteAddress|page_path|click|action_path/i,
  "云函数不得采集原始 IP、页面路径或点击行为");
assert.match(dictionary, /browser_type/);
assert.match(dictionary, /WECHAT_BROWSER/);
assert.match(documentation, /输入“金星”并成功进入平台后，才创建一条访问记录/);
console.log("v049.2.1 CloudBase 访问记录合同验证通过");

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
