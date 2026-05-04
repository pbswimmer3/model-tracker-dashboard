# Model Tracker

Model Tracker automatically records every AI model call that OpenClaw makes, calculates what each call cost, and lets you view usage reports whenever you want. No manual setup is needed — it runs in the background and syncs itself every hour.

---

## How it works

OpenClaw writes a log of every conversation and AI response to files on your computer. Model Tracker reads those files, extracts the token counts and costs that OpenClaw already calculated, and stores them in its own logs. This means the cost data is exact — not an estimate.

Every hour, a scheduled job automatically pulls in any new calls. You can also trigger a sync manually at any time.

---

## Viewing your usage (the easy way)

Double-click **Model Tracker** on your Desktop. A terminal window will open and show you:

- Today's total calls and cost
- A full weekly breakdown by model
- A projected cost for the rest of the month

That's it. Close the window when you're done.

> **First time only:** GNOME may show an "Untrusted" warning when you double-click the icon. Right-click it and choose **Allow Launching** — you only need to do this once.

---

## Viewing your usage (from the terminal)

Open a terminal, then run any of these commands. You need to `cd` into the model-tracker folder first:

```bash
cd /home/prad/.openclaw/workspace/model-tracker
```

| What you want to see | Command |
|---|---|
| Today's stats | `node tracker.js stats 1` |
| Last 7 days | `node tracker.js stats 7` |
| Weekly report (full breakdown) | `node tracker.js report weekly` |
| Monthly report | `node tracker.js report monthly` |
| Cost projection for this month | `node tracker.js projection` |
| Pull in the latest data right now | `node tracker.js sync` |

**Example — check what you spent this week:**
```bash
cd /home/prad/.openclaw/workspace/model-tracker
node tracker.js sync
node tracker.js report weekly
```

---

## Supported models and pricing

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|---|---|---|
| Claude Opus 4.6 | $5.00 | $25.00 |
| Claude Sonnet 4.6 | $3.00 | $15.00 |
| Claude Haiku 4.6 | $0.25 | $1.25 |
| Kimi K2.6 (Moonshot) | $0.60 | $2.50 |
| Kimi K2.5 (Moonshot) | $0.60 | $2.50 |
| Kimi K1.5 (Moonshot) | $0.50 | $2.00 |
| Gemini 2.5 Flash | $0.10 | $0.40 |
| DeepSeek V4 Pro | $0.56 | $0.42 |
| DeepSeek Chat | $0.56 | $0.42 |
| GPT-5.4 | $2.50 | $15.00 |
| GPT-5.4-mini | $0.75 | $4.50 |
| GPT-5.4-nano | $0.20 | $1.25 |
| GPT-4o | $2.50 | $10.00 |
| GPT-4o mini | $0.15 | $0.60 |

Costs shown in the tracker are pulled directly from OpenClaw's own cost calculations — not estimated.

---

## Automatic scheduling

These jobs run automatically in the background. You don't need to do anything.

| Schedule | What it does |
|---|---|
| Every hour (at :17) | Syncs new session data from OpenClaw |
| Daily at 11:59 PM | Saves a daily report to the `reports/` folder |
| Every Sunday at 11:58 PM | Saves a weekly report |
| 1st of each month at 12:01 AM | Saves a monthly report |

Cron output (including any errors) is logged to `/home/prad/openclaw/model-tracker-cron.log`.

---

## File structure

```
model-tracker/
├── tracker.js          # Main entry point and CLI
├── session-parser.js   # Reads OpenClaw's session logs to import real usage data
├── logger.js           # Reads and writes the tracker's own log files
├── pricing.js          # Cost calculations and model pricing table
├── report.js           # Generates daily/weekly/monthly reports
├── view.sh             # Script launched by the Desktop icon
├── test.js             # Test suite
├── logs/               # Usage data (JSONL, one file per day + a master log)
└── reports/            # Saved reports (JSON + human-readable .txt)
```

### Log format

Each entry in the logs looks like this:

```json
{
  "timestamp": "2026-03-14T20:00:00Z",
  "provider": "moonshot",
  "model": "kimi",
  "full_model": "moonshot/kimi-k2.5",
  "input_tokens": 1000,
  "output_tokens": 500,
  "total_tokens": 1500,
  "task_type": "openclaw",
  "session_id": "abc123",
  "estimated_cost_usd": 0.00185,
  "metadata": {
    "source": "openclaw-session",
    "openclaw_id": "msg-xyz",
    "cache_read_tokens": 0,
    "cache_write_tokens": 0
  }
}
```

---

## Running the tests

```bash
cd /home/prad/.openclaw/workspace/model-tracker
node test.js
```

---

## Adding new models

When OpenClaw adds support for new models, you need to add their pricing to the tracker:

1. **Edit `pricing.js`** — Add an entry to the `PRICING` object:
   ```javascript
   'provider/model-name': { input: X.XX, output: X.XX }
   ```
   Use the full model ID (e.g., `'openai/gpt-5.4'` not just `'gpt-5.4'`).

2. **Update the README** — Add the model to the pricing table above.

3. **Restart the dashboard** (if running) — The pricing API updates immediately; refresh your browser.

Costs are per 1 million tokens. Find official pricing at the provider's API docs (e.g., openai.com/api/pricing).

---

## Where OpenClaw session data comes from

OpenClaw stores session logs at:
```
~/.openclaw/agents/main/sessions/
```

Each session is a `.jsonl` file (one JSON object per line). Model Tracker reads the `type: "message"` entries where `role` is `assistant` and usage tokens are non-zero. It tracks which entries it has already imported in `logs/.session-import-state.json`, so syncing is always safe to run multiple times.
