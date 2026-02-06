# Block Registry v1

The Block Registry is the central catalog of all content block types available in the CMS v2 page builder. It provides a type-safe, versioned system for registering, retrieving, validating, and rendering content blocks within both the Puck visual editor and the public-facing page renderer.

## Architecture

```
client/src/cms/blocks/
  registry.ts           → Core registry (Map<string, BlockDefinition>)
  entries.ts            → Registers all 12 block types via registerCmsV1Blocks()
  types.ts              → TypeScript interfaces (BlockDefinition, BlockCategory, etc.)
  categories.ts         → Category metadata (labels, descriptions, ordering)
  schemas.ts            → Zod validation schemas per block type
  helpers.ts            → Puck field builder helpers (textField, arrayField, etc.)
  init.ts               → Bootstrap/initialization entry point
  index.ts              → Public barrel export
  unknown/
    UnknownBlock.tsx    → Fallback renderer for unregistered block types
  HeroBlock.tsx         → Individual block render components
  RichTextBlock.tsx
  ImageBlock.tsx
  ImageGridBlock.tsx
  FeatureListBlock.tsx
  TestimonialsBlock.tsx
  FAQBlock.tsx
  CallToActionBlock.tsx
  ProductGridBlock.tsx
  ProductHighlightBlock.tsx
  TrustBarBlock.tsx
  ComparisonTableBlock.tsx
```

### Data Flow

1. `registerCmsV1Blocks()` is called at app startup (from `init.ts`)
2. Each call to `registerBlock()` adds a `BlockDefinition` to the internal `Map<string, BlockDefinition>`
3. The Puck page builder reads the registry via `getAllBlocks()` to build its component palette
4. The public page renderer uses `getBlock(type)` to resolve render components
5. On save, `validateBlockData()` runs Zod validation against the block's schema

### Registry API

| Function | Signature | Purpose |
|----------|-----------|---------|
| `registerBlock` | `(entry: BlockDefinition) => void` | Add a block type to the registry |
| `getBlock` | `(type: string) => BlockDefinition \| undefined` | Look up a single block by type |
| `getAllBlocks` | `() => BlockDefinition[]` | Return all registered blocks |
| `getBlocksByCategory` | `(category: BlockCategory) => BlockDefinition[]` | Filter blocks by category |
| `getBlockTypes` | `() => string[]` | List all registered type identifiers |
| `getBlockComponent` | `(type: string) => BlockRenderComponent \| undefined` | Get the React component for a type |
| `isRegistered` | `(type: string) => boolean` | Check if a type exists |

## Block Data Structure

Every block stored in a page's `contentJson.blocks[]` follows this shape:

```json
{
  "id": "uuid-string",
  "type": "hero",
  "data": { "headline": "Welcome", "subheadline": "..." },
  "settings": {}
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier (UUID, generated on insert) |
| `type` | `string` | Must match a registered block type key |
| `data` | `Record<string, any>` | Block-specific props matching the `defaultProps` shape |
| `settings` | `BlockSettings` | Per-block display settings (visibility, className, anchor, alignment, background, padding, splitLayout) |

### BlockSettings Interface

```typescript
interface BlockSettings {
  visibility?: "all" | "desktop" | "mobile";
  className?: string;
  anchor?: string;
  alignment?: "left" | "center" | "right";
  background?: "none" | "light" | "dark" | "primary" | "gradient";
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  splitLayout?: "none" | "left" | "right";
}
```

## Block Categories

Blocks are organized into six categories, defined in `client/src/cms/blocks/categories.ts`:

| Category ID | Label | Description | Order |
|-------------|-------|-------------|-------|
| `layout` | Layout | Page structure and hero sections | 1 |
| `content` | Content | Text, features, and informational blocks | 2 |
| `media` | Media | Images, video, and galleries | 3 |
| `commerce` | Commerce | Products, pricing, and trust signals | 4 |
| `social` | Social | Testimonials, logos, and social proof | 5 |
| `utility` | Utility | Dividers, spacers, and layout helpers | 6 |

In the Puck editor, categories are displayed with user-friendly group labels:
- **Layout & Marketing** (layout blocks)
- **Content** (content blocks)
- **Media** (media blocks)
- **E-commerce** (commerce blocks)
- **Trust & Social Proof** (social blocks)
- **Utility** (utility blocks)

## The 12 Default Blocks

### Layout

#### Hero (`hero`) — v1
Full-width hero section with headline, subheadline, CTA button, and optional background image.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `headline` | `string` | `"Welcome to Power Plunge"` | Main heading text |
| `subheadline` | `string` | Product benefit copy | Supporting text |
| `ctaText` | `string` | `"Shop Now"` | CTA button label |
| `ctaHref` | `string` | `"/shop"` | CTA button link |
| `backgroundImage` | `string` | `""` | Optional background image URL |
| `align` | `"left" \| "center"` | `"center"` | Text alignment |
| `themeVariant` | `string` | `"ice"` | Visual variant (`""` or `"ice"`) |

#### Call to Action (`callToAction`) — v1
Conversion-focused section with primary and secondary CTA buttons.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `headline` | `string` | `"Ready to Transform Your Recovery?"` | Heading text |
| `subheadline` | `string` | Conversion copy | Supporting text |
| `primaryCtaText` | `string` | `"Shop Now"` | Primary button label |
| `primaryCtaHref` | `string` | `"/shop"` | Primary button link |
| `secondaryCtaText` | `string` | `"Learn More"` | Secondary button label |
| `secondaryCtaHref` | `string` | `"#features"` | Secondary button link |

### Content

#### Rich Text (`richText`) — v1
Text content block with optional title and HTML body.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `"About Our Products"` | Section title |
| `bodyRichText` | `string` | Multi-paragraph product copy | HTML content body |
| `align` | `"left" \| "center" \| "right"` | `"left"` | Text alignment |

#### Feature List (`featureList`) — v1
Grid of features with icons, titles, and descriptions.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `"Why Choose Power Plunge?"` | Section title |
| `items` | `array` | 3 features (Snowflake/Shield/Zap icons) | Feature items |
| `columns` | `number` | `3` | Grid columns (1-3) |

Each item: `{ icon: string (Lucide name), title: string, description: string }`

Default features: Precise Temperature (37-60°F), Medical-Grade Build (304 stainless steel), Rapid Cooling (2 hours from room temp).

#### FAQ (`faq`) — v1
Accordion-style frequently asked questions.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `"Frequently Asked Questions"` | Section title |
| `items` | `array` | 3 Q&A pairs | Question/answer items |
| `allowMultipleOpen` | `boolean` | `false` | Allow multiple accordions open at once |

Each item: `{ q: string, a: string }`

### Media

#### Image (`image`) — v1
Single image with optional caption and link.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | Unsplash wellness photo | Image source URL |
| `alt` | `string` | Descriptive alt text | Accessibility alt text |
| `caption` | `string` | `"The Power Plunge Pro in action"` | Image caption |
| `aspectRatio` | `string` | `"16:9"` | Aspect ratio (`""`, `"16:9"`, `"4:3"`, `"1:1"`) |
| `rounded` | `boolean` | `true` | Rounded corners |
| `linkHref` | `string` | `""` | Optional link on click |

#### Image Grid (`imageGrid`) — v1
Multi-image grid with captions and links.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `array` | 3 wellness/fitness photos | Grid image items |
| `columns` | `number` | `3` | Grid columns (2-4) |
| `spacing` | `"tight" \| "normal" \| "loose"` | `"normal"` | Gap between items |

Each item: `{ src: string, alt: string, caption: string, linkHref: string }`

### E-commerce

#### Product Grid (`productGrid`) — v1
Displays products in a grid with filtering options.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `"Our Products"` | Section title |
| `productIds` | `string[]` | `[]` | Specific product IDs (for `ids` mode) |
| `collectionTag` | `string` | `""` | Tag filter (for `tag` mode) |
| `queryMode` | `"all" \| "ids" \| "tag"` | `"all"` | How to select products |
| `columns` | `number` | `3` | Grid columns (2-4) |
| `showPrice` | `boolean` | `true` | Display price on cards |

#### Product Highlight (`productHighlight`) — v1
Detailed single product showcase with gallery and bullets.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `productId` | `string` | `""` | Product ID to highlight |
| `highlightBullets` | `string[]` | 4 feature bullets | Key selling points |
| `showGallery` | `boolean` | `true` | Show image gallery |
| `showBuyButton` | `boolean` | `true` | Show buy/add-to-cart button |

Default bullets: Medical-grade steel, Digital temperature controller, UV sanitation, Energy-efficient design.

#### Comparison Table (`comparisonTable`) — v1
Feature comparison table with highlight column support.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `"Compare Models"` | Table title |
| `columns` | `array` | Feature / Standard / Pro | Table columns |
| `rows` | `array` | 4 comparison rows | Feature rows with values per column |
| `highlightColumnKey` | `string` | `"pro"` | Column key to visually emphasize |

Each column: `{ key: string, label: string }`
Each row: `{ label: string, [columnKey]: string }`

### Trust & Social Proof

#### Testimonials (`testimonials`) — v1
Customer testimonial cards or slider layout.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `"What Our Customers Say"` | Section title |
| `items` | `array` | 3 customer testimonials | Testimonial items |
| `layout` | `"cards" \| "slider"` | `"cards"` | Display layout |

Each item: `{ quote: string, name: string, title: string, avatar: string }`

Default testimonials include Alex Johnson (Professional Athlete), Sarah Chen (Wellness Studio Owner), Marcus Williams (Fitness Coach).

#### Trust Bar (`trustBar`) — v1
Row of trust signals with icons and labels.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `array` | 4 trust signals | Trust signal items |
| `layout` | `"row" \| "wrap"` | `"row"` | Display layout |

Each item: `{ icon: string (Lucide name), label: string, sublabel: string }`

Default signals: Free Shipping, 2-Year Warranty, 24/7 Support, 30-Day Returns.

## Puck Field Types

Each block declares its editable fields using helper functions from `client/src/cms/blocks/helpers.ts`:

| Helper | Puck Config | Use Case |
|--------|-------------|----------|
| `textField(label)` | `{ type: "text" }` | Single-line text inputs |
| `textareaField(label)` | `{ type: "textarea" }` | Multi-line content, HTML |
| `numberField(label, min, max)` | `{ type: "number" }` | Numeric values (columns, limits) |
| `selectField(label, options)` | `{ type: "select" }` | Dropdown choices |
| `checkboxField(label)` | `{ type: "custom" }` | Boolean toggles |
| `arrayField(label, itemFields)` | `{ type: "array" }` | Repeatable item lists |

## Validation

Block data is validated using Zod schemas defined in `client/src/cms/blocks/schemas.ts`. The validation system provides:

### Per-Block Schemas

Every block type has a corresponding Zod schema (e.g., `heroSchema`, `richTextSchema`). Schemas enforce:
- Required fields (`z.string().min(1)`)
- Default values (`z.string().default("")`)
- Enum constraints (`z.enum(["left", "center", "right"])`)
- Array item validation (nested object schemas)
- Numeric ranges (`z.number().min(2).max(4)`)

### Validation API

```typescript
validateBlockData(type: string, data: unknown)
// Returns { success: true, data } or { success: false, errors: string[] }

validatePageBlocks(blocks: { type: string; data: unknown }[])
// Returns { valid: boolean, warnings: string[] }
```

If a block type has no registered schema, validation passes through (warns to console). This allows forward-compatible content.

## UnknownBlock Behavior

When the page renderer encounters a block type not in the registry, it renders the `UnknownBlock` component (`client/src/cms/blocks/unknown/UnknownBlock.tsx`):

- Displays a yellow warning box with the unregistered type name
- Shows the message: "This block type is not registered. It may have been removed or renamed."
- Provides an expandable section to inspect the raw block JSON data
- Uses `data-testid="block-unknown-{type}"` for testing

This ensures pages with removed or renamed block types never crash — they degrade gracefully with a visible warning.

## How to Add a New Block

### Step 1: Create the Render Component

Create a new file `client/src/cms/blocks/MyBlock.tsx`:

```typescript
import type { BlockRenderProps } from "./types";

export default function MyBlock({ data }: BlockRenderProps) {
  return (
    <section className="max-w-5xl mx-auto px-4 py-12">
      <h2 className="text-2xl font-bold text-white">{data.title}</h2>
      <p className="text-gray-300 mt-2">{data.description}</p>
    </section>
  );
}
```

All block components receive `BlockRenderProps`:
```typescript
interface BlockRenderProps {
  data: Record<string, any>;      // The block's prop data
  settings?: BlockSettings;       // Per-block display settings
  onAddToCart?: (id: string, qty: number) => void;  // Commerce callback
}
```

### Step 2: Add a Zod Validation Schema

Add to `client/src/cms/blocks/schemas.ts`:

```typescript
export const myBlockSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().default(""),
});
export type MyBlockProps = z.infer<typeof myBlockSchema>;
```

Add the entry to `blockSchemaMap`:
```typescript
const blockSchemaMap: Record<string, z.ZodTypeAny> = {
  // ... existing entries
  myBlock: myBlockSchema,
};
```

### Step 3: Register the Block

Add to `registerCmsV1Blocks()` in `client/src/cms/blocks/entries.ts`:

```typescript
import MyBlock from "./MyBlock";

registerBlock({
  type: "myBlock",
  label: "My Block",
  category: "content",      // layout | content | media | commerce | social | utility
  version: 1,
  description: "A brief description for the editor tooltip",
  renderComponent: MyBlock,
  defaultProps: {
    title: "Default Title",
    description: "Default description text for preview.",
  },
  puckFields: {
    title: textField("Title"),
    description: textareaField("Description"),
  },
});
```

### Step 4: Done

The block automatically:
- Appears in the Puck editor component palette under its category
- Is renderable on public-facing pages via the page renderer
- Gets validated on save via its Zod schema
- Falls back to `UnknownBlock` if ever unregistered

## Versioning Strategy

Each block has a `version` field (currently `1` for all blocks). The versioning strategy is:

1. **Non-breaking changes** (adding optional props with defaults): Keep version at `1`. Zod schemas handle missing props via `.default()`.
2. **Breaking changes** (renaming props, changing data shape): Bump to `version: 2`. Write a migration function in the block's entry to transform `v1 → v2` data.
3. **Deprecation**: Set `deprecated: true` on the block definition. The block still renders existing content but is hidden from the editor palette.

The `contentJson.version` field at the page level (currently `1`) tracks the overall content format. If the block storage format ever changes fundamentally (e.g., removing the `settings` field), bump the page-level version and write a migration.

### Forward Compatibility

- Unknown block types render `UnknownBlock` (no crash)
- Missing props in block data are filled by Zod defaults
- Extra props in block data are ignored (Zod strips them only in strict mode; we use passthrough)
