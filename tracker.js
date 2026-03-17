#!/usr/bin/env node

const logger = require('./logger.js');
const report = require('./report.js');
const { syncSessions } = require('./session-parser.js');
const fs = require('fs');
const path = require('path');

// Middleware to intercept model calls
// This would need to be integrated with OpenClaw's actual model call mechanism
// For now, we'll create a wrapper function that can be called manually

class ModelUsageTracker {
  constructor() {
    this.initialized = false;
    this.logsDir = path.join(__dirname, 'logs');
    this.reportsDir = path.join(__dirname, 'reports');
    this.ensureDirectories();
  }
  
  ensureDirectories() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }
  
  // Manual logging function - call this after each model interaction
  logCall(model, inputTokens, outputTokens, prompt = '', response = '', sessionId = 'unknown', taskType = null, metadata = {}) {
    const entry = {
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      task_type: taskType,
      session_id: sessionId,
      prompt: prompt.substring(0, 1000), // Truncate for storage
      response: response.substring(0, 1000),
      metadata
    };
    
    return logger.logUsage(entry);
  }
  
  // Estimate tokens from text (rough approximation)
  estimateTokens(text) {
    // Rough approximation: 1 token ≈ 4 characters for English
    // This is not accurate but works for estimation
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }
  
  // Generate reports
  generateDailyReport() {
    return report.generateDailyReport();
  }
  
  generateWeeklyReport() {
    return report.generateWeeklyReport();
  }
  
  generateMonthlyReport() {
    return report.generateMonthlyReport();
  }
  
  // Get current stats
  getStats(days = 1) {
    const entries = logger.getRecentEntries(days);
    return logger.getStats(entries);
  }
  
  // Get cost projection for the month
  getMonthlyProjection() {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    const stats = this.getStats(dayOfMonth); // Stats for current month so far
    const dailyAvg = stats.total_cost / dayOfMonth;
    const projected = dailyAvg * daysInMonth;
    
    return {
      current_cost: stats.total_cost,
      daily_average: dailyAvg,
      days_elapsed: dayOfMonth,
      days_in_month: daysInMonth,
      projected_monthly: projected,
      remaining_budget: 100 - (stats.total_cost / 100 * 100) // Assuming $100 monthly budget
    };
  }
  
  // Clean up old logs (keep last 90 days)
  cleanupOldLogs(daysToKeep = 90) {
    const files = logger.getLogFiles(365); // Get all files
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);
    
    let deleted = 0;
    files.forEach(file => {
      const fileDate = new Date(file.date);
      if (fileDate < cutoff) {
        fs.unlinkSync(file.path);
        deleted++;
      }
    });
    
    return { deleted, kept: files.length - deleted };
  }
}

// Create singleton instance
const tracker = new ModelUsageTracker();

// Export for use in other modules
module.exports = tracker;

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'stats':
      const days = parseInt(args[1]) || 1;
      const stats = tracker.getStats(days);
      console.log(`📊 Stats for last ${days} day(s):`);
      console.log(`Total Calls: ${stats.total_calls}`);
      console.log(`Total Tokens: ${stats.total_tokens.toLocaleString()}`);
      console.log(`Total Cost: $${stats.total_cost.toFixed(4)}`);
      console.log(`Avg Cost/Call: $${stats.avg_cost_per_call.toFixed(6)}`);
      break;
      
    case 'report':
      const type = args[1] || 'daily';
      report.printReportToConsole(type);
      break;
      
    case 'projection':
      const projection = tracker.getMonthlyProjection();
      console.log(`📈 Monthly Cost Projection:`);
      console.log(`Current (${projection.days_elapsed} days): $${projection.current_cost.toFixed(2)}`);
      console.log(`Daily Average: $${projection.daily_average.toFixed(2)}`);
      console.log(`Projected Monthly: $${projection.projected_monthly.toFixed(2)}`);
      console.log(`Remaining Budget: ${projection.remaining_budget.toFixed(1)}%`);
      break;
      
    case 'cleanup':
      const daysToKeep = parseInt(args[1]) || 90;
      const result = tracker.cleanupOldLogs(daysToKeep);
      console.log(`🧹 Cleanup complete: Deleted ${result.deleted} files, kept ${result.kept}`);
      break;
      
    case 'log':
      // Manual logging: node tracker.js log "model" inputTokens outputTokens "prompt" "response"
      if (args.length >= 4) {
        const model = args[1];
        const inputTokens = parseInt(args[2]);
        const outputTokens = parseInt(args[3]);
        const prompt = args[4] || '';
        const response = args[5] || '';
        
        const entry = tracker.logCall(model, inputTokens, outputTokens, prompt, response);
        console.log(`✅ Logged: ${entry.model} - $${entry.estimated_cost_usd.toFixed(6)}`);
      } else {
        console.log('Usage: node tracker.js log <model> <inputTokens> <outputTokens> [prompt] [response]');
      }
      break;
      
    case 'sync':
      const syncVerbose = args.includes('--verbose') || args.includes('-v');
      const syncDryRun = args.includes('--dry-run');
      console.log('Syncing from OpenClaw session logs...');
      const syncResult = syncSessions({ verbose: syncVerbose, dryRun: syncDryRun });
      if (syncResult.error) {
        console.error(`Error: ${syncResult.error}`);
      } else {
        console.log(`Imported ${syncResult.imported} new entries, skipped ${syncResult.skipped} already-imported (${syncResult.total_sessions} sessions scanned)`);
      }
      break;

    default:
      console.log(`Model Usage Tracker CLI`);
      console.log(`Usage:`);
      console.log(`  node tracker.js stats [days]          - Show usage statistics`);
      console.log(`  node tracker.js report [daily|weekly|monthly] - Generate report`);
      console.log(`  node tracker.js projection            - Monthly cost projection`);
      console.log(`  node tracker.js cleanup [days]        - Clean up old logs`);
      console.log(`  node tracker.js log <args...>         - Manual log entry`);
      console.log(`  node tracker.js sync [-v] [--dry-run] - Import from OpenClaw sessions`);
      console.log(`\nExample:`);
      console.log(`  node tracker.js sync --verbose`);
      console.log(`  node tracker.js report weekly`);
      console.log(`  node tracker.js stats 7`);
  }
}