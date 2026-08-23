import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy import asc, desc, select
from sqlalchemy.orm import Session, contains_eager
from sqlalchemy.sql import Select

from app.database import get_db
from app.deps import get_current_user
from app.models.category import Category
from app.models.expense import Expense
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseOut, ExpenseUpdate

router = APIRouter(prefix="/expenses", tags=["expenses"])

SORTABLE_FIELDS = {
    "date": Expense.date,
    "amount": Expense.amount,
    "title": Expense.title,
    "category": Category.name,
}

EXPORT_HEADER = ["Название", "Категория", "Сумма", "Дата"]


def _get_owned_expense(db: Session, user: User, expense_id: int) -> Expense:
    expense = db.get(Expense, expense_id)
    if expense is None or expense.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Расход не найден")
    return expense


def _ensure_owned_category(db: Session, user: User, category_id: int) -> None:
    category = db.get(Category, category_id)
    if category is None or category.user_id != user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Категория не найдена")


def _build_expenses_query(
    user: User,
    start_date: date | None,
    end_date: date | None,
    category_id: int | None,
    sort_by: str,
    order: str,
) -> Select:
    query = (
        select(Expense)
        .join(Category, Expense.category_id == Category.id)
        .options(contains_eager(Expense.category))
        .where(Expense.user_id == user.id)
    )
    if start_date is not None:
        query = query.where(Expense.date >= start_date)
    if end_date is not None:
        query = query.where(Expense.date <= end_date)
    if category_id is not None:
        query = query.where(Expense.category_id == category_id)

    sort_column = SORTABLE_FIELDS[sort_by]
    return query.order_by(asc(sort_column) if order == "asc" else desc(sort_column))


@router.get("", response_model=list[ExpenseOut])
def list_expenses(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    start_date: date | None = None,
    end_date: date | None = None,
    category_id: int | None = None,
    sort_by: str = Query("date", pattern="^(date|amount|title|category)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
) -> list[Expense]:
    query = _build_expenses_query(user, start_date, end_date, category_id, sort_by, order)
    query = query.offset(skip).limit(limit)
    return list(db.scalars(query))


@router.get("/export/csv")
def export_expenses_csv(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    start_date: date | None = None,
    end_date: date | None = None,
    category_id: int | None = None,
    sort_by: str = Query("date", pattern="^(date|amount|title|category)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
) -> StreamingResponse:
    query = _build_expenses_query(user, start_date, end_date, category_id, sort_by, order)
    expenses = db.scalars(query).all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(EXPORT_HEADER)
    for expense in expenses:
        writer.writerow(
            [expense.title, expense.category.name, expense.amount, expense.date.isoformat()]
        )

    # UTF-8 BOM so Excel on Windows correctly detects Cyrillic instead of mangling it.
    content = "﻿" + buffer.getvalue()
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="expenses.csv"'},
    )


@router.get("/export/xlsx")
def export_expenses_xlsx(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    start_date: date | None = None,
    end_date: date | None = None,
    category_id: int | None = None,
    sort_by: str = Query("date", pattern="^(date|amount|title|category)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
) -> StreamingResponse:
    query = _build_expenses_query(user, start_date, end_date, category_id, sort_by, order)
    expenses = db.scalars(query).all()

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Расходы"
    sheet.append(EXPORT_HEADER)
    for expense in expenses:
        sheet.append([expense.title, expense.category.name, expense.amount, expense.date])

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="expenses.xlsx"'},
    )


@router.post("", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Expense:
    _ensure_owned_category(db, user, payload.category_id)
    expense = Expense(user_id=user.id, **payload.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.put("/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: int,
    payload: ExpenseUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Expense:
    expense = _get_owned_expense(db, user, expense_id)
    _ensure_owned_category(db, user, payload.category_id)
    for field, value in payload.model_dump().items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    expense = _get_owned_expense(db, user, expense_id)
    db.delete(expense)
    db.commit()
