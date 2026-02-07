# CMS v2 API Reference

All CMS v2 endpoints are mounted under `/api/admin/cms-v2` and require admin authentication with full access (via `requireFullAccess` middleware).

**Router file:** `server/src/routes/admin/cms-v2.router.ts`

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

### GET /pages/check-slug

Check whether a slug is available.

**Query params:** `?slug=my-page-slug`

**Response:**
```json
{ "available": true }
```
or
```json
{ "available": false, "existingPageId": "uuid" }
```

**Errors:**
- `400` — Missing `slug` query parameter

### POST /pages

Create a new page.

**Body:** Validated against `insertPageSchema` (title, slug, pageType, status, content, contentJson, SEO fields, etc.)

**Content validation:** If `contentJson` is provided, it is validated by `validateContentJson()` before Zod parsing:
- Must be a JSON object (not string, array, or primitive)
- Must contain a `blocks` array
- Each block must have non-empty `id` (string), `type` (string), and optional `data` (object)
- Unknown block types produce warnings but are accepted

**HTML sanitization:** If `content` (legacy HTML) is provided, it is sanitized by `sanitizeHtml()` before saving. Strips `<script>` tags, `on*` event handlers, and `javascript:` URIs.

**Response:** `201` with created page object.

**Errors:**
- `400` — contentJson shape validation failure (descriptive error message)
- `400` — Zod validation failure (field-level errors)

**Example request:**
```json
{
  "title": "About Us",
  "slug": "about-us",
  "pageType": "page",
  "status": "draft",
  "contentJson": {
    "blocks": [
      {
        "id": "block-1",
        "type": "hero",
        "data": { "headline": "About Power Plunge", "subheadline": "Our story" }
      },
      {
        "id": "block-2",
        "type": "richText",
        "data": { "title": "Our Mission", "bodyRichText": "<p>We believe...</p>" }
      }
    ]
  }
}
```

### PUT /pages/:id

Update an existing page (partial update).

**Body:** Partial page fields validated against `insertPageSchema.partial()`.

Same content validation and HTML sanitization as `POST /pages`.

**Response:** Updated page object or `404`.

**Errors:**
- `400` — contentJson shape validation failure
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
  "page": { "..." }
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

### POST /sections/seed-kits

Seed pre-built section kits into the database. Idempotent — checks for existing sections by name before inserting.

**Response:**
```json
{ "seeded": 5, "skipped": 2, "total": 7 }
```

## Themes

### GET /themes

List all 10 theme token presets with full token data.

**Response:** Array of theme preset objects:
```json
[
  {
    "id": "ocean-blue",
    "name": "Ocean Blue",
    "description": "Primary blue with deep ocean tones...",
    "tokens": {
      "colors": { "colorBg": "#030712", "colorPrimary": "#67e8f9", "..." },
      "typography": { "fontFamilyBase": "'Inter', sans-serif", "..." },
      "radius": { "..." },
      "shadows": { "..." },
      "spacing": { "..." },
      "buttons": { "..." },
      "layout": { "..." }
    }
  }
]
```

### GET /themes/active

Get the currently active theme preset.

**Response:** Single theme preset object. Falls back to `ocean-blue` if none is set or the stored ID is unknown.

### POST /themes/activate

Activate a theme preset by ID. Stores the preset ID in `site_settings.active_theme_id`.

**Body:**
```json
{ "themeId": "midnight" }
```

**Response:** The activated theme preset object.

**Errors:**
- `400` — Invalid or unknown theme ID

**Available preset IDs:** `ocean-blue`, `midnight`, `minimal-light`, `contrast-pro`, `warm-neutral`, `slate-and-blue`, `frost`, `charcoal-gold`, `clean-clinical`, `energetic-blue-pop`

## Theme Packs

### GET /theme-packs

List all available theme packs with their component variant selections and block style defaults.

**Response:** Array of theme pack objects.

### GET /theme-packs/active

Get the currently active theme pack.

**Response:** Active theme pack object or default.

### POST /theme-packs/activate

Activate a theme pack by ID. Applies the pack's color theme, component variants, and block style defaults.

**Body:**
```json
{ "themePackId": "performance-tech" }
```

**Response:** The activated theme pack object.

## Site Presets

Site preset endpoints are mounted under `/api/admin/cms-v2/site-presets/`. See [Site Presets Overview](18-SITE-PRESETS-OVERVIEW.md) for full documentation.

### GET /site-presets

List all site presets.

### GET /site-presets/:id

Get a single preset by ID.

### POST /site-presets

Create a new site preset.

### PUT /site-presets/:id

Update an existing preset.

### DELETE /site-presets/:id

Delete a preset.

### POST /site-presets/seed

Seed the 6 built-in starter presets. Idempotent.

### POST /site-presets/:id/preview

Preview what would change if this preset were activated. Returns a diff of current vs proposed settings.

**Response:**
```json
{
  "preset": { "..." },
  "currentSettings": { "..." },
  "diff": {
    "themeWillChange": true,
    "navWillChange": false,
    "footerWillChange": true,
    "seoWillChange": false,
    "ctaWillChange": true,
    "homePageAction": "doNothing"
  }
}
```

### POST /site-presets/:id/activate

Activate a preset. Takes a snapshot of current settings before applying. Writes theme, nav, footer, SEO, and CTA settings to `site_settings`.

**Response:**
```json
{
  "snapshotId": "uuid",
  "presetName": "Performance Tech Starter",
  "changes": ["theme", "footer", "cta"]
}
```

### POST /site-presets/rollback

Rollback to the most recent pre-activation snapshot.

**Response:**
```json
{
  "success": true,
  "restoredFrom": "Performance Tech Starter",
  "snapshotId": "uuid"
}
```

### POST /site-presets/:id/duplicate

Duplicate an existing preset.

### GET /site-presets/:id/export

Export a preset as a portable JSON bundle.

### POST /site-presets/import

Import a preset from an exported JSON bundle.

### GET /site-presets/apply-history

Get activation history (list of snapshots).

### GET /site-presets/apply-history/:id

Get a specific activation history entry.

## Site Settings

Canonical site-wide settings stored in `site_settings` table (row `id="main"`).

### GET /site-settings

Read current global site settings (nav, footer, SEO, CTA, active theme/preset IDs).

**Response:**
```json
{
  "activeThemeId": "ocean-blue",
  "activePresetId": "performance-tech-starter",
  "navPreset": { "styleVariant": "minimal", "items": ["..."] },
  "footerPreset": { "columns": ["..."], "showSocial": true },
  "seoDefaults": { "siteName": "PowerPlunge", "..." },
  "globalCtaDefaults": { "primaryCtaText": "Shop Now", "..." }
}
```

### PUT /site-settings

Update global site settings directly (independent of presets). Validated against shared Zod schemas.

**Body:** Partial settings object (any combination of `navPreset`, `footerPreset`, `seoDefaults`, `globalCtaDefaults`).

**Response:** Updated settings object.

## Posts

Admin post endpoints are mounted under `/api/admin/cms-v2/posts` via `server/src/routes/admin/cms-v2-posts.routes.ts`.

### GET /posts

List all blog posts (admin view, includes drafts and archived).

**Query params:** `?page=1&pageSize=10&status=published&tag=wellness&category=guides&search=cold`

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Cold Plunge Benefits",
      "slug": "cold-plunge-benefits",
      "excerpt": "Learn about...",
      "status": "published",
      "tags": ["health"],
      "category": "guides",
      "publishedAt": "2026-01-15T10:00:00.000Z",
      "createdAt": "2026-01-10T08:00:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 10
}
```

### GET /posts/:id

Get a single post by ID.

**Response:** Full post object or `404`.

### POST /posts

Create a new blog post.

**Body:**
```json
{
  "title": "My Post Title",
  "slug": "my-post-title",
  "body": "<p>Post content...</p>",
  "excerpt": "Short summary",
  "featuredImage": "/uploads/hero.jpg",
  "tags": ["wellness", "recovery"],
  "category": "guides",
  "authorName": "Admin",
  "metaTitle": "My Post | Power Plunge",
  "metaDescription": "Learn about..."
}
```

**Response:** `201` with created post object (status defaults to `draft`).

### PUT /posts/:id

Update an existing post (partial update).

**Response:** Updated post object or `404`.

### POST /posts/:id/publish

Set post status to "published" and set `publishedAt` to now (if not already set).

**Response:** Updated post object or `404`.

### POST /posts/:id/unpublish

Set post status to "draft".

**Response:** Updated post object or `404`.

### DELETE /posts/:id

Delete a post.

**Response:** `{ success: true }` or `404`.

### GET /posts/check-slug

Check whether a post slug is available.

**Query params:** `?slug=my-post-slug`

**Response:**
```json
{ "available": true }
```

### GET /posts/tags

List all unique tags across all posts.

**Response:** `["health", "wellness", "recovery"]`

### GET /posts/categories

List all unique categories across all posts.

**Response:** `["guides", "news", "research"]`

### Public Blog Endpoints

Public endpoints are mounted at `/api/blog/` via `server/src/routes/public.blog.routes.ts`.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/blog/posts` | List published posts (paginated, `publishedAt <= now()`) |
| GET | `/api/blog/posts/:slug` | Get published post by slug (404 for drafts) |
| GET | `/api/blog/tags` | List unique tags from published posts |
| GET | `/api/blog/categories` | List unique categories from published posts |

**Blog list response format:**
```json
{
  "data": [{ "id": "...", "title": "...", "slug": "...", "..." }],
  "total": 10,
  "page": 1,
  "pageSize": 10
}
```

## Menus

Admin menu endpoints are mounted under `/api/admin/cms-v2/menus` via `server/src/routes/admin/cms-v2-menus.routes.ts`.

### GET /menus

List all navigation menus.

**Response:** Array of menu objects.

### POST /menus

Create a new menu.

**Body:**
```json
{
  "name": "Main Navigation",
  "location": "main",
  "active": true,
  "items": [
    {
      "id": "item-1",
      "label": "Shop",
      "url": "/shop",
      "type": "internal",
      "children": []
    },
    {
      "id": "item-2",
      "label": "Blog",
      "url": "/blog",
      "type": "internal",
      "children": [
        {
          "id": "item-2a",
          "label": "Recovery Tips",
          "url": "/blog?category=recovery",
          "type": "internal",
          "children": []
        }
      ]
    }
  ]
}
```

**Response:** `201` with created menu object.

### GET /menus/by-location/:location

Get a menu by its assigned location (e.g., `main`, `footer`).

**Response:** Menu object or `404`.

### PUT /menus/by-location/:location

Upsert a menu at a specific location. Creates if none exists, updates if one does.

**Body:** Same as POST /menus (minus location, which comes from URL param).

**Response:** Created or updated menu object.

### GET /menus/:id

Get a single menu by ID.

**Response:** Menu object or `404`.

### PUT /menus/:id

Update an existing menu.

**Response:** Updated menu object or `404`.

### DELETE /menus/:id

Delete a menu.

**Response:** `{ success: true }` or `404`.

### Public Menu Endpoint

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/menus/:location` | Get active menu by location (returns `null` if none) |

**Response:** Menu object with items, or `null`.

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

### Public Theme Endpoint

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/theme/active` | Get active theme for public pages (used by ThemeProvider) |
| GET | `/api/site-settings` | Public site settings (featuredProductId, hero config) |

## Endpoint Summary

All CMS v2 admin endpoints (prefix `/api/admin/cms-v2`):

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Service health check |
| GET | `/pages` | List all pages |
| GET | `/pages/home` | Get home page |
| GET | `/pages/shop` | Get shop page |
| GET | `/pages/check-slug` | Check slug availability |
| GET | `/pages/:id` | Get page by ID |
| POST | `/pages` | Create page (with content validation + HTML sanitization) |
| PUT | `/pages/:id` | Update page (with content validation + HTML sanitization) |
| POST | `/pages/:id/publish` | Publish page |
| POST | `/pages/:id/unpublish` | Unpublish page |
| POST | `/pages/:id/set-home` | Set as home page |
| POST | `/pages/:id/set-shop` | Set as shop page |
| POST | `/pages/:id/migrate-to-blocks` | Migrate legacy HTML to blocks |
| GET | `/sections` | List saved sections |
| GET | `/sections/:id` | Get section by ID |
| POST | `/sections` | Create section |
| PUT | `/sections/:id` | Update section |
| DELETE | `/sections/:id` | Delete section |
| POST | `/sections/seed-kits` | Seed pre-built section kits |
| GET | `/themes` | List theme presets |
| GET | `/themes/active` | Get active theme |
| POST | `/themes/activate` | Activate theme |
| GET | `/theme-packs` | List theme packs |
| GET | `/theme-packs/active` | Get active theme pack |
| POST | `/theme-packs/activate` | Activate theme pack |
| GET | `/site-presets` | List site presets |
| GET | `/site-presets/:id` | Get preset by ID |
| POST | `/site-presets` | Create preset |
| PUT | `/site-presets/:id` | Update preset |
| DELETE | `/site-presets/:id` | Delete preset |
| POST | `/site-presets/seed` | Seed built-in presets |
| POST | `/site-presets/:id/preview` | Preview preset activation |
| POST | `/site-presets/:id/activate` | Activate preset |
| POST | `/site-presets/rollback` | Rollback to previous settings |
| POST | `/site-presets/:id/duplicate` | Duplicate preset |
| GET | `/site-presets/:id/export` | Export preset |
| POST | `/site-presets/import` | Import preset |
| GET | `/site-presets/apply-history` | Activation history |
| GET | `/site-presets/apply-history/:id` | Single history entry |
| GET | `/site-settings` | Get site settings |
| PUT | `/site-settings` | Update site settings |
| GET | `/posts` | List all posts (admin) |
| GET | `/posts/:id` | Get post by ID |
| POST | `/posts` | Create post |
| PUT | `/posts/:id` | Update post |
| POST | `/posts/:id/publish` | Publish post |
| POST | `/posts/:id/unpublish` | Unpublish post |
| DELETE | `/posts/:id` | Delete post |
| GET | `/posts/check-slug` | Check post slug availability |
| GET | `/posts/tags` | List all tags |
| GET | `/posts/categories` | List all categories |
| GET | `/menus` | List all menus |
| POST | `/menus` | Create menu |
| GET | `/menus/by-location/:loc` | Get menu by location |
| PUT | `/menus/by-location/:loc` | Upsert menu by location |
| GET | `/menus/:id` | Get menu by ID |
| PUT | `/menus/:id` | Update menu |
| DELETE | `/menus/:id` | Delete menu |

### Public Blog & Menu Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/blog/posts` | Published posts (paginated) |
| GET | `/api/blog/posts/:slug` | Published post by slug |
| GET | `/api/blog/tags` | Unique tags |
| GET | `/api/blog/categories` | Unique categories |
| GET | `/api/menus/:location` | Active menu by location |
