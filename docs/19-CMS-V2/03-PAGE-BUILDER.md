# Page Builder (Puck Editor)

The CMS v2 page builder uses the Puck visual editor library to provide a drag-and-drop block editing experience for admin users.

## Access

The page builder is accessible at:

```
/admin/cms-v2/pages/:id/builder     → Page builder
/admin/cms-v2/posts/:id/builder     → Post builder
```

Admin users navigate here by clicking "Edit" or "Open Builder" on any page/post in the list.

## Architecture

```
client/src/pages/admin-cms-v2-builder.tsx       → Page builder component
client/src/pages/admin-cms-v2-post-builder.tsx   → Post builder component
client/src/cms/blocks/registry.ts                → Block type definitions (Map-based)
client/src/cms/blocks/entries.ts                 → Block registrations (registerCmsV1Blocks)
client/src/cms/blocks/types.ts                   → TypeScript interfaces
client/src/cms/blocks/schemas.ts                 → Zod validation schemas
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `buildPuckConfig()` | Converts block registry entries into Puck component config |
| `puckDataToContentJson(data)` | Converts Puck editor state to `contentJson` format |
| `contentJsonToPuckData(contentJson)` | Converts stored `contentJson` to Puck editor state |

## Editor Components

### Header Actions

The builder injects custom buttons into the Puck header:

- **SEO** — Opens the SEO settings slide-out panel
- **Insert Section** — Opens dialog to insert a saved section
- **Detach Sections** — Converts `sectionRef` blocks into inline blocks
- **Save Draft** — Saves current content without publishing
- **Publish** — Saves and publishes the page

### SEO Panel

A slide-out panel accessible via the "SEO" button in the header. Fields include:

- Meta Title and Description
- Canonical URL
- Robots directive (index/noindex, follow/nofollow)
- Open Graph: title, description, image
- Twitter Card: type, title, description, image
- JSON-LD structured data (raw JSON editor)

See [SEO Documentation](06-SEO.md) for details.

### Insert Section

Opens a dialog listing all saved sections. Clicking a section inserts a `sectionRef` block at the end of the page content. The section's blocks are rendered inline but remain linked to the source section.

### Detach Sections

Converts all `sectionRef` blocks in the current page into their constituent inline blocks. This breaks the link to the saved section, allowing per-page customization. The detach operation:

1. Fetches each referenced section's block data
2. Replaces `sectionRef` blocks with the section's actual blocks
3. Updates the Puck editor state in-place

## Data Flow

### Saving

1. `puckDataToContentJson()` extracts blocks from Puck's `appState.data.content`
2. Each item becomes a block: `{ id, type, data: {props minus id}, settings: {} }`
3. Wrapped in `{ version: 1, blocks: [...] }`
4. SEO fields are merged into the page update
5. `PUT /api/admin/cms-v2/pages/:id` saves everything

### Loading

1. Page data fetched via `GET /api/admin/cms-v2/pages/:id`
2. `contentJsonToPuckData()` converts blocks to Puck format
3. SEO fields populated from page data into `seoData` state
4. Puck editor initializes with the converted data

## Page Title

The page title is editable via the Puck root configuration. It appears as an editable field in the right sidebar when no block is selected. On save, the root title overrides the page's `title` field.

## Troubleshooting

### Builder Shows Blank Canvas

**Cause:** Page has no blocks yet (new or empty page).
**Resolution:** Normal behavior — drag blocks from the sidebar to start building.

### Block Palette Empty

**Cause:** `registerCmsV1Blocks()` was not called at app startup.
**Verification:** Check browser console for "Block registry initialized" log.
**Fix:** Ensure `client/src/cms/blocks/init.ts` is imported in the app entry point.

### Save Returns 400 Error

**Cause:** Content validation failed on the server.
**Check:** Browser Network tab → response body for specific validation error.
**Common:** Block missing `id` or `type` field, or `contentJson` is malformed.

### Blocks Not Rendering in Preview

**Cause:** Block type key mismatch between Puck config and registry.
**Verification:** Compare block `type` in saved data with `entries.ts` registration keys.

### SEO Panel Not Opening

**Cause:** JavaScript error preventing panel render.
**Fix:** Check browser console for errors. Hard-refresh the page.

### Insert Section Shows Empty List

**Cause:** No saved sections exist.
**Fix:** Create sections at `/admin/cms-v2/sections` or seed kits via API.

## How to Verify

1. Navigate to `/admin/cms-v2/pages/:id/builder` — editor should render
2. Drag a block from sidebar — block appears in editor
3. Edit block properties in right sidebar — changes reflect in preview
4. Click **Save Draft** — page saves without errors
5. Click **Publish** — page status changes to published
6. Visit `/page/:slug` — page renders with saved blocks
