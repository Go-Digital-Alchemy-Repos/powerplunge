# Landing Page Generator

The Landing Page Generator is a 4-step wizard that assembles a complete landing page from a template, products, section kits, and page details. It produces a deterministic page via a pure assembly engine and saves it to the CMS v2 pages system.

## Access

- **Admin URL:** `/admin/cms-v2/generator/landing`
- **Dashboard:** "Landing Page Generator" card on the CMS v2 dashboard
- **Sidebar:** Generators → Landing Pages
- **Requires:** Admin authentication with full access (admin or store_manager role)
- **Feature flag:** Requires `CMS_V2_ENABLED=true`

> **Tip:** To generate multiple coordinated pages at once, use [Campaign Packs](14-CAMPAIGN-PACKS.md) instead. Campaign packs use the same assembly engine to produce entire campaigns in a single action.

## Wizard Steps

### Step 1: Choose a Template

Select from the allowed template set. Only templates in the allowlist are shown:

| Template ID | Name | Blocks Included |
|-------------|------|-----------------|
| `landing-page-v1` | Landing Page v1 | hero, featureList, productHighlight, testimonials, trustBar, callToAction |
| `product-story-v1` | Product Story v1 | hero, richText, imageGrid, featureList, testimonials, callToAction |
| `sales-funnel-v1` | Sales Funnel v1 | hero, productHighlight, comparisonTable, testimonials, faq, callToAction |

Templates are defined in `client/src/cms/templates/templateLibrary.ts`. The allowlist is enforced in `admin-cms-v2-generator-landing.tsx` via `ALLOWED_TEMPLATE_IDS`.

### Step 2: Choose Products

- **Primary Product:** Populates the `productHighlight` block. If the template lacks a `productHighlight`, the engine inserts one after the hero.
- **Secondary Products (0–5):** Populate a `productGrid` block. If the template lacks a `productGrid`, the engine inserts one near the page midpoint.
- Both are optional. Leaving them empty produces a page without product-specific blocks.

### Step 3: Add Sections / Kits

Attach saved sections or kits. Choose an insertion mode:

- **Detach (copy blocks):** Copies blocks directly into the page — fully independent.
- **Section Ref (linked):** Inserts a `sectionRef` block that links to the saved section — stays in sync.

See [Page Kits](12-PAGE-KITS.md) for details on available kits and when to use each mode.

A **duplicate block warning** appears if a selected kit contains block types already present in the chosen template.

### Step 4: Page Details

| Field | Required | Description |
|-------|----------|-------------|
| Page Title | Yes | Display title for the page |
| Slug | Yes | URL path segment (auto-generated from title, editable) |
| Meta Title | No | SEO title (defaults to page title) |
| Meta Description | No | SEO description |
| CTA Destination | Yes | Where CTA buttons link: Shop (`/shop`), Primary Product (`/products/:id`), or Get a Quote (`/contact`) |
| Theme Override | No | Apply a specific theme instead of the active theme |
| Publish Immediately | No | If on, page goes live immediately; if off, saved as draft |

**Slug uniqueness** is checked asynchronously via `GET /api/admin/cms-v2/pages/check-slug?slug=`. The slug field shows a spinner while checking, a green checkmark when available, or a red warning when taken. The generate button is disabled while the slug is checking or taken.

**Publish confirmation:** When "Publish immediately" is toggled on, clicking "Generate & Publish" opens a confirmation dialog before proceeding.

## Assembly Engine

The assembly engine is a **pure function** that takes structured inputs and returns a deterministic page. It has no side effects, no API calls, and no database access.

### Location

```
client/src/admin/cms-v2/generator/assembleLandingPage.ts
```

### Function Signature

```typescript
function assembleLandingPage(input: AssemblyInput): AssemblyResult
```

### Assembly Rules (executed in order)

| Rule | Operation | Details |
|------|-----------|---------|
| 1 | Clone template | Deep-clone template blocks using `structuredClone`. The original template is never mutated. |
| 2 | Inject primary product | If a primary product is set: (a) inject its ID into an existing `productHighlight` block, or (b) insert a new `productHighlight` after the hero. Skipped if no primary product. |
| 3 | Inject secondary products | If secondary products are set: (a) inject their IDs into an existing `productGrid`, or (b) insert a new `productGrid` near the page midpoint. Skipped if no secondary products. |
| 4 | Apply CTA overrides | Update `hero.ctaHref` and `callToAction.primaryCtaHref` based on the CTA destination. For "quote" destination, also changes hero CTA text to "Get a Quote". |
| 5 | Append sections | Append selected sections in chosen mode — as `sectionRef` blocks (linked) or as copied inline blocks (detached). |

After all rules, a final pass ensures every block has an `id` and `version`.

### Input/Output Types

```typescript
interface AssemblyInput {
  template: CmsTemplate;
  primaryProductId: string;
  secondaryProductIds: string[];
  sections: AssemblySection[];
  sectionMode: "sectionRef" | "detach";
  ctaDestination: "shop" | "product" | "quote";
  themeOverride: string;
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  idGenerator?: () => string;        // Injectable for testing
}

interface AssemblyResult {
  contentJson: {
    version: number;                   // Always 1
    blocks: AssembledBlock[];
    themeOverride?: string;            // Only present if set
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    ogTitle: string;
    ogDescription: string;
  };
}
```

### Determinism

The engine is deterministic: given the same inputs and the same `idGenerator`, it always produces identical output. This is tested via 26 automated tests. The injectable `idGenerator` parameter allows tests to use a predictable counter instead of `crypto.randomUUID()`.

## Live Preview

The wizard includes a togglable preview panel that shows the assembled page in real time.

- **Toggle:** "Preview" / "Hide Preview" button in the wizard header
- **Width modes:** Desktop (full width) and Mobile (375px)
- **Block display:** Each block shows its index, type label, detail summary (e.g., product IDs, item counts), and version
- **Regenerate:** "Regenerate" button forces a fresh assembly without saving
- **Theme/SEO:** Preview shows the theme override (if set) and SEO metadata

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/admin/cms-v2/pages` | Create the generated page |
| `POST` | `/api/admin/cms-v2/pages/:id/publish` | Publish the page (if "Publish immediately" is on) |
| `GET` | `/api/admin/cms-v2/pages/check-slug?slug=` | Check slug uniqueness |
| `GET` | `/api/products` | Fetch products for Step 2 |
| `GET` | `/api/admin/cms-v2/sections` | Fetch sections/kits for Step 3 |
| `GET` | `/api/admin/cms-v2/themes` | Fetch themes for Step 4 |

## Source Code Map

| File | Purpose |
|------|---------|
| `client/src/pages/admin-cms-v2-generator-landing.tsx` | Wizard UI (4 steps, preview panel, all guardrails) |
| `client/src/admin/cms-v2/generator/assembleLandingPage.ts` | Pure assembly engine (263 lines) |
| `client/src/admin/cms-v2/generator/assembleLandingPage.test.ts` | 26 automated tests |
| `client/src/cms/templates/templateLibrary.ts` | Template definitions |
| `server/src/data/sectionKits.ts` | Section kit definitions |
| `server/src/routes/admin/cms-v2.router.ts` | API endpoints |
| `server/src/services/cms-v2.service.ts` | Service layer |
| `server/src/repositories/cms-v2.repository.ts` | Database queries |
| `client/src/components/admin/CmsV2Layout.tsx` | Sidebar with Generators nav group |

## Troubleshooting

### "Access Denied" on the generator page

The generator requires admin authentication with full access (admin or store_manager role). Fulfillment users do not have access. Ensure you are logged in via `/admin` and that `CMS_V2_ENABLED=true` is set.

### Slug shows "taken" for a slug that should be available

The slug check queries all CMS v2 pages (including drafts and archived pages). If a draft page already uses that slug, it will show as taken. Either choose a different slug or delete/rename the conflicting page.

### No templates appear in Step 1

The wizard only shows templates in the `ALLOWED_TEMPLATE_IDS` allowlist. If the template library has been modified and the IDs no longer match, the wizard will show an empty list. Check that `landing-page-v1`, `product-story-v1`, and `sales-funnel-v1` exist in `client/src/cms/templates/templateLibrary.ts`.

### No products appear in Step 2

Products are fetched from `GET /api/products`. If the product list is empty, no products have been created in the admin. Create products via `/admin/products` first.

### No sections/kits appear in Step 3

Sections must be seeded or manually created. To seed the starter kits, use the "Load Starter Kits" button on the Sections page (`/admin/cms-v2/sections`) or call `POST /api/admin/cms-v2/sections/seed-kits`.

### Duplicate block warnings appear

This is a non-blocking warning. It means a selected kit contains block types that already exist in the template. You can proceed, but consider using Detach mode and removing the duplicate in the page builder afterward.

### Preview shows different block count than expected

The assembly engine may insert additional blocks (e.g., `productHighlight`, `productGrid`) based on product selections. The preview accurately reflects the final page — use it to verify the block structure before generating.

### Page generates but CTA links are wrong

Check the CTA Destination setting in Step 4. The engine overrides `ctaHref` on hero and callToAction blocks based on this setting. If set to "Primary Product" but no primary product is selected, it falls back to `/shop`.

### Assembly engine produces different results on each run

The engine is deterministic for the same inputs. Different results usually mean the inputs changed (e.g., different section selections, product IDs, or template). In testing, inject a predictable `idGenerator` to verify determinism.
