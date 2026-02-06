# Theme Tokens v1

The CMS v2 theme system uses a structured token schema to control the visual appearance of the storefront. Tokens are organized into seven groups (colors, typography, radius, shadows, spacing, buttons, layout) and are applied to the DOM as CSS custom properties prefixed with `--pp-`.

## Architecture

```
client/src/cms/themes/
  themeTokens.types.ts      → TypeScript interfaces for all token groups
  themeTokens.defaults.ts   → Default token values (Ocean Blue base)
  presets.ts                → 10 built-in theme presets with descriptions
  applyTheme.ts             → CSS variable injection (applyThemeTokens, clearThemeTokens)

server/src/
  routes/admin/cms-v2.router.ts   → Theme API endpoints
  services/cms-v2.service.ts      → Theme activation logic
```

### Data Flow

1. Admin selects a theme preset in `/admin/cms-v2/themes`
2. Preview mode: `applyThemeTokens(tokens, "preview")` applies variables to `[data-pp-theme-scope]` element
3. Activate: `POST /api/admin/cms-v2/themes/activate` stores the preset ID in `site_settings.active_theme_id`
4. Public pages: `ThemeProvider` fetches `GET /api/theme/active` and injects CSS variables into `:root`
5. All themed UI reads from `var(--pp-*)` CSS custom properties

## Token Schema Reference

### Colors (`ThemeColorTokens`)

15 color tokens control the entire color palette:

| Token | CSS Variable | Purpose |
|-------|-------------|---------|
| `colorBg` | `--pp-bg` | Page background |
| `colorSurface` | `--pp-surface` | Card/panel background |
| `colorSurfaceAlt` | `--pp-surface-alt` | Elevated/alternate surface |
| `colorText` | `--pp-text` | Primary text color |
| `colorTextMuted` | `--pp-text-muted` | Secondary/muted text |
| `colorBorder` | `--pp-border` | Border color |
| `colorPrimary` | `--pp-primary` | Primary brand color (buttons, links) |
| `colorPrimaryText` | `--pp-primary-text` | Text on primary background |
| `colorSecondary` | `--pp-secondary` | Secondary brand color |
| `colorSecondaryText` | `--pp-secondary-text` | Text on secondary background |
| `colorAccent` | `--pp-accent` | Accent/highlight color |
| `colorAccentText` | `--pp-accent-text` | Text on accent background |
| `colorSuccess` | `--pp-success` | Success state |
| `colorWarning` | `--pp-warning` | Warning state |
| `colorDanger` | `--pp-danger` | Error/danger state |

### Typography (`ThemeTypographyTokens`)

| Token | CSS Variable | Default | Purpose |
|-------|-------------|---------|---------|
| `fontFamilyBase` | `--pp-font-family` | `'Inter', sans-serif` | Base font family |
| `fontSizeScale` | `--pp-font-size-scale` | `1` | Font size multiplier |
| `lineHeightBase` | `--pp-line-height` | `1.5` | Base line height |
| `letterSpacingBase` | `--pp-letter-spacing` | `0em` | Base letter spacing |

### Border Radius (`ThemeRadiusTokens`)

| Token | CSS Variable | Default | Purpose |
|-------|-------------|---------|---------|
| `radiusSm` | `--pp-radius-sm` | `0.25rem` | Small elements (badges, chips) |
| `radiusMd` | `--pp-radius-md` | `0.5rem` | Medium elements (cards, inputs) |
| `radiusLg` | `--pp-radius-lg` | `0.75rem` | Large elements (modals, panels) |
| `radiusXl` | `--pp-radius-xl` | `1rem` | Extra-large elements (hero sections) |

### Shadows (`ThemeShadowTokens`)

| Token | CSS Variable | Default |
|-------|-------------|---------|
| `shadowSm` | `--pp-shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` |
| `shadowMd` | `--pp-shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), ...` |
| `shadowLg` | `--pp-shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), ...` |

### Spacing (`ThemeSpacingTokens`)

| Token | CSS Variable(s) | Default |
|-------|-----------------|---------|
| `spaceBase` | (used in computation) | `4` (px) |
| `spaceScale` | `--pp-space-1` through `--pp-space-6` | `[1, 2, 3, 4, 6, 8]` multipliers |

Generated variables: `--pp-space-1: 4px`, `--pp-space-2: 8px`, `--pp-space-3: 12px`, `--pp-space-4: 16px`, `--pp-space-5: 24px`, `--pp-space-6: 32px`.

### Buttons (`ThemeButtonTokens`)

| Token | CSS Variable | Default | Options |
|-------|-------------|---------|---------|
| `buttonRadius` | `--pp-btn-radius` | `md` → `0.5rem` | `sm`, `md`, `lg` (maps to radius tokens) |
| `buttonStyle` | `--pp-btn-style` | `solid` | `solid`, `soft`, `outline` |
| `buttonPaddingY` | `--pp-btn-py` | `0.5rem` | Vertical padding |
| `buttonPaddingX` | `--pp-btn-px` | `1rem` | Horizontal padding |

### Layout (`ThemeLayoutTokens`)

| Token | CSS Variable | Default | Purpose |
|-------|-------------|---------|---------|
| `containerMaxWidth` | `--pp-container-max` | `1280` | Max container width (px) |
| `sectionPaddingY` | `--pp-section-py` | `3rem` | Vertical section padding |
| `sectionPaddingX` | `--pp-section-px` | `1rem` | Horizontal section padding |

## CSS Variable Mapping

The complete mapping from token paths to CSS custom properties is defined in `client/src/cms/themes/applyTheme.ts`. All variables use the `--pp-` prefix (Power Plunge).

The `flattenTokens()` function converts a `ThemeTokens` object into a flat `Record<string, string>` of CSS variable name → value pairs. Special handling:
- `buttonRadius` maps through the radius token lookup (`sm` → `radiusSm` value)
- `buttonStyle` is passed as-is to `--pp-btn-style`
- `spaceScale` generates numbered variables (`--pp-space-1` through `--pp-space-N`)

## Presets (10)

Each preset provides a complete set of tokens. Presets are built using a `preset()` helper that deep-merges overrides onto `defaultThemeTokens`.

| ID | Name | Intent |
|----|------|--------|
| `ocean-blue` | Ocean Blue | **Default.** Signature Power Plunge look with icy cyan accents on deep dark backgrounds. The brand standard. |
| `midnight` | Midnight | Ultra-dark mode with soft blue accents for low-light environments and late-night browsing. Slightly tighter radius values. |
| `minimal-light` | Minimal Light | Clean white and pale gray surfaces with dark text. The only light-mode preset. Subtle shadows. |
| `contrast-pro` | Contrast Pro | High-contrast pure-black background with bright white text and vivid accents. Maximum readability, WCAG-friendly. Compact button padding. |
| `warm-neutral` | Warm Neutral | Earthy warm tones with cream text and terracotta/orange accents. Softer, approachable feel. Larger border radii. |
| `slate-and-blue` | Slate & Blue | Cool blue-gray slate palette with steel blue and indigo accents. Professional and calm. |
| `frost` | Frost | Icy crystalline tones with pale blue highlights. Crisp, cold aesthetic that matches the cold plunge brand. |
| `charcoal-gold` | Charcoal Gold Accent | Deep charcoal base with premium gold accent details. Luxury positioning. Tighter, more angular radii. |
| `clean-clinical` | Clean Clinical | Spa-like serene aesthetic with soft mint/teal tones on light backgrounds. Light-mode with extra-soft shadows and large rounded corners. |
| `energetic-blue-pop` | Energetic Blue Pop | Vibrant electric blue and purple accents on dark navy. High-energy branding for athletic positioning. Larger button radii. |

### Default Preset

`ocean-blue` is the default preset (`defaultPresetId` in `client/src/cms/themes/presets.ts`). Its tokens match `defaultThemeTokens` exactly.

## Preview vs Activate Behavior

### Preview

- **Function:** `applyThemeTokens(tokens, "preview")`
- **Scope:** Applies CSS variables to the element with `[data-pp-theme-scope]` attribute, or falls back to `document.documentElement`
- **Persistence:** None — variables are set in-memory on the DOM. Refreshing the page removes preview changes.
- **Use case:** Admin clicks a preset card in `/admin/cms-v2/themes` to see how it looks before committing.

### Activate

- **Function:** `POST /api/admin/cms-v2/themes/activate` with `{ themeId: "preset-id" }`
- **Storage:** Updates `active_theme_id` in the `site_settings` database table
- **Propagation:** The public `ThemeProvider` component fetches the active theme via `GET /api/theme/active` with a 30-second refetch interval. All open browser tabs update within 30 seconds.
- **Use case:** Admin confirms the theme and clicks "Activate" to make it live for all visitors.

### Clear

- **Function:** `clearThemeTokens(tokens, scope)`
- **Behavior:** Removes all CSS variables set by a previous `applyThemeTokens` call from the target element
- **Use case:** Resetting a preview back to the active theme, or cleaning up before applying a different preview.

## Safety and Rollback

### Non-Destructive Design

- Theme changes are purely visual (CSS variables). No content, pages, or blocks are modified when a theme is changed.
- The active theme ID is a single field in `site_settings`. Changing it is instantaneous and reversible.
- All 10 presets are hardcoded in `client/src/cms/themes/presets.ts` — they cannot be accidentally deleted.

### Rollback Procedure

1. Navigate to `/admin/cms-v2/themes`
2. Click the preset you want to revert to
3. Click "Activate"

Or via API:
```
POST /api/admin/cms-v2/themes/activate
{ "themeId": "ocean-blue" }
```

### Edge Cases

- If `active_theme_id` references a deleted/unknown preset, the system falls back to `ocean-blue` (the default).
- If the `ThemeProvider` fetch fails, no CSS variables are set — the page renders with whatever CSS defaults the stylesheet provides.
- Preview mode never touches the database. Closing or refreshing the admin page discards any previewed theme.

## API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/api/admin/cms-v2/themes` | Admin | List all 10 theme presets with full token data |
| `GET` | `/api/admin/cms-v2/themes/active` | Admin | Get the currently active theme preset |
| `GET` | `/api/theme/active` | Public | Get active theme (used by ThemeProvider on public pages) |
| `POST` | `/api/admin/cms-v2/themes/activate` | Admin | Activate a theme by preset ID |

## Extending the Theme System

To add a new preset:

1. Add a `preset(...)` call in `client/src/cms/themes/presets.ts`
2. Provide an `id`, `name`, `description`, and at minimum a complete `colors` object
3. Other token groups (typography, radius, etc.) inherit from `defaultThemeTokens` if not overridden
4. The preset automatically appears in the admin theme picker

To add a new token group:

1. Add the interface to `themeTokens.types.ts`
2. Add defaults to `themeTokens.defaults.ts`
3. Add the CSS variable mapping to `TOKEN_TO_CSS_VAR` in `applyTheme.ts`
4. Update `flattenTokens()` if the mapping requires special logic
