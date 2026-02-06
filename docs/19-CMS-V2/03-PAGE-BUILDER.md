# Page Builder (Puck Editor)

The CMS v2 page builder uses the Puck visual editor library to provide a drag-and-drop block editing experience for admin users.

## Access

The page builder is accessible at:

```
/admin/cms-v2/pages/:id/builder
```

Admin users navigate here by clicking "Edit" or "Open Builder" on any page in the pages list.

## Architecture

```
client/src/pages/admin-cms-v2-builder.tsx  → Main builder page component
@puckeditor/core                           → Puck editor library
client/src/lib/blockRegistry.ts            → Block type definitions
client/src/lib/blockRegistryEntries.ts     → Block registrations
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
