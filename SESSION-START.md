# SESSION-START.md — Model Tracker Dashboard
_Read this FIRST every session. Then read TODO.md and LESSONS.md._

## Project
**Goal:** Replace CLI-only model tracker with a live interactive desktop dashboard.
**Location:** `/home/node/.openclaw/workspace/model-tracker/`  
**GitHub:** to be pushed to `pbswimmer3/model-tracker-dashboard` (or existing repo)

## Architecture
```
model-tracker/
├── dashboard/
│   └── index.html        # Full dashboard UI (D3.js charts, live data)
├── server.js             # Express API server: /api/stats, /api/logs, /api/report
├── tracker.js            # Existing: CLI + logCall() API (DO NOT BREAK)
├── logger.js             # Existing: JSONL read/write
├── pricing.js            # Existing: cost calculation (Kimi added)
├── session-parser.js     # Existing: imports OpenClaw session data
├── logs/                 # JSONL usage files (real data flowing)
├── TODO.md               # Active tasks
├── LESSONS.md            # Mistakes log
└── SESSION-START.md      # This file
```

## Key Facts
- Real usage data IS flowing (from OpenClaw session parser)
- 198 real log entries across 5 days (Mar 11–17)
- Models tracked: sonnet, kimi, gemini, deepseek, opus
- Kimi pricing already added: $0.60/$2.50 per 1M
- Desktop launcher: needs `.desktop` file → icon on Prad's GNOME desktop

## Stack Decisions
- **Frontend:** Vanilla JS + D3.js (proven from Iran dashboard)
- **Backend:** Node.js + Express (already have Node, minimal deps)
- **Charts:** D3.js bar, line, donut charts
- **Launch:** `.desktop` file → bash script → starts server + opens browser

## Rules
- Minimum code changes — reuse logger.js/pricing.js as-is
- Always push to GitHub when session ends
- Test data loads before building UI on top of it
- Serve from project root (lesson learned from Iran dashboard)
