// Parses OpenClaw session JSONL files and imports real usage data into model-tracker logs.
//
// OpenClaw writes each conversation turn to ~/.openclaw/agents/main/sessions/<uuid>.jsonl
// Each file is a sequence of newline-delimited JSON objects. The ones we care about have:
//   { type: "message", message: { role: "assistant", provider, model, usage: { input, output, ... } } }
//
// To avoid double-importing, we maintain a state file at logs/.session-import-state.json
// that records the set of OpenClaw message IDs we've already processed.

const fs = require('fs');
const path = require('path');
const logger = require('./logger.js');

const SESSIONS_DIR = path.join(process.env.HOME, '.openclaw', 'agents', 'main', 'sessions');
const STATE_FILE = path.join(__dirname, 'logs', '.session-import-state.json');

function loadImportedIds() {
  if (!fs.existsSync(STATE_FILE)) return new Set();
  try {
    const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return new Set(data.imported_ids || []);
  } catch {
    return new Set();
  }
}

function saveImportedIds(importedIds) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ imported_ids: [...importedIds] }, null, 2), 'utf8');
}

function parseSessionFile(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  const entries = [];
  let sessionId = path.basename(filePath, '.jsonl');

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {
      // skip malformed lines
    }
  }

  // Extract session ID from the session header entry if present
  const header = entries.find(e => e.type === 'session');
  if (header && header.id) sessionId = header.id;

  return { sessionId, entries };
}

function extractUsageEntries(sessionId, entries) {
  const usable = [];

  for (const entry of entries) {
    if (entry.type !== 'message') continue;
    const msg = entry.message;
    if (!msg || msg.role !== 'assistant') continue;

    const usage = msg.usage;
    if (!usage) continue;

    const hasTokens = (usage.input || 0) > 0 || (usage.output || 0) > 0;
    const hasContent = Array.isArray(msg.content) && msg.content.length > 0;
    const hasError = !!msg.errorMessage;

    // Skip zero-token entries that are clearly errors (have errorMessage)
    if (!hasTokens && hasError) continue;

    // Skip zero-token entries with no content (blank retries, empty responses)
    if (!hasTokens && !hasContent) continue;

    // For zero-token entries with real content (e.g. Moonshot doesn't return usage
    // for tool-call responses), estimate tokens from the content text
    let inputTokens = usage.input || 0;
    let outputTokens = usage.output || 0;
    let tokenSource = 'exact';
    if (!hasTokens && hasContent) {
      const contentText = msg.content.map(c => {
        if (c.type === 'text') return c.text || '';
        if (c.type === 'toolCall') return JSON.stringify(c.arguments || '');
        return '';
      }).join(' ');
      outputTokens = Math.ceil(contentText.length / 4);
      tokenSource = 'estimated';
    }

    usable.push({
      openclaw_id: entry.id,
      timestamp: entry.timestamp,
      provider: msg.provider || 'unknown',
      model: `${msg.provider}/${msg.model}`,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_read_tokens: usage.cacheRead || 0,
      cache_write_tokens: usage.cacheWrite || 0,
      total_tokens: inputTokens + outputTokens,
      cost_usd: (usage.cost && usage.cost.total) ? usage.cost.total : null,
      token_source: tokenSource,
      session_id: sessionId
    });
  }

  return usable;
}

function syncSessions(options = {}) {
  const { verbose = false, dryRun = false } = options;

  if (!fs.existsSync(SESSIONS_DIR)) {
    return { error: `Sessions directory not found: ${SESSIONS_DIR}`, imported: 0, skipped: 0 };
  }

  const importedIds = loadImportedIds();
  const sessionFiles = fs.readdirSync(SESSIONS_DIR)
    .filter(f => f.endsWith('.jsonl') && f !== 'sessions.json')
    .map(f => path.join(SESSIONS_DIR, f));

  let imported = 0;
  let skipped = 0;
  const newIds = new Set(importedIds);

  for (const filePath of sessionFiles) {
    let parsed;
    try {
      parsed = parseSessionFile(filePath);
    } catch (e) {
      if (verbose) console.error(`  Skipping ${filePath}: ${e.message}`);
      continue;
    }

    const { sessionId, entries } = parsed;
    const usageEntries = extractUsageEntries(sessionId, entries);

    for (const u of usageEntries) {
      if (importedIds.has(u.openclaw_id)) {
        skipped++;
        continue;
      }

      if (!dryRun) {
        // Write using logger with the original timestamp
        const entryDate = new Date(u.timestamp);
        const logEntry = {
          timestamp: u.timestamp,
          provider: u.provider,
          model: require('./pricing.js').getModelAlias(u.model),
          full_model: u.model,
          input_tokens: u.input_tokens,
          output_tokens: u.output_tokens,
          total_tokens: u.total_tokens,
          task_type: 'openclaw',
          session_id: u.session_id,
          // Use exact cost from OpenClaw if available, else calculate
          estimated_cost_usd: u.cost_usd !== null ? u.cost_usd : require('./pricing.js').calculateCost(u.model, u.input_tokens, u.output_tokens),
          prompt_length: 0,
          response_length: 0,
          metadata: {
            source: 'openclaw-session',
            openclaw_id: u.openclaw_id,
            cache_read_tokens: u.cache_read_tokens,
            cache_write_tokens: u.cache_write_tokens,
            token_source: u.token_source
          }
        };

        // Write to date-specific log file
        const logsDir = path.join(__dirname, 'logs');
        const dateStr = entryDate.toISOString().split('T')[0];
        const dailyPath = path.join(logsDir, `usage-${dateStr}.jsonl`);
        const masterPath = path.join(logsDir, 'usage-all.jsonl');
        const line = JSON.stringify(logEntry) + '\n';

        fs.appendFileSync(dailyPath, line, 'utf8');
        fs.appendFileSync(masterPath, line, 'utf8');
      }

      newIds.add(u.openclaw_id);
      imported++;

      if (verbose) {
        console.log(`  + ${u.timestamp.split('T')[0]} ${u.model} in=${u.input_tokens} out=${u.output_tokens} cost=$${(u.cost_usd || 0).toFixed(6)}`);
      }
    }
  }

  if (!dryRun) {
    saveImportedIds(newIds);
  }

  return { imported, skipped, total_sessions: sessionFiles.length };
}

module.exports = { syncSessions };

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const dryRun = args.includes('--dry-run');

  console.log(`Syncing OpenClaw sessions from: ${SESSIONS_DIR}`);
  if (dryRun) console.log('(dry run — nothing will be written)');

  const result = syncSessions({ verbose, dryRun });

  if (result.error) {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }

  console.log(`Done: imported ${result.imported} new entries, skipped ${result.skipped} already-imported (${result.total_sessions} session files scanned)`);
}
