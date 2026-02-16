import { useState, useEffect } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { useLocation, useSearch } from "wouter";
import CmsLayout from "@/components/admin/CmsLayout";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { MobileTabsList } from "@/components/ui/mobile-tabs-list";
import { FileText, Sparkles, Layers, Plus, BookTemplate, PanelRight, Wand2, Package2 } from "lucide-react";
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

function GeneratorsContent({ onNavigate }: { onNavigate: (path: string) => void }) {
  const generators = [
    {
      id: "landing",
      title: "Landing Page Generator",
      description: "Build complete landing pages with a step-by-step wizard. Choose a template, select products, add sections, and configure details to generate a ready-to-publish page.",
      icon: Wand2,
      href: "/admin/cms/generator/landing",
      features: ["Template selection", "Product integration", "Section customization", "Live preview"],
    },
    {
      id: "campaigns",
      title: "Campaign Pack Generator",
      description: "Generate complete campaign packs with coordinated pages, sections, and content. Perfect for product launches, seasonal promotions, and marketing campaigns.",
      icon: Package2,
      href: "/admin/cms/generator/campaigns",
      features: ["Multi-page generation", "Preset themes", "Section kits", "Bulk creation"],
    },
  ];

  return (
    <div className="max-w-6xl mx-auto" data-testid="generators-content">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          Automated wizards that generate complete landing pages and campaign packs from templates.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {generators.map((gen) => (
          <div
            key={gen.id}
            className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/10 cursor-pointer"
            onClick={() => onNavigate(gen.href)}
            data-testid={`card-generator-${gen.id}`}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <gen.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">{gen.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{gen.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pl-14">
                {gen.features.map((feature) => (
                  <Badge
                    key={feature}
                    variant="outline"
                    className="border-border/60 text-muted-foreground text-[10px] py-0 px-1.5"
                  >
                    {feature}
                  </Badge>
                ))}
              </div>
              <div className="pl-14">
                <Button
                  size="sm"
                  className="bg-primary/90 hover:bg-primary text-foreground text-xs h-8"
                  data-testid={`button-open-generator-${gen.id}`}
                >
                  <Wand2 className="w-3.5 h-3.5 mr-1" />
                  Open Generator
                </Button>
              </div>
            </div>
          </div>
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
  const validTabs = ["pages", "sections", "widgets", "generators"];
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
          <MobileTabsList
            tabs={[
              { value: "pages", label: "Page Templates", icon: <FileText className="w-3.5 h-3.5" />, "data-testid": "tab-page-templates" },
              { value: "sections", label: "Section Templates", icon: <Layers className="w-3.5 h-3.5" />, "data-testid": "tab-section-templates" },
              { value: "widgets", label: "Widget Templates", icon: <PanelRight className="w-3.5 h-3.5" />, "data-testid": "tab-widget-templates" },
              { value: "generators", label: "Landing Page Generators", icon: <Wand2 className="w-3.5 h-3.5" />, "data-testid": "tab-generators" },
            ]}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            className="mb-6"
          />
          <TabsContent value="pages" data-testid="panel-page-templates">
            <PageTemplatesContent onUseTemplate={handleUseTemplate} />
          </TabsContent>
          <TabsContent value="sections" data-testid="panel-section-templates">
            <SectionsContent embedded />
          </TabsContent>
          <TabsContent value="widgets" data-testid="panel-widget-templates">
            <SidebarsContent embedded />
          </TabsContent>
          <TabsContent value="generators" data-testid="panel-generators">
            <GeneratorsContent onNavigate={navigate} />
          </TabsContent>
        </Tabs>
      </div>
    </CmsLayout>
  );
}
