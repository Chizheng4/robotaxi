import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const browserCheck = fs.readFileSync(new URL("./verify-v049-13-17-visit-browser.mjs", import.meta.url), "utf8");

assert.match(
  source,
  /onKeyDown=\{\(event\) => \{\s*if \(event\.key !== "Enter" \|\| event\.repeat \|\| event\.isComposing \|\| event\.nativeEvent\?\.isComposing\) return;\s*event\.preventDefault\(\);\s*submitVisitorPassword\(event\);/,
  "访问密码输入框必须显式处理 Enter、重复键和输入法组合态，并复用 submitVisitorPassword",
);
assert.match(
  source,
  /<form className="visitor-password-form"[\s\S]*onSubmit=\{submitVisitorPassword\}/,
  "访问密码表单必须保留统一 submit 合同",
);
assert.match(
  source,
  /<Button type="primary" htmlType="submit" loading=\{visitorPasswordLoading\} disabled=\{!visitorPassword \|\| visitorPasswordLoading\}>进入访问记录<\/Button>/,
  "已正常工作的按钮提交逻辑不得改变",
);
assert(browserCheck.includes('send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Enter"'), "普通 Chrome 门禁必须向真实密码控件发送 Enter");
assert(browserCheck.includes('assert.equal(state.error, "本地预览密码不正确")'), "Enter 必须以认证错误反馈证明请求已触发");
assert(browserCheck.includes('"按钮提交必须进入访问概览"'), "按钮路径必须继续验证");
assert(browserCheck.includes('"桌面密码输入框 Enter 必须进入访问概览"'), "桌面 Enter 路径必须验证");
assert(browserCheck.includes("width: 390"), "390 手机 Enter 路径必须验证");

console.log("v049.13.19 访问密码 Enter 单一提交合同验证通过");
