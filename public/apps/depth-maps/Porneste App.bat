@echo off
title DepthMap AI
echo.
echo  DepthMap AI - Pornire server...
echo.

:: Incearca Node.js / npx
where node >nul 2>nul
if %ERRORLEVEL%==0 (
    echo  Foloseste Node.js...
    start "" "http://localhost:5500"
    npx -y serve . -p 5500 --no-clipboard
    goto :end
)

:: Incearca Python 3
where python >nul 2>nul
if %ERRORLEVEL%==0 (
    echo  Foloseste Python 3...
    start "" "http://localhost:5500"
    python -m http.server 5500
    goto :end
)

:: Nicio optiune disponibila
echo  EROARE: Nu am gasit Node.js sau Python!
echo.
echo  Instaleaza Node.js de la: https://nodejs.org
echo  sau Python de la: https://python.org
echo.
pause

:end
