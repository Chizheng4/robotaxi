import assert from "node:assert/strict";
import fs from "node:fs";

const mainSource = read("src/main.jsx");
const styleSource = read("src/styles.css");
const indexSource = read("index.html");
const viewportSource = read("src/ui/responsiveViewport.js");

assert.match(mainSource, /String\(value \|\| ""\)\.trim\(\) === "访问"/);
assert.match(mainSource, /VisitorRecordsScreen/);
assert.match(styleSource, /\.visitor-records-shell/);
assert.match(styleSource, /@media \(max-width: 767px\)[\s\S]*\.visitor-records-panel/);
assert.match(mainSource, /rootClassName="viewport-stable-dialog visitor-password-modal-root"/);
assert.match(mainSource, /activeElement\.blur\(\)/);
assert.match(styleSource, /\.viewport-stable-dialog \.ant-input[\s\S]*font-size: 16px/);
assert.match(viewportSource, /\.platform-login-panel, \.viewport-stable-dialog/);
assert.match(indexSource, /robotaxi-visit-api-base/);

console.log("v048 访问记录入口与响应式界面验证通过");

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
