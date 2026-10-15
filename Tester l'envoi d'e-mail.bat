@echo off
setlocal EnableExtensions
title Sceau - test d'envoi d'e-mail
cd /d "%~dp0"
echo.
echo   SCEAU - test d'envoi d'e-mail
echo   -----------------------------
echo.
if not exist "node_modules\next\package.json" (
  echo   Lancez d'abord "Lancer Sceau.bat" pour installer Sceau.
  pause
  exit /b 1
)
call npm run test-mail --silent
echo.
pause
