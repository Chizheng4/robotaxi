#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

./scripts/check-before-commit.sh

printf "\n按回车键关闭窗口..."
read -r _
