/**
 * Model Tracker Dashboard Server
 * Lightweight Express API + static dashboard server
 * Port: 8081
 */

const express = require('express');
const path = require('path');
const logger = require('./logger.js');
const { calculateCost, PRICING } = require('./pricing.js');

const app = express();
const PORT = 8081;

// Serve dashboard static files
app.use(express.static(path.join(__dirname, 'dashboard')));

// ── Helpers ──────────────────────────────────────────────────────────────────

function getEntries(days) {
    return logger.getRecentEntries(days, 100000);
}

function sumCost(entries) {
    return entries.reduce((s, e) => s + (e.estimated_cost_usd || 0), 0);
}

function sumTokens(entries) {
    return entries.reduce((s, e) => s + (e.total_tokens || 0), 0);
}

// ── API Routes ────────────────────────────────────────────────────────────────

// GET /api/summary — headline numbers for today / 7d / 30d
app.get('/api/summary', (req, res) => {
    const today   = getEntries(1);
    const week    = getEntries(7);
    const month   = getEntries(30);

    // Monthly projection
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthCost = sumCost(month);
    const projected = dayOfMonth > 0 ? (monthCost / dayOfMonth) * daysInMonth : 0;

    res.json({
        today: {
            calls: today.length,
            cost: sumCost(today),
            tokens: sumTokens(today)
        },
        week: {
            calls: week.length,
            cost: sumCost(week),
            tokens: sumTokens(week)
        },
        month: {
            calls: month.length,
            cost: monthCost,
            tokens: sumTokens(month),
            projected,
            day_of_month: dayOfMonth,
            days_in_month: daysInMonth
        }
    });
});

// GET /api/daily?days=30 — cost/calls/tokens per day
app.get('/api/daily', (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const trends = logger.getDailyTrends(days);
    res.json(trends);
});

// GET /api/models?days=30 — breakdown by model
app.get('/api/models', (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const entries = getEntries(days);
    const breakdown = logger.getBreakdownByModel(entries);
    res.json(breakdown);
});

// GET /api/recent?limit=50 — most recent log entries
app.get('/api/recent', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const entries = getEntries(30).slice(0, limit);
    res.json(entries);
});

// GET /api/pricing — current model pricing table
app.get('/api/pricing', (req, res) => {
    // Filter out aliases, return only full model names
    const pricing = Object.entries(PRICING)
        .filter(([k]) => k.includes('/'))
        .map(([model, prices]) => ({ model, ...prices }));
    res.json(pricing);
});

// GET /api/hourly?days=1 — calls by hour for today
app.get('/api/hourly', (req, res) => {
    const days = parseInt(req.query.days) || 1;
    const entries = getEntries(days);
    const hours = {};

    // Init all 24 hours
    for (let h = 0; h < 24; h++) {
        hours[h] = { hour: h, calls: 0, cost: 0, tokens: 0 };
    }

    entries.forEach(e => {
        const h = new Date(e.timestamp).getHours();
        if (hours[h]) {
            hours[h].calls++;
            hours[h].cost += e.estimated_cost_usd || 0;
            hours[h].tokens += e.total_tokens || 0;
        }
    });

    res.json(Object.values(hours));
});

// Fallback: serve dashboard for all non-API routes
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
    console.log(`\n🚀 Model Tracker Dashboard running at http://localhost:${PORT}`);
    console.log(`   Press Ctrl+C to stop\n`);
});
