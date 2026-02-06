# Theme System

The CMS v2 theme system provides 10 built-in CSS-variable theme presets that control the visual appearance of the entire storefront. Themes can be activated instantly from the admin panel.

## Architecture

```
shared/themePresets.ts              → Theme preset definitions
client/src/components/ThemeProvider.tsx  → Injects CSS variables into :root
server/src/routes/admin/cms-v2.router.ts → Theme API endpoints
```

## CSS Variables

Each theme defines 15 CSS custom properties:

| Variable | Purpose | Example (Arctic Default) |
|----------|---------|-------------------------|
| `--theme-bg` | Page background | `#030712` |
| `--theme-bg-card` | Card/panel background | `#111827` |
| `--theme-bg-elevated` | Elevated surface background | `#1f2937` |
| `--theme-text` | Primary text color | `#f9fafb` |
| `--theme-text-muted` | Secondary/muted text | `#9ca3af` |
| `--theme-primary` | Primary accent color | `#67e8f9` |
| `--theme-primary-hover` | Primary hover state | `#22d3ee` |
| `--theme-primary-muted` | Primary with low opacity | `rgba(103,232,249,0.15)` |
| `--theme-accent` | Secondary accent | `#06b6d4` |
| `--theme-border` | Border color | `#374151` |
| `--theme-success` | Success state color | `#34d399` |
| `--theme-error` | Error state color | `#f87171` |
| `--theme-warning` | Warning state color | `#fbbf24` |
| `--theme-radius` | Border radius | `0.5rem` |
| `--theme-font` | Font family | `'Inter', sans-serif` |

## Available Presets

| ID | Name | Accent Color |
|----|------|-------------|
| `arctic-default` | Arctic Default | Icy cyan (`#67e8f9`) |
| `midnight-blue` | Midnight Blue | Electric blue (`#60a5fa`) |
| `emerald-dark` | Emerald Dark | Green (`#34d399`) |
| `sunset-warmth` | Sunset Warmth | Amber (`#fb923c`) |
| `royal-purple` | Royal Purple | Violet (`#c084fc`) |
| `rose-gold` | Rose Gold | Pink (`#fb7185`) |
| `slate-minimal` | Slate Minimal | Neutral gray (`#94a3b8`) |
| `ocean-teal` | Ocean Teal | Teal (`#2dd4bf`) |
| `golden-luxury` | Golden Luxury | Gold (`#eab308`) |
| `nordic-frost` | Nordic Frost | Silver (`#e2e8f0`) |

All presets use the Inter font and dark backgrounds.

## ThemeProvider

The `ThemeProvider` component wraps the application and:

1. Fetches the active theme from the public endpoint `GET /api/theme/active`
2. Injects all CSS variables into the document's `:root` element
3. Uses a refetch strategy for reliable updates:
   - `staleTime: 5 seconds`
   - `refetchOnMount: always`
   - `refetchInterval: 30 seconds`

This ensures theme changes made in the admin panel propagate to all open browser tabs within 30 seconds.

## Activation

Themes are activated via the admin panel at `/admin/cms-v2/themes`.

### How Activation Works

1. Admin clicks "Activate" on a theme preset
2. `POST /api/admin/cms-v2/themes/activate` with `{ themeId: "preset-id" }`
3. The `activeThemeId` field in `site_settings` is updated
4. The preset object is returned to the client
5. ThemeProvider picks up the change on next refetch

### Storage

The active theme ID is stored in the `site_settings` table:

```sql
active_theme_id TEXT DEFAULT 'arctic-default'
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/cms-v2/themes` | List all theme presets |
| GET | `/api/admin/cms-v2/themes/active` | Get active theme with CSS variables |
| POST | `/api/admin/cms-v2/themes/activate` | Activate a theme by ID |
