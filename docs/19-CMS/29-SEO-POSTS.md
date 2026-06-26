# SEO Considerations for Posts

Guide to SEO configuration for blog posts, including meta tags, Open Graph, canonical URLs, and robots directives.

---

## Per-Post SEO Fields

Each post in the active `posts` table has dedicated SEO fields:

| Field | HTML Output | Fallback |
|-------|-------------|----------|
| `title` / `canonicalUrl` | `<title>`, canonical URL | Post `title`, `/blog/{slug}` |
| `excerpt` | `<meta name="description">` and `og:description` | Post excerpt |
| `ogImageId` / `coverImageId` | `og:image` and `twitter:image` | Cover image |

### Setting SEO Fields

In the admin post editor, expand the **SEO** section:
1. **Canonical URL** — if blank, falls back to `/blog/{slug}`.
2. **OG Image ID** — if blank, falls back to the cover image.
3. **Allow Index / Allow Follow** — controls robots directives.

The post title and excerpt provide the title and description fallbacks.

---

## Open Graph Tags

When a published post is rendered, the following OG tags should be present in `<head>`:

```html
<meta property="og:type" content="article" />
<meta property="og:title" content="Cold Plunge Benefits" />
<meta property="og:description" content="Learn about the health benefits..." />
<meta property="og:image" content="/uploads/plunge-hero.jpg" />
<meta property="og:url" content="https://yoursite.com/blog/cold-plunge-benefits" />
```

### Twitter Card

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Cold Plunge Benefits" />
<meta name="twitter:description" content="Learn about the health benefits..." />
<meta name="twitter:image" content="/uploads/plunge-hero.jpg" />
```

---

## Canonical URLs

For blog posts, the canonical URL should be:

```
https://yoursite.com/blog/{slug}
```

This prevents duplicate content issues when the same post is accessible via multiple paths.

### Implementation

The frontend blog post page should set:

```html
<link rel="canonical" href="https://yoursite.com/blog/{slug}" />
```

---

## Robots Directives

### Default Behavior

- **Published posts:** `index, follow` (allow search engines)
- **Draft posts:** Not publicly accessible (no robots concern)
- **Archived posts:** Not publicly accessible (no robots concern)

### Custom Robots

For posts, the default is to allow indexing. To block a specific post from search engines, turn off **Allow Index** and/or **Allow Follow** in the post editor.

---

## Structured Data (JSON-LD)

For enhanced search appearance, consider adding Article structured data:

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Cold Plunge Benefits",
  "description": "Learn about the health benefits...",
  "image": "/uploads/plunge-hero.jpg",
  "author": {
    "@type": "Person",
    "name": "Admin"
  },
  "datePublished": "2026-01-15T10:00:00.000Z",
  "dateModified": "2026-01-15T10:00:00.000Z"
}
```

This is an enhancement that can be added to the blog post template.

---

## Sitemap Considerations

Published blog posts should be included in the sitemap:

```xml
<url>
  <loc>https://yoursite.com/blog/cold-plunge-benefits</loc>
  <lastmod>2026-01-15T10:00:00.000Z</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.7</priority>
</url>
```

### Implementation Notes

- Only `status = 'published'` posts with `publishedAt <= now()` appear in the sitemap.
- Use the `updatedAt` field for `<lastmod>`.
- Posts generally have lower priority than product pages.

---

## Checklist

- [ ] Each published post has a unique `<title>` tag
- [ ] `og:title`, `og:description`, `og:image` present on post pages
- [ ] `twitter:card` meta tag present
- [ ] Canonical URL set to the blog post's primary URL
- [ ] No draft or archived posts are indexable
- [ ] Featured images have alt text where rendered
- [ ] Excerpt is populated for social sharing previews
