# dstu-dean-booking

Запись студентов ДГТУ на приём к деканам. Секретарь создаёт периоды приёма, студент выбирает свободное окно и записывается, декан вызывает студентов по очереди и отмечает результат. Администратор ведёт факультеты и учётные записи.

## Состав

| Папка | Что внутри | Подробнее |
|---|---|---|
| `backend/` | API: FastAPI, SQLAlchemy, PostgreSQL | [backend/README.md](backend/README.md) |
| `frontend/` | интерфейс: Angular | [frontend/README.md](frontend/README.md) |

## Роли

- **студент** регистрируется сам, записывается на приём, видит свои записи и уведомления
- **секретарь** ведёт темы обращений и периоды приёма своего факультета
- **декан** вызывает студентов и фиксирует результат приёма
- **администратор** создаёт факультеты и учётные записи, меняет роли

## Быстрый старт

Нужны Docker, Python 3, Node.js и npm.

1. Запустить базу:

   ```bash
   make db
   ```

2. Подготовить и запустить backend:

   ```bash
   cd backend
   python3 -m venv .venv
   .venv/bin/pip install -r requirements.txt
   .venv/bin/python -m app.create_admin admin@example.com пароль
   .venv/bin/python -m app.seed
   cd ..
   make run
   ```

3. Запустить frontend в другом терминале:

   ```bash
   cd frontend
   npm install
   npm start
   ```

Адреса:

- приложение: http://localhost:4200
- API и Swagger: http://127.0.0.1:8000/docs

Тестовые аккаунты (после `app.seed`, пароль `test12345`): `student1@test.ru`, `secretary1@test.ru`, `dean1@test.ru`.

## Статус

Миграций и автотестов backend нет. Список недоделок в [backend/README.md](backend/README.md#что-не-сделано).
