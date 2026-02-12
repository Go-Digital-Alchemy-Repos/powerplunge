import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Home,
  Package,
  ShoppingBag,
  Users,
  Link2,
  UserPlus,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Building2,
  Key,
  FileText,
  BarChart3,
  Headset,
  LayoutGrid,
  ImageIcon,
  Palette,
  Sun,
  Moon,
  Menu,
  Tag,
  Search,
} from "lucide-react";
import { useAdminTheme } from "@/hooks/use-admin-theme";
import { cn } from "@/lib/utils";

interface AdminNavProps {
  currentPage?: string;
  role?: "super_admin" | "admin" | "store_manager" | "fulfillment";
}

export default function AdminNav({ currentPage, role = "admin" }: AdminNavProps) {
  const [location, navigate] = useLocation();
  const { theme, toggleTheme } = useAdminTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    navigate("/admin/login");
  };

  const isActive = (page: string) => currentPage === page;
  const isClientManagement = currentPage === "customers" || currentPage === "affiliates" || currentPage === "support" || currentPage === "affiliate-invite-sender";
  const isCms = currentPage === "media" || currentPage === "cms-settings" || currentPage === "cms" || currentPage?.startsWith("cms-");
  const isSettings = currentPage === "settings" || currentPage === "team" || currentPage === "email-templates" || currentPage === "integrations" || currentPage === "docs" || currentPage === "themes";

  const hasFullAccess = role === "super_admin" || role === "admin" || role === "store_manager";

  const drawerNavigate = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  interface DrawerNavItem {
    label: string;
    icon: any;
    href: string;
    active?: boolean;
  }

  interface DrawerNavGroup {
    label: string;
    icon: any;
    items: DrawerNavItem[];
    defaultOpen?: boolean;
  }

  const mainItems: DrawerNavItem[] = [
    { label: "Dashboard", icon: Home, href: "/admin/dashboard", active: isActive("home") },
    { label: "Orders", icon: Package, href: "/admin/orders", active: isActive("orders") },
  ];

  if (hasFullAccess) {
    mainItems.push(
      { label: "Products", icon: ShoppingBag, href: "/admin/products", active: isActive("products") },
      { label: "Coupons", icon: Tag, href: "/admin/coupons", active: isActive("coupons") },
      { label: "Insights", icon: BarChart3, href: "/admin/revenue", active: isActive("insights") },
    );
  }

  const groups: DrawerNavGroup[] = [];

  if (hasFullAccess) {
    groups.push({
      label: "CMS",
      icon: LayoutGrid,
      defaultOpen: isCms,
      items: [
        { label: "Dashboard", icon: LayoutGrid, href: "/admin/cms", active: currentPage === "cms" },
        { label: "Pages", icon: FileText, href: "/admin/cms/pages", active: currentPage === "cms-pages" },
        { label: "Posts", icon: FileText, href: "/admin/cms/posts", active: currentPage === "cms-posts" },
        { label: "Menus", icon: Menu, href: "/admin/cms/menus", active: currentPage === "cms-menus" },
        { label: "Media Library", icon: ImageIcon, href: "/admin/media", active: currentPage === "media" },
        { label: "Settings", icon: Settings, href: "/admin/cms/settings", active: currentPage === "cms-settings" },
      ],
    });

    groups.push({
      label: "Client Management",
      icon: Users,
      defaultOpen: isClientManagement,
      items: [
        { label: "Customers", icon: Users, href: "/admin/customers", active: isActive("customers") },
        { label: "Affiliates", icon: Link2, href: "/admin/affiliates", active: isActive("affiliates") },
        { label: "Invite Affiliates", icon: UserPlus, href: "/admin/affiliate-invite-sender", active: isActive("affiliate-invite-sender") },
        { label: "Support Tickets", icon: Headset, href: "/admin/support", active: isActive("support") },
      ],
    });

    groups.push({
      label: "Settings",
      icon: Settings,
      defaultOpen: isSettings,
      items: [
        { label: "Site Settings", icon: Building2, href: "/admin/settings", active: isActive("settings") },
        { label: "Team", icon: UserPlus, href: "/admin/team", active: isActive("team") },
        { label: "Email Templates", icon: FileText, href: "/admin/email-templates", active: isActive("email-templates") },
        { label: "Integrations", icon: Key, href: "/admin/integrations", active: isActive("integrations") },
        { label: "Themes", icon: Palette, href: "/admin/settings/themes", active: isActive("themes") },
        { label: "Docs Library", icon: FileText, href: "/admin/docs", active: isActive("docs") },
      ],
    });
  }

  const allDrawerItems = [
    ...mainItems,
    ...groups.flatMap(g => g.items),
  ];
  const filteredMainItems = searchQuery
    ? mainItems.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : mainItems;
  const filteredGroups = searchQuery
    ? groups.map(g => ({
        ...g,
        items: g.items.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase())),
        defaultOpen: true,
      })).filter(g => g.items.length > 0)
    : groups;

  const currentPageTitle = (() => {
    const found = allDrawerItems.find(i => i.active);
    if (found) return found.label;
    if (isCms) return "CMS";
    if (isClientManagement) return "Clients";
    if (isSettings) return "Settings";
    return "Admin";
  })();

  return (
    <>
      <nav className="sticky top-0 z-50 bg-card border-b border-border" data-testid="admin-nav">
        {/* Desktop nav — hidden on mobile */}
        <div className="hidden lg:flex max-w-7xl mx-auto px-6 py-4 items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold">Power Plunge Admin</h1>
            <div className="flex gap-2">
              <Link href="/admin/dashboard">
                <Button
                  variant={isActive("home") ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                  data-testid="link-home"
                >
                  <Home className="w-4 h-4" />
                  Home
                </Button>
              </Link>
              <Link href="/admin/orders">
                <Button
                  variant={isActive("orders") ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                  data-testid="link-orders"
                >
                  <Package className="w-4 h-4" />
                  Orders
                </Button>
              </Link>
              {hasFullAccess && (
                <Link href="/admin/products">
                  <Button
                    variant={isActive("products") ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                    data-testid="link-products"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Products
                  </Button>
                </Link>
              )}

              {hasFullAccess && (
                <Link href="/admin/cms">
                  <Button
                    variant={isCms ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                    data-testid="link-cms"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    CMS
                  </Button>
                </Link>
              )}

              {hasFullAccess && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={isClientManagement ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-2"
                      data-testid="dropdown-client-management"
                    >
                      <Users className="w-4 h-4" />
                      Client Management
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem asChild>
                      <Link href="/admin/customers" className="flex items-center gap-2 cursor-pointer">
                        <Users className="w-4 h-4" />
                        Customers
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/affiliates" className="flex items-center gap-2 cursor-pointer">
                        <Link2 className="w-4 h-4" />
                        Affiliates
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/affiliate-invite-sender" className="flex items-center gap-2 cursor-pointer" data-testid="link-invite-affiliates">
                        <UserPlus className="w-4 h-4" />
                        Invite Affiliates
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/support" className="flex items-center gap-2 cursor-pointer" data-testid="link-support">
                        <Headset className="w-4 h-4" />
                        Support Tickets
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {hasFullAccess && (
                <Link href="/admin/revenue">
                  <Button
                    variant={isActive("insights") ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                    data-testid="link-insights"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Insights
                  </Button>
                </Link>
              )}

              {hasFullAccess && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={isSettings ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-2"
                      data-testid="dropdown-settings"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href="/admin/settings" className="flex items-center gap-2 cursor-pointer">
                        <Building2 className="w-4 h-4" />
                        Site Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/team" className="flex items-center gap-2 cursor-pointer">
                        <UserPlus className="w-4 h-4" />
                        Team
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/email-templates" className="flex items-center gap-2 cursor-pointer">
                        <FileText className="w-4 h-4" />
                        Email Templates
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/integrations" className="flex items-center gap-2 cursor-pointer">
                        <Key className="w-4 h-4" />
                        Integrations
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/settings/themes" className="flex items-center gap-2 cursor-pointer">
                        <Palette className="w-4 h-4" />
                        Themes
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/docs" className="flex items-center gap-2 cursor-pointer">
                        <FileText className="w-4 h-4" />
                        Docs Library
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/docs-coverage" className="flex items-center gap-2 cursor-pointer">
                        <FileText className="w-4 h-4" />
                        Docs Coverage
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {role === "fulfillment" && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Fulfillment
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-8 w-8 p-0"
              data-testid="button-theme-toggle"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Mobile nav header */}
        <div className="flex lg:hidden items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-accent transition-colors flex-shrink-0"
              aria-label="Open admin menu"
              data-testid="button-admin-mobile-menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold truncate">Admin</h1>
              <p className="text-xs text-muted-foreground truncate">{currentPageTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {role === "fulfillment" && (
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                Fulfillment
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-9 w-9 p-0"
              data-testid="button-theme-toggle-mobile"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-[300px] sm:w-[320px] p-0 flex flex-col" data-testid="admin-mobile-drawer">
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
            <SheetTitle className="text-left text-base">Power Plunge Admin</SheetTitle>
          </SheetHeader>

          <div className="px-3 py-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools..."
                className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-muted text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                data-testid="input-admin-drawer-search"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain py-2">
            {filteredMainItems.length > 0 && (
              <div className="px-2 space-y-0.5">
                {filteredMainItems.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => drawerNavigate(item.href)}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm transition-colors text-left",
                      item.active
                        ? "bg-secondary text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    data-testid={`admin-drawer-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <item.icon className={cn("w-4 h-4 flex-shrink-0", item.active && "text-primary")} />
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {filteredGroups.map((group) => (
              <div key={group.label} className="mt-1">
                <Collapsible defaultOpen={group.defaultOpen || !!searchQuery}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-5 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors group">
                    <span className="flex items-center gap-2">
                      <group.icon className="w-3.5 h-3.5" />
                      {group.label}
                    </span>
                    <ChevronDown className="w-3 h-3 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-2 space-y-0.5 pb-1">
                      {group.items.map((item) => (
                        <button
                          key={item.href}
                          onClick={() => drawerNavigate(item.href)}
                          className={cn(
                            "flex items-center gap-3 w-full pl-8 pr-3 py-2 rounded-md text-sm transition-colors text-left",
                            item.active
                              ? "bg-secondary text-foreground font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                          data-testid={`admin-drawer-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <item.icon className={cn("w-4 h-4 flex-shrink-0", item.active && "text-primary")} />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}

            {searchQuery && filteredMainItems.length === 0 && filteredGroups.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No tools match "{searchQuery}"
              </div>
            )}
          </div>

          <div className="border-t border-border px-2 py-3 space-y-0.5">
            <button
              onClick={() => { toggleTheme(); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left"
              data-testid="admin-drawer-theme-toggle"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            <button
              onClick={() => { setDrawerOpen(false); handleLogout(); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
              data-testid="admin-drawer-logout"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
