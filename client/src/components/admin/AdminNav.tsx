import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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
  Check,
  Menu,
  Tag,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { applyThemeVariables } from "@/components/ThemeProvider";
import { ThemeSelector as SharedThemeSelector } from "@/components/ThemeSelector";
import type { ThemePreset } from "@shared/themePresets";
import type { ThemePackPreset } from "@shared/themePackPresets";
import defaultAdminIcon from "@assets/powerplungeicon_1770929882628.png";

interface UnifiedTheme {
  id: string;
  name: string;
  colors: string[];
  isPack: boolean;
}

function ColorPaletteBar({ colors }: { colors: string[] }) {
  return (
    <div className="flex h-3 w-full rounded-sm overflow-hidden border border-white/10">
      {colors.map((color, i) => (
        <div key={i} className="flex-1" style={{ backgroundColor: color }} />
      ))}
    </div>
  );
}

function ThemeSelector({
  activeThemeId,
  themes,
  onSelect,
  isPending,
  triggerClassName,
  testIdSuffix,
}: {
  activeThemeId: string;
  themes: UnifiedTheme[];
  onSelect: (theme: UnifiedTheme) => void;
  isPending: boolean;
  triggerClassName?: string;
  testIdSuffix?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={triggerClassName || "h-8 w-8 p-0"}
          data-testid={`button-theme-selector${testIdSuffix || ""}`}
        >
          <Sun className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Select Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((theme) => {
          const isActive = activeThemeId === theme.id;
          return (
            <DropdownMenuItem
              key={theme.id}
              onClick={() => onSelect(theme)}
              disabled={isPending}
              className="flex flex-col items-start gap-1.5 py-2 cursor-pointer"
              data-testid={`theme-option-${theme.id}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={cn("text-xs font-medium", isActive && "text-primary")}>{theme.name}</span>
                {isActive && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
              </div>
              <ColorPaletteBar colors={theme.colors} />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThemeSelectorDrawerItem({
  activeThemeId,
  themes,
  onSelect,
  isPending,
}: {
  activeThemeId: string;
  themes: UnifiedTheme[];
  onSelect: (theme: UnifiedTheme) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const activeTheme = themes.find((t) => t.id === activeThemeId);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left"
        data-testid="admin-drawer-theme-selector"
      >
        <Sun className="w-4 h-4" />
        <span className="flex-1">Theme{activeTheme ? `: ${activeTheme.name}` : ""}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-2 pb-2 space-y-0.5 max-h-60 overflow-y-auto">
          {themes.map((theme) => {
            const isActive = activeThemeId === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => { onSelect(theme); setOpen(false); }}
                disabled={isPending}
                className={cn(
                  "flex flex-col gap-1.5 w-full px-3 py-2 rounded-md text-left transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                data-testid={`drawer-theme-option-${theme.id}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-medium">{theme.name}</span>
                  {isActive && <Check className="w-3 h-3 flex-shrink-0" />}
                </div>
                <ColorPaletteBar colors={theme.colors} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface AdminNavProps {
  currentPage?: string;
  role?: "super_admin" | "admin" | "store_manager" | "fulfillment";
}

export default function AdminNav({ currentPage, role = "admin" }: AdminNavProps) {
  const [location, navigate] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: legacyThemes } = useQuery<ThemePreset[]>({
    queryKey: ["/api/admin/cms/themes"],
  });

  const { data: packThemes } = useQuery<ThemePackPreset[]>({
    queryKey: ["/api/admin/cms/theme-packs"],
  });

  const { data: activeThemeData } = useQuery<ThemePreset>({
    queryKey: ["/api/admin/cms/themes/active"],
  });

  const activeThemeId = activeThemeData?.id || "arctic-default";

  const unifiedThemes: UnifiedTheme[] = [
    ...(legacyThemes || []).map((t) => ({
      id: t.id,
      name: t.name,
      colors: [t.variables["--theme-bg"], t.variables["--theme-bg-card"], t.variables["--theme-primary"], t.variables["--theme-accent"], t.variables["--theme-text"]].filter(Boolean),
      isPack: false,
    })),
    ...(packThemes || []).map((t) => ({
      id: t.id,
      name: t.name,
      colors: [t.themeTokens["--theme-bg"], t.themeTokens["--theme-bg-card"], t.themeTokens["--theme-primary"], t.themeTokens["--theme-accent"], t.themeTokens["--theme-text"]].filter(Boolean),
      isPack: true,
    })),
  ];

  const activateThemeMutation = useMutation({
    mutationFn: async (theme: UnifiedTheme) => {
      const url = theme.isPack ? "/api/admin/cms/theme-packs/activate" : "/api/admin/cms/themes/activate";
      const body = theme.isPack ? { packId: theme.id } : { themeId: theme.id };
      const res = await fetch(url, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to activate theme");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/themes/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/theme-packs/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/theme/active"] });
      const variables = data.variables || data.themeTokens;
      if (variables) applyThemeVariables(variables);
    },
  });

  const { data: siteSettings } = useQuery<{ adminIconUrl?: string }>({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      if (!res.ok) return {};
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const adminIconSrc = siteSettings?.adminIconUrl || defaultAdminIcon;

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    navigate("/admin/login");
  };

  const isActive = (page: string) => currentPage === page;
  const isClientManagement = currentPage === "customers" || currentPage === "affiliates" || currentPage === "support" || currentPage === "affiliate-invite-sender";
  const isCms = currentPage === "media" || currentPage === "cms-settings" || currentPage === "cms" || currentPage?.startsWith("cms-");
  const isEcommerceSettings = currentPage === "ecommerce-settings";
  const isEcommerce = isActive("orders") || isActive("coupons") || isEcommerceSettings;
  const isContentManager = isActive("products") || isCms;
  const isSettings = currentPage === "settings" || currentPage === "analytics" || currentPage === "team" || currentPage === "email-templates" || currentPage === "integrations" || currentPage === "docs" || currentPage === "themes";

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
  ];

  const groups: DrawerNavGroup[] = [];

  groups.push({
    label: "E-Commerce",
    icon: ShoppingBag,
    defaultOpen: isEcommerce,
    items: [
      { label: "Orders", icon: Package, href: "/admin/orders", active: isActive("orders") },
      ...(hasFullAccess ? [
        { label: "Products", icon: ShoppingBag, href: "/admin/products", active: isActive("products") },
        { label: "Coupons", icon: Tag, href: "/admin/coupons", active: isActive("coupons") },
        { label: "Settings", icon: Settings, href: "/admin/ecommerce/settings", active: isEcommerceSettings },
      ] : []),
    ],
  });

  if (hasFullAccess) {
    mainItems.push(
      { label: "Insights", icon: BarChart3, href: "/admin/revenue", active: isActive("insights") },
    );
  }

  if (hasFullAccess) {
    groups.push({
      label: "Content Manager",
      icon: LayoutGrid,
      defaultOpen: isContentManager,
      items: [
        { label: "Products", icon: ShoppingBag, href: "/admin/products", active: isActive("products") },
        { label: "CMS", icon: LayoutGrid, href: "/admin/cms", active: currentPage === "cms" },
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
      label: "System Settings",
      icon: Settings,
      defaultOpen: isSettings,
      items: [
        { label: "Site Settings", icon: Building2, href: "/admin/settings", active: isActive("settings") },
        { label: "Analytics", icon: BarChart3, href: "/admin/analytics", active: isActive("analytics") },
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
            <img src={adminIconSrc} alt="Admin" className="h-8 w-auto object-contain" data-testid="img-admin-nav-icon" />
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isEcommerce ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                    data-testid="dropdown-ecommerce"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    E-Commerce
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link href="/admin/orders" className="relative select-none rounded-sm px-2 py-1.5 outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 flex items-center gap-2 cursor-pointer text-[13px]">
                      <Package className="w-4 h-4" />
                      Orders
                    </Link>
                  </DropdownMenuItem>
                  {hasFullAccess && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/products" className="relative select-none rounded-sm px-2 py-1.5 outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 flex items-center gap-2 cursor-pointer text-[13px]">
                          <ShoppingBag className="w-4 h-4" />
                          Products
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/coupons" className="relative select-none rounded-sm px-2 py-1.5 outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 flex items-center gap-2 cursor-pointer text-[13px]">
                          <Tag className="w-4 h-4" />
                          Coupons
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/ecommerce/settings" className="relative select-none rounded-sm px-2 py-1.5 outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 flex items-center gap-2 cursor-pointer text-[13px]">
                          <Settings className="w-4 h-4" />
                          E-Commerce Settings
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isContentManager ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                    data-testid="dropdown-content-manager"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    Content Manager
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link href="/admin/products" className="relative select-none rounded-sm px-2 py-1.5 outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 flex items-center gap-2 cursor-pointer text-[13px]">
                      <ShoppingBag className="w-4 h-4" />
                      Products
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/cms" className="relative select-none rounded-sm px-2 py-1.5 outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 flex items-center gap-2 cursor-pointer text-[13px]">
                      <LayoutGrid className="w-4 h-4" />
                      CMS
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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
                      <Link href="/admin/customers" className="relative select-none rounded-sm px-2 py-1.5 outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 flex items-center gap-2 cursor-pointer text-[13px]">
                        <Users className="w-4 h-4" />
                        Customers
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/affiliates" className="relative select-none rounded-sm px-2 py-1.5 outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 flex items-center gap-2 cursor-pointer text-[13px]">
                        <Link2 className="w-4 h-4" />
                        Affiliates
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/affiliate-invite-sender" className="relative select-none rounded-sm px-2 py-1.5 outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 flex items-center gap-2 cursor-pointer text-[13px]" data-testid="link-invite-affiliates">
                        <UserPlus className="w-4 h-4" />
                        Invite Affiliates
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/support" className="relative select-none rounded-sm px-2 py-1.5 outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 flex items-center gap-2 cursor-pointer text-[13px]" data-testid="link-support">
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
                      System Settings
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href="/admin/settings" className="relative select-none rounded-sm px-2 py-1.5 outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 flex items-center gap-2 cursor-pointer text-[13px]">
                        <Building2 className="w-4 h-4" />
                        Site Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/analytics" className="relative select-none rounded-sm px-2 py-1.5 outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 flex items-center gap-2 cursor-pointer text-[13px]" data-testid="link-analytics">
                        <BarChart3 className="w-4 h-4" />
                        Analytics
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/team" className="relative select-none rounded-sm px-2 py-1.5 outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 flex items-center gap-2 cursor-pointer text-[13px]">
                        <UserPlus className="w-4 h-4" />
                        Team
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/email-templates" className="relative select-none rounded-sm px-2 py-1.5 outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 flex items-center gap-2 cursor-pointer text-[13px]">
                        <FileText className="w-4 h-4" />
                        Email Templates
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/integrations" className="relative select-none rounded-sm px-2 py-1.5 outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 flex items-center gap-2 cursor-pointer text-[13px]">
                        <Key className="w-4 h-4" />
                        Integrations
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/settings/themes" className="relative select-none rounded-sm px-2 py-1.5 outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 flex items-center gap-2 cursor-pointer text-[13px]">
                        <Palette className="w-4 h-4" />
                        Themes
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/docs" className="relative select-none rounded-sm px-2 py-1.5 outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 flex items-center gap-2 cursor-pointer text-[13px]">
                        <FileText className="w-4 h-4" />
                        Docs Library
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/docs-coverage" className="relative select-none rounded-sm px-2 py-1.5 outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 flex items-center gap-2 cursor-pointer text-[13px]">
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
            <SharedThemeSelector
              triggerClassName="h-8 w-8 p-0"
            />
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
            <SharedThemeSelector
              triggerClassName="h-9 w-9 p-0"
              testIdSuffix="-mobile"
            />
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-[300px] sm:w-[320px] p-0 flex flex-col" data-testid="admin-mobile-drawer">
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
            <SheetTitle className="text-left text-base flex items-center gap-2">
              <img src={adminIconSrc} alt="Admin" className="h-6 w-auto object-contain" data-testid="img-admin-drawer-icon" />
            </SheetTitle>
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
            <ThemeSelectorDrawerItem
              activeThemeId={activeThemeId}
              themes={unifiedThemes}
              onSelect={(t) => activateThemeMutation.mutate(t)}
              isPending={activateThemeMutation.isPending}
            />
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
