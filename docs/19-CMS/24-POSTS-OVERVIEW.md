# Posts Overview

The CMS Posts system provides blog/article management with a full publishing workflow.

---

## Data Model

Posts are stored in the active `posts` table. The older `cms_v2_posts` table belonged to the removed Stack B implementation; it was verified empty and removed from the active schema/database cleanup path.

| Column | Type | Description |
|--------|------|-------------|
| `id` | varchar (UUID) | Primary key, auto-generated |
| `title` | text | Post title (required) |
| `slug` | text (unique) | URL-friendly identifier (required) |
| `content_json` | jsonb | Block editor content |
| `legacy_html` | text | Optional fallback HTML content |
| `excerpt` | text | Short summary for listings and SEO |
| `status` | text | `draft` / `published` / `scheduled` / `archived` |
| `published_at` | timestamp | Date/time the post went live |
| `scheduled_at` | timestamp | Future publish date |
| `author_id` | varchar | FK to `admin_users.id` (optional) |
| `cover_image_id` | varchar | FK to `media_library.id` |
| `og_image_id` | varchar | FK to `media_library.id` |
| `reading_time_minutes` | integer | Estimated reading time |
| `canonical_url` | text | Canonical URL override |
| `featured` | boolean | Featured post flag |
| `allow_index` | boolean | Robots index flag |
| `allow_follow` | boolean | Robots follow flag |
| `sidebar_id` | varchar | FK to `sidebars.id` |
| `custom_css` | text | Post-specific CSS |
| `created_at` | timestamp | Row creation time |
| `updated_at` | timestamp | Last modification time |

### Drizzle Schema Location

`shared/schema.ts` — search for `posts`.

### Insert Schema

```ts
import { insertPostSchema } from "@shared/schema";
// Omits: id, createdAt, updatedAt
```

### TypeScript Types

```ts
import type { Post, InsertPost } from "@shared/schema";
```

---

## Status Workflow

```
  ┌───────┐   publish()   ┌───────────┐
  │ draft │──────────────▸ │ published │
  └───┬───┘               └─────┬─────┘
      │                         │
      │ (edit)          unpublish()
      │                         │
      ▾                         ▾
  ┌───────┐               ┌───────┐
  │ draft │◂──────────────│ draft │
  └───────┘               └───────┘
```

| Status | Visible to public? | Editable? | Notes |
|--------|--------------------|-----------|-------|
| `draft` | No | Yes | Default on creation |
| `published` | Yes (if `publishedAt ≤ now`) | Yes | Public endpoints filter by this |
| `archived` | No | Yes | Soft-removed from public view |

### Publishing Rules

1. **Create** → status defaults to `draft`, `publishedAt` is null.
2. **Publish** → sets `status = 'published'` and `publishedAt = now()`.
3. **Unpublish** → reverts `status = 'draft'`, `publishedAt` is cleared.
4. **Archive** → set `status = 'archived'` via update.

### Scheduling (Future Publish)

Set `scheduledAt` to a future date and `status = 'scheduled'`. Scheduled posts remain hidden from public endpoints until an admin publishes them; there is currently no scheduler that automatically flips `scheduled` posts to `published`.

Public listing queries filter:

```sql
WHERE status = 'published' AND published_at <= NOW()
```

---

## Key Files

| File | Purpose |
|------|---------|
| `shared/schema.ts` | Drizzle table + Zod insert schema |
| `server/src/services/cms.posts.service.ts` | Business logic (list, create, publish, etc.) |
| `server/src/repositories/cms.posts.repo.ts` | Database queries |
| `server/src/routes/admin/cms-posts-v2.routes.ts` | Admin API routes |
| `server/src/routes/public/blog-v2.routes.ts` | Public read-only routes |
| `client/src/pages/admin-cms-posts.tsx` | Admin UI for post management |

---

## Availability

Posts are always active as part of the CMS subsystem. No feature flag is required.
