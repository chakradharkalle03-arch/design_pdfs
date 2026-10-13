@echo off
title Akshaya Tailor Manager (Port 8001)
color 0B
echo ========================================================
echo    Akshaya Tailor Management Portal (Owner Only)
echo ========================================================
echo.
echo Tailor Manager Web:  http://localhost:8001
echo.
echo Features:
echo  - View Customer Orders & Blouse Photos
echo  - Upload Design PDFs & Images
echo  - 1-Click WhatsApp Chat with Customers
echo  - Copy Customer Store Link
echo.
echo Press Ctrl+C in this window to stop the manager portal.
echo ========================================================
echo.

python -m uvicorn tailor_manager:app --host 0.0.0.0 --port 8001 --reload

pause
