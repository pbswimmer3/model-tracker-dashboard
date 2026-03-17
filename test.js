const tracker = require('./tracker.js');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Model Usage Tracker\n');

// Test 1: Basic logging
console.log('1. Testing basic logging...');
const testEntry = tracker.logCall(
  'anthropic/claude-opus-4-6',
  1250,
  750,
  'Analyze this business strategy and provide recommendations.',
  'Based on the analysis, I recommend focusing on three key areas...',
  'test-session-1',
  'analysis',
  { test: true, source: 'test-script' }
);
console.log(`   ✅ Logged: ${testEntry.model} - $${testEntry.estimated_cost_usd.toFixed(6)}`);

// Test 2: Different models
console.log('\n2. Testing different models...');
const models = [
  ['anthropic/claude-sonnet-4-6', 800, 400, 'coding'],
  ['google/gemini-2.5-flash', 500, 200, 'search'],
  ['deepseek/deepseek-chat', 1200, 600, 'reasoning'],
  ['anthropic/claude-haiku-4-6', 300, 150, 'conversation']
];

models.forEach(([model, input, output, task], i) => {
  const entry = tracker.logCall(
    model,
    input,
    output,
    `Test prompt ${i}`,
    `Test response ${i}`,
    `test-session-${i}`,
    task,
    { test: true }
  );
  console.log(`   ✅ ${model.split('/').pop()}: $${entry.estimated_cost_usd.toFixed(6)}`);
});

// Test 3: Stats retrieval
console.log('\n3. Testing stats retrieval...');
const stats = tracker.getStats(1);
console.log(`   Total calls: ${stats.total_calls}`);
console.log(`   Total cost: $${stats.total_cost.toFixed(4)}`);
console.log(`   Avg cost/call: $${stats.avg_cost_per_call.toFixed(6)}`);

// Test 4: Report generation
console.log('\n4. Testing report generation...');
try {
  const dailyReport = tracker.generateDailyReport();
  console.log(`   ✅ Daily report generated: ${dailyReport.report.report_date}`);
  
  // Check if report files were created
  const reportsDir = path.join(__dirname, 'reports');
  const dailyFiles = fs.readdirSync(reportsDir).filter(f => f.includes('daily-'));
  console.log(`   Found ${dailyFiles.length} daily report(s)`);
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// Test 5: Monthly projection
console.log('\n5. Testing monthly projection...');
const projection = tracker.getMonthlyProjection();
console.log(`   Current cost: $${projection.current_cost.toFixed(2)}`);
console.log(`   Daily average: $${projection.daily_average.toFixed(2)}`);
console.log(`   Projected monthly: $${projection.projected_monthly.toFixed(2)}`);

// Test 6: File structure
console.log('\n6. Checking file structure...');
const logsDir = path.join(__dirname, 'logs');
const reportsDir = path.join(__dirname, 'reports');

console.log(`   Logs directory: ${logsDir} (exists: ${fs.existsSync(logsDir)})`);
console.log(`   Reports directory: ${reportsDir} (exists: ${fs.existsSync(reportsDir)})`);

if (fs.existsSync(logsDir)) {
  const logFiles = fs.readdirSync(logsDir);
  console.log(`   Log files: ${logFiles.length} files`);
  logFiles.forEach(file => {
    const stats = fs.statSync(path.join(logsDir, file));
    console.log(`     - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
  });
}

// Test 7: Token estimation
console.log('\n7. Testing token estimation...');
const testText = 'This is a test sentence to estimate tokens.';
const estimatedTokens = tracker.estimateTokens(testText);
console.log(`   Text: "${testText}"`);
console.log(`   Length: ${testText.length} chars`);
console.log(`   Estimated tokens: ${estimatedTokens} (≈${testText.length}/4)`);

// Test 8: Cleanup simulation
console.log('\n8. Testing cleanup (simulation)...');
const cleanupResult = tracker.cleanupOldLogs(1); // Keep only today's logs
console.log(`   Cleanup result: ${cleanupResult.deleted} deleted, ${cleanupResult.kept} kept`);

console.log('\n' + '='.repeat(50));
console.log('✅ All tests completed successfully!');
console.log('='.repeat(50));

console.log('\n📋 Next steps:');
console.log('1. Run reports: node tracker.js report weekly');
console.log('2. View stats: node tracker.js stats 7');
console.log('3. Set up cron jobs for automated reporting');
console.log('4. Integrate with your AI workflows for automatic logging');