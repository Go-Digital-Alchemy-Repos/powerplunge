# Blog Page Template & blogPostFeed Block

The CMS v2 page builder supports a `blogPostFeed` block that enables admins to create custom blog index pages using the visual page builder.

---

## Overview

Instead of hardcoding a `/blog` route, admins can:
1. Create a CMS v2 page (e.g., slug: `blog`).
2. Add the `blogPostFeed` block to the page's content.
3. Publish the page — it renders a dynamic blog post listing at `/page/blog`.

This approach allows full control over the blog layout, surrounding content, and SEO.

---

## blogPostFeed Block

### Block Registration

The block is registered in the CMS v2 block registry and available in the Puck page builder sidebar.

### Block Data Schema

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | string | `"Latest Posts"` | Heading displayed above the post grid |
| `subtitle` | string | `""` | Optional subheading |
| `postsPerPage` | number | `6` | Number of posts to display |
| `layout` | `"grid"` \| `"list"` | `"grid"` | Display layout |
| `showExcerpt` | boolean | `true` | Show post excerpt text |
| `showFeaturedImage` | boolean | `true` | Show post thumbnail |
| `showTags` | boolean | `true` | Show tag badges |
| `showCategory` | boolean | `true` | Show category label |
| `showDate` | boolean | `true` | Show published date |
| `filterByCategory` | string | `""` | Limit to specific category |
| `filterByTag` | string | `""` | Limit to specific tag |

### Rendering Behavior

1. The block fetches from `GET /api/blog/posts` at render time.
2. If `filterByCategory` or `filterByTag` is set, client-side filtering is applied.
3. Posts are displayed in a responsive grid (2-3 columns) or vertical list.
4. Each post card links to `/blog/:slug` (or configurable link pattern).
5. If no posts exist, a friendly empty state is shown.

---

## Creating a Blog Page

### Step-by-Step

1. Navigate to `/admin/cms-v2/pages`.
2. Click **Create Page**.
3. Set Title: "Blog", Slug: "blog".
4. Open the page in the **Builder**.
5. Add a `blogPostFeed` block from the sidebar.
6. Configure display options (layout, filters, etc.).
7. Optionally add a Hero block above for branding.
8. **Save** and **Publish** the page.

### Result

The page is accessible at `/page/blog` and dynamically displays published posts.

---

## Combining with Other Blocks

A blog page can include any combination of blocks:

```
┌──────────────────┐
│   Hero Block     │  ← Branding / hero image
├──────────────────┤
│  blogPostFeed    │  ← Dynamic post listing
├──────────────────┤
│  Call to Action  │  ← Newsletter signup
└──────────────────┘
```

---

## Key Files

| File | Purpose |
|------|---------|
| `client/src/cms/blocks/BlogPostFeedBlock.tsx` | Block component + Puck config |
| `server/src/routes/public/blog.routes.ts` | API providing post data |
| `client/src/pages/admin-cms-v2-pages.tsx` | Page builder integration |
