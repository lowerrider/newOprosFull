#!/usr/bin/env bash
# Установка зависимостей и сборка сайта (запускается из setup.sh и update.sh)
set -euo pipefail
APP_DIR=/opt/opros
APP_USER=opros

run() { runuser -u "$APP_USER" -- env HOME="/home/$APP_USER" bash -c "$1"; }

run "cd $APP_DIR/backend && npm ci --omit=dev --no-audit --no-fund"
run "cd $APP_DIR/frontend && npm ci --no-audit --no-fund && npm run build"
