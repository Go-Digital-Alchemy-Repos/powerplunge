# CMS v2 API Reference

All CMS v2 endpoints are mounted under `/api/admin/cms-v2` and require admin authentication with full access (via `requireFullAccess` middleware).

## Health

### GET /health

Returns the CMS v2 service health status.

**Response:**
```json
{ "status": "ok", "version": "2.0" }
```

## Pages

### GET /pages

List all CMS pages ordered by nav order.

**Response:** Array of page objects.

### GET /pages/:id

Get a single page by ID.

**Response:** Page object or `404`.

### GET /pages/home

Get the page marked as the home page.

**Response:** Page object or `404`.

### GET /pages/shop

Get the page marked as the shop page.

**Response:** Page object or `404`.

### POST /pages

Create a new page.

**Body:** Validated against `insertPageSchema` (title, slug, pageType, status, content, contentJson, SEO fields, etc.)

**Response:** `201` with created page object.

**Errors:**
- `400` — Zod validation failure

### PUT /pages/:id

Update an existing page (partial update).

**Body:** Partial page fields validated against `insertPageSchema.partial()`.

**Response:** Updated page object or `404`.

**Errors:**
- `400` — Zod validation failure

### POST /pages/:id/publish

Set page status to "published".

**Response:** Updated page object or `404`.

### POST /pages/:id/unpublish

Set page status to "draft".

**Response:** Updated page object or `404`.

### POST /pages/:id/set-home

Designate this page as the home page. Clears `isHome` on all other pages first (transactional).

**Response:** Updated page object or `404`.

### POST /pages/:id/set-shop

Designate this page as the shop page. Clears `isShop` on all other pages first (transactional).

**Response:** Updated page object or `404`.

### POST /pages/:id/migrate-to-blocks

Convert legacy HTML content to a richText block. See [Migration](08-MIGRATION.md).

**Validation:**
- Page must exist
- Page must not already have blocks in `contentJson`
- Page must have non-empty `content` HTML

**Response:**
```json
{
  "success": true,
  "message": "Legacy HTML migrated to a richText block...",
  "page": { ... }
}
```

## Sections

### GET /sections

List all saved sections.

**Response:** Array of section objects.

### GET /sections/:id

Get a single section by ID.

**Response:** Section object or `404`.

### POST /sections

Create a new saved section.

**Body:** Validated against `insertSavedSectionSchema` (name, description, category, blocks).

**Response:** `201` with created section object.

### PUT /sections/:id

Update an existing section (partial update).

**Body:** Partial section fields.

**Response:** Updated section object or `404`.

### DELETE /sections/:id

Delete a saved section.

**Response:** `{ success: true }` or `404`.

**Note:** Deleting a section does not affect pages that reference it via `sectionRef` blocks — those blocks will simply render nothing.

## Themes

### GET /themes

List all 10 theme presets with their CSS variables.

**Response:** Array of theme preset objects:
```json
[
  {
    "id": "arctic-default",
    "name": "Arctic Default",
    "description": "The signature Power Plunge look...",
    "variables": {
      "--theme-bg": "#030712",
      "--theme-primary": "#67e8f9",
      ...
    }
  }
]
```

### GET /themes/active

Get the currently active theme preset.

**Response:** Single theme preset object. Falls back to `arctic-default` if none is set.

### POST /themes/activate

Activate a theme preset.

**Body:**
```json
{ "themeId": "midnight-blue" }
```

**Response:** The activated theme preset object.

**Errors:**
- `400` — Invalid or unknown theme ID

## Legacy CMS Endpoints

These endpoints in `server/routes.ts` operate on the same `pages` table:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/pages` | List all pages |
| GET | `/api/admin/pages/:id` | Get page by ID |
| POST | `/api/admin/pages` | Create page |
| PATCH | `/api/admin/pages/:id` | Update page |
| DELETE | `/api/admin/pages/:id` | Delete page |
| POST | `/api/admin/pages/:id/set-home` | Set home page |
| POST | `/api/admin/pages/:id/set-shop` | Set shop page |
| GET | `/api/admin/pages/:id/export` | Export page data |
| POST | `/api/admin/pages/import` | Import page data |
| POST | `/api/admin/pages/generate-seo` | AI-generate SEO fields |

### Public Page Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/pages` | List published pages |
| GET | `/api/pages/home` | Get published home page |
| GET | `/api/pages/shop` | Get published shop page |
| GET | `/api/pages/:slug` | Get published page by slug |
