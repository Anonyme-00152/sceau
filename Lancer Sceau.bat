@echo off
setlocal EnableExtensions
title Sceau - registre client confidentiel
cd /d "%~dp0"

echo.
echo   ============================================
echo     SCEAU - registre client confidentiel
echo   ============================================
echo.

rem ---------------------------------------------------------------
rem  1. Node.js (version 22 ou plus recente)
rem ---------------------------------------------------------------
where node >nul 2>nul
if errorlevel 1 goto install_node
goto check_node

:install_node
echo   Node.js est necessaire et n'est pas installe sur ce PC.
where winget >nul 2>nul
if errorlevel 1 goto manual_node
echo   Installation automatique de Node.js LTS - une fenetre Windows peut demander votre accord.
echo.
winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
if errorlevel 1 goto manual_node
set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node >nul 2>nul
if errorlevel 1 goto restart_needed
goto check_node

:manual_node
echo.
echo   Installez Node.js, version LTS, depuis https://nodejs.org
echo   puis relancez ce fichier.
start "" "https://nodejs.org/fr/download"
pause
exit /b 1

:restart_needed
echo.
echo   Node.js vient d'etre installe. Fermez cette fenetre et relancez ce fichier.
pause
exit /b 1

:check_node
for /f "tokens=1 delims=." %%v in ('node -v') do set "NODEV=%%v"
set "NODEV=%NODEV:v=%"
if %NODEV% LSS 22 goto old_node
goto deps

:old_node
echo   Votre Node.js est trop ancien : version %NODEV%. La version 22 ou plus recente est requise.
echo   Mettez-le a jour depuis https://nodejs.org puis relancez ce fichier.
start "" "https://nodejs.org/fr/download"
pause
exit /b 1

rem ---------------------------------------------------------------
rem  2. Composants (premiere fois seulement)
rem ---------------------------------------------------------------
:deps
if exist "node_modules\next\package.json" goto config
echo   Installation des composants - premiere fois seulement, quelques minutes...
echo.
call npm ci --no-audit --no-fund
if errorlevel 1 goto fail

rem ---------------------------------------------------------------
rem  3. Premiere configuration
rem ---------------------------------------------------------------
:config
if exist ".env.local" goto read_port
echo.
echo   --- Premiere installation ---
echo.
echo   L'administrateur recoit par e-mail chaque demande de nouveau compte
echo   et doit la valider avant que la personne puisse entrer.
echo.
set "ADMIN=%SCEAU_ADMIN%"
:ask_admin
if defined ADMIN goto ask_mode
set /p "ADMIN=  Adresse e-mail de l'administrateur : "
if not defined ADMIN goto ask_admin

:ask_mode
set "MODE=%SCEAU_MODE%"
if defined MODE goto mode_chosen
echo.
echo   [1] Usage reel   - base vide, vos propres clients
echo   [2] Demonstration - donnees fictives pour decouvrir Sceau
choice /c 12 /n /m "  Votre choix [1 ou 2] : "
set "MODE=%errorlevel%"

:mode_chosen
set "SETUP_MODE=--vierge"
if "%MODE%"=="2" set "SETUP_MODE=--reset"
call :find_free_port
echo.
echo   Preparation de la base de donnees chiffree...
call npm run setup -- %SETUP_MODE% --admin=%ADMIN% --port=%PORT%
if errorlevel 1 goto fail

rem ---------------------------------------------------------------
rem  4. Port memorise dans .env.local
rem ---------------------------------------------------------------
:read_port
set "PORT="
for /f "usebackq tokens=1,* delims==" %%a in (".env.local") do if /i "%%a"=="PORT" set "PORT=%%b"
if not defined PORT set "PORT=3300"

rem Sceau tourne deja ? On ouvre simplement le navigateur.
netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul
if errorlevel 1 goto build
echo   Sceau semble deja ouvert sur le port %PORT% : ouverture du navigateur.
start "" "http://localhost:%PORT%"
timeout /t 3 >nul
exit /b 0

rem ---------------------------------------------------------------
rem  5. Preparation de l'application (premiere fois ou apres mise a jour)
rem ---------------------------------------------------------------
:build
if exist ".next\BUILD_ID" goto launch
echo.
echo   Preparation de l'application - premiere fois seulement...
echo.
call npm run build
if errorlevel 1 goto fail

rem ---------------------------------------------------------------
rem  6. Lancement
rem ---------------------------------------------------------------
:launch
echo.
echo   ============================================
echo     Sceau est ouvert : http://localhost:%PORT%
echo     Gardez cette fenetre ouverte.
echo     La fermer arrete Sceau.
echo   ============================================
echo.
if not defined SCEAU_NO_BROWSER start "" /b powershell -NoProfile -WindowStyle Hidden -Command "$p=%PORT%; for($i=0;$i -lt 240;$i++){ try { $c=New-Object Net.Sockets.TcpClient('127.0.0.1',$p); $c.Close(); Start-Process ('http://localhost:'+$p); break } catch { Start-Sleep -Milliseconds 500 } }"
set "NODE_ENV=production"
call npm run start
goto end

rem ---------------------------------------------------------------
:find_free_port
set "PORT=3300"
:port_loop
netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul
if errorlevel 1 exit /b 0
set /a PORT+=1
goto port_loop

:fail
echo.
echo   Une erreur est survenue. Gardez cette fenetre ouverte et copiez
echo   les messages ci-dessus pour obtenir de l'aide.
pause
exit /b 1

:end
endlocal
