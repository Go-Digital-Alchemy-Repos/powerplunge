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
  PenLine,
  Menu,
  ImageIcon,
} from "lucide-react";
import AdminNav from "./AdminNav";
import { useAdmin } from "@/hooks/use-admin";

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
  { id: "posts", label: "Posts", icon: PenLine, href: "/admin/cms-v2/posts" },
  { id: "menus", label: "Menus", icon: Menu, href: "/admin/cms-v2/menus" },
  { id: "sections", label: "Sections", icon: Layers, href: "/admin/cms-v2/sections" },
  { id: "templates", label: "Templates", icon: BookTemplate, href: "/admin/cms-v2/templates" },
  { id: "media", label: "Media Library", icon: ImageIcon, href: "/admin/media" },
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
  const { role } = useAdmin();

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
    <div className="min-h-screen bg-background text-foreground flex flex-col" data-testid="cms-v2-layout">
      <AdminNav currentPage="cms-v2" role={role} />

      <div className="flex flex-1">
        <aside
          className={cn(
            "fixed top-[73px] left-0 h-[calc(100vh-73px)] bg-card border-r border-border flex flex-col z-30 transition-all duration-200",
            collapsed ? "w-16" : "w-56"
          )}
          data-testid="cms-v2-sidebar"
        >
          <div className={cn("flex items-center gap-2 border-b border-border h-12 px-3", collapsed && "justify-center")}>
            {!collapsed && (
              <Link href="/admin/cms-v2">
                <span className="text-sm font-semibold text-primary tracking-tight cursor-pointer" data-testid="link-cms-home">CMS</span>
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={cn("text-muted-foreground hover:text-foreground h-8 w-8 p-0", !collapsed && "ml-auto")}
              onClick={() => setCollapsed(!collapsed)}
              data-testid="button-toggle-sidebar"
            >
              {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </Button>
          </div>

          <nav className="flex-1 py-2 space-y-0.5 px-2 overflow-y-auto" data-testid="cms-v2-nav">
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
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                        data-testid={`nav-${item.id}`}
                      >
                        <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                        <span className="truncate">{item.label}</span>
                      </div>
                    </Link>
                    {isActive && item.children.map((child) => (
                      <Link key={child.id} href={child.href}>
                        <div
                          className={cn(
                            "flex items-center gap-2 pl-10 pr-3 py-1.5 rounded-md text-xs cursor-pointer transition-colors",
                            location.startsWith(child.href)
                              ? "text-primary"
                              : "text-muted-foreground hover:text-foreground"
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
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    data-testid={`nav-${item.id}`}
                  >
                    <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>
                </Link>
              );
            })}
          </nav>

          {!collapsed && (
            <div className="px-3 py-3 border-t border-border">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground text-xs gap-2" data-testid="link-back-admin">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Admin
                </Button>
              </Link>
            </div>
          )}
        </aside>

        <div className={cn("flex-1 flex flex-col transition-all duration-200", collapsed ? "ml-16" : "ml-56")}>
          <header className="sticky top-[73px] z-20 bg-background/90 backdrop-blur-sm border-b border-border h-12 flex items-center gap-4 px-6" data-testid="cms-v2-topbar">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-1 text-sm" data-testid="cms-v2-breadcrumbs">
                <Link href="/admin/cms-v2">
                  <span className="text-muted-foreground hover:text-foreground cursor-pointer" data-testid="breadcrumb-cms">CMS</span>
                </Link>
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                    {crumb.href ? (
                      <Link href={crumb.href}>
                        <span className="text-muted-foreground hover:text-foreground cursor-pointer">{crumb.label}</span>
                      </Link>
                    ) : (
                      <span className="text-foreground">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}

            <div className="flex-1" />

            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages, sections..."
                className="h-8 pl-8 bg-muted border-border text-sm placeholder:text-muted-foreground focus:border-ring"
                data-testid="input-global-search"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5 text-xs" data-testid="button-quick-create">
                  <Plus className="w-3.5 h-3.5" />
                  Create
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <Link href="/admin/cms-v2/pages">
                  <DropdownMenuItem className="cursor-pointer gap-2" data-testid="quick-create-page">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    New Page
                  </DropdownMenuItem>
                </Link>
                <Link href="/admin/cms-v2/sections">
                  <DropdownMenuItem className="cursor-pointer gap-2" data-testid="quick-create-section">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    New Section
                  </DropdownMenuItem>
                </Link>
                <Link href="/admin/cms-v2/templates">
                  <DropdownMenuItem className="cursor-pointer gap-2" data-testid="quick-create-template">
                    <BookTemplate className="w-4 h-4 text-muted-foreground" />
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
    </div>
  );
}
