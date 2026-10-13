@echo off
title Get Public WhatsApp Link - Chakri Boutique
color 0B
echo ========================================================
echo    Generate Public Internet Link for Customers
echo ========================================================
echo.
echo Make sure the server (start_server.bat) is running first!
echo.
echo Starting secure public tunnel on port 8000 ...
echo Send the generated URL to your customers on WhatsApp!
echo.
echo ========================================================

npx --yes localtunnel --port 8000

pause
