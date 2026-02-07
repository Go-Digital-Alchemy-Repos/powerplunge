import type { ComponentType } from "react";

export interface BlockSettings {
  visibility?: "all" | "desktop" | "mobile";
  className?: string;
  anchor?: string;
  alignment?: "left" | "center" | "right";
  background?: "none" | "light" | "dark" | "primary" | "gradient";
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  splitLayout?: "none" | "left" | "right";
}

export interface BlockRenderProps {
  data: Record<string, any>;
  settings?: BlockSettings;
  onAddToCart?: (productId: string, quantity: number) => void;
}

export type BlockRenderComponent = ComponentType<BlockRenderProps>;

export interface PuckFieldConfig {
  type: "text" | "textarea" | "number" | "select" | "radio" | "custom" | "array" | "object";
  label?: string;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  arrayFields?: Record<string, PuckFieldConfig>;
  objectFields?: Record<string, PuckFieldConfig>;
}

export interface BlockDefinition {
  type: string;
  label: string;
  category: BlockCategory;
  version: number;
  description: string;
  icon?: string;
  renderComponent: BlockRenderComponent;
  defaultProps: Record<string, any>;
  puckFields: Record<string, PuckFieldConfig>;
}

export type BlockCategory =
  | "layout"
  | "marketing"
  | "ecommerce"
  | "trust"
  | "media"
  | "utility";

export interface PageBlock {
  id: string;
  type: string;
  data: Record<string, any>;
  settings?: BlockSettings;
}

export interface PageContentJson {
  version: number;
  blocks: PageBlock[];
}
