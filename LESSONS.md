# LESSONS.md — Model Tracker Dashboard

## Format: `[DATE] - [Category] - [Lesson]`

## Active Lessons

### 2026-03-17 - Architecture - Serve from project root, not subdirectory
**From:** Iran dashboard build
**Mistake:** Serving from `dashboard/` subdir causes `../data/` fetch paths to 404.
**Prevention:** Always run server from project root. Use relative paths like `data/file.json` not `../data/file.json`.

### 2026-03-17 - Implementation - mkdir brace expansion unreliable in exec
**Mistake:** `mkdir -p /path/{a,b,c}` creates a literal `{a,b,c}` dir in some shells.
**Prevention:** Use separate `mkdir -p` calls per directory.

### 2026-03-17 - Implementation - Python relative paths use cwd not script dir
**Mistake:** `open('../data/file')` resolves from wherever you ran the script, not where the script lives.
**Prevention:** Always anchor with `os.path.dirname(os.path.abspath(__file__))`.

### 2026-03-17 - Architecture - Vercel Root Directory must contain all fetched assets
**From:** Iran dashboard
**Prevention:** When deploying subdirectory to Vercel, all data files must live inside that subdirectory.

## Categories
- `Architecture` - Design, structure, deployment
- `Implementation` - Bugs, coding mistakes
- `Data` - Data quality, sources
- `Project Management` - Planning, scope

### 2026-03-17 - Implementation - Express v5 wildcard route syntax changed
**Mistake:** `app.get('*', ...)` throws `PathError` in Express v5 (installed via npm).
**Prevention:** Use `app.get('/{*path}', ...)` for Express v5+ catch-all routes.

## Archive
*None yet*
