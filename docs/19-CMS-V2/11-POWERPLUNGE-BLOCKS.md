# Power Plunge Blocks

This document covers the domain-specific block types created for Power Plunge landing pages. These blocks are used inside **Section Kits** and are distinct from the 12 core CMS blocks documented in [Block Registry](02-BLOCK-REGISTRY.md).

## Block Index

| Block Type | Kit | Purpose |
|------------|-----|---------|
| `benefitStack` | Cold Plunge Benefits | Grid of health/wellness benefits with icons |
| `scienceExplainer` | Cold Plunge Benefits | Research-backed explanations with citations |
| `recoveryUseCases` | Cold Plunge Benefits | Audience-segmented use cases |
| `safetyChecklist` | Safety + Protocol | Mandatory and recommended safety items |
| `protocolBuilder` | Safety + Protocol | Temperature/duration protocols by experience level |
| `deliveryAndSetup` | Delivery + Setup | Step-by-step delivery and unboxing flow |
| `beforeAfterExpectations` | Delivery + Setup | Timeline of what to expect over time |
| `guaranteeAndWarranty` | Warranty + Support | Money-back guarantee and warranty details |
| `objectionBusters` | Warranty + Support | Common objections with reassuring responses |
| `financingAndPayment` | Financing | Payment methods and installment options |
| `socialProofStats` | Financing | Headline statistics (units sold, rating, etc.) |

## Props Reference

### benefitStack

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Section heading |
| `items` | `array` | List of benefit items |
| `layout` | `"stack" \| "grid"` | Display layout |

Each item: `{ headline: string, description: string, icon: string (Lucide name), emphasis?: boolean }`

### scienceExplainer

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Section heading |
| `sections` | `array` | Research sections |
| `disclaimerText` | `string` | Required medical/informational disclaimer |

Each section: `{ heading: string, body: string, citationLabel: string, citationUrl: string }`

### recoveryUseCases

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Section heading |
| `cases` | `array` | Audience-segmented use cases |

Each case: `{ audience: string, headline: string, bullets: string[] }`

### safetyChecklist

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Section heading |
| `items` | `array` | Checklist items |
| `disclaimerText` | `string` | Required safety disclaimer |

Each item: `{ text: string, required: boolean }`

### protocolBuilder

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Section heading |
| `protocols` | `array` | Protocols by experience level |
| `disclaimerText` | `string` | Required medical disclaimer |

Each protocol: `{ level: string, tempRange: string, duration: string, frequency: string, notes: string }`

### deliveryAndSetup

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Section heading |
| `steps` | `array` | Delivery/setup steps |
| `includesBullets` | `string[]` | What's in the box |
| `shippingEstimateText` | `string` | Shipping timeframe note |

Each step: `{ title: string, description: string }`

### beforeAfterExpectations

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Section heading |
| `expectations` | `array` | Timeline milestones |

Each expectation: `{ label: string, description: string }`

### guaranteeAndWarranty

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Section heading |
| `guaranteeBullets` | `string[]` | Guarantee details |
| `warrantySummary` | `string` | Warranty description text |
| `supportCtaText` | `string` | Support button label |
| `supportCtaHref` | `string` | Support button link |

### objectionBusters

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Section heading |
| `items` | `array` | Objection/response pairs |

Each item: `{ objection: string, response: string }`

### financingAndPayment

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Section heading |
| `bullets` | `string[]` | Payment method details |
| `financingProviderName` | `string` | Financing partner name |
| `financingDisclaimer` | `string` | Required financing disclaimer |

### socialProofStats

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Section heading |
| `stats` | `array` | Headline metrics |
| `disclaimer` | `string` | Stats disclaimer |

Each stat: `{ value: string, label: string }`

## Safe Wording Guidelines

Cold plunge marketing sits in a regulated space. Content must promote the product without making medical claims that could expose the business to liability.

### Do

- **Use hedging language:** "may help," "can support," "users often report," "research suggests"
- **Cite sources:** When referencing studies, include the citation label (e.g., "Shevchuk, 2008") and note it is for informational purposes
- **Focus on user experience:** "Many users describe feeling more alert" rather than "cold plunging increases alertness"
- **Acknowledge individual variation:** "Results vary based on frequency, duration, and individual factors"
- **Include disclaimers:** Every block that discusses health benefits must include a disclaimer (see below)

### Do Not

- **Make absolute medical claims:** Never say "cold plunging cures," "treats," "heals," or "prevents" any condition
- **Promise specific outcomes:** Avoid "you will lose weight," "guaranteed recovery," or "clinically proven to..."
- **Diagnose or prescribe:** Never suggest cold plunging as a replacement for medical treatment
- **Use superlatives without qualification:** Avoid "the best treatment for..." or "the most effective way to..."
- **Reference FDA approval:** Cold plunge tubs are not FDA-approved medical devices — never imply otherwise

### Example Transformations

| Unsafe | Safe |
|--------|------|
| "Cold plunging reduces inflammation" | "Cold exposure may help modulate the inflammatory response" |
| "Cures muscle soreness" | "Many users report reduced muscle soreness after regular use" |
| "Proven to improve sleep" | "Regular cold plunging may support better sleep quality" |
| "Boosts your immune system" | "Some research suggests cold exposure may support immune function" |

## Default Disclaimer Usage

Several block types include a `disclaimerText` prop. This disclaimer should always be present and visible on any page that discusses health benefits, safety protocols, or scientific claims.

### Standard Disclaimers

**Health Benefits Disclaimer** (used in `scienceExplainer`):
> This content is for informational purposes only and is not intended as medical advice. Consult a qualified healthcare professional before beginning any cold exposure practice.

**Safety Disclaimer** (used in `safetyChecklist`):
> Cold water immersion carries inherent risks. Individuals with cardiovascular conditions, Raynaud's disease, or pregnancy should avoid cold plunging. Always consult a qualified healthcare provider.

**Protocol Disclaimer** (used in `protocolBuilder`):
> Consult a healthcare professional before starting any cold exposure protocol. Individual tolerance varies — start conservatively and progress gradually.

**Financing Disclaimer** (used in `financingAndPayment`):
> Financing is subject to credit approval. Terms and rates may vary based on creditworthiness. 0% APR available on select terms for qualified buyers.

**Stats Disclaimer** (used in `socialProofStats`):
> Statistics reflect cumulative data as of the most recent reporting period.

### Rules for Disclaimers

1. **Never remove disclaimers** from blocks that ship with them — they exist for legal and compliance reasons
2. **Keep disclaimers visible** — do not hide them behind accordions, tooltips, or collapsed sections
3. **Match disclaimer to content** — if you add health claims to a custom block, include the health benefits disclaimer
4. **Financing disclaimers are required** — any page displaying financing terms must include the financing disclaimer
5. **Customize carefully** — you may adjust wording to fit your brand voice, but do not weaken the legal substance

## Source Code Location

| File | Purpose |
|------|---------|
| `server/src/data/sectionKits.ts` | Kit definitions and block data |
| `client/src/cms/blocks/entries.ts` | Block registration (core blocks) |
| `client/src/cms/blocks/schemas.ts` | Zod validation schemas |
| `client/src/cms/blocks/types.ts` | TypeScript interfaces |
