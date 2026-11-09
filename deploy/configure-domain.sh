#!/usr/bin/env bash
# Подключает apex + www, получает общий TLS-сертификат и безопасно обновляет URL в .env.
# Запуск от root: bash /opt/opros/deploy/configure-domain.sh www.mega-vote.ru
set -euo pipefail

APP_DIR=/opt/opros
ENV_FILE="$APP_DIR/backend/.env"
NGINX_FILE=/etc/nginx/conf.d/opros.conf
DOMAIN="${1:-www.mega-vote.ru}"
APEX="${DOMAIN#www.}"
BACKUP_DIR=/var/backups/opros
STAMP="$(date +%Y%m%d-%H%M%S)"
ENV_BACKUP="$BACKUP_DIR/env-$STAMP"
NGINX_BACKUP="$BACKUP_DIR/nginx-opros-$STAMP.conf"

if [ "$(id -u)" -ne 0 ]; then
  echo "Запустите скрипт от root" >&2
  exit 1
fi
if [ ! -f "$ENV_FILE" ] || [ ! -f "$NGINX_FILE" ]; then
  echo "Не найдены $ENV_FILE или $NGINX_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
cp -a "$ENV_FILE" "$ENV_BACKUP"
cp -a "$NGINX_FILE" "$NGINX_BACKUP"
chown opros:opros "$ENV_BACKUP"
chmod 600 "$ENV_BACKUP"

rollback() {
  echo "Ошибка: возвращаю прежние .env и nginx-конфиг" >&2
  cp -a "$ENV_BACKUP" "$ENV_FILE"
  cp -a "$NGINX_BACKUP" "$NGINX_FILE"
  chown opros:opros "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  nginx -t && systemctl reload nginx
  systemctl restart opros
}
trap rollback ERR

echo "==> Делаю резервную копию базы"
runuser -u opros -- env HOME=/home/opros \
  bash -c "cd '$APP_DIR/backend' && node --disable-warning=ExperimentalWarning src/scripts/backup.js '$BACKUP_DIR'"

set_env() {
  local key="$1" value="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

echo "==> Обновляю публичные URL, не затрагивая секреты"
set_env APP_URL "https://$DOMAIN/"
set_env CORS_ORIGIN "https://$DOMAIN,https://$APEX"
chown opros:opros "$ENV_FILE"
chmod 600 "$ENV_FILE"

echo "==> Настраиваю nginx для $DOMAIN и $APEX"
sed "s/__SERVER_NAME__/$DOMAIN $APEX/" "$APP_DIR/deploy/nginx.conf" > "$NGINX_FILE"
if [ -d /usr/local/mgr5 ]; then
  SERVER_IP="$(hostname -I | awk '{print $1}')"
  sed -i "s/^    listen 80;/    listen 80;\n    listen $SERVER_IP:80;/" "$NGINX_FILE"
fi
nginx -t
systemctl reload nginx

echo "==> Получаю/расширяю HTTPS-сертификат на оба имени"
apt-get update -y
apt-get install -y certbot python3-certbot-nginx
certbot --nginx --redirect -d "$APEX" -d "$DOMAIN"

systemctl restart opros
BACKEND_READY=""
for _ in $(seq 1 15); do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null; then
    BACKEND_READY=1
    break
  fi
  sleep 1
done
if [ -z "$BACKEND_READY" ]; then
  echo "Бекенд не ответил за 15 секунд" >&2
  false
fi
nginx -t

trap - ERR
echo "Готово: https://$DOMAIN/ и https://$APEX/"
echo "Резервные копии конфигурации: $BACKUP_DIR/*-$STAMP*"
