import { useMemo, useState, useCallback, useRef } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { useRoute, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminNav from "@/components/admin/AdminNav";
import { ArrowLeft, Save, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Puck, usePuck, type Config, type Data } from "@puckeditor/core";
import "@puckeditor/core/dist/index.css";
import { registerAllBlocks } from "@/lib/blockRegistryEntries";
import { getAllBlocks } from "@/lib/blockRegistry";

registerAllBlocks();

function buildPuckConfig(): Config {
  const entries = getAllBlocks();
  const components: Config["components"] = {};

  for (const entry of entries) {
    const puckFields: Record<string, any> = {};
    for (const [key, field] of Object.entries(entry.puckFields)) {
      if (field.type === "text") {
        puckFields[key] = { type: "text", label: field.label || key };
      } else if (field.type === "textarea") {
        puckFields[key] = { type: "textarea", label: field.label || key };
      } else if (field.type === "number") {
        puckFields[key] = { type: "number", label: field.label || key, min: field.min, max: field.max };
      } else if (field.type === "select") {
        puckFields[key] = { type: "select", label: field.label || key, options: field.options || [] };
      } else if (field.type === "radio") {
        puckFields[key] = { type: "radio", label: field.label || key, options: field.options || [] };
      }
    }

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

  return {
    components,
    root: {
      defaultProps: { title: "" },
      fields: {
        title: { type: "text", label: "Page Title" },
      },
      render: ({ children }: any) => (
        <div className="page-renderer bg-gray-950 text-white min-h-screen">{children}</div>
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

function SaveDraftButton({ pageId, pageTitle, onDone }: { pageId: string; pageTitle: string; onDone: () => void }) {
  const { appState } = usePuck();
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      const contentJson = puckDataToContentJson(appState.data);
      const title = (appState.data.root as any)?.props?.title || pageTitle;
      const res = await fetch(`/api/admin/cms-v2/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentJson, title }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "Draft saved", description: "Your changes have been saved." });
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
      className="border-cyan-700 text-cyan-400 hover:bg-cyan-900/30"
      disabled={saving}
      data-testid="button-save-draft"
      onClick={handleSave}
    >
      <Save className="w-4 h-4 mr-1" />
      {saving ? "Saving..." : "Save Draft"}
    </Button>
  );
}

function PublishButton({ pageId, pageTitle, onDone }: { pageId: string; pageTitle: string; onDone: () => void }) {
  const { appState } = usePuck();
  const [publishing, setPublishing] = useState(false);
  const { toast } = useToast();

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const contentJson = puckDataToContentJson(appState.data);
      const title = (appState.data.root as any)?.props?.title || pageTitle;
      await fetch(`/api/admin/cms-v2/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentJson, title }),
      });
      const pubRes = await fetch(`/api/admin/cms-v2/pages/${pageId}/publish`, { method: "POST" });
      if (!pubRes.ok) throw new Error("Publish failed");
      toast({ title: "Published", description: "Page is now live." });
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
      className="bg-green-600 hover:bg-green-700 text-white"
      disabled={publishing}
      data-testid="button-publish"
      onClick={handlePublish}
    >
      <Globe className="w-4 h-4 mr-1" />
      {publishing ? "Publishing..." : "Publish"}
    </Button>
  );
}

export default function AdminCmsV2Builder() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [, params] = useRoute("/admin/cms-v2/pages/:id/builder");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const pageId = params?.id;

  const { data: page, isLoading } = useQuery<any>({
    queryKey: [`/api/admin/cms-v2/pages/${pageId}`],
    enabled: !!pageId && hasFullAccess,
  });

  const puckConfig = useMemo(() => buildPuckConfig(), []);

  const initialData = useMemo<Data | null>(() => {
    if (!page) return null;
    return contentJsonToPuckData(page.contentJson, page.title);
  }, [page]);

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [`/api/admin/cms-v2/pages/${pageId}`] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/cms-v2/pages"] });
  }, [pageId, queryClient]);

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

  if (isLoading || !initialData) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <AdminNav currentPage="cms-v2" />
        <div className="p-8 text-center text-gray-400">Loading page...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white" data-testid="admin-cms-v2-builder-page">
      <div className="border-b border-gray-800 bg-gray-950/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
              onClick={() => navigate("/admin/cms-v2/pages")}
              data-testid="link-back-pages"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <span className="text-lg font-semibold text-white" data-testid="text-page-title">{page?.title}</span>
            <Badge variant="outline" className={
              page?.status === "published" ? "border-green-700 text-green-400" : "border-yellow-700 text-yellow-400"
            } data-testid="badge-page-status">
              {page?.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="puck-builder-container" data-testid="puck-editor-container">
        <Puck
          config={puckConfig}
          data={initialData}
          overrides={{
            headerActions: ({ children }) => (
              <>
                {children}
                <SaveDraftButton pageId={pageId!} pageTitle={page?.title || ""} onDone={invalidateQueries} />
                <PublishButton pageId={pageId!} pageTitle={page?.title || ""} onDone={invalidateQueries} />
              </>
            ),
          }}
        />
      </div>

      <style>{`
        .puck-builder-container {
          height: calc(100vh - 57px);
        }
        .puck-builder-container > div {
          height: 100%;
        }
      `}</style>
    </div>
  );
}
