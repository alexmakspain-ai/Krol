# Changelog

Технические изменения по файлам, в разрезе этапов из [`TZ.md`](./TZ.md). Итоговое
состояние по каждому этапу — см. [`PROGRESS.md`](./PROGRESS.md).

## Этап 1 — Инициализация проекта

### Backend

**Создано:**
- `backend/requirements.txt` — зависимости (fastapi, uvicorn, sqlalchemy, alembic,
  pydantic-settings, python-jose, passlib+bcrypt, python-multipart, openpyxl)
- `backend/venv/` — виртуальное окружение (не в git)
- `backend/app/__init__.py`
- `backend/app/config.py` — `Settings` (pydantic-settings), читает `.env`
- `backend/app/database.py` — `engine`, `SessionLocal`, `Base`, `get_db()`
- `backend/app/main.py` — `FastAPI` app, CORS middleware, `GET /health`
- `backend/app/models/__init__.py` (пусто)
- `backend/app/routers/__init__.py` (пусто)
- `backend/app/schemas/__init__.py` (пусто)
- `backend/alembic.ini`, `backend/alembic/env.py`, `backend/alembic/script.py.mako`,
  `backend/alembic/README` — `alembic init alembic`
- `backend/.gitignore` — `venv/`, `__pycache__/`, `*.pyc`, `*.db`, `.env`
- `backend/.env.example` — шаблон переменных окружения

**Изменено:**
- `backend/alembic/env.py` — добавлен `sys.path` до корня backend, импорт
  `app.config.settings`, `app.database.Base`, `app.models`; `target_metadata =
  Base.metadata`; `sqlalchemy.url` берётся из `settings.database_url`

### Frontend

**Создано:**
- `frontend/` — Angular 22 проект через `ng new` (standalone, routing, SCSS,
  strict mode), стандартный набор файлов CLI (`angular.json`, `package.json`,
  `tsconfig*.json`, `src/main.ts`, `src/index.html`, `src/styles.scss`,
  `src/app/app.ts`, `src/app/app.config.ts`, `src/app/app.routes.ts`, и т.д.)
- `frontend/src/app/auth/.gitkeep`
- `frontend/src/app/expenses/.gitkeep`
- `frontend/src/app/charts/.gitkeep`
- `frontend/src/app/shared/.gitkeep`
- Установлены пакеты `chart.js`, `ng2-charts` (добавлены в `package.json`)

**Изменено:**
- `frontend/src/app/app.html` — убран дефолтный welcome-шаблон Angular CLI,
  оставлена минимальная заглушка (`<h1>Expense Tracker</h1>`)
- `frontend/src/app/app.ts` — `title` изменён с `'frontend'` на `'Expense Tracker'`

### Корень репозитория

**Изменено:**
- `README.md` — отмечен чекбокс «Инициализация backend + frontend»

**Примечание по структуре:** изначально backend/frontend были созданы во
вложенной `expense-tracker/`, затем перенесены на уровень корня репозитория
(`D:\Krol/backend`, `D:\Krol/frontend`), чтобы соответствовать дереву папок из
README, где `backend/` и `frontend/` находятся на одном уровне с `TZ.md`.

**Создано (этот процесс):**
- `PROGRESS.md` — журнал итогов по этапам
- `CHANGELOG.md` — этот файл

## Этап 2 — Backend: модели, авторизация, CRUD

### Модели

**Создано:**
- `backend/app/models/user.py` — `User` (id, email, password_hash, created_at)
- `backend/app/models/category.py` — `Category` (id, user_id FK, name, color)
- `backend/app/models/expense.py` — `Expense` (id, user_id FK, category_id FK,
  title, amount, date, created_at)

**Изменено:**
- `backend/app/models/__init__.py` — импорт `User`, `Category`, `Expense`
  (нужно для `Base.metadata` и autogenerate в Alembic)
- `backend/app/database.py` — добавлен `event.listens_for(engine, "connect")`,
  включающий `PRAGMA foreign_keys=ON` для SQLite

### Авторизация

**Создано:**
- `backend/app/security.py` — `hash_password`, `verify_password`
  (passlib/bcrypt), `create_access_token`, `decode_access_token` (python-jose)
- `backend/app/deps.py` — `get_current_user` (OAuth2PasswordBearer + JWT)
- `backend/app/routers/auth.py` — `POST /auth/register`, `POST /auth/login`

### Схемы (Pydantic)

**Создано:**
- `backend/app/schemas/user.py` — `UserCreate`, `UserOut`, `Token`
- `backend/app/schemas/category.py` — `CategoryBase/Create/Update/Out`
- `backend/app/schemas/expense.py` — `ExpenseBase/Create/Update`, `ExpenseOut`
  (с вложенным `CategoryOut`)

### CRUD-роуты

**Создано:**
- `backend/app/routers/categories.py` — `GET/POST /categories`,
  `PUT/DELETE /categories/{id}`, изоляция по `user_id`, 409 при удалении
  категории с расходами
- `backend/app/routers/expenses.py` — `GET/POST /expenses`,
  `PUT/DELETE /expenses/{id}`, изоляция по `user_id`, проверка владения
  категорией, фильтры `start_date/end_date/category_id`, сортировка
  `sort_by/order`, пагинация `skip/limit`

**Изменено:**
- `backend/app/main.py` — подключены роутеры `auth`, `categories`, `expenses`
  через `app.include_router(...)`

### Зависимости

**Изменено:**
- `backend/requirements.txt` — добавлен `email-validator==2.2.0` (нужен для
  `pydantic.EmailStr`)

### Миграции

**Создано:**
- `backend/alembic/versions/aab50b75bdb3_create_users_categories_expenses_tables.py`
  — первая миграция: таблицы `users`, `categories`, `expenses`, индексы
  (`ix_users_email` unique, `ix_categories_user_id`, `ix_expenses_user_id`,
  `ix_expenses_category_id`, `ix_expenses_date`), FK
  `categories.user_id → users.id ON DELETE CASCADE`,
  `expenses.user_id → users.id ON DELETE CASCADE`,
  `expenses.category_id → categories.id ON DELETE RESTRICT`.
  Сгенерирована через `alembic revision --autogenerate`, применена через
  `alembic upgrade head`.

### Корень репозитория

**Изменено:**
- `README.md` — отмечен чекбокс «Backend: модели, авторизация, CRUD»

## Этап 3 — Frontend: логин/регистрация

### Auth-модуль

**Создано:**
- `frontend/src/app/auth/models/auth.models.ts` — `RegisterRequest`,
  `LoginRequest`, `TokenResponse`, `StoredAuth`, `ApiErrorResponse`
- `frontend/src/app/auth/auth.service.ts` — `AuthService`
  (`register`/`login`/`logout`, `isAuthenticated`/`currentUserEmail` signals,
  хранение токена в `localStorage`)
- `frontend/src/app/auth/auth.interceptor.ts` — `authInterceptor`
  (добавляет `Authorization: Bearer` к запросам на API backend)
- `frontend/src/app/auth/auth.guard.ts` — `authGuard`
- `frontend/src/app/auth/login/login.ts`, `login.html`, `login.scss`
- `frontend/src/app/auth/register/register.ts`, `register.html`,
  `register.scss`

### Прочее

**Создано:**
- `frontend/src/app/shared/api-config.ts` — `API_BASE_URL`
- `frontend/src/app/expenses/expenses-page/expenses-page.ts`, `.html`,
  `.scss` — защищённая placeholder-страница (наполнится на этапе 4)

**Удалено:**
- `frontend/src/app/auth/.gitkeep`, `frontend/src/app/expenses/.gitkeep`
  (папки больше не пустые)

**Изменено:**
- `frontend/src/app/app.routes.ts` — маршруты `/login`, `/register`,
  защищённый `/expenses` (lazy-loaded), редиректы `''`/`**` → `/expenses`
- `frontend/src/app/app.config.ts` — добавлен
  `provideHttpClient(withInterceptors([authInterceptor]))`
- `frontend/src/app/app.ts` — внедрён `AuthService`, метод `logout()`
- `frontend/src/app/app.html` — хедер с названием приложения, email
  пользователя и кнопкой «Выйти» при авторизации (вместо приветственного
  текста-заглушки из этапа 1)
- `frontend/src/app/app.scss` — стили хедера
- `frontend/src/app/app.spec.ts` — обновлён под новый шаблон (`.app-title`
  вместо `<h1>Hello, frontend</h1>`) и добавлены провайдеры `HttpClient`/
  `Router`, необходимые компоненту `App`

### Корень репозитория

**Изменено:**
- `README.md` — отмечен чекбокс «Frontend: логин/регистрация»

## Этап 4 — Frontend: таблица расходов + форма добавления

### Общее

**Создано:**
- `frontend/src/app/shared/api-error.model.ts` — `ApiErrorResponse`
  (вынесено из `auth/models/auth.models.ts` для переиспользования)

**Изменено:**
- `frontend/src/app/auth/models/auth.models.ts` — убран `ApiErrorResponse`
- `frontend/src/app/auth/login/login.ts`,
  `frontend/src/app/auth/register/register.ts` — импорт `ApiErrorResponse`
  из `shared/api-error.model`

### Данные

**Создано:**
- `frontend/src/app/expenses/models/expense.models.ts` — `Category`,
  `CategoryCreateRequest`, `Expense`, `ExpenseCreateRequest`,
  `ExpenseUpdateRequest`, `ExpensesQuery`, `ExpenseSortField`, `SortOrder`
- `frontend/src/app/expenses/expenses.service.ts` — `ExpensesService`
  (`listCategories`, `createCategory`, `listExpenses`, `createExpense`,
  `updateExpense`, `deleteExpense`)

### Компоненты

**Создано:**
- `frontend/src/app/expenses/expense-form/expense-form.ts`, `.html`, `.scss`
  — форма добавления расхода с inline-созданием категории
- `frontend/src/app/expenses/expenses-table/expenses-table.ts`, `.html`,
  `.scss` — таблица расходов: сортировка, фильтр периода (пресеты +
  произвольный диапазон), пагинация, инлайн-редактирование, удаление

**Изменено:**
- `frontend/src/app/expenses/expenses-page/expenses-page.ts`, `.html` —
  теперь оркестрирует `ExpenseForm` и `ExpensesTable`: грузит категории,
  прокидывает их вниз, обновляет таблицу по `expenseAdded`, пополняет список
  категорий по `categoryCreated`
- `frontend/src/app/expenses/expenses-page/expenses-page.scss` — layout
  контейнера вместо текста-заглушки

### Корень репозитория

**Изменено:**
- `README.md` — отмечен чекбокс «Frontend: таблица расходов + добавление»

## Этап 5 — Frontend: круговая диаграмма с фильтром по периоду

### Общие модули (рефакторинг)

**Создано:**
- `frontend/src/app/shared/period.ts` — `PeriodPreset`, `DateRange`,
  `isoDate`, `startOfWeek`, `startOfMonth`, `startOfYear`, `presetRange`
  (вынесено из `expenses-table.ts`)
- `frontend/src/app/shared/period-filter/period-filter.ts`, `.html`, `.scss`
  — переиспользуемый `PeriodFilter`-компонент (кнопки пресетов + свой
  диапазон дат)

**Изменено:**
- `frontend/src/app/expenses/expenses-table/expenses-table.ts` — убраны
  локальные `isoDate`/`startOfWeek`/`startOfMonth`/`startOfYear`/`PeriodPreset`
  и метод `range`, используется `presetRange` из `shared/period`; методы
  `setPreset`/`applyCustomRange` заменены на `onPresetSelected`/
  `onCustomStartChanged`/`onCustomEndChanged` под новый `PeriodFilter`
- `frontend/src/app/expenses/expenses-table/expenses-table.html` — inline
  разметка фильтра периода заменена на `<app-period-filter>`
- `frontend/src/app/expenses/expenses-table/expenses-table.scss` — удалён
  дублирующийся блок `.period-filter` (переехал в `period-filter.scss`)
- `frontend/src/app/expenses/expenses.service.ts` — добавлен
  `listAllExpenses(range)` (постраничный обход `GET /expenses`, лимит
  200/запрос, до последней неполной страницы)
- `frontend/src/app/expenses/expense-form/expense-form.ts` — `todayIso()`
  теперь использует `isoDate()` из `shared/period` вместо собственной
  реализации на `toISOString()`

### Багфикс (обнаружен на этом этапе, затрагивает этап 4)

**Изменено:**
- `frontend/src/app/shared/period.ts` — `isoDate()` переписана: строит
  `yyyy-mm-dd` из локальных `getFullYear/getMonth/getDate` вместо
  `date.toISOString().slice(0, 10)`. Старая реализация конвертировала дату
  в UTC перед форматированием, из-за чего `startOfWeek/Month/Year`
  (строящие дату в локальном времени) систематически сдвигались на день
  назад в часовых поясах восточнее UTC (подтверждено на UTC+2: «месяц»
  начинался с 31 июля вместо 1 августа)

### Диаграмма

**Создано:**
- `frontend/src/app/charts/expenses-chart/expenses-chart.ts`, `.html`,
  `.scss` — кольцевая диаграмма (Chart.js/ng2-charts): агрегация расходов
  по категориям, центр с названием/суммой/процентом выбранной или топ
  категории (обновляется по hover/click), кастомная HTML-легенда,
  независимый `PeriodFilter` (по умолчанию — месяц)

**Изменено:**
- `frontend/src/app/app.config.ts` — добавлен
  `provideCharts(withDefaultRegisterables())` из `ng2-charts`
- `frontend/src/app/expenses/expenses-page/expenses-page.ts` — добавлен
  `viewChild(ExpensesChart)`, диаграмма перезагружается вместе с таблицей
  по событию `expenseAdded`
- `frontend/src/app/expenses/expenses-page/expenses-page.html` — добавлен
  `<app-expenses-chart>` над формой и таблицей

**Удалено:**
- `frontend/src/app/charts/.gitkeep` (папка больше не пустая)

### Корень репозитория

**Изменено:**
- `README.md` — отмечен чекбокс «Frontend: диаграмма с фильтром периода»

## Доработка после этапа 5 — подкатегории, удаление категорий, доработки диаграммы

Внеплановый запрос пользователя, не привязан к нумерации этапов ТЗ.

### Backend — подкатегории

**Изменено:**
- `backend/app/models/category.py` — добавлен `parent_id` (self-referential
  FK на `categories.id`, `ON DELETE CASCADE`), relationships `parent`/
  `subcategories`
- `backend/app/schemas/category.py` — `CategoryBase` получил поле
  `parent_id: int | None`
- `backend/app/routers/categories.py` — `_validate_parent()` (родитель
  принадлежит пользователю, сам не подкатегория, не самоссылка на себя);
  `create_category`/`update_category` используют её; сообщение 409 при
  удалении уточнено (расходы у категории или её подкатегорий)
- `backend/app/database.py` — добавлена `NAMING_CONVENTION` и передана в
  `Base.metadata = MetaData(naming_convention=NAMING_CONVENTION)` — без неё
  SQLAlchemy генерирует безымянные constraints, которые Alembic не может
  обработать в SQLite batch-режиме
- `backend/alembic/env.py` — добавлен `render_as_batch=True` в оба вызова
  `context.configure(...)` — нужен, т.к. SQLite не поддерживает
  `ALTER TABLE ADD/DROP CONSTRAINT` напрямую, только через пересборку
  таблицы (batch mode)

**Создано:**
- `backend/alembic/versions/5226feb3527f_add_category_parent_id_for_subcategories.py`
  — миграция: колонка `parent_id`, индекс, именованный FK
  `fk_categories_parent_id_categories` (`ON DELETE CASCADE`)

### Frontend — дропдаун категорий

**Создано:**
- `frontend/src/app/expenses/category-picker/category-picker.ts`, `.html`,
  `.scss` — `CategoryPicker`: дерево категория/подкатегории, инлайн-создание
  (в т.ч. подкатегории), удаление по клику на 🗑 (с подтверждением),
  закрытие по клику вне (`@HostListener('document:click')`)

**Изменено:**
- `frontend/src/app/expenses/models/expense.models.ts` — `Category` и
  `CategoryCreateRequest` получили поле `parent_id: number | null`
- `frontend/src/app/expenses/expenses.service.ts` — добавлен
  `deleteCategory(id)`
- `frontend/src/app/expenses/expense-form/expense-form.ts` — убрана
  реактивная логика `categoryId`/`newCategoryName`/`newCategoryColor` с
  сентинелом `__new__`; вместо неё — `selectedCategoryId` signal и
  `<app-category-picker>`, который сам управляет выбором/созданием/удалением
- `frontend/src/app/expenses/expense-form/expense-form.html` — `<select>` +
  поля новой категории заменены на `<app-category-picker>`
- `frontend/src/app/expenses/expenses-table/expenses-table.ts` — добавлены
  outputs `categoryCreated`/`categoryDeleted`, метод
  `onCategoryDeletedInEdit()` (сбрасывает `editCategoryId`, если удалённая
  категория была выбрана в строке редактирования)
- `frontend/src/app/expenses/expenses-table/expenses-table.html` — `<select>`
  в строке редактирования заменён на `<app-category-picker>`
- `frontend/src/app/expenses/expenses-page/expenses-page.ts` — добавлен
  `onCategoryDeleted()` (убирает категорию и её подкатегории из общего
  списка)
- `frontend/src/app/expenses/expenses-page/expenses-page.html` — форма и
  таблица теперь пробрасывают `categoryCreated`/`categoryDeleted` в
  `ExpensesPage`; диаграмма получает `[categories]`

### Frontend — диаграмма

**Изменено:**
- `frontend/src/app/charts/expenses-chart/expenses-chart.ts`:
  - добавлен `categories = input.required<Category[]>()` и
    `categoriesById` computed
  - `resolveTopCategory()`/`aggregateByCategory()` теперь сворачивают
    подкатегории в родительскую категорию — на диаграмме только категории
    верхнего уровня
  - убран `topIndex` (дефолтный показ топ-категории в центре); `displayedIndex`
    теперь `hoveredIndex() ?? selectedIndex()` без фолбэка на топ-категорию
  - добавлен `periodLabel` computed (формат `ДД.ММ.ГГГГ – ДД.ММ.ГГГГ`)
- `frontend/src/app/charts/expenses-chart/expenses-chart.html` — центр
  диаграммы: при отсутствии наведения/выбора показывает «Всего за период» +
  сумму (вместо топ-категории по умолчанию); под легендой добавлена подпись
  периода
- `frontend/src/app/charts/expenses-chart/expenses-chart.scss` — стиль
  `.period-label`
