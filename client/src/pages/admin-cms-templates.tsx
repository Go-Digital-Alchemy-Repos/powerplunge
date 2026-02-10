import { useState, useEffect } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { useLocation, useSearch } from "wouter";
import CmsLayout from "@/components/admin/CmsLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Sparkles, Layers, Plus, BookTemplate, PanelRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CMS_TEMPLATES, type CmsTemplate } from "@/cms/templates/templateLibrary";
import { SectionsContent } from "./admin-cms-sections";
import { SidebarsContent } from "./admin-cms-sidebars";

const BLOCK_ICONS: Record<string, { label: string; color: string }> = {
  hero: { label: "Hero", color: "#67e8f9" },
  richText: { label: "Text", color: "#a78bfa" },
  featureList: { label: "Features", color: "#34d399" },
  productHighlight: { label: "Product", color: "#fbbf24" },
  productGrid: { label: "Grid", color: "#fb923c" },
  testimonials: { label: "Reviews", color: "#f472b6" },
  trustBar: { label: "Trust", color: "#60a5fa" },
  callToAction: { label: "CTA", color: "#f87171" },
  faq: { label: "FAQ", color: "#a3a3a3" },
  comparisonTable: { label: "Compare", color: "#2dd4bf" },
  imageGrid: { label: "Images", color: "#c084fc" },
  spacer: { label: "Space", color: "#525252" },
};

function getBlockMeta(type: string) {
  return BLOCK_ICONS[type] ?? { label: type, color: "#6b7280" };
}

function TemplateThumbnail({ template }: { template: CmsTemplate }) {
  if (template.blocks.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
          <FileText className="w-8 h-8" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Blank</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-[2px] p-2.5 bg-card">
      {template.blocks.map((block, i) => {
        const meta = getBlockMeta(block.type);
        const isHero = block.type === "hero";
        return (
          <div
            key={i}
            className="rounded-sm flex items-center gap-1.5 px-2 shrink-0"
            style={{
              backgroundColor: `${meta.color}12`,
              borderLeft: `2px solid ${meta.color}`,
              height: isHero ? "28px" : "18px",
              minHeight: isHero ? "28px" : "18px",
            }}
          >
            <span className="text-[8px] font-medium truncate" style={{ color: meta.color }}>
              {meta.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TemplateCard({ template, onUse }: { template: CmsTemplate; onUse: () => void }) {
  const isBlank = template.id === "blank";
  return (
    <div
      className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/10"
      data-testid={`card-template-${template.id}`}
    >
      <div className="h-40 border-b border-border/40 overflow-hidden relative">
        <TemplateThumbnail template={template} />
        <div className="absolute inset-0 bg-gradient-to-t from-card/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {isBlank ? (
                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              )}
              <h3 className="font-semibold text-foreground text-sm truncate">{template.name}</h3>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground/60">
              <Layers className="w-3 h-3 shrink-0" />
              <span className="text-[10px]">
                {template.blocks.length === 0 ? "Empty canvas" : `${template.blocks.length} blocks`}
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{template.description}</p>

        {template.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {template.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="border-border/60 text-muted-foreground text-[10px] py-0 px-1.5"
                data-testid={`tag-${template.id}-${tag}`}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <Button
          onClick={onUse}
          size="sm"
          className="w-full bg-primary/90 hover:bg-primary text-foreground text-xs h-8"
          data-testid={`button-use-template-${template.id}`}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Create Page
        </Button>
      </div>
    </div>
  );
}

function PageTemplatesContent({ onUseTemplate }: { onUseTemplate: (id: string) => void }) {
  return (
    <div className="max-w-6xl mx-auto" data-testid="admin-cms-templates-page">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          Pre-built page layouts to get started quickly. Pick a template and start editing.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {CMS_TEMPLATES.map((tmpl) => (
          <TemplateCard
            key={tmpl.id}
            template={tmpl}
            onUse={() => onUseTemplate(tmpl.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default function AdminCmsTemplates() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const tabParam = params.get("tab");
  const validTabs = ["pages", "sections", "widgets"];
  const initialTab = tabParam && validTabs.includes(tabParam) ? tabParam : "pages";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const newParams = new URLSearchParams(searchString);
    const newTab = newParams.get("tab");
    if (newTab && validTabs.includes(newTab)) {
      setActiveTab(newTab);
    } else {
      setActiveTab("pages");
    }
  }, [searchString]);

  if (adminLoading || !hasFullAccess) {
    return (
      <CmsLayout activeNav="templates" breadcrumbs={[{ label: "Templates" }]}>
        <div className="p-8 text-center text-muted-foreground">{adminLoading ? "Loading..." : "Access Denied"}</div>
      </CmsLayout>
    );
  }

  function handleUseTemplate(templateId: string) {
    navigate(`/admin/cms/pages?template=${templateId}`);
  }

  function handleTabChange(value: string) {
    setActiveTab(value);
    const newUrl = value === "pages"
      ? "/admin/cms/templates"
      : `/admin/cms/templates?tab=${value}`;
    window.history.replaceState(null, "", newUrl);
  }

  return (
    <CmsLayout activeNav="templates" breadcrumbs={[{ label: "Templates" }]}>
      <div className="max-w-6xl mx-auto" data-testid="admin-cms-templates-consolidated">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BookTemplate className="w-5 h-5" />
            Templates
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Page templates, section templates, and widget templates for the CMS.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-6" data-testid="templates-tab-list">
            <TabsTrigger value="pages" className="flex items-center gap-2" data-testid="tab-page-templates">
              <FileText className="w-3.5 h-3.5" />
              Page Templates
            </TabsTrigger>
            <TabsTrigger value="sections" className="flex items-center gap-2" data-testid="tab-section-templates">
              <Layers className="w-3.5 h-3.5" />
              Section Templates
            </TabsTrigger>
            <TabsTrigger value="widgets" className="flex items-center gap-2" data-testid="tab-widget-templates">
              <PanelRight className="w-3.5 h-3.5" />
              Widget Templates
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pages" data-testid="panel-page-templates">
            <PageTemplatesContent onUseTemplate={handleUseTemplate} />
          </TabsContent>
          <TabsContent value="sections" data-testid="panel-section-templates">
            <SectionsContent embedded />
          </TabsContent>
          <TabsContent value="widgets" data-testid="panel-widget-templates">
            <SidebarsContent embedded />
          </TabsContent>
        </Tabs>
      </div>
    </CmsLayout>
  );
}
