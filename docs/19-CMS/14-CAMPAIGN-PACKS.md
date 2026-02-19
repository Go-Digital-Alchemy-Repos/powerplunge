# Campaign Packs

Campaign Packs are pre-defined collections of coordinated landing pages designed for seasonal promotions, audience-specific campaigns, and sales events. They build on the [Landing Page Generator](13-LANDING-PAGE-GENERATOR.md) assembly engine to produce multiple pages in a single action.

## Relationship to the Landing Page Generator

The Landing Page Generator produces **one page at a time** through a 4-step wizard. Campaign Packs sit on top of that same engine and automate the process for **multiple pages at once**:

```
Campaign Pack
  └─ Page Definition 1 → assembleLandingPage() → Draft Page 1
  └─ Page Definition 2 → assembleLandingPage() → Draft Page 2
  └─ Page Definition 3 → assembleLandingPage() → Draft Page 3
```

Each page in a campaign pack is assembled independently using the same pure-function engine (`assembleLandingPage`). The pack provides defaults for template, theme, and kits so that all pages in a campaign share a cohesive look and messaging — while each page has its own title, slug, primary message, SEO metadata, and recommended kits.

## Access

- **Admin URL:** `/admin/cms/generator/campaigns`
- **Sidebar:** Generators → Campaign Packs
- **Requires:** Admin authentication with full access (admin or store_manager role)

## How It Works

1. Admin opens the Campaign Packs page
2. Selects a campaign pack card
3. Clicks "Generate Campaign"
4. A confirmation dialog shows:
   - Pages that will be created (titles and slugs)
   - Optional featured product selector
   - Theme and template info
5. Clicks "Generate N Pages"
6. Each page is assembled via the engine and posted to the CMS API as a draft
7. A results dialog shows per-page success/error status
8. Admin navigates to the Pages list to review, edit, and publish

All generated pages are created as **drafts**. No pages are published automatically.

## Built-In Campaign Packs

| Pack | Pages | Template | Theme | Target Audience |
|------|-------|----------|-------|-----------------|
| New Year Recovery Reset | 3 | landing-page-v1 | arctic | Resolution-minded buyers |
| Spring Training Recovery | 2 | sales-funnel-v1 | midnight | Athletes and fitness enthusiasts |
| Father's Day Performance Gift | 2 | product-story-v1 | slate | Gift buyers |
| Summer Energy Reset | 2 | landing-page-v1 | arctic | Warm-weather buyers |
| Black Friday Cold Plunge Event | 2 | sales-funnel-v1 | midnight | Sale-driven shoppers |
| First Responder Recovery | 1 | product-story-v1 | slate | Firefighters, EMTs, law enforcement |
| Athlete Performance Recovery | 1 | sales-funnel-v1 | midnight | Serious athletes and coaches |

## Campaign Pack Structure

Each pack is a data object with the following shape:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (kebab-case) |
| `name` | string | Display name shown on the card |
| `description` | string | Marketing context for the admin |
| `recommendedThemePreset` | string | Theme applied to all pages in the pack |
| `templateId` | string | Template used for all pages (must exist in `templateLibrary.ts`) |
| `defaultKits` | string[] | Kit names included on every page in the pack |
| `pages` | CampaignPageDef[] | Array of page definitions |

Each page definition:

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Page title |
| `slug` | string | URL slug (must be unique across all CMS pages) |
| `primaryMessage` | string | Core marketing message for the page |
| `recommendedKits` | string[] | Kits specific to this page (merged with pack defaults) |
| `defaultSeoTitle` | string | Pre-filled SEO title |
| `defaultSeoDescription` | string | Pre-filled SEO meta description |

## Kit Merging

Each page receives a merged set of kits from two sources:

1. **Page-level `recommendedKits`** — added first (highest priority)
2. **Pack-level `defaultKits`** — added second, only if not already present

Duplicates are removed. The final kit list is resolved against the available saved sections in the CMS.

**Example:** If a pack has `defaultKits: ["Cold Plunge Benefits Kit", "Safety + Protocol Kit"]` and a page has `recommendedKits: ["Financing Kit", "Cold Plunge Benefits Kit"]`, the merged result is:

```
Financing Kit, Cold Plunge Benefits Kit, Safety + Protocol Kit
```

"Cold Plunge Benefits Kit" appears only once despite being in both lists.

## How to Add a New Campaign Pack

### Step 1: Open the pack definitions file

```
client/src/admin/cms/generator/campaignPacks.ts
```

### Step 2: Add a new entry to the `CAMPAIGN_PACKS` array

```typescript
{
  id: "your-campaign-id",
  name: "Your Campaign Name",
  description: "Describe the campaign's purpose and target audience.",
  recommendedThemePreset: "arctic",      // Must match a theme in the themes system
  templateId: "landing-page-v1",         // Must match a template in templateLibrary.ts
  defaultKits: ["Cold Plunge Benefits Kit"],  // Kit names from sectionKits.ts
  pages: [
    {
      title: "Page Title",
      slug: "your-campaign-page-slug",
      primaryMessage: "The core marketing message for this page.",
      recommendedKits: ["Safety + Protocol Kit"],
      defaultSeoTitle: "Page Title | Power Plunge",
      defaultSeoDescription: "SEO description for search results.",
    },
  ],
},
```

### Step 3: Verify your pack

- **Template ID** must be one of: `landing-page-v1`, `product-story-v1`, `sales-funnel-v1`
- **Kit names** must match the names in `server/src/data/sectionKits.ts` exactly (case-sensitive)
- **Slugs** must be unique across the entire CMS — if a slug is already taken, that page will fail during generation
- **Theme preset** should match an available theme in the themes system

### Step 4: Test

1. Navigate to `/admin/cms/generator/campaigns`
2. Your new pack should appear as a card
3. Click "Generate Campaign" and verify the confirmation dialog lists the correct pages
4. Generate and check that all pages appear as drafts in the Pages list

No database migration, API changes, or server restart is required. Campaign packs are client-side data objects read at runtime.

## Available Kit Names

These are the kit names you can use in `defaultKits` and `recommendedKits`. They must match exactly:

| Kit Name | Content |
|----------|---------|
| Cold Plunge Benefits Kit | Benefit stack + science explainer + recovery use cases |
| Safety + Protocol Kit | Safety checklist + protocol builder |
| Delivery + Setup Kit | Delivery steps + what's included + before/after expectations |
| Warranty + Support Kit | Guarantee/warranty details + objection busters |
| Financing Kit | Payment options + social proof stats |

See [Page Kits](12-PAGE-KITS.md) for full details on each kit.

## Source Code Map

| File | Purpose |
|------|---------|
| `client/src/admin/cms/generator/campaignPacks.ts` | Campaign pack definitions (data only) |
| `client/src/admin/cms/generator/assembleCampaignPack.ts` | `generateCampaignPack()` — loops through pages and calls the assembly engine |
| `client/src/pages/admin-cms-generator-campaigns.tsx` | Campaign Packs UI (cards, confirmation dialog, generation log) |
| `client/src/admin/cms/generator/assembleLandingPage.ts` | Assembly engine (shared with Landing Page Generator) |
| `server/src/data/sectionKits.ts` | Section kit definitions (resolved by name) |
| `client/src/cms/templates/templateLibrary.ts` | Template definitions (resolved by ID) |
| `client/src/components/admin/CmsLayout.tsx` | Sidebar navigation with Campaign Packs link |

## Troubleshooting

### Some pages fail during generation

Each page is created independently. If one page fails (e.g., slug already taken), the others still succeed. The results dialog shows per-page status. Fix the failing page's slug in the pack definition and regenerate, or create it manually via the Landing Page Generator.

### No kits are attached to generated pages

Kits are resolved by name against the saved sections in the CMS. If the starter kits haven't been seeded, navigate to `/admin/cms/sections` and click "Load Starter Kits" first.

### Pack card doesn't appear

Campaign packs are defined in `campaignPacks.ts`. Verify the file exports the `CAMPAIGN_PACKS` array and that your new pack is included in it. The UI renders all packs from this array with no filtering.
