# CMS v2 Overview

CMS v2 is a block-based page builder system for Power Plunge. It provides a visual editor for creating and managing pages using reusable content blocks, saved sections, themeable design, comprehensive SEO controls, a blog/posts subsystem, and configurable navigation menus.

## Feature Flag

CMS v2 is controlled by the `CMS_V2_ENABLED` environment variable:

- **Default:** `false` (disabled)
- **Enable:** Set `CMS_V2_ENABLED=true` in the environment

The feature flag is checked via `isCmsV2Enabled()` in `server/src/config/env.ts`. The CMS v2 admin routes are always mounted (the flag controls feature visibility at the application level). CMS v2 is fully non-destructive — it shares the same `pages` database table but stores block content in the `contentJson` JSONB column alongside the legacy `content` HTML field. Posts and menus use their own dedicated tables (`cms_v2_posts`, `cms_v2_menus`).

### Rollout

1. Set `CMS_V2_ENABLED=true`
2. Restart the application
3. CMS v2 sidebar appears in admin navigation
4. Existing pages continue to work (legacy HTML rendering is preserved)
5. New pages can be created with the block-based builder
6. Posts and menus subsystems become active

### Rollback

1. Set `CMS_V2_ENABLED=false`
2. Restart the application
3. CMS v2 sidebar is hidden; admin API routes remain mounted but feature-gated
4. Public blog endpoints return empty arrays
5. Public menu endpoints return `null`
6. Existing pages continue to render (blocks are preserved in database)
7. No data is deleted — re-enabling the flag restores everything

## Architecture

```
shared/schema.ts                              → Page, SavedSection, CmsV2Post, CmsV2Menu schemas + Zod validation

server/src/
  config/env.ts                               → isCmsV2Enabled() feature flag
  routes/admin/cms-v2.router.ts               → Pages, sections, themes, packs, presets, settings API
  routes/admin/cms-v2-posts.routes.ts         → Admin posts API (CRUD, publish, unpublish)
  routes/admin/cms-v2-menus.routes.ts         → Admin menus API (CRUD, by-location upsert)
  routes/public.blog.routes.ts                 → Public blog API (list, by-slug, tags, categories)
  services/cms-v2.service.ts                  → Pages/themes/presets business logic
  services/cms-v2-posts.service.ts            → Posts business logic
  services/cms-v2-menus.service.ts            → Menus business logic
  repositories/cms-v2.repository.ts           → Page/section/theme DB queries
  repositories/cms-v2-posts.repository.ts     → Posts DB queries
  repositories/cms-v2-menus.repository.ts     → Menus DB queries
  schemas/cms-v2.schema.ts                    → Page Zod schemas
  schemas/cmsV2.posts.schema.ts               → Post Zod schemas
  utils/contentValidation.ts                  → contentJson validation + HTML sanitization

client/src/
  pages/admin-cms-v2.tsx                      → CMS v2 dashboard
  pages/admin-cms-v2-pages.tsx                → Page list + create dialog
  pages/admin-cms-v2-builder.tsx              → Puck visual editor for pages
  pages/admin-cms-v2-posts.tsx                → Post library
  pages/admin-cms-v2-post-editor.tsx          → Post form editor
  pages/admin-cms-v2-post-builder.tsx         → Puck visual editor for posts
  pages/admin-cms-v2-menus.tsx                → Menu manager with drag-and-drop
  pages/admin-cms-v2-sections.tsx             → Saved sections manager
  pages/admin-cms-v2-templates.tsx            → Template browser
  pages/admin-cms-v2-themes.tsx               → Themes + theme packs
  pages/admin-cms-v2-presets.tsx              → Site presets manager
  pages/admin-cms-v2-seo.tsx                  → SEO management
  pages/admin-cms-v2-settings.tsx             → Site settings
  pages/admin-cms-v2-generator-landing.tsx    → Landing page generator wizard
  pages/admin-cms-v2-generator-campaigns.tsx  → Campaign packs generator
  cms/blocks/registry.ts                      → Block type registry (Map-based)
  cms/blocks/entries.ts                       → 25 registered block types
  cms/blocks/schemas.ts                       → Zod validation schemas per block
  cms/blocks/types.ts                         → TypeScript interfaces
  cms/blocks/blockCategories.ts               → Block category definitions (single source of truth)
  cms/themes/presets.ts                       → 10 CSS-variable theme presets
  cms/themes/applyTheme.ts                    → Theme CSS variable injection
  cms/themes/themeTokens.types.ts             → Token schema interfaces
  cms/themes/themeTokens.defaults.ts          → Default token values
  components/admin/CmsV2Layout.tsx            → Shared admin layout wrapper
  components/DynamicNav.tsx                   → Public menu renderer component
  blog/BlogIndexPage.tsx                      → Public blog listing page
  blog/BlogPostPage.tsx                       → Public blog post detail page
```

### Database Tables

| Table | Purpose |
|-------|---------|
| `pages` | CMS pages (shared with legacy CMS) — contentJson stores block data |
| `saved_sections` | Reusable block groups |
| `site_settings` | Active theme, preset, nav, footer, SEO, CTA defaults |
| `cms_v2_posts` | Blog posts with status workflow and SEO fields |
| `cms_v2_menus` | Navigation menus with nested items and location binding |

## Key Concepts

### Pages

Every page has a `title`, `slug`, `status` (draft/published), and optional block content (`contentJson`). Pages can be designated as the **home page** or **shop page** — only one of each is allowed, enforced at the storage layer.

### Blocks

Blocks are the atomic content units. Each block has a `type`, `data` (props), and `settings`. The block registry defines 12 types across six categories: layout, marketing, ecommerce, trust, media, and utility. See [Block Registry](02-BLOCK-REGISTRY.md). Domain-specific blocks for cold plunge marketing are documented in [Power Plunge Blocks](11-POWERPLUNGE-BLOCKS.md).

### Sections & Kits

Saved sections are reusable groups of blocks. They can be inserted into any page via a `sectionRef` block. Sections can also be "detached" — converting the reference into inline blocks for per-page customization. See [Sections](04-SECTIONS.md). Pre-built section kits are documented in [Page Kits](12-PAGE-KITS.md).

### Landing Page Generator

A 4-step wizard that assembles landing pages from templates, products, and section kits using a deterministic pure-function engine. See [Landing Page Generator](13-LANDING-PAGE-GENERATOR.md).

### Campaign Packs

Pre-defined collections of coordinated landing pages for seasonal promotions and targeted campaigns. Campaign packs automate multi-page generation using the same assembly engine. See [Campaign Packs](14-CAMPAIGN-PACKS.md).

### Themes

10 built-in CSS-variable theme presets control colors, typography, and border radius across the entire storefront. Themes are activated instantly from the admin. See [Themes](07-THEMES.md).

### Theme Packs

Theme packs bundle color themes, component variant selections, and block style defaults into a single activatable design identity. 5 built-in packs provide curated visual styles. See [Theme Packs](15-THEME-PACKS.md), [Component Variants](16-COMPONENT-VARIANTS.md), and [Block Style Defaults](17-BLOCK-STYLE-DEFAULTS.md).

### Site Presets

Site Presets are full-site composition bundles that package a theme pack, navigation, footer, SEO defaults, CTA defaults, homepage template, and section kits into a single activatable configuration. They provide one-click site identity management with preview, activate, and rollback capabilities. 6 built-in starter presets are available. See [Site Presets Overview](18-SITE-PRESETS-OVERVIEW.md), [Apply Engine + History](19-APPLY-ENGINE-HISTORY.md), [Presets Manager UI](20-PRESETS-MANAGER-UI.md), [Export/Import](21-EXPORT-IMPORT.md), and [Preset-Aware Campaigns](22-PRESET-AWARE-CAMPAIGNS.md).

### Blog Posts

Posts provide a blog/content marketing subsystem with a full status workflow (draft → published → archived), scheduled publishing via `publishedAt`, tags, categories, SEO fields, and a rich text/block editor. See [Posts Overview](24-POSTS-OVERVIEW.md), [Posts Admin UI](25-POSTS-ADMIN-UI.md), [Public Blog APIs](26-PUBLIC-BLOG-APIS.md), and [Blog Page Template](27-BLOG-PAGE-TEMPLATE.md).

### Navigation Menus

Configurable navigation menus with drag-and-drop reordering, nested children (up to depth 3), location binding (e.g., `main`, `footer`), and active/inactive state. The `DynamicNav` component renders the active menu on the public storefront with graceful fallback. See [Navigation Menus](28-NAVIGATION-MENUS.md).

### Rendering

Pages use a blocks-first rendering pipeline: if `contentJson.blocks[]` has entries, blocks render via the registry; otherwise legacy HTML renders via sanitized `dangerouslySetInnerHTML`. See [Rendering Rules](23-RENDERING-RULES.md).

### SEO

Every page has full SEO controls: meta title/description, Open Graph, Twitter Cards, canonical URLs, robots directives, and JSON-LD structured data. Posts have their own SEO fields. See [SEO](06-SEO.md) and [SEO for Posts](29-SEO-POSTS.md).

## Admin Pages

| Route | Purpose |
|-------|---------|
| `/admin/cms-v2` | CMS v2 dashboard |
| `/admin/cms-v2/pages` | Pages list with create, edit, publish, migrate |
| `/admin/cms-v2/pages/:id/builder` | Visual page builder (Puck editor) |
| `/admin/cms-v2/posts` | Blog post library |
| `/admin/cms-v2/posts/:id/edit` | Blog post form editor |
| `/admin/cms-v2/posts/:id/builder` | Blog post visual builder |
| `/admin/cms-v2/menus` | Navigation menus manager with drag-and-drop |
| `/admin/cms-v2/sections` | Manage reusable sections |
| `/admin/cms-v2/templates` | Page templates |
| `/admin/cms-v2/themes` | Theme management with instant activation |
| `/admin/cms-v2/generator/landing` | Landing Page Generator wizard |
| `/admin/cms-v2/generator/campaigns` | Campaign Packs generator (preset-aware) |
| `/admin/cms-v2/presets` | Site Presets manager (create, activate, rollback, export/import) |
| `/admin/cms-v2/seo` | SEO management |
| `/admin/cms-v2/settings` | Site-wide settings |

## Public Routes

| Route | Purpose |
|-------|---------|
| `/page/:slug` | Renders published CMS pages |
| `/blog` | Blog index page (published posts) |
| `/blog/:slug` | Individual blog post page |
| `/api/pages/home` | Returns the published home page |
| `/api/pages/shop` | Returns the published shop page |
| `/api/pages/:slug` | Returns page data by slug |
| `/api/blog/posts` | Returns published posts (paginated) |
| `/api/blog/posts/:slug` | Returns single post by slug |
| `/api/blog/tags` | Returns unique tags array |
| `/api/blog/categories` | Returns unique categories array |
| `/api/menus/:location` | Returns active menu by location (or `null`) |
| `/api/theme/active` | Returns active theme tokens |
| `/api/site-settings` | Returns public site settings |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CMS_V2_ENABLED` | `false` | Feature flag for all CMS v2 features |
| `DATABASE_URL` | — | PostgreSQL connection string (required) |

## Verification

Run all CMS v2 health checks:

```bash
npx tsx scripts/db/verifySchema.ts    # 67 tables including cms_v2_posts, cms_v2_menus
npx tsx scripts/smoke/apiSmoke.ts     # 22 endpoint checks
npx tsx scripts/smoke/blogSmoke.ts    # 19 post lifecycle tests
npx tsx scripts/smoke/cmsContentSafety.ts  # 21 content validation tests
```

## Documentation Index

| Doc | Topic |
|-----|-------|
| [Block Registry](02-BLOCK-REGISTRY.md) | Block types, categories, validation, UnknownBlock, how to add |
| [Page Builder](03-PAGE-BUILDER.md) | Puck editor, save/publish flow, data conversion |
| [Sections](04-SECTIONS.md) | sectionRef, detach, rendering, caching |
| [Templates](05-TEMPLATES.md) | Creation, duplication, page-from-template |
| [SEO](06-SEO.md) | Meta tags, OG, Twitter, robots, JSON-LD |
| [Themes](07-THEMES.md) | Token schema, presets, preview vs activate, CSS variables |
| [Migration](08-MIGRATION.md) | Legacy HTML → block migration |
| [API Reference](09-API-REFERENCE.md) | Full endpoint list with request/response |
| [Admin UX](10-ADMIN-UX.md) | Admin interface patterns |
| [Power Plunge Blocks](11-POWERPLUNGE-BLOCKS.md) | Domain-specific blocks |
| [Page Kits](12-PAGE-KITS.md) | Pre-built section kits |
| [Landing Page Generator](13-LANDING-PAGE-GENERATOR.md) | 4-step wizard |
| [Campaign Packs](14-CAMPAIGN-PACKS.md) | Multi-page generation |
| [Theme Packs](15-THEME-PACKS.md) | Tokens + variants + defaults bundles |
| [Component Variants](16-COMPONENT-VARIANTS.md) | Shape/spacing controls |
| [Block Style Defaults](17-BLOCK-STYLE-DEFAULTS.md) | Per-block defaults |
| [Site Presets](18-SITE-PRESETS-OVERVIEW.md) | Full-site composition |
| [Apply Engine](19-APPLY-ENGINE-HISTORY.md) | Preset activation + rollback |
| [Presets UI](20-PRESETS-MANAGER-UI.md) | Preset admin interface |
| [Export/Import](21-EXPORT-IMPORT.md) | Preset portability |
| [Preset Campaigns](22-PRESET-AWARE-CAMPAIGNS.md) | Preset-aware campaign generation |
| [Rendering Rules](23-RENDERING-RULES.md) | Blocks vs HTML, sanitization, error boundary |
| [Posts Overview](24-POSTS-OVERVIEW.md) | Blog data model, status workflow |
| [Posts Admin UI](25-POSTS-ADMIN-UI.md) | Post editor and library |
| [Public Blog APIs](26-PUBLIC-BLOG-APIS.md) | Blog endpoints |
| [Blog Page Template](27-BLOG-PAGE-TEMPLATE.md) | blogPostFeed block |
| [Navigation Menus](28-NAVIGATION-MENUS.md) | Menu data, drag-and-drop, locations |
| [SEO for Posts](29-SEO-POSTS.md) | Post-specific SEO |
| [Troubleshooting](30-TROUBLESHOOTING.md) | All subsystems: issues, fixes, verification |
