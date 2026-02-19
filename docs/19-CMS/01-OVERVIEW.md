# CMS Overview

CMS is a block-based page builder system for Power Plunge. It provides a visual editor for creating and managing pages using reusable content blocks, saved sections, themeable design, comprehensive SEO controls, a blog/posts subsystem, and configurable navigation menus.

## Status

CMS is always active. The `CMS_ENABLED` feature flag was previously used during initial development but has been removed. CMS functionality is now permanently enabled.

CMS is fully non-destructive — it shares the same `pages` database table but stores block content in the `contentJson` JSONB column alongside the legacy `content` HTML field. Posts and menus use their own dedicated tables (`cms_v2_posts`, `cms_v2_menus`).

## Architecture

```
shared/schema.ts                              → Page, SavedSection, CmsPost, CmsMenu schemas + Zod validation

server/src/
  routes/admin/cms.router.ts               → Pages, sections, themes, packs, settings API
  routes/admin/cms-posts.routes.ts         → Admin posts API (CRUD, publish, unpublish)
  routes/admin/cms-menus.routes.ts         → Admin menus API (CRUD, by-location upsert)
  routes/public.blog.routes.ts                 → Public blog API (list, by-slug, tags, categories)
  services/cms.service.ts                  → Pages/themes/presets business logic
  services/cms-posts.service.ts            → Posts business logic
  services/cms-menus.service.ts            → Menus business logic
  repositories/cms.repository.ts           → Page/section/theme DB queries
  repositories/cms-posts.repository.ts     → Posts DB queries
  repositories/cms-menus.repository.ts     → Menus DB queries
  schemas/cms.schema.ts                    → Page Zod schemas
  schemas/cms.posts.schema.ts               → Post Zod schemas
  utils/contentValidation.ts                  → contentJson validation + HTML sanitization

client/src/
  pages/admin-cms.tsx                      → CMS dashboard
  pages/admin-cms-pages.tsx                → Page list + create dialog
  pages/admin-cms-builder.tsx              → Puck visual editor for pages
  pages/admin-cms-posts.tsx                → Post library
  pages/admin-cms-post-editor.tsx          → Post form editor
  pages/admin-cms-post-builder.tsx         → Puck visual editor for posts
  pages/admin-cms-menus.tsx                → Menu manager with drag-and-drop
  pages/admin-cms-sections.tsx             → Saved sections manager
  pages/admin-cms-templates.tsx            → Template browser
  pages/admin-cms-themes.tsx               → Themes + theme packs
  pages/admin-cms-seo.tsx                  → SEO management
  pages/admin-cms-settings.tsx             → Site settings
  pages/admin-cms-generator-landing.tsx    → Landing page generator wizard
  pages/admin-cms-generator-campaigns.tsx  → Campaign packs generator
  cms/blocks/registry.ts                      → Block type registry (Map-based)
  cms/blocks/entries.ts                       → 25 registered block types
  cms/blocks/schemas.ts                       → Zod validation schemas per block
  cms/blocks/types.ts                         → TypeScript interfaces
  cms/blocks/blockCategories.ts               → Block category definitions (single source of truth)
  cms/themes/presets.ts                       → 10 CSS-variable theme presets
  cms/themes/applyTheme.ts                    → Theme CSS variable injection
  cms/themes/themeTokens.types.ts             → Token schema interfaces
  cms/themes/themeTokens.defaults.ts          → Default token values
  components/admin/CmsLayout.tsx            → Shared admin layout wrapper
  components/DynamicNav.tsx                   → Public menu renderer component
  blog/BlogIndexPage.tsx                      → Public blog listing page
  blog/BlogPostPage.tsx                       → Public blog post detail page
```

### Database Tables

| Table | Purpose |
|-------|---------|
| `pages` | CMS pages (shared with legacy CMS) — contentJson stores block data |
| `saved_sections` | Reusable block groups |
| `site_settings` | Active theme, nav, footer, SEO, CTA defaults |
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
| `/admin/cms` | CMS dashboard |
| `/admin/cms/pages` | Pages list with create, edit, publish, migrate |
| `/admin/cms/pages/:id/builder` | Visual page builder (Puck editor) |
| `/admin/cms/posts` | Blog post library |
| `/admin/cms/posts/:id/edit` | Blog post form editor |
| `/admin/cms/posts/:id/builder` | Blog post visual builder |
| `/admin/cms/menus` | Navigation menus manager with drag-and-drop |
| `/admin/cms/sections` | Manage reusable sections |
| `/admin/cms/templates` | Page templates |
| `/admin/cms/themes` | Theme management with instant activation |
| `/admin/cms/generator/landing` | Landing Page Generator wizard |
| `/admin/cms/generator/campaigns` | Campaign Packs generator |
| `/admin/cms/seo` | SEO management |
| `/admin/cms/settings` | Site-wide settings |

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
| `DATABASE_URL` | — | PostgreSQL connection string (required) |

## Verification

Run all CMS health checks:

```bash
npx tsx scripts/db/verifySchema.ts    # 80 tables including cms_v2_posts, cms_v2_menus
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
| [Rendering Rules](23-RENDERING-RULES.md) | Blocks vs HTML, sanitization, error boundary |
| [Posts Overview](24-POSTS-OVERVIEW.md) | Blog data model, status workflow |
| [Posts Admin UI](25-POSTS-ADMIN-UI.md) | Post editor and library |
| [Public Blog APIs](26-PUBLIC-BLOG-APIS.md) | Blog endpoints |
| [Blog Page Template](27-BLOG-PAGE-TEMPLATE.md) | blogPostFeed block |
| [Navigation Menus](28-NAVIGATION-MENUS.md) | Menu data, drag-and-drop, locations |
| [SEO for Posts](29-SEO-POSTS.md) | Post-specific SEO |
| [Troubleshooting](30-TROUBLESHOOTING.md) | All subsystems: issues, fixes, verification |
