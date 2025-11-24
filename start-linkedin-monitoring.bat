@echo off
title LinkedIn Auto-Sync Service
echo 🤖 Starting LinkedIn Auto-Sync Service...
echo ========================================

REM Install dependencies if needed
if not exist "node_modules\puppeteer-core" (
    echo 📦 Installing dependencies...
    npm install --save-dev puppeteer-core
)

REM Start the monitoring service
echo 🔄 Starting automated LinkedIn monitoring...
echo 💡 Your website will update automatically when you post on LinkedIn
echo 🛑 Press Ctrl+C to stop monitoring
echo.

node automated-linkedin-sync.js
pause