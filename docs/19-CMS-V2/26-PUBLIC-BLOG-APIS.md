# Public Blog APIs

Public-facing, read-only endpoints for rendering blog content on the storefront.

All routes are defined in `server/src/routes/public/blog.routes.ts` and mounted at `/api/blog`.

---

## Endpoints

### List Published Posts

```
GET /api/blog/posts
```

Returns all posts with `status = 'published'` and `publishedAt <= now()`, ordered by `publishedAt` descending (newest first).

**Response:** `200 OK`

The response may be a paginated object or a plain array depending on configuration:

```json
{
  "data": [
    {
      "id": "abc-123",
      "title": "Cold Plunge Benefits",
      "slug": "cold-plunge-benefits",
      "body": "<p>Detailed article content...</p>",
      "excerpt": "Learn about the health benefits...",
      "featuredImage": "/uploads/plunge-hero.jpg",
      "authorName": "Admin",
      "tags": ["health", "wellness"],
      "category": "guides",
      "status": "published",
      "publishedAt": "2026-01-15T10:00:00.000Z",
      "metaTitle": "Cold Plunge Benefits | Power Plunge",
      "metaDescription": "Learn about cold plunge health benefits.",
      "ogImage": null,
      "createdAt": "2026-01-10T08:00:00.000Z",
      "updatedAt": "2026-01-15T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

**When CMS v2 disabled:** Returns `[]` or `{ "data": [] }`.

---

### Get Post by Slug

```
GET /api/blog/posts/:slug
```

Returns a single published post by its slug. Draft and archived posts return `404`.

**Response:** `200 OK` — single post object (same shape as list item).

**Error:** `404 Not Found`
```json
{ "error": "Post not found" }
```

**When CMS v2 disabled:** Returns `404`.

---

### List Tags

```
GET /api/blog/tags
```

Returns all unique tag strings used across published posts.

**Response:** `200 OK`
```json
["health", "wellness", "recovery", "cold-therapy"]
```

**When CMS v2 disabled:** Returns `[]`.

---

### List Categories

```
GET /api/blog/categories
```

Returns all unique category strings used across published posts.

**Response:** `200 OK`
```json
["guides", "news", "tutorials"]
```

**When CMS v2 disabled:** Returns `[]`.

---

## Feature Flag Behavior

All public blog endpoints check `isCmsV2Enabled()`:
- **Enabled:** Normal behavior
- **Disabled:** List endpoints return `[]`, single-item endpoints return `404`

---

## Draft Filtering

Public endpoints **never** expose draft or archived posts. The service layer applies:

```sql
WHERE status = 'published' AND published_at <= NOW()
```

This also enables scheduled publishing — set `publishedAt` to a future date and the post appears automatically when the time arrives.

---

## Integration with Frontend

The storefront blog page uses these APIs via React Query:

```tsx
const { data: posts } = useQuery({
  queryKey: ["/api/blog/posts"],
});
```

Individual post pages fetch by slug:

```tsx
const { data: post } = useQuery({
  queryKey: [`/api/blog/posts/${slug}`],
});
```

---

## Key Files

| File | Purpose |
|------|---------|
| `server/src/routes/public/blog.routes.ts` | Route definitions |
| `server/src/services/cms-v2-posts.service.ts` | `listPublished()`, `getPublishedBySlug()` |
| `server/src/repositories/cms-v2-posts.repository.ts` | DB queries with status filtering |
