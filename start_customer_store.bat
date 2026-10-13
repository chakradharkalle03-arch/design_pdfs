@echo off
title Akshaya Customer Store (Port 8000)
color 0A
echo ========================================================
echo    Akshaya Blouse Embroidery Studio - Customer Store
echo ========================================================
echo.
echo Customer Store Web:  http://localhost:8000
echo Mobile Wi-Fi Access:  http://192.168.1.105:8000
echo.
echo Press Ctrl+C in this window to stop the customer store.
echo ========================================================
echo.

python -m uvicorn customer_app:app --host 0.0.0.0 --port 8000 --reload

pause
