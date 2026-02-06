import { useState, useEffect } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminNav from "@/components/admin/AdminNav";
import { Palette, ArrowLeft, Check, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { applyThemeVariables, clearThemeVariables } from "@/components/ThemeProvider";
import type { ThemePreset } from "@shared/themePresets";

function ThemeSwatchRow({ variables }: { variables: Record<string, string> }) {
  const colors = [
    variables["--theme-bg"],
    variables["--theme-bg-card"],
    variables["--theme-bg-elevated"],
    variables["--theme-primary"],
    variables["--theme-accent"],
    variables["--theme-text"],
    variables["--theme-text-muted"],
  ].filter(Boolean);

  return (
    <div className="flex gap-1">
      {colors.map((color, i) => (
        <div
          key={i}
          className="w-5 h-5 rounded-sm border border-white/10"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

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
        className="px-3 py-2 flex items-center justify-between"
        style={{ backgroundColor: variables["--theme-bg-card"], borderBottom: `1px solid ${variables["--theme-border"]}` }}
      >
        <span style={{ color: variables["--theme-text"] }} className="font-semibold">Header</span>
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: variables["--theme-error"] }} />
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: variables["--theme-warning"] }} />
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: variables["--theme-success"] }} />
        </div>
      </div>
      <div className="p-3 space-y-2">
        <div style={{ color: variables["--theme-text"] }} className="font-medium">Page Title</div>
        <div style={{ color: variables["--theme-text-muted"] }}>Body text preview in muted tone.</div>
        <div className="flex gap-2 mt-2">
          <div
            className="px-2 py-1 rounded text-[10px] font-medium"
            style={{
              backgroundColor: variables["--theme-primary"],
              color: variables["--theme-bg"],
              borderRadius: variables["--theme-radius"],
            }}
          >
            Primary
          </div>
          <div
            className="px-2 py-1 rounded text-[10px] font-medium"
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
        <div
          className="rounded p-2 mt-1"
          style={{
            backgroundColor: variables["--theme-bg-elevated"],
            borderRadius: variables["--theme-radius"],
          }}
        >
          <div style={{ color: variables["--theme-primary"] }} className="font-medium text-[10px]">Card Title</div>
          <div style={{ color: variables["--theme-text-muted"] }} className="text-[10px]">Card content here</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminCmsV2Themes() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [originalVars, setOriginalVars] = useState<Record<string, string> | null>(null);

  const { data: themes } = useQuery<ThemePreset[]>({
    queryKey: ["/api/admin/cms-v2/themes"],
    enabled: hasFullAccess,
  });

  const { data: activeTheme } = useQuery<ThemePreset>({
    queryKey: ["/api/admin/cms-v2/themes/active"],
    enabled: hasFullAccess,
  });

  const activateMutation = useMutation({
    mutationFn: async (themeId: string) => {
      const res = await fetch("/api/admin/cms-v2/themes/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId }),
      });
      if (!res.ok) throw new Error("Failed to activate theme");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms-v2/themes/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/theme/active"] });
      applyThemeVariables(data.variables);
      setPreviewId(null);
      setOriginalVars(null);
      toast({ title: "Theme activated", description: `"${data.name}" is now the active theme.` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to activate theme.", variant: "destructive" });
    },
  });

  const handlePreview = (theme: ThemePreset) => {
    if (previewId === theme.id) {
      if (originalVars) {
        applyThemeVariables(originalVars);
      }
      setPreviewId(null);
      setOriginalVars(null);
      return;
    }
    if (!originalVars && activeTheme) {
      setOriginalVars(activeTheme.variables);
    }
    setPreviewId(theme.id);
    applyThemeVariables(theme.variables);
  };

  const handleStopPreview = () => {
    if (originalVars) {
      applyThemeVariables(originalVars);
    } else if (activeTheme) {
      applyThemeVariables(activeTheme.variables);
    }
    setPreviewId(null);
    setOriginalVars(null);
  };

  useEffect(() => {
    return () => {
      if (originalVars) {
        applyThemeVariables(originalVars);
      }
    };
  }, []);

  if (adminLoading || !hasFullAccess) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <AdminNav currentPage="cms-v2" />
        <div className="p-8 text-center text-gray-400">
          {adminLoading ? "Loading..." : "Access Denied"}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white" data-testid="admin-cms-v2-themes-page">
      <AdminNav currentPage="cms-v2" />

      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/cms-v2">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid="link-back-dashboard">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Palette className="w-7 h-7 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white">Themes</h1>
            {activeTheme && (
              <Badge variant="outline" className="border-cyan-700 text-cyan-400 text-xs" data-testid="badge-active-theme">
                Active: {activeTheme.name}
              </Badge>
            )}
          </div>
          {previewId && (
            <Button
              size="sm"
              variant="outline"
              className="border-yellow-700 text-yellow-400 hover:bg-yellow-900/30"
              onClick={handleStopPreview}
              data-testid="button-stop-preview"
            >
              Stop Preview
            </Button>
          )}
        </div>

        {previewId && (
          <div className="mb-4 p-3 rounded-lg border border-yellow-700/50 bg-yellow-900/10 text-yellow-400 text-sm" data-testid="text-preview-banner">
            Previewing theme — changes are temporary until you activate.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {themes?.map((theme) => {
            const isActive = activeTheme?.id === theme.id;
            const isPreviewing = previewId === theme.id;

            return (
              <Card
                key={theme.id}
                className={`bg-gray-900 border-gray-800 transition-colors ${isPreviewing ? "ring-2 ring-yellow-500" : isActive ? "ring-2 ring-cyan-500" : ""}`}
                data-testid={`card-theme-${theme.id}`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white" data-testid={`text-theme-name-${theme.id}`}>{theme.name}</h3>
                        {isActive && (
                          <Badge className="bg-cyan-900/50 text-cyan-400 border-cyan-700 text-[10px]">
                            <Check className="w-3 h-3 mr-0.5" />
                            Active
                          </Badge>
                        )}
                        {isPreviewing && (
                          <Badge className="bg-yellow-900/50 text-yellow-400 border-yellow-700 text-[10px]">
                            <Eye className="w-3 h-3 mr-0.5" />
                            Preview
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{theme.description}</p>
                    </div>
                  </div>

                  <ThemePreview variables={theme.variables} />

                  <ThemeSwatchRow variables={theme.variables} />

                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className={isPreviewing ? "border-yellow-700 text-yellow-400" : "border-gray-700 text-gray-400 hover:text-white"}
                      onClick={() => handlePreview(theme)}
                      data-testid={`button-preview-${theme.id}`}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      {isPreviewing ? "Stop" : "Preview"}
                    </Button>
                    {!isActive && (
                      <Button
                        size="sm"
                        className="bg-cyan-700 hover:bg-cyan-600 text-white"
                        onClick={() => activateMutation.mutate(theme.id)}
                        disabled={activateMutation.isPending}
                        data-testid={`button-activate-${theme.id}`}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        {activateMutation.isPending ? "Activating..." : "Activate"}
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
