from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.category import Category
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])


def _get_owned_category(db: Session, user: User, category_id: int) -> Category:
    category = db.get(Category, category_id)
    if category is None or category.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Категория не найдена")
    return category


@router.get("", response_model=list[CategoryOut])
def list_categories(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[Category]:
    return list(
        db.scalars(
            select(Category).where(Category.user_id == user.id).order_by(Category.name)
        )
    )


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Category:
    category = Category(user_id=user.id, name=payload.name, color=payload.color)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Category:
    category = _get_owned_category(db, user, category_id)
    category.name = payload.name
    category.color = payload.color
    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    category = _get_owned_category(db, user, category_id)
    db.delete(category)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Нельзя удалить категорию, у которой есть расходы"
        )
