# CMS Posts Dual-Stack Convergence Plan

**Date:** February 10, 2026
**Status:** Cleanup implemented for application code; legacy DB artifact pending verification

## Current State: Two Parallel Stacks

### Stack A — "Feature-Rich" (ACTIVE, in production)

| Layer | File | Key Class/Export |
|-------|------|------------------|
| Routes (admin) | `server/src/routes/admin/cms-posts-v2.routes.ts` | Mounted at `/api/admin/cms` |
| Routes (public) | `server/src/routes/public/blog-v2.routes.ts` | Mounted at `/api/blog` |
| Service | `server/src/services/cms.posts.service.ts` | `postsService` |
| Repository | `server/src/repositories/cms.posts.repo.ts` | `postsRepository` |
| Schemas | `server/src/schemas/cms.posts.schema.ts` | Zod validation schemas |
| DB Tables | `posts`, `postCategories`, `postTags`, `postCategoryMap`, `postTagMap`, `postRevisions`, `postSettings` | Defined in `shared/schema.ts` |

**Consumers:**
- `client/src/pages/admin-cms-posts.tsx` — post list, filtering, bulk actions
- `client/src/pages/admin-cms-post-editor.tsx` — rich editor with categories, tags, revisions, scheduling
- `client/src/pages/admin-cms-post-builder.tsx` — block-based post builder

**Features:** Pagination, filtering, search, categories, tags, revisions, scheduling, publish/unpublish/archive, settings, media.

### Stack B — "Simple" (REMOVED)

| Layer | File | Key Class/Export |
|-------|------|------------------|
| Routes (admin) | Removed | Was not imported in `server/routes.ts` |
| Service | Removed | Replaced by active `postsService` stack |
| Repository | Removed | Replaced by active `postsRepository` stack |
| DB Table | `cmsPosts` -> `cms_v2_posts` | Still present in `shared/schema.ts` as a legacy artifact |

**Consumers:** None. No frontend page imported or called these routes.

**Features:** Basic CRUD only (list, getById, getBySlug, create, update, delete, published filtering).

## Recommendation

**Keep Stack A as the canonical CMS posts system.** It is fully integrated with the admin UI, supports the complete feature set, and is the only stack with active consumers.

**Stack B application code has been removed.** The `cms_v2_posts` table and related schema exports remain until production data can be verified and migrated or dropped safely.

## Risk Assessment

- **Low risk:** Stack B had zero consumers and was not mounted. Removal has no runtime impact.
- **Schema note:** The `cms_v2_posts` table may exist in the production DB. Verify it's empty before dropping.

## Phase 2 Verification Status

**Date:** June 24, 2026

Read-only repository verification found no active runtime consumers of `cmsPosts`, `insertCmsPostSchema`, `InsertCmsPost`, or `CmsPost`. Active admin and public blog routes use the `posts` data model and related tables (`post_categories`, `post_tags`, `post_category_map`, `post_tag_map`, `post_revisions`, `post_settings`).

No schema or DB artifact was removed in this pass because removing `cmsPosts` from `shared/schema.ts` changes Drizzle's desired schema and can cause a later `drizzle-kit push` or generated migration to drop `cms_v2_posts`. Target staging/production DB contents were not verified locally because `DATABASE_URL` was unavailable.

Run these read-only checks against the intended target DB before removing `cmsPosts` or dropping `cms_v2_posts`:

```sql
SELECT to_regclass('public.cms_v2_posts') AS cms_v2_posts_table;

SELECT count(*)::bigint AS cms_v2_posts_count
FROM public.cms_v2_posts;

SELECT
  status,
  count(*)::bigint AS row_count,
  min(created_at) AS oldest_created_at,
  max(created_at) AS newest_created_at,
  min(published_at) AS oldest_published_at,
  max(published_at) AS newest_published_at
FROM public.cms_v2_posts
GROUP BY status
ORDER BY status;

SELECT l.id, l.slug, l.title, l.status, l.created_at, l.published_at
FROM public.cms_v2_posts l
LEFT JOIN public.posts p ON p.slug = l.slug
WHERE p.id IS NULL
ORDER BY l.created_at DESC
LIMIT 100;

SELECT
  l.id AS legacy_id,
  p.id AS active_id,
  l.slug,
  l.title AS legacy_title,
  p.title AS active_title,
  length(l.body) AS legacy_body_length,
  length(p.legacy_html) AS active_legacy_html_length,
  l.excerpt AS legacy_excerpt,
  p.excerpt AS active_excerpt,
  l.featured_image AS legacy_featured_image,
  p.cover_image_id AS active_cover_image_id,
  l.author_name AS legacy_author_name,
  l.author_id AS legacy_author_id,
  p.author_id AS active_author_id,
  l.tags AS legacy_tags,
  l.category AS legacy_category,
  l.meta_title AS legacy_meta_title,
  l.meta_description AS legacy_meta_description,
  l.og_image AS legacy_og_image,
  l.status AS legacy_status,
  p.status AS active_status,
  l.published_at AS legacy_published_at,
  p.published_at AS active_published_at
FROM public.cms_v2_posts l
JOIN public.posts p ON p.slug = l.slug
WHERE l.title IS DISTINCT FROM p.title
   OR l.excerpt IS DISTINCT FROM p.excerpt
   OR l.author_id IS DISTINCT FROM p.author_id
   OR l.status IS DISTINCT FROM p.status
   OR l.published_at IS DISTINCT FROM p.published_at
ORDER BY l.created_at DESC
LIMIT 100;

SELECT
  count(*) FILTER (WHERE body IS NOT NULL AND body <> '') AS rows_with_body,
  count(*) FILTER (WHERE array_length(tags, 1) > 0) AS rows_with_tags,
  count(*) FILTER (WHERE category IS NOT NULL AND category <> '') AS rows_with_category,
  count(*) FILTER (WHERE featured_image IS NOT NULL AND featured_image <> '') AS rows_with_featured_image,
  count(*) FILTER (WHERE meta_title IS NOT NULL AND meta_title <> '') AS rows_with_meta_title,
  count(*) FILTER (WHERE meta_description IS NOT NULL AND meta_description <> '') AS rows_with_meta_description,
  count(*) FILTER (WHERE og_image IS NOT NULL AND og_image <> '') AS rows_with_og_image
FROM public.cms_v2_posts;

SELECT
  conrelid::regclass AS referencing_table,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_def
FROM pg_constraint
WHERE confrelid = 'public.cms_v2_posts'::regclass;

SELECT schemaname, viewname, definition
FROM pg_views
WHERE definition ILIKE '%cms_v2_posts%';

SELECT schemaname, matviewname, definition
FROM pg_matviews
WHERE definition ILIKE '%cms_v2_posts%';

SELECT n.nspname AS schema_name, p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE pg_get_functiondef(p.oid) ILIKE '%cms_v2_posts%'
ORDER BY 1, 2;
```

Decision rule:

- `count = 0`, no FK/view/function dependencies: safe candidate for schema cleanup and DB drop in a coordinated migration.
- `count > 0` with missing or mismatched active `posts` rows: migrate or retain; do not drop.
- `count > 0` with all rows matched on basic fields: still not drop-safe by itself. Review legacy body, SEO, taxonomy, media, and author inventory, then make an archive/export/migration decision before drop.
