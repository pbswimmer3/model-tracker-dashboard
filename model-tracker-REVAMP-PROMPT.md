# Model-Tracker Revamp: Detailed Implementation Prompt

## Overview
The model-tracker in `/home/prad/.openclaw/workspace/model-tracker/` is a Node.js system for tracking AI API calls, calculating costs, and generating reports. It currently has several issues and is missing support for Kimi 2.5 (Moonshot AI).

## Current State Analysis

### What Works
- Basic logging to JSONL files (`logs/usage-YYYY-MM-DD.jsonl`)
- Manual `tracker.logCall()` API for logging model interactions
- Report generation (daily/weekly/monthly) with cost breakdowns
- CLI interface: `node tracker.js stats|report|projection|cleanup|log`
- Pricing data for Anthropic, Google, DeepSeek, OpenAI

### Current Architecture
```
model-tracker/
├── tracker.js          # Main tracker class, CLI interface
├── logger.js           # Log file I/O, entry formatting
├── pricing.js          # Cost calculations, model aliases, task type detection
├── report.js           # Report generation, human-readable summaries
├── test.js             # Test suite
├── logs/               # JSONL log files
└── reports/            # Generated reports
```

### Current Pricing Data (pricing.js)
```javascript
PRICING = {
  'anthropic/claude-opus-4-6': { input: 5.0, output: 25.0 },
  'anthropic/claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'anthropic/claude-haiku-4-6': { input: 0.25, output: 1.25 },
  'google/gemini-2.5-flash': { input: 0.10, output: 0.40 },
  'deepseek/deepseek-chat': { input: 0.56, output: 0.42 },
  'openai/gpt-4o': { input: 2.50, output: 10.00 },
  // Aliases: opus, sonnet, haiku
}
```

## Issues to Diagnose and Fix

### Issue 1: No Automatic API Call Tracking
**Problem:** The tracker only works via manual `tracker.logCall()` calls. It does NOT automatically intercept OpenClaw's model calls.

**Current Integration Strategy (from INTEGRATION.md):**
- Strategy 1: Manual logging (implemented)
- Strategy 2: Session log parsing (not implemented)
- Strategy 3: Proxy/Middleware (not implemented)
- Strategy 4: OpenClaw Extension (ideal, not implemented)

**What to investigate:**
1. Does OpenClaw expose any hooks, events, or log files that contain model usage data?
2. Check `~/.openclaw/` directory structure for any usage logs, session logs, or telemetry
3. Look for any OpenClaw CLI commands that might expose usage data (`openclaw status`, `openclaw sessions`, etc.)
4. Check if there's a way to add middleware to OpenClaw's model calls

### Issue 2: Missing Kimi 2.5 (Moonshot AI) Support
**Problem:** Moonshot/Kimi K2.5 is Prad's primary model but has no pricing entry.

**Kimi 2.5 Pricing (per 1M tokens):**
- Input: $0.60
- Output: $2.50
- Model identifier in OpenClaw: `moonshot/kimi-k2.5`

**What to add:**
1. Add pricing entry for `moonshot/kimi-k2.5`
2. Add alias resolution (e.g., `kimi` → `moonshot/kimi-k2.5`)
3. Consider adding other Moonshot models if they exist

### Issue 3: Token Estimation is Inaccurate
**Problem:** Current estimation is `text.length / 4` which is very rough.

**Current code (tracker.js):**
```javascript
estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
```

**What to investigate:**
1. Can we get actual token counts from OpenClaw responses?
2. If not, can we use a better estimation library (e.g., `tiktoken` for OpenAI models, or similar for others)?
3. For now, keep the estimation but document the limitation clearly

### Issue 4: Reports May Not Reflect Real Usage
**Problem:** Since tracking is manual, reports only show what was explicitly logged.

**What to verify:**
1. Check if any real (non-test) data exists in the logs
2. If the system is only capturing test data, the reports are useless
3. Determine if automatic tracking is feasible or if we need to document manual integration requirements

## Implementation Tasks

### Phase 1: Add Kimi 2.5 Support (Quick Win)

**Files to modify:**
1. `pricing.js` - Add Moonshot pricing

**Changes needed:**
```javascript
// Add to PRICING object:
'moonshot/kimi-k2.5': { input: 0.60, output: 2.50 },
'moonshot/kimi-k1.5': { input: 0.50, output: 2.00 }, // if exists

// Add to getModelAlias:
if (model.includes('kimi')) return 'kimi';

// Add alias:
'kimi': { input: 0.60, output: 2.50 }
```

**Verification:**
```bash
cd /home/prad/.openclaw/workspace/model-tracker
node -e "const p = require('./pricing.js'); console.log(p.calculateCost('moonshot/kimi-k2.5', 1000, 500));"
# Should output: 0.00185 (input: 0.0006 + output: 0.00125)
```

### Phase 2: Investigate Automatic Tracking Options

**Investigation tasks:**

1. **Check OpenClaw for usage data:**
   ```bash
   # Look for any log files
   find ~/.openclaw -name "*.json" -o -name "*.jsonl" -o -name "*log*" 2>/dev/null | head -20
   
   # Check OpenClaw config for any tracking options
   openclaw config get --json 2>/dev/null | grep -i track
   
   # Check if OpenClaw has any status/usage commands
   openclaw status --help 2>/dev/null
   openclaw sessions list 2>/dev/null
   ```

2. **Check if OpenClaw emits events or has middleware hooks:**
   - Look for any event emitter patterns in OpenClaw source
   - Check if there's a plugin/extension system
   - Look for environment variables that might enable logging

3. **Evaluate proxy approach:**
   - The INTEGRATION.md mentions a proxy server approach
   - This would require changing OpenClaw's baseUrl config
   - May be complex to implement correctly

**Decision point:**
- If OpenClaw has built-in usage data → Parse that
- If OpenClaw has hooks/events → Use those
- If neither → Document that manual logging is required, improve the manual API

### Phase 3: Improve Manual Logging API (If Auto-Tracking Not Feasible)

If automatic tracking isn't possible, enhance the manual API:

1. **Add a wrapper function that's easier to use:**
   ```javascript
   // New function in tracker.js
   async function trackModelCall(model, prompt, response, sessionId, taskType) {
     const inputTokens = estimateTokens(prompt);
     const outputTokens = estimateTokens(response);
     return logCall(model, inputTokens, outputTokens, prompt, response, sessionId, taskType);
   }
   ```

2. **Add better documentation for integration:**
   - Create example integration code for common use cases
   - Show how to wrap OpenClaw calls

### Phase 4: Testing and Validation

**Test plan:**

1. **Test Kimi pricing:**
   ```bash
   node test.js  # Run existing tests
   node -e "const t = require('./tracker.js'); t.logCall('moonshot/kimi-k2.5', 1000, 500, 'test', 'response', 'test-session', 'coding');"
   node tracker.js stats 1
   ```

2. **Verify log format:**
   - Check that new entries have correct provider (`moonshot`)
   - Check that cost calculation is correct

3. **Generate reports:**
   ```bash
   node tracker.js report daily
   node tracker.js report weekly
   cat reports/daily-*.txt  # Verify human-readable output
   ```

4. **Check for real data:**
   ```bash
   ls -la logs/
   wc -l logs/*.jsonl
   # If only test data exists, document that manual integration is needed
   ```

## Expected Output

### Deliverables

1. **Updated pricing.js** with Kimi 2.5 support
2. **Investigation report** on automatic tracking feasibility
3. **Updated documentation** (README or INTEGRATION.md) explaining:
   - How to use the tracker (manual vs automatic)
   - Current limitations
   - How to integrate with OpenClaw
4. **Working test suite** that validates Kimi pricing

### Success Criteria

- [ ] `node -e "require('./pricing.js').calculateCost('moonshot/kimi-k2.5', 1000, 500)"` returns correct value
- [ ] Test suite passes: `node test.js`
- [ ] Reports generate correctly with Kimi data
- [ ] Documentation explains how to actually use the tracker in production
- [ ] Clear determination on whether automatic tracking is possible

## Important Notes

1. **Do NOT make changes to OpenClaw itself** — work within the model-tracker directory only
2. **Preserve existing functionality** — don't break Anthropic/Google/DeepSeek tracking
3. **Document limitations** — if automatic tracking isn't possible, be clear about it
4. **Check for real usage data** — the current logs only have test data from March 8

## Verification Commands

Run these to verify the implementation:

```bash
cd /home/prad/.openclaw/workspace/model-tracker

# 1. Test pricing
node -e "const p = require('./pricing.js'); console.log('Kimi cost:', p.calculateCost('moonshot/kimi-k2.5', 1000, 500));"

# 2. Test logging
node -e "const t = require('./tracker.js'); const e = t.logCall('moonshot/kimi-k2.5', 1000, 500, 'test prompt', 'test response', 'test', 'coding'); console.log('Logged:', e);"

# 3. Check logs
tail -1 logs/usage-all.jsonl | python3 -m json.tool

# 4. Generate report
node tracker.js report daily

# 5. Run full test suite
node test.js

# 6. Check for any real (non-test) data
grep -v '"test":true' logs/*.jsonl | head -5
# If this returns nothing, there's no real usage data being captured
```

## Summary for Prad

After investigation, provide a clear summary:

1. **What was fixed:** Kimi 2.5 pricing added, any bugs fixed
2. **What's possible:** Whether automatic OpenClaw tracking is feasible
3. **What's required:** If manual integration is needed, provide exact code snippets
4. **Current state:** Whether the tracker is actually capturing real usage or just test data
