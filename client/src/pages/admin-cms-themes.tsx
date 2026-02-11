import { useState } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminNav from "@/components/admin/AdminNav";
import { Check, Eye, RotateCcw, Palette } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { applyThemeVariables } from "@/components/ThemeProvider";
import type { ThemePreset } from "@shared/themePresets";

function ThemePreview({ variables }: { variables: Record<string, string> }) {
  return (
    <div
      className="rounded-lg border overflow-hidden text-xs"
      style={{
        backgroundColor: variables["--theme-bg"],
        borderColor: variables["--theme-border"],
        fontFamily: variables["--theme-font"],
      }}
    >
      <div
        className="px-3 py-1.5 flex items-center justify-between"
        style={{ backgroundColor: variables["--theme-bg-card"], borderBottom: `1px solid ${variables["--theme-border"]}` }}
      >
        <span style={{ color: variables["--theme-text"] }} className="font-semibold text-[10px]">Header</span>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: variables["--theme-error"] }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: variables["--theme-warning"] }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: variables["--theme-success"] }} />
        </div>
      </div>
      <div className="p-2.5 space-y-1.5">
        <div style={{ color: variables["--theme-text"] }} className="font-medium text-[10px]">Page Title</div>
        <div style={{ color: variables["--theme-text-muted"] }} className="text-[9px]">Body text preview.</div>
        <div className="flex gap-1.5 mt-1.5">
          <div
            className="px-1.5 py-0.5 rounded text-[8px] font-medium"
            style={{
              backgroundColor: variables["--theme-primary"],
              color: variables["--theme-bg"],
              borderRadius: variables["--theme-radius"],
            }}
          >
            Primary
          </div>
          <div
            className="px-1.5 py-0.5 rounded text-[8px] font-medium"
            style={{
              backgroundColor: variables["--theme-bg-elevated"],
              color: variables["--theme-text"],
              border: `1px solid ${variables["--theme-border"]}`,
              borderRadius: variables["--theme-radius"],
            }}
          >
            Secondary
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminCmsThemes() {
  const { hasFullAccess, isLoading: adminLoading, role } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewId, setPreviewId] = useState<string | null>(null);

  const { data: themes } = useQuery<ThemePreset[]>({
    queryKey: ["/api/admin/cms/themes"],
    enabled: hasFullAccess,
  });

  const { data: activeTheme } = useQuery<ThemePreset>({
    queryKey: ["/api/admin/cms/themes/active"],
    enabled: hasFullAccess,
  });

  const activateThemeMutation = useMutation({
    mutationFn: async (themeId: string) => {
      const res = await fetch("/api/admin/cms/themes/activate", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId }),
      });
      if (!res.ok) throw new Error("Failed to activate theme");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/themes/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/theme-packs/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/theme/active"] });
      applyThemeVariables(data.variables);
      setPreviewId(null);
      toast({ title: "Theme activated", description: `"${data.name}" is now the active theme.` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to activate theme.", variant: "destructive" });
    },
  });

  const handlePreviewTheme = (theme: ThemePreset) => {
    if (previewId === theme.id) {
      setPreviewId(null);
      return;
    }
    setPreviewId(theme.id);
  };

  const activeId = activeTheme?.id || null;

  if (adminLoading || !hasFullAccess) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav currentPage="themes" role={role} />
        <div className="p-8 text-center text-muted-foreground">{adminLoading ? "Loading..." : "Access Denied"}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="themes" role={role} />
      <div className="max-w-6xl mx-auto px-6 py-8" data-testid="admin-cms-themes-page">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2" data-testid="text-themes-heading">
              <Palette className="w-5 h-5 text-primary" />
              Themes
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {activeTheme
                ? <>Active: <span className="text-primary font-medium">{activeTheme.name}</span></>
                : "No theme active"
              }
            </p>
          </div>
          {previewId && (
            <Button
              size="sm"
              variant="outline"
              className="border-yellow-700 text-yellow-400 hover:bg-yellow-900/20 h-8 text-xs gap-1.5"
              onClick={() => setPreviewId(null)}
              data-testid="button-stop-preview"
            >
              <RotateCcw className="w-3 h-3" />
              Revert Preview
            </Button>
          )}
        </div>

        {previewId && (
          <div className="mb-4 p-2.5 rounded-lg border border-yellow-700/30 bg-yellow-900/10 text-yellow-400 text-xs flex items-center gap-2" data-testid="text-preview-banner">
            <Eye className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Previewing — the selected theme is highlighted below. Activate to make it permanent, or revert to dismiss.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="grid-color-themes">
            {themes?.map((theme) => {
              const isActive = activeId === theme.id;
              const isPreviewing = previewId === theme.id;

              return (
                <Card
                  key={theme.id}
                  className={`bg-card border-border transition-all ${isPreviewing ? "ring-1 ring-yellow-500/50" : isActive ? "ring-1 ring-primary/50" : "hover:border-border"}`}
                  data-testid={`card-theme-${theme.id}`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-medium text-foreground text-sm truncate" data-testid={`text-theme-name-${theme.id}`}>{theme.name}</h3>
                      {isActive && (
                        <Badge className="bg-primary/10 text-primary border-primary/30/60 text-[9px] px-1.5 gap-0.5">
                          <Check className="w-2.5 h-2.5" /> Active
                        </Badge>
                      )}
                      {isPreviewing && (
                        <Badge className="bg-yellow-900/30 text-yellow-400 border-yellow-800/60 text-[9px] px-1.5 gap-0.5">
                          <Eye className="w-2.5 h-2.5" /> Preview
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{theme.description}</p>

                    <ThemePreview variables={theme.variables} />

                    <div className="flex gap-1">
                      {[theme.variables["--theme-bg"], theme.variables["--theme-bg-card"], theme.variables["--theme-bg-elevated"], theme.variables["--theme-primary"], theme.variables["--theme-accent"], theme.variables["--theme-text"], theme.variables["--theme-text-muted"]].filter(Boolean).map((c, i) => (
                        <div key={i} className="w-4 h-4 rounded-sm border border-white/10" style={{ backgroundColor: c }} />
                      ))}
                    </div>

                    <div className="flex gap-1.5 pt-0.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className={`h-7 text-[11px] ${isPreviewing ? "border-yellow-700/60 text-yellow-400" : "border-border/60 text-muted-foreground hover:text-foreground"}`}
                        onClick={() => handlePreviewTheme(theme)}
                        data-testid={`button-preview-${theme.id}`}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        {isPreviewing ? "Stop" : "Preview"}
                      </Button>
                      {!isActive && (
                        <Button
                          size="sm"
                          className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-medium h-7 text-[11px]"
                          onClick={() => activateThemeMutation.mutate(theme.id)}
                          disabled={activateThemeMutation.isPending}
                          data-testid={`button-activate-${theme.id}`}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          {activateThemeMutation.isPending ? "..." : "Activate"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
      </div>
    </div>
  );
}
