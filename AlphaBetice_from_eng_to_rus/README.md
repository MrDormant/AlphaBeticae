# ALFABETICA · From English to Russian · STARTER

Interactive web app for the student book **ALFABETICA FROM ENGLISH TO RUSSIAN STARTER** (Chumakova et al.).

Same stack as the RU→EN Alfabetica project: vanilla frontend + FastAPI + SQLite (or Docker + PostgreSQL).

## Run locally (Windows)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
$env:JWT_SECRET = "change-me-to-a-long-random-string"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Open **http://127.0.0.1:8001** (use another port if 8000 is taken by the RU→EN app).

## Docker

```powershell
copy .env.example .env
# edit JWT_SECRET in .env
docker compose up -d --build
```

## Content

Lessons **1–5** follow the student book: vowels, then Н, Т, К, С. In the PDF the К page is also numbered “Lesson 3”; the app keeps them in letter order as lessons 3 (Т), 4 (К) and 5 (С). Crossword № 2 is a blank in this PDF, so it is not in the app. Crossword № 1 (lesson 2) and the word search are included.

PDF: `АЛФАБЭТИКА from English to Russian (2).pdf`
