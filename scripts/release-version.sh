#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

prompt() {
  local label="$1"
  local value
  printf "%s" "$label"
  read -r value
  printf "%s" "$value"
}

print_step() {
  printf "\n==> %s\n" "$1"
}

fail() {
  printf "\n发布失败：%s\n" "$1" >&2
  exit 1
}

confirm() {
  local question="$1"
  local answer
  printf "%s [y/N] " "$question"
  read -r answer
  case "$answer" in
    y|Y|yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

print_step "输入版本信息"
VERSION="$(prompt "版本号，例如 v017：")"
SUMMARY="$(prompt "一句提交说明，例如 完善路径规划策略闭环：")"

[[ "$VERSION" =~ ^v[0-9]{3}$ ]] || fail "版本号必须形如 v017"
test -n "$SUMMARY" || fail "提交说明不能为空"

if git rev-parse "$VERSION" >/dev/null 2>&1; then
  fail "版本标签 $VERSION 已存在"
fi

print_step "确认 VERSION.md 版本记录"
if grep -q "## $VERSION" VERSION.md; then
  printf "已在 VERSION.md 中找到 %s。\n" "$VERSION"
else
  printf "没有在 VERSION.md 中找到 %s。\n" "$VERSION"
  confirm "你是否已经确认本次可以先提交，之后再补版本记录？" || fail "请先更新 VERSION.md 后再发布版本"
fi

print_step "运行提交前检查"
"$ROOT_DIR/scripts/check-before-commit.sh"

print_step "显示待提交文件"
git status --short

if ! confirm "确认将以上改动提交为 $VERSION 吗？"; then
  fail "用户取消提交"
fi

print_step "创建提交"
git add -A
git commit -m "$VERSION $SUMMARY"

print_step "创建版本标签"
git tag "$VERSION"

print_step "发布完成"
git log --oneline --decorate -1
printf "\n已完成 %s。建议现在打开页面做一次人工确认。\n" "$VERSION"
