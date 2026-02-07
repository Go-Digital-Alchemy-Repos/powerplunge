# CMS v2 Overview

CMS v2 is a block-based page builder system for Power Plunge. It provides a visual editor for creating and managing pages using reusable content blocks, saved sections, themeable design, and comprehensive SEO controls.

## Feature Flag

CMS v2 is controlled by the `CMS_V2_ENABLED` environment variable:

- **Default:** `false` (disabled)
- **Enable:** Set `CMS_V2_ENABLED=true` in the environment

The feature flag is checked via `isCmsV2Enabled()` in `server/src/config/env.ts`. The CMS v2 admin routes are always mounted (the flag controls feature visibility at the application level). CMS v2 is fully non-destructive — it shares the same `pages` database table but stores block content in the `contentJson` JSONB column alongside the legacy `content` HTML field.

## Architecture

```
shared/schema.ts                    → Page & SavedSection schemas, Zod validation
server/src/
  routes/admin/cms-v2.router.ts     → All CMS v2 API endpoints
  services/cms-v2.service.ts        → Business logic layer
  services/sections.service.ts      → Reusable sections service
  repositories/cms-v2.repository.ts → Database queries
client/src/
  pages/admin-cms-v2-*.tsx          → Admin UI pages (8 pages)
  cms/blocks/registry.ts            → Block type registry (Map-based)
  cms/blocks/entries.ts             → 12 registered block types
  cms/blocks/schemas.ts             → Zod validation schemas per block
  cms/blocks/types.ts               → TypeScript interfaces
  cms/blocks/blockCategories.ts     → Block category definitions (single source of truth)
  cms/themes/presets.ts             → 10 CSS-variable theme presets
  cms/themes/applyTheme.ts          → Theme CSS variable injection
  cms/themes/themeTokens.types.ts   → Token schema interfaces
  cms/themes/themeTokens.defaults.ts → Default token values
  components/admin/CmsV2Layout.tsx  → Shared admin layout wrapper
```

## Key Concepts

### Pages

Every page has a `title`, `slug`, `status` (draft/published), and optional block content (`contentJson`). Pages can be designated as the **home page** or **shop page** — only one of each is allowed, enforced at the storage layer.

### Blocks

Blocks are the atomic content units. Each block has a `type`, `data` (props), and `settings`. The block registry defines 12 types across six categories: layout, marketing, ecommerce, trust, media, and utility. See [Block Registry](02-BLOCK-REGISTRY.md). Domain-specific blocks for cold plunge marketing are documented in [Power Plunge Blocks](11-POWERPLUNGE-BLOCKS.md).

### Sections & Kits

Saved sections are reusable groups of blocks. They can be inserted into any page via a `sectionRef` block. Sections can also be "detached" — converting the reference into inline blocks for per-page customization. See [Sections](04-SECTIONS.md). Pre-built section kits are documented in [Page Kits](12-PAGE-KITS.md).

### Landing Page Generator

A 4-step wizard that assembles landing pages from templates, products, and section kits using a deterministic pure-function engine. See [Landing Page Generator](13-LANDING-PAGE-GENERATOR.md).

### Themes

10 built-in CSS-variable theme presets control colors, typography, and border radius across the entire storefront. Themes are activated instantly from the admin. See [Themes](07-THEMES.md).

### SEO

Every page has full SEO controls: meta title/description, Open Graph, Twitter Cards, canonical URLs, robots directives, and JSON-LD structured data. See [SEO](06-SEO.md).

## Admin Pages

| Route | Purpose |
|-------|---------|
| `/admin/cms-v2` | CMS v2 dashboard |
| `/admin/cms-v2/pages` | Pages list with create, edit, publish, migrate |
| `/admin/cms-v2/pages/:id/builder` | Visual page builder (Puck editor) |
| `/admin/cms-v2/sections` | Manage reusable sections |
| `/admin/cms-v2/templates` | Page templates |
| `/admin/cms-v2/themes` | Theme management with instant activation |
| `/admin/cms-v2/generator/landing` | Landing Page Generator wizard |
| `/admin/cms-v2/seo` | SEO management |

## Public Routes

| Route | Purpose |
|-------|---------|
| `/page/:slug` | Renders published CMS pages |
| `/api/pages/home` | Returns the published home page |
| `/api/pages/shop` | Returns the published shop page |
| `/api/pages/:slug` | Returns page data by slug |
