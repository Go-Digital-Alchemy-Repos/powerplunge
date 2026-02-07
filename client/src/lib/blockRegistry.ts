import type { ComponentType } from "react";
import type { BlockSettings } from "@/components/PageRenderer";

export interface BlockRegistryEntry {
  type: string;
  label: string;
  category: "layout" | "marketing" | "ecommerce" | "trust" | "media" | "utility";
  defaultProps: Record<string, any>;
  renderComponent: ComponentType<{
    data: Record<string, any>;
    settings?: BlockSettings;
    onAddToCart?: (productId: string, quantity: number) => void;
  }>;
  puckFields: Record<string, PuckFieldConfig>;
  version: number;
}

export interface PuckFieldConfig {
  type: "text" | "textarea" | "number" | "select" | "radio" | "custom" | "array" | "object";
  label?: string;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  arrayFields?: Record<string, PuckFieldConfig>;
  objectFields?: Record<string, PuckFieldConfig>;
}

const registry = new Map<string, BlockRegistryEntry>();

export function registerBlock(entry: BlockRegistryEntry): void {
  registry.set(entry.type, entry);
}

export function getBlock(type: string): BlockRegistryEntry | undefined {
  return registry.get(type);
}

export function getAllBlocks(): BlockRegistryEntry[] {
  return Array.from(registry.values());
}

export function getBlocksByCategory(category: BlockRegistryEntry["category"]): BlockRegistryEntry[] {
  return getAllBlocks().filter((b) => b.category === category);
}

export function getBlockTypes(): string[] {
  return Array.from(registry.keys());
}

export { registry as blockRegistry };
