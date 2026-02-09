import { useAdmin } from "@/hooks/use-admin";
import { Link } from "wouter";
import CmsV2Layout from "@/components/admin/CmsV2Layout";
import { FileText, Layers, BookTemplate, Palette, Search, Globe, Plus, ArrowRight, Clock, Settings, Wand2, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

const dashboardCards = [
  {
    title: "Pages",
    description: "Create and manage content pages",
    icon: FileText,
    href: "/admin/cms-v2/pages",
    action: "Manage Pages",
    testId: "card-cms-v2-pages",
  },
  {
    title: "Sections",
    description: "Reusable content blocks",
    icon: Layers,
    href: "/admin/cms-v2/sections",
    action: "Manage Sections",
    testId: "card-cms-v2-sections",
  },
  {
    title: "Templates",
    description: "Page layout templates",
    icon: BookTemplate,
    href: "/admin/cms-v2/templates",
    action: "Browse Templates",
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
  {
    title: "Landing Page Generator",
    description: "Build landing pages in 4 steps with live preview",
    icon: Wand2,
    href: "/admin/cms-v2/generator/landing",
    action: "Generate Landing Page",
    testId: "card-cms-v2-generator-landing",
  },
  {
    title: "Site Presets",
    description: "Pre-configured site personalities",
    icon: Package,
    href: "/admin/cms-v2/presets",
    action: "Manage Presets",
    testId: "card-cms-v2-presets",
  },
  {
    title: "SEO Toolkit",
    description: "Audit and optimize your pages",
    icon: Search,
    href: "/admin/cms-v2/seo",
    action: "Run SEO Audit",
    testId: "card-cms-v2-seo",
    badge: "Preview",
  },
  {
    title: "Settings",
    description: "CMS configuration and flags",
    icon: Settings,
    href: "/admin/cms-v2/settings",
    action: "Open Settings",
    testId: "card-cms-v2-settings",
  },
];

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminCmsV2() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();

  const { data: pagesData } = useQuery<any[]>({
    queryKey: ["/api/admin/cms-v2/pages"],
    enabled: hasFullAccess,
  });

  const { data: sectionsData } = useQuery<any[]>({
    queryKey: ["/api/admin/cms-v2/sections"],
    enabled: hasFullAccess,
  });

  if (adminLoading || !hasFullAccess) {
    return (
      <CmsV2Layout activeNav="dashboard">
        <div className="p-8 text-center text-gray-400">
          {adminLoading ? "Loading..." : "Access Denied"}
        </div>
      </CmsV2Layout>
    );
  }

  const pageCount = pagesData?.length ?? 0;
  const publishedCount = pagesData?.filter((p: any) => p.status === "published").length ?? 0;
  const draftCount = pageCount - publishedCount;
  const sectionCount = sectionsData?.length ?? 0;

  const recentItems = [
    ...(pagesData || []).map((p: any) => ({ type: "page" as const, id: p.id, title: p.title, updatedAt: p.updatedAt, slug: p.slug, status: p.status })),
    ...(sectionsData || []).map((s: any) => ({ type: "section" as const, id: s.id, title: s.name, updatedAt: s.updatedAt, slug: null, status: null })),
  ]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  return (
    <CmsV2Layout activeNav="dashboard" data-testid="admin-cms-v2-page">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white" data-testid="text-dashboard-title">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">Content management overview</p>
          </div>
          <Badge variant="outline" className="border-cyan-700 text-cyan-400 text-xs" data-testid="badge-cms">Content Management</Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8" data-testid="cms-v2-stats">
          <Card className="bg-gray-900/60 border-gray-800/60">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white" data-testid="text-total-pages">{pageCount}</p>
              <p className="text-xs text-gray-500">Pages</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/60 border-gray-800/60">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-400" data-testid="text-published-pages">{publishedCount}</p>
              <p className="text-xs text-gray-500">Published</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/60 border-gray-800/60">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400" data-testid="text-draft-pages">{draftCount}</p>
              <p className="text-xs text-gray-500">Drafts</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/60 border-gray-800/60">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-cyan-400" data-testid="text-total-sections">{sectionCount}</p>
              <p className="text-xs text-gray-500">Sections</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-10" data-testid="cms-v2-dashboard-cards">
          {dashboardCards.map((card) => (
            <Link key={card.title} href={card.href}>
              <Card className="bg-gray-900/60 border-gray-800/60 hover:border-gray-700 transition-colors cursor-pointer group h-full" data-testid={card.testId}>
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-gray-800/60 group-hover:bg-cyan-900/20 transition-colors">
                      <card.icon className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white text-sm">{card.title}</h3>
                        {card.badge && (
                          <Badge variant="outline" className="border-gray-700 text-gray-500 text-[10px]">{card.badge}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{card.description}</p>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center gap-1.5 text-cyan-400 text-xs group-hover:text-cyan-300 transition-colors">
                    {card.action}
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {recentItems.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Recently Updated
            </h2>
            <div className="space-y-1" data-testid="cms-v2-recent-items">
              {recentItems.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.type === "page" ? `/admin/cms-v2/pages/${item.id}/builder` : "/admin/cms-v2/sections"}
                >
                  <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-900/60 transition-colors cursor-pointer group" data-testid={`recent-item-${item.id}`}>
                    {item.type === "page" ? (
                      <FileText className="w-3.5 h-3.5 text-gray-600" />
                    ) : (
                      <Layers className="w-3.5 h-3.5 text-gray-600" />
                    )}
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors flex-1 truncate">{item.title}</span>
                    {item.status && (
                      <Badge variant="outline" className={cn(
                        "text-[10px] border-none px-1.5",
                        item.status === "published" ? "text-green-500" : "text-yellow-500"
                      )}>
                        {item.status === "published" ? <Globe className="w-2.5 h-2.5" /> : null}
                      </Badge>
                    )}
                    <span className="text-[11px] text-gray-600">{formatRelativeTime(item.updatedAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </CmsV2Layout>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
