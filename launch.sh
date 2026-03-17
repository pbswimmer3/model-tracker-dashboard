#!/bin/bash
# launch.sh — Start Model Tracker Dashboard and open in browser

PROJECT_DIR="/home/prad/.openclaw/workspace/model-tracker"
PORT=8081
PIDFILE="$PROJECT_DIR/.server.pid"
LOGFILE="$PROJECT_DIR/.server.log"

# Kill any existing instance
if [ -f "$PIDFILE" ]; then
  kill $(cat "$PIDFILE") 2>/dev/null
  rm "$PIDFILE"
fi

# Start server detached from terminal (nohup keeps it alive)
cd "$PROJECT_DIR"
nohup node server.js > "$LOGFILE" 2>&1 &
echo $! > "$PIDFILE"

# Wait for server to be ready
sleep 2

# Open browser
xdg-open "http://localhost:$PORT" 2>/dev/null &

echo "✅ Dashboard running at http://localhost:$PORT"
echo "   Server PID: $(cat $PIDFILE)"
