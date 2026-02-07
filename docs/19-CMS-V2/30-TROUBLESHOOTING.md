# Troubleshooting & Verification

Common issues and verification steps for the CMS v2 Posts, Blog, and Menus systems.

---

## Quick Health Checks

### 1. Is CMS v2 Enabled?

```bash
curl http://localhost:5000/api/admin/cms-v2/health
```

**Expected:** `200` with `{ "enabled": true, ... }`
**If 403:** Set `CMS_V2_ENABLED=true` in environment variables and restart.

### 2. Are Posts Endpoints Working?

```bash
# Public — should return array (possibly empty)
curl http://localhost:5000/api/blog/posts

# Admin — should return 401 (auth required)
curl http://localhost:5000/api/admin/cms-v2/posts
```

### 3. Are Menu Endpoints Working?

```bash
# Public — should return null or menu object
curl http://localhost:5000/api/menus/main

# Admin — should return 401 (auth required)
curl http://localhost:5000/api/admin/cms-v2/menus
```

---

## Common Issues

### Posts Not Appearing on Public Blog

**Symptom:** `GET /api/blog/posts` returns `[]` even though posts exist.

**Causes:**
1. **Posts are still in draft.** Only `status = 'published'` posts appear publicly.
2. **`publishedAt` is in the future.** The query filters `publishedAt <= now()`.
3. **`CMS_V2_ENABLED` is `false`.** Public endpoints return empty arrays when disabled.

**Fix:** In the admin, verify the post status is "Published" and `publishedAt` is in the past.

### Post Slug Returns 404

**Symptom:** `GET /api/blog/posts/:slug` returns `404`.

**Causes:**
1. **Slug typo.** Verify the slug matches exactly (case-sensitive).
2. **Post is not published.** Draft and archived posts return 404 on public endpoints.
3. **CMS v2 disabled.** Returns 404 for all slugs when disabled.

**Verification:**
```bash
# Check if the post exists (admin)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/admin/cms-v2/posts
```

### Menu Not Rendering on Frontend

**Symptom:** DynamicNav shows nothing even though a menu was created.

**Causes:**
1. **Menu not active.** The `active` flag must be `true`.
2. **Wrong location.** The menu's location must match what DynamicNav requests (e.g., `main`).
3. **No items.** A menu with an empty `items` array renders nothing visible.
4. **CMS v2 disabled.** The public endpoint returns `null` when disabled.

**Verification:**
```bash
curl http://localhost:5000/api/menus/main
```
Should return the menu object with items. If `null`, check admin.

### Drag-and-Drop Not Working in Menus Admin

**Symptom:** Items can't be reordered in the menus admin page.

**Causes:**
1. **Browser compatibility.** Ensure a modern browser (Chrome, Firefox, Safari, Edge).
2. **JavaScript error.** Check browser console for errors.

**Fix:** Hard-refresh the page (`Ctrl+Shift+R`). If persists, check console errors.

### Admin Menus by-location Route Returns 404

**Symptom:** `GET /api/admin/cms-v2/menus/by-location/main` returns 404.

**Cause:** Route ordering issue — the `/by-location/:location` route must be registered before `/:id` in Express to prevent `by-location` from being captured as an ID parameter.

**Verification:** Check `server/src/routes/admin/cms-v2-menus.routes.ts` — the `by-location` routes should appear before `/:id` routes.

---

## Smoke Test Scripts

### Blog Smoke Test

```bash
npx tsx scripts/smoke/blogSmoke.ts
```

Tests the full post lifecycle: create → list → publish → public visibility → unpublish → delete.

### API Smoke Test

```bash
npx tsx scripts/smoke/apiSmoke.ts
```

Hits all key endpoints (public + admin auth enforcement) and reports PASS/FAIL.

### Content Safety Test

```bash
npx tsx scripts/smoke/cmsContentSafety.ts
```

Validates contentJson schema enforcement and HTML sanitization.

---

## Database Verification

### Check Tables Exist

```bash
npx tsx scripts/db/verifySchema.ts
```

Verifies `cms_v2_posts` and `cms_v2_menus` tables exist alongside all other expected tables.

### Manual Table Check

```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('cms_v2_posts', 'cms_v2_menus');
```

### Check Post Data

```sql
SELECT id, title, slug, status, published_at
FROM cms_v2_posts
ORDER BY created_at DESC
LIMIT 10;
```

### Check Menu Data

```sql
SELECT id, name, location, active, jsonb_array_length(items) as item_count
FROM cms_v2_menus;
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CMS_V2_ENABLED` | Yes | Feature flag for all CMS v2 features |
| `DATABASE_URL` | Yes | PostgreSQL connection string |

---

## Endpoint Reference (Quick)

### Posts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/blog/posts` | No | List published posts |
| `GET` | `/api/blog/posts/:slug` | No | Get published post by slug |
| `GET` | `/api/blog/tags` | No | List unique tags |
| `GET` | `/api/blog/categories` | No | List unique categories |
| `GET` | `/api/admin/cms-v2/posts` | Admin | List all posts |
| `POST` | `/api/admin/cms-v2/posts` | Admin | Create post |
| `GET` | `/api/admin/cms-v2/posts/:id` | Admin | Get post by ID |
| `PUT` | `/api/admin/cms-v2/posts/:id` | Admin | Update post |
| `POST` | `/api/admin/cms-v2/posts/:id/publish` | Admin | Publish post |
| `POST` | `/api/admin/cms-v2/posts/:id/unpublish` | Admin | Unpublish post |
| `DELETE` | `/api/admin/cms-v2/posts/:id` | Admin | Delete post |
| `GET` | `/api/admin/cms-v2/posts/check-slug` | Admin | Check slug availability |
| `GET` | `/api/admin/cms-v2/posts/tags` | Admin | List all tags |
| `GET` | `/api/admin/cms-v2/posts/categories` | Admin | List all categories |

### Menus

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/menus/:location` | No | Get active menu by location |
| `GET` | `/api/admin/cms-v2/menus` | Admin | List all menus |
| `POST` | `/api/admin/cms-v2/menus` | Admin | Create menu |
| `GET` | `/api/admin/cms-v2/menus/by-location/:loc` | Admin | Get menu by location |
| `PUT` | `/api/admin/cms-v2/menus/by-location/:loc` | Admin | Upsert menu by location |
| `GET` | `/api/admin/cms-v2/menus/:id` | Admin | Get menu by ID |
| `PUT` | `/api/admin/cms-v2/menus/:id` | Admin | Update menu |
| `DELETE` | `/api/admin/cms-v2/menus/:id` | Admin | Delete menu |
