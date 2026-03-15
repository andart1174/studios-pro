@echo off
chcp 65001 >nul
title 3D·4D Studio — Convertizor Profesional

cls
echo.
echo   ╔══════════════════════════════════════════════════════╗
echo   ║                                                      ║
echo   ║          3D · 4D  S T U D I O                       ║
echo   ║     Image to STL ^ GLB — Ultra Quality              ║
echo   ║                                                      ║
echo   ╚══════════════════════════════════════════════════════╝
echo.
echo   Se deschide aplicatia in browser...
echo.

start "" "%~dp0index.html"

timeout /t 2 >nul
exit
