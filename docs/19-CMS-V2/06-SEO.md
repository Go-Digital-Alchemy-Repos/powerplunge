# SEO Management

Every CMS v2 page includes comprehensive SEO controls for search engine optimization and social media sharing.

## SEO Fields

The `pages` table includes these SEO-related columns:

| Field | Column | Purpose |
|-------|--------|---------|
| Meta Title | `meta_title` | `<title>` and search result title |
| Meta Description | `meta_description` | Search result description snippet |
| Meta Keywords | `meta_keywords` | Keywords meta tag (legacy SEO) |
| Canonical URL | `canonical_url` | Prevents duplicate content issues |
| Robots | `robots` | Search engine crawl directives |
| OG Title | `og_title` | Open Graph title for social sharing |
| OG Description | `og_description` | Open Graph description |
| OG Image | `og_image` | Open Graph preview image URL |
| Twitter Card | `twitter_card` | Card type (default: `summary_large_image`) |
| Twitter Title | `twitter_title` | Twitter-specific title |
| Twitter Description | `twitter_description` | Twitter-specific description |
| Twitter Image | `twitter_image` | Twitter-specific image URL |
| JSON-LD | `json_ld` | Structured data for rich search results |
| Featured Image | `featured_image` | Primary social sharing image |

## SEO Panel in Page Builder

The SEO panel is a slide-out sheet accessible from the "SEO" button in the page builder header. It provides fields for all SEO settings organized in sections:

1. **Basic Meta** — Title, description, keywords, canonical URL
2. **Robots** — Dropdown with common directives (index/follow, noindex/nofollow, etc.)
3. **Open Graph** — Title, description, image for Facebook/LinkedIn sharing
4. **Twitter Card** — Card type, title, description, image for Twitter/X sharing
5. **Structured Data** — Raw JSON editor for JSON-LD

## Robots Directives

Common robots values:

| Value | Meaning |
|-------|---------|
| `index, follow` | Allow indexing and link following (default) |
| `noindex, follow` | Don't index but follow links |
| `index, nofollow` | Index page but don't follow links |
| `noindex, nofollow` | Don't index or follow links |

## JSON-LD Structured Data

The JSON-LD field accepts raw JSON for structured data markup. Common schemas:

### WebPage

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Page Title",
  "description": "Page description",
  "url": "https://example.com/page/slug"
}
```

### Product

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Cold Plunge Tank",
  "description": "Professional cold plunge tank",
  "offers": {
    "@type": "Offer",
    "price": "2999.00",
    "priceCurrency": "USD"
  }
}
```

## AI-Powered SEO Generation

The legacy CMS includes an AI-powered SEO generation endpoint:

```
POST /api/admin/pages/generate-seo
Body: { title, content, pageType }
```

This generates optimized meta title, description, and keywords based on the page content.

## Save Behavior

SEO fields are saved alongside block content when using **Save Draft** or **Publish** in the page builder. Both operations send the full SEO data in the `PUT /api/admin/cms-v2/pages/:id` request.
