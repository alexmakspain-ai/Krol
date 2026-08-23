from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import Token, UserCreate, UserOut
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> User:
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Пользователь с таким email уже существует"
        )

    user = User(email=payload.email, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
) -> Token:
    user = db.scalar(select(User).where(User.email == form_data.username))
    if user is None or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(access_token=create_access_token(subject=str(user.id)))
