#!/usr/bin/env bash
# Залить новую версию с GitHub: bash /opt/opros/deploy/update.sh
set -euo pipefail
APP_DIR=/opt/opros
APP_USER=opros

echo "==> Забираю изменения с GitHub"
runuser -u "$APP_USER" -- env HOME="/home/$APP_USER" git -C "$APP_DIR" pull --ff-only

echo "==> Собираю"
bash "$APP_DIR/deploy/build.sh"

echo "==> Перезапускаю бекенд"
systemctl restart opros
sleep 2
if curl -fsS http://127.0.0.1:3000/api/health >/dev/null; then
  echo "Готово, новая версия работает."
else
  echo "Бекенд не отвечает. Посмотрите логи: journalctl -u opros -n 50" >&2
  exit 1
fi
