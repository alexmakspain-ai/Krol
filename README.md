# Expense Tracker

Веб-приложение для учёта личных расходов: диаграмма расходов по категориям,
таблица операций, добавление расходов и экспорт в CSV/Excel.

Полное техническое задание — см. [`TZ.md`](./TZ.md).
Схема модели данных — см. [`data-model.mermaid`](./data-model.mermaid).

## Стек технологий

- **Frontend:** Angular + TypeScript, Chart.js (ng2-charts)
- **Backend:** Python + FastAPI, SQLAlchemy + Alembic
- **База данных:** SQLite
- **Авторизация:** JWT (регистрация/логин, passlib/bcrypt для хэша паролей)
- **Экспорт:** CSV и Excel (openpyxl) — генерируются на backend

## Функциональность

1. **Круговая диаграмма** — расходы за период по категориям, с выбором периода
2. **Таблица расходов** — список операций (название, категория, сумма, дата),
   с сортировкой и своим фильтром периода
3. **Добавление расхода** — форма с выбором существующей категории или
   созданием новой
4. **Экспорт** — выгрузка отфильтрованных данных в CSV или Excel

## Структура проекта

```
expense-tracker/
├── backend/          # FastAPI приложение
│   ├── app/
│   │   ├── models/     # SQLAlchemy модели (User, Category, Expense)
│   │   ├── routers/    # API-роуты (auth, categories, expenses, export)
│   │   ├── schemas/    # Pydantic-схемы
│   │   └── main.py
│   ├── alembic/        # миграции БД
│   └── requirements.txt
├── frontend/          # Angular приложение
│   └── src/app/
│       ├── auth/         # логин/регистрация
│       ├── expenses/     # таблица + форма добавления
│       ├── charts/       # круговая диаграмма
│       └── shared/
├── TZ.md
├── data-model.mermaid
└── README.md
```

## Запуск проекта (backend)

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Backend будет доступен на `http://localhost:8000`.

## Запуск проекта (frontend)

```bash
cd frontend
npm install
ng serve
```

Frontend будет доступен на `http://localhost:4200`.

## Статус разработки

Проект в разработке пошагово, см. этапы в [`TZ.md`](./TZ.md#7-этапы-реализации-высокоуровнево).

- [x] Инициализация backend + frontend
- [x] Backend: модели, авторизация, CRUD
- [x] Frontend: логин/регистрация
- [x] Frontend: таблица расходов + добавление
- [x] Frontend: диаграмма с фильтром периода
- [x] Экспорт в CSV/Excel
- [ ] Полировка и тестирование
