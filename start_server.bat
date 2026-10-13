@echo off
title Chakri Blouse Embroidery Studio
color 0A
echo ========================================================
echo    Chakri Blouse Embroidery Studio - Web Server
echo ========================================================
echo.
echo Starting web server on http://localhost:8000 ...
echo Local Wi-Fi Access: http://192.168.1.105:8000
echo Admin Portal:       http://localhost:8000/admin (PIN: 1439)
echo.
echo Press Ctrl+C in this window anytime to stop the server.
echo ========================================================
echo.

python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload

pause
