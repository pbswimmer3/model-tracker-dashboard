# Model Usage Tracker Skill

Track AI model usage and costs across all providers (Anthropic, Google, DeepSeek).

## Features

- **Automatic logging** of all model calls
- **Cost calculation** based on provider pricing
- **Daily/Weekly/Monthly reports** with breakdowns
- **JSONL storage** for audit trail
- **Cost projections** and budget tracking

## Installation

1. Copy the `model-tracker` directory to your workspace
2. Ensure Node.js is available in the container
3. Set up cron jobs for automated reporting

## Usage

### Manual Commands
```bash
# Generate reports
node /home/node/.openclaw/workspace/model-tracker/tracker.js report daily
node /home/node/.openclaw/workspace/model-tracker/tracker.js report weekly
node /home/node/.openclaw/workspace/model-tracker/tracker.js report monthly

# View stats
node /home/node/.openclaw/workspace/model-tracker/tracker.js stats 7

# Cost projection
node /home/node/.openclaw/workspace/model-tracker/tracker.js projection
```

### Automated Logging
The tracker automatically logs calls when used via the wrapper functions. For manual logging:

```javascript
const tracker = require('./model-tracker/tracker.js');
tracker.logCall(
  'anthropic/claude-opus-4-6',
  1500, // input tokens
  800,  // output tokens
  'What is the meaning of life?',
  '42',
  'main-session',
  'philosophy'
);
```

## Cron Setup

Add to crontab for automated reporting:

```bash
# Daily report at 23:59
59 23 * * * cd /home/node/.openclaw/workspace && node model-tracker/tracker.js report daily

# Weekly report on Sunday at 23:58
58 23 * * 0 cd /home/node/.openclaw/workspace && node model-tracker/tracker.js report weekly

# Monthly report on 1st at 00:01
1 0 1 * * cd /home/node/.openclaw/workspace && node model-tracker/tracker.js report monthly

# Cleanup old logs on 1st of month
0 2 1 * * cd /home/node/.openclaw/workspace && node model-tracker/tracker.js cleanup 90
```

## Data Storage

- **Logs:** `model-tracker/logs/usage-YYYY-MM-DD.jsonl`
- **Reports:** `model-tracker/reports/{daily,weekly,monthly}-YYYY-MM-DD.{json,txt}`
- **Master log:** `model-tracker/logs/usage-all.jsonl`

## Pricing

The tracker uses these rates (per 1M tokens):

| Model | Input | Output |
|-------|-------|--------|
| Claude Opus | $5.00 | $25.00 |
| Claude Sonnet | $3.00 | $15.00 |
| Claude Haiku | $0.25 | $1.25 |
| Gemini Flash | $0.10 | $0.40 |
| DeepSeek Chat | $0.56 | $0.42 |
| GPT-4o | $2.50 | $10.00 |

## Integration Notes

Since OpenClaw doesn't expose a direct hook for model calls, this tracker works by:
1. Manual logging via wrapper functions
2. Parsing session logs (if available)
3. Estimating costs based on message lengths

For full automation, OpenClaw would need to expose model call events or middleware hooks.