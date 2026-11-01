@echo off
title StaySync Launcher
echo ========================================================
echo          Starting StaySync Hotel Management System
echo ========================================================
echo.

echo [1/3] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "StaySync Backend API" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/3] Launching React Vite Frontend on http://127.0.0.1:5173 ...
start "StaySync Frontend Web" cmd /k "cd /d %~dp0frontend && npm run dev -- --host 127.0.0.1 --port 5173"

echo [3/3] Opening StaySync in your web browser...
timeout /t 3 >nul
start http://localhost:5173/login

echo.
echo ========================================================
echo   StaySync is now running!
echo   Frontend : http://localhost:5173/login
echo   API Docs : http://localhost:8000/docs
echo   Demo Login: admin@staysync.com / Admin@123
echo ========================================================
echo.
pause
