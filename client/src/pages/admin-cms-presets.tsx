import { useState, useRef } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CmsLayout from "@/components/admin/CmsLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Globe,
  Download,
  Upload,
  Eye,
  EyeOff,
  Zap,
  Copy,
  Trash2,
  RotateCcw,
  Package,
  Plus,
  X,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  AlertCircle,
} from "lucide-react";
import {
  startPreview,
  clearPreview,
  isPreviewActive,
  activatePreset as clientActivatePreset,
  rollbackPreset as clientRollbackPreset,
} from "@/admin/cms/presets/applyPreset.client";

interface PresetConfig {
  themePackId?: string;
  homepageTemplateId?: string;
  defaultKitsSectionIds?: string[];
  navPreset?: { styleVariant?: string; items?: { label: string; href: string }[] };
  footerPreset?: { columns?: { title: string; links?: { label: string; href: string }[] }[]; showSocial?: boolean };
  seoDefaults?: { siteName?: string; titleSuffix?: string; defaultMetaDescription?: string };
  globalCtaDefaults?: { primaryCtaText?: string; primaryCtaHref?: string; secondaryCtaText?: string; secondaryCtaHref?: string };
  homePageSeedMode?: string;
  applyScope?: string;
}

interface SitePresetRow {
  id: string;
  name: string;
  description: string | null;
  tags: string[] | null;
  previewImage: string | null;
  config: PresetConfig;
  createdAt: string;
  updatedAt: string;
}

interface ApplyHistoryEntry {
  id: string;
  presetId: string;
  presetName: string;
  adminEmail: string;
  action: string;
  snapshot: unknown;
  notes: string | null;
  createdAt: string;
}

const THEME_LABELS: Record<string, string> = {
  "performance-tech": "Performance Tech",
  "spa-minimal": "Spa Minimal",
  "clinical-clean": "Clinical Clean",
  "luxury-wellness": "Luxury Wellness",
  "dark-performance": "Dark Performance",
};

const TEMPLATE_LABELS: Record<string, string> = {
  "landing-page-v1": "Landing Page v1",
  "product-story-v1": "Product Story v1",
  "sales-funnel-v1": "Sales Funnel v1",
  blank: "Blank Page",
};

const THEME_COLORS: Record<string, { bg: string; accent: string; text: string }> = {
  "performance-tech": { bg: "#0a0e17", accent: "#22d3ee", text: "#f1f5f9" },
  "spa-minimal": { bg: "#faf7f2", accent: "#8b7355", text: "#3d3d3d" },
  "clinical-clean": { bg: "#f8fafc", accent: "#0ea5e9", text: "#1e293b" },
  "luxury-wellness": { bg: "#1a1a2e", accent: "#c9a96e", text: "#e8e6e3" },
  "dark-performance": { bg: "#0d0d0d", accent: "#ef4444", text: "#e5e5e5" },
};

function PresetMiniPreview({ config }: { config: PresetConfig }) {
  const themeId = config.themePackId || "performance-tech";
  const colors = THEME_COLORS[themeId] || THEME_COLORS["performance-tech"];

  return (
    <div
      className="rounded-md overflow-hidden border border-border"
      style={{ backgroundColor: colors.bg, height: 120 }}
      data-testid="preset-mini-preview"
    >
      <div className="flex items-center justify-between px-2 py-1 border-b" style={{ borderColor: `${colors.accent}33` }}>
        <div className="flex gap-1">
          {(config.navPreset?.items || []).slice(0, 4).map((item, i) => (
            <span key={i} className="text-[7px]" style={{ color: colors.text, opacity: 0.7 }}>
              {item.label}
            </span>
          ))}
        </div>
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.accent }} />
      </div>
      <div className="px-2 py-3" style={{ background: `linear-gradient(180deg, ${colors.accent}15, ${colors.bg})` }}>
        <div className="w-16 h-1 rounded mb-1" style={{ backgroundColor: colors.accent }} />
        <div className="w-24 h-0.5 rounded mb-2" style={{ backgroundColor: `${colors.text}40` }} />
        <div className="flex gap-1">
          <div className="px-1.5 py-0.5 rounded text-[6px] font-bold" style={{ backgroundColor: colors.accent, color: colors.bg }}>
            {config.globalCtaDefaults?.primaryCtaText || "CTA"}
          </div>
        </div>
      </div>
      <div className="px-2 flex gap-1 mt-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-4 rounded-sm" style={{ backgroundColor: `${colors.text}10`, border: `0.5px solid ${colors.text}15` }} />
        ))}
      </div>
    </div>
  );
}

function HistoryPanel() {
  const [expanded, setExpanded] = useState(false);
  const { data: history = [] } = useQuery<ApplyHistoryEntry[]>({
    queryKey: ["/api/admin/cms/site-presets/apply-history"],
    queryFn: async () => {
      const res = await fetch("/api/admin/cms/site-presets/apply-history", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (history.length === 0) return null;

  return (
    <div className="mt-6" data-testid="apply-history-panel">
      <button
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        onClick={() => setExpanded(!expanded)}
        data-testid="button-toggle-history"
      >
        <Clock className="w-4 h-4" />
        Apply History ({history.length})
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="space-y-2">
          {history.slice(0, 10).map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 px-3 py-2 bg-card rounded-md border border-border text-xs" data-testid={`history-entry-${entry.id}`}>
              <Badge variant="outline" className={`text-[10px] ${entry.action === "rollback" ? "border-yellow-500/50 text-yellow-400" : "border-primary/50 text-primary"}`}>
                {entry.action}
              </Badge>
              <span className="text-foreground/80">{entry.presetName}</span>
              <span className="text-muted-foreground/60 ml-auto">{entry.adminEmail}</span>
              <span className="text-muted-foreground/60">{new Date(entry.createdAt).toLocaleString()}</span>
              {entry.notes && <span className="text-muted-foreground italic truncate max-w-[150px]">{entry.notes}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: async (payload: unknown) => {
      const res = await fetch("/api/admin/cms/site-presets/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Import failed");
      }
      return res.json();
    },
    onSuccess: (preset) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/site-presets"] });
      toast({ title: "Preset imported", description: `"${preset.name}" has been imported successfully.` });
      onClose();
      setJsonText("");
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleImport = () => {
    setError(null);
    try {
      const parsed = JSON.parse(jsonText);
      importMutation.mutate(parsed);
    } catch {
      setError("Invalid JSON format. Please paste a valid export file.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJsonText(ev.target?.result as string);
      setError(null);
    };
    reader.readAsText(file);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" data-testid="import-modal">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-lg mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Import Site Preset</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-foreground" data-testid="button-close-import">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Upload JSON file</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-border text-foreground/80 hover:bg-muted"
              data-testid="button-upload-file"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </Button>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Or paste JSON</label>
            <Textarea
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); setError(null); }}
              placeholder='{"version": 1, "preset": {...}}'
              className="h-40 bg-muted border-border text-foreground text-xs"
              data-testid="textarea-import-json"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm" data-testid="text-import-error">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground" data-testid="button-cancel-import">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={!jsonText.trim() || importMutation.isPending}
              className="bg-primary text-foreground"
              data-testid="button-confirm-import"
            >
              {importMutation.isPending ? "Importing..." : "Import Preset"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminCmsPresets() {
  const { admin, isLoading: adminLoading, isAuthenticated } = useAdmin();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: presets = [], isLoading } = useQuery<SitePresetRow[]>({
    queryKey: ["/api/admin/cms/site-presets"],
    queryFn: async () => {
      const res = await fetch("/api/admin/cms/site-presets", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/cms/site-presets/seed", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Seed failed");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/site-presets"] });
      toast({ title: "Presets seeded", description: `Created ${data.created} presets, ${data.skipped} already existed.` });
    },
    onError: () => toast({ title: "Seed failed", variant: "destructive" }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/cms/site-presets/${id}/duplicate`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Duplicate failed");
      return res.json();
    },
    onSuccess: (preset) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/site-presets"] });
      toast({ title: "Preset duplicated", description: `"${preset.name}" created.` });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/cms/site-presets/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/site-presets"] });
      toast({ title: "Preset deleted" });
      setConfirmDeleteId(null);
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      return clientActivatePreset(id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/site-presets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/site-presets/apply-history"] });
      setPreviewingId(null);
      toast({ title: "Preset activated!", description: `"${data.presetName}" is now live. ${data.changes.length} changes applied.` });
    },
    onError: () => toast({ title: "Activation failed", variant: "destructive" }),
  });

  const rollbackMutation = useMutation({
    mutationFn: async () => {
      return clientRollbackPreset();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/site-presets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/site-presets/apply-history"] });
      toast({ title: "Rollback successful", description: "Previous site settings restored." });
    },
    onError: () => toast({ title: "Rollback failed", variant: "destructive" }),
  });

  const handlePreview = (preset: SitePresetRow) => {
    if (previewingId === preset.id) {
      clearPreview();
      setPreviewingId(null);
      toast({ title: "Preview cleared" });
      return;
    }
    const asSitePreset = {
      id: preset.id,
      name: preset.name,
      themePackId: preset.config.themePackId || "",
      navPreset: preset.config.navPreset || undefined,
      footerPreset: preset.config.footerPreset || undefined,
      seoDefaults: preset.config.seoDefaults || undefined,
      globalCtaDefaults: preset.config.globalCtaDefaults || undefined,
      homePageSeedMode: (preset.config.homePageSeedMode as any) || "doNothing",
    };
    startPreview(asSitePreset as any);
    setPreviewingId(preset.id);
    toast({ title: "Preview active", description: `Previewing "${preset.name}". Visit storefront to see changes.` });
  };

  const handleExport = async (preset: SitePresetRow) => {
    try {
      const res = await fetch(`/api/admin/cms/site-presets/${preset.id}/export`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${preset.name.toLowerCase().replace(/\s+/g, "-")}-preset.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Exported", description: `"${preset.name}" downloaded.` });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  if (adminLoading) {
    return (
      <CmsLayout breadcrumbs={[{ label: "Presets" }]} activeNav="presets">
        <div className="flex items-center justify-center h-64 text-muted-foreground" data-testid="loading-state">Loading...</div>
      </CmsLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <CmsLayout breadcrumbs={[{ label: "Presets" }]} activeNav="presets">
        <div className="flex items-center justify-center h-64 text-muted-foreground" data-testid="unauthenticated-state">Please log in as admin.</div>
      </CmsLayout>
    );
  }

  return (
    <CmsLayout breadcrumbs={[{ label: "Presets" }]} activeNav="presets">
      <div className="max-w-6xl mx-auto" data-testid="presets-page">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="heading-presets">Site Presets</h1>
            <p className="text-sm text-muted-foreground mt-1">Pre-configured site personalities. Preview and activate to instantly change your storefront.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => rollbackMutation.mutate()}
              disabled={rollbackMutation.isPending}
              className="border-yellow-600/50 text-yellow-400 hover:bg-yellow-900/20 gap-1.5"
              data-testid="button-rollback"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Rollback
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
              className="border-border text-foreground/80 hover:bg-muted gap-1.5"
              data-testid="button-import"
            >
              <Upload className="w-3.5 h-3.5" />
              Import
            </Button>
            <Button
              size="sm"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="bg-primary text-foreground gap-1.5"
              data-testid="button-seed-presets"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {seedMutation.isPending ? "Seeding..." : "Seed Starter Presets"}
            </Button>
          </div>
        </div>

        {isPreviewActive() && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-yellow-900/20 border border-yellow-600/40 flex items-center gap-3" data-testid="preview-banner">
            <Eye className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-yellow-300">Preview mode active. Visit your storefront to see changes.</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { clearPreview(); setPreviewingId(null); }}
              className="text-yellow-400 hover:text-yellow-200 ml-auto"
              data-testid="button-clear-preview"
            >
              <EyeOff className="w-3.5 h-3.5 mr-1" />
              Exit Preview
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">Loading presets...</div>
        ) : presets.length === 0 ? (
          <Card className="bg-card/40 border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="w-12 h-12 text-muted-foreground/60 mb-4" />
              <h3 className="text-lg font-semibold text-foreground/80 mb-2">No Presets Yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Click "Seed Starter Presets" to generate 6 pre-configured site personalities, or import a preset from a JSON file.
              </p>
              <Button
                size="sm"
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="bg-primary text-foreground gap-2"
                data-testid="button-seed-empty"
              >
                <Sparkles className="w-4 h-4" />
                {seedMutation.isPending ? "Seeding..." : "Seed Starter Presets"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="presets-grid">
            {presets.map((preset) => {
              const isPreviewing = previewingId === preset.id;
              const config = preset.config || {};
              const themeLabel = THEME_LABELS[config.themePackId || ""] || config.themePackId || "Unknown";
              const templateLabel = TEMPLATE_LABELS[config.homepageTemplateId || ""] || config.homepageTemplateId || "None";
              const navStyle = config.navPreset?.styleVariant || "minimal";
              const kitCount = config.defaultKitsSectionIds?.length || 0;

              return (
                <Card
                  key={preset.id}
                  className={`bg-card border transition-all duration-200 ${
                    isPreviewing ? "border-yellow-500/60 ring-1 ring-yellow-500/30" : "border-border hover:border-border"
                  }`}
                  data-testid={`preset-card-${preset.id}`}
                >
                  <CardContent className="p-4">
                    <PresetMiniPreview config={config} />

                    <div className="mt-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-foreground text-sm leading-tight" data-testid={`text-preset-name-${preset.id}`}>
                          {preset.name}
                        </h3>
                        {isPreviewing && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40 text-[10px] shrink-0">
                            Previewing
                          </Badge>
                        )}
                      </div>
                      {preset.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{preset.description}</p>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px] border-primary/30/60 text-primary">
                        {themeLabel}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                        {templateLabel}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                        Nav: {navStyle}
                      </Badge>
                      {kitCount > 0 && (
                        <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                          {kitCount} kit{kitCount !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>

                    {preset.tags && preset.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(preset.tags as string[]).map((tag) => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant={isPreviewing ? "outline" : "default"}
                        onClick={() => handlePreview(preset)}
                        className={`h-7 text-xs gap-1 flex-1 ${
                          isPreviewing
                            ? "border-yellow-600/50 text-yellow-400 hover:bg-yellow-900/20"
                            : "bg-muted hover:bg-muted text-foreground"
                        }`}
                        data-testid={`button-preview-${preset.id}`}
                      >
                        {isPreviewing ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {isPreviewing ? "Stop" : "Preview"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => activateMutation.mutate(preset.id)}
                        disabled={activateMutation.isPending}
                        className="h-7 text-xs gap-1 flex-1 bg-primary text-foreground"
                        data-testid={`button-activate-${preset.id}`}
                      >
                        <Zap className="w-3 h-3" />
                        Activate
                      </Button>
                    </div>

                    <div className="mt-2 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExport(preset)}
                        className="h-6 text-[10px] text-muted-foreground hover:text-foreground gap-1 flex-1"
                        data-testid={`button-export-${preset.id}`}
                      >
                        <Download className="w-3 h-3" />
                        Export
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateMutation.mutate(preset.id)}
                        disabled={duplicateMutation.isPending}
                        className="h-6 text-[10px] text-muted-foreground hover:text-foreground gap-1 flex-1"
                        data-testid={`button-duplicate-${preset.id}`}
                      >
                        <Copy className="w-3 h-3" />
                        Duplicate
                      </Button>
                      {confirmDeleteId === preset.id ? (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(preset.id)}
                            disabled={deleteMutation.isPending}
                            className="h-6 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-900/20 gap-1"
                            data-testid={`button-confirm-delete-${preset.id}`}
                          >
                            <Check className="w-3 h-3" />
                            Confirm
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDeleteId(null)}
                            className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                            data-testid={`button-cancel-delete-${preset.id}`}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDeleteId(preset.id)}
                          className="h-6 text-[10px] text-muted-foreground hover:text-red-400 gap-1 flex-1"
                          data-testid={`button-delete-${preset.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <HistoryPanel />
      </div>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </CmsLayout>
  );
}
