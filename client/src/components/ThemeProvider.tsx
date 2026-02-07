import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ThemePreset } from "@shared/themePresets";

export function applyThemeVariables(variables: Record<string, string>) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(variables)) {
    root.style.setProperty(key, value);
  }
}

export function clearThemeVariables(variables: Record<string, string>) {
  const root = document.documentElement;
  for (const key of Object.keys(variables)) {
    root.style.removeProperty(key);
  }
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
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (theme?.variables) {
      applyThemeVariables(theme.variables);
    }
  }, [theme]);

  return <>{children}</>;
}
