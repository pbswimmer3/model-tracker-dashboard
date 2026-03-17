#!/usr/bin/env bash
cd /home/prad/.openclaw/workspace/model-tracker

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              AI Model Usage Tracker                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

echo "Syncing latest session data..."
node tracker.js sync
echo ""

echo "━━━ TODAY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node tracker.js stats 1
echo ""

echo "━━━ THIS WEEK ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node tracker.js report weekly
echo ""

echo "━━━ MONTHLY PROJECTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node tracker.js projection
echo ""

echo "Press Enter to close..."
read
