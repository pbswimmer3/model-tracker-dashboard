# OpenClaw Integration Guide

Since OpenClaw doesn't expose direct hooks for model call interception, here are integration strategies:

## Strategy 1: Manual Logging (Recommended)

Wrap your model calls with logging:

```javascript
const tracker = require('./model-tracker/tracker.js');

// After each model interaction, log it
async function callModelWithLogging(model, prompt, sessionId, taskType) {
  // Your model call logic here...
  const response = await makeModelCall(model, prompt);
  
  // Estimate tokens (or get actual counts if available)
  const inputTokens = Math.ceil(prompt.length / 4);
  const outputTokens = Math.ceil(response.length / 4);
  
  // Log the call
  tracker.logCall(
    model,
    inputTokens,
    outputTokens,
    prompt.substring(0, 500), // Truncate
    response.substring(0, 500),
    sessionId,
    taskType,
    { source: 'openclaw' }
  );
  
  return response;
}
```

## Strategy 2: Session Log Parsing

Parse OpenClaw session logs to extract model usage:

```bash
# Example: Parse recent session logs
find ~/.openclaw/agents -name "*.json" -type f -exec grep -l "model\|tokens" {} \; | head -5
```

## Strategy 3: Proxy/Middleware (Advanced)

Create a simple proxy that intercepts API calls:

```javascript
// proxy-server.js
const express = require('express');
const tracker = require('./tracker.js');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Proxy Anthropic API
app.use('/anthropic', createProxyMiddleware({
  target: 'https://api.anthropic.com',
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    // Log request
    console.log('Anthropic request:', req.path);
  },
  onProxyRes: (proxyRes, req, res) => {
    // Log response
    const body = [];
    proxyRes.on('data', chunk => body.push(chunk));
    proxyRes.on('end', () => {
      const responseBody = Buffer.concat(body).toString();
      // Parse and log usage
      try {
        const data = JSON.parse(responseBody);
        if (data.usage) {
          tracker.logCall(
            `anthropic/${req.headers['anthropic-version'] || 'unknown'}`,
            data.usage.input_tokens,
            data.usage.output_tokens,
            '', // Could extract from request
            '', // Could extract from response
            req.headers['session-id'] || 'unknown',
            'api-call'
          );
        }
      } catch (e) {
        console.error('Error parsing response:', e.message);
      }
    });
  }
}));

app.listen(3000, () => {
  console.log('Proxy server running on port 3000');
});
```

Then configure OpenClaw to use the proxy:
```bash
openclaw config set models.providers.anthropic.baseUrl "http://localhost:3000/anthropic"
```

## Strategy 4: OpenClaw Extension (Ideal)

The best approach would be to create an OpenClaw extension that hooks into the model call pipeline. This would require:

1. Creating an extension in `/app/extensions/model-tracker/`
2. Implementing middleware that intercepts `createChatCompletion` calls
3. Extracting token counts and model information
4. Logging to the tracker

Example extension structure:
```
/app/extensions/model-tracker/
├── index.ts
├── config-schema.ts
├── middleware.ts
└── package.json
```

## Current Implementation Notes

The current tracker provides:

1. **Manual logging API** - Call `tracker.logCall()` after each model interaction
2. **Report generation** - Daily/weekly/monthly reports with breakdowns
3. **Cost projection** - Monthly spending forecasts
4. **JSONL storage** - Audit trail in standard format
5. **Cron integration** - Automated reporting

## Quick Start

1. **Test the tracker:**
   ```bash
   cd /home/node/.openclaw/workspace
   node model-tracker/test.js
   ```

2. **Generate a report:**
   ```bash
   node model-tracker/tracker.js report weekly
   ```

3. **Set up automation:**
   ```bash
   ./model-tracker/setup-cron.sh
   # Follow instructions to install cron jobs
   ```

4. **Integrate with your workflows:**
   - Add `tracker.logCall()` after model interactions
   - Or parse existing logs to populate historical data

## Data Flow

```
Model Call → Estimate Tokens → Log Entry → JSONL File
                                     ↓
                              Daily/Weekly/Monthly Reports
                                     ↓
                              Cost Analysis & Projections
```

## Limitations

1. **Token estimation** - Uses character count approximation (1 token ≈ 4 chars)
2. **No direct interception** - Requires manual logging or proxy setup
3. **Pricing accuracy** - Uses public pricing; actual costs may vary

## Future Improvements

1. **OpenClaw extension** - Direct integration via middleware
2. **Real token counts** - Parse actual usage from API responses
3. **Budget alerts** - Notifications when approaching limits
4. **Visual dashboard** - Web interface for cost monitoring
5. **Multi-user support** - Track costs per user/project