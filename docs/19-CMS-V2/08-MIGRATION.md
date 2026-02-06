# Legacy HTML to Blocks Migration

CMS v2 provides a non-destructive migration path for converting legacy HTML pages into the block-based content system.

## Overview

Legacy CMS pages store their content as raw HTML in the `content` text column. CMS v2 pages store structured block data in the `contentJson` JSONB column. The migration tool converts the former into the latter without destroying any data.

## Non-Destructive Guarantee

Migration is fully non-destructive:

- The original `content` HTML field is **never modified or deleted**
- Migration only writes to the `contentJson` field
- If `contentJson` already has blocks, migration is blocked
- The original HTML remains available as a fallback

## How Migration Works

1. The legacy HTML from the `content` field is read
2. A single `richText` block is created wrapping the full HTML
3. The block is written to `contentJson.blocks[]`
4. The `content` field is left untouched

### Resulting Block Structure

```json
{
  "version": 1,
  "blocks": [
    {
      "id": "generated-uuid",
      "type": "richText",
      "data": {
        "content": "<h1>Original</h1><p>Legacy HTML preserved exactly</p>"
      },
      "settings": {}
    }
  ]
}
```

The migration creates a `richText` block (not a generic `htmlBlock`) so the content integrates naturally with the block editing workflow.

## API Endpoint

```
POST /api/admin/cms-v2/pages/:id/migrate-to-blocks
```

**Authentication:** Requires admin session with full access.

**Validation:**

| Check | Response |
|-------|----------|
| Page not found | `404 { error: "Page not found" }` |
| Page already has blocks | `400 { error: "Page already has blocks..." }` |
| Page has no legacy HTML | `400 { error: "Page has no legacy HTML content to migrate." }` |

**Success Response:**

```json
{
  "success": true,
  "message": "Legacy HTML migrated to a richText block. Original HTML preserved in content field.",
  "page": { ... }
}
```

## Admin UI

In the CMS v2 pages list (`/admin/cms-v2/pages`), each page's action menu conditionally shows a **"Migrate to Blocks"** option when:

- The page has legacy HTML content (`content` field is non-empty)
- The page does **not** already have blocks (`contentJson.blocks` is empty or missing)

After migration:

- The "Migrate to Blocks" option disappears from the menu
- The page can be opened in the block editor for further editing
- The "View Live Page" link renders the page through the block system

## Rendering After Migration

The `PageRenderer` component uses this priority:

1. If `contentJson.blocks` exist → render blocks (including migrated `richText`)
2. If only `content` HTML exists → render as legacy HTML fallback

After migration, the page always renders through path 1, using the `richText` block's HTML content with a `.prose` CSS container for typography.

## Rollback

To undo a migration, clear the `contentJson` field for the page. The page will fall back to rendering the preserved `content` HTML:

```sql
UPDATE pages SET content_json = NULL WHERE id = 'page-id';
```

This is safe because the original HTML was never modified.
