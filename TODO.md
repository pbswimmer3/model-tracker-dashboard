# TODO.md — Model Tracker Dashboard

## Active Tasks
- [ ] Prad to run install commands on VM (see below)
- [ ] Push to GitHub

## Completed ✅
- [x] SESSION-START.md, TODO.md, LESSONS.md
- [x] `server.js` — Express API (6 endpoints, all tested ✅)
- [x] `dashboard/index.html` — Full D3.js dashboard
  - [x] Stat cards: today/week/month cost + projection bar
  - [x] Line chart: daily cost with hover tooltips
  - [x] Donut chart: cost by model breakdown
  - [x] Bar chart: calls per day
  - [x] Recent calls table (last 50)
  - [x] 7D/14D/30D range toggle
  - [x] Auto-refresh every 60s
- [x] `launch.sh` — starts server + opens browser
- [x] `model-tracker.desktop` — desktop icon file
- [x] Fixed Express v5 wildcard route syntax

## Install Commands (run on VM)
```bash
cd /home/prad/.openclaw/workspace/model-tracker
chmod +x launch.sh
cp model-tracker.desktop ~/Desktop/
chmod +x ~/Desktop/model-tracker.desktop
# Right-click desktop icon → Allow Launching (GNOME)
```

## Blocked
*None*
