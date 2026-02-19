import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { themePresets } from "@shared/themePresets";

interface ThemePreset {
  id: string;
  name: string;
  description: string;
  variables: Record<string, string>;
}

function hexToHsl(hex: string): string | null {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  if (hex.length !== 6) return null;

  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function darken(hex: string, amount: number): string {
  hex = hex.replace(/^#/, "");
  const r = Math.max(0, parseInt(hex.slice(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(4, 6), 16) - amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function lighten(hex: string, amount: number): string {
  hex = hex.replace(/^#/, "");
  const r = Math.min(255, parseInt(hex.slice(0, 2), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(2, 4), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function isLight(hex: string): boolean {
  hex = hex.replace(/^#/, "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

const THEME_TO_SHADCN: Record<string, string | string[]> = {
  "--theme-bg": ["--background", "--popover"],
  "--theme-bg-card": ["--card", "--secondary"],
  "--theme-bg-elevated": ["--muted"],
  "--theme-text": ["--foreground", "--card-foreground", "--popover-foreground"],
  "--theme-text-muted": "--muted-foreground",
  "--theme-primary": ["--primary", "--ring", "--ice", "--ice-glow"],
  "--theme-accent": "--accent",
  "--theme-border": ["--border", "--input", "--card-border"],
  "--theme-error": "--destructive",
  "--theme-radius": "--radius",
};

const THEME_TO_PP: Record<string, string> = {
  "--theme-bg": "--pp-bg",
  "--theme-bg-card": "--pp-surface",
  "--theme-bg-elevated": "--pp-surface-alt",
  "--theme-text": "--pp-text",
  "--theme-text-muted": "--pp-text-muted",
  "--theme-border": "--pp-border",
  "--theme-primary": "--pp-primary",
  "--theme-accent": "--pp-accent",
  "--theme-error": "--pp-danger",
  "--theme-success": "--pp-success",
  "--theme-warning": "--pp-warning",
};

const PP_VARS = Object.values(THEME_TO_PP);

function mapThemeToShadcn(variables: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {};
  const root = document.documentElement;

  for (const [themeKey, shadcnKeys] of Object.entries(THEME_TO_SHADCN)) {
    const value = variables[themeKey];
    if (!value) continue;

    if (themeKey === "--theme-radius") {
      const keys = Array.isArray(shadcnKeys) ? shadcnKeys : [shadcnKeys];
      for (const k of keys) {
        root.style.setProperty(k, value);
      }
      continue;
    }

    if (!value.startsWith("#")) continue;

    const hsl = hexToHsl(value);
    if (!hsl) continue;

    const keys = Array.isArray(shadcnKeys) ? shadcnKeys : [shadcnKeys];
    for (const k of keys) {
      root.style.setProperty(k, hsl);
    }
  }

  for (const [themeKey, ppKey] of Object.entries(THEME_TO_PP)) {
    const value = variables[themeKey];
    if (value) {
      root.style.setProperty(ppKey, value);
    }
  }

  const primary = variables["--theme-primary"];
  const bg = variables["--theme-bg"];
  const accent = variables["--theme-accent"];

  if (primary && primary.startsWith("#")) {
    const primaryFg = isLight(primary) ? "#0a0a0a" : "#fafafa";
    const primaryFgHsl = hexToHsl(primaryFg);
    if (primaryFgHsl) root.style.setProperty("--primary-foreground", primaryFgHsl);
    root.style.setProperty("--pp-primary-text", primaryFg);

    if (!variables["--theme-primary-hover"]) {
      root.style.setProperty("--theme-primary-hover", darken(primary, 25));
    }
    if (!variables["--theme-primary-muted"]) {
      root.style.setProperty("--theme-primary-muted", `${primary}26`);
    }
  }

  if (accent && accent.startsWith("#")) {
    const accentFg = isLight(accent) ? "#0a0a0a" : "#fafafa";
    const accentFgHsl = hexToHsl(accentFg);
    if (accentFgHsl) root.style.setProperty("--accent-foreground", accentFgHsl);
    root.style.setProperty("--pp-accent-text", accentFg);
  } else if (primary && primary.startsWith("#") && !variables["--theme-accent"]) {
    root.style.setProperty("--theme-accent", darken(primary, 20));
    root.style.setProperty("--pp-accent", darken(primary, 20));
    const accentFg = isLight(darken(primary, 20)) ? "#0a0a0a" : "#fafafa";
    const accentFgHsl = hexToHsl(accentFg);
    if (accentFgHsl) root.style.setProperty("--accent-foreground", accentFgHsl);
    root.style.setProperty("--pp-accent-text", accentFg);
  }

  if (primary && primary.startsWith("#")) {
    const secondary = bg && bg.startsWith("#") ? darken(primary, 30) : darken(primary, 30);
    root.style.setProperty("--pp-secondary", secondary);
    root.style.setProperty("--pp-secondary-text", isLight(secondary) ? "#0a0a0a" : "#fafafa");
  }

  const error = variables["--theme-error"];
  if (error && error.startsWith("#")) {
    const errorFg = isLight(error) ? "#0a0a0a" : "#fafafa";
    const errorFgHsl = hexToHsl(errorFg);
    if (errorFgHsl) root.style.setProperty("--destructive-foreground", errorFgHsl);
  }

  const text = variables["--theme-text"];
  if (text && text.startsWith("#")) {
    const textHsl = hexToHsl(text);
    if (textHsl) root.style.setProperty("--secondary-foreground", textHsl);
  }

  const font = variables["--theme-font"];
  if (font) {
    root.style.setProperty("--font-display", font);
    root.style.setProperty("--font-sans", font);
    root.style.setProperty("--pp-font-family", font);
  }

  const radius = variables["--theme-radius"];
  if (radius) {
    const rem = parseFloat(radius);
    if (!isNaN(rem)) {
      root.style.setProperty("--pp-radius-sm", `${Math.max(rem * 0.5, 0.125)}rem`);
      root.style.setProperty("--pp-radius-md", radius);
      root.style.setProperty("--pp-radius-lg", `${rem * 1.5}rem`);
      root.style.setProperty("--pp-radius-xl", `${rem * 2}rem`);
    }
  }

  return mapped;
}

export function applyThemeVariables(variables: Record<string, string>) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(variables)) {
    root.style.setProperty(key, value);
  }
  mapThemeToShadcn(variables);
}

export function clearThemeVariables(variables: Record<string, string>) {
  const root = document.documentElement;
  for (const key of Object.keys(variables)) {
    root.style.removeProperty(key);
  }
  for (const shadcnKeys of Object.values(THEME_TO_SHADCN)) {
    const keys = Array.isArray(shadcnKeys) ? shadcnKeys : [shadcnKeys];
    for (const k of keys) {
      root.style.removeProperty(k);
    }
  }
  for (const ppVar of PP_VARS) {
    root.style.removeProperty(ppVar);
  }
  root.style.removeProperty("--pp-primary-text");
  root.style.removeProperty("--pp-accent-text");
  root.style.removeProperty("--pp-secondary");
  root.style.removeProperty("--pp-secondary-text");
  root.style.removeProperty("--pp-font-family");
  root.style.removeProperty("--pp-radius-sm");
  root.style.removeProperty("--pp-radius-md");
  root.style.removeProperty("--pp-radius-lg");
  root.style.removeProperty("--pp-radius-xl");
  root.style.removeProperty("--primary-foreground");
  root.style.removeProperty("--accent-foreground");
  root.style.removeProperty("--secondary-foreground");
  root.style.removeProperty("--destructive-foreground");
  root.style.removeProperty("--font-display");
  root.style.removeProperty("--font-sans");
}

export function applyThemeVariablesToElement(variables: Record<string, string>, element: HTMLElement) {
  for (const [key, value] of Object.entries(variables)) {
    element.style.setProperty(key, value);
  }
}

export function clearThemeVariablesFromElement(variables: Record<string, string>, element: HTMLElement) {
  for (const key of Object.keys(variables)) {
    element.style.removeProperty(key);
  }
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: theme } = useQuery<ThemePreset>({
    queryKey: ["/api/theme/active"],
    staleTime: 5000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (theme?.variables) {
      applyThemeVariables(theme.variables);
    } else {
      // Default to Arctic if no theme is provided by API
      const arctic = themePresets.find(t => t.id === "arctic-default");
      if (arctic) {
        applyThemeVariables(arctic.variables);
      }
    }
  }, [theme]);

  return <>{children}</>;
}
