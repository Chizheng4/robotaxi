#!/bin/zsh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

BRANCH="$(git branch --show-current)"
VERSION="$(sed -n 's/^## \(v[^ ]*\).*/\1/p' VERSION.md | head -n 1)"
HEAD_TAG="$(git describe --tags --exact-match HEAD 2>/dev/null || true)"
DEFAULT_GITHUB_PROXY="http://127.0.0.1:7897"
GITHUB_PROXY=""

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

configure_github_network() {
  local proxy_candidate="${ROBOTAXI_GITHUB_PROXY:-${HTTPS_PROXY:-${https_proxy:-$DEFAULT_GITHUB_PROXY}}}"

  echo "==> 检查 GitHub 网络连接"
  if curl -fsSI --http1.1 --proxy "$proxy_candidate" --connect-timeout 3 --max-time 8 https://github.com >/dev/null 2>&1; then
    GITHUB_PROXY="$proxy_candidate"
    export HTTP_PROXY="$GITHUB_PROXY"
    export HTTPS_PROXY="$GITHUB_PROXY"
    export ALL_PROXY="$GITHUB_PROXY"
    export http_proxy="$GITHUB_PROXY"
    export https_proxy="$GITHUB_PROXY"
    export all_proxy="$GITHUB_PROXY"
    export NODE_USE_ENV_PROXY=1
    echo "==> 已使用本地代理：$GITHUB_PROXY"
    return 0
  fi

  unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy
  if ! curl -fsSI --http1.1 --noproxy '*' --connect-timeout 10 --max-time 15 https://github.com >/dev/null; then
    echo "发布已停止：系统 Terminal 当前无法连接 GitHub，请检查网络或系统代理后重试。"
    return 1
  fi
  echo "==> 本地代理不可用，已使用直连"
}

push_with_retry() {
  local ref="$1"
  local attempt=1
  local max_attempts=3

  while [ "$attempt" -le "$max_attempts" ]; do
    echo "==> 推送 $ref（第 $attempt/$max_attempts 次）"
    if [ -n "$GITHUB_PROXY" ]; then
      git -c http.version=HTTP/1.1 -c http.proxy="$GITHUB_PROXY" push origin "$ref" && return 0
    elif git -c http.version=HTTP/1.1 push origin "$ref"; then
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

configure_github_network

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
