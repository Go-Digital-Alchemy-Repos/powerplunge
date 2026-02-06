import { useAdmin } from "@/hooks/use-admin";
import { Link } from "wouter";
import AdminNav from "@/components/admin/AdminNav";
import { LayoutGrid, FileText, Layers, BookTemplate, Palette, Search, Plus, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

const dashboardCards = [
  {
    title: "Pages",
    description: "Create and manage content pages",
    icon: FileText,
    href: "/admin/cms-v2/pages",
    action: "Create Page",
    testId: "card-cms-v2-pages",
  },
  {
    title: "Sections",
    description: "Reusable content blocks",
    icon: Layers,
    href: "/admin/cms-v2/sections",
    action: "Create Section",
    testId: "card-cms-v2-sections",
  },
  {
    title: "Templates",
    description: "Page layout templates",
    icon: BookTemplate,
    href: "/admin/cms-v2/templates",
    action: "Create Template",
    testId: "card-cms-v2-templates",
  },
  {
    title: "Themes",
    description: "Colors, fonts, and spacing",
    icon: Palette,
    href: "/admin/cms-v2/themes",
    action: "Manage Themes",
    testId: "card-cms-v2-themes",
  },
];

export default function AdminCmsV2() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();

  const { data: pagesData } = useQuery<any[]>({
    queryKey: ["/api/admin/cms-v2/pages"],
    enabled: hasFullAccess,
  });

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

  const pageCount = pagesData?.length ?? 0;
  const publishedCount = pagesData?.filter((p: any) => p.status === "published").length ?? 0;
  const draftCount = pageCount - publishedCount;

  return (
    <div className="min-h-screen bg-gray-950 text-white" data-testid="admin-cms-v2-page">
      <AdminNav currentPage="cms-v2" />

      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <LayoutGrid className="w-8 h-8 text-cyan-400" />
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                CMS v2
                <Badge variant="outline" className="border-cyan-700 text-cyan-400 text-xs" data-testid="badge-preview">Preview</Badge>
              </h1>
              <p className="text-gray-400 text-sm mt-0.5">Next-generation content management system</p>
            </div>
          </div>
          <Link href="/admin/cms-v2/seo">
            <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:text-white hover:border-gray-500" data-testid="link-cms-v2-seo">
              <Search className="w-4 h-4 mr-2" />
              SEO Overview
            </Button>
          </Link>
        </div>

        {pageCount > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8" data-testid="cms-v2-stats">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-white" data-testid="text-total-pages">{pageCount}</p>
                <p className="text-xs text-gray-400">Total Pages</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-400" data-testid="text-published-pages">{publishedCount}</p>
                <p className="text-xs text-gray-400">Published</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-yellow-400" data-testid="text-draft-pages">{draftCount}</p>
                <p className="text-xs text-gray-400">Drafts</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="cms-v2-dashboard-cards">
          {dashboardCards.map((card) => (
            <Link key={card.title} href={card.href}>
              <Card className="bg-gray-900 border-gray-800 hover:border-cyan-800 transition-colors cursor-pointer group" data-testid={card.testId}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-gray-800 group-hover:bg-cyan-900/30 transition-colors">
                        <card.icon className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white mb-1">{card.title}</h3>
                        <p className="text-sm text-gray-400">{card.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 transition-colors mt-1" />
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-cyan-400 text-sm">
                    <Plus className="w-3.5 h-3.5" />
                    {card.action}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
