from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Progress, User
from ..schemas import AuthOut, LoginIn, RegisterIn, UserOut
from ..security import create_token, current_user, hash_password, verify_password

router = APIRouter(tags=["auth"])


def auth_response(user: User) -> AuthOut:
    return AuthOut(token=create_token(user), user=UserOut(login=user.login, created_at=user.created_at))


@router.post("/register", response_model=AuthOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    user = User(login=body.login, password_hash=hash_password(body.password))
    user.progress = Progress(data={})
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Такой логин уже занят")
    db.refresh(user)
    return auth_response(user)


@router.post("/login", response_model=AuthOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.login == body.login))
    if not verify_password(body.password, user.password_hash if user else None):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверный логин или пароль")
    return auth_response(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return UserOut(login=user.login, created_at=user.created_at)
