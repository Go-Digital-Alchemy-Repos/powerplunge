# Admin UI Design System Rules

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Page background | `bg-gray-950` | All admin pages |
| Card / Panel background | `bg-gray-900/50` | Cards, panels, modals |
| Sidebar background | `bg-gray-900/80` | CmsV2Layout sidebar |
| Text – heading | `text-white` | Titles, headings |
| Text – body | `text-gray-400` | Descriptions, secondary text |
| Text – muted | `text-gray-500` | Placeholders, labels |
| Border | `border-gray-800/60` | Cards, dividers, inputs |
| Accent – primary | `cyan-400` / `cyan-600` | Active links, primary buttons |
| Accent – hover | `cyan-700` | Button hovers |
| Active nav item bg | `bg-cyan-900/30` | Sidebar active state |
| Destructive | `red-500` / `red-600` | Delete buttons, error states |
| Success | `green-400` / `green-500` | Success badges, positive trends |

## Layout Patterns

### CMS v2 Pages
All CMS v2 pages **must** wrap content in `<CmsV2Layout>`:

```tsx
import CmsV2Layout from "@/components/admin/CmsV2Layout";

export default function MyCmsPage() {
  return (
    <CmsV2Layout breadcrumbs={[{ label: "My Page" }]} activeNav="mypage">
      {/* page content */}
    </CmsV2Layout>
  );
}
```

**Exception:** Builder pages (`admin-cms-v2-builder`, `admin-cms-v2-post-builder`) use `AdminNav` with a full-width canvas for the Puck editor. This is intentional.

### Non-CMS Admin Pages
Non-CMS admin pages use `AdminNav` for the top navigation bar and manage their own content layout. Use `AdminPage`, `AdminCard`, `AdminSection`, `AdminToolbar`, and `AdminStat` primitives from `@/components/admin/AdminPagePrimitives` for consistent styling.

## Do / Don't

### DO
- Use `bg-gray-950` for page backgrounds, never lighter grays
- Use `border-gray-800/60` for all card and divider borders
- Use `text-white` for headings, `text-gray-400` for body text
- Use `cyan-400`/`cyan-600` for primary accent colors consistently
- Add `data-testid` attributes to all interactive and display elements
- Use `AdminCard` for content containers instead of raw `div` with custom styles
- Keep theme preview variables scoped — never modify `:root` CSS variables from admin pages

### DON'T
- Apply theme variables to `document.documentElement` from admin pages (causes "blue admin" bug)
- Use `bg-white`, `bg-gray-50`, or other light backgrounds in admin pages
- Use colors outside the token palette (no custom hex colors)
- Create one-off card styles when `AdminCard` exists
- Use `text-black` or dark-on-light patterns
- Skip `CmsV2Layout` on CMS v2 pages (except builders)
- Hardcode `ml-56` or `ml-16` — let CmsV2Layout handle sidebar offset

## Component Import Paths

```tsx
// Layout
import CmsV2Layout from "@/components/admin/CmsV2Layout";
import AdminNav from "@/components/admin/AdminNav";

// Primitives
import { AdminPage, AdminCard, AdminSection, AdminToolbar, AdminStat } from "@/components/admin/AdminPagePrimitives";

// shadcn/ui (use existing components)
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
```

## Theme Preview Isolation

The storefront theme system uses CSS variables on `:root`. Admin pages must never modify `:root` variables directly. If a preview is needed:

1. Use inline styles on preview containers
2. Use `applyThemeVariablesToElement()` from `ThemeProvider` to scope variables to a specific DOM element
3. Activation (permanent change) may call `applyThemeVariables()` since it legitimately changes the storefront theme
