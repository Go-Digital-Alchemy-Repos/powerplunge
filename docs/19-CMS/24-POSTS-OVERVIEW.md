# Posts Overview

The CMS Posts system provides blog/article management with a full publishing workflow.

---

## Data Model

Posts are stored in the `cms_v2_posts` table.

| Column | Type | Description |
|--------|------|-------------|
| `id` | varchar (UUID) | Primary key, auto-generated |
| `title` | text | Post title (required) |
| `slug` | text (unique) | URL-friendly identifier (required) |
| `body` | text | Rich text / markdown content |
| `excerpt` | text | Short summary for listings and SEO |
| `featuredImage` | text | URL to hero/thumbnail image |
| `authorName` | text | Display name of the author |
| `authorId` | varchar | FK to `admin_users.id` (optional) |
| `tags` | text[] | Array of tag strings |
| `category` | text | Single category string |
| `status` | text | `draft` / `published` / `archived` |
| `publishedAt` | timestamp | Date/time the post went live |
| `metaTitle` | text | SEO title override |
| `metaDescription` | text | SEO description override |
| `ogImage` | text | Open Graph image override |
| `createdAt` | timestamp | Row creation time |
| `updatedAt` | timestamp | Last modification time |

### Drizzle Schema Location

`shared/schema.ts` — search for `cmsPosts`.

### Insert Schema

```ts
import { insertCmsPostSchema } from "@shared/schema";
// Omits: id, createdAt, updatedAt
```

### TypeScript Types

```ts
import type { CmsPost, InsertCmsPost } from "@shared/schema";
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

Set `publishedAt` to a future date and `status = 'published'`. The public listing query filters:

```sql
WHERE status = 'published' AND published_at <= NOW()
```

This means the post becomes visible only when the scheduled time arrives, with no cron needed.

---

## Key Files

| File | Purpose |
|------|---------|
| `shared/schema.ts` | Drizzle table + Zod insert schema |
| `server/src/services/cms-posts.service.ts` | Business logic (list, create, publish, etc.) |
| `server/src/repositories/cms-posts.repository.ts` | Database queries |
| `server/src/routes/admin/cms-posts.routes.ts` | Admin API routes |
| `server/src/routes/public/blog.routes.ts` | Public read-only routes |
| `client/src/pages/admin-cms-posts.tsx` | Admin UI for post management |

---

## Availability

Posts are always active as part of the CMS subsystem. No feature flag is required.
