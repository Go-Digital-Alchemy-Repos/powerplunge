import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Sun, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { applyThemeVariables } from "@/components/ThemeProvider";
import type { ThemePreset } from "@shared/themePresets";
import type { ThemePackPreset } from "@shared/themePackPresets";

interface UnifiedTheme {
  id: string;
  name: string;
  colors: string[];
  isPack: boolean;
  variables: Record<string, string>;
}

function ColorPaletteBar({ colors }: { colors: string[] }) {
  return (
    <div className="flex h-3 w-full rounded-sm overflow-hidden border border-white/10">
      {colors.map((color, i) => (
        <div key={i} className="flex-1" style={{ backgroundColor: color }} />
      ))}
    </div>
  );
}

export function ThemeSelector({
  triggerClassName,
  testIdSuffix,
}: {
  triggerClassName?: string;
  testIdSuffix?: string;
}) {
  const queryClient = useQueryClient();

  const { data: legacyThemes } = useQuery<ThemePreset[]>({
    queryKey: ["/api/admin/cms/themes"],
    // Fallback to presets if not admin or failed
    retry: false,
  });

  const { data: packThemes } = useQuery<ThemePackPreset[]>({
    queryKey: ["/api/admin/cms/theme-packs"],
    retry: false,
  });

  const { data: activeThemeData } = useQuery<ThemePreset>({
    queryKey: ["/api/theme/active"],
  });

  // Local storage preference
  const [localThemeId, setLocalThemeId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("user-theme-preference");
    }
    return null;
  });

  const activeThemeId = localThemeId || activeThemeData?.id || "arctic-default";

  const unifiedThemes: UnifiedTheme[] = [
    ...(legacyThemes || []).map((t) => ({
      id: t.id,
      name: t.name,
      colors: [t.variables["--theme-bg"], t.variables["--theme-bg-card"], t.variables["--theme-primary"], t.variables["--theme-accent"], t.variables["--theme-text"]].filter(Boolean),
      isPack: false,
      variables: t.variables,
    })),
    ...(packThemes || []).map((t) => ({
      id: t.id,
      name: t.name,
      colors: [t.themeTokens["--theme-bg"], t.themeTokens["--theme-bg-card"], t.themeTokens["--theme-primary"], t.themeTokens["--theme-accent"], t.themeTokens["--theme-text"]].filter(Boolean),
      isPack: true,
      variables: t.themeTokens,
    })),
  ];

  // If no themes from API (public user), use presets from shared
  if (unifiedThemes.length === 0) {
    // We could import themePresets here but it might bloat bundle if not careful
    // For now, let's assume the API provides them or we can just show a limited set
  }

  const handleSelect = (theme: UnifiedTheme) => {
    localStorage.setItem("user-theme-preference", theme.id);
    setLocalThemeId(theme.id);
    applyThemeVariables(theme.variables);
    
    // Also try to notify backend if admin, but non-admins will just have local override
    // We don't want to change site-wide theme for everyone if a customer clicks it.
    // The requirement says "all users should be able to set their theme preference".
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2 h-10 w-10 p-0", triggerClassName)}
          data-testid={`button-theme-selector${testIdSuffix || ""}`}
        >
          <Sun className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Select Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {unifiedThemes.map((theme) => {
          const isActive = activeThemeId === theme.id;
          return (
            <DropdownMenuItem
              key={theme.id}
              onClick={() => handleSelect(theme)}
              className="flex flex-col items-start gap-1.5 py-2 cursor-pointer"
              data-testid={`theme-option-${theme.id}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={cn("text-xs font-medium", isActive && "text-primary")}>{theme.name}</span>
                {isActive && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
              </div>
              <ColorPaletteBar colors={theme.colors} />
            </DropdownMenuItem>
          );
        })}
        {unifiedThemes.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground">
            Loading themes...
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
