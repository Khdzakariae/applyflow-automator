#!/bin/bash

# Stop the background ApplyFlow Backend

echo "🛑 Stopping ApplyFlow Backend..."

cd /Users/anass/Desktop/applyflow-automator/backend

if [ -f backend.pid ]; then
    PID=$(cat backend.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "✅ Backend stopped (PID: $PID)"
        rm backend.pid
    else
        echo "❌ Process not running (PID: $PID)"
        rm backend.pid
    fi
else
    echo "❌ No PID file found. Backend may not be running."
    echo "🔍 Searching for node processes..."
    ps aux | grep "node app.js" | grep -v grep
fi