# Doc Browser & Coverage Dashboard UI

## Overview
- Two admin pages provide a documentation browsing and coverage tracking experience.
- **Doc Browser** (`/admin/docs`) — sidebar-based navigation with search, category tree, document viewer, and custom inline markdown renderer.
- **Coverage Dashboard** (`/admin/docs-coverage`) — visualizes documentation completeness for API domains and functional areas with progress bars and detail grids.
- Both pages are accessible to admin and store_manager roles only (fulfillment blocked).

## Architecture

### Doc Browser (`admin-docs.tsx`)
- **Left sidebar (280px):**
  - Header with doc count badge and search input.
  - "Sync API Docs" button triggers `POST /api/admin/docs/sync`.
  - "Refresh" button invalidates React Query cache.
  - Category tree with collapsible sections showing document titles.
- **Main content area:**
  - Welcome state shown when no document is selected (quick-link cards to first 4 categories).
  - Document viewer with metadata bar (file path, size, modification date) and rendered markdown content.

### Coverage Dashboard (`admin-docs-coverage.tsx`)
- **Summary cards:** Two side-by-side cards showing API coverage % and Functional docs coverage % with color-coded progress bars (green >= 80%, cyan >= 40%, amber < 40%).
- **Missing/Incomplete alert:** Card highlighting missing API docs, incomplete API docs (missing auth notes or examples), and missing/empty functional docs.
- **Detail grids:** Two columns listing all API domains and functional docs with status icons (green checkmark, amber alert, red X).

### Custom MarkdownRenderer
The `MarkdownRenderer` component in `admin-docs.tsx` is a custom inline renderer built without external markdown libraries. It handles:

| Markdown Element | Rendering |
|-----------------|-----------|
| `# H1` through `#### H4` | Styled headings with appropriate sizes and margins |
| ` ```lang ` code blocks | Syntax-highlighted code with language label header |
| `> blockquote` | Cyan left-border blockquote in italic |
| `- ` / `* ` unordered lists | Bullet list with proper indentation |
| `1. ` ordered lists | Numbered list |
| `\| table \|` | Responsive table with header row detection |
| `---` / `***` | Horizontal rule |
| `` `inline code` `` | Cyan-colored monospace code span |
| `**bold**` | White bold text |
| `[text](url)` | Cyan-colored external link with icon |
| `<!-- comment -->` | HTML comments hidden |
| Plain text | Gray paragraph text |

### Data Flow
```
/admin/docs → GET /api/admin/docs → scanDocsDir() → filesystem
Click doc   → GET /api/admin/docs/:id → readFile() → MarkdownRenderer
Sync button → POST /api/admin/docs/sync → routeScanner → writes docs/17-API-REGISTRY/
```

## Database
- No database interaction. The UI fetches from the filesystem-backed docs API.

## APIs
Consumed by these pages:

| Endpoint | Page | Trigger |
|----------|------|---------|
| `GET /api/admin/docs` | Doc Browser | Page load |
| `GET /api/admin/docs/:docPath` | Doc Browser | Doc selection |
| `POST /api/admin/docs/sync` | Both pages | "Sync API Docs" button |
| `GET /api/admin/docs/coverage` | Coverage Dashboard | Page load |

## Frontend Integration
- **Routes:** Registered in `client/src/App.tsx`:
  - `/admin/docs` → `AdminDocs` component
  - `/admin/docs-coverage` → `AdminDocsCoverage` component
- **Navigation:** Links added to `AdminNav.tsx` under a docs dropdown or nav group.
- **State management:** React Query (`@tanstack/react-query`) for data fetching with automatic cache invalidation after sync mutations.
- **Local state:** `useState` for selected document ID, search query, and expanded categories set.
- **Filtering:** Real-time search filters categories and documents by title and filename using `useMemo`.

### Key data-testid Attributes
| Element | data-testid |
|---------|------------|
| Doc Browser page | `admin-docs-page` |
| Search input | `input-search-docs` |
| Sync button | `button-sync-api-docs` |
| Refresh button | `button-refresh-docs` |
| Doc count badge | `badge-doc-count` |
| Document viewer | `doc-viewer` |
| Welcome state | `doc-welcome` |
| Category container | `category-{id}` |
| Category toggle | `button-toggle-category-{id}` |
| Doc select button | `button-select-doc-{id}` |
| Coverage page | `admin-docs-coverage-page` |
| API coverage card | `card-api-coverage-summary` |
| Func coverage card | `card-func-coverage-summary` |
| API domains detail | `card-api-domains-detail` |
| Func docs detail | `card-func-docs-detail` |

## Security Considerations
- All API calls use `credentials: "include"` to send session cookie.
- Access guarded by `useAdmin()` hook — shows "Access Denied" for users without full access.
- No user-generated HTML is rendered; all markdown is parsed and rendered as React elements (XSS-safe).

## Operational Notes
- **No external markdown library:** The custom `MarkdownRenderer` is lightweight but does not support all GitHub Flavored Markdown features (e.g., nested lists, task lists, footnotes, image rendering).
- **Category icons:** Mapped from string names to Lucide React components via `ICON_MAP`. Adding new icons requires updating this map.
- **All categories expand by default** on first load. Users can individually collapse them.
- **Performance:** All docs metadata is fetched in a single request. Individual doc content is fetched on selection (lazy loading).

## Related Docs
- Docs Governance System (`docs/03-FEATURES/DOCS_GOVERNANCE_SYSTEM.md`)
- Docs API Endpoints (`docs/04-API/DOCS_API_ENDPOINTS.md`)
- Route Scanner (`docs/06-BACKEND/ROUTE_SCANNER.md`)
