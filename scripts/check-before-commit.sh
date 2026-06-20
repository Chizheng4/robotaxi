#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

print_step() {
  printf "\n==> %s\n" "$1"
}

fail() {
  printf "\n检查失败：%s\n" "$1" >&2
  exit 1
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

print_step "检查运行环境"
command_exists node || fail "未找到 node，无法检查前端脚本"
command_exists git || fail "未找到 git，无法检查版本状态"

print_step "检查关键文件是否存在"
test -f src/main.jsx || fail "缺少 src/main.jsx"
test -f src/main.bundle.js || fail "缺少 src/main.bundle.js"
test -f vendor/babel.min.js || fail "缺少 vendor/babel.min.js"
test -f VERSION.md || fail "缺少 VERSION.md"

print_step "检查生成后的 bundle 是否与源码一致"
TMP_BUNDLE="$(mktemp "${TMPDIR:-/tmp}/robotaxi-main-bundle.XXXXXX.js")"
node - "$TMP_BUNDLE" <<'NODE'
const fs = require("fs");
const output = process.argv[2];
const babel = require("./vendor/babel.min.js");
const src = fs.readFileSync("src/main.jsx", "utf8");
const result = babel.transform(src, { presets: ["react"] });
fs.writeFileSync(output, result.code + "\n");
NODE
if ! cmp -s "$TMP_BUNDLE" src/main.bundle.js; then
  rm -f "$TMP_BUNDLE"
  fail "src/main.bundle.js 与 src/main.jsx 不一致，请重新生成 bundle"
fi
rm -f "$TMP_BUNDLE"

print_step "检查 JavaScript 语法"
node --check src/main.bundle.js
node --check src/data/deploymentTaskValidation.js
node --check src/domain/fieldDictionary.js
node --check src/domain/taskTypes.js
node --check src/domain/serviceOrderSettlement.js
node scripts/verify-service-order-settlement.mjs
node scripts/verify-simulation-continuity.mjs

print_step "检查 Git diff 空白问题"
git diff --check
git diff --cached --check

if command_exists rg; then
  print_step "检查字段命名和旧显示文案"
  if rg -n "路径规划ID|路径规划编号|路径规划策略ID|route_planning_strategy_id|applicable_task_type|适用任务类型" src doc VERSION.md index.html start-robotaxi.command --glob '!src/main.bundle.js' --glob '!vendor/**'; then
    fail "发现不符合字段字典的旧命名或旧文案"
  fi

  if rg -n "RPS-INITIAL-DEPLOYMENT|RPS-ABNORMAL-SAME-SA" doc VERSION.md index.html; then
    fail "文档或脚本中发现旧路径规划策略编号"
  fi
else
  printf "提示：未找到 rg，跳过字段命名扫描。\n"
fi

print_step "检查完成"
printf "当前项目通过提交前检查。\n"
