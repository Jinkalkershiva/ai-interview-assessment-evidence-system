@echo off
title AI Exam Helper — Startup

echo.
echo ====================================================
echo  AI Exam Helper — Spring Boot + React Web App
echo ====================================================
echo.

:: ─── Check Java 21 ──────────────────────────────────────────────────────────
java -version 2>&1 | findstr /i "21" >nul
if errorlevel 1 (
    echo [ERROR] Java 21 is required. Please install it from:
    echo   https://adoptium.net/
    pause & exit /b 1
)
echo [OK] Java 21 detected.

:: ─── Check Node ──────────────────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install from https://nodejs.org/
    pause & exit /b 1
)
echo [OK] Node.js detected.

:: ─── Set GEMINI_API_KEY ──────────────────────────────────────────────────────
if "%GEMINI_API_KEY%"=="" (
    echo.
    echo [INFO] GEMINI_API_KEY not set. Running in mock mode.
    echo        To use real AI, run: set GEMINI_API_KEY=your_key_here
    echo        Or copy backend\.env.example to backend\.env and set the key.
    echo.
)

:: ─── Build Frontend ──────────────────────────────────────────────────────────
echo Setting up React Frontend...
cd /d "%~dp0frontend"
if not exist node_modules (
    echo Installing npm dependencies...
    call npm install
    if errorlevel 1 ( echo [ERROR] npm install failed. & pause & exit /b 1 )
)
call npm run build
if errorlevel 1 ( echo [ERROR] Vite build failed. & pause & exit /b 1 )
echo [OK] Frontend built: frontend\dist\
echo.

:: ─── Build + Start Spring Boot ───────────────────────────────────────────────
echo Building Spring Boot backend...
cd /d "%~dp0backend"
call mvn -q clean package -DskipTests
if errorlevel 1 ( echo [ERROR] Maven build failed. & pause & exit /b 1 )
echo [OK] Spring Boot JAR built.
echo.

:: ─── Start Frontend Dev Server ───────────────────────────────────────────────
echo Starting React Vite server (http://localhost:5173)...
start "AI Exam Helper — Frontend" cmd /c "cd /d ""%~dp0frontend"" && npm run dev"

echo ====================================================
echo  BACKEND:  Starting on http://localhost:8080
echo  FRONTEND: Available at http://localhost:5173
echo ====================================================
echo.

:: Load .env if present
if exist .env (
    for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
        if not "%%a"=="" if not "%%a:~0,1%"=="#" set "%%a=%%b"
    )
    echo [INFO] Loaded .env file.
)

java -jar target\exam-helper-backend-1.0.0.jar
