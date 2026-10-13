@echo off
title Launch Both Akshaya Webs
color 0E
echo ========================================================
echo    Launching Both Web Applications (Customer + Manager)
echo ========================================================
echo.
echo 1. Customer Store Web:    http://localhost:8000
echo 2. Tailor Management Web: http://localhost:8001
echo.
echo Starting Customer Web on Port 8000 ...
start "Customer Store (Port 8000)" cmd /k "start_customer_store.bat"

timeout /t 2 >nul

echo Starting Tailor Manager on Port 8001 ...
start "Tailor Manager (Port 8001)" cmd /k "start_tailor_manager.bat"

echo.
echo Both servers running! Opening Tailor Manager in browser...
timeout /t 3 >nul
start http://localhost:8001

exit
