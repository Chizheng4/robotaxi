#!/bin/zsh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

BRANCH="$(git branch --show-current)"
VERSION="$(sed -n 's/^## \(v[^ ]*\).*/\1/p' VERSION.md | head -n 1)"
HEAD_TAG="$(git describe --tags --exact-match HEAD 2>/dev/null || true)"

if [ "$BRANCH" != "main" ]; then
  echo "发布已停止：当前分支是 $BRANCH，请切换到 main。"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "发布已停止：当前还有未提交修改。"
  git status --short
  exit 1
fi

if [ -z "$HEAD_TAG" ]; then
  echo "发布已停止：当前提交没有版本标签。"
  exit 1
fi

node scripts/verify-release-version.mjs "$HEAD_TAG"

COMMIT_SUBJECT="$(git log -1 --format=%s)"
if [[ "$COMMIT_SUBJECT" != "$VERSION:"* && "$COMMIT_SUBJECT" != "$VERSION："* && "$COMMIT_SUBJECT" != "$VERSION "* ]]; then
  echo "发布已停止：提交说明必须以 $VERSION 开头。"
  echo "当前提交：$COMMIT_SUBJECT"
  exit 1
fi

push_with_retry() {
  local ref="$1"
  local attempt=1
  local max_attempts=3

  while [ "$attempt" -le "$max_attempts" ]; do
    echo "==> 推送 $ref（第 $attempt/$max_attempts 次）"
    if git -c http.version=HTTP/1.1 push origin "$ref"; then
      return 0
    fi
    if [ "$attempt" -lt "$max_attempts" ]; then
      sleep $((attempt * 2))
    fi
    attempt=$((attempt + 1))
  done

  echo "发布失败：$ref 连续 $max_attempts 次无法推送到 GitHub。"
  return 1
}

echo "==> 正在执行发布前检查"
bash scripts/check-before-commit.sh

echo "==> 正在发布 $VERSION"
push_with_retry "$HEAD_TAG"
push_with_retry main

echo "==> 推送完成，正在等待 GitHub Actions 与公网网站更新"
node scripts/wait-for-github-pages.mjs "$VERSION" "$(git rev-parse HEAD)"

echo "==> $VERSION 已正式上线"
echo "网站：https://chizheng4.github.io/robotaxi/"
echo "发布记录：https://github.com/Chizheng4/robotaxi/actions"
