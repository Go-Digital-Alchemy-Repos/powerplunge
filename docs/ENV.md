# Environment Variables

## Meta Image URLs

During the Vite build, the `vite-plugin-meta-images` plugin rewrites `og:image` and `twitter:image` meta tags in `index.html` so that social-sharing previews point to the correct absolute URL.

### Variables

| Variable | Scope | Description |
|---|---|---|
| `PUBLIC_SITE_URL` | Build-time (preferred) | The canonical public URL of the site. Used to construct absolute meta image URLs. |
| `VITE_PUBLIC_SITE_URL` | Build-time (fallback) | Same purpose as above. Checked only when `PUBLIC_SITE_URL` is not set. |

The plugin checks them in order: `PUBLIC_SITE_URL` first, then `VITE_PUBLIC_SITE_URL`. If either is set, it is always used regardless of environment. Trailing slashes are stripped automatically.

If neither variable is set:
- **Production builds** print a warning that meta image URLs may reference a Replit preview domain.
- The plugin falls back to Replit-provided domains (`REPLIT_INTERNAL_APP_DOMAIN`, then `REPLIT_DEV_DOMAIN`).

### What They Affect

Only the `og:image` and `twitter:image` `<meta>` tags inside the built `dist/public/index.html`. No other build output, storage uploads, or runtime behavior is changed.

### Examples

**Production deployment:**

```bash
PUBLIC_SITE_URL=https://www.powerplunge.com npm run build
```

Meta tags will contain `https://www.powerplunge.com/opengraph.jpg`.

**Staging / preview:**

```bash
PUBLIC_SITE_URL=https://staging.powerplunge.com npm run build
```

**Local development (no variable set):**

The plugin falls back to the Replit dev domain automatically. No action needed.
