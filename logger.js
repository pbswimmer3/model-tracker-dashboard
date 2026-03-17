const fs = require('fs');
const path = require('path');
const { getTaskType, calculateCost, getModelAlias } = require('./pricing.js');

const LOGS_DIR = path.join(__dirname, 'logs');
const DAILY_LOG_PATTERN = 'usage-YYYY-MM-DD.jsonl';

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function getDailyLogPath(date = new Date()) {
  const dateStr = date.toISOString().split('T')[0];
  return path.join(LOGS_DIR, `usage-${dateStr}.jsonl`);
}

function logUsage(entry) {
  const {
    model,
    input_tokens = 0,
    output_tokens = 0,
    task_type,
    session_id = 'unknown',
    prompt = '',
    response = '',
    metadata = {}
  } = entry;
  
  const timestamp = new Date().toISOString();
  const modelAlias = getModelAlias(model);
  const calculatedTaskType = task_type || getTaskType(prompt);
  const estimated_cost = calculateCost(model, input_tokens, output_tokens);
  
  const logEntry = {
    timestamp,
    provider: model.split('/')[0] || 'unknown',
    model: modelAlias,
    full_model: model,
    input_tokens,
    output_tokens,
    total_tokens: input_tokens + output_tokens,
    task_type: calculatedTaskType,
    session_id,
    estimated_cost_usd: estimated_cost,
    prompt_length: prompt.length,
    response_length: response.length,
    metadata
  };
  
  const logPath = getDailyLogPath();
  const logLine = JSON.stringify(logEntry) + '\n';
  
  // Append to daily log file
  fs.appendFileSync(logPath, logLine, 'utf8');
  
  // Also append to master log
  const masterLogPath = path.join(LOGS_DIR, 'usage-all.jsonl');
  fs.appendFileSync(masterLogPath, logLine, 'utf8');
  
  return logEntry;
}

function getLogFiles(days = 30) {
  const files = [];
  const now = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const logPath = getDailyLogPath(date);
    
    if (fs.existsSync(logPath)) {
      files.push({
        path: logPath,
        date: date.toISOString().split('T')[0],
        size: fs.statSync(logPath).size
      });
    }
  }
  
  return files;
}

function readLogEntries(filePath, limit = 10000) {
  if (!fs.existsSync(filePath)) return [];
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');
  
  return lines.slice(-limit).map(line => {
    try {
      return JSON.parse(line);
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
}

function getRecentEntries(days = 7, limit = 10000) {
  // Read from the master log (usage-all.jsonl) — it always has the full history
  // and won't be missing entries due to daily file cleanup or deletion.
  const masterLog = path.join(LOGS_DIR, 'usage-all.jsonl');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  const entries = readLogEntries(masterLog, limit * 5)
    .filter(e => e && new Date(e.timestamp) >= cutoff);

  // Deduplicate by a composite key in case the same entry was written twice
  const seen = new Set();
  const deduped = [];
  for (const e of entries) {
    const key = `${e.timestamp}|${e.full_model}|${e.input_tokens}|${e.output_tokens}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(e);
    }
  }

  deduped.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return deduped.slice(0, limit);
}

function getStats(entries) {
  if (entries.length === 0) {
    return {
      total_calls: 0,
      total_tokens: 0,
      total_cost: 0,
      avg_cost_per_call: 0,
      avg_tokens_per_call: 0
    };
  }
  
  const totalCalls = entries.length;
  const totalTokens = entries.reduce((sum, e) => sum + e.total_tokens, 0);
  const totalCost = entries.reduce((sum, e) => sum + e.estimated_cost_usd, 0);
  
  return {
    total_calls: totalCalls,
    total_tokens: totalTokens,
    total_cost: parseFloat(totalCost.toFixed(4)),
    avg_cost_per_call: parseFloat((totalCost / totalCalls).toFixed(6)),
    avg_tokens_per_call: Math.round(totalTokens / totalCalls)
  };
}

function getBreakdownByModel(entries) {
  const breakdown = {};
  
  entries.forEach(entry => {
    const model = entry.model;
    if (!breakdown[model]) {
      breakdown[model] = {
        calls: 0,
        tokens: 0,
        cost: 0,
        input_tokens: 0,
        output_tokens: 0
      };
    }
    
    breakdown[model].calls += 1;
    breakdown[model].tokens += entry.total_tokens;
    breakdown[model].cost += entry.estimated_cost_usd;
    breakdown[model].input_tokens += entry.input_tokens;
    breakdown[model].output_tokens += entry.output_tokens;
  });
  
  // Convert to array and sort by cost descending
  return Object.entries(breakdown)
    .map(([model, stats]) => ({
      model,
      ...stats,
      cost: parseFloat(stats.cost.toFixed(4)),
      avg_cost_per_call: parseFloat((stats.cost / stats.calls).toFixed(6))
    }))
    .sort((a, b) => b.cost - a.cost);
}

function getBreakdownByTaskType(entries) {
  const breakdown = {};
  
  entries.forEach(entry => {
    const taskType = entry.task_type;
    if (!breakdown[taskType]) {
      breakdown[taskType] = {
        calls: 0,
        tokens: 0,
        cost: 0
      };
    }
    
    breakdown[taskType].calls += 1;
    breakdown[taskType].tokens += entry.total_tokens;
    breakdown[taskType].cost += entry.estimated_cost_usd;
  });
  
  // Convert to array and sort by cost descending
  return Object.entries(breakdown)
    .map(([taskType, stats]) => ({
      task_type: taskType,
      ...stats,
      cost: parseFloat(stats.cost.toFixed(4))
    }))
    .sort((a, b) => b.cost - a.cost);
}

function getDailyTrends(days = 30) {
  const dailyData = {};
  const now = new Date();
  
  // Initialize last N days
  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyData[dateStr] = {
      date: dateStr,
      calls: 0,
      tokens: 0,
      cost: 0
    };
  }
  
  // Get entries for the period
  const entries = getRecentEntries(days, 100000);
  
  // Aggregate by date
  entries.forEach(entry => {
    const dateStr = entry.timestamp.split('T')[0];
    if (dailyData[dateStr]) {
      dailyData[dateStr].calls += 1;
      dailyData[dateStr].tokens += entry.total_tokens;
      dailyData[dateStr].cost += entry.estimated_cost_usd;
    }
  });
  
  // Convert to array and sort by date ascending
  return Object.values(dailyData)
    .map(day => ({
      ...day,
      cost: parseFloat(day.cost.toFixed(4))
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = {
  logUsage,
  getRecentEntries,
  getStats,
  getBreakdownByModel,
  getBreakdownByTaskType,
  getDailyTrends,
  getLogFiles
};