# Page Templates

Templates provide pre-configured starting points for new CMS pages. They define an initial set of blocks that can be customized after creation.

## Template Field

Each page has an optional `template` field:

```sql
template TEXT  -- Optional: default | hero-left | hero-center | etc.
```

Templates are applied at page creation time. Once a page is created from a template, its blocks can be freely edited — the template serves only as the initial scaffold.

## Available Templates

| Template ID | Name | Description |
|-------------|------|-------------|
| `default` | Default | Blank page with no preset blocks |
| `hero-left` | Hero Left | Left-aligned hero with text and image |
| `hero-center` | Hero Center | Center-aligned hero banner |

## Page Types

Pages are categorized by their `pageType` field:

| Type | Purpose |
|------|---------|
| `home` | Homepage — only one allowed (enforced by `isHome` flag) |
| `shop` | Shop page — only one allowed (enforced by `isShop` flag) |
| `landing` | Marketing landing pages |
| `page` | General-purpose pages |

## Admin UI

Templates are managed at `/admin/cms-v2/templates`. When creating a new page from the pages list, users can optionally select a template as a starting point.

## Uniqueness Enforcement

The storage layer enforces that only one page can be the home page and only one can be the shop page:

- **Set Home:** `POST /api/admin/cms-v2/pages/:id/set-home` clears `isHome` on all other pages, then sets it on the target
- **Set Shop:** `POST /api/admin/cms-v2/pages/:id/set-shop` clears `isShop` on all other pages, then sets it on the target

Both operations use database transactions to prevent race conditions.
