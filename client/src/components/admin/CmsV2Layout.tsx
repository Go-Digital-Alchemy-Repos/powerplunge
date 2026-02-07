import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutGrid,
  FileText,
  Layers,
  BookTemplate,
  Palette,
  Search,
  Settings,
  ChevronRight,
  Plus,
  PanelLeftClose,
  PanelLeft,
  ArrowLeft,
  Wand2,
  Globe,
} from "lucide-react";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface CmsV2LayoutProps {
  children: ReactNode;
  breadcrumbs?: Breadcrumb[];
  activeNav?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  href: string;
  children?: { id: string; label: string; href: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid, href: "/admin/cms-v2" },
  { id: "pages", label: "Pages", icon: FileText, href: "/admin/cms-v2/pages" },
  { id: "sections", label: "Sections", icon: Layers, href: "/admin/cms-v2/sections" },
  { id: "templates", label: "Templates", icon: BookTemplate, href: "/admin/cms-v2/templates" },
  {
    id: "generators",
    label: "Generators",
    icon: Wand2,
    href: "/admin/cms-v2/generator/landing",
    children: [
      { id: "generator-landing", label: "Landing Pages", href: "/admin/cms-v2/generator/landing" },
      { id: "generator-campaigns", label: "Campaign Packs", href: "/admin/cms-v2/generator/campaigns" },
    ],
  },
  { id: "themes", label: "Themes", icon: Palette, href: "/admin/cms-v2/themes" },
  { id: "presets", label: "Site Presets", icon: Globe, href: "/admin/cms-v2/presets" },
  { id: "seo", label: "SEO", icon: Search, href: "/admin/cms-v2/seo" },
  { id: "settings", label: "Settings", icon: Settings, href: "/admin/cms-v2/settings" },
];

export default function CmsV2Layout({ children, breadcrumbs, activeNav }: CmsV2LayoutProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const resolvedActiveNav = activeNav || (() => {
    for (const item of NAV_ITEMS) {
      if (item.children) {
        for (const child of item.children) {
          if (location.startsWith(child.href)) return item.id;
        }
      }
      if (item.id !== "dashboard" && location.startsWith(item.href)) return item.id;
    }
    return location === "/admin/cms-v2" ? "dashboard" : undefined;
  })();

  return (
    <div className="min-h-screen bg-gray-950 text-white flex" data-testid="cms-v2-layout">
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-gray-900/80 border-r border-gray-800/60 flex flex-col z-30 transition-all duration-200",
          collapsed ? "w-16" : "w-56"
        )}
        data-testid="cms-v2-sidebar"
      >
        <div className={cn("flex items-center gap-2 border-b border-gray-800/60 h-14 px-3", collapsed && "justify-center")}>
          {!collapsed && (
            <Link href="/admin/cms-v2">
              <span className="text-sm font-semibold text-cyan-400 tracking-tight cursor-pointer" data-testid="link-cms-v2-home">CMS v2</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={cn("text-gray-500 hover:text-white h-8 w-8 p-0", !collapsed && "ml-auto")}
            onClick={() => setCollapsed(!collapsed)}
            data-testid="button-toggle-sidebar"
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </Button>
        </div>

        <nav className="flex-1 py-2 space-y-0.5 px-2" data-testid="cms-v2-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = resolvedActiveNav === item.id;

            if (item.children && !collapsed) {
              return (
                <div key={item.id}>
                  <Link href={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors",
                        isActive
                          ? "bg-cyan-900/30 text-cyan-400"
                          : "text-gray-400 hover:text-white hover:bg-gray-800/60"
                      )}
                      data-testid={`nav-${item.id}`}
                    >
                      <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-cyan-400" : "text-gray-500")} />
                      <span className="truncate">{item.label}</span>
                    </div>
                  </Link>
                  {isActive && item.children.map((child) => (
                    <Link key={child.id} href={child.href}>
                      <div
                        className={cn(
                          "flex items-center gap-2 pl-10 pr-3 py-1.5 rounded-md text-xs cursor-pointer transition-colors",
                          location.startsWith(child.href)
                            ? "text-cyan-300"
                            : "text-gray-500 hover:text-white"
                        )}
                        data-testid={`nav-${child.id}`}
                      >
                        <span className="truncate">{child.label}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              );
            }

            return (
              <Link key={item.id} href={item.children ? item.href : item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors",
                    isActive
                      ? "bg-cyan-900/30 text-cyan-400"
                      : "text-gray-400 hover:text-white hover:bg-gray-800/60"
                  )}
                  data-testid={`nav-${item.id}`}
                >
                  <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-cyan-400" : "text-gray-500")} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="px-3 py-3 border-t border-gray-800/60">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="sm" className="w-full justify-start text-gray-500 hover:text-white text-xs gap-2" data-testid="link-back-admin">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Admin
              </Button>
            </Link>
          </div>
        )}
      </aside>

      <div className={cn("flex-1 flex flex-col transition-all duration-200", collapsed ? "ml-16" : "ml-56")}>
        <header className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800/60 h-14 flex items-center gap-4 px-6" data-testid="cms-v2-topbar">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1 text-sm" data-testid="cms-v2-breadcrumbs">
              <Link href="/admin/cms-v2">
                <span className="text-gray-500 hover:text-gray-300 cursor-pointer">CMS</span>
              </Link>
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-gray-600" />
                  {crumb.href ? (
                    <Link href={crumb.href}>
                      <span className="text-gray-400 hover:text-white cursor-pointer">{crumb.label}</span>
                    </Link>
                  ) : (
                    <span className="text-gray-300">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}

          <div className="flex-1" />

          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pages, sections..."
              className="h-8 pl-8 bg-gray-900/60 border-gray-800 text-sm text-white placeholder:text-gray-600 focus:border-cyan-800"
              data-testid="input-global-search"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white h-8 gap-1.5 text-xs" data-testid="button-quick-create">
                <Plus className="w-3.5 h-3.5" />
                Create
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700 text-white">
              <Link href="/admin/cms-v2/pages">
                <DropdownMenuItem className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800 gap-2" data-testid="quick-create-page">
                  <FileText className="w-4 h-4 text-gray-400" />
                  New Page
                </DropdownMenuItem>
              </Link>
              <Link href="/admin/cms-v2/sections">
                <DropdownMenuItem className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800 gap-2" data-testid="quick-create-section">
                  <Layers className="w-4 h-4 text-gray-400" />
                  New Section
                </DropdownMenuItem>
              </Link>
              <Link href="/admin/cms-v2/templates">
                <DropdownMenuItem className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800 gap-2" data-testid="quick-create-template">
                  <BookTemplate className="w-4 h-4 text-gray-400" />
                  New Template
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-6" data-testid="cms-v2-main">
          {children}
        </main>
      </div>
    </div>
  );
}
