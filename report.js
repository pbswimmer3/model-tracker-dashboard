const logger = require('./logger.js');
const fs = require('fs');
const path = require('path');

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  }).format(amount);
}

function formatNumber(num) {
  return new Intl.NumberFormat('en-US').format(num);
}

function generateDailyReport() {
  const entries = logger.getRecentEntries(1, 10000);
  const stats = logger.getStats(entries);
  const modelBreakdown = logger.getBreakdownByModel(entries);
  const taskBreakdown = logger.getBreakdownByTaskType(entries);
  
  const date = new Date().toISOString().split('T')[0];
  const report = {
    report_date: date,
    period: 'daily',
    stats,
    model_breakdown: modelBreakdown,
    task_breakdown: taskBreakdown,
    total_entries: entries.length
  };
  
  // Save report
  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const reportPath = path.join(reportsDir, `daily-${date}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  
  // Generate human-readable summary
  const summary = generateHumanReadableSummary(report, 'Daily');
  const summaryPath = path.join(reportsDir, `daily-${date}.txt`);
  fs.writeFileSync(summaryPath, summary, 'utf8');
  
  return { report, summary };
}

function generateWeeklyReport() {
  const entries = logger.getRecentEntries(7, 50000);
  const stats = logger.getStats(entries);
  const modelBreakdown = logger.getBreakdownByModel(entries);
  const taskBreakdown = logger.getBreakdownByTaskType(entries);
  const dailyTrends = logger.getDailyTrends(7);
  
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6);
  const startDateStr = startDate.toISOString().split('T')[0];
  
  const report = {
    report_date: endDate,
    period: 'weekly',
    date_range: `${startDateStr} to ${endDate}`,
    stats,
    model_breakdown: modelBreakdown,
    task_breakdown: taskBreakdown,
    daily_trends: dailyTrends,
    total_entries: entries.length
  };
  
  // Save report
  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const reportPath = path.join(reportsDir, `weekly-${endDate}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  
  // Generate human-readable summary
  const summary = generateHumanReadableSummary(report, 'Weekly');
  const summaryPath = path.join(reportsDir, `weekly-${endDate}.txt`);
  fs.writeFileSync(summaryPath, summary, 'utf8');
  
  return { report, summary };
}

function generateMonthlyReport() {
  const entries = logger.getRecentEntries(30, 200000);
  const stats = logger.getStats(entries);
  const modelBreakdown = logger.getBreakdownByModel(entries);
  const taskBreakdown = logger.getBreakdownByTaskType(entries);
  const dailyTrends = logger.getDailyTrends(30);
  
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 29);
  const startDateStr = startDate.toISOString().split('T')[0];
  
  const report = {
    report_date: endDate,
    period: 'monthly',
    date_range: `${startDateStr} to ${endDate}`,
    stats,
    model_breakdown: modelBreakdown,
    task_breakdown: taskBreakdown,
    daily_trends: dailyTrends,
    total_entries: entries.length
  };
  
  // Save report
  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const reportPath = path.join(reportsDir, `monthly-${endDate}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  
  // Generate human-readable summary
  const summary = generateHumanReadableSummary(report, 'Monthly');
  const summaryPath = path.join(reportsDir, `monthly-${endDate}.txt`);
  fs.writeFileSync(summaryPath, summary, 'utf8');
  
  return { report, summary };
}

function generateHumanReadableSummary(report, period) {
  const { stats, model_breakdown, task_breakdown, date_range } = report;
  
  let summary = `╔══════════════════════════════════════════════════════════════╗\n`;
  summary += `║ ${period} AI Model Usage Report ${date_range ? `(${date_range})` : ''} ║\n`;
  summary += `╚══════════════════════════════════════════════════════════════╝\n\n`;
  
  summary += `📊 OVERALL STATISTICS\n`;
  summary += `────────────────────────────────────────────────────────────\n`;
  summary += `Total API Calls: ${formatNumber(stats.total_calls)}\n`;
  summary += `Total Tokens: ${formatNumber(stats.total_tokens)}\n`;
  summary += `Total Cost: ${formatCurrency(stats.total_cost)}\n`;
  summary += `Avg Cost/Call: ${formatCurrency(stats.avg_cost_per_call)}\n`;
  summary += `Avg Tokens/Call: ${formatNumber(stats.avg_tokens_per_call)}\n\n`;
  
  summary += `🤖 MODEL BREAKDOWN\n`;
  summary += `────────────────────────────────────────────────────────────\n`;
  model_breakdown.forEach((item, index) => {
    const percentage = ((item.cost / stats.total_cost) * 100).toFixed(1);
    summary += `${index + 1}. ${item.model.padEnd(12)}: ${formatCurrency(item.cost)} (${percentage}%)\n`;
    summary += `    Calls: ${formatNumber(item.calls)}, Tokens: ${formatNumber(item.tokens)}\n`;
  });
  summary += `\n`;
  
  summary += `📝 TASK TYPE BREAKDOWN\n`;
  summary += `────────────────────────────────────────────────────────────\n`;
  task_breakdown.forEach((item, index) => {
    const percentage = ((item.cost / stats.total_cost) * 100).toFixed(1);
    summary += `${index + 1}. ${item.task_type.padEnd(15)}: ${formatCurrency(item.cost)} (${percentage}%)\n`;
    summary += `    Calls: ${formatNumber(item.calls)}\n`;
  });
  summary += `\n`;
  
  if (report.daily_trends) {
    summary += `📈 DAILY TRENDS\n`;
    summary += `────────────────────────────────────────────────────────────\n`;
    report.daily_trends.forEach(day => {
      if (day.calls > 0) {
        summary += `${day.date}: ${formatNumber(day.calls)} calls, ${formatNumber(day.tokens)} tokens, ${formatCurrency(day.cost)}\n`;
      }
    });
  }
  
  summary += `\n`;
  summary += `Generated: ${new Date().toISOString()}\n`;
  
  return summary;
}

function printReportToConsole(reportType = 'daily') {
  let result;
  
  switch (reportType.toLowerCase()) {
    case 'weekly':
      result = generateWeeklyReport();
      break;
    case 'monthly':
      result = generateMonthlyReport();
      break;
    default:
      result = generateDailyReport();
  }
  
  console.log(result.summary);
  return result;
}

// CLI support
if (require.main === module) {
  const args = process.argv.slice(2);
  const reportType = args[0] || 'daily';
  
  try {
    printReportToConsole(reportType);
    console.log(`\n✅ ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report generated successfully.`);
  } catch (error) {
    console.error(`❌ Error generating report: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyReport,
  printReportToConsole
};