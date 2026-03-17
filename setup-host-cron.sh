#!/bin/bash

# Model Usage Tracker - Host Cron Setup
# For running cron jobs on the HOST that exec into Docker container

set -e

echo "🔄 Setting up Model Usage Tracker cron jobs on HOST..."

HOST_WORKSPACE="$HOME/openclaw/config/workspace"  # Adjust if different
CONTAINER_WORKSPACE="/home/node/.openclaw/workspace"
CRON_FILE="/tmp/model-tracker-host-cron"

# Check if we can guess the host workspace path
if [ ! -d "$HOST_WORKSPACE" ]; then
    echo "⚠️  Could not find host workspace at: $HOST_WORKSPACE"
    echo "Please update HOST_WORKSPACE variable in this script to match your setup."
    echo "Look for where your OpenClaw config is mounted from host to container."
    exit 1
fi

# Create cron entries for HOST (using docker compose exec)
cat > "$CRON_FILE" << EOF
# Model Usage Tracker - Automated Reports (HOST CRON)
# Runs commands inside Docker container via docker compose exec
# Generated: $(date)

# Daily report at 23:59
59 23 * * * cd "$HOME/openclaw" && docker compose exec -T openclaw-gateway node "$CONTAINER_WORKSPACE/model-tracker/tracker.js" report daily >> "$HOST_WORKSPACE/model-tracker/cron-host.log" 2>&1

# Weekly report on Sunday at 23:58
58 23 * * 0 cd "$HOME/openclaw" && docker compose exec -T openclaw-gateway node "$CONTAINER_WORKSPACE/model-tracker/tracker.js" report weekly >> "$HOST_WORKSPACE/model-tracker/cron-host.log" 2>&1

# Monthly report on 1st at 00:01
1 0 1 * * cd "$HOME/openclaw" && docker compose exec -T openclaw-gateway node "$CONTAINER_WORKSPACE/model-tracker/tracker.js" report monthly >> "$HOST_WORKSPACE/model-tracker/cron-host.log" 2>&1

# Cleanup old logs (keep 90 days) on 1st of month at 02:00
0 2 1 * * cd "$HOME/openclaw" && docker compose exec -T openclaw-gateway node "$CONTAINER_WORKSPACE/model-tracker/tracker.js" cleanup 90 >> "$HOST_WORKSPACE/model-tracker/cron-host.log" 2>&1

# Daily stats summary at 09:00 (optional)
# 0 9 * * * cd "$HOME/openclaw" && docker compose exec -T openclaw-gateway node "$CONTAINER_WORKSPACE/model-tracker/tracker.js" stats 1 >> "$HOST_WORKSPACE/model-tracker/daily-stats.log" 2>&1
EOF

echo "📋 Generated HOST cron file:"
echo "============================="
cat "$CRON_FILE"
echo "============================="

echo ""
echo "📝 To install these cron jobs on the HOST:"
echo "1. Copy the above entries to your HOST crontab:"
echo "   crontab -e"
echo "2. Or load from file:"
echo "   crontab $CRON_FILE"
echo ""
echo "🔧 Test a command manually first:"
echo "   cd ~/openclaw && docker compose exec -T openclaw-gateway node \"$CONTAINER_WORKSPACE/model-tracker/tracker.js\" stats 1"
echo ""
echo "📁 Host logs will be written to: $HOST_WORKSPACE/model-tracker/cron-host.log"
echo "📊 Reports will be saved inside container at: $CONTAINER_WORKSPACE/model-tracker/reports/"
echo ""
echo "⚠️  IMPORTANT: Update HOST_WORKSPACE path in this script if it's incorrect!"
echo "   Current guess: $HOST_WORKSPACE"
echo "   Check your docker-compose.yml for volume mounts"

# Test the command
echo ""
echo "🧪 Testing command..."
cd "$HOME/openclaw" 2>/dev/null && docker compose exec -T openclaw-gateway node "$CONTAINER_WORKSPACE/model-tracker/tracker.js" stats 1 2>&1 || echo "Test failed - check paths"

echo ""
echo "✅ Host cron setup complete!"