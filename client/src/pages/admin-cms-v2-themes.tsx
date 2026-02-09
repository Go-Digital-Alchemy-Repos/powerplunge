import { useState } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CmsV2Layout from "@/components/admin/CmsV2Layout";
import { Check, Eye, RotateCcw, Package, Palette, Layers, Grid3X3, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { applyThemeVariables } from "@/components/ThemeProvider";
import { resolveAllVariantStyles } from "@shared/componentVariants";
import type { ThemePreset } from "@shared/themePresets";
import type { ThemePackPreset } from "@shared/themePackPresets";

function PackPageThumbnail({ pack, isActive, isPreviewing }: { pack: ThemePackPreset; isActive: boolean; isPreviewing: boolean }) {
  const t = pack.themeTokens;
  const cv = pack.componentVariants;
  const heroDefaults = (pack.blockStyleDefaults.hero || {}) as Record<string, unknown>;
  const featureDefaults = (pack.blockStyleDefaults.featureList || {}) as Record<string, unknown>;
  const ctaDefaults = (pack.blockStyleDefaults.callToAction || {}) as Record<string, unknown>;

  const isFullBleed = heroDefaults.fullWidth === true;
  const heroAlign = (heroDefaults.defaultAlign as string) || "center";
  const heroHeight = (heroDefaults.defaultHeight as string) || "default";
  const btnRadius = cv.button === "pill" ? "9999px" : cv.button === "square" ? "0" : cv.button === "soft" ? "0.375rem" : (t["--theme-radius"] || "0.375rem");
  const cardBorder = cv.card === "outlined" ? `1px solid ${t["--theme-border"]}` : "none";
  const cardShadow = cv.card === "elevated" ? "0 2px 8px rgba(0,0,0,0.3)" : "none";
  const featureCols = (featureDefaults.columns as number) || 3;
  const featureIconPos = (featureDefaults.iconPosition as string) || "top";
  const ctaCentered = ctaDefaults.centeredLayout !== false;
  const ctaBgStyle = (ctaDefaults.backgroundStyle as string) || "solid";
  const ctaShowSecondary = ctaDefaults.showSecondaryButton === true;
  const heroPadding = heroHeight === "tall" ? "py-5" : heroHeight === "full" ? "py-6" : "py-3.5";

  return (
    <div
      className={`rounded-lg border overflow-hidden transition-all duration-300 ${isPreviewing ? "ring-2 ring-yellow-500/60 scale-[1.01]" : isActive ? "ring-2 ring-primary/60" : "hover:ring-1 hover:ring-border"}`}
      style={{ backgroundColor: t["--theme-bg"], borderColor: t["--theme-border"], fontFamily: t["--theme-font"] }}
      data-testid={`thumbnail-${pack.id}`}
    >
      <div
        className={`relative ${heroPadding} ${isFullBleed ? "px-2.5" : "px-3 mx-1 mt-1 rounded-md"}`}
        style={{
          background: `linear-gradient(135deg, ${t["--theme-primary-muted"]}, ${t["--theme-bg"]})`,
          borderBottom: isFullBleed ? `1px solid ${t["--theme-border"]}` : "none",
          border: isFullBleed ? undefined : `1px solid ${t["--theme-border"]}`,
        }}
      >
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex gap-1">
            {[t["--theme-bg-card"], t["--theme-primary"], t["--theme-bg-elevated"]].map((c, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="h-1 rounded-full w-10" style={{ backgroundColor: t["--theme-border"] }} />
        </div>

        <div style={{ textAlign: heroAlign as "left" | "center" | "right" }}>
          <div className="font-bold text-[11px] leading-tight mb-0.5" style={{ color: t["--theme-text"] }}>
            Hero Headline
          </div>
          <div className="text-[8px] mb-2" style={{ color: t["--theme-text-muted"] }}>
            Subtext for the hero section
          </div>
          <div className={`flex gap-1.5 ${heroAlign === "center" ? "justify-center" : ""}`}>
            <div
              className="px-2 py-0.5 text-[7px] font-semibold"
              style={{ backgroundColor: t["--theme-primary"], color: t["--theme-bg"], borderRadius: btnRadius }}
            >
              Primary CTA
            </div>
            <div
              className="px-2 py-0.5 text-[7px] font-medium"
              style={{ backgroundColor: "transparent", color: t["--theme-text"], borderRadius: btnRadius, border: `1px solid ${t["--theme-border"]}` }}
            >
              Secondary
            </div>
          </div>
        </div>
      </div>

      <div className="p-2.5 space-y-2" style={{ backgroundColor: t["--theme-bg"] }}>
        <div className="text-[8px] font-semibold text-center mb-0.5" style={{ color: t["--theme-text"] }}>Features</div>
        <div className={`grid gap-1.5`} style={{ gridTemplateColumns: `repeat(${Math.min(featureCols, 3)}, 1fr)` }}>
          {[t["--theme-success"], t["--theme-primary"], t["--theme-accent"]].slice(0, featureCols).map((accent, i) => (
            <div
              key={i}
              className={`p-1.5 rounded ${featureIconPos === "left" ? "flex items-start gap-1" : "text-center"}`}
              style={{
                backgroundColor: t["--theme-bg-card"],
                border: cardBorder,
                boxShadow: cardShadow,
                borderRadius: t["--theme-radius"],
              }}
            >
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${featureIconPos === "left" ? "" : "mx-auto mb-1"}`} style={{ backgroundColor: accent }} />
              <div className={featureIconPos === "left" ? "flex-1" : ""}>
                <div className="h-1 rounded-full w-full mb-0.5" style={{ backgroundColor: t["--theme-text-muted"], opacity: 0.4 }} />
                <div className={`h-0.5 rounded-full w-3/4 ${featureIconPos === "left" ? "" : "mx-auto"}`} style={{ backgroundColor: t["--theme-text-muted"], opacity: 0.2 }} />
              </div>
            </div>
          ))}
        </div>

        <div
          className={`p-2 rounded ${ctaCentered ? "text-center" : "text-left"}`}
          style={{
            backgroundColor: ctaBgStyle === "gradient" ? undefined : t["--theme-bg-elevated"],
            background: ctaBgStyle === "gradient" ? `linear-gradient(135deg, ${t["--theme-bg-elevated"]}, ${t["--theme-primary-muted"]})` : undefined,
            borderRadius: t["--theme-radius"],
            border: `1px solid ${t["--theme-border"]}`,
          }}
        >
          <div className={`h-1 rounded-full w-12 mb-1.5 ${ctaCentered ? "mx-auto" : ""}`} style={{ backgroundColor: t["--theme-text-muted"], opacity: 0.4 }} />
          <div className={`flex gap-1 ${ctaCentered ? "justify-center" : ""}`}>
            <div
              className="px-2.5 py-0.5 text-[7px] font-semibold inline-block"
              style={{ backgroundColor: t["--theme-primary"], color: t["--theme-bg"], borderRadius: btnRadius }}
            >
              Call to Action
            </div>
            {ctaShowSecondary && (
              <div
                className="px-2 py-0.5 text-[7px] font-medium inline-block"
                style={{ backgroundColor: "transparent", color: t["--theme-text"], borderRadius: btnRadius, border: `1px solid ${t["--theme-border"]}` }}
              >
                Learn More
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-0.5">
          {[t["--theme-bg"], t["--theme-bg-card"], t["--theme-bg-elevated"], t["--theme-primary"], t["--theme-accent"], t["--theme-text"], t["--theme-text-muted"]].map((c, i) => (
            <div key={i} className="flex-1 h-2 rounded-sm" style={{ backgroundColor: c, border: `1px solid ${t["--theme-border"]}` }} />
          ))}
        </div>
      </div>
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

function PackMetaBadges({ pack }: { pack: ThemePackPreset }) {
  const variantCount = Object.keys(pack.componentVariants).length;
  const blockCount = Object.keys(pack.blockStyleDefaults).length;
  const tokenCount = Object.keys(pack.themeTokens).length;

  return (
    <div className="flex flex-wrap gap-1" data-testid={`meta-badges-${pack.id}`}>
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-primary/10 text-primary/80 rounded text-[9px] border border-primary/30/30">
        <Palette className="w-2.5 h-2.5" /> {tokenCount} tokens
      </span>
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-900/20 text-purple-400/80 rounded text-[9px] border border-purple-800/30">
        <Layers className="w-2.5 h-2.5" /> {variantCount} variants
      </span>
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-900/20 text-amber-400/80 rounded text-[9px] border border-amber-800/30">
        <Grid3X3 className="w-2.5 h-2.5" /> {blockCount} blocks
      </span>
    </div>
  );
}

export default function AdminCmsV2Themes() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"packs" | "themes">("packs");

  const { data: themes } = useQuery<ThemePreset[]>({
    queryKey: ["/api/admin/cms-v2/themes"],
    enabled: hasFullAccess,
  });

  const { data: activeTheme } = useQuery<ThemePreset>({
    queryKey: ["/api/admin/cms-v2/themes/active"],
    enabled: hasFullAccess,
  });

  const { data: themePacks } = useQuery<ThemePackPreset[]>({
    queryKey: ["/api/admin/cms-v2/theme-packs"],
    enabled: hasFullAccess,
  });

  const { data: activeThemePack } = useQuery<ThemePackPreset | null>({
    queryKey: ["/api/admin/cms-v2/theme-packs/active"],
    enabled: hasFullAccess,
  });

  const activatePackMutation = useMutation({
    mutationFn: async (packId: string) => {
      const res = await fetch("/api/admin/cms-v2/theme-packs/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      if (!res.ok) throw new Error("Failed to activate theme pack");
      return res.json();
    },
    onSuccess: (data: ThemePackPreset) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms-v2/themes/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms-v2/theme-packs/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/theme/active"] });
      const tokenVars = data.themeTokens;
      const cvVars = resolveAllVariantStyles(data.componentVariants);
      applyThemeVariables({ ...tokenVars, ...cvVars });
      setPreviewId(null);
      toast({ title: "Theme pack activated", description: `"${data.name}" is now live. UI updated instantly.` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to activate theme pack.", variant: "destructive" });
    },
  });

  const activateThemeMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms-v2/theme-packs/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/theme/active"] });
      applyThemeVariables(data.variables);
      setPreviewId(null);
      toast({ title: "Theme activated", description: `"${data.name}" is now the active theme.` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to activate theme.", variant: "destructive" });
    },
  });

  const handlePreviewPack = (pack: ThemePackPreset) => {
    if (previewId === pack.id) {
      setPreviewId(null);
      return;
    }
    setPreviewId(pack.id);
  };

  const handlePreviewTheme = (theme: ThemePreset) => {
    if (previewId === theme.id) {
      setPreviewId(null);
      return;
    }
    setPreviewId(theme.id);
  };

  const activeId = activeThemePack?.id || activeTheme?.id || null;

  if (adminLoading || !hasFullAccess) {
    return (
      <CmsV2Layout activeNav="themes" breadcrumbs={[{ label: "Themes" }]}>
        <div className="p-8 text-center text-muted-foreground">{adminLoading ? "Loading..." : "Access Denied"}</div>
      </CmsV2Layout>
    );
  }

  return (
    <CmsV2Layout activeNav="themes" breadcrumbs={[{ label: "Themes" }]}>
      <div className="max-w-6xl mx-auto" data-testid="admin-cms-v2-themes-page">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2" data-testid="text-themes-heading">
              <Palette className="w-5 h-5 text-primary" />
              Themes
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {activeThemePack
                ? <>Active pack: <span className="text-primary font-medium">{activeThemePack.name}</span></>
                : activeTheme
                  ? <>Active theme: <span className="text-primary font-medium">{activeTheme.name}</span></>
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

        <div className="flex gap-1 mb-5 border-b border-border/40 pb-3" data-testid="tabs-theme-type">
          <Button
            size="sm"
            variant="ghost"
            className={`h-8 text-xs gap-1.5 rounded-none border-b-2 transition-colors ${activeTab === "packs" ? "border-primary text-primary bg-transparent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveTab("packs")}
            data-testid="tab-theme-packs"
          >
            <Package className="w-3.5 h-3.5" />
            Theme Packs
            <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 h-4 border-border">{themePacks?.length ?? 0}</Badge>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={`h-8 text-xs gap-1.5 rounded-none border-b-2 transition-colors ${activeTab === "themes" ? "border-primary text-primary bg-transparent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveTab("themes")}
            data-testid="tab-color-themes"
          >
            <Palette className="w-3.5 h-3.5" />
            Color Themes
            <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 h-4 border-border">{themes?.length ?? 0}</Badge>
          </Button>
        </div>

        {activeTab === "packs" && (
          <div className="space-y-3" data-testid="grid-theme-packs">
            {themePacks?.map((pack) => {
              const isActive = activeId === pack.id;
              const isPreviewing = previewId === pack.id;

              return (
                <Card
                  key={pack.id}
                  className={`bg-card border-border transition-all duration-200 ${isPreviewing ? "ring-1 ring-yellow-500/40 border-yellow-800/40" : isActive ? "ring-1 ring-primary/40 border-primary/30" : "hover:border-border"}`}
                  data-testid={`card-pack-${pack.id}`}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      <div className="md:w-[240px] flex-shrink-0 p-3">
                        <PackPageThumbnail pack={pack} isActive={isActive} isPreviewing={isPreviewing} />
                      </div>

                      <div className="flex-1 p-4 md:pl-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground text-sm" data-testid={`text-pack-name-${pack.id}`}>{pack.name}</h3>
                            {isActive && (
                              <Badge className="bg-primary/10 text-primary border-primary/30/60 text-[9px] px-1.5 gap-0.5" data-testid={`badge-active-${pack.id}`}>
                                <Check className="w-2.5 h-2.5" /> Active
                              </Badge>
                            )}
                            {isPreviewing && (
                              <Badge className="bg-yellow-900/30 text-yellow-400 border-yellow-800/60 text-[9px] px-1.5 gap-0.5" data-testid={`badge-preview-${pack.id}`}>
                                <Eye className="w-2.5 h-2.5" /> Previewing
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mb-2.5 leading-relaxed" data-testid={`text-pack-desc-${pack.id}`}>{pack.description}</p>
                          <PackMetaBadges pack={pack} />

                          <div className="mt-2 flex flex-wrap gap-1">
                            {Object.entries(pack.componentVariants).map(([comp, variant]) => (
                              <span key={comp} className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-[9px]" data-testid={`tag-variant-${comp}-${variant}`}>
                                {comp}: <span className="text-foreground/80">{variant}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2 mt-3 pt-2 border-t border-border/40">
                          <Button
                            size="sm"
                            variant="outline"
                            className={`h-7 text-[11px] gap-1 ${isPreviewing ? "border-yellow-700/60 text-yellow-400 bg-yellow-900/10" : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"}`}
                            onClick={() => handlePreviewPack(pack)}
                            data-testid={`button-preview-pack-${pack.id}`}
                          >
                            <Eye className="w-3 h-3" />
                            {isPreviewing ? "Stop Preview" : "Preview"}
                          </Button>
                          {!isActive && (
                            <Button
                              size="sm"
                              className="bg-primary text-foreground h-7 text-[11px] gap-1"
                              onClick={() => activatePackMutation.mutate(pack.id)}
                              disabled={activatePackMutation.isPending}
                              data-testid={`button-activate-pack-${pack.id}`}
                            >
                              <Zap className="w-3 h-3" />
                              {activatePackMutation.isPending ? "Activating..." : "Activate"}
                            </Button>
                          )}
                          {isActive && (
                            <span className="inline-flex items-center text-[10px] text-primary/60 gap-1">
                              <Check className="w-3 h-3" /> Currently live
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {activeTab === "themes" && (
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
                          className="bg-primary text-foreground h-7 text-[11px]"
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
        )}
      </div>
    </CmsV2Layout>
  );
}
