# Agent Instructions

## Package Manager
Use **npm**: `npm install`, `npm start` (Electron), `npm run web` (standalone web)

## Commit Attribution
AI commits MUST include:
```
Co-Authored-By: (the agent model's name and attribution byline)
```

## File-Scoped Commands
| Task | Command |
|------|---------|
| Lint | `npx eslint path/to/file.js` |
| Format | `npx prettier --write path/to/file.js` |

## Key Conventions
- **API routes**: `src/server/api.js` — Express router, db from `../db/connection`
- **Database**: PostgreSQL — schema in `.cursor/rules/databasetablolari.mdc`
- **Excel path**: `\\10.0.0.2\epc_data\...` (network share, Windows)
- **Web mode**: `server-standalone.js` serves static from `src/`, API at `/api/*`
- **Electron**: `main.js` embeds Express, IPC handlers in main process

## Project Structure
| Path | Purpose |
|------|---------|
| `src/server/api.js` | REST API endpoints |
| `src/pages/*.html` | Frontend pages |
| `src/scripts/web-api.js` | Web fetch client (replaces IPC) |
| `server-standalone.js` | Web server (no Electron) |
