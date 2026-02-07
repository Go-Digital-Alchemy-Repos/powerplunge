# Posts Admin UI Guide

The admin interface for managing blog posts is at `/admin/cms-v2/posts`.

---

## Accessing the Posts Manager

1. Log in at `/admin` with admin credentials.
2. Navigate to **CMS v2** in the sidebar.
3. Click **Posts** (or go directly to `/admin/cms-v2/posts`).

---

## Posts Library

The library view shows all posts in a table with:

| Column | Description |
|--------|-------------|
| Title | Post title (clickable to edit) |
| Slug | URL path segment |
| Status | Badge: Draft, Published, or Archived |
| Category | Post category |
| Published At | Date/time published (blank for drafts) |
| Actions | Edit, Publish/Unpublish, Delete |

### Filtering & Search

- Filter by status (All / Draft / Published / Archived)
- Search by title or slug

### Creating a New Post

1. Click **New Post** button.
2. Fill in required fields: Title, Slug.
3. Optionally fill: Body, Excerpt, Tags, Category, Featured Image.
4. Click **Save** — creates as draft.

---

## Post Editor

The editor form includes:

### Content Tab
- **Title** — required, displayed as the post heading
- **Slug** — required, auto-suggested from title, must be unique
- **Body** — rich text editor (HTML/Markdown)
- **Excerpt** — short summary for listings, social previews

### Media & Metadata
- **Featured Image** — URL or upload via media library
- **Tags** — comma-separated, stored as text array
- **Category** — single category selector

### SEO Tab
- **Meta Title** — overrides `<title>` tag
- **Meta Description** — overrides `<meta name="description">`
- **OG Image** — overrides Open Graph image

### Publishing Controls
- **Save as Draft** — saves without publishing
- **Publish** — sets status to published, sets `publishedAt` to now
- **Unpublish** — reverts to draft
- **Schedule** — set `publishedAt` to a future date before publishing

---

## Slug Validation

The admin UI includes a slug uniqueness checker:

- **Endpoint:** `GET /api/admin/cms-v2/posts/check-slug?slug=my-post`
- **Response:** `{ available: true }` or `{ available: false }`
- The UI shows a green check or red warning next to the slug field.

---

## Tags & Categories

- **Tags:** `/api/admin/cms-v2/posts/tags` returns all unique tags across posts
- **Categories:** `/api/admin/cms-v2/posts/categories` returns all unique categories

These are derived from existing post data (no separate management table).

---

## Key Files

| File | Purpose |
|------|---------|
| `client/src/pages/admin-cms-v2-posts.tsx` | Posts library + editor UI |
| `server/src/routes/admin/cms-v2-posts.routes.ts` | Admin API endpoints |
| `server/src/services/cms-v2-posts.service.ts` | Service layer |
