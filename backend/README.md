# Backend

API для записи студентов ДГТУ на приём к деканам. FastAPI, SQLAlchemy, PostgreSQL.

## Требования

- Python 3 (проверено на 3.14)
- Docker (для PostgreSQL)

## Запуск

Команды выполняются из корня репозитория, если не указано иное.

1. Запустить базу:

   ```bash
   make db
   ```

2. Установить зависимости:

   ```bash
   cd backend
   python3 -m venv .venv
   .venv/bin/pip install -r requirements.txt
   ```

3. Создать администратора (из папки `backend`):

   ```bash
   .venv/bin/python -m app.create_admin admin@example.com пароль
   ```

4. Запустить сервер (из корня):

   ```bash
   make run
   ```

Сервер: http://127.0.0.1:8000. Swagger: http://127.0.0.1:8000/docs. Проверка работы: `GET /health`.

Таблицы создаются при старте сервера, миграций нет.

## Тестовые данные

Из папки `backend`:

```bash
.venv/bin/python -m app.seed
```

Скрипт создаёт два факультета с темами и периодами приёма, а также по одному декану, секретарю и студенту на факультет. Повторный запуск дубликатов не создаёт.

| Роль | Почта |
|---|---|
| студент | `student1@test.ru`, `student2@test.ru` |
| секретарь | `secretary1@test.ru`, `secretary2@test.ru` |
| декан | `dean1@test.ru`, `dean2@test.ru` |

Пароль у всех: `test12345`. Администратора создаёт `create_admin`.

## Настройки

Задаются переменными окружения, значения по умолчанию в `app/config.py`.

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg://deanery:deanery@localhost:5433/deanery` | адрес базы |
| `SECRET_KEY` | `dev-secret-key` | ключ подписи токенов, вне разработки заменить |
| `CORS_ORIGINS` | `http://localhost:4200,http://127.0.0.1:4200` | адреса фронтенда через запятую |

Остальное задано в `config.py` константами: срок жизни токена 12 часов, длительность окна приёма от 5 до 120 минут, запись возможна не позже чем за 10 минут до начала окна.

База в `docker-compose.yml`: порт 5433, пользователь, пароль и имя базы `deanery`.

## Структура

```
app/
  main.py          приложение, подключение роутеров, создание таблиц
  config.py        настройки
  database.py      подключение к базе, сессия
  security.py      хеш пароля, создание и проверка токена
  deps.py          текущий пользователь, проверка роли
  create_admin.py  создание администратора
  seed.py          тестовые данные
  models/          таблицы SQLAlchemy
  schemas/         схемы запросов и ответов (Base, Add, Patch)
  repositories/    запросы к базе
  services/        бизнес-правила
  routers/         адреса API
```

Запрос проходит по цепочке: router, зависимости (токен и роль), service, repository, база. Router принимает запрос и вызывает service. Service проверяет правила и обращается к repository. Repository работает с базой.

## Авторизация

- `POST /auth/login` принимает форму `application/x-www-form-urlencoded` с полями `username` (почта) и `password`, возвращает JWT.
- Токен передаётся в заголовке `Authorization: Bearer <токен>`.
- Пароли хранятся в виде хеша bcrypt.
- Выхода на сервере нет: клиент удаляет токен.
- `POST /auth/register` создаёт только студентов. Остальные роли создаёт администратор.

## Роли и эндпоинты

| Роль | Эндпоинты |
|---|---|
| без входа | `GET /health`, `GET /faculties`, `GET /topics`, `POST /auth/register`, `POST /auth/login` |
| любой вошедший | `GET /auth/me`, `PATCH /auth/me` |
| студент | `GET /periods`, `GET /periods/{id}/slots`, `GET /slots`, `POST /appointments`, `GET /appointments/my`, `POST /appointments/{id}/cancel`, `GET /notifications`, `POST /notifications/{id}/read` |
| секретарь | `GET /periods`, `GET /periods/{id}/slots`, `GET /slots`, `POST /periods`, `PATCH /periods/{id}`, `POST /periods/{id}/cancel`, `GET /topics/manage`, `POST /topics`, `PATCH /topics/{id}`, `GET /deans`, `GET /appointments`, `PATCH /appointments/{id}/status` |
| декан | `GET /periods`, `GET /periods/{id}/slots`, `GET /slots`, `POST /periods/{id}/cancel`, `GET /periods/{id}/queue`, `POST /periods/{id}/call-next`, `POST /appointments/{id}/call`, `PATCH /appointments/{id}/result` |
| администратор | `POST /faculties`, `PATCH /faculties/{id}`, `GET /users`, `POST /users`, `PATCH /users/{id}`, `DELETE /users/{id}`, `GET /deans`, `GET /appointments`, `PATCH /appointments/{id}/status`, `GET /periods/{id}/slots` |

Полное описание запросов и ответов: Swagger.

## База данных

Таблицы: `faculties`, `users`, `appeal_topics`, `reception_periods`, `appointments`, `notifications`.

Ограничения в базе:

- уникальна пара «период и номер в очереди»
- у студента одна неотменённая запись на период
- вместимость, номера и длительность окна положительные
- начало периода раньше окончания

## Правила

Периоды:

- секретарь создаёт периоды только своего факультета
- период делится на окна по `slot_minutes` минут, вместимость равна числу окон
- периоды одного декана не пересекаются
- пока нет записей, период можно менять целиком
- после первой записи можно только продлить окончание или сменить аудиторию
- секретарь или декан может отменить период: все записи отменяются, студенты получают уведомления

Записи:

- студент выбирает окно в периоде своего факультета
- окно должно быть свободным и начинаться не раньше чем через 10 минут
- у студента одна действующая запись на период
- номер в очереди выдаётся по порядку и после отмены не используется повторно
- при записи строка периода блокируется, поэтому при одновременных запросах окно не занять дважды
- студент отменяет только свою запись и только до начала окна
- декан работает только со своими периодами, секретарь только со своим факультетом

Администратор не может удалить себя и других администраторов.

## Статусы

Запись: `active`, `called`, `accepted`, `no_show`, `cancelled`.

```
active  ->  called  ->  accepted
   |           |    \->  no_show
   v           v
cancelled   cancelled
```

Период: `open`, `cancelled`.

## Что не сделано

- миграции (таблицы создаёт `create_all` при старте)
- автотесты backend
- подтверждение, что регистрируется настоящий студент
- комментарий декана студенту не отдаётся, его видимость не определена
