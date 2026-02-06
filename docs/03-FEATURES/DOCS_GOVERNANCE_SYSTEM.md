# Docs Governance System

## Overview
- The Docs Governance System is a file-system-based documentation platform that replaced the previous database-backed docs library.
- It provides a read-only browser for navigating and searching project documentation, with auto-generation of API reference docs from Express route files.
- Accessed from Admin → Docs (`/admin/docs`) and Admin → Docs Coverage (`/admin/docs-coverage`).
- Designed for developer self-service: documentation is authored as plain `.md` files in the `docs/` directory, organized into numbered category folders.

## Architecture
- **Source of Truth:** `docs/` directory with 18 numbered category folders (`01-GETTING-STARTED` through `18-FUNCTIONAL-DOCS`).
- **Backend:** `server/src/routes/admin/docs.router.ts` — 4 REST endpoints (list, read, sync, coverage).
- **Route Scanner:** `server/src/utils/routeScanner.ts` — scans all Express route files using regex, extracts endpoint definitions, maps them to named domains, and generates markdown reference docs.
- **Frontend:** Two admin pages:
  - `client/src/pages/admin-docs.tsx` — Doc Browser with sidebar navigation, search, and custom MarkdownRenderer.
  - `client/src/pages/admin-docs-coverage.tsx` — Coverage Dashboard with progress bars and detail grids.
- **No database dependency** — all docs are read from disk per request; no migrations or schema changes required.

### Data Flow
1. Developer creates/edits `.md` files in `docs/` folders.
2. Admin opens `/admin/docs` → frontend calls `GET /api/admin/docs` → backend scans `docs/` directory recursively.
3. Admin clicks a document → frontend calls `GET /api/admin/docs/:docPath` → backend reads the file and returns its content.
4. Admin clicks "Sync API Docs" → frontend calls `POST /api/admin/docs/sync` → backend runs route scanner, generates/updates markdown in `docs/17-API-REGISTRY/`.
5. Admin opens `/admin/docs-coverage` → frontend calls `GET /api/admin/docs/coverage` → backend checks which API domains and functional docs exist.

### Key Modules/Files
| File | Purpose |
|------|---------|
| `server/src/routes/admin/docs.router.ts` | Express router with 4 endpoints |
| `server/src/utils/routeScanner.ts` | Route scanning and markdown generation |
| `client/src/pages/admin-docs.tsx` | Doc Browser UI (sidebar + viewer + MarkdownRenderer) |
| `client/src/pages/admin-docs-coverage.tsx` | Coverage Dashboard UI |
| `docs/` | Source of truth for all documentation |
| `docs/17-API-REGISTRY/` | Auto-generated API reference docs |
| `docs/18-FUNCTIONAL-DOCS/` | Required functional documentation entries |

## Database
- **No database changes.** This system is entirely file-system based.
- The previous database-backed docs system (`documentation` table) endpoints have been commented out in `server/routes.ts`. The table is retained for historical data preservation.

## APIs

### GET /api/admin/docs
- **Auth requirement:** `requireFullAccess` (admin, store_manager roles)
- **Request:** No parameters.
- **Response:**
```json
{
  "categories": [
    {
      "id": "01-GETTING-STARTED",
      "displayName": "Getting Started",
      "icon": "Rocket",
      "order": 1,
      "docs": [
        {
          "id": "01-GETTING-STARTED__README",
          "filename": "README.md",
          "title": "Getting Started",
          "category": "01-GETTING-STARTED",
          "relativePath": "01-GETTING-STARTED/README.md",
          "sizeBytes": 512,
          "modifiedAt": "2026-02-06T21:00:00.000Z"
        }
      ]
    }
  ]
}
```
- **Error cases:** 500 if filesystem scan fails.

### GET /api/admin/docs/:docPath
- **Auth requirement:** `requireFullAccess`
- **Request:** `docPath` uses `__` as path separator (e.g., `01-GETTING-STARTED__README`).
- **Response:**
```json
{
  "id": "01-GETTING-STARTED__README",
  "filename": "README.md",
  "title": "Getting Started",
  "content": "# Getting Started\n\nWelcome to...",
  "relativePath": "01-GETTING-STARTED/README.md",
  "sizeBytes": 512,
  "modifiedAt": "2026-02-06T21:00:00.000Z"
}
```
- **Error cases:** 400 for path traversal attempts (`..` or `\`), 404 if file not found, 500 for read errors.

### POST /api/admin/docs/sync
- **Auth requirement:** `requireFullAccess`
- **Request:** No body.
- **Response:**
```json
{
  "success": true,
  "summary": { "created": 5, "updated": 10, "skipped": 0, "errors": 0 },
  "details": [
    { "domain": "main", "action": "updated", "file": "main.md" },
    { "domain": "affiliates", "action": "created", "file": "affiliates.md" }
  ]
}
```
- **Error cases:** 500 if scan or write fails.

### GET /api/admin/docs/coverage
- **Auth requirement:** `requireFullAccess`
- **Response:**
```json
{
  "apiCoveragePct": 100,
  "funcCoveragePct": 0,
  "apiDomains": [
    { "domain": "main", "displayName": "Main Application Routes", "endpointCount": 45, "hasDoc": true, "hasAuthNotes": false, "hasExamples": false }
  ],
  "functionalDocs": [
    { "id": "AFFILIATE_SYSTEM", "name": "Affiliate System", "exists": false, "isEmpty": true, "wordCount": 0 }
  ],
  "summary": { "apiTotal": 15, "apiDocumented": 15, "funcTotal": 10, "funcComplete": 0 }
}
```
- **Error cases:** 500 if scan fails.

## Frontend Integration
- **Routes/pages:** `/admin/docs` (Doc Browser), `/admin/docs-coverage` (Coverage Dashboard).
- **Components:**
  - `MarkdownRenderer` — custom inline renderer (no external library). Handles headings (h1-h4), code blocks with language labels, tables, ordered/unordered lists, blockquotes, horizontal rules, inline code, bold, and links.
  - `InlineContent` — handles inline formatting (code, bold, links).
  - `ProgressBar` — color-coded progress bar for coverage percentages.
  - `StatusIcon` — green/amber/red icons for complete/partial/missing status.
- **State management:** React Query for data fetching and cache invalidation. Local state for sidebar expansion and search filtering.
- **Validation behavior:** Search filters in real-time by document title and filename.
- **UX notes:** All categories expand by default. Categories can be individually collapsed. Documents can be selected by clicking in the sidebar. The doc viewer shows a metadata bar with file path, size, and modification date.

## Security Considerations
- **Path traversal prevention:** Double-layered: rejects `..` and `\` in input, then validates `path.resolve()` result stays within `docs/` directory using `startsWith` check.
- **Authorization:** All endpoints protected by `requireFullAccess` middleware (blocks fulfillment role).
- **No write access:** The doc browser is read-only except for the sync endpoint which only writes to `docs/17-API-REGISTRY/`.
- **HTML comment markers:** The sync system preserves manual notes by only replacing content between `AUTO-GENERATED SECTION` markers.

## Operational Notes
- **No caching:** Docs are scanned from disk per request. Suitable for the expected low-traffic admin usage pattern.
- **Auto-generated section merge:** When syncing API docs, existing manual notes outside the auto-generated markers are preserved. New endpoints appear in the auto-generated table.
- **Route scanner limitations:** Uses regex-based scanning (not AST), so dynamically constructed routes or non-standard patterns may not be detected. The scanner covers `router.get/post/patch/put/delete` and `router.route().get/post/...` patterns.
- **Adding new docs:** Simply create a `.md` file in the appropriate `docs/` subfolder. It will appear in the browser on next page load.
- **Adding new categories:** Create a new numbered folder in `docs/` (e.g., `19-NEW-CATEGORY`). Add an entry to `CATEGORY_CONFIG` in `docs.router.ts` for a custom display name and icon.

## Related Docs
- Docs Governance System (this document)
- API Reference — see auto-generated docs in `docs/17-API-REGISTRY/`
- Admin RBAC — Role-Based Access Control (controls who can access docs)
- Architecture — Project Structure (`docs/02-ARCHITECTURE/PROJECT_STRUCTURE.md`)
