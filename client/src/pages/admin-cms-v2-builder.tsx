import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { useRoute, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminNav from "@/components/admin/AdminNav";
import { ArrowLeft, Save, Globe, Layers, Unlink, Search, X, Monitor, Tablet, Smartphone, ChevronUp, ChevronDown, Copy, Zap, Star, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Puck, usePuck, type Config, type Data } from "@puckeditor/core";
import "@puckeditor/core/dist/index.css";
import { registerAllBlocks } from "@/lib/blockRegistryEntries";
import { getAllBlocks } from "@/lib/blockRegistry";
import { getAllBlocks as getCmsBlocks, BLOCK_CATEGORIES } from "@/cms/blocks";
import { ensureBlocksRegistered } from "@/cms/blocks/init";
import { getCategoriesOrdered } from "@/cms/blocks/blockCategories";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

registerAllBlocks();
ensureBlocksRegistered();

const CATEGORY_MAP: Record<string, { label: string; description: string }> = Object.fromEntries(
  BLOCK_CATEGORIES.map((c) => [c.id, { label: c.label, description: c.description }])
);

const QUICK_INSERT_BLOCKS = [
  { type: "hero", label: "Hero", icon: "🏔" },
  { type: "callToAction", label: "CTA", icon: "📢" },
  { type: "productGrid", label: "Products", icon: "🛒" },
  { type: "faq", label: "FAQ", icon: "❓" },
  { type: "testimonials", label: "Reviews", icon: "⭐" },
];

function buildPuckConfig(): Config {
  const legacyEntries = getAllBlocks();
  const cmsEntries = getCmsBlocks();
  const cmsTypes = new Set(cmsEntries.map((e) => e.type));
  const deduped = legacyEntries.filter((e) => !cmsTypes.has(e.type));
  const entries = [...deduped, ...cmsEntries];
  const components: Config["components"] = {};

  const categoryComponents: Record<string, string[]> = {};

  for (const entry of entries) {
    if (entry.type === "sectionRef") continue;

    const puckFields: Record<string, any> = {};
    const convertField = (field: any, key: string): any => {
      if (field.type === "text") {
        return { type: "text", label: field.label || key };
      } else if (field.type === "textarea") {
        return { type: "textarea", label: field.label || key };
      } else if (field.type === "number") {
        return { type: "number", label: field.label || key, min: field.min, max: field.max };
      } else if (field.type === "select") {
        return { type: "select", label: field.label || key, options: field.options || [] };
      } else if (field.type === "radio") {
        return { type: "radio", label: field.label || key, options: field.options || [] };
      } else if (field.type === "array" && field.arrayFields) {
        const arrayFields: Record<string, any> = {};
        for (const [ak, af] of Object.entries(field.arrayFields)) {
          const converted = convertField(af, ak);
          if (converted) arrayFields[ak] = converted;
        }
        return { type: "array", label: field.label || key, arrayFields, defaultItemProps: Object.fromEntries(Object.keys(arrayFields).map(k => [k, ""])), getItemSummary: (item: any) => item[Object.keys(arrayFields)[0]] || `Item` };
      } else if (field.type === "object" && field.objectFields) {
        const objectFields: Record<string, any> = {};
        for (const [ok, of_] of Object.entries(field.objectFields)) {
          const converted = convertField(of_, ok);
          if (converted) objectFields[ok] = converted;
        }
        return { type: "object", label: field.label || key, objectFields };
      }
      return null;
    };
    for (const [key, field] of Object.entries(entry.puckFields)) {
      const converted = convertField(field, key);
      if (converted) puckFields[key] = converted;
    }

    const cat = entry.category || "utility";
    if (!categoryComponents[cat]) categoryComponents[cat] = [];
    categoryComponents[cat].push(entry.type);

    components[entry.type] = {
      label: entry.label,
      defaultProps: entry.defaultProps,
      fields: puckFields,
      render: ({ puck: _puck, ...props }: any) => {
        const Comp = entry.renderComponent as any;
        return <Comp data={props} />;
      },
    };
  }

  components["sectionRef"] = {
    label: "Section Reference",
    defaultProps: { sectionId: "", sectionName: "" },
    fields: {
      sectionId: { type: "text", label: "Section ID" },
      sectionName: { type: "text", label: "Section Name" },
    },
    render: ({ puck: _puck, sectionId, sectionName, ...rest }: any) => (
      <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 my-2 bg-primary/10">
        <div className="flex items-center gap-2 text-primary text-sm">
          <Layers className="w-4 h-4" />
          <span className="font-medium">Section: {sectionName || sectionId || "Not set"}</span>
        </div>
        {!sectionId && (
          <p className="text-muted-foreground text-xs mt-1">Use "Insert Section" to link a saved section.</p>
        )}
      </div>
    ),
  };

  if (!categoryComponents["utility"]) categoryComponents["utility"] = [];
  categoryComponents["utility"].push("sectionRef");

  const categories: Config["categories"] = {};
  for (const [catId, meta] of Object.entries(CATEGORY_MAP)) {
    if (categoryComponents[catId]?.length) {
      categories[catId] = {
        title: meta.label,
        components: categoryComponents[catId],
        defaultExpanded: catId === "layout",
      };
    }
  }

  return {
    components,
    categories,
    root: {
      defaultProps: { title: "" },
      fields: {
        title: { type: "text", label: "Page Title" },
      },
      render: ({ children }: any) => (
        <div className="page-renderer bg-background text-foreground min-h-screen">{children}</div>
      ),
    },
  };
}

function puckDataToContentJson(data: Data): { version: number; blocks: any[] } {
  const blocks = (data.content || []).map((item: any) => ({
    id: item.props?.id || crypto.randomUUID(),
    type: item.type,
    data: Object.fromEntries(
      Object.entries(item.props || {}).filter(([k]) => k !== "id")
    ),
    settings: {},
  }));
  return { version: 1, blocks };
}

function contentJsonToPuckData(contentJson: any, pageTitle: string): Data {
  const blocks = contentJson?.blocks || [];
  const content = blocks.map((block: any) => ({
    type: block.type,
    props: {
      id: block.id || crypto.randomUUID(),
      ...block.data,
    },
  }));
  return {
    root: { props: { title: pageTitle || "" } },
    content,
    zones: {},
  };
}

interface SavedSection {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  blocks: any[];
}

interface SeoData {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  robots: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  jsonLd: string;
}

function SeoPanel({ open, onOpenChange, seo, onSeoChange }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seo: SeoData;
  onSeoChange: (seo: SeoData) => void;
}) {
  const update = (field: keyof SeoData, value: string) => {
    onSeoChange({ ...seo, [field]: value });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-card border-border text-foreground w-[420px] sm:max-w-[420px] overflow-y-auto" data-testid="panel-seo">
        <SheetHeader>
          <SheetTitle className="text-foreground flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            SEO Settings
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Basic</h3>

            <div className="space-y-2">
              <Label className="text-foreground/80">Meta Title</Label>
              <Input
                value={seo.metaTitle}
                onChange={(e) => update("metaTitle", e.target.value)}
                placeholder="Page title for search engines"
                className="bg-muted border-border text-foreground"
                data-testid="input-seo-meta-title"
              />
              <p className="text-xs text-muted-foreground">{seo.metaTitle.length}/60 characters</p>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground/80">Meta Description</Label>
              <Textarea
                value={seo.metaDescription}
                onChange={(e) => update("metaDescription", e.target.value)}
                placeholder="Brief description for search results"
                className="bg-muted border-border text-foreground"
                rows={3}
                data-testid="input-seo-meta-description"
              />
              <p className="text-xs text-muted-foreground">{seo.metaDescription.length}/160 characters</p>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground/80">Canonical URL</Label>
              <Input
                value={seo.canonicalUrl}
                onChange={(e) => update("canonicalUrl", e.target.value)}
                placeholder="https://example.com/page"
                className="bg-muted border-border text-foreground"
                data-testid="input-seo-canonical"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground/80">Robots</Label>
              <Select value={seo.robots || "index, follow"} onValueChange={(val) => update("robots", val)}>
                <SelectTrigger className="bg-muted border-border text-foreground" data-testid="select-seo-robots">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-muted border-border text-foreground">
                  <SelectItem value="index, follow">index, follow</SelectItem>
                  <SelectItem value="noindex, follow">noindex, follow</SelectItem>
                  <SelectItem value="index, nofollow">index, nofollow</SelectItem>
                  <SelectItem value="noindex, nofollow">noindex, nofollow</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Open Graph</h3>

            <div className="space-y-2">
              <Label className="text-foreground/80">OG Title</Label>
              <Input
                value={seo.ogTitle}
                onChange={(e) => update("ogTitle", e.target.value)}
                placeholder="Title for social sharing (defaults to meta title)"
                className="bg-muted border-border text-foreground"
                data-testid="input-seo-og-title"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground/80">OG Description</Label>
              <Textarea
                value={seo.ogDescription}
                onChange={(e) => update("ogDescription", e.target.value)}
                placeholder="Description for social sharing"
                className="bg-muted border-border text-foreground"
                rows={2}
                data-testid="input-seo-og-description"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground/80">OG Image URL</Label>
              <Input
                value={seo.ogImage}
                onChange={(e) => update("ogImage", e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="bg-muted border-border text-foreground"
                data-testid="input-seo-og-image"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Twitter Card</h3>

            <div className="space-y-2">
              <Label className="text-foreground/80">Card Type</Label>
              <Select value={seo.twitterCard || "summary_large_image"} onValueChange={(val) => update("twitterCard", val)}>
                <SelectTrigger className="bg-muted border-border text-foreground" data-testid="select-seo-twitter-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-muted border-border text-foreground">
                  <SelectItem value="summary">summary</SelectItem>
                  <SelectItem value="summary_large_image">summary_large_image</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground/80">Twitter Title</Label>
              <Input
                value={seo.twitterTitle}
                onChange={(e) => update("twitterTitle", e.target.value)}
                placeholder="Defaults to OG title"
                className="bg-muted border-border text-foreground"
                data-testid="input-seo-twitter-title"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground/80">Twitter Description</Label>
              <Input
                value={seo.twitterDescription}
                onChange={(e) => update("twitterDescription", e.target.value)}
                placeholder="Defaults to OG description"
                className="bg-muted border-border text-foreground"
                data-testid="input-seo-twitter-desc"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground/80">Twitter Image URL</Label>
              <Input
                value={seo.twitterImage}
                onChange={(e) => update("twitterImage", e.target.value)}
                placeholder="Defaults to OG image"
                className="bg-muted border-border text-foreground"
                data-testid="input-seo-twitter-image"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Structured Data</h3>

            <div className="space-y-2">
              <Label className="text-foreground/80">JSON-LD</Label>
              <Textarea
                value={seo.jsonLd}
                onChange={(e) => update("jsonLd", e.target.value)}
                placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "..."\n}'}
                className="bg-muted border-border text-foreground font-mono text-xs"
                rows={8}
                data-testid="input-seo-json-ld"
              />
              {seo.jsonLd && (() => {
                try { JSON.parse(seo.jsonLd); return <p className="text-xs text-green-400">Valid JSON</p>; }
                catch { return <p className="text-xs text-red-400">Invalid JSON</p>; }
              })()}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Preview</h3>
            <div className="text-blue-400 text-sm truncate" data-testid="text-seo-preview-title">
              {seo.metaTitle || seo.ogTitle || "Page Title"}
            </div>
            <div className="text-green-400 text-xs truncate">
              {seo.canonicalUrl || "https://example.com/page"}
            </div>
            <div className="text-muted-foreground text-xs line-clamp-2" data-testid="text-seo-preview-desc">
              {seo.metaDescription || seo.ogDescription || "Page description will appear here..."}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InsertSectionButton({ onInsert }: { onInsert: (section: SavedSection) => void }) {
  const [open, setOpen] = useState(false);
  const { data: sections } = useQuery<SavedSection[]>({
    queryKey: ["/api/admin/cms-v2/sections"],
    enabled: open,
  });

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-primary/30 text-primary hover:bg-primary/10"
        onClick={() => setOpen(true)}
        data-testid="button-insert-section"
      >
        <Layers className="w-4 h-4 mr-1" />
        Insert Section
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg" data-testid="dialog-insert-section">
          <DialogHeader>
            <DialogTitle className="text-foreground">Insert Saved Section</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Choose a section to insert. It will be linked — changes to the section update all pages using it.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto space-y-2 py-2">
            {!sections || sections.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                No saved sections. Create sections in the Sections library first.
              </p>
            ) : (
              sections.map((section) => (
                <Card
                  key={section.id}
                  className="bg-muted border-border hover:border-primary/30 cursor-pointer transition-colors"
                  onClick={() => { onInsert(section); setOpen(false); }}
                  data-testid={`section-option-${section.id}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground text-sm">{section.name}</p>
                        {section.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="border-border text-muted-foreground text-xs">
                        {Array.isArray(section.blocks) ? section.blocks.length : 0} blocks
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetachSectionButton({ pageId, pageTitle, onDone }: { pageId: string; pageTitle: string; onDone: () => void }) {
  const { appState, dispatch } = usePuck();
  const { toast } = useToast();
  const [detaching, setDetaching] = useState(false);

  const sectionRefCount = (appState.data.content || []).filter((item: any) => item.type === "sectionRef" && item.props?.sectionId).length;

  const handleDetach = async () => {
    setDetaching(true);
    try {
      const newContent: any[] = [];
      for (const item of appState.data.content || []) {
        if (item.type === "sectionRef" && item.props?.sectionId) {
          const res = await fetch(`/api/admin/cms-v2/sections/${item.props.sectionId}`, { credentials: "include" });
          if (res.ok) {
            const section = await res.json();
            const blocks = Array.isArray(section.blocks) ? section.blocks : [];
            for (const block of blocks) {
              newContent.push({
                type: block.type,
                props: {
                  id: crypto.randomUUID(),
                  ...block.data,
                },
              });
            }
          } else {
            newContent.push(item);
          }
        } else {
          newContent.push(item);
        }
      }

      const contentJson = {
        version: 1,
        blocks: newContent.map((item: any) => ({
          id: item.props?.id || crypto.randomUUID(),
          type: item.type,
          data: Object.fromEntries(
            Object.entries(item.props || {}).filter(([k]) => k !== "id")
          ),
          settings: {},
        })),
      };

      const saveRes = await fetch(`/api/admin/cms-v2/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentJson, title: (appState.data.root as any)?.props?.title || pageTitle }),
      });
      if (!saveRes.ok) throw new Error("Save failed");

      toast({ title: "Sections detached", description: "Section references replaced with inline blocks. Reload to see changes." });
      onDone();
      window.location.reload();
    } catch {
      toast({ title: "Error", description: "Failed to detach sections.", variant: "destructive" });
    } finally {
      setDetaching(false);
    }
  };

  if (sectionRefCount === 0) return null;

  return (
    <Button
      size="sm"
      variant="outline"
      className="border-yellow-700 text-yellow-400 hover:bg-yellow-900/30"
      disabled={detaching}
      onClick={handleDetach}
      data-testid="button-detach-sections"
    >
      <Unlink className="w-4 h-4 mr-1" />
      {detaching ? "Detaching..." : `Detach (${sectionRefCount})`}
    </Button>
  );
}

function SaveDraftButton({ pageId, pageTitle, seoData, onDone }: { pageId: string; pageTitle: string; seoData: SeoData; onDone: () => void }) {
  const { appState } = usePuck();
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      const contentJson = puckDataToContentJson(appState.data);
      const title = (appState.data.root as any)?.props?.title || pageTitle;
      let parsedJsonLd: any = null;
      if (seoData.jsonLd) {
        try { parsedJsonLd = JSON.parse(seoData.jsonLd); } catch {}
      }
      const res = await fetch(`/api/admin/cms-v2/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentJson,
          title,
          metaTitle: seoData.metaTitle || null,
          metaDescription: seoData.metaDescription || null,
          canonicalUrl: seoData.canonicalUrl || null,
          robots: seoData.robots || "index, follow",
          ogTitle: seoData.ogTitle || null,
          ogDescription: seoData.ogDescription || null,
          ogImage: seoData.ogImage || null,
          twitterCard: seoData.twitterCard || "summary_large_image",
          twitterTitle: seoData.twitterTitle || null,
          twitterDescription: seoData.twitterDescription || null,
          twitterImage: seoData.twitterImage || null,
          jsonLd: parsedJsonLd,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "Draft saved", description: "Content and SEO settings saved." });
      onDone();
    } catch {
      toast({ title: "Error", description: "Failed to save draft.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="border-primary/30 text-primary hover:bg-primary/10"
      disabled={saving}
      data-testid="button-save-draft"
      onClick={handleSave}
    >
      <Save className="w-4 h-4 mr-1" />
      {saving ? "Saving..." : "Save Draft"}
    </Button>
  );
}

function PublishButton({ pageId, pageTitle, seoData, onDone }: { pageId: string; pageTitle: string; seoData: SeoData; onDone: () => void }) {
  const { appState } = usePuck();
  const [publishing, setPublishing] = useState(false);
  const { toast } = useToast();

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const contentJson = puckDataToContentJson(appState.data);
      const title = (appState.data.root as any)?.props?.title || pageTitle;
      let parsedJsonLd: any = null;
      if (seoData.jsonLd) {
        try { parsedJsonLd = JSON.parse(seoData.jsonLd); } catch {}
      }
      await fetch(`/api/admin/cms-v2/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentJson,
          title,
          metaTitle: seoData.metaTitle || null,
          metaDescription: seoData.metaDescription || null,
          canonicalUrl: seoData.canonicalUrl || null,
          robots: seoData.robots || "index, follow",
          ogTitle: seoData.ogTitle || null,
          ogDescription: seoData.ogDescription || null,
          ogImage: seoData.ogImage || null,
          twitterCard: seoData.twitterCard || "summary_large_image",
          twitterTitle: seoData.twitterTitle || null,
          twitterDescription: seoData.twitterDescription || null,
          twitterImage: seoData.twitterImage || null,
          jsonLd: parsedJsonLd,
        }),
      });
      const pubRes = await fetch(`/api/admin/cms-v2/pages/${pageId}/publish`, { method: "POST" });
      if (!pubRes.ok) throw new Error("Publish failed");
      toast({ title: "Published", description: "Page and SEO settings are now live." });
      onDone();
    } catch {
      toast({ title: "Error", description: "Failed to publish.", variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Button
      size="sm"
      className="bg-green-600 hover:bg-green-700 text-foreground"
      disabled={publishing}
      data-testid="button-publish"
      onClick={handlePublish}
    >
      <Globe className="w-4 h-4 mr-1" />
      {publishing ? "Publishing..." : "Publish"}
    </Button>
  );
}

function QuickInsertBar() {
  const { dispatch, appState } = usePuck();

  const handleQuickInsert = (blockType: string) => {
    dispatch({
      type: "insert",
      componentType: blockType,
      destinationIndex: appState.data.content.length,
      destinationZone: "root:default-zone",
    });
  };

  return (
    <div className="flex items-center gap-1" data-testid="quick-insert-bar">
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-muted-foreground text-xs mr-1 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Quick:
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-muted border-border text-foreground text-xs">
            One-click insert common blocks
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {QUICK_INSERT_BLOCKS.map((block) => (
        <TooltipProvider key={block.type} delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground hover:bg-muted h-7 px-2 text-xs gap-1"
                onClick={() => handleQuickInsert(block.type)}
                data-testid={`quick-insert-${block.type}`}
              >
                <span>{block.icon}</span>
                <span className="hidden sm:inline">{block.label}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-muted border-border text-foreground text-xs">
              Insert {block.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}

const MOST_USED_BLOCK_TYPES = ["hero", "richText", "callToAction", "productGrid", "testimonials"];

interface BlockPickerEntry {
  type: string;
  label: string;
  category: string;
  description: string;
}

function buildBlockPickerEntries(): BlockPickerEntry[] {
  const legacyEntries = getAllBlocks();
  const cmsEntries = getCmsBlocks();
  const cmsTypes = new Set(cmsEntries.map((e) => e.type));
  const deduped = legacyEntries.filter((e) => !cmsTypes.has(e.type));
  const entries = [...deduped, ...cmsEntries];
  return entries
    .filter((e) => e.type !== "sectionRef")
    .map((e) => ({
      type: e.type,
      label: e.label,
      category: e.category || "utility",
      description: getBlockDescription(e.type),
    }));
}

function EnhancedBlockPicker() {
  const { dispatch, appState } = usePuck();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const searchRef = useRef<HTMLInputElement>(null);

  const allEntries = useMemo(() => buildBlockPickerEntries(), []);
  const categories = useMemo(() => getCategoriesOrdered(), []);

  const filtered = useMemo(() => {
    let entries = allEntries;
    if (activeTab === "most-used") {
      entries = entries.filter((e) => MOST_USED_BLOCK_TYPES.includes(e.type));
    } else if (activeTab !== "all") {
      entries = entries.filter((e) => e.category === activeTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.label.toLowerCase().includes(q) ||
          e.type.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q)
      );
    }
    return entries;
  }, [allEntries, activeTab, search]);

  const handleInsert = (blockType: string) => {
    dispatch({
      type: "insert",
      componentType: blockType,
      destinationIndex: appState.data.content.length,
      destinationZone: "root:default-zone",
    });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && search) {
        setSearch("");
        searchRef.current?.blur();
      }
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [search]);

  const tabs = [
    { id: "all", label: "All" },
    { id: "most-used", label: "Popular" },
    ...categories.map((c) => ({ id: c.id, label: c.label })),
  ];

  return (
    <div className="flex flex-col h-full" data-testid="enhanced-block-picker">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search blocks... (press "/")'
            className="w-full h-8 pl-8 pr-8 text-xs bg-muted border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
            data-testid="input-block-search"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              data-testid="button-clear-search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="px-3 pt-2 pb-1">
        <div className="flex flex-wrap gap-1" data-testid="block-category-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              data-testid={`tab-category-${tab.id}`}
            >
              {tab.id === "most-used" && <Star className="w-3 h-3 inline mr-0.5 -mt-px" />}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab !== "all" && activeTab !== "most-used" && (
        <div className="px-3 py-1">
          <p className="text-[10px] text-muted-foreground">
            {CATEGORY_MAP[activeTab]?.description}
          </p>
        </div>
      )}
      {activeTab === "most-used" && (
        <div className="px-3 py-1">
          <p className="text-[10px] text-muted-foreground">Frequently used blocks for quick access</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-2" data-testid="block-picker-list">
        {filtered.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground text-xs">No blocks found</p>
            {search && (
              <button
                onClick={() => { setSearch(""); setActiveTab("all"); }}
                className="text-primary text-xs mt-1 hover:underline"
                data-testid="button-clear-filters"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((entry) => (
              <button
                key={entry.type}
                onClick={() => handleInsert(entry.type)}
                className="w-full text-left group rounded-lg border border-border bg-muted hover:border-primary/30 hover:bg-muted p-2.5 transition-all"
                data-testid={`block-insert-${entry.type}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                    {entry.label}
                  </span>
                  <Plus className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                  {entry.description}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground/60 mb-1.5 font-medium uppercase tracking-wider">Quick Insert</p>
        <div className="flex flex-wrap gap-1">
          {QUICK_INSERT_BLOCKS.map((block) => (
            <button
              key={block.type}
              onClick={() => handleInsert(block.type)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-muted border border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-muted/80 transition-all"
              data-testid={`quick-insert-panel-${block.type}`}
            >
              <span>{block.icon}</span>
              <span>{block.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

type ViewportMode = "desktop" | "tablet" | "mobile";
const VIEWPORTS: Record<ViewportMode, { width: string; label: string; icon: typeof Monitor }> = {
  desktop: { width: "100%", label: "Desktop", icon: Monitor },
  tablet: { width: "768px", label: "Tablet", icon: Tablet },
  mobile: { width: "375px", label: "Mobile", icon: Smartphone },
};

function ViewportSwitcher({ mode, onChange }: { mode: ViewportMode; onChange: (mode: ViewportMode) => void }) {
  return (
    <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5" data-testid="viewport-switcher">
      {(Object.entries(VIEWPORTS) as [ViewportMode, typeof VIEWPORTS["desktop"]][]).map(([key, vp]) => {
        const Icon = vp.icon;
        return (
          <TooltipProvider key={key} delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={mode === key ? "default" : "ghost"}
                  className={`h-7 w-7 p-0 ${mode === key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => onChange(key)}
                  data-testid={`viewport-${key}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-muted border-border text-foreground text-xs">
                {vp.label} ({vp.width})
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}

export default function AdminCmsV2Builder() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [, params] = useRoute("/admin/cms-v2/pages/:id/builder");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const pageId = params?.id;
  const [puckKey, setPuckKey] = useState(0);
  const [seoOpen, setSeoOpen] = useState(false);
  const [viewportMode, setViewportMode] = useState<ViewportMode>("desktop");
  const [seoData, setSeoData] = useState<SeoData>({
    metaTitle: "",
    metaDescription: "",
    canonicalUrl: "",
    robots: "index, follow",
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    twitterCard: "summary_large_image",
    twitterTitle: "",
    twitterDescription: "",
    twitterImage: "",
    jsonLd: "",
  });

  const { data: page, isLoading } = useQuery<any>({
    queryKey: [`/api/admin/cms-v2/pages/${pageId}`],
    enabled: !!pageId && hasFullAccess,
  });

  useEffect(() => {
    if (page) {
      setSeoData({
        metaTitle: page.metaTitle || "",
        metaDescription: page.metaDescription || "",
        canonicalUrl: page.canonicalUrl || "",
        robots: page.robots || "index, follow",
        ogTitle: page.ogTitle || "",
        ogDescription: page.ogDescription || "",
        ogImage: page.ogImage || "",
        twitterCard: page.twitterCard || "summary_large_image",
        twitterTitle: page.twitterTitle || "",
        twitterDescription: page.twitterDescription || "",
        twitterImage: page.twitterImage || "",
        jsonLd: page.jsonLd ? (typeof page.jsonLd === "string" ? page.jsonLd : JSON.stringify(page.jsonLd, null, 2)) : "",
      });
    }
  }, [page]);

  const puckConfig = useMemo(() => buildPuckConfig(), []);

  const initialData = useMemo<Data | null>(() => {
    if (!page) return null;
    return contentJsonToPuckData(page.contentJson, page.title);
  }, [page, puckKey]);

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [`/api/admin/cms-v2/pages/${pageId}`] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/cms-v2/pages"] });
  }, [pageId, queryClient]);

  const handleInsertSection = useCallback(async (section: SavedSection) => {
    if (!pageId) return;
    const currentPage = queryClient.getQueryData<any>([`/api/admin/cms-v2/pages/${pageId}`]);
    const currentBlocks = currentPage?.contentJson?.blocks || [];

    const newBlock = {
      id: crypto.randomUUID(),
      type: "sectionRef",
      data: { sectionId: section.id, sectionName: section.name },
      settings: {},
    };

    const updatedContentJson = {
      version: 1,
      blocks: [...currentBlocks, newBlock],
    };

    try {
      const res = await fetch(`/api/admin/cms-v2/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentJson: updatedContentJson }),
      });
      if (!res.ok) throw new Error("Failed to insert section");
      invalidateQueries();
      setPuckKey((k) => k + 1);
    } catch {
    }
  }, [pageId, queryClient, invalidateQueries]);

  if (adminLoading || !hasFullAccess) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AdminNav currentPage="cms-v2" />
        <div className="p-8 text-center text-muted-foreground">
          {adminLoading ? "Loading..." : "Access Denied"}
        </div>
      </div>
    );
  }

  if (isLoading || !initialData) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AdminNav currentPage="cms-v2" />
        <div className="p-8 text-center text-muted-foreground">Loading page...</div>
      </div>
    );
  }

  const viewportWidth = VIEWPORTS[viewportMode].width;

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="admin-cms-v2-builder-page">
      <div className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-full mx-auto px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/admin/cms-v2/pages")}
              data-testid="link-back-pages"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <span className="text-sm font-semibold text-foreground truncate max-w-[200px]" data-testid="text-page-title">{page?.title}</span>
            <Badge variant="outline" className={
              page?.status === "published" ? "border-green-700 text-green-400 text-[10px]" : "border-yellow-700 text-yellow-400 text-[10px]"
            } data-testid="badge-page-status">
              {page?.status}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <ViewportSwitcher mode={viewportMode} onChange={setViewportMode} />
            <div className="w-px h-5 bg-muted" />
            <Button
              size="sm"
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10 h-7 text-xs"
              onClick={() => setSeoOpen(true)}
              data-testid="button-open-seo"
            >
              <Search className="w-3.5 h-3.5 mr-1" />
              SEO
            </Button>
            <InsertSectionButton onInsert={handleInsertSection} />
          </div>
        </div>
      </div>

      <SeoPanel open={seoOpen} onOpenChange={setSeoOpen} seo={seoData} onSeoChange={setSeoData} />

      <div className="puck-builder-container" data-testid="puck-editor-container" key={puckKey}>
        <Puck
          config={puckConfig}
          data={initialData}
          overrides={{
            headerActions: ({ children }) => (
              <>
                {children}
                <QuickInsertBar />
                <DetachSectionButton pageId={pageId!} pageTitle={page?.title || ""} onDone={invalidateQueries} />
                <SaveDraftButton pageId={pageId!} pageTitle={page?.title || ""} seoData={seoData} onDone={invalidateQueries} />
                <PublishButton pageId={pageId!} pageTitle={page?.title || ""} seoData={seoData} onDone={invalidateQueries} />
              </>
            ),
            components: () => <EnhancedBlockPicker />,
          }}
        />
      </div>

      <style>{`
        .puck-builder-container {
          height: calc(100vh - 45px);
        }
        .puck-builder-container > div {
          height: 100%;
        }

        /* Responsive preview viewport */
        .puck-builder-container [class*="PuckPreview-frame"],
        .puck-builder-container [class*="_PuckPreview-frame"] {
          max-width: ${viewportWidth} !important;
          margin: 0 auto;
          transition: max-width 0.3s ease;
        }
        .puck-builder-container iframe {
          max-width: ${viewportWidth};
          margin: 0 auto;
          transition: max-width 0.3s ease;
        }

        /* Enhanced block picker in Puck sidebar */
        .puck-builder-container [class*="ComponentList"] {
          padding: 0 !important;
        }
        .puck-builder-container [class*="Drawer--"] {
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

function getBlockDescription(type: string): string {
  const descriptions: Record<string, string> = {
    hero: "Full-width hero with headline, subheadline, and CTA",
    richText: "Text content with optional title and HTML body",
    image: "Single image with caption and link",
    imageGrid: "Grid of images with captions",
    featureList: "Features with icons, titles, descriptions",
    testimonials: "Customer testimonials in cards or slider",
    faq: "Accordion-style FAQ section",
    callToAction: "Conversion-focused CTA with buttons",
    productGrid: "Product display grid with filters",
    productHighlight: "Single product showcase with details",
    trustBar: "Trust signals row with icons",
    comparisonTable: "Feature comparison table",
    sectionRef: "Reference to a saved reusable section",
  };
  return descriptions[type] || type;
}
