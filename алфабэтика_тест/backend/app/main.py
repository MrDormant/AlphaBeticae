import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import FRONTEND_DIR, JWT_SECRET
from .database import engine, init_db
from .routers import auth, progress

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("alfabetica")


@asynccontextmanager
async def lifespan(_: FastAPI):
    if JWT_SECRET == "dev-secret-change-me":
        log.warning("JWT_SECRET не задан, используется небезопасный ключ для разработки")
    init_db()
    yield


app = FastAPI(
    title="Алфабэтика API",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StarletteHTTPException)
async def http_error(_: Request, exc: StarletteHTTPException):
    return JSONResponse({"error": exc.detail}, status_code=exc.status_code, headers=getattr(exc, "headers", None))


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    message = str(first.get("msg", "Неверные данные")).removeprefix("Value error, ")
    if first.get("type") == "missing":
        message = "Заполните логин и пароль"
    elif first.get("type") in {"dict_type", "string_type", "json_invalid"}:
        message = "Неверный формат данных"
    return JSONResponse({"error": message}, status_code=400)


@app.get("/api/health", tags=["service"])
def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"ok": True}


app.include_router(auth.router, prefix="/api")
app.include_router(progress.router, prefix="/api")

if FRONTEND_DIR.is_dir() and (FRONTEND_DIR / "index.html").exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
