# Rendering Rules

This document describes how CMS pages are rendered on the public storefront, including the decision logic for blocks vs legacy HTML, the sanitization pipeline, error boundaries, and unknown block fallback behavior.

## Rendering Pipeline

### Decision Logic

When a CMS page is loaded for public display, the renderer follows this priority order:

```
1. If page.contentJson.blocks[] has entries  →  Render block-by-block
2. Else if page.content (legacy HTML) exists →  Render sanitized HTML
3. Else                                      →  Render empty placeholder
```

This logic lives in two locations:

| File | Role |
|------|------|
| `client/src/components/PageRenderer.tsx` | Reusable renderer component (used by homepage, shop, embedded pages) |
| `client/src/pages/page-view.tsx` | Standalone page route (`/page/:slug`) with its own blocks-vs-HTML check |

### Block Rendering

For each block in `contentJson.blocks[]`:

1. Look up the block's `type` in the block registry (`client/src/cms/blocks/registry.ts`)
2. If found, render the registered `renderComponent` with `{ data, settings, onAddToCart }`
3. If not found, render the `UnknownBlock` fallback component

The block registry is populated at app startup via `registerCmsV1Blocks()` in `client/src/cms/blocks/entries.ts`.

### Legacy HTML Rendering

When a page has no blocks but has legacy `content` (raw HTML string), it is rendered via `dangerouslySetInnerHTML` after passing through the `sanitizeHtml()` function.

## Content Validation (Server-Side)

On every `POST /pages` and `PUT /pages/:id` request, the server validates `contentJson` before saving:

**File:** `server/src/utils/contentValidation.ts`

### validateContentJson(raw)

| Input | Result |
|-------|--------|
| `null` or `undefined` | Valid (empty blocks array) |
| Non-object or array | Rejected with 400 error |
| Object without `blocks` array | Rejected with 400 error |
| Block missing `id` or `type` | Rejected with 400 error |
| Block with non-object `data` | Rejected with 400 error |
| Block with unknown `type` | Accepted with warning logged |
| All blocks valid | Accepted |

Known block types (checked for warnings, not enforced):

**Core blocks (12):** `hero`, `richText`, `image`, `imageGrid`, `featureList`, `testimonials`, `faq`, `callToAction`, `productGrid`, `productHighlight`, `trustBar`, `comparisonTable`

**Power Plunge domain blocks (12):** `benefitStack`, `scienceExplainer`, `protocolBuilder`, `recoveryUseCases`, `safetyChecklist`, `guaranteeAndWarranty`, `deliveryAndSetup`, `financingAndPayment`, `objectionBusters`, `beforeAfterExpectations`, `pressMentions`, `socialProofStats`

**Utility types:** `sectionRef`, `spacer`, `divider`, `header`, `footer`, `banner`, `video`, `html`

**File:** `server/src/utils/contentValidation.ts` (`KNOWN_BLOCK_TYPES` set)

Unknown block types produce a console warning but are never rejected. This preserves forward compatibility — content saved with a newer block type can still be loaded if the type is later removed.

### sanitizeHtml(html)

Strips dangerous HTML patterns from legacy content fields:

| Pattern | Action |
|---------|--------|
| `<script>...</script>` tags | Removed entirely |
| `on*="..."` event handlers | Removed from elements |
| `href="javascript:..."` URIs | Replaced with `href="#"` |

Sanitization is applied:
- **On save:** Server sanitizes `req.body.content` before database write
- **On render (client):** Every `dangerouslySetInnerHTML` usage passes through `sanitizeHtml()`

Client-side sanitization file: `client/src/lib/sanitizeHtml.ts`

## Sanitization Coverage

All `dangerouslySetInnerHTML` usage in CMS rendering paths is sanitized:

| File | Location | Sanitized |
|------|----------|-----------|
| `PageRenderer.tsx` | Legacy content fallback (line ~1217) | Yes |
| `PageRenderer.tsx` | Internal RichTextBlock (line ~193) | Yes |
| `page-view.tsx` | Legacy HTML branch (line ~81) | Yes |
| `cms/blocks/RichTextBlock.tsx` | Block body HTML (line ~35) | Yes |

Non-CMS uses of `dangerouslySetInnerHTML` (admin email preview, chart tooltips) are not sanitized as they do not render user-supplied content.

## Unknown Block Fallback

**File:** `client/src/components/UnknownBlock.tsx`

When the page renderer encounters a block type not in the registry, it renders the `UnknownBlock` component:

- Displays a yellow warning box with the unregistered type name
- Shows: "This block type is not registered. It may have been removed or renamed."
- Uses `data-testid="block-unknown-{type}"` for testing
- Never throws — ensures the page continues rendering remaining blocks

## Error Boundary

**File:** `client/src/components/CmsErrorBoundary.tsx`

All CMS admin routes are wrapped in `CmsErrorBoundary`, a React class component that catches rendering errors without crashing the entire admin UI.

On error:
- Displays a styled fallback with the error message
- Provides a "Try Again" button that resets the boundary
- Logs the error and component stack to the console
- Does not affect other parts of the admin or the public storefront

## Rendering Components

### PageRenderer

The main reusable renderer accepts:

```typescript
interface PageRendererProps {
  contentJson: PageContentJson | null;
  legacyContent?: string | null;
  onAddToCart?: (productId: string, quantity: number) => void;
}
```

It maintains an internal block component registry (separate from the CMS block registry) for backward compatibility with older page data that may use simplified block types.

### Block Components

All block render components receive:

```typescript
interface BlockRenderProps {
  data: Record<string, any>;
  settings?: BlockSettings;
  onAddToCart?: (id: string, qty: number) => void;
}
```

Blocks use CMS design system components (`Section`, `Container`, `FadeIn`, `Heading`, `Text`, `CmsButton`) and theme CSS variables (`--pp-*`) for consistent theming.

## Verification

### Automated Tests

Run the content safety regression test:

```bash
npx tsx scripts/smoke/cmsContentSafety.ts
```

This runs 21 assertions covering:
- contentJson shape validation (null, empty, invalid, unknown types)
- HTML sanitization (script removal, event handler removal, javascript: URI neutralization)

### Manual Checks

1. Create a page with an unknown block type via API — verify it renders the yellow fallback
2. Create a page with `<script>alert(1)</script>` in legacy content — verify the script is stripped
3. Save a page with malformed contentJson (missing `blocks` key) — verify 400 error response
4. Navigate to a CMS admin page and trigger a render error — verify error boundary catches it

## Related Documentation

- [Block Registry](02-BLOCK-REGISTRY.md) — How blocks are registered and looked up
- [Themes](07-THEMES.md) — CSS variable token system
- [API Reference](09-API-REFERENCE.md) — All CMS endpoints
- [Troubleshooting](../14-TROUBLESHOOTING/TOP_10_ISSUES.md) — Common issues and fixes
