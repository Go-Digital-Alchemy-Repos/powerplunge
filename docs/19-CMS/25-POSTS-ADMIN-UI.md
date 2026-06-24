# Posts Admin UI Guide

The admin interface for managing blog posts is at `/admin/cms/posts`.

---

## Accessing the Posts Manager

1. Log in at `/admin` with admin credentials.
2. Navigate to **CMS** in the sidebar.
3. Click **Posts** (or go directly to `/admin/cms/posts`).

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
3. Optionally fill: content, excerpt, taxonomy selections, cover image ID, canonical URL, OG image ID, and robots settings.
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
- **Cover Image ID** — media library image for listings and hero display
- **Tags** — taxonomy selections stored through `post_tag_map`
- **Categories** — taxonomy selections stored through `post_category_map`

### SEO Tab
- **Canonical URL** — overrides canonical link target
- **OG Image ID** — overrides Open Graph image; falls back to cover image
- **Allow Index / Allow Follow** — controls robots directives

### Publishing Controls
- **Save as Draft** — saves without publishing
- **Publish** — sets status to published, sets `publishedAt` to now
- **Unpublish** — reverts to draft
- **Schedule** — stores a future `scheduledAt` date with status `scheduled`; posts remain hidden until published

---

## Slug Validation

Post slugs are validated when a post is created or updated. A duplicate slug returns `409` from the save request.

---

## Tags & Categories

- **Tags:** `/api/admin/cms/post-tags` manages reusable post tags
- **Categories:** `/api/admin/cms/post-categories` manages reusable post categories

These are stored in `post_tags` and `post_categories`, with assignments stored in join tables.

---

## Key Files

| File | Purpose |
|------|---------|
| `client/src/pages/admin-cms-posts.tsx` | Posts library + editor UI |
| `server/src/routes/admin/cms-posts-v2.routes.ts` | Admin API endpoints |
| `server/src/services/cms.posts.service.ts` | Service layer |
