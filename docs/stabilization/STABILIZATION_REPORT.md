# Stabilization Report — Phase 2

**Date:** 2026-02-07

## Summary

Phase 2 focused on three pillars: admin UI consistency enforcement, route organization cleanup, and application stability verification.

## 1. Admin UI Consistency

### Problem
The CMS themes page applied theme preview CSS variables to `:root`, which leaked into the admin chrome (sidebar, topbar). Previewing a blue theme turned the entire admin interface blue.

### Fix
- Removed `:root`-level CSS variable manipulation during theme preview
- `PackPageThumbnail` components already render self-contained visual previews using inline styles — no global CSS changes needed for preview
- Added `applyThemeVariablesToElement()` and `clearThemeVariablesFromElement()` to `ThemeProvider.tsx` for future scoped preview needs
- Theme activation (permanent change) still correctly calls `applyThemeVariables()` on `:root`

### Admin Design System
- Created `AdminPagePrimitives.tsx` with 5 reusable components: `AdminPage`, `AdminSection`, `AdminCard`, `AdminToolbar`, `AdminStat`
- Documented design tokens, layout patterns, and Do/Don't rules in `docs/architecture/ADMIN_UI_RULES.md`

### CMS Layout Audit
| Status | Count | Pages |
|--------|-------|-------|
| Uses CmsLayout | 13 | Dashboard, Pages, Posts, Menus, Sections, Templates, Themes, Presets, SEO, Settings, Post Editor, Generator Landing, Generator Campaigns |
| Uses AdminNav (intentional) | 2 | Builder (Puck editor), Post Builder (Puck editor) |

The 2 builder pages intentionally use a different layout to provide a full-width canvas for the Puck visual editor.

## 2. Route Organization

### Problem
12 route files remained at the root level of `server/src/routes/` instead of being organized into `admin/` or `public/` subdirectories.

### Fix
Relocated all 12 files to their proper subdirectories:

| Original Location | New Location |
|---|---|
| `revenue.routes.ts` | `admin/revenue.routes.ts` |
| `affiliate.routes.ts` | `admin/affiliates-v2.routes.ts` |
| `upsell.routes.ts` | `admin/upsells.routes.ts` |
| `vip.routes.ts` | `admin/vip.routes.ts` |
| `coupon.routes.ts` | `admin/coupon-analytics.routes.ts` |
| `recovery.routes.ts` | `admin/recovery.routes.ts` |
| `alerts.routes.ts` | `admin/alerts.routes.ts` |
| `support.routes.ts` | `admin/support.routes.ts` |
| `cms.posts.routes.ts` | `admin/cms-posts-v2.routes.ts` |
| ~~`cms.sitePresets.routes.ts`~~ | ~~Removed — Site Presets feature deleted~~ |
| `cms.siteSettings.routes.ts` | `admin/cms-site-settings.routes.ts` |
| `public.blog.routes.ts` | `public/blog-v2.routes.ts` |

Backward-compatible re-export stubs left at original locations. `server/routes.ts` updated to import from new canonical paths.

## 3. Performance (carried from Phase 1)

Round 2 optimizations completed in prior session:
- Orders N+1 fix: 301 queries → 4 queries per page load
- Affiliates N+1 fix: 101 queries → 3 queries per page load
- 6 database indexes added for common query patterns
- Block registry lazy loading for non-CMS pages
- Full details in `docs/performance/PERFORMANCE_FINDINGS.md`

## 4. Known Issues

| Severity | Issue | Location |
|----------|-------|----------|
| Low | `'over' is possibly 'null'` TS warning | `admin-cms-menus.tsx:691` |
| Low | `Set<string>` iteration needs `--downlevelIteration` | `admin-cms-menus.tsx:730` |
| Info | 2 builder pages use AdminNav instead of CmsLayout | Intentional for Puck editor |

## 5. Files Changed

### New Files
- `client/src/components/admin/AdminPagePrimitives.tsx`
- `docs/architecture/ADMIN_UI_RULES.md`
- `docs/stabilization/STABILIZATION_REPORT.md`
- 12 new route files in `admin/` and `public/` subdirectories
- 12 re-export stubs at original locations

### Modified Files
- `client/src/components/ThemeProvider.tsx` — Added scoped theme variable functions
- `client/src/pages/admin-cms-themes.tsx` — Removed `:root` CSS variable preview side-effects
- `server/routes.ts` — Updated imports to new canonical route paths
