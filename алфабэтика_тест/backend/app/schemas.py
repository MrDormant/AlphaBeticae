import re
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, field_validator

LOGIN_RE = re.compile(r"^[a-zA-Z0-9_.\-а-яА-ЯёЁ]{3,32}$")
MIN_PASSWORD = 4
MAX_PASSWORD_BYTES = 72


def normalize_login(value: str) -> str:
    return str(value or "").strip().lower()


class LoginIn(BaseModel):
    login: str
    password: str

    @field_validator("login")
    @classmethod
    def _normalize(cls, v: str) -> str:
        return normalize_login(v)


class RegisterIn(LoginIn):
    @field_validator("login")
    @classmethod
    def _check_login(cls, v: str) -> str:
        if not LOGIN_RE.match(v):
            raise ValueError("Логин: от 3 до 32 символов — буквы, цифры, точка, дефис или подчёркивание")
        return v

    @field_validator("password")
    @classmethod
    def _check_password(cls, v: str) -> str:
        if len(v) < MIN_PASSWORD:
            raise ValueError(f"Пароль должен быть не короче {MIN_PASSWORD} символов")
        if len(v.encode()) > MAX_PASSWORD_BYTES:
            raise ValueError("Пароль слишком длинный")
        return v


def as_utc(value: datetime | None) -> datetime | None:
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


class UserOut(BaseModel):
    login: str
    created_at: datetime | None = None

    @field_validator("created_at")
    @classmethod
    def _utc(cls, v: datetime | None) -> datetime | None:
        return as_utc(v)


class AuthOut(BaseModel):
    token: str
    user: UserOut


class ProgressIn(BaseModel):
    data: dict[str, Any]


class ProgressOut(BaseModel):
    data: dict[str, Any]
    updated_at: datetime | None = None

    @field_validator("updated_at")
    @classmethod
    def _utc(cls, v: datetime | None) -> datetime | None:
        return as_utc(v)


class StatsOut(BaseModel):
    lessons_done: int
    lessons_total: int
    stars: int
    motivation_score: int
    motivation_label: str
    reaction_ms: int | None = None
    reaction_label: str
    answer_ms: int | None = None
    speed_label: str
    sessions: int
    accuracy: float | None = None
