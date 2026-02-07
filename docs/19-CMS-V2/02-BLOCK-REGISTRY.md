# Block Registry v1

The Block Registry is the central catalog of all content block types available in the CMS v2 page builder. It provides a type-safe, versioned system for registering, retrieving, validating, and rendering content blocks within both the Puck visual editor and the public-facing page renderer.

## Architecture

```
client/src/cms/blocks/
  registry.ts           → Core registry (Map<string, BlockDefinition>)
  entries.ts            → Registers all 12 block types via registerCmsV1Blocks()
  types.ts              → TypeScript interfaces (BlockDefinition, BlockCategory, etc.)
  blockCategories.ts    → Category definitions (single source of truth)
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

Blocks are organized into six categories. The single source of truth is `client/src/cms/blocks/blockCategories.ts`, which exports `BLOCK_CATEGORIES`. Both the Puck editor sidebar and the EnhancedBlockPicker derive their category groupings from this constant.

| Category ID | Label | Description | Sort Order |
|-------------|-------|-------------|------------|
| `layout` | Layout | Structural blocks for page layout and hero sections | 1 |
| `marketing` | Marketing | Conversion-focused blocks for promotions and engagement | 2 |
| `ecommerce` | Ecommerce | Product display and shopping experience blocks | 3 |
| `trust` | Trust | Social proof and credibility-building blocks | 4 |
| `media` | Media | Image and visual content blocks | 5 |
| `utility` | Utility | Informational and supporting content blocks | 6 |

### Category → Block Mapping

| Category | Blocks |
|----------|--------|
| Layout | `hero`, `callToAction` |
| Marketing | `featureList`, `richText` |
| Ecommerce | `productGrid`, `productHighlight`, `comparisonTable` |
| Trust | `testimonials`, `trustBar` |
| Media | `image`, `imageGrid` |
| Utility | `faq` |

### Helper Functions

```typescript
getCategoryLabel(categoryId: string): string       // e.g. "marketing" → "Marketing"
getCategoriesOrdered(): BlockCategoryDefinition[]   // sorted by sortOrder
getCategoryDefinition(categoryId: string)           // full definition or undefined
```

## Naming Conventions

Consistent naming ensures maintainability across the registry, templates, and editor.

### Block Type Keys

- **Format:** `lowerCamelCase` (e.g., `hero`, `richText`, `callToAction`, `featureList`, `productHighlight`)
- **Rule:** Must match exactly between the registry `type`, the Puck component key, template block definitions, and `contentJson.blocks[].type`
- **No abbreviations:** Use `comparisonTable`, not `compTable`

### Display Labels

- **Format:** Title Case (e.g., "Rich Text", "Call to Action", "Feature List")
- **Used in:** Puck sidebar, EnhancedBlockPicker, template thumbnails

### File Names

- **Block components:** PascalCase + `Block` suffix (e.g., `HeroBlock.tsx`, `CallToActionBlock.tsx`)
- **One component per file**

### Category IDs

- **Format:** `lowercase` single word (e.g., `layout`, `marketing`, `ecommerce`, `trust`, `media`, `utility`)

### Template IDs

- **Format:** `kebab-case` with version suffix (e.g., `landing-page-v1`, `product-story-v1`, `sales-funnel-v1`)

### CSS Variable Tokens

- **Prefix:** `--pp-` (e.g., `--pp-primary`, `--pp-bg`, `--pp-surface`, `--pp-font-family`, `--pp-section-py`)

## The 12 Default Blocks

### Layout

#### Hero (`hero`) — v1
Full-width hero section with headline, subheadline, CTA button, and optional background image. Uses `Heading` (level 1), `Text`, and `CmsButton` components. Supports `stacked` and `split` layout modes with theme token colors.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `headline` | `string` | `"Welcome to Power Plunge"` | Main heading text |
| `subheadline` | `string` | Product benefit copy | Supporting text |
| `ctaText` | `string` | `"Shop Now"` | CTA button label |
| `ctaHref` | `string` | `"/shop"` | CTA button link |
| `secondaryCtaText` | `string` | `"Learn More"` | Secondary CTA label |
| `secondaryCtaHref` | `string` | `"#features"` | Secondary CTA link |
| `backgroundImage` | `string` | `""` | Optional background image URL |
| `heroImage` | `string` | `""` | Side image for split layout |
| `align` | `"left" \| "center"` | `"center"` | Text alignment |
| `layout` | `"stacked" \| "split"` | `"stacked"` | Layout mode |
| `fullWidth` | `boolean` | `true` | Full viewport width |
| `overlayOpacity` | `number` | `60` | Background overlay opacity (0-100) |
| `minHeight` | `"default" \| "tall" \| "full"` | `"default"` | Minimum section height |
| `themeVariant` | `string` | `"ice"` | Visual variant |

#### Call to Action (`callToAction`) — v1
Conversion-focused section with primary and secondary CTA buttons. Uses `Heading` (level 2), `Text`, `Eyebrow`, and `CmsButton` components.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `headline` | `string` | `"Ready to Transform Your Recovery?"` | Heading text |
| `subheadline` | `string` | Conversion copy | Supporting text |
| `primaryCtaText` | `string` | `"Shop Now"` | Primary button label |
| `primaryCtaHref` | `string` | `"/shop"` | Primary button link |
| `secondaryCtaText` | `string` | `"Learn More"` | Secondary button label |
| `secondaryCtaHref` | `string` | `"#features"` | Secondary button link |

### Marketing

#### Rich Text (`richText`) — v1
Text content block with optional title and HTML body. Uses `Section` and `Container` layout components.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `"About Our Products"` | Section title |
| `bodyRichText` | `string` | HTML content | Rich HTML body (also reads from `content` as fallback) |
| `maxWidth` | `"prose" \| "wide" \| "full"` | `"prose"` | Content width constraint |
| `textAlign` | `"left" \| "center" \| "right"` | `"left"` | Text alignment |

#### Feature List (`featureList`) — v1
Grid of features with icons, titles, and descriptions. Uses `Section`, `Container`, `FadeIn`, `Heading`, and `Text` components. Feature cards use theme surface/border tokens.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `"Why Choose Power Plunge?"` | Section title |
| `items` | `array` | 3 features (Snowflake/Shield/Zap icons) | Feature items |
| `columns` | `number` | `3` | Grid columns (1-3) |

Each item: `{ icon: string (Lucide name), title: string, description: string }`

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
| `items` | `array` | 3 wellness/fitness photos | Grid image items (also reads `images` as fallback) |
| `columns` | `number` | `3` | Grid columns (2-4) |
| `spacing` | `"tight" \| "normal" \| "loose"` | `"normal"` | Gap between items |

Each item: `{ src: string, alt: string, caption: string, linkHref: string }`

### Ecommerce

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

#### Comparison Table (`comparisonTable`) — v1
Feature comparison table with highlight column support.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `"Compare Models"` | Table title |
| `columns` | `{ key: string, label: string }[]` | Column definitions | Table columns (first is feature label column) |
| `rows` | `array` | Comparison rows | Feature rows (see formats below) |
| `highlightColumnKey` | `string` | `""` | Column key to visually emphasize ("Recommended" badge) |

Row formats (all supported):
- `{ label: string, valuesByKey: Record<string, string | boolean> }` — keyed values
- `{ feature: string, values: (string | boolean)[] }` — positional values (matched by column index)
- `{ label: string, [columnKey]: string }` — flat object with column keys as properties

### Trust

#### Testimonials (`testimonials`) — v1
Customer testimonial cards with quote, name, title, and optional avatar.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `"What Our Customers Say"` | Section title |
| `items` | `array` | 3 customer testimonials | Testimonial items |
| `layout` | `"cards" \| "slider"` | `"cards"` | Display layout |

Each item: `{ quote: string, name: string, title: string, avatar: string }`

#### Trust Bar (`trustBar`) — v1
Row of trust signals with icons and labels.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `array` | 4 trust signals | Trust signal items |
| `layout` | `"row" \| "wrap"` | `"row"` | Display layout |

Each item: `{ icon: string (Lucide name), label: string, sublabel: string }`

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

Create a new file `client/src/cms/blocks/MyBlock.tsx`. Use the CMS design system components for consistency:

```typescript
import { Section, Container } from "@/cms/layout";
import { FadeIn } from "@/cms/motion";
import { Heading, Text, Eyebrow } from "@/cms/typography";
import { CmsButton } from "@/cms/ui";
import type { BlockRenderProps } from "./types";

export default function MyBlock({ data, settings }: BlockRenderProps) {
  const title = data?.title || "Default Title";
  const description = data?.description || "";
  const ctaText = data?.ctaText || "";
  const ctaHref = data?.ctaHref || "#";

  return (
    <Section className={settings?.className} data-testid="block-myblock">
      <Container>
        <FadeIn>
          <Heading level={2} align="center">{title}</Heading>
          <Text size="lg" muted align="center">{description}</Text>
          {ctaText && (
            <div className="mt-6 text-center">
              <CmsButton variant="primary" href={ctaHref}>{ctaText}</CmsButton>
            </div>
          )}
        </FadeIn>
      </Container>
    </Section>
  );
}
```

**Required design system usage:**

| Component | Import | Purpose |
|-----------|--------|---------|
| `Section` | `@/cms/layout` | Wraps every block with consistent vertical padding (`--pp-section-py`) and optional background |
| `Container` | `@/cms/layout` | Centers content with responsive max-width (`--pp-container-max`) and horizontal padding |
| `FadeIn` | `@/cms/motion` | Subtle entrance animation (fade + slide up) |
| `Heading` | `@/cms/typography` | H1/H2/H3 with responsive sizing, `--pp-font-family`, optional gradient |
| `Text` | `@/cms/typography` | Body text with size variants, `--pp-font-family`, `--pp-text` / `--pp-text-muted` colors |
| `Eyebrow` | `@/cms/typography` | Small uppercase label using `--pp-primary` color |
| `CmsButton` | `@/cms/ui` | Themed buttons with `primary` / `secondary` / `outline` / `ghost` variants, respects `--pp-primary`, `--pp-btn-radius` |
| `Stack` | `@/cms/layout` | Vertical flex with gap from `--pp-space-*` tokens |

**Theme token usage in inline styles:**

All blocks should use CSS custom properties (not hardcoded colors) for theming:

```typescript
// Colors
style={{ color: "var(--pp-text, #f9fafb)" }}
style={{ backgroundColor: "var(--pp-surface, #111827)" }}
style={{ borderColor: "var(--pp-border, #374151)" }}
style={{ color: "var(--pp-primary, #67e8f9)" }}

// Typography
style={{ fontFamily: "var(--pp-font-family, 'Inter', sans-serif)" }}

// Spacing
style={{ padding: "var(--pp-section-py, 3rem) 0" }}
```

All block components receive `BlockRenderProps`:
```typescript
interface BlockRenderProps {
  data: Record<string, any>;
  settings?: BlockSettings;
  onAddToCart?: (id: string, qty: number) => void;
}
```

### Step 2: Add a Zod Validation Schema

Add to `client/src/cms/blocks/schemas.ts`:

```typescript
export const myBlockSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().default(""),
  ctaText: z.string().default(""),
  ctaHref: z.string().default("#"),
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
  type: "myBlock",              // lowerCamelCase
  label: "My Block",            // Title Case
  category: "marketing",        // layout | marketing | ecommerce | trust | media | utility
  version: 1,
  description: "A brief description for the editor tooltip",
  renderComponent: MyBlock,
  defaultProps: {
    title: "Default Title",
    description: "Default description text for preview.",
    ctaText: "Get Started",
    ctaHref: "/shop",
  },
  puckFields: {
    title: textField("Title"),
    description: textareaField("Description"),
    ctaText: textField("CTA Button Text"),
    ctaHref: textField("CTA Button Link"),
  },
});
```

### Step 4: Add to Block Categories (if new category needed)

If your block belongs to an existing category, just use that category ID. To add a new category, edit `client/src/cms/blocks/blockCategories.ts`:

```typescript
export const BLOCK_CATEGORIES: BlockCategoryDefinition[] = [
  // ... existing categories
  {
    id: "myCategory",
    label: "My Category",
    description: "Description of the category",
    sortOrder: 7,
  },
];
```

### Step 5: Done

The block automatically:
- Appears in the Puck editor component palette under its category
- Appears in the EnhancedBlockPicker with search and category filtering
- Is renderable on public-facing pages via the page renderer
- Gets validated on save via its Zod schema
- Falls back to `UnknownBlock` if ever unregistered

## Registry Organization

The block registry is organized in layers for separation of concerns:

```
blockCategories.ts    ← Category definitions (single source of truth)
       ↓
types.ts              ← TypeScript interfaces
       ↓
helpers.ts            ← Puck field configuration helpers
       ↓
schemas.ts            ← Zod validation per block type
       ↓
entries.ts            ← Block registration (imports components)
       ↓
registry.ts           ← Core Map<string, BlockDefinition> store
       ↓
init.ts               ← App startup bootstrap
       ↓
index.ts              ← Public barrel export
```

The EnhancedBlockPicker in the CMS v2 builder derives its category tabs from `BLOCK_CATEGORIES`, ensuring consistent grouping across the sidebar and the quick-insert panel.

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
