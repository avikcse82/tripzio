# Tripzio Local Installation (Windows)

This guide runs the app locally with:
- Backend: FastAPI (`backend/`)
- Frontend: React + Vite (`frontend/`)

## Prerequisites

1. Python 3.10+
2. Node.js 18+
3. npm
4. PowerShell

## Project Paths

- Backend: `backend/`
- Frontend: `frontend/`
- Backend env file: `backend/.env`

## 1) Backend Setup

1. Open terminal in backend:

```powershell
cd c:/opt/trip/tripzio/backend
```

2. Create virtual environment:

```powershell
py -m venv .venv
```

3. Activate virtual environment:

```powershell
./.venv/Scripts/Activate.ps1
```

4. Install dependencies:

```powershell
pip install -r requirements.txt
```

5. Ensure `backend/.env` exists with these keys (already present in your setup):

```env
APP_NAME=
LOG_LEVEL=
DEBUG=
SECRET_KEY=
ALGORITHM=
ACCESS_TOKEN_EXPIRE_MINUTES=

SUPABASE_URL=
SUPABASE_KEY=

OPENAI_API_KEY=
OPENWEATHERMAP_API_KEY=
GOOGLE_PLACES_API_KEY=
SERPAPI_KEY=
RESEND_API_KEY=
RAPIDAPI_KEY=
```

6. Start backend server:

```powershell
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

7. Verify backend:
- Health: http://127.0.0.1:8000/health
- Docs (if `DEBUG=True`): http://127.0.0.1:8000/docs

## 2) Frontend Setup

1. Open a new terminal and go to frontend:

```powershell
cd c:/opt/trip/tripzio/frontend
```

2. Install dependencies:

```powershell
npm install
```

3. (Optional) Create `frontend/.env` if you want explicit API URL:

```env
VITE_API_URL=http://127.0.0.1:8000
```

4. Start frontend:

```powershell
npm run dev
```

5. Open the Vite URL shown in terminal (usually):
- http://127.0.0.1:5173

## 3) Run Both Together

- Keep backend running on `127.0.0.1:8000`
- Keep frontend running on `127.0.0.1:5173`

The frontend calls backend using `VITE_API_URL` or defaults to `http://127.0.0.1:8000`.

## 4) Troubleshooting

1. PowerShell execution policy blocks venv activation:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

2. `uvicorn` not found:

```powershell
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

3. Frontend cannot reach backend:
- Confirm backend terminal is running.
- Confirm backend health endpoint responds.
- Restart frontend after changing `VITE_API_URL`.

4. Auth/token issues in browser:
- Clear local storage keys and log in again.

## 5) Security Note

Your `backend/.env` contains live API keys and secrets. Rotate all sensitive keys if this file was shared externally.
