import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { useRoute, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminNav from "@/components/admin/AdminNav";
import { ArrowLeft, Save, Globe, Search, X, Monitor, Tablet, Smartphone, Zap, Star, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Puck, usePuck, type Config, type Data } from "@puckeditor/core";
import "@puckeditor/core/dist/index.css";
import "@/styles/puck-dark-theme.css";
import { registerAllBlocks } from "@/lib/blockRegistryEntries";
import { getAllBlocks } from "@/lib/blockRegistry";
import { getAllBlocks as getCmsBlocks, BLOCK_CATEGORIES } from "@/cms/blocks";
import { ensureBlocksRegistered } from "@/cms/blocks/init";
import { getCategoriesOrdered } from "@/cms/blocks/blockCategories";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

registerAllBlocks();
ensureBlocksRegistered();

const QUICK_INSERT_BLOCKS = [
  { type: "hero", label: "Hero", icon: "\u{1F3D4}" },
  { type: "callToAction", label: "CTA", icon: "\u{1F4E2}" },
  { type: "productGrid", label: "Products", icon: "\u{1F6D2}" },
  { type: "faq", label: "FAQ", icon: "\u2753" },
  { type: "testimonials", label: "Reviews", icon: "\u2B50" },
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
      if (field.type === "text") return { type: "text", label: field.label || key };
      if (field.type === "textarea") return { type: "textarea", label: field.label || key };
      if (field.type === "number") return { type: "number", label: field.label || key, min: field.min, max: field.max };
      if (field.type === "select") return { type: "select", label: field.label || key, options: field.options || [] };
      if (field.type === "radio") return { type: "radio", label: field.label || key, options: field.options || [] };
      if (field.type === "array" && field.arrayFields) {
        const arrayFields: Record<string, any> = {};
        for (const [ak, av] of Object.entries(field.arrayFields)) {
          arrayFields[ak] = convertField(av, ak);
        }
        return { type: "array", label: field.label || key, arrayFields, defaultItemProps: field.defaultItemProps || {} };
      }
      if (field.type === "custom") return { type: "custom", label: field.label || key, render: field.render };
      return { type: "text", label: field.label || key };
    };

    if (entry.puckFields) {
      for (const [key, field] of Object.entries(entry.puckFields)) {
        puckFields[key] = convertField(field, key);
      }
    }

    components[entry.type] = {
      label: entry.label,
      fields: puckFields,
      defaultProps: entry.defaultProps || {},
      render: ({ puck, ...props }: any) => {
        const Comp = entry.renderComponent;
        return Comp ? <Comp data={props} /> : <div>Unknown block: {entry.type}</div>;
      },
    };

    const cat = entry.category || "utility";
    if (!categoryComponents[cat]) categoryComponents[cat] = [];
    categoryComponents[cat].push(entry.type);
  }

  const categories: Config["categories"] = {};
  const orderedCategories = getCategoriesOrdered();
  for (const catDef of orderedCategories) {
    if (categoryComponents[catDef.id]) {
      categories[catDef.id] = {
        title: catDef.label,
        components: categoryComponents[catDef.id],
      };
    }
  }
  if (categoryComponents["utility"]) {
    categories["utility"] = { title: "Utility", components: categoryComponents["utility"] };
  }

  return { components, categories };
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

function contentJsonToPuckData(contentJson: any, postTitle: string): Data {
  const blocks = contentJson?.blocks || [];
  const content = blocks.map((block: any) => ({
    type: block.type,
    props: {
      id: block.id || crypto.randomUUID(),
      ...block.data,
    },
  }));
  return {
    root: { props: { title: postTitle || "" } },
    content,
    zones: {},
  };
}

function SaveDraftButton({ postId, postTitle, onDone }: { postId: string; postTitle: string; onDone: () => void }) {
  const { appState } = usePuck();
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      const contentJson = puckDataToContentJson(appState.data);
      const res = await fetch(`/api/admin/cms/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contentJson }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "Draft saved", description: "Block content saved." });
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

function PublishButton({ postId, onDone }: { postId: string; onDone: () => void }) {
  const { appState } = usePuck();
  const [publishing, setPublishing] = useState(false);
  const { toast } = useToast();

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const contentJson = puckDataToContentJson(appState.data);
      await fetch(`/api/admin/cms/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contentJson }),
      });
      const pubRes = await fetch(`/api/admin/cms/posts/${postId}/publish`, {
        method: "POST",
        credentials: "include",
      });
      if (!pubRes.ok) throw new Error("Publish failed");
      toast({ title: "Published", description: "Post is now live." });
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
              <Zap className="w-3 h-3" />Quick:
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

export default function AdminCmsPostBuilder() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [, params] = useRoute("/admin/cms/posts/:id/builder");
  const postId = params?.id;
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [viewportWidth, setViewportWidth] = useState("100%");

  const { data: post, isLoading: postLoading } = useQuery<any>({
    queryKey: ["/api/admin/cms/posts", postId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/cms/posts/${postId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!postId,
  });

  const puckConfig = useMemo(() => buildPuckConfig(), []);

  const initialData = useMemo(() => {
    if (!post) return { root: { props: { title: "" } }, content: [], zones: {} } as Data;
    return contentJsonToPuckData(post.contentJson, post.title);
  }, [post]);

  const handleDone = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/posts"] });
  }, [queryClient]);

  if (adminLoading || postLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!hasFullAccess || !post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        {!hasFullAccess ? "Access Denied" : "Post not found"}
      </div>
    );
  }

  return (
    <div className="puck-builder-container h-screen flex flex-col bg-background" data-testid="post-builder">
      <Puck config={puckConfig} data={initialData}>
        <div className="flex items-center justify-between h-12 px-4 bg-card border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground gap-1"
              onClick={() => navigate(`/admin/cms/posts/${postId}/edit`)}
              data-testid="button-back-to-editor"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="h-5 w-px bg-muted" />
            <span className="text-sm font-medium text-foreground truncate max-w-[200px]" data-testid="text-post-title">
              {post.title}
            </span>
            <Badge
              variant="outline"
              className={
                post.status === "published"
                  ? "bg-green-900/40 text-green-400 border-green-800 text-xs"
                  : "bg-muted text-muted-foreground border-border text-xs"
              }
              data-testid="badge-post-status"
            >
              {post.status}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <QuickInsertBar />
            <div className="h-5 w-px bg-muted mx-1" />

            <div className="flex items-center gap-1 mr-2">
              <Button size="sm" variant="ghost" className={`h-7 w-7 p-0 ${viewportWidth === "100%" ? "text-primary" : "text-muted-foreground"}`} onClick={() => setViewportWidth("100%")} data-testid="button-viewport-desktop">
                <Monitor className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" className={`h-7 w-7 p-0 ${viewportWidth === "768px" ? "text-primary" : "text-muted-foreground"}`} onClick={() => setViewportWidth("768px")} data-testid="button-viewport-tablet">
                <Tablet className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" className={`h-7 w-7 p-0 ${viewportWidth === "375px" ? "text-primary" : "text-muted-foreground"}`} onClick={() => setViewportWidth("375px")} data-testid="button-viewport-mobile">
                <Smartphone className="w-4 h-4" />
              </Button>
            </div>

            <SaveDraftButton postId={postId!} postTitle={post.title} onDone={handleDone} />
            <PublishButton postId={postId!} onDone={handleDone} />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <Puck.Preview />
        </div>
      </Puck>

      <style>{`
        .puck-builder-container [class*="Puck-"] {
          --puck-color-grey-01: #111827;
          --puck-color-grey-02: #1f2937;
          --puck-color-grey-03: #374151;
          --puck-color-grey-04: #6b7280;
          --puck-color-grey-05: #9ca3af;
          --puck-color-grey-06: #d1d5db;
        }
        .puck-builder-container .Puck {
          height: 100%;
        }
        .puck-builder-container [class*="PuckLayout-"] {
          height: calc(100vh - 48px) !important;
        }
        .puck-builder-container [class*="PuckFields-"] {
          background: #111827;
        }
        .puck-builder-container [class*="PuckPreview-"] {
          background: #0f172a;
          max-width: ${viewportWidth};
          margin: 0 auto;
          transition: max-width 0.3s ease;
        }
        .puck-builder-container iframe {
          max-width: ${viewportWidth};
          margin: 0 auto;
          transition: max-width 0.3s ease;
        }
      `}</style>
    </div>
  );
}
