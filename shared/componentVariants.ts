import { z } from "zod";

export interface VariantOption {
  id: string;
  label: string;
  description: string;
  styles: Record<string, string>;
}

export interface ComponentVariantDef {
  component: string;
  label: string;
  description: string;
  defaultVariant: string;
  variants: VariantOption[];
}

export const COMPONENT_VARIANTS: ComponentVariantDef[] = [
  {
    component: "button",
    label: "Button",
    description: "Primary action buttons, CTAs, and interactive controls",
    defaultVariant: "rounded",
    variants: [
      {
        id: "rounded",
        label: "Rounded",
        description: "Standard rounded corners using theme radius",
        styles: {
          "--cv-button-radius": "var(--theme-radius, 0.5rem)",
          "--cv-button-padding": "0.625rem 1.5rem",
          "--cv-button-font-weight": "600",
          "--cv-button-shadow": "none",
        },
      },
      {
        id: "pill",
        label: "Pill",
        description: "Fully rounded capsule shape for soft, modern look",
        styles: {
          "--cv-button-radius": "9999px",
          "--cv-button-padding": "0.625rem 2rem",
          "--cv-button-font-weight": "600",
          "--cv-button-shadow": "none",
        },
      },
      {
        id: "square",
        label: "Square",
        description: "Sharp corners for a bold, structured feel",
        styles: {
          "--cv-button-radius": "0",
          "--cv-button-padding": "0.75rem 1.5rem",
          "--cv-button-font-weight": "700",
          "--cv-button-shadow": "none",
        },
      },
      {
        id: "soft",
        label: "Soft",
        description: "Subtle radius with a gentle drop shadow",
        styles: {
          "--cv-button-radius": "0.375rem",
          "--cv-button-padding": "0.625rem 1.5rem",
          "--cv-button-font-weight": "500",
          "--cv-button-shadow": "0 1px 3px rgba(0,0,0,0.2)",
        },
      },
    ],
  },
  {
    component: "card",
    label: "Card",
    description: "Content cards, product cards, and information panels",
    defaultVariant: "elevated",
    variants: [
      {
        id: "flat",
        label: "Flat",
        description: "No shadow or border — blends into the background",
        styles: {
          "--cv-card-radius": "var(--theme-radius, 0.5rem)",
          "--cv-card-border": "none",
          "--cv-card-shadow": "none",
          "--cv-card-bg": "var(--theme-bg-card, #111827)",
        },
      },
      {
        id: "elevated",
        label: "Elevated",
        description: "Subtle shadow for depth and visual hierarchy",
        styles: {
          "--cv-card-radius": "var(--theme-radius, 0.5rem)",
          "--cv-card-border": "none",
          "--cv-card-shadow": "0 4px 12px rgba(0,0,0,0.25)",
          "--cv-card-bg": "var(--theme-bg-card, #111827)",
        },
      },
      {
        id: "outlined",
        label: "Outlined",
        description: "Bordered card with no shadow for a clean look",
        styles: {
          "--cv-card-radius": "var(--theme-radius, 0.5rem)",
          "--cv-card-border": "1px solid var(--theme-border, #374151)",
          "--cv-card-shadow": "none",
          "--cv-card-bg": "var(--theme-bg-card, #111827)",
        },
      },
    ],
  },
  {
    component: "hero",
    label: "Hero",
    description: "Hero banners and full-width header sections",
    defaultVariant: "full-bleed",
    variants: [
      {
        id: "full-bleed",
        label: "Full Bleed",
        description: "Edge-to-edge hero with no horizontal padding",
        styles: {
          "--cv-hero-padding": "4rem 0",
          "--cv-hero-max-width": "100%",
          "--cv-hero-radius": "0",
          "--cv-hero-text-align": "center",
        },
      },
      {
        id: "contained",
        label: "Contained",
        description: "Constrained width with rounded corners",
        styles: {
          "--cv-hero-padding": "3rem 2rem",
          "--cv-hero-max-width": "72rem",
          "--cv-hero-radius": "var(--theme-radius, 0.5rem)",
          "--cv-hero-text-align": "center",
        },
      },
      {
        id: "split",
        label: "Split",
        description: "Left-aligned text for a split-layout hero",
        styles: {
          "--cv-hero-padding": "4rem 2rem",
          "--cv-hero-max-width": "100%",
          "--cv-hero-radius": "0",
          "--cv-hero-text-align": "left",
        },
      },
    ],
  },
  {
    component: "section",
    label: "Section",
    description: "Content sections and page layout blocks",
    defaultVariant: "spacious",
    variants: [
      {
        id: "spacious",
        label: "Spacious",
        description: "Generous vertical padding for breathing room",
        styles: {
          "--cv-section-padding": "4rem 2rem",
          "--cv-section-gap": "2rem",
          "--cv-section-max-width": "72rem",
          "--cv-section-border-bottom": "none",
        },
      },
      {
        id: "compact",
        label: "Compact",
        description: "Tighter spacing for dense content layouts",
        styles: {
          "--cv-section-padding": "2rem 1.5rem",
          "--cv-section-gap": "1rem",
          "--cv-section-max-width": "72rem",
          "--cv-section-border-bottom": "none",
        },
      },
      {
        id: "divided",
        label: "Divided",
        description: "Spacious layout with a subtle bottom border between sections",
        styles: {
          "--cv-section-padding": "3.5rem 2rem",
          "--cv-section-gap": "1.5rem",
          "--cv-section-max-width": "72rem",
          "--cv-section-border-bottom": "1px solid var(--theme-border, #374151)",
        },
      },
    ],
  },
  {
    component: "divider",
    label: "Divider",
    description: "Horizontal rules and section separators",
    defaultVariant: "subtle",
    variants: [
      {
        id: "subtle",
        label: "Subtle",
        description: "Thin, muted line that recedes into the background",
        styles: {
          "--cv-divider-height": "1px",
          "--cv-divider-color": "var(--theme-border, #374151)",
          "--cv-divider-width": "100%",
          "--cv-divider-margin": "2rem 0",
          "--cv-divider-style": "solid",
        },
      },
      {
        id: "bold",
        label: "Bold",
        description: "Thicker, more visible separation line",
        styles: {
          "--cv-divider-height": "2px",
          "--cv-divider-color": "var(--theme-primary, #67e8f9)",
          "--cv-divider-width": "100%",
          "--cv-divider-margin": "2.5rem 0",
          "--cv-divider-style": "solid",
        },
      },
      {
        id: "centered",
        label: "Centered",
        description: "Short centered rule for visual punctuation",
        styles: {
          "--cv-divider-height": "2px",
          "--cv-divider-color": "var(--theme-primary-muted, rgba(103,232,249,0.15))",
          "--cv-divider-width": "4rem",
          "--cv-divider-margin": "2rem auto",
          "--cv-divider-style": "solid",
        },
      },
      {
        id: "dashed",
        label: "Dashed",
        description: "Dashed line for a lighter visual break",
        styles: {
          "--cv-divider-height": "1px",
          "--cv-divider-color": "var(--theme-border, #374151)",
          "--cv-divider-width": "100%",
          "--cv-divider-margin": "2rem 0",
          "--cv-divider-style": "dashed",
        },
      },
    ],
  },
  {
    component: "productCard",
    label: "Product Card",
    description: "Product display cards in grids and listings",
    defaultVariant: "standard",
    variants: [
      {
        id: "standard",
        label: "Standard",
        description: "Elevated card with image, title, and price",
        styles: {
          "--cv-product-card-radius": "var(--theme-radius, 0.5rem)",
          "--cv-product-card-shadow": "0 4px 12px rgba(0,0,0,0.25)",
          "--cv-product-card-border": "none",
          "--cv-product-card-img-ratio": "4/3",
          "--cv-product-card-padding": "1rem",
        },
      },
      {
        id: "minimal",
        label: "Minimal",
        description: "Borderless, flat design with tight spacing",
        styles: {
          "--cv-product-card-radius": "0.25rem",
          "--cv-product-card-shadow": "none",
          "--cv-product-card-border": "none",
          "--cv-product-card-img-ratio": "1/1",
          "--cv-product-card-padding": "0.75rem",
        },
      },
      {
        id: "bordered",
        label: "Bordered",
        description: "Clean outlined card with visible structure",
        styles: {
          "--cv-product-card-radius": "var(--theme-radius, 0.5rem)",
          "--cv-product-card-shadow": "none",
          "--cv-product-card-border": "1px solid var(--theme-border, #374151)",
          "--cv-product-card-img-ratio": "4/3",
          "--cv-product-card-padding": "1rem",
        },
      },
    ],
  },
];

export const componentVariantSelectionSchema = z.record(
  z.string(),
  z.string(),
);

export type ComponentVariantSelection = z.infer<typeof componentVariantSelectionSchema>;

export function getVariantDef(component: string): ComponentVariantDef | undefined {
  return COMPONENT_VARIANTS.find((c) => c.component === component);
}

export function getVariantStyles(
  component: string,
  variantId: string,
): Record<string, string> {
  const def = getVariantDef(component);
  if (!def) return {};
  const variant = def.variants.find((v) => v.id === variantId);
  return variant ? { ...variant.styles } : {};
}

export function resolveAllVariantStyles(
  selection: ComponentVariantSelection,
): Record<string, string> {
  const merged: Record<string, string> = {};

  for (const def of COMPONENT_VARIANTS) {
    const selectedId = selection[def.component] ?? def.defaultVariant;
    const styles = getVariantStyles(def.component, selectedId);
    Object.assign(merged, styles);
  }

  return merged;
}

export function getDefaultSelection(): ComponentVariantSelection {
  const selection: ComponentVariantSelection = {};
  for (const def of COMPONENT_VARIANTS) {
    selection[def.component] = def.defaultVariant;
  }
  return selection;
}
