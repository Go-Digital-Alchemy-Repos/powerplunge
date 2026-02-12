import { useState, useEffect, type ReactNode } from "react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  LayoutGrid,
  FileText,
  Layers,
  BookTemplate,
  Search,
  Settings,
  ChevronRight,
  Plus,
  PanelLeftClose,
  PanelLeft,
  ArrowLeft,
  Globe,
  PenLine,
  Menu,
  ImageIcon,
  PanelRight,
} from "lucide-react";
import AdminNav from "./AdminNav";
import { useAdmin } from "@/hooks/use-admin";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface CmsLayoutProps {
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
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid, href: "/admin/cms" },
  { id: "pages", label: "Pages", icon: FileText, href: "/admin/cms/pages" },
  { id: "posts", label: "Posts", icon: PenLine, href: "/admin/cms/posts" },
  { id: "menus", label: "Menus", icon: Menu, href: "/admin/cms/menus" },
  { id: "templates", label: "Templates", icon: BookTemplate, href: "/admin/cms/templates" },
  { id: "media", label: "Media Library", icon: ImageIcon, href: "/admin/media" },
  { id: "sidebars", label: "Sidebars & Widgets", icon: PanelRight, href: "/admin/cms/sidebars" },
  { id: "presets", label: "Site Presets", icon: Globe, href: "/admin/cms/presets" },
  { id: "seo", label: "SEO", icon: Search, href: "/admin/cms/seo" },
  { id: "settings", label: "Settings", icon: Settings, href: "/admin/cms/settings" },
];

function SidebarNav({ activeNav, location, onNavigate }: { activeNav?: string; location: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 py-2 space-y-0.5 px-2 overflow-y-auto" data-testid="cms-nav">
      {NAV_ITEMS.map((item) => {
        const isActive = activeNav === item.id;

        if (item.children) {
          return (
            <div key={item.id}>
              <Link href={item.href}>
                <div
                  onClick={onNavigate}
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
                    onClick={onNavigate}
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
          <Link key={item.id} href={item.href}>
            <div
              onClick={onNavigate}
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
        );
      })}
    </nav>
  );
}

export default function CmsLayout({ children, breadcrumbs, activeNav }: CmsLayoutProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { role } = useAdmin();

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location]);

  const resolvedActiveNav = activeNav || (() => {
    for (const item of NAV_ITEMS) {
      if (item.children) {
        for (const child of item.children) {
          if (location.startsWith(child.href)) return item.id;
        }
      }
      if (item.id !== "dashboard" && location.startsWith(item.href)) return item.id;
    }
    return location === "/admin/cms" ? "dashboard" : undefined;
  })();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" data-testid="cms-layout">
      <AdminNav currentPage="cms" role={role} />

      <div className="flex flex-1">
        {/* Desktop sidebar — hidden on mobile */}
        <aside
          className={cn(
            "hidden lg:flex fixed top-[73px] left-0 h-[calc(100vh-73px)] bg-card border-r border-border flex-col z-30 transition-all duration-200",
            collapsed ? "w-16" : "w-56"
          )}
          data-testid="cms-sidebar"
        >
          <div className={cn("flex items-center gap-2 border-b border-border h-12 px-3", collapsed && "justify-center")}>
            {!collapsed && (
              <Link href="/admin/cms">
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

          {collapsed ? (
            <nav className="flex-1 py-2 space-y-0.5 px-2 overflow-y-auto" data-testid="cms-nav">
              {NAV_ITEMS.map((item) => {
                const isActive = resolvedActiveNav === item.id;
                return (
                  <Link key={item.id} href={item.href}>
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
                    </div>
                  </Link>
                );
              })}
            </nav>
          ) : (
            <SidebarNav activeNav={resolvedActiveNav} location={location} />
          )}

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

        {/* Mobile sidebar sheet */}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="w-[260px] p-0 flex flex-col lg:hidden" data-testid="cms-mobile-sidebar">
            <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
              <SheetTitle className="text-left text-sm font-semibold text-primary">CMS</SheetTitle>
            </SheetHeader>
            <SidebarNav
              activeNav={resolvedActiveNav}
              location={location}
              onNavigate={() => setMobileSidebarOpen(false)}
            />
            <div className="px-3 py-3 border-t border-border">
              <Link href="/admin/dashboard">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground hover:text-foreground text-xs gap-2"
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Admin
                </Button>
              </Link>
            </div>
          </SheetContent>
        </Sheet>

        <div className={cn(
          "flex-1 flex flex-col transition-all duration-200 min-w-0",
          "lg:ml-56",
          collapsed && "lg:ml-16"
        )}>
          <header className="sticky top-[57px] lg:top-[73px] z-20 bg-background/90 backdrop-blur-sm border-b border-border h-12 flex items-center gap-2 sm:gap-4 px-4 sm:px-6" data-testid="cms-topbar">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted transition-colors flex-shrink-0"
              aria-label="Open CMS sidebar"
              data-testid="button-cms-mobile-sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>

            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-1 text-sm min-w-0 overflow-hidden" data-testid="cms-breadcrumbs">
                <Link href="/admin/cms">
                  <span className="text-muted-foreground hover:text-foreground cursor-pointer flex-shrink-0 hidden sm:inline" data-testid="breadcrumb-cms">CMS</span>
                </Link>
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1 min-w-0">
                    <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                    {crumb.href ? (
                      <Link href={crumb.href}>
                        <span className="text-muted-foreground hover:text-foreground cursor-pointer truncate">{crumb.label}</span>
                      </Link>
                    ) : (
                      <span className="text-foreground truncate">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}

            <div className="flex-1" />

            <div className="relative w-40 sm:w-64 flex-shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="h-8 pl-8 bg-muted border-border text-sm placeholder:text-muted-foreground focus:border-ring"
                data-testid="input-global-search"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5 text-xs flex-shrink-0" data-testid="button-quick-create">
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Create</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <Link href="/admin/cms/pages">
                  <DropdownMenuItem className="cursor-pointer gap-2" data-testid="quick-create-page">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    New Page
                  </DropdownMenuItem>
                </Link>
                <Link href="/admin/cms/sections">
                  <DropdownMenuItem className="cursor-pointer gap-2" data-testid="quick-create-section">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    New Section
                  </DropdownMenuItem>
                </Link>
                <Link href="/admin/cms/templates">
                  <DropdownMenuItem className="cursor-pointer gap-2" data-testid="quick-create-template">
                    <BookTemplate className="w-4 h-4 text-muted-foreground" />
                    New Template
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="flex-1 p-4 sm:p-6 overflow-x-hidden" data-testid="cms-main">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
