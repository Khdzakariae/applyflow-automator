#!/bin/bash

# Simple background runner for ApplyFlow Backend

echo "🚀 Starting ApplyFlow Backend in background..."

# Go to backend directory
cd /Users/anass/Desktop/applyflow-automator/backend

# Start the server in background with nohup
nohup node app.js > ./logs/backend.log 2>&1 &

# Get the process ID
PID=$!

# Save PID to file for later management
echo $PID > backend.pid

echo "✅ Backend started!"
echo "📝 Process ID: $PID"
echo "📁 Logs: ./logs/backend.log"
echo "🛑 To stop: kill $PID"
echo ""
echo "Commands to manage:"
echo "  ./stop-backend.sh  - Stop the backend"
echo "  tail -f ./logs/backend.log  - View logs"