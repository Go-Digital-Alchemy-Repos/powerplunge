# Template System

The template system provides pre-built page layouts that give content creators a production-ready starting point. Templates define a curated set of blocks with sensible default content, allowing new pages to look complete immediately without manual block-by-block construction.

## Architecture

```
client/src/cms/templates/
  templateLibrary.ts    → Template definitions, converter, and exports
```

### Key Types

```typescript
interface CmsTemplate {
  id: string;            // kebab-case with version (e.g., "landing-page-v1")
  name: string;          // Display name (e.g., "Landing Page v1")
  description: string;   // Short description for the card/selector
  tags: string[];        // Searchable tags (e.g., ["marketing", "landing"])
  blocks: CmsTemplateBlock[];  // Ordered block definitions
  thumbnail?: string;    // Optional thumbnail URL
}

interface CmsTemplateBlock {
  type: string;          // Must match a registered block type key (lowerCamelCase)
  data: Record<string, any>;  // Block-specific default props
}
```

### Core Functions

| Function | Purpose |
|----------|---------|
| `CMS_TEMPLATES` | Exported array of all available templates |
| `getTemplate(id)` | Look up a template by ID |
| `templateToContentJson(template)` | Convert a template to `contentJson` with UUID block IDs |

### Content Conversion

`templateToContentJson()` transforms a template into the `contentJson` format stored in the database:

```typescript
templateToContentJson(template)
// Returns:
{
  version: 1,
  blocks: [
    { id: "generated-uuid", type: "hero", data: { ... }, settings: {} },
    { id: "generated-uuid", type: "featureList", data: { ... }, settings: {} },
    // ...
  ]
}
```

Each block gets a unique UUID via `crypto.randomUUID()`, ensuring no ID collisions when the same template is used for multiple pages.

## Template Creation Workflow

### For Content Creators (Admin UI)

1. Navigate to **CMS v2 → Templates** to browse all available templates
2. Each template card shows a wireframe thumbnail, name, description, tags, and block count
3. Click **Create Page** on any template card
4. You are redirected to the Pages view with the create dialog open and the selected template pre-filled
5. Enter a title and slug, then click **Create Page**
6. The new page is created with all template blocks pre-populated and ready to customize in the builder

Alternatively, from the **Pages** view:
1. Click **New Page** to open the create dialog
2. The dialog shows a template selector at the top with visual cards
3. Select a template (or choose "Blank Page" to start empty)
4. Fill in title, slug, and page type
5. Click **Create Page** — the selected template's blocks are automatically applied

### For Developers (Adding a New Template)

1. Open `client/src/cms/templates/templateLibrary.ts`
2. Add a new entry to the `CMS_TEMPLATES` array:

```typescript
{
  id: "my-template-v1",           // kebab-case, versioned
  name: "My Template v1",         // Title Case display name
  description: "Brief purpose",   // Shown in template cards
  tags: ["relevant", "tags"],     // For search/filtering
  blocks: [
    {
      type: "hero",               // Must match registered block type
      data: {
        headline: "My Headline",
        subheadline: "Supporting text",
        ctaText: "Get Started",
        ctaHref: "/shop",
        // ... all relevant props for the block
      },
    },
    // ... more blocks
  ],
}
```

3. The template automatically appears in:
   - The Templates page (`/admin/cms-v2/templates`)
   - The template selector in the page creation dialog
   - Template preview thumbnails with auto-generated wireframes

### Template Design Guidelines

When creating templates:

- **Use all relevant block props** — fill in every meaningful default so the page looks complete without editing
- **Match block type keys exactly** — use `lowerCamelCase` keys that match the block registry (e.g., `featureList`, not `FeatureList` or `feature-list`)
- **Provide realistic content** — use Power Plunge product copy, not lorem ipsum
- **Order blocks for conversion** — hero first, trust signals and CTAs strategically placed
- **Tag appropriately** — tags power the search/filter in the template library

## Starter Templates

### Blank Page

- **ID:** `blank`
- **Tags:** `basic`
- **Blocks:** None (empty canvas)
- **Purpose:** For users who want full creative control. Creates an empty page with no pre-configured blocks. Best for experienced builders who want to construct their layout from scratch.

### Landing Page v1

- **ID:** `landing-page-v1`
- **Tags:** `marketing`, `landing`, `conversion`
- **Blocks (7):**

| Order | Block | Purpose |
|-------|-------|---------|
| 1 | **Hero** (centered, stacked) | Full-width hero with "Experience the Power of Cold Plunge" headline, Shop Now / Learn More CTAs |
| 2 | **Feature List** (3 columns) | Three key benefits: Precise Temperature, Medical-Grade Build, Rapid Cooling with Lucide icons |
| 3 | **Product Highlight** | Single product showcase with 4 feature bullets, gallery, and buy button |
| 4 | **Testimonials** (cards) | Three customer quotes from an athlete, studio owner, and fitness coach |
| 5 | **Trust Bar** (row) | Four trust signals: Free Shipping, 2-Year Warranty, 24/7 Support, 30-Day Returns |
| 6 | **Call to Action** | "Ready to Upgrade Your Recovery?" with View Products and Contact Us buttons |
| 7 | **FAQ** (accordion) | Three Q&A pairs covering temperature, cooling time, and safety |

- **Best for:** General marketing landing pages, product launches, and campaign destinations. Follows a proven conversion structure: attention → education → social proof → action.

### Product Story v1

- **ID:** `product-story-v1`
- **Tags:** `product`, `storytelling`
- **Blocks (6):**

| Order | Block | Purpose |
|-------|-------|---------|
| 1 | **Hero** (left-aligned, split layout) | "Built for Performance. Designed for Recovery." with Explore / Shop Now CTAs |
| 2 | **Rich Text** | Brand story narrative about craftsmanship and mission |
| 3 | **Image Grid** (3 columns, landscape) | Visual gallery placeholder for product photography |
| 4 | **Feature List** (3 columns) | Engineering highlights: Precision Cooling, Built to Last, Crystal-Clear Water |
| 5 | **Testimonials** (cards) | Two endorsements from a pro athlete and a sports physiotherapist |
| 6 | **Call to Action** | "Ready to Transform Your Recovery?" with Shop Now and Learn More buttons |

- **Best for:** Product detail pages, brand storytelling, and "about the product" editorial content. Uses the split hero layout for a more editorial feel with narrative flow through text and imagery.

### Sales Funnel v1

- **ID:** `sales-funnel-v1`
- **Tags:** `funnel`, `sales`
- **Blocks (7):**

| Order | Block | Purpose |
|-------|-------|---------|
| 1 | **Hero** (centered, stacked) | "#1 Cold Plunge for Serious Recovery" with "See How We Compare" CTA |
| 2 | **Comparison Table** | Head-to-head comparison: Power Plunge vs. Competitor A vs. Competitor B across 4 features |
| 3 | **Trust Bar** (row) | Four trust signals: Free Shipping, 2-Year Warranty, Financing Available, 30-Day Guarantee |
| 4 | **Testimonials** (cards) | Three verified buyer quotes focused on comparison shopping and easy setup |
| 5 | **Call to Action** (mid-funnel) | "Limited-Time Offer" with Claim Your Offer button |
| 6 | **FAQ** (accordion) | Four objection-handling Q&As: electrical requirements, maintenance, returns, financing |
| 7 | **Call to Action** (final close) | "Still Thinking It Over?" with Buy Now and Talk to Sales buttons |

- **Best for:** High-conversion sales pages, competitive positioning, and promotional campaigns. Uses dual CTAs (mid-funnel offer + final close) with objection handling via FAQ to maximize conversion. The comparison table establishes competitive advantage before driving to purchase.

## Page Types

Pages created from templates are categorized by their `pageType` field:

| Type | Purpose |
|------|---------|
| `home` | Homepage — only one allowed (enforced by `isHome` flag) |
| `shop` | Shop page — only one allowed (enforced by `isShop` flag) |
| `landing` | Marketing landing pages |
| `page` | General-purpose pages |

## Uniqueness Enforcement

The storage layer enforces that only one page can be the home page and only one can be the shop page:

- **Set Home:** `POST /api/admin/cms-v2/pages/:id/set-home` clears `isHome` on all other pages, then sets it on the target
- **Set Shop:** `POST /api/admin/cms-v2/pages/:id/set-shop` clears `isShop` on all other pages, then sets it on the target

Both operations use database transactions to prevent race conditions.

## Template Preview System

The Templates page (`/admin/cms-v2/templates`) displays each template as a visual card with:

- **Auto-generated wireframe thumbnail** — Color-coded block bars representing each block type (e.g., cyan for Hero, green for Features, pink for Reviews), giving a visual preview of the page structure
- **Name and description** — Template identity and purpose
- **Block count** — Number of blocks included
- **Tags** — Categorization badges for browsing
- **Create Page button** — Direct action to create a new page from the template, navigating to the Pages view with the template pre-selected
