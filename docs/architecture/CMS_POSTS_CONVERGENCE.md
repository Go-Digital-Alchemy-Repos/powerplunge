# CMS Posts Dual-Stack Convergence Plan

**Date:** February 10, 2026
**Status:** Cleanup implemented; legacy `cms_v2_posts` schema export and DB table removed

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
| DB Table | `cmsPosts` -> `cms_v2_posts` | Removed from active schema after production verification |

**Consumers:** None. No frontend page imported or called these routes.

**Features:** Basic CRUD only (list, getById, getBySlug, create, update, delete, published filtering).

## Recommendation

**Keep Stack A as the canonical CMS posts system.** It is fully integrated with the admin UI, supports the complete feature set, and is the only stack with active consumers.

**Stack B application code has been removed.** The legacy `cms_v2_posts` table and related active schema exports were removed after production verification showed the table was empty and had no inbound dependencies.

## Risk Assessment

- **Low risk:** Stack B had zero consumers and was not mounted. Removal has no runtime impact.
- **Schema note:** `cms_v2_posts` is no longer part of the active Drizzle schema. The historical baseline snapshot may still mention it, but `shared/schema.ts` no longer exports it.

## Phase 2 Verification Status

**Date:** June 24, 2026

Read-only repository verification found no active runtime consumers of `cmsPosts`, `insertCmsPostSchema`, `InsertCmsPost`, or `CmsPost`. Active admin and public blog routes use the `posts` data model and related tables (`post_categories`, `post_tags`, `post_category_map`, `post_tag_map`, `post_revisions`, `post_settings`).

Neon production verification found:

- `posts`: 8 rows
- `cms_v2_posts`: 0 rows
- non-empty legacy payload fields: 0 rows
- inbound foreign keys to `cms_v2_posts`: 0
- dependent views/materialized views/functions: 0
- only outbound dependency: the legacy table's own FK to `admin_users`

The guarded production cleanup rechecked those conditions in the same transaction before dropping `public.cms_v2_posts`. Local Postgres was aligned with the same guarded empty-table check.

Reference verification SQL used before cleanup:

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
WHERE p.prokind IN ('f', 'p')
  AND pg_get_functiondef(p.oid) ILIKE '%cms_v2_posts%'
ORDER BY 1, 2;
```

Decision rule:

- `count = 0`, no inbound FK/view/function dependencies: safe candidate for schema cleanup and guarded DB drop.
- `count > 0` with missing or mismatched active `posts` rows: migrate or retain; do not drop.
- `count > 0` with all rows matched on basic fields: still not drop-safe by itself. Review legacy body, SEO, taxonomy, media, and author inventory, then make an archive/export/migration decision before drop.

Implementation notes:

- Removed `cmsPosts`, `insertCmsPostSchema`, `InsertCmsPost`, and `CmsPost` from `shared/schema.ts`.
- Dropped `public.cms_v2_posts` in Neon production with a guarded transaction after verifying it was empty and had no inbound dependencies.
- Did not hand-edit `migrations/meta/0000_snapshot.json`; it is a historical Drizzle baseline. `drizzle-kit generate` is not clean in this repo because the baseline snapshot is stale against unrelated tables, so this cleanup used an explicit guarded DB operation instead of a noisy generated migration.
- If a future migration-generation pass emits a `DROP TABLE cms_v2_posts` delta from the stale baseline, treat it as already applied in active environments and replace any generated destructive SQL with an idempotent guard or omit it.
