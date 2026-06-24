# CMS Posts Dual-Stack Convergence Plan

**Date:** February 10, 2026
**Status:** Cleanup implemented for application code

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
| DB Table | `cmsPosts` → `cms_v2_posts` | Defined in `shared/schema.ts` |

**Consumers:** None. No frontend page imported or called these routes.

**Features:** Basic CRUD only (list, getById, getBySlug, create, update, delete, published filtering).

## Recommendation

**Keep Stack A as the canonical CMS posts system.** It is fully integrated with the admin UI, supports the complete feature set, and is the only stack with active consumers.

**Stack B application code has been removed.** The `cms_v2_posts` table and related schema exports remain until production data can be verified and migrated or dropped safely.

## Risk Assessment

- **Low risk:** Stack B had zero consumers and was not mounted. Removal has no runtime impact.
- **Schema note:** The `cms_v2_posts` table may exist in the production DB. Verify it's empty before dropping.
