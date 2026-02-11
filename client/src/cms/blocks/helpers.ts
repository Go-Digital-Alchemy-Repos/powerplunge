import type { PuckFieldConfig } from "./types";

export const textField = (label: string): PuckFieldConfig => ({
  type: "text",
  label,
});

export const textareaField = (label: string): PuckFieldConfig => ({
  type: "textarea",
  label,
});

export const numberField = (label: string, min?: number, max?: number): PuckFieldConfig => ({
  type: "number",
  label,
  min,
  max,
});

export const selectField = (
  label: string,
  options: { label: string; value: string }[]
): PuckFieldConfig => ({
  type: "select",
  label,
  options,
});

export const checkboxField = (label: string): PuckFieldConfig => ({
  type: "select",
  label,
  options: [
    { label: "Yes", value: "true" },
    { label: "No", value: "false" },
  ],
});

export const arrayField = (
  label: string,
  arrayFields: Record<string, PuckFieldConfig>
): PuckFieldConfig => ({
  type: "array",
  label,
  arrayFields,
});

export const objectField = (
  label: string,
  objectFields: Record<string, PuckFieldConfig>
): PuckFieldConfig => ({
  type: "object",
  label,
  objectFields,
});

export const imageField = (label: string): PuckFieldConfig => ({
  type: "text",
  label,
  isImageField: true,
});

export const iconField = (label: string): PuckFieldConfig => ({
  type: "text",
  label,
  isIconField: true,
});
