# Прогресс реализации

Статус по этапам из [`TZ.md`](./TZ.md#7-этапы-реализации-высокоуровнево). Подробности
технических изменений — см. [`CHANGELOG.md`](./CHANGELOG.md).

## Этап 1 — Инициализация проекта (backend + frontend), настройка структуры

**Статус:** завершён, подтверждён пользователем.

**Backend** (`backend/`):
- Создано venv, установлены зависимости: FastAPI, SQLAlchemy, Alembic, python-jose,
  passlib+bcrypt, openpyxl и др. (`requirements.txt`)
- Структура пакетов: `app/models/`, `app/routers/`, `app/schemas/` (пока пустые —
  наполнение на этапе 2)
- `app/config.py` — настройки через pydantic-settings (`.env` / `.env.example`)
- `app/database.py` — SQLAlchemy engine/session/Base для SQLite
- `app/main.py` — FastAPI-приложение с CORS (разрешён `localhost:4200`) и `/health`
- Alembic инициализирован, подключён к `app.config` и `app.database.Base.metadata`

**Frontend** (`frontend/`):
- Angular 22 проект (standalone components, routing, SCSS, strict mode)
- Установлены `chart.js` + `ng2-charts`
- Папки-заглушки под фичи: `src/app/auth/`, `src/app/expenses/`, `src/app/charts/`,
  `src/app/shared/`
- Дефолтная приветственная страница Angular CLI заменена на минимальную заглушку

**Проверено:**
- Backend: `uvicorn app.main:app --reload` → `GET /health` → `{"status":"ok"}`
- Backend: `alembic current` — конфиг и metadata подхватываются без ошибок
- Frontend: `ng build` — сборка без ошибок
- Frontend: `ng serve` — dev-сервер отвечает на `http://localhost:4200`

**Не доделано (сознательно, для следующих этапов):**
- Нет моделей SQLAlchemy (User/Category/Expense), нет первой Alembic-миграции
- Нет эндпоинтов кроме `/health`, нет авторизации (JWT)
- `.env` не создан (только `.env.example`)
- Angular-папки `auth/`, `expenses/`, `charts/`, `shared/` пустые, без компонентов

## Этап 2 — Backend: модели данных, авторизация, CRUD для категорий и расходов

**Статус:** завершён, ждёт подтверждения пользователя для перехода к этапу 3.

**Модели данных** (`backend/app/models/`), по схеме `data-model.mermaid`:
- `User` — id, email (unique), password_hash, created_at
- `Category` — id, user_id (FK → users, `ON DELETE CASCADE`), name, color
- `Expense` — id, user_id (FK → users, `ON DELETE CASCADE`), category_id
  (FK → categories, `ON DELETE RESTRICT`), title, amount, date, created_at
- В SQLite включён `PRAGMA foreign_keys=ON` (иначе FK-constraints не работают)

**Авторизация** (`backend/app/security.py`, `backend/app/deps.py`,
`backend/app/routers/auth.py`):
- `POST /auth/register` — регистрация по email/паролю, пароль хэшируется
  (passlib + bcrypt), проверка на дублирующийся email
- `POST /auth/login` — вход через `OAuth2PasswordRequestForm` (совместимо с
  кнопкой Authorize в Swagger UI), возвращает JWT (`access_token`)
- JWT: `python-jose`, `sub` = id пользователя, время жизни — 24 часа
  (настраивается через `.env`)
- `get_current_user` — зависимость FastAPI, декодирует токен и подгружает
  пользователя; 401 при отсутствии/невалидности токена

**CRUD для категорий** (`backend/app/routers/categories.py`):
- `GET/POST /categories`, `PUT/DELETE /categories/{id}`
- Все операции ограничены `user_id` текущего пользователя (404 для чужих
  категорий)
- Удаление категории с привязанными расходами → 409 (FK `RESTRICT`)

**CRUD для расходов** (`backend/app/routers/expenses.py`):
- `GET/POST /expenses`, `PUT/DELETE /expenses/{id}`
- Изоляция по `user_id`; при создании/обновлении проверяется, что
  `category_id` принадлежит текущему пользователю (400 иначе)
- Валидация: `amount > 0`, `title` обязателен (Pydantic `Field`)
- `GET /expenses` поддерживает `start_date`/`end_date`/`category_id`,
  сортировку (`sort_by`, `order`) и пагинацию (`skip`/`limit`) — задел под
  виджеты диаграммы/таблицы из этапов 4–5

**Миграция:** `backend/alembic/versions/aab50b75bdb3_create_users_categories_expenses_tables.py`
— создаёт таблицы `users`, `categories`, `expenses` с индексами и FK.
Проверена автогенерацией (`alembic revision --autogenerate`) и применением
(`alembic upgrade head`) к чистой БД.

**Проверено (сквозной сценарий через живой сервер, curl):**
- Регистрация двух пользователей, повторная регистрация с тем же email → 400
- Логин по форме (`username`/`password`), неверный пароль → 401
- Доступ к `/categories` без токена → 401
- Создание категории/расхода, изоляция: user2 не видит категории/расходы user1
- user2 не может создать расход с `category_id` от user1 → 400
- Отрицательная сумма расхода → 422
- Обновление расхода, фильтрация по диапазону дат
- Удаление категории с расходами → 409; после удаления расхода — 204
- `/docs` и `/openapi.json` отвечают 200 (Swagger UI доступен)

**Не доделано (сознательно, для следующих этапов):**
- Нет эндпоинта `/auth/me` (профиль текущего пользователя) — добавим при
  необходимости на frontend-этапах
- Нет ограничения количества попыток входа / refresh-токенов — вне рамок ТЗ
- Нет эндпоинтов экспорта CSV/Excel — это этап 6
- Frontend пока не взаимодействует с этими эндпоинтами — этапы 3–5

## Этап 3 — Frontend: страница логина/регистрации

**Статус:** завершён, ждёт подтверждения пользователя для перехода к этапу 4.

**Auth-модуль** (`frontend/src/app/auth/`):
- `auth.service.ts` — `AuthService`: `register()` (JSON → авто-логин после
  успешной регистрации), `login()` (`x-www-form-urlencoded`, совместимо с
  `OAuth2PasswordRequestForm` бэкенда), `logout()`. Токен и email хранятся в
  `localStorage`, состояние — через Angular `signal`/`computed`
  (`isAuthenticated`, `currentUserEmail`)
- `auth.interceptor.ts` — функциональный `HttpInterceptorFn`, добавляет
  `Authorization: Bearer <token>` ко всем запросам к API backend
- `auth.guard.ts` — `authGuard` (`CanActivateFn`), закрывает защищённые роуты,
  редиректит на `/login` с `returnUrl`
- `login/` и `register/` — standalone-компоненты с reactive forms,
  валидацией (email, минимум 8 символов пароль — как в backend), выводом
  серверных ошибок (400/401/422)

**Роутинг** (`app.routes.ts`) — lazy-loaded маршруты `/login`, `/register`,
защищённый `/expenses` (заглушка на этапе 4), редиректы `''` → `/expenses`,
`**` → `/expenses`

**Корневой shell** (`app.ts`/`app.html`/`app.scss`) — хедер с названием
приложения; при авторизации показывает email пользователя и кнопку «Выйти»

**HTTP-клиент**: `provideHttpClient(withInterceptors([authInterceptor]))`
в `app.config.ts`; базовый URL API — `frontend/src/app/shared/api-config.ts`
(`http://localhost:8000`)

**Placeholder-страница** `expenses/expenses-page/` — защищённый роут,
демонстрирующий рабочий flow авторизации; наполнится таблицей и формой на
этапе 4

**Проверено:**
- `ng build` — сборка без ошибок, lazy chunks для `login`/`register`/
  `expenses-page` формируются отдельно
- `ng test` — 2/2 теста проходят (обновлён `app.spec.ts` под новый шаблон и
  DI-зависимости `HttpClient`/`Router`)
- Dev-сервер (`ng serve`) пересобирается без ошибок на все изменения (HMR)
- Прямыми HTTP-запросами подтверждено, что тела запросов, которые формирует
  `AuthService` (`POST /auth/register` JSON, `POST /auth/login`
  `x-www-form-urlencoded` с полями `username`/`password`), точно совпадают с
  тем, что ожидает backend — оба вызова отработали (201, затем 200 с токеном)

**Не проверено вживую в браузере:** расширение Claude in Chrome недоступно в
этой сессии (отклонено пользователем), поэтому клик-флоу форма → редирект →
защищённый роут → logout не пройден визуально. Рекомендовано пользователю
проверить самостоятельно на `http://localhost:4200`.

**Не доделано (сознательно, для следующих этапов):**
- `expenses-page` — просто заглушка, таблица и форма добавления — этап 4
- Нет диаграммы — этап 5
- Нет обработки истечения JWT (401 от API не редиректит на `/login`
  автоматически) — можно добавить interceptor-логику при необходимости
- Нет unit-тестов для `AuthService`/`login`/`register` компонентов — вне
  минимального скоупа этапа, можно добавить в этапе 7 (полировка/тестирование)

## Этап 4 — Frontend: таблица расходов + форма добавления

**Статус:** завершён, ждёт подтверждения пользователя для перехода к этапу 5.

**Сервис данных** (`frontend/src/app/expenses/expenses.service.ts`) —
`ExpensesService`: `listCategories`, `createCategory`, `listExpenses`
(с query-параметрами периода/сортировки/пагинации), `createExpense`,
`updateExpense`, `deleteExpense`. Модели — `frontend/src/app/expenses/models/expense.models.ts`

**Виджет «Добавление расхода»** (`frontend/src/app/expenses/expense-form/`):
- Поля: название, сумма, дата (по умолчанию — сегодня), категория
- Категория — выбор из списка ИЛИ «+ Новая категория» (раскрывает поля
  названия и цвета прямо в форме); при отправке сначала создаётся категория,
  затем расход с её `id`
- Валидация: сумма > 0 (`Validators.min(0.01)`), название и категория
  обязательны — зеркалирует ограничения backend
- После успешного добавления — форма сбрасывается, событие `expenseAdded`
  уходит наверх, чтобы таблица обновилась без перезагрузки страницы

**Виджет «Таблица расходов»** (`frontend/src/app/expenses/expenses-table/`):
- Колонки: Название, Категория (цветной маркер + название), Сумма, Дата
- Сортировка по клику на заголовок любой колонки (совпадает с backend
  `sort_by`: date/amount/title/category), индикатор направления (▲/▼)
- Независимый фильтр периода: пресеты Неделя/Месяц/Год (по умолчанию —
  Год, как в референсе из ТЗ) + произвольный диапазон дат — не связан с
  фильтром других виджетов
- Пагинация (10 записей на страницу, кнопки «Назад»/«Вперёд»)
- Редактирование — инлайн в строке таблицы (название/сумма/дата/категория),
  сохранение через `PUT /expenses/{id}`
- Удаление — с подтверждением (`confirm()`), `DELETE /expenses/{id}`

**Оркестрация** (`expenses-page.ts`) — грузит категории один раз, передаёт
их в форму и таблицу как `input()`; по событию `expenseAdded` вызывает
`table.reload()` (через `viewChild`); по `categoryCreated` — добавляет
категорию в общий список без повторного похода в API

**Общее**: `ApiErrorResponse` вынесен в `shared/` (был дублирован в auth) —
теперь переиспользуется в auth и expenses

**Проверено:**
- `ng build` — сборка без ошибок, `expenses-page` лениво подгружается
  отдельным чанком
- `ng test` — 2/2 теста проходят
- Backend напрямую (минуя bash-кодировку консоли — она искажала кириллицу
  в тестовом выводе, это артефакт консоли Windows, не приложения):
  создание категории/расходов, сортировка по сумме (`sort_by=amount&order=desc`),
  пагинация (`skip`/`limit`) — всё возвращает корректные, ожидаемые данные;
  раунд-трип кириллицы (`PYTHONUTF8=1`) подтверждён как корректный

**Не проверено вживую в браузере:** расширение Claude in Chrome недоступно
в этой сессии — реальный клик-флоу (добавление расхода через форму,
инлайн-редактирование, пагинация, смена периода) не пройден визуально.
Рекомендовано проверить самостоятельно на `http://localhost:4200/expenses`.

**Не доделано (сознательно, для следующих этапов):**
- Нет круговой диаграммы — этап 5
- Пагинация таблицы не показывает общее количество записей/страниц — backend
  не возвращает total count; кнопка «Вперёд» включается эвристически (если
  вернулась полная страница). Можно доработать при необходимости
- Фильтр по категории в таблице не реализован (не требовался явно в ТЗ для
  этого этапа — только фильтр периода)
- Создание новой категории доступно только из формы добавления расхода,
  не из инлайн-редактирования строки таблицы
- Нет CSV/Excel экспорта — этап 6
- Нет unit-тестов для новых компонентов/сервиса

## Этап 5 — Frontend: круговая диаграмма с фильтром по периоду

**Статус:** не начат.

## Этап 6 — Экспорт в CSV/Excel

**Статус:** не начат.

## Этап 7 — Полировка UI, тестирование сценариев

**Статус:** не начат.
