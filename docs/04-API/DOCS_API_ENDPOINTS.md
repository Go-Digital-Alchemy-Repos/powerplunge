# Docs API Endpoints

## Overview
- Four REST API endpoints power the file-system-based documentation browser.
- All endpoints are mounted at `/api/admin/docs` and protected by `requireFullAccess` middleware.
- The endpoints provide listing, reading, auto-sync, and coverage analysis of project documentation stored as `.md` files in the `docs/` directory.

## Architecture
- **Router:** `server/src/routes/admin/docs.router.ts` — standalone Express Router.
- **Mounted in:** `server/routes.ts` via `app.use("/api/admin/docs", requireFullAccess, docsRouter)`.
- **Utility:** `server/src/utils/routeScanner.ts` — used by the sync and coverage endpoints to scan Express route files.
- **No database interaction** — all operations read/write to the `docs/` filesystem directory.

### Request Flow
```
Client → /api/admin/docs/* → requireFullAccess middleware → docs.router.ts → filesystem (docs/)
```

## Database
- No database tables are involved in the docs API.
- The previous `documentation` table endpoints have been commented out and are no longer active.

## APIs

### GET /api/admin/docs
List all documentation grouped by category.

- **Method:** GET
- **Path:** `/api/admin/docs`
- **Auth:** `requireFullAccess` (admin, store_manager)
- **Request:** No query params or body.
- **Response (200):**
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
- **Error cases:**
  - 401 — Not authenticated
  - 403 — Fulfillment role (blocked by `requireFullAccess`)
  - 500 — Filesystem scan failure

### GET /api/admin/docs/:docPath
Read a single document's content.

- **Method:** GET
- **Path:** `/api/admin/docs/:docPath`
- **Auth:** `requireFullAccess`
- **Path params:** `docPath` — document identifier using `__` as path separator (e.g., `01-GETTING-STARTED__README`)
- **Response (200):**
```json
{
  "id": "01-GETTING-STARTED__README",
  "filename": "README.md",
  "title": "Getting Started",
  "content": "# Getting Started\n\nWelcome to the documentation...",
  "relativePath": "01-GETTING-STARTED/README.md",
  "sizeBytes": 512,
  "modifiedAt": "2026-02-06T21:00:00.000Z"
}
```
- **Error cases:**
  - 400 — Path traversal attempt detected (`..` or `\` in path, or resolved path escapes `docs/` directory)
  - 401 — Not authenticated
  - 403 — Blocked by RBAC
  - 404 — Document file not found
  - 500 — File read error

### POST /api/admin/docs/sync
Auto-generate API registry documentation from Express route files.

- **Method:** POST
- **Path:** `/api/admin/docs/sync`
- **Auth:** `requireFullAccess`
- **Request:** No body required.
- **Response (200):**
```json
{
  "success": true,
  "summary": {
    "created": 5,
    "updated": 10,
    "skipped": 0,
    "errors": 0
  },
  "details": [
    { "domain": "main", "action": "updated", "file": "main.md" },
    { "domain": "affiliates", "action": "created", "file": "affiliates.md" }
  ]
}
```
- **Behavior:**
  - Scans all route files in `server/routes.ts`, `server/src/routes/`, and subdirectories.
  - For existing docs: merges auto-generated endpoint table while preserving manual notes outside `<!-- === AUTO-GENERATED SECTION === -->` markers.
  - For new domains: creates a stub document with module info, auth placeholders, and the auto-generated endpoint table.
  - Writes output to `docs/17-API-REGISTRY/`.
- **Error cases:**
  - 401/403 — Auth/RBAC
  - 500 — Scan or write failure

### GET /api/admin/docs/coverage
Compute documentation coverage metrics.

- **Method:** GET
- **Path:** `/api/admin/docs/coverage`
- **Auth:** `requireFullAccess`
- **Response (200):**
```json
{
  "apiCoveragePct": 100,
  "funcCoveragePct": 0,
  "apiDomains": [
    {
      "domain": "main",
      "displayName": "Main Application Routes",
      "endpointCount": 45,
      "hasDoc": true,
      "hasAuthNotes": false,
      "hasExamples": false
    }
  ],
  "functionalDocs": [
    {
      "id": "AFFILIATE_SYSTEM",
      "name": "Affiliate System",
      "exists": false,
      "isEmpty": true,
      "wordCount": 0
    }
  ],
  "summary": {
    "apiTotal": 15,
    "apiDocumented": 15,
    "funcTotal": 10,
    "funcComplete": 0
  }
}
```
- **Coverage criteria:**
  - API domain is "documented" if a `.md` file exists in `docs/17-API-REGISTRY/` matching the domain name.
  - `hasAuthNotes` is true if the doc contains an `Auth Required` field not set to "TBD".
  - `hasExamples` is true if the doc contains a code fence with a recognized language tag.
  - Functional doc is "complete" if it exists in `docs/18-FUNCTIONAL-DOCS/` and has >= 100 words.
- **Error cases:** 401/403/500

## Frontend Integration
- Doc Browser (`/admin/docs`) calls `GET /api/admin/docs` and `GET /api/admin/docs/:docPath`.
- Coverage Dashboard (`/admin/docs-coverage`) calls `GET /api/admin/docs/coverage`.
- Both pages include a "Sync API Docs" button calling `POST /api/admin/docs/sync`.
- React Query manages caching with automatic invalidation after sync.

## Security Considerations
- Path traversal prevention: double-layered validation (string check + `path.resolve` boundary check).
- Read-only for all endpoints except sync, which only writes to `docs/17-API-REGISTRY/`.
- All endpoints require admin/store_manager role; fulfillment role is blocked.

## Operational Notes
- No pagination — all docs returned in a single response (acceptable for documentation-sized datasets).
- No caching — filesystem scan per request. Low-traffic admin-only usage.
- Sync is idempotent — safe to run repeatedly.

## Related Docs
- Docs Governance System (`docs/03-FEATURES/DOCS_GOVERNANCE_SYSTEM.md`)
- Route Scanner (`docs/06-BACKEND/ROUTE_SCANNER.md`)
- Admin RBAC — Role-Based Access Control
