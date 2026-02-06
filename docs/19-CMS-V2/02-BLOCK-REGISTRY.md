# Block Registry

The block registry is the central catalog of all content block types available in the CMS v2 page builder. Each block defines its type identifier, display label, category, default props, Puck editor fields, and render component.

## Registry Architecture

```
client/src/lib/blockRegistry.ts         → Core registry (registerBlock, getAllBlocks, getBlock)
client/src/lib/blockRegistryEntries.ts  → Registers all 20+ block types
client/src/components/PageRenderer.tsx  → Maps block types to render components
```

Blocks are registered at application startup via `registerAllBlocks()`. The Puck editor reads the registry to build its component palette, and the `PageRenderer` uses it for public-facing rendering.

## Block Data Structure

Every block stored in `contentJson.blocks[]` follows this shape:

```json
{
  "id": "uuid-string",
  "type": "hero",
  "data": { "title": "Welcome", "subtitle": "..." },
  "settings": {}
}
```

- **id** — Unique identifier (UUID)
- **type** — Must match a registered block type
- **data** — Block-specific props (matches `defaultProps` shape)
- **settings** — Reserved for future per-block settings

## Registered Block Types

### Layout

| Type | Label | Default Props |
|------|-------|--------------|
| `hero` | Hero | title, titleHighlight, subtitle, badge, primaryButtonText, primaryButtonLink, primaryButtonAction, secondaryButtonText, secondaryButtonLink, backgroundImage, image |
| `cta` | Call to Action | title, titleHighlight, subtitle, buttonText, buttonLink, buttonAction, productId, secondaryButton, secondaryLink |
| `sectionRef` | Section Reference | sectionId, sectionName |

### Content

| Type | Label | Default Props |
|------|-------|--------------|
| `richText` | Rich Text | content (HTML string) |
| `faq` | FAQ | title, items[] |
| `featureList` | Feature List | title, subtitle, columns, features[] |
| `featureGrid` | Feature Grid | title, titleHighlight, columns, items[] |
| `statsBar` | Stats Bar | stats[] |
| `iconGrid` | Icon Grid | title, titleHighlight, columns, items[] |

### Media

| Type | Label | Default Props |
|------|-------|--------------|
| `image` | Image | src, alt, caption, fullWidth |
| `imageGrid` | Image Grid | title, columns, images[] |
| `videoEmbed` | Video Embed | title, url, thumbnail, caption |
| `slider` | Slider | title, slides[] |

### Commerce

| Type | Label | Default Props |
|------|-------|--------------|
| `productGrid` | Product Grid | title, mode (all/featured/specific), columns, limit |
| `featuredProduct` | Featured Product | (uses site settings) |
| `guarantee` | Guarantee | title, description, icon |
| `comparisonTable` | Comparison Table | title, featureColumnLabel, columns[], rows[] |

### Social

| Type | Label | Default Props |
|------|-------|--------------|
| `testimonial` | Testimonials | title, testimonials[] |
| `logoCloud` | Logo Cloud | title, logos[] |

### Utility

| Type | Label | Default Props |
|------|-------|--------------|
| `divider` | Divider | style (solid/dashed/dotted/thick), color (default/primary) |
| `spacer` | Spacer | size (xs/sm/md/lg/xl) |

## Puck Field Types

Each block declares its editable fields using these Puck field types:

| Field Type | Puck Config | Use Case |
|------------|-------------|----------|
| `text` | `{ type: "text", label }` | Single-line text inputs |
| `textarea` | `{ type: "textarea", label }` | Multi-line content, HTML |
| `number` | `{ type: "number", label }` | Numeric values (columns, limits) |
| `select` | `{ type: "select", label, options }` | Dropdown choices |

## Adding a New Block Type

1. Add the render component to `blockComponents` in `PageRenderer.tsx`
2. Register the block in `blockRegistryEntries.ts`:

```typescript
registerBlock({
  type: "myBlock",
  label: "My Block",
  category: "content",
  version: 1,
  renderComponent: blockComponents.myBlock,
  defaultProps: { title: "", description: "" },
  puckFields: {
    title: textField("Title"),
    description: textareaField("Description"),
  },
});
```

3. The block will automatically appear in the Puck editor palette and be renderable on public pages.
