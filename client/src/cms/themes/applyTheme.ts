import type { ThemeTokens } from "./themeTokens.types";
import { applyThemeVariables } from "@/components/ThemeProvider";

const PP_TO_THEME: Record<string, string> = {
  "--pp-bg": "--theme-bg",
  "--pp-surface": "--theme-bg-card",
  "--pp-surface-alt": "--theme-bg-elevated",
  "--pp-text": "--theme-text",
  "--pp-text-muted": "--theme-text-muted",
  "--pp-border": "--theme-border",
  "--pp-primary": "--theme-primary",
  "--pp-accent": "--theme-accent",
  "--pp-danger": "--theme-error",
  "--pp-success": "--theme-success",
  "--pp-warning": "--theme-warning",
};

const TOKEN_TO_CSS_VAR: Record<string, string> = {
  "colors.colorBg": "--pp-bg",
  "colors.colorSurface": "--pp-surface",
  "colors.colorSurfaceAlt": "--pp-surface-alt",
  "colors.colorText": "--pp-text",
  "colors.colorTextMuted": "--pp-text-muted",
  "colors.colorBorder": "--pp-border",
  "colors.colorPrimary": "--pp-primary",
  "colors.colorPrimaryText": "--pp-primary-text",
  "colors.colorSecondary": "--pp-secondary",
  "colors.colorSecondaryText": "--pp-secondary-text",
  "colors.colorAccent": "--pp-accent",
  "colors.colorAccentText": "--pp-accent-text",
  "colors.colorSuccess": "--pp-success",
  "colors.colorWarning": "--pp-warning",
  "colors.colorDanger": "--pp-danger",
  "typography.fontFamilyBase": "--pp-font-family",
  "typography.fontSizeScale": "--pp-font-size-scale",
  "typography.lineHeightBase": "--pp-line-height",
  "typography.letterSpacingBase": "--pp-letter-spacing",
  "radius.radiusSm": "--pp-radius-sm",
  "radius.radiusMd": "--pp-radius-md",
  "radius.radiusLg": "--pp-radius-lg",
  "radius.radiusXl": "--pp-radius-xl",
  "shadows.shadowSm": "--pp-shadow-sm",
  "shadows.shadowMd": "--pp-shadow-md",
  "shadows.shadowLg": "--pp-shadow-lg",
  "buttons.buttonPaddingY": "--pp-btn-py",
  "buttons.buttonPaddingX": "--pp-btn-px",
  "layout.containerMaxWidth": "--pp-container-max",
  "layout.sectionPaddingY": "--pp-section-py",
  "layout.sectionPaddingX": "--pp-section-px",
};

function flattenTokens(tokens: ThemeTokens): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const [path, cssVar] of Object.entries(TOKEN_TO_CSS_VAR)) {
    const [group, key] = path.split(".");
    const groupObj = tokens[group as keyof ThemeTokens] as unknown as Record<string, unknown>;
    if (groupObj && key in groupObj) {
      const val = groupObj[key];
      vars[cssVar] = typeof val === "number" ? String(val) : (val as string);
    }
  }

  const radiusMap: Record<string, string> = {
    sm: tokens.radius.radiusSm,
    md: tokens.radius.radiusMd,
    lg: tokens.radius.radiusLg,
  };
  if (radiusMap[tokens.buttons.buttonRadius]) {
    vars["--pp-btn-radius"] = radiusMap[tokens.buttons.buttonRadius];
  }
  vars["--pp-btn-style"] = tokens.buttons.buttonStyle;

  const { spaceBase, spaceScale } = tokens.spacing;
  spaceScale.forEach((multiplier, i) => {
    vars[`--pp-space-${i + 1}`] = `${spaceBase * multiplier}px`;
  });

  return vars;
}

export function applyThemeTokens(
  tokens: ThemeTokens,
  scope: "root" | "preview" = "root"
): void {
  const vars = flattenTokens(tokens);
  const target =
    scope === "preview"
      ? document.querySelector<HTMLElement>("[data-pp-theme-scope]") || document.documentElement
      : document.documentElement;

  for (const [prop, value] of Object.entries(vars)) {
    target.style.setProperty(prop, value);
  }

  if (scope === "root") {
    const themeVars: Record<string, string> = {};
    for (const [ppKey, themeKey] of Object.entries(PP_TO_THEME)) {
      if (vars[ppKey]) {
        themeVars[themeKey] = vars[ppKey];
      }
    }
    if (vars["--pp-font-family"]) {
      themeVars["--theme-font"] = vars["--pp-font-family"];
    }
    if (vars["--pp-radius-md"]) {
      themeVars["--theme-radius"] = vars["--pp-radius-md"];
    }
    const primary = vars["--pp-primary"];
    if (primary) {
      themeVars["--theme-primary-hover"] = primary;
      themeVars["--theme-primary-muted"] = primary.startsWith("#")
        ? `${primary}26`
        : `rgba(128,128,128,0.15)`;
    }
    applyThemeVariables(themeVars);
  }
}

export function clearThemeTokens(
  tokens: ThemeTokens,
  scope: "root" | "preview" = "root"
): void {
  const vars = flattenTokens(tokens);
  const target =
    scope === "preview"
      ? document.querySelector<HTMLElement>("[data-pp-theme-scope]") || document.documentElement
      : document.documentElement;

  for (const prop of Object.keys(vars)) {
    target.style.removeProperty(prop);
  }
}

export function tokensToCssVars(tokens: ThemeTokens): Record<string, string> {
  return flattenTokens(tokens);
}
