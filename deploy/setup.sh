#!/usr/bin/env bash
# Первичная установка голосования на чистый сервер Ubuntu/Debian.
# Запуск от root:  bash setup.sh            (сайт будет по IP сервера)
#             или  bash setup.sh vote.example.ru   (если есть домен)
set -euo pipefail

REPO="${REPO:-https://github.com/lowerrider/newOprosFull.git}"
APP_DIR=/opt/opros
APP_USER=opros
BACKUP_DIR=/var/backups/opros
SITE="${1:-$(hostname -I | awk '{print $1}')}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Запустите от root" >&2
  exit 1
fi

step() { echo; echo "==> $*"; }

step "Устанавливаю системные пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git ca-certificates openssl
command -v nginx >/dev/null || apt-get install -y nginx
[ -d /usr/local/mgr5 ] || apt-get install -y ufw

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  step "Устанавливаю Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo "Node.js $(node -v)"

step "Создаю пользователя $APP_USER (сервис работает не от root)"
id "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"

step "Скачиваю код в $APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO" "$APP_DIR"
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

ENV_FILE="$APP_DIR/backend/.env"
ADMIN_PASSWORD_NEW=""
REGULAR_ADMIN_PASSWORD_NEW=""
if [ ! -f "$ENV_FILE" ]; then
  step "Создаю $ENV_FILE с новыми секретами"
  ADMIN_PASSWORD_NEW="$(openssl rand -base64 12 | tr -d '/+=')"
  REGULAR_ADMIN_PASSWORD_NEW="$(openssl rand -base64 12 | tr -d '/+=')"
  cat > "$ENV_FILE" <<ENV
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
DB_PATH=./data/opros.db
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_EMAIL=admin@mega-personal.ru
ADMIN_PASSWORD=$ADMIN_PASSWORD_NEW
REGULAR_ADMIN_EMAIL=manager@mega-personal.ru
REGULAR_ADMIN_PASSWORD=$REGULAR_ADMIN_PASSWORD_NEW
CORS_ORIGIN=http://$SITE,https://$SITE
APP_URL=http://$SITE/
SMTP_HOST=mail.mega-personal.ru
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=no-reply@mega-personal.ru
SMTP_FROM=no-reply@mega-personal.ru
SMTP_PASS=
ENV
  chown "$APP_USER:$APP_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi

step "Собираю бекенд и сайт"
bash "$APP_DIR/deploy/build.sh"

step "Настраиваю автозапуск бекенда (systemd)"
cat > /etc/systemd/system/opros.service <<UNIT
[Unit]
Description=Opros voting backend
After=network.target

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR/backend
ExecStart=$(command -v node) --disable-warning=ExperimentalWarning src/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now opros
systemctl restart opros

# На серверах с ISPmanager свой nginx и свой файрвол: аккуратно встраиваемся
ISPMANAGER=""
[ -d /usr/local/mgr5 ] && ISPMANAGER=1

step "Настраиваю nginx"
# conf.d подключается и в обычном nginx, и в nginx от ISPmanager
sed "s/__SERVER_NAME__/$SITE/" "$APP_DIR/deploy/nginx.conf" > /etc/nginx/conf.d/opros.conf
if [ -n "$ISPMANAGER" ]; then
  # Сайты ISPmanager слушают конкретный IP, такой listen у nginx в приоритете над «listen 80»
  SERVER_IP="$(hostname -I | awk '{print $1}')"
  sed -i "s/^    listen 80;/    listen 80;\n    listen $SERVER_IP:80;/" /etc/nginx/conf.d/opros.conf
fi
if [ -z "$ISPMANAGER" ]; then
  rm -f /etc/nginx/sites-enabled/default
fi
nginx -t
systemctl reload nginx || systemctl restart nginx

if [ -n "$ISPMANAGER" ]; then
  step "Файрвол не трогаю: на сервере ISPmanager, он управляет им сам"
  echo "Бекенд и так недоступен снаружи: он слушает только 127.0.0.1."
else
  step "Включаю файрвол: открыты только SSH и сайт"
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
fi

step "Ежедневная резервная копия базы в $BACKUP_DIR (хранится 14 дней)"
mkdir -p "$BACKUP_DIR"
chown "$APP_USER:$APP_USER" "$BACKUP_DIR"
cat > /etc/cron.d/opros-backup <<CRON
0 3 * * * $APP_USER cd $APP_DIR/backend && $(command -v node) --disable-warning=ExperimentalWarning src/scripts/backup.js $BACKUP_DIR >/dev/null 2>&1 && find $BACKUP_DIR -name 'opros-*.db' -mtime +14 -delete
CRON

echo
echo "=============================================="
echo " Готово! Сайт: http://$SITE/"
echo " Админка:     http://$SITE/#/admin"
if [ -n "$ADMIN_PASSWORD_NEW" ]; then
  echo " Логин админа:  admin@mega-personal.ru"
  echo " Пароль админа: $ADMIN_PASSWORD_NEW   (сохраните его!)"
  echo " Обычный админ:   manager@mega-personal.ru"
  echo " Его пароль:      $REGULAR_ADMIN_PASSWORD_NEW   (сохраните его!)"
fi
echo " Чтобы работала рассылка, впишите SMTP_PASS:"
echo "   nano $ENV_FILE   и затем   systemctl restart opros"
echo "=============================================="
