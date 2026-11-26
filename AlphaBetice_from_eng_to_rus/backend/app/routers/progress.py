import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..config import MAX_PROGRESS_BYTES
from ..database import get_db
from ..models import Progress, User
from ..schemas import ProgressIn, ProgressOut, StatsOut
from ..security import current_user
from ..stats import summarize

router = APIRouter(tags=["progress"])


@router.get("/progress", response_model=ProgressOut)
def get_progress(user: User = Depends(current_user)):
    if user.progress is None:
        return ProgressOut(data={})
    return ProgressOut(data=user.progress.data or {}, updated_at=user.progress.updated_at)


@router.put("/progress", response_model=ProgressOut)
def save_progress(body: ProgressIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if len(json.dumps(body.data, ensure_ascii=False).encode()) > MAX_PROGRESS_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Слишком большой прогресс")
    if user.progress is None:
        user.progress = Progress(data=body.data)
    else:
        user.progress.data = body.data
    db.commit()
    db.refresh(user.progress)
    return ProgressOut(data=user.progress.data, updated_at=user.progress.updated_at)


@router.get("/stats", response_model=StatsOut)
def get_stats(user: User = Depends(current_user)):
    data = user.progress.data if user.progress else {}
    return StatsOut(**summarize(data or {}))
