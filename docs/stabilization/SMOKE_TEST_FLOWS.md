# Smoke Test Flows

Manual verification checklist for critical CMS and public-facing flows.
Run these after any stabilization change to confirm nothing is broken.

---

## ADMIN CMS

### A1. Load CMS Dashboard
1. Log in at `/admin` with admin credentials.
2. Navigate to `/admin/cms`.
3. **Verify:** Dashboard cards render (Pages, Sections, Templates, Themes, SEO, Settings, Generator).
4. **Verify:** No console errors.

### A2. Open Pages Library
1. From the CMS dashboard, click **Manage Pages** (or navigate to `/admin/cms/pages`).
2. **Verify:** Page list loads. If pages exist, they appear with title, slug, status badge.
3. **Verify:** "Create Page" button is visible.

### A3. Create a Draft Page
1. On the Pages library, click **Create Page**.
2. Fill in Title (e.g. "Smoke Test Page") and Slug (e.g. "smoke-test").
3. Leave status as Draft.
4. Click **Save** / **Create**.
5. **Verify:** Page appears in the list with "Draft" status badge.
6. **Verify:** No errors in console or toast.

### A4. Open Puck Builder
1. From the Pages list, click the **Edit** / **Builder** button on the smoke test page.
2. **Verify:** Puck editor loads at `/admin/cms/pages/:id/builder`.
3. **Verify:** Block palette is visible on the left side.
4. **Verify:** Canvas area renders without errors.

### A5. Add 2 Blocks and Save
1. In the Puck builder, drag or click to add a **Hero** block.
2. Configure any placeholder text.
3. Add a second block (e.g. **Rich Text** or **Features**).
4. Click **Save**.
5. **Verify:** Toast confirms save success.
6. **Verify:** Both blocks appear in the canvas and component tree.

### A6. Publish and Preview Public Rendering
1. In the builder or pages list, click **Publish** on the smoke test page.
2. **Verify:** Status changes to "Published".
3. Open a new tab and navigate to `/page/smoke-test`.
4. **Verify:** The page renders with the 2 blocks added in A5.
5. **Verify:** No 404 or blank page.

### A7. Create a Section and Insert into Page (sectionRef)
1. Navigate to `/admin/cms/sections`.
2. Click **Create Section**.
3. Name it (e.g. "Smoke CTA Section"), choose a type, add content.
4. Save the section.
5. **Verify:** Section appears in the sections list.
6. Go back to the Puck builder for the smoke test page.
7. Add a **Section Reference** block and select the newly created section.
8. Save the page.
9. **Verify:** The section content renders in the builder preview.

### A8. Detach Section
1. In the Puck builder, find the section reference block from A7.
2. Click the **Detach** / **Unlink** action on the section reference.
3. **Verify:** The block converts to inline content (no longer linked to the saved section).
4. Save the page.
5. **Verify:** Save succeeds. The block content persists but is now independent.

### A9. Create Template from a Page
1. Navigate to `/admin/cms/templates`.
2. Click **Create Template** (or use the "Save as Template" action from a page).
3. Select the smoke test page as source (if applicable) or configure manually.
4. **Verify:** Template appears in the templates list.
5. **Verify:** Template shows a preview or metadata of its blocks.

### A10. Switch Theme, Preview, Activate
1. Navigate to `/admin/cms/themes`.
2. **Verify:** Theme list loads with available themes/theme packs.
3. Click on a different theme to preview.
4. **Verify:** Preview shows the updated colors/fonts.
5. Click **Activate** on the new theme.
6. **Verify:** Toast confirms activation.
7. Navigate to the public home page `/` in a new tab.
8. **Verify:** Theme change is reflected (colors, fonts match activated theme).

---

## BLOG POSTS

### B1. Create a Blog Post
1. Navigate to `/admin/cms/posts`.
2. Click **New Post**.
3. Fill in Title: "Smoke Blog Post", Slug: "smoke-blog-post".
4. Add Body text, set Tags: ["smoke"], Category: "testing".
5. Click **Save**.
6. **Verify:** Post appears in list with "Draft" status.

### B2. Publish Blog Post
1. On the post row, click **Publish**.
2. **Verify:** Status changes to "Published", `publishedAt` is set.

### B3. Public Blog List
1. `curl http://localhost:5000/api/blog/posts`
2. **Verify:** Response includes the published post.
3. **Verify:** Draft/archived posts are NOT in the response.

### B4. Public Blog Post by Slug
1. `curl http://localhost:5000/api/blog/posts/smoke-blog-post`
2. **Verify:** Returns the post with correct title and body.

### B5. Blog Tags and Categories
1. `curl http://localhost:5000/api/blog/tags`
2. **Verify:** Returns array including "smoke".
3. `curl http://localhost:5000/api/blog/categories`
4. **Verify:** Returns array including "testing".

### B6. Unpublish and Verify Hidden
1. Click **Unpublish** on the smoke blog post.
2. `curl http://localhost:5000/api/blog/posts/smoke-blog-post`
3. **Verify:** Returns 404.

---

## NAVIGATION MENUS

### M1. Create a Menu
1. Navigate to `/admin/cms/menus`.
2. Click **New Menu**.
3. Set Name: "Smoke Main Nav", Location: "main", Active: true.
4. Click **Add Item** → select "External", Label: "Blog", URL: "/blog".
5. Click **Add Item** → select "External", Label: "Shop", URL: "/shop".
6. Click **Save**.
7. **Verify:** Menu appears in the list.

### M2. Verify Public Menu Endpoint
1. `curl http://localhost:5000/api/menus/main`
2. **Verify:** Returns menu object with 2 items.

### M3. Verify DynamicNav Rendering
1. Navigate to `/` in the browser.
2. **Verify:** "Blog" and "Shop" links appear in the header nav.
3. **Verify:** Links are clickable and navigate correctly.

### M4. Drag-and-Drop Reorder
1. In the menus admin, drag the "Shop" item above "Blog".
2. Click **Save**.
3. **Verify:** Order is preserved after reload.

### M5. Delete Menu and Verify Fallback
1. Delete the smoke menu.
2. `curl http://localhost:5000/api/menus/main`
3. **Verify:** Returns null.
4. Navigate to `/` — no crash, hardcoded nav still works.

---

## PUBLIC

### P1. Load Home Page
1. Navigate to `/`.
2. **Verify:** Hero section renders with product imagery.
3. **Verify:** Product cards or featured product visible.
4. **Verify:** No blank page or error screen.

### P2. Load a Published Block Page by Slug
1. Navigate to `/page/smoke-test` (or any known published page slug).
2. **Verify:** Page renders with block content (hero, text, etc.).
3. **Verify:** No 404 unless the page was unpublished or deleted.

### P3. Load a Legacy HTML Page (If Exists)
1. If a page with legacy HTML content exists (no `contentJson` blocks), navigate to its slug.
2. **Verify:** The HTML content renders via the legacy renderer.
3. **Verify:** No blank output or crash.
4. *Note:* If no legacy pages exist, this test can be skipped.

### P4. Verify Head SEO Tags
1. On any published page, open browser DevTools → Elements.
2. Inspect `<head>`.
3. **Verify:** `<title>` tag is present and matches page title or site default.
4. **Verify:** `og:title`, `og:description` meta tags are present.
5. **Verify:** `twitter:card` meta tag is present.
6. *Note:* Custom `metaTitle`/`metaDescription` from the page should override defaults if set.

---

## ROUTE ARCHITECTURE

### R1. Public Endpoints Respond
1. `curl http://localhost:5000/api/products` — returns JSON array
2. `curl http://localhost:5000/api/pages/home` — returns JSON page object
3. `curl http://localhost:5000/api/site-settings` — returns JSON settings
4. `curl http://localhost:5000/api/stripe/config` — returns JSON with publishableKey
5. **Verify:** All return 200 OK with valid JSON (not 404 or 500).

### R2. Admin Auth Enforced
1. `curl http://localhost:5000/api/admin/orders` (no auth header)
2. **Verify:** Returns 401 Unauthorized.

### R3. Customer Auth Enforced
1. `curl http://localhost:5000/api/customer/profile` (no auth header)
2. **Verify:** Returns 401 Unauthorized.

### R4. Multi-Mount Routers
1. `curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/admin/shipping/zones` — returns shipping zones
2. `curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/admin/orders/1/shipments` — returns shipments (or 404 for order)
3. `curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/admin/dashboard` — returns dashboard stats
4. **Verify:** All return valid responses (not 404). This confirms multi-router exports are mounted correctly.

### R5. Payment Rate Limiting
1. Send 10 rapid requests to `POST /api/create-payment-intent`
2. **Verify:** After threshold, responses return 429 Too Many Requests.

---

## Cleanup

After completing smoke tests, optionally delete the "Smoke Test Page" and "Smoke CTA Section" created during testing to keep the environment clean.

---

## Status Key

| Symbol | Meaning |
|--------|---------|
| PASS   | Flow completed without errors |
| FAIL   | Flow hit a blocking error (document the error) |
| SKIP   | Flow not applicable (e.g. no legacy pages exist) |
| WARN   | Flow completed with non-blocking warnings (document them) |
