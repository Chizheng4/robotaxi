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

echo "==> 正在发布 $VERSION"
git push origin main --follow-tags

echo "==> 推送完成"
echo "GitHub Actions 将显示：$VERSION · Deploy Robotaxi to GitHub Pages"
echo "发布进度：https://github.com/Chizheng4/robotaxi/actions"
