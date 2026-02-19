# CMS Troubleshooting & Verification

Comprehensive troubleshooting guide covering all CMS subsystems: pages, blocks, builder, sections, templates, themes, theme packs, rendering, posts/blog, and navigation menus.

---

## Quick Health Checks

### 1. Is CMS Healthy?

```bash
curl http://localhost:5000/api/admin/cms/health
```

**Expected:** `200` with `{ "status": "ok", "version": "2.0" }`
**If 401:** You need an admin auth token.

### 2. Are All Tables Present?

```bash
npx tsx scripts/db/verifySchema.ts
```

**Expected:** 80/80 tables pass (including `cms_v2_posts`, `cms_v2_menus`).

### 3. Are All Endpoints Responding?

```bash
npx tsx scripts/smoke/apiSmoke.ts
```

**Expected:** 22/22 pass.

### 4. Is the Blog Subsystem Working?

```bash
npx tsx scripts/smoke/blogSmoke.ts
```

**Expected:** 19/19 pass.

### 5. Is Content Validation Working?

```bash
npx tsx scripts/smoke/cmsContentSafety.ts
```

**Expected:** 21/21 pass.

---

## General Issues

### CMS Sidebar Not Showing in Admin

**Symptom:** Admin nav does not show CMS links (Pages, Posts, Menus, etc.).

**Cause:** CMS routes may not be mounted. Check that CMS router imports are present in `server/routes.ts`.

**Fix:** Ensure the CMS router is correctly imported and mounted.

### CMS API Routes Return 404

**Symptom:** `GET /api/admin/cms/health` returns 404.

**Cause:** Routes not mounted. Check `server/routes.ts` for CMS router imports.

**Verification:**
```bash
grep -r "cms" server/routes.ts
```

---

## Page Issues

### Page Renders Blank

**Symptom:** Navigating to `/page/:slug` shows empty content.

**Causes:**
1. Page has no `contentJson` blocks AND no legacy `content` HTML
2. Page status is "draft" (only published pages render publicly)
3. Block types in `contentJson` are not registered

**Verification:**
```bash
curl http://localhost:5000/api/pages/<slug>
# Check contentJson.blocks array and content field
```

### Can't Set Home/Shop Page

**Symptom:** "Set as Home" or "Set as Shop" returns error.

**Cause:** Database transaction conflict or concurrent update.

**Fix:** Refresh and retry. Check if another page already has the designation.

**Verification:**
```sql
SELECT id, title, is_home, is_shop FROM pages WHERE is_home = true OR is_shop = true;
```

### Duplicate Home/Shop Pages

**Symptom:** Multiple pages have `is_home = true`.

**Cause:** Race condition during concurrent set-home calls.

**Fix:**
```sql
-- Keep only the most recently updated
UPDATE pages SET is_home = false WHERE is_home = true AND id != '<correct-page-id>';
```

### Page Slug Conflict

**Symptom:** `POST /pages` returns 400 or creates duplicate.

**Verification:**
```bash
curl "http://localhost:5000/api/admin/cms/pages/check-slug?slug=<your-slug>"
```

---

## Block & Registry Issues

### Block Renders as Yellow "Unknown Block" Warning

**Symptom:** A yellow warning box appears instead of the block content.

**Causes:**
1. Block type was removed or renamed in the registry
2. `registerCmsV1Blocks()` not called at startup
3. Typo in block type key (keys are case-sensitive, lowerCamelCase)

**Verification:** Check browser console for registry warnings. Verify the block type exists:
```bash
grep -r "registerBlock" client/src/cms/blocks/entries.ts
```

### Block Not Appearing in Editor Palette

**Symptom:** Block type exists in code but doesn't show in the Puck sidebar.

**Causes:**
1. Block not registered via `registerBlock()` in `entries.ts`
2. Block category not defined in `blockCategories.ts`
3. `init.ts` not calling `registerCmsV1Blocks()`

**Verification:** Check `client/src/cms/blocks/entries.ts` for the registration call.

### Block Validation Fails on Save

**Symptom:** Saving a page with a specific block returns a 400 error.

**Cause:** Block data doesn't match its Zod schema in `schemas.ts`.

**Fix:** Check the schema definition and ensure all required fields have defaults.

---

## Page Builder (Puck) Issues

### Builder Won't Load

**Symptom:** `/admin/cms/pages/:id/builder` shows blank or error.

**Causes:**
1. Page ID doesn't exist
2. Puck library not loaded (check browser console for import errors)
3. Block registry not initialized

**Verification:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/admin/cms/pages/<id>
```

### Save Draft / Publish Button Not Working

**Symptom:** Clicking Save or Publish does nothing.

**Causes:**
1. Network error (check browser console Network tab)
2. Auth token expired
3. Content validation failure (check response body for error details)

### Section Insert Dialog Empty

**Symptom:** "Insert Section" dialog shows no sections.

**Cause:** No saved sections exist.

**Fix:** Create sections via `/admin/cms/sections`, or seed kits:
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/admin/cms/sections/seed-kits
```

### Detach Sections Not Working

**Symptom:** "Detach Sections" button does nothing.

**Cause:** No `sectionRef` blocks exist in the current page.

---

## Section Issues

### Section Renders "Section Not Found"

**Symptom:** A `sectionRef` block shows placeholder instead of section content.

**Causes:**
1. The referenced section was deleted
2. The `sectionId` in the block data is incorrect

**Fix:** Either detach the section reference (converts to inline blocks) or re-create the section.

### Deleting a Section Breaks Pages

**Symptom:** Pages that reference a deleted section show "Section not found".

**Note:** Deleting a section is intentionally non-destructive to pages — the `sectionRef` block remains but renders a placeholder. Use "Detach Sections" in the builder before deleting to preserve content.

---

## Template Issues

### Template Not Appearing in Create Dialog

**Symptom:** A template defined in code doesn't show in the page create dialog.

**Cause:** Template not added to the `CMS_TEMPLATES` array in `client/src/cms/templates/templateLibrary.ts`.

### Template Creates Page with Missing Blocks

**Symptom:** Page created from template is missing expected blocks.

**Cause:** Block type keys in template don't match registry keys (case-sensitive).

**Verification:** Compare template block `type` values against `entries.ts` registrations.

---

## Theme Issues

### Theme Not Applying to Public Pages

**Symptom:** Admin activates a theme but public pages don't reflect the change.

**Causes:**
1. `ThemeProvider` not mounted in the public app layout
2. `GET /api/theme/active` returning error (check server logs)
3. Browser cache — theme updates propagate within 30 seconds via refetch

**Verification:**
```bash
curl http://localhost:5000/api/theme/active
# Should return the active theme token object
```

### Preview Mode Persisting After Admin Close

**Symptom:** Theme changes appear stuck after navigating away from themes page.

**Cause:** This shouldn't happen — preview is DOM-only and clears on navigation. If it persists, hard-refresh the browser.

### Unknown Theme ID Falls Back to Default

**Symptom:** Active theme shows as "Ocean Blue" even though a different theme was set.

**Cause:** The stored `active_theme_id` references an unknown preset. The system falls back to `ocean-blue`.

**Verification:**
```sql
SELECT active_theme_id FROM site_settings WHERE id = 'main';
```

---

## Theme Pack Issues

### Theme Pack Overrides Color Theme

**Symptom:** Activating a theme pack changes colors even though a different color theme was active.

**Expected behavior:** Theme packs supersede color themes — they include their own color tokens.

### Component Variants Not Applying

**Symptom:** Theme pack activated but button/card styles don't change.

**Cause:** `--cv-*` CSS variables not being read by components. Check that components reference the correct CSS variable names.

---

## Rendering Issues

### Blocks Render but Legacy HTML Also Appears

**Symptom:** Page shows both block content and raw HTML.

**Cause:** This shouldn't happen — the rendering pipeline uses blocks-first logic. If `contentJson.blocks[]` has entries, legacy `content` is ignored.

**Verification:** Check the page data — if both `contentJson` and `content` are populated, blocks take priority.

### HTML Sanitization Stripping Valid Content

**Symptom:** Content loses formatting after save.

**Cause:** `sanitizeHtml()` strips `<script>`, `on*` handlers, and `javascript:` URIs. If your content relies on these, they will be removed.

**Note:** This is by design for security. Use blocks instead of raw HTML for interactive content.

### Error Boundary Catches Render Crash

**Symptom:** CMS admin page shows "Something went wrong" with a "Try Again" button.

**Cause:** A React rendering error occurred. Check browser console for the specific error and component stack.

---

## Blog Post Issues

### Posts Not Appearing on Public Blog

**Symptom:** `GET /api/blog/posts` returns `[]` even though posts exist.

**Causes:**
1. **Posts are still in draft.** Only `status = 'published'` posts appear publicly.
2. **`publishedAt` is in the future.** The query filters `publishedAt <= now()`.
**Fix:** In the admin, verify the post status is "Published" and `publishedAt` is in the past.

### Post Slug Returns 404

**Symptom:** `GET /api/blog/posts/:slug` returns `404`.

**Causes:**
1. **Slug typo.** Verify the slug matches exactly (case-sensitive).
2. **Post is not published.** Draft and archived posts return 404 on public endpoints.
**Verification:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/admin/cms/posts
```

### Tags/Categories Return Empty

**Symptom:** `GET /api/blog/tags` or `/categories` returns `[]`.

**Causes:**
1. No published posts exist with tags/categories set
2. Tags/categories are stored as arrays/strings on post records — if none are set, endpoints return empty

---

## Navigation Menu Issues

### Menu Not Rendering on Frontend

**Symptom:** DynamicNav shows nothing even though a menu was created.

**Causes:**
1. **Menu not active.** The `active` flag must be `true`.
2. **Wrong location.** The menu's location must match what DynamicNav requests (e.g., `main`).
3. **No items.** A menu with an empty `items` array renders nothing visible.
4. **CMS disabled.** The public endpoint returns `null` when disabled.

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

**Symptom:** `GET /api/admin/cms/menus/by-location/main` returns 404.

**Cause:** Route ordering issue — the `/by-location/:location` route must be registered before `/:id` in Express to prevent `by-location` from being captured as an ID parameter.

**Verification:** Check `server/src/routes/admin/cms-menus.routes.ts` — the `by-location` routes should appear before `/:id` routes.

### Nested Menu Items Not Displaying

**Symptom:** Child menu items don't appear in dropdown.

**Causes:**
1. Children array is empty
2. DynamicNav component doesn't support the nesting depth (max 3 levels)
3. CSS/styling issue hiding the dropdown

---

## Smoke Test Scripts

### Blog Smoke Test

```bash
npx tsx scripts/smoke/blogSmoke.ts
```

Tests the full post lifecycle: create → list → publish → public visibility → unpublish → delete. (19 checks)

### API Smoke Test

```bash
npx tsx scripts/smoke/apiSmoke.ts
```

Hits all key endpoints (public + admin auth enforcement) and reports PASS/FAIL. (22 checks)

### Content Safety Test

```bash
npx tsx scripts/smoke/cmsContentSafety.ts
```

Validates contentJson schema enforcement and HTML sanitization. (21 checks)

---

## Database Verification

### Check Tables Exist

```bash
npx tsx scripts/db/verifySchema.ts
```

Verifies all 80 tables including `cms_v2_posts` and `cms_v2_menus`.

### Manual Table Check

```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('pages', 'saved_sections', 'site_settings', 'cms_v2_posts', 'cms_v2_menus');
```

### Check Page Data

```sql
SELECT id, title, slug, status, is_home, is_shop,
  CASE WHEN content_json IS NOT NULL THEN 'blocks' ELSE 'legacy' END as render_mode
FROM pages ORDER BY created_at DESC LIMIT 10;
```

### Check Post Data

```sql
SELECT id, title, slug, status, published_at
FROM cms_v2_posts
ORDER BY created_at DESC LIMIT 10;
```

### Check Menu Data

```sql
SELECT id, name, location, active, jsonb_array_length(items) as item_count
FROM cms_v2_menus;
```

### Check Theme Settings

```sql
SELECT active_theme_id, active_theme_pack_id
FROM site_settings WHERE id = 'main';
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |

---

## Endpoint Reference (Complete)

### Pages (Admin — `/api/admin/cms`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Service health check |
| `GET` | `/pages` | List all pages |
| `GET` | `/pages/home` | Get home page |
| `GET` | `/pages/shop` | Get shop page |
| `GET` | `/pages/check-slug` | Check slug availability |
| `GET` | `/pages/:id` | Get page by ID |
| `POST` | `/pages` | Create page |
| `PUT` | `/pages/:id` | Update page |
| `POST` | `/pages/:id/publish` | Publish page |
| `POST` | `/pages/:id/unpublish` | Unpublish page |
| `POST` | `/pages/:id/set-home` | Set as home page |
| `POST` | `/pages/:id/set-shop` | Set as shop page |
| `POST` | `/pages/:id/migrate-to-blocks` | Migrate legacy HTML |

### Sections (Admin — `/api/admin/cms`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/sections` | List sections |
| `GET` | `/sections/:id` | Get section |
| `POST` | `/sections` | Create section |
| `PUT` | `/sections/:id` | Update section |
| `DELETE` | `/sections/:id` | Delete section |
| `POST` | `/sections/seed-kits` | Seed kits |

### Themes (Admin — `/api/admin/cms`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/themes` | List presets |
| `GET` | `/themes/active` | Active theme |
| `POST` | `/themes/activate` | Activate theme |
| `GET` | `/theme-packs` | List packs |
| `GET` | `/theme-packs/active` | Active pack |
| `POST` | `/theme-packs/activate` | Activate pack |

### Site Settings (Admin — `/api/admin/cms`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/site-settings` | Get settings |
| `PUT` | `/site-settings` | Update settings |

### Posts (Admin — `/api/admin/cms`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/posts` | List all posts |
| `POST` | `/posts` | Create post |
| `GET` | `/posts/:id` | Get post by ID |
| `PUT` | `/posts/:id` | Update post |
| `POST` | `/posts/:id/publish` | Publish post |
| `POST` | `/posts/:id/unpublish` | Unpublish post |
| `DELETE` | `/posts/:id` | Delete post |
| `GET` | `/posts/check-slug` | Check slug availability |
| `GET` | `/posts/tags` | List all tags |
| `GET` | `/posts/categories` | List all categories |

### Menus (Admin — `/api/admin/cms`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/menus` | List all menus |
| `POST` | `/menus` | Create menu |
| `GET` | `/menus/by-location/:loc` | Get menu by location |
| `PUT` | `/menus/by-location/:loc` | Upsert menu by location |
| `GET` | `/menus/:id` | Get menu by ID |
| `PUT` | `/menus/:id` | Update menu |
| `DELETE` | `/menus/:id` | Delete menu |

### Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/blog/posts` | Published posts (paginated) |
| `GET` | `/api/blog/posts/:slug` | Published post by slug |
| `GET` | `/api/blog/tags` | Unique tags |
| `GET` | `/api/blog/categories` | Unique categories |
| `GET` | `/api/menus/:location` | Active menu by location |
| `GET` | `/api/pages/home` | Published home page |
| `GET` | `/api/pages/shop` | Published shop page |
| `GET` | `/api/pages/:slug` | Published page by slug |
| `GET` | `/api/theme/active` | Active theme tokens |
| `GET` | `/api/site-settings` | Public site settings |
