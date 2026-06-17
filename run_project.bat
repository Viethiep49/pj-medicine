@echo off
echo =========================================
echo Starting Drug-Pred AI Project...
echo =========================================

echo Starting Backend (FastAPI on Port 8000)...
start "Backend" cmd /k "cd backend && python -m uvicorn app.main:app --reload --port 8000"

echo Starting Frontend (Vite/React on Port 5173)...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo Both services have been started in separate windows!
echo Please wait a few seconds for them to initialize.
