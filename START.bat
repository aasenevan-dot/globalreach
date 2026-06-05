@echo off
setlocal
title GlobalReach
cd /d "%~dp0"

echo ============================================
echo            Starting GlobalReach
echo ============================================
echo.

REM --- Check that Node.js is installed ---
where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js was not found on this PC.
  echo.
  echo GlobalReach needs Node.js to run ^(free, one-time install^).
  echo   1. Go to https://nodejs.org
  echo   2. Download the "LTS" version and install it ^(click Next a few times^).
  echo   3. Re-run this START.bat file.
  echo.
  pause
  exit /b 1
)

REM --- Install dependencies on first run ---
if not exist "node_modules" (
  echo First-time setup: installing components. This can take 1-3 minutes...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [!] Setup failed. Make sure you are connected to the internet and try again.
    pause
    exit /b 1
  )
  echo.
  echo Setup complete.
  echo.
)

REM --- Build if the production bundle is missing ---
if not exist "dist\index.cjs" (
  echo Building the app...
  call npm run build
  if errorlevel 1 (
    echo [!] Build failed.
    pause
    exit /b 1
  )
)

echo.
echo GlobalReach is starting at  http://localhost:5000
echo Opening your browser...
echo.
echo Keep this window OPEN while you use the app.
echo To stop GlobalReach, close this window.
echo.

REM --- Open the browser, then run the server ---
start "" http://localhost:5000
set NODE_ENV=production
node dist\index.cjs

pause
