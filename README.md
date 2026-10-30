# Opros: голосование Mega-Personal

Два приложения в одном репозитории:

- `frontend/`: клиент на Vue 3 + Vite (голосование и админка `/#/admin`);
- `backend/`: бекенд на Node.js + Express, база SQLite (один файл `backend/data/opros.db`), рассылка паролей через SMTP.

## Локальный запуск

```sh
# бекенд
cd backend
cp .env.example .env      # и поменяйте пароли/секреты, впишите SMTP_PASS
npm install
npm run dev               # http://localhost:3000

# клиент (в другом терминале)
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Вход в админку: на главной странице введите `ADMIN_EMAIL` и `ADMIN_PASSWORD` из `backend/.env`.

Перенести участников из старого `src/assets/members.json` (только ФИО и email, старые пароли не переносятся):

```sh
cd backend && npm run import-members -- ../frontend/src/assets/members.json
```

Тесты бекенда: `cd backend && npm test`.

## Как проходит голосование

1. **Участники**: вставьте список «ФИО; email» и нажмите «Разослать тем, кому ещё не отправляли». Каждому уйдёт письмо со ссылкой (`APP_URL`), логином и паролем. Пароль сохраняется, только если письмо ушло; ошибки показываются списком. Отдельному участнику можно отправить новый пароль кнопкой в его строке. Если почта не настроена, пароли можно сгенерировать и скачать в CSV («Пароли вручную»).
2. **Номинации**: добавьте сколько нужно номинаций и выберите номинантов 1 тура для каждой.
3. **Туры**: «Открыть голосование» для 1 тура. Каждый участник голосует один раз за тур (это проверяет сервер). Затем «Закрыть голосование».
4. «Сформировать 2 тур»: в каждую номинацию попадает топ-3 из 1 тура (при ничьей на 3-м месте проходят все с тем же числом голосов). Состав можно поправить на вкладке «Номинации», затем открыть 2 тур.
5. Результаты и список тех, кто ещё не проголосовал, есть на вкладке «Туры и результаты», их можно скачать в CSV.
6. «Сбросить голосование» очищает голоса и номинантов перед следующим годом. Участники и номинации остаются.

## Почта

Настройки те же, что в omega-web (`SMTP_HOST=mail.mega-personal.ru`, порт 587, `no-reply@mega-personal.ru`). Пароль ящика впишите в `SMTP_PASS` в `backend/.env`, в репозиторий он не попадает.

## Деплой на VPS

Нужен Node.js 20+.

```sh
git clone <repo> && cd Opros/backend
npm install --omit=dev
cp .env.example .env   # NODE_ENV=production, JWT_SECRET, ADMIN_*, CORS_ORIGIN, APP_URL, SMTP_*
NODE_ENV=production node src/index.js
```

Чтобы сервер работал постоянно, запустите его через pm2 (`pm2 start src/index.js --name opros`) или systemd, а перед ним поставьте nginx с HTTPS (Let's Encrypt), проксирующий на порт 3000.

Резервная копия базы: скопируйте файл `backend/data/opros.db` (лучше при остановленном сервере или через `sqlite3 opros.db ".backup backup.db"`).

Клиент можно по-прежнему публиковать на GitHub Pages:

```sh
cd frontend
echo "VITE_API_URL=https://ваш-домен/api" > .env.production
npm run build && npm run deploy
```

Адрес GitHub Pages должен быть указан в `CORS_ORIGIN` на сервере.
