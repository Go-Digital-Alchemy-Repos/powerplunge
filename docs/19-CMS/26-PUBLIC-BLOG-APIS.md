# Public Blog APIs

Public-facing, read-only endpoints for rendering blog content on the storefront.

All routes are defined in `server/src/routes/public/blog-v2.routes.ts` and mounted at `/api/blog`.

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
      "excerpt": "Learn about the health benefits...",
      "coverImageId": "media-123",
      "coverImageUrl": "/uploads/plunge-hero.jpg",
      "ogImageId": "media-456",
      "readingTimeMinutes": 6,
      "featured": true,
      "allowIndex": true,
      "allowFollow": true,
      "publishedAt": "2026-01-15T10:00:00.000Z",
      "categories": [{ "id": "cat-1", "name": "Guides", "slug": "guides" }],
      "tags": [{ "id": "tag-1", "name": "Recovery", "slug": "recovery" }]
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```


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


---

### List Tags

```
GET /api/blog/tags
```

Returns reusable post tag rows.

**Response:** `200 OK`
```json
[
  { "id": "tag-1", "name": "Recovery", "slug": "recovery", "createdAt": "2026-01-10T08:00:00.000Z" }
]
```

---

### List Categories

```
GET /api/blog/categories
```

Returns reusable post category rows.

**Response:** `200 OK`
```json
[
  { "id": "cat-1", "name": "Guides", "slug": "guides", "description": null, "createdAt": "2026-01-10T08:00:00.000Z" }
]
```

---

## Draft Filtering

Public endpoints **never** expose draft or archived posts. The service layer applies:

```sql
WHERE status = 'published' AND published_at <= NOW()
```

Scheduled posts remain hidden until they are published. There is currently no automatic scheduler that flips `scheduled` posts to `published`.

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
| `server/src/routes/public/blog-v2.routes.ts` | Route definitions |
| `server/src/services/public.blog.service.ts` | `listPublished()`, `getPublishedBySlug()` |
| `server/src/repositories/cms.posts.repo.ts` | DB queries for active post data |
