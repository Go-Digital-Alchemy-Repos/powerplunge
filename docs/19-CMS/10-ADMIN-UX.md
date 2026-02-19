# CMS Admin UX

The CMS admin interface provides a comprehensive content management experience for creating, editing, and publishing pages using the block-based page builder. This document covers the information architecture, dashboard design, interaction patterns, and design rules.

## Information Architecture

### Route Map

All CMS admin routes are gated by admin authentication (`useAdmin()` hook). Server-side routes require `requireFullAccess` middleware (blocks fulfillment role).

| Route | Page Component | Purpose |
|-------|---------------|---------|
| `/admin/cms` | `admin-cms.tsx` | CMS Dashboard — overview cards, stats, and quick actions |
| `/admin/cms/pages` | `admin-cms-pages.tsx` | Page Library — list, create, edit, publish, delete, migrate pages |
| `/admin/cms/pages/:id/builder` | `admin-cms-builder.tsx` | Visual Page Builder — Puck editor with block palette and preview |
| `/admin/cms/sections` | `admin-cms-sections.tsx` | Reusable Sections — create and manage shared block groups |
| `/admin/cms/templates` | `admin-cms-templates.tsx` | Page Templates — pre-built page layouts |
| `/admin/cms/themes` | `admin-cms-themes.tsx` | Theme Management — preview and activate theme presets |
| `/admin/cms/seo` | `admin-cms-seo.tsx` | SEO Management — meta tags, OG, structured data |
| `/admin/cms/settings` | `admin-cms-settings.tsx` | CMS Settings — configuration and feature toggles |

### Navigation

CMS appears in the admin sidebar's CMS dropdown menu. The nav item is always visible to admins.

Within CMS, the `CmsLayout` wrapper component (`client/src/components/admin/CmsLayout.tsx`) provides:
- Consistent page header with breadcrumb-style title
- "Preview" badge indicating the feature's preview status
- Shared sidebar navigation between CMS sub-pages

### Server API Routes

All CMS API routes are mounted at `/api/admin/cms/` via `server/src/routes/admin/cms.router.ts`:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/admin/cms/pages` | List all CMS pages |
| `POST` | `/api/admin/cms/pages` | Create a new page |
| `GET` | `/api/admin/cms/pages/:id` | Get page by ID |
| `PUT` | `/api/admin/cms/pages/:id` | Update page content and metadata |
| `DELETE` | `/api/admin/cms/pages/:id` | Delete a page |
| `POST` | `/api/admin/cms/pages/:id/publish` | Publish a page |
| `POST` | `/api/admin/cms/pages/:id/unpublish` | Unpublish a page |
| `POST` | `/api/admin/cms/pages/:id/set-home` | Set as home page |
| `POST` | `/api/admin/cms/pages/:id/set-shop` | Set as shop page |
| `GET` | `/api/admin/cms/sections` | List saved sections |
| `POST` | `/api/admin/cms/sections` | Create a saved section |
| `GET` | `/api/admin/cms/sections/:id` | Get section by ID |
| `PUT` | `/api/admin/cms/sections/:id` | Update a section |
| `DELETE` | `/api/admin/cms/sections/:id` | Delete a section |
| `GET` | `/api/admin/cms/themes` | List all theme presets |
| `GET` | `/api/admin/cms/themes/active` | Get active theme |
| `POST` | `/api/admin/cms/themes/activate` | Activate a theme |

## Dashboard

The CMS dashboard (`/admin/cms`) provides an at-a-glance overview with action cards:

### Dashboard Cards

| Card | What It Shows | Action |
|------|--------------|--------|
| Pages | Total page count, published vs draft breakdown | Link to Page Library |
| Sections | Total reusable sections count | Link to Sections manager |
| Templates | Available page templates | Link to Templates |
| Themes | Currently active theme name | Link to Theme manager |
| SEO | SEO status/health summary | Link to SEO manager |
| Settings | Configuration overview | Link to Settings |

Each card uses the standard dark card style (`bg-gray-900 border-gray-800`) with a cyan accent icon and shows a count badge where applicable.

## Page Library

The Page Library (`/admin/cms/pages`) is the primary content management interface.

### Interaction Model

1. **List View:** Table of all pages showing title, slug, status (draft/published), type (home/shop/landing/page), and last modified date
2. **Create:** "New Page" button opens a form for title, slug, and page type
3. **Edit Metadata:** Click a page row to edit title, slug, SEO fields
4. **Open Builder:** "Edit" button navigates to `/admin/cms/pages/:id/builder` (Puck editor)
5. **Publish/Unpublish:** Toggle buttons change page visibility
6. **Set Home/Shop:** Dropdown actions to designate a page as the home or shop page (clears the previous designation automatically)
7. **Delete:** Destructive action with confirmation dialog
8. **Migrate:** For pages with legacy HTML content, a "Migrate to Blocks" action converts HTML to block format

### Status Indicators

| Status | Badge Color | Meaning |
|--------|-------------|---------|
| Draft | Gray | Page is not publicly visible |
| Published | Green | Page is live and accessible |
| Home | Cyan | Designated as the home page |
| Shop | Cyan | Designated as the shop page |

## Visual Page Builder

The Puck-based page builder (`/admin/cms/pages/:id/builder`) is the core editing experience.

### Builder Toolbar

The top toolbar provides:

| Element | Purpose |
|---------|---------|
| Back button | Return to Page Library |
| Page title display | Shows current page name |
| Quick Insert bar | One-click insertion of common blocks (Hero, CTA, Products, FAQ, Reviews) |
| Viewport switcher | Toggle between Desktop (100%), Tablet (768px), Mobile (375px) preview widths |
| Attach Section button | Insert a saved reusable section |
| Detach Section button | Convert section references to inline blocks |
| Save button | Persist changes to the database |

### Quick Insert

The Quick Insert toolbar provides one-click block insertion for the five most commonly used blocks:

| Button | Block Type | Icon |
|--------|-----------|------|
| Hero | `hero` | Mountain emoji |
| CTA | `callToAction` | Megaphone emoji |
| Products | `productGrid` | Cart emoji |
| FAQ | `faq` | Question mark emoji |
| Reviews | `testimonials` | Star emoji |

Clicking a Quick Insert button appends the block (with its default props) to the end of the page content using Puck's dispatch system (destination zone: `root:default-zone`).

### Viewport Switcher

Three preview modes allow checking responsive behavior without leaving the builder:

| Mode | Width | Icon |
|------|-------|------|
| Desktop | 100% | Monitor |
| Tablet | 768px | Tablet |
| Mobile | 375px | Smartphone |

The active mode is indicated by a highlighted button. Width constraints are applied via CSS to the Puck preview frame with a smooth 0.3s transition.

### Block Palette

Blocks in the left sidebar are organized into categories with user-friendly group names:

| Puck Category | Contains | Default Expanded |
|--------------|----------|-----------------|
| Layout & Marketing | Hero, Call to Action | Yes |
| Content | Rich Text, Feature List, FAQ | Yes |
| Media | Image, Image Grid | No |
| E-commerce | Product Grid, Product Highlight, Comparison Table | No |
| Trust & Social Proof | Testimonials, Trust Bar | No |
| Utility | (reserved for future blocks) | No |

Each block in the palette shows a tooltip with its description on hover.

### Sections Integration

- **Attach Section:** Opens a dialog listing all saved sections with block count badges. Selecting a section inserts a `sectionRef` block.
- **Detach Section:** Finds all `sectionRef` blocks in the page, fetches their content, and replaces each reference with the section's inline blocks. This is a one-way operation (the section itself is not modified).

## Design Rules

### Typography

- **Font:** Inter (loaded via Google Fonts) is used for all text — headings, body copy, labels, and UI elements
- **Headings:** `font-bold` weight, standard Tailwind size scale (`text-xl`, `text-2xl`, etc.)
- **Body text:** `font-normal` weight, `text-sm` or `text-base`
- **Muted text:** `text-gray-400` or `text-gray-500` for secondary information

### Color System

- **Background:** Dark theme with `bg-gray-950` (page), `bg-gray-900` (cards), `bg-gray-800` (elevated surfaces)
- **Primary accent:** Cyan (`#67e8f9` / `text-cyan-300`, `bg-cyan-600`) — used for CTAs, active states, links, and badges
- **Text:** `text-white` for headings, `text-gray-300` for body, `text-gray-400`/`text-gray-500` for muted
- **Borders:** `border-gray-700` or `border-gray-800`
- **Destructive actions:** `text-red-400`, `bg-red-600` for delete buttons and error states

### Component Library

The admin UI uses [shadcn/ui](https://ui.shadcn.com/) components built on Radix UI primitives:

| Component | Usage |
|-----------|-------|
| `Button` | All clickable actions (primary, outline, ghost, destructive variants) |
| `Card` | Dashboard cards, page list items, theme preset cards |
| `Dialog` | Confirmation modals, create forms, section picker |
| `Badge` | Status indicators, count labels, preview tags |
| `Table` | Page library list, comparison data |
| `Select` | Dropdowns for page type, query mode, etc. |
| `Input` | Text fields for titles, slugs, URLs |
| `Tooltip` | Hover hints on toolbar buttons, block descriptions |
| `Toast` | Success/error notifications for save, publish, delete actions |

### Spacing

- **Page padding:** `px-6 py-6` for main content areas
- **Card padding:** `p-4` or `p-6` depending on content density
- **Section gaps:** `space-y-4` or `space-y-6` between content sections
- **Grid gaps:** `gap-4` or `gap-6` for card grids and dashboard layouts
- **Toolbar items:** `gap-1` to `gap-2` for compact toolbar elements

### Responsiveness

- Dashboard cards use responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Page library adapts from stacked list on mobile to table layout on desktop
- Builder toolbar items wrap gracefully on smaller screens
- Viewport switcher demonstrates responsive behavior within the builder itself

### Interaction Patterns

- **Confirmation dialogs** for all destructive actions (delete page, delete section, detach sections)
- **Toast notifications** for all async operations (save, publish, theme activate)
- **Loading states** with spinner/skeleton patterns during data fetches
- **Optimistic updates** where safe (e.g., toggling publish status)
- **Keyboard accessible** — all interactive elements are focusable and operable via keyboard

### data-testid Conventions

All interactive and content-display elements include `data-testid` attributes following these patterns:

| Pattern | Example | Usage |
|---------|---------|-------|
| `{action}-{target}` | `button-save`, `button-publish` | Interactive elements |
| `{type}-{content}` | `text-page-title`, `badge-status` | Display elements |
| `{type}-{desc}-{id}` | `card-page-${pageId}`, `row-section-${id}` | Dynamic/repeated elements |
| `link-{target}` | `link-cms`, `link-page-builder` | Navigation links |

## Key Files

| File | Purpose |
|------|---------|
| `client/src/pages/admin-cms.tsx` | Dashboard page |
| `client/src/pages/admin-cms-pages.tsx` | Page Library |
| `client/src/pages/admin-cms-builder.tsx` | Puck visual page builder |
| `client/src/pages/admin-cms-sections.tsx` | Sections manager |
| `client/src/pages/admin-cms-templates.tsx` | Templates page |
| `client/src/pages/admin-cms-themes.tsx` | Theme management |
| `client/src/pages/admin-cms-seo.tsx` | SEO management |
| `client/src/pages/admin-cms-settings.tsx` | Settings page |
| `client/src/components/admin/CmsLayout.tsx` | Shared layout wrapper |
| `client/src/components/admin/AdminNav.tsx` | Admin sidebar with CMS nav item |
| `server/src/routes/admin/cms.router.ts` | All CMS API endpoints |
| `server/src/services/cms.service.ts` | CMS business logic |
