import { useState } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import CmsLayout from "@/components/admin/CmsLayout";
import { CAMPAIGN_PACKS, type CampaignPack } from "@/admin/cms/generator/campaignPacks";
import { generateCampaignPack, type CampaignPackResult } from "@/admin/cms/generator/assembleCampaignPack";
import type { SectionKitSource } from "@/admin/cms/generator/assembleCampaignPack";
import { Layers, Wand2, FileText, Palette, Package2, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Product {
  id: string;
  name: string;
  price: number;
  isActive?: boolean;
}

interface SavedSection {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  blocks: any;
  createdAt: string;
  updatedAt: string;
}

interface GenerationLogEntry {
  title: string;
  slug: string;
  status: "pending" | "success" | "error";
  error?: string;
  pageId?: string;
}

export default function AdminCmsGeneratorCampaigns() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [confirmPack, setConfirmPack] = useState<CampaignPack | null>(null);
  const [primaryProductId, setPrimaryProductId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [generationLog, setGenerationLog] = useState<GenerationLogEntry[]>([]);
  const [showResults, setShowResults] = useState(false);

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: hasFullAccess,
  });

  const { data: sections } = useQuery<SavedSection[]>({
    queryKey: ["/api/admin/cms/sections"],
    enabled: hasFullAccess,
  });

  const activeProducts = (products || []).filter((p) => p.isActive !== false);

  function sectionsToKitSource(secs: SavedSection[]): SectionKitSource[] {
    return secs.map((s) => ({
      name: s.name,
      blocks: Array.isArray(s.blocks) ? s.blocks : [],
    }));
  }

  function openConfirm(pack: CampaignPack) {
    setPrimaryProductId(activeProducts.length > 0 ? String(activeProducts[0].id) : "");
    setConfirmPack(pack);
    setGenerationLog([]);
    setShowResults(false);
  }

  async function handleGenerate() {
    if (!confirmPack) return;

    const availableKits = sectionsToKitSource(sections || []);
    const resolvedProductId = primaryProductId === "none" ? "" : primaryProductId;

    let result: CampaignPackResult;
    try {
      result = generateCampaignPack(confirmPack.id, availableKits, {
        primaryProductId: resolvedProductId,
        sectionMode: "detach",
        ctaDestination: "shop",
      });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      return;
    }

    setGenerating(true);
    setShowResults(true);

    const log: GenerationLogEntry[] = result.pages.map((p) => ({
      title: p.pageDef.title,
      slug: p.pageDef.slug,
      status: "pending" as const,
    }));
    setGenerationLog([...log]);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < result.pages.length; i++) {
      const page = result.pages[i];
      try {
        const res = await apiRequest("POST", "/api/admin/cms/pages", page.pagePayload);
        const created = await res.json();
        log[i] = { ...log[i], status: "success", pageId: created.id };
        successCount++;
      } catch (err: any) {
        log[i] = { ...log[i], status: "error", error: err.message || "Failed to create page" };
        errorCount++;
      }
      setGenerationLog([...log]);
    }

    setGenerating(false);

    queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] });

    if (errorCount === 0) {
      toast({
        title: "Campaign generated",
        description: `${successCount} page${successCount !== 1 ? "s" : ""} created as drafts.`,
      });
    } else {
      toast({
        title: "Campaign partially generated",
        description: `${successCount} succeeded, ${errorCount} failed.`,
        variant: "destructive",
      });
    }
  }

  function handleCloseResults() {
    setShowResults(false);
    setConfirmPack(null);
    setGenerationLog([]);
  }

  if (adminLoading || !hasFullAccess) {
    return (
      <CmsLayout activeNav="templates" breadcrumbs={[{ label: "Templates", href: "/admin/cms/templates?tab=generators" }, { label: "Campaign Pack Generator" }]}>
        <div className="p-8 text-center text-muted-foreground" data-testid="loading-state">
          {adminLoading ? "Loading..." : "Access Denied"}
        </div>
      </CmsLayout>
    );
  }

  return (
    <CmsLayout activeNav="templates" breadcrumbs={[{ label: "Templates", href: "/admin/cms/templates?tab=generators" }, { label: "Campaign Pack Generator" }]}>
      <div className="max-w-5xl mx-auto" data-testid="generator-campaigns-page">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Package2 className="w-5 h-5 text-primary" />
            Campaign Packs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate multiple marketing landing pages in one click. Each pack creates a set of coordinated pages as drafts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="campaign-packs-grid">
          {CAMPAIGN_PACKS.map((pack) => (
            <Card
              key={pack.id}
              className="bg-card border-border hover:border-border transition-colors"
              data-testid={`campaign-card-${pack.id}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground leading-tight">{pack.name}</h3>
                  <Badge
                    variant="outline"
                    className="border-border text-muted-foreground text-[10px] shrink-0 ml-2"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    {pack.pages.length} page{pack.pages.length !== 1 ? "s" : ""}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{pack.description}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className="border-border/60 text-muted-foreground text-[10px]">
                    <Palette className="w-3 h-3 mr-1" />
                    {pack.recommendedThemePreset}
                  </Badge>
                  <Badge variant="outline" className="border-border/60 text-muted-foreground text-[10px]">
                    <Layers className="w-3 h-3 mr-1" />
                    {pack.templateId}
                  </Badge>
                </div>

                <div className="mb-4">
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1.5">Pages</p>
                  <div className="space-y-1">
                    {pack.pages.map((page) => (
                      <div
                        key={page.slug}
                        className="text-xs text-muted-foreground flex items-center gap-1.5"
                      >
                        <span className="w-1 h-1 rounded-full bg-muted shrink-0" />
                        {page.title}
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => openConfirm(pack)}
                  className="w-full bg-primary text-foreground text-xs"
                  data-testid={`button-generate-${pack.id}`}
                >
                  <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                  Generate Campaign
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <AlertDialog open={!!confirmPack && !showResults} onOpenChange={(open) => { if (!open) setConfirmPack(null); }}>
        <AlertDialogContent className="bg-card border-border text-foreground max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" />
              Generate "{confirmPack?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground space-y-3">
              <span className="block">
                This will create {confirmPack?.pages.length} page{(confirmPack?.pages.length ?? 0) !== 1 ? "s" : ""} as drafts:
              </span>
              <span className="block space-y-1">
                {confirmPack?.pages.map((p) => (
                  <span key={p.slug} className="flex items-center gap-1.5 text-xs text-foreground/80">
                    <FileText className="w-3 h-3 text-muted-foreground" />
                    {p.title}
                    <span className="text-muted-foreground/60">/{p.slug}</span>
                  </span>
                ))}
              </span>

              {activeProducts.length > 0 && (
                <span className="block pt-2 border-t border-border">
                  <span className="block text-xs text-muted-foreground mb-1.5">Featured product (optional):</span>
                  <Select value={primaryProductId} onValueChange={setPrimaryProductId}>
                    <SelectTrigger className="bg-muted border-border text-foreground/80 text-xs h-8" data-testid="select-product">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border">
                      <SelectItem value="none" className="text-muted-foreground text-xs">None</SelectItem>
                      {activeProducts.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)} className="text-foreground/80 text-xs">
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </span>
              )}

              <span className="block text-xs text-muted-foreground pt-1">
                Theme: {confirmPack?.recommendedThemePreset} &middot; Template: {confirmPack?.templateId}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-muted border-border text-foreground/80 hover:bg-muted hover:text-foreground"
              data-testid="button-cancel-generate"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-foreground"
              onClick={handleGenerate}
              data-testid="button-confirm-generate"
            >
              <Wand2 className="w-3.5 h-3.5 mr-1.5" />
              Generate {confirmPack?.pages.length} Page{(confirmPack?.pages.length ?? 0) !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showResults} onOpenChange={(open) => { if (!open && !generating) handleCloseResults(); }}>
        <AlertDialogContent className="bg-card border-border text-foreground max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground flex items-center gap-2">
              {generating ? (
                <><Loader2 className="w-4 h-4 text-primary animate-spin" /> Generating...</>
              ) : generationLog.every((l) => l.status === "success") ? (
                <><CheckCircle2 className="w-4 h-4 text-green-400" /> Campaign Generated</>
              ) : (
                <><AlertTriangle className="w-4 h-4 text-yellow-400" /> Generation Complete</>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 pt-2" data-testid="generation-log">
                {generationLog.map((entry, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-xs p-2 rounded border ${
                      entry.status === "success"
                        ? "border-green-800/40 bg-green-950/20 text-green-400"
                        : entry.status === "error"
                        ? "border-red-800/40 bg-red-950/20 text-red-400"
                        : "border-border/40 bg-card/40 text-muted-foreground"
                    }`}
                    data-testid={`log-entry-${i}`}
                  >
                    {entry.status === "success" && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                    {entry.status === "error" && <XCircle className="w-3.5 h-3.5 shrink-0" />}
                    {entry.status === "pending" && <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />}
                    <span className="flex-1 truncate">{entry.title}</span>
                    {entry.status === "error" && entry.error && (
                      <span className="text-[10px] text-red-500 truncate max-w-[120px]">{entry.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {!generating && (
              <>
                <AlertDialogCancel
                  className="bg-muted border-border text-foreground/80 hover:bg-muted hover:text-foreground"
                  onClick={handleCloseResults}
                  data-testid="button-close-results"
                >
                  Close
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-primary text-foreground"
                  onClick={() => navigate("/admin/cms/pages")}
                  data-testid="button-view-pages"
                >
                  View Pages
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CmsLayout>
  );
}
