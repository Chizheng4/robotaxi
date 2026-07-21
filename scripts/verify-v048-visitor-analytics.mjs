import assert from "node:assert/strict";
import fs from "node:fs";

const mainSource = read("src/main.jsx");
const styleSource = read("src/styles.css");
const indexSource = read("index.html");

assert.match(mainSource, /String\(value \|\| ""\)\.trim\(\) === "访问"/);
assert.match(mainSource, /VisitorRecordsScreen/);
assert.match(styleSource, /\.visitor-records-shell/);
assert.match(styleSource, /@media \(max-width: 767px\)[\s\S]*\.visitor-records-panel/);
assert.match(indexSource, /robotaxi-cloudbase-env/);

console.log("v048 访问记录入口与响应式界面验证通过");

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
