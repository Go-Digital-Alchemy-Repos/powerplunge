import { useState, useEffect } from "react";

function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function hexWithOpacity(hex: string, opacity: number): string {
  if (!hex.startsWith("#")) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(2, 4) || "0", 16);
  const b = parseInt(hex.slice(4, 6) || "0", 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function adjustBrightness(hex: string, amount: number): string {
  if (!hex.startsWith("#")) return hex;
  hex = hex.replace("#", "");
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(0, 2), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(2, 4), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export interface ThemeChartColors {
  primary: string;
  primaryMuted: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  chartColors: string[];
  pieColors: string[];
  gradient: (id: string, color: string) => { start: string; end: string };
}

export function useThemeChartColors(): ThemeChartColors {
  const [colors, setColors] = useState<ThemeChartColors>(buildColors);

  function buildColors(): ThemeChartColors {
    const primary = getCssVar("--theme-primary") || "#67e8f9";
    const accent = getCssVar("--theme-accent") || "#06b6d4";
    const success = getCssVar("--theme-success") || "#34d399";
    const warning = getCssVar("--theme-warning") || "#fbbf24";
    const error = getCssVar("--theme-error") || "#f87171";

    const info = adjustBrightness(accent, 40);
    const primaryMuted = hexWithOpacity(primary, 0.15);

    const chartColors = [
      primary,
      adjustBrightness(primary, -20),
      adjustBrightness(accent, 10),
      accent,
      adjustBrightness(accent, -20),
      adjustBrightness(accent, -40),
      adjustBrightness(accent, -60),
      adjustBrightness(accent, -80),
    ];

    const pieColors = [primary, info, success, warning, error, accent];

    return {
      primary,
      primaryMuted,
      accent,
      success,
      warning,
      error,
      info,
      chartColors,
      pieColors,
      gradient: (_id: string, color: string) => ({
        start: hexWithOpacity(color, 0.3),
        end: hexWithOpacity(color, 0),
      }),
    };
  }

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setColors(buildColors());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });
    return () => observer.disconnect();
  }, []);

  return colors;
}
