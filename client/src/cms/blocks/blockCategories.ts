export interface BlockCategoryDefinition {
  id: string;
  label: string;
  description: string;
  sortOrder: number;
}

export const BLOCK_CATEGORIES: BlockCategoryDefinition[] = [
  {
    id: "layout",
    label: "Layout",
    description: "Structural blocks for page layout and hero sections",
    sortOrder: 1,
  },
  {
    id: "marketing",
    label: "Marketing",
    description: "Conversion-focused blocks for promotions and engagement",
    sortOrder: 2,
  },
  {
    id: "ecommerce",
    label: "Ecommerce",
    description: "Product display and shopping experience blocks",
    sortOrder: 3,
  },
  {
    id: "trust",
    label: "Trust",
    description: "Social proof and credibility-building blocks",
    sortOrder: 4,
  },
  {
    id: "media",
    label: "Media",
    description: "Image and visual content blocks",
    sortOrder: 5,
  },
  {
    id: "utility",
    label: "Utility",
    description: "Informational and supporting content blocks",
    sortOrder: 6,
  },
];

export function getCategoryLabel(categoryId: string): string {
  return BLOCK_CATEGORIES.find((c) => c.id === categoryId)?.label ?? categoryId;
}

export function getCategoriesOrdered(): BlockCategoryDefinition[] {
  return [...BLOCK_CATEGORIES].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getCategoryDefinition(categoryId: string): BlockCategoryDefinition | undefined {
  return BLOCK_CATEGORIES.find((c) => c.id === categoryId);
}
