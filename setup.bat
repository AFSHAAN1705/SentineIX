@echo off
TITLE SentinelX — Project Setup
color 0A

echo.
echo  ==========================================
echo   SENTINELX SETUP — Detect.Report.Resolve
echo  ==========================================
echo.

:: ── Backend ─────────────────────────────────
echo [1/4] Installing Backend dependencies...
cd /d d:\SentinelX\backend
call npm install
if %ERRORLEVEL% neq 0 (
    echo  ERROR: Backend npm install failed. Check your Node.js installation.
    pause & exit /b 1
)
echo  Backend deps installed.
echo.

:: ── Frontend ────────────────────────────────
echo [2/4] Installing Frontend dependencies...
cd /d d:\SentinelX\frontend
call npm install --legacy-peer-deps
if %ERRORLEVEL% neq 0 (
    echo  ERROR: Frontend npm install failed.
    pause & exit /b 1
)
echo  Frontend deps installed.
echo.

:: ── .env reminder ───────────────────────────
echo [3/4] Checking .env files...
if not exist d:\SentinelX\backend\.env (
    echo  WARNING: d:\SentinelX\backend\.env not found!
    echo  Please copy .env.example and fill in your credentials.
) else (
    echo  Backend .env found.
)
echo.

:: ── Done ────────────────────────────────────
echo [4/4] Setup complete!
echo.
echo  ┌──────────────────────────────────────────────────────────┐
echo  │  NEXT STEPS:                                             │
echo  │                                                          │
echo  │  1. Make sure PostgreSQL is running                      │
echo  │     Create DB: CREATE DATABASE sentinelx_db;            │
echo  │                                                          │
echo  │  2. Start the BACKEND:                                   │
echo  │     cd d:\SentinelX\backend                             │
echo  │     npm run dev                                          │
echo  │                                                          │
echo  │  3. Start the FRONTEND (new terminal):                   │
echo  │     cd d:\SentinelX\frontend                            │
echo  │     npm run dev                                          │
echo  │                                                          │
echo  │  4. Open browser: http://localhost:5173                  │
echo  │                                                          │
echo  │  DEFAULT ACCOUNTS:                                       │
echo  │    Admin:    admin@sentinelx.io  / Admin@1234           │
echo  │    Analyst:  analyst@sentinelx.io / Analyst@1234        │
echo  │    Reporter: reporter@sentinelx.io / Reporter@1234      │
echo  └──────────────────────────────────────────────────────────┘
echo.
pause
