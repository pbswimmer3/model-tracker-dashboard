#!/bin/bash

# Model Usage Tracker - Cron Setup Script
# This sets up automated reporting for the model usage tracker

set -e

echo "🔄 Setting up Model Usage Tracker cron jobs..."

WORKSPACE_DIR="/home/node/.openclaw/workspace"
TRACKER_DIR="$WORKSPACE_DIR/model-tracker"
CRON_FILE="/tmp/model-tracker-cron"

# Check if tracker exists
if [ ! -d "$TRACKER_DIR" ]; then
    echo "❌ Tracker directory not found: $TRACKER_DIR"
    exit 1
fi

# Create cron entries
cat > "$CRON_FILE" << EOF
# Model Usage Tracker - Automated Reports
# Generated: $(date)

# Daily report at 23:59
59 23 * * * cd "$WORKSPACE_DIR" && node model-tracker/tracker.js report daily >> "$TRACKER_DIR/cron.log" 2>&1

# Weekly report on Sunday at 23:58
58 23 * * 0 cd "$WORKSPACE_DIR" && node model-tracker/tracker.js report weekly >> "$TRACKER_DIR/cron.log" 2>&1

# Monthly report on 1st at 00:01
1 0 1 * * cd "$WORKSPACE_DIR" && node model-tracker/tracker.js report monthly >> "$TRACKER_DIR/cron.log" 2>&1

# Cleanup old logs (keep 90 days) on 1st of month at 02:00
0 2 1 * * cd "$WORKSPACE_DIR" && node model-tracker/tracker.js cleanup 90 >> "$TRACKER_DIR/cron.log" 2>&1

# Daily stats email/summary at 09:00 (optional)
# 0 9 * * * cd "$WORKSPACE_DIR" && node model-tracker/tracker.js stats 1 | mail -s "Daily AI Usage" user@example.com
EOF

echo "📋 Generated cron file:"
echo "========================"
cat "$CRON_FILE"
echo "========================"

echo ""
echo "📝 To install these cron jobs:"
echo "1. Copy the above entries to your crontab:"
echo "   crontab -e"
echo "2. Or load from file:"
echo "   crontab $CRON_FILE"
echo ""
echo "🔧 Manual testing:"
echo "   cd $WORKSPACE_DIR && node model-tracker/tracker.js report daily"
echo "   cd $WORKSPACE_DIR && node model-tracker/tracker.js stats 7"
echo ""
echo "📁 Logs will be written to: $TRACKER_DIR/cron.log"
echo "📊 Reports will be saved to: $TRACKER_DIR/reports/"

# Test the tracker
echo ""
echo "🧪 Running quick test..."
cd "$WORKSPACE_DIR" && node model-tracker/tracker.js stats 1

echo ""
echo "✅ Setup complete!"