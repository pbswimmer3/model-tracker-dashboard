# Model Usage Tracker - Quick Start

## 🚀 Get Started in 5 Minutes

### 1. Test the System
```bash
cd /home/node/.openclaw/workspace
node model-tracker/test.js
```

### 2. Generate Your First Report
```bash
node model-tracker/tracker.js report weekly
```

### 3. View Current Stats
```bash
node model-tracker/tracker.js stats 7
```

### 4. Set Up Automation
```bash
./model-tracker/setup-cron.sh
# Follow the instructions to install cron jobs
```

## 📊 What You Get

### Automatic Tracking
- **Every API call** logged with model, tokens, cost
- **JSONL storage** for audit trail
- **Daily rotation** of log files

### Smart Reports
- **Daily/Weekly/Monthly** summaries
- **Cost breakdowns** by model and task type
- **Trend analysis** and projections
- **Human-readable** and JSON formats

### Cost Management
- **Real-time cost calculation**
- **Monthly projections**
- **Budget tracking**
- **Cleanup of old logs**

## 🔧 Integration Options

### Option A: Manual Logging (Easiest)
```javascript
const tracker = require('./model-tracker/tracker.js');

// After each AI interaction:
tracker.logCall(
  'anthropic/claude-opus-4-6',  // Model
  1500,                         // Input tokens (estimate: text.length / 4)
  800,                          // Output tokens
  'Your prompt here...',        // Prompt (truncated)
  'AI response here...',        // Response (truncated)
  'session-id',                 // Session identifier
  'task-type',                  // e.g., 'coding', 'analysis', 'search'
  { metadata: 'any data' }      // Optional metadata
);
```

### Option B: Automated via Cron
```bash
# Daily report at midnight
0 0 * * * cd /home/node/.openclaw/workspace && node model-tracker/tracker.js report daily

# Weekly report on Sundays
0 0 * * 0 cd /home/node/.openclaw/workspace && node model-tracker/tracker.js report weekly
```

### Option C: Parse Existing Logs
```bash
# Find and parse OpenClaw session logs
find ~/.openclaw -name "*.json" -type f | xargs grep -l "model\|tokens" | head -10
```

## 📁 File Structure
```
model-tracker/
├── tracker.js          # Main tracker class
├── logger.js           # Logging utilities
├── pricing.js          # Cost calculations
├── report.js           # Report generation
├── test.js             # Test suite
├── setup-cron.sh       # Cron setup script
├── logs/               # JSONL log files
│   ├── usage-2026-03-08.jsonl
│   └── usage-all.jsonl
├── reports/            # Generated reports
│   ├── daily-2026-03-08.json
│   ├── daily-2026-03-08.txt
│   └── ...
├── skill/              # OpenClaw skill documentation
└── README.md           # Full documentation
```

## 💰 Pricing Table (per 1M tokens)

| Model | Input | Output | Notes |
|-------|-------|--------|-------|
| Claude Opus | $5.00 | $25.00 | Reasoning, planning |
| Claude Sonnet | $3.00 | $15.00 | Coding, analysis |
| Claude Haiku | $0.25 | $1.25 | Simple tasks |
| Gemini Flash | $0.10 | $0.40 | Search, quick answers |
| DeepSeek Chat | $0.56 | $0.42 | Sub-agents, batch tasks |
| GPT-4o | $2.50 | $10.00 | General purpose |

## 🎯 Example Workflow

1. **Morning check**: `node tracker.js stats 1`
2. **After work**: `node tracker.js report daily`
3. **Weekly review**: `node tracker.js report weekly`
4. **Monthly planning**: `node tracker.js projection`

## ⚡ Pro Tips

1. **Token estimation**: `text.length / 4` ≈ tokens (for English)
2. **Task types**: Use consistent categories: 'coding', 'analysis', 'search', 'writing', 'reasoning'
3. **Session IDs**: Track costs per project/conversation
4. **Metadata**: Add project names, user IDs, or feature flags
5. **Cleanup**: Keep 90 days of logs, archive older data

## 🆘 Troubleshooting

**No logs appearing?**
- Check `model-tracker/logs/` directory exists
- Verify write permissions
- Test with `node test.js`

**Costs seem wrong?**
- Check `pricing.js` for updated rates
- Verify token counts are accurate
- Use actual API response `usage` fields if available

**Cron not running?**
- Check `crontab -l`
- Verify paths are absolute
- Check `model-tracker/cron.log` for errors

## 📈 Next Steps

1. **Integrate** with your AI workflows
2. **Set up** email alerts for high spending
3. **Create** a dashboard for visualization
4. **Add** team/user cost allocation
5. **Implement** budget limits and alerts

---

**Ready to go?** Run the setup script:
```bash
cd /home/node/.openclaw/workspace/model-tracker
./setup-cron.sh
```

Then start tracking your AI costs! 🎯