# Docs System Migration — Change Log

## Overview
Migration from database-backed documentation system to file-system-based read-only browser.

## Date
February 2026

## Changes Summary

### What Changed
- **Replaced** database-backed CRUD docs library with file-system-based read-only browser.
- **Created** `docs/` directory structure with 18 numbered category folders.
- **Built** route scanner utility (`server/src/utils/routeScanner.ts`) for auto-generating API reference docs.
- **Built** new docs router (`server/src/routes/admin/docs.router.ts`) with 4 endpoints.
- **Built** Doc Browser page (`/admin/docs`) with sidebar navigation, search, and custom MarkdownRenderer.
- **Built** Coverage Dashboard page (`/admin/docs-coverage`) with progress bars and detail grids.
- **Commented out** old database-backed docs endpoints in `server/routes.ts`.

### Why
- Plain `.md` files are version-controlled, easier to maintain, and don't require database migrations.
- Auto-sync from route files eliminates manual API documentation maintenance.
- Coverage tracking provides visibility into documentation completeness.

## Docs Change Log Summary
- Docs created: 5
- Docs updated: 0
- Categories touched: Features (03), API (04), Frontend (05), Backend (06), Changelog (16)
- Key endpoints documented: `GET /api/admin/docs`, `GET /api/admin/docs/:docPath`, `POST /api/admin/docs/sync`, `GET /api/admin/docs/coverage`
- Key tables documented: None (file-system based, no database changes)

## New Files
| File | Purpose |
|------|---------|
| `server/src/utils/routeScanner.ts` | Route scanning and markdown generation utility |
| `server/src/routes/admin/docs.router.ts` | Docs API router (list, read, sync, coverage) |
| `client/src/pages/admin-docs.tsx` | Doc Browser UI |
| `client/src/pages/admin-docs-coverage.tsx` | Coverage Dashboard UI |
| `docs/03-FEATURES/DOCS_GOVERNANCE_SYSTEM.md` | Feature documentation |
| `docs/04-API/DOCS_API_ENDPOINTS.md` | API endpoint documentation |
| `docs/05-FRONTEND/DOC_BROWSER_UI.md` | Frontend UI documentation |
| `docs/06-BACKEND/ROUTE_SCANNER.md` | Backend utility documentation |
| `docs/16-CHANGELOG/DOCS_SYSTEM_MIGRATION.md` | This changelog entry |

## Related Docs
- Docs Governance System (`docs/03-FEATURES/DOCS_GOVERNANCE_SYSTEM.md`)
- Docs API Endpoints (`docs/04-API/DOCS_API_ENDPOINTS.md`)
- Route Scanner (`docs/06-BACKEND/ROUTE_SCANNER.md`)
- Doc Browser UI (`docs/05-FRONTEND/DOC_BROWSER_UI.md`)
