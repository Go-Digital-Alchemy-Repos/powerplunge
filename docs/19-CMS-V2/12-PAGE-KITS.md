# Page Kits

Page Kits are pre-built collections of domain-specific blocks designed for Power Plunge landing pages. They are seeded into the Saved Sections system and can be attached to any page via the Landing Page Generator or the Page Builder.

## Available Kits

### 1. Cold Plunge Benefits Kit

**Category:** `kit`

Covers why cold plunging works and who it's for.

| Block | Type | Purpose |
|-------|------|---------|
| Benefits Stack | `benefitStack` | Grid of four key benefits (inflammation, circulation, mental clarity, sleep) with icons |
| Science Explainer | `scienceExplainer` | Three research-backed sections with citations and disclaimer |
| Recovery Use Cases | `recoveryUseCases` | Four audience segments (athletes, professionals, active aging, first responders) |

**Best for:** Mid-funnel pages where visitors already know the product but need to understand the science and benefits before buying.

### 2. Safety + Protocol Kit

**Category:** `kit`

Ensures responsible use with clear guidelines by experience level.

| Block | Type | Purpose |
|-------|------|---------|
| Safety Checklist | `safetyChecklist` | Eight safety items (5 required, 3 recommended) with medical disclaimer |
| Protocol Builder | `protocolBuilder` | Three protocols (beginner, intermediate, advanced) with temp/duration/frequency |

**Best for:** Pages targeting first-time buyers or health-conscious audiences who need reassurance that cold plunging is safe when done properly.

### 3. Delivery + Setup Kit

**Category:** `kit`

Covers the full post-purchase experience.

| Block | Type | Purpose |
|-------|------|---------|
| Delivery & Setup | `deliveryAndSetup` | Four-step delivery process, what's included, shipping estimate |
| Before/After Expectations | `beforeAfterExpectations` | Timeline of experiences (first session → ongoing practice) |

**Best for:** Bottom-funnel pages where visitors are close to purchasing and want to understand what happens after they order.

### 4. Warranty + Support Kit

**Category:** `kit`

Builds trust and handles last-minute concerns.

| Block | Type | Purpose |
|-------|------|---------|
| Guarantee & Warranty | `guaranteeAndWarranty` | 30-day money-back guarantee, 2-year warranty details, support CTA |
| Objection Busters | `objectionBusters` | Four common objections with reassuring responses |

**Best for:** Pages that need to overcome purchase hesitation — particularly for high-ticket items where trust and risk reduction matter.

### 5. Financing Kit

**Category:** `kit`

Reduces price objections with payment flexibility and credibility signals.

| Block | Type | Purpose |
|-------|------|---------|
| Financing & Payment | `financingAndPayment` | Payment methods, installment options, financing disclaimer |
| Social Proof Stats | `socialProofStats` | Four headline metrics (units sold, rating, pro teams, warranty) |

**Best for:** Any page where price is a potential objection. Works well paired with the Warranty + Support Kit.

## Seeding Kits

Kits are seeded into the database as Saved Sections via:

```
POST /api/admin/cms-v2/sections/seed-kits
```

This endpoint reads from `server/src/data/sectionKits.ts` and creates one Saved Section per kit. Seeding is idempotent — it skips kits that already exist by name.

## sectionRef vs Detach

When attaching a kit to a page, you choose an **insertion mode**. This choice determines how the kit's blocks are stored in the page.

### sectionRef Mode (Linked)

```json
{
  "type": "sectionRef",
  "data": { "sectionId": "uuid", "sectionName": "Cold Plunge Benefits Kit" }
}
```

**How it works:** A single `sectionRef` block is added to the page that points to the Saved Section by ID. At render time, the page renderer fetches the section and renders its blocks inline.

**When to use:**
- You want all pages using this kit to stay in sync — editing the Saved Section updates every page that references it
- You are building multiple similar landing pages and want a single source of truth
- The kit content is finalized and unlikely to need per-page customization

**Trade-offs:**
- Editing the Saved Section affects all pages that reference it
- Deleting the Saved Section breaks the reference (renders a "Section not found" placeholder)
- Cannot customize individual blocks per page without detaching first

### Detach Mode (Copied)

The kit's blocks are copied directly into the page as inline blocks. No reference to the Saved Section is retained.

**When to use:**
- You want to customize the kit's blocks for this specific page (edit headlines, swap icons, reorder)
- The page is a one-off or experimental landing page
- You want the page to be self-contained with no external dependencies

**Trade-offs:**
- Changes to the original Saved Section do not propagate to this page
- Increases the size of the page's `contentJson` (more blocks stored inline)
- Cannot "re-link" back to the Saved Section after detaching

### Decision Guide

| Scenario | Recommended Mode |
|----------|-----------------|
| Building 5+ similar landing pages | sectionRef |
| One-off campaign page | Detach |
| Kit content is still being refined | sectionRef (edit once, update everywhere) |
| Page needs unique headlines/copy per kit | Detach |
| Template already has similar blocks | Detach (then remove duplicates manually) |
| Long-term evergreen page | sectionRef (stays current automatically) |

### Duplicate Block Warning

The Landing Page Generator's wizard will warn you when a kit contains block types that already exist in the selected template. For example, if you created a custom section with a `testimonials` block and the template already includes `testimonials`, you'll see a yellow warning:

> "My Custom Section" adds a "testimonials" block that already exists in the template.

This is a warning, not an error. You can proceed, but you may want to either choose a different kit or use Detach mode and then remove the duplicate block in the page builder. The built-in starter kits are designed with unique block types that do not overlap with templates, so this warning is most common with custom-built sections.

## Source Code

| File | Purpose |
|------|---------|
| `server/src/data/sectionKits.ts` | Kit definitions (block types, data, disclaimers) |
| `server/src/routes/admin/cms-v2.router.ts` | Seed endpoint (`POST /sections/seed-kits`) |
| `client/src/pages/admin-cms-v2-generator-landing.tsx` | Generator wizard with sectionRef/detach toggle |
| `docs/19-CMS-V2/04-SECTIONS.md` | Saved Sections documentation |
