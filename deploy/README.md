# Запуск на своём сервере

Схема: nginx отдаёт сайт и передаёт `/api` бекенду. Бекенд работает как служба `opros`
и слушает только `127.0.0.1:3000`. База лежит одним файлом `/opt/opros/backend/data/opros.db`.
Файрвол (ufw) пропускает снаружи только SSH и сайт.

## Первый запуск (один раз, ~5 минут)

1. Залейте свежий код на GitHub (`git push`).
2. Подключитесь к серверу. На Windows это PowerShell, на Mac — Терминал:
   ```
   ssh root@212.109.199.177
   ```
   На вопрос `Are you sure you want to continue connecting` ответьте `yes`, потом введите
   пароль root. Символы при вводе пароля не отображаются, так и должно быть.
3. Выполните на сервере:
   ```
   apt-get update && apt-get install -y git
   git clone https://github.com/lowerrider/newOprosFull.git /opt/opros
   bash /opt/opros/deploy/setup.sh
   ```
   Если репозиторий приватный, git спросит логин и пароль GitHub. Вместо пароля нужен
   токен: GitHub → Settings → Developer settings → Personal access tokens.
4. В конце скрипт покажет адрес сайта и **пароль админа. Сохраните его**, второй раз он не
   покажется (его можно посмотреть в `/opt/opros/backend/.env`).
5. Чтобы работала рассылка писем, впишите пароль почтового ящика:
   ```
   nano /opt/opros/backend/.env
   ```
   Найдите строку `SMTP_PASS=` и допишите пароль. Сохранение: Ctrl+O, Enter, выход: Ctrl+X.
   Потом перезапустите бекенд:
   ```
   systemctl restart opros
   ```
6. Откройте `http://212.109.199.177/#/admin` и войдите как `admin@mega-personal.ru`
   с паролем из шага 4.

## Залить новую версию

После `git push` подключитесь к серверу и выполните:
```
bash /opt/opros/deploy/update.sh
```
Скрипт заберёт код с GitHub, соберёт сайт и перезапустит бекенд. База и `.env` не трогаются.

## Полезные команды

| Что | Команда |
| --- | --- |
| Состояние бекенда | `systemctl status opros` |
| Логи бекенда в реальном времени | `journalctl -u opros -f` |
| Перезапустить бекенд | `systemctl restart opros` |
| Сделать копию базы прямо сейчас | `cd /opt/opros/backend && sudo -u opros npm run backup -- /var/backups/opros` |
| Список копий базы | `ls -lh /var/backups/opros` |

Копия базы делается автоматически каждую ночь в 3:00, копии старше 14 дней удаляются.

Восстановить базу из копии:
```
systemctl stop opros
cp /var/backups/opros/opros-ДАТА.db /opt/opros/backend/data/opros.db
rm -f /opt/opros/backend/data/opros.db-wal /opt/opros/backend/data/opros.db-shm
chown opros:opros /opt/opros/backend/data/opros.db
systemctl start opros
```

## Домен и HTTPS (рекомендуется)

Пока сайт работает по `http://` и IP-адресу, пароли участников идут по сети без шифрования.
Когда будет домен:

1. В панели домена создайте A-запись, указывающую на `212.109.199.177`.
2. На сервере:
   ```
   sed -i 's/server_name .*/server_name vote.example.ru;/' /etc/nginx/conf.d/opros.conf
   apt-get install -y certbot python3-certbot-nginx
   certbot --nginx -d vote.example.ru
   ```
3. В `/opt/opros/backend/.env` поменяйте `APP_URL=https://vote.example.ru/` (эта ссылка
   уходит в письмах) и выполните `systemctl restart opros`.
