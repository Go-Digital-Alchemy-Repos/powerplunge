import { useAdmin } from "@/hooks/use-admin";
import { useLocation } from "wouter";
import CmsV2Layout from "@/components/admin/CmsV2Layout";
import { FileText, Sparkles, Layers, Tag, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CMS_TEMPLATES } from "@/cms/templates/templateLibrary";

export default function AdminCmsV2Templates() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [, navigate] = useLocation();

  if (adminLoading || !hasFullAccess) {
    return (
      <CmsV2Layout activeNav="templates" breadcrumbs={[{ label: "Templates" }]}>
        <div className="p-8 text-center text-gray-400">{adminLoading ? "Loading..." : "Access Denied"}</div>
      </CmsV2Layout>
    );
  }

  return (
    <CmsV2Layout activeNav="templates" breadcrumbs={[{ label: "Templates" }]}>
      <div className="max-w-5xl mx-auto" data-testid="admin-cms-v2-templates-page">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Templates</h1>
            <p className="text-sm text-gray-500 mt-1">
              Pre-built page layouts to get started quickly. Select a template when creating a new page.
            </p>
          </div>
          <Button
            onClick={() => navigate("/admin/cms-v2/pages")}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
            data-testid="button-go-to-pages"
          >
            Create Page
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CMS_TEMPLATES.map((tmpl) => (
            <Card
              key={tmpl.id}
              className="bg-gray-900/60 border-gray-800/60 hover:border-cyan-800/50 transition-colors group"
              data-testid={`card-template-${tmpl.id}`}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 rounded-lg bg-gray-800/60">
                    {tmpl.id === "blank" ? (
                      <FileText className="w-5 h-5 text-gray-500" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-cyan-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-white text-sm">{tmpl.name}</h3>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Layers className="w-3 h-3" />
                      <span className="text-[10px]">{tmpl.blocks.length} blocks</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-3 leading-relaxed">{tmpl.description}</p>

                {tmpl.blocks.length > 0 && (
                  <div className="mb-3 p-2 rounded bg-gray-800/40 border border-gray-800/60">
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider font-medium mb-1.5">Block order</p>
                    <div className="flex flex-wrap gap-1">
                      {tmpl.blocks.map((block, i) => (
                        <span key={i} className="text-[10px] text-gray-400 bg-gray-800 rounded px-1.5 py-0.5">
                          {block.type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {tmpl.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <Tag className="w-3 h-3 text-gray-600" />
                    {tmpl.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="border-gray-700/60 text-gray-500 text-[10px] py-0"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </CmsV2Layout>
  );
}
