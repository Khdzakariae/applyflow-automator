#!/bin/bash

# ApplyFlow Backend Management Script

echo "🚀 ApplyFlow Backend Manager"
echo "=========================="

case "$1" in
  start)
    echo "Starting backend in production mode..."
    cd /Users/anass/Desktop/applyflow-automator/backend
    pm2 start ecosystem.config.json --env production
    echo "✅ Backend started!"
    echo "📊 Use 'npm run status' to check status"
    ;;
    
  dev)
    echo "Starting backend in development mode..."
    cd /Users/anass/Desktop/applyflow-automator/backend
    pm2 start ecosystem.config.json --env development
    echo "✅ Backend started in dev mode!"
    ;;
    
  stop)
    echo "Stopping backend..."
    pm2 stop applyflow-backend
    echo "✅ Backend stopped!"
    ;;
    
  restart)
    echo "Restarting backend..."
    pm2 restart applyflow-backend
    echo "✅ Backend restarted!"
    ;;
    
  status)
    echo "Backend status:"
    pm2 status applyflow-backend
    ;;
    
  logs)
    echo "Showing backend logs (Ctrl+C to exit):"
    pm2 logs applyflow-backend
    ;;
    
  delete)
    echo "⚠️  Deleting backend process..."
    pm2 delete applyflow-backend
    echo "✅ Backend process deleted!"
    ;;
    
  *)
    echo "Usage: $0 {start|dev|stop|restart|status|logs|delete}"
    echo ""
    echo "Commands:"
    echo "  start    - Start backend in production mode"
    echo "  dev      - Start backend in development mode"  
    echo "  stop     - Stop the backend"
    echo "  restart  - Restart the backend"
    echo "  status   - Show backend status"
    echo "  logs     - Show backend logs"
    echo "  delete   - Delete backend process"
    exit 1
    ;;
esac