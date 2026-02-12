import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, User, LogOut, Settings, Link2, Headphones, LayoutDashboard, ChevronRight } from "lucide-react";

interface NavMenuItem {
  id: string;
  type: "page" | "post" | "external" | "label";
  label: string;
  href?: string;
  url?: string;
  pageSlug?: string;
  postSlug?: string;
  target?: "_self" | "_blank";
  children?: NavMenuItem[];
}

interface MenuData {
  id: string;
  name: string;
  location: string;
  items: NavMenuItem[];
  active: boolean;
}

const SLUG_TO_ROUTE: Record<string, string> = {
  "home": "/",
  "shop": "/shop",
  "blog": "/blog",
  "my-account": "/my-account",
  "track-order": "/track-order",
  "checkout": "/checkout",
  "login": "/login",
  "register": "/register",
  "become-affiliate": "/become-affiliate",
  "affiliate-portal": "/affiliate-portal",
};

function resolveHref(item: NavMenuItem): string {
  if (item.type === "external") return item.href || item.url || "#";
  if (item.type === "post" && item.postSlug) return `/blog/${item.postSlug}`;
  if (item.type === "page" && item.pageSlug) {
    if (SLUG_TO_ROUTE[item.pageSlug]) return SLUG_TO_ROUTE[item.pageSlug];
    return `/page/${item.pageSlug}`;
  }
  return item.href || item.url || "#";
}

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  isAffiliate: boolean;
  isAdminEligible: boolean;
  customerEmail?: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export default function MobileNav({
  isOpen,
  onClose,
  isAuthenticated,
  isAffiliate,
  isAdminEligible,
  customerEmail,
  onNavigate,
  onLogout,
}: MobileNavProps) {
  const { data: menu } = useQuery<MenuData | null>({
    queryKey: ["/api/menus", "main"],
    queryFn: async () => {
      const res = await fetch("/api/menus/main");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60000,
  });

  if (!isOpen) return null;

  const renderMenuItem = (item: NavMenuItem) => {
    if (item.type === "label") {
      return (
        <div key={item.id} className="px-4 pt-4 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {item.label}
        </div>
      );
    }

    const href = resolveHref(item);
    const isExternal = item.type === "external" || item.target === "_blank";
    const hasChildren = (item.children?.length ?? 0) > 0;

    return (
      <div key={item.id}>
        {isExternal ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-4 py-3.5 text-base font-medium text-foreground hover:bg-accent/50 active:bg-accent transition-colors"
            onClick={onClose}
            data-testid={`mobile-nav-link-${item.id}`}
          >
            {item.label}
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </a>
        ) : (
          <button
            onClick={() => onNavigate(href)}
            className="flex items-center justify-between w-full px-4 py-3.5 text-base font-medium text-foreground hover:bg-accent/50 active:bg-accent transition-colors text-left"
            data-testid={`mobile-nav-link-${item.id}`}
          >
            {item.label}
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
        {hasChildren && (
          <div className="pl-4 border-l border-border ml-4">
            {item.children!.map(renderMenuItem)}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
        data-testid="mobile-nav-overlay"
      />
      <div
        className="fixed top-0 left-0 bottom-0 w-[280px] max-w-[85vw] bg-card z-50 md:hidden overflow-y-auto overscroll-contain shadow-2xl"
        style={{ paddingTop: "60px" }}
        data-testid="mobile-nav-panel"
      >
        <div className="flex flex-col h-full">
          <div className="flex-1">
            {menu?.items?.map(renderMenuItem)}

            {(!menu?.items || menu.items.length === 0) && (
              <>
                <button
                  onClick={() => onNavigate("/shop")}
                  className="flex items-center justify-between w-full px-4 py-3.5 text-base font-medium text-foreground hover:bg-accent/50 active:bg-accent transition-colors text-left"
                >
                  Shop
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </>
            )}
          </div>

          <div className="border-t border-border mt-2 pt-2 pb-6">
            {isAuthenticated ? (
              <>
                <div className="px-4 py-2 text-sm text-muted-foreground truncate">
                  {customerEmail}
                </div>
                <button
                  onClick={() => onNavigate("/my-account")}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-foreground hover:bg-accent/50 active:bg-accent transition-colors"
                  data-testid="mobile-menu-account"
                >
                  <Settings className="w-4 h-4" />
                  My Account
                </button>
                <button
                  onClick={() => onNavigate("/my-account")}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-foreground hover:bg-accent/50 active:bg-accent transition-colors"
                  data-testid="mobile-menu-orders"
                >
                  <ShoppingCart className="w-4 h-4" />
                  My Orders
                </button>
                {isAffiliate && (
                  <button
                    onClick={() => onNavigate("/affiliate-portal")}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-primary hover:bg-accent/50 active:bg-accent transition-colors"
                    data-testid="mobile-menu-affiliate"
                  >
                    <Link2 className="w-4 h-4" />
                    Affiliate Portal
                  </button>
                )}
                {isAdminEligible && (
                  <button
                    onClick={() => onNavigate(`/admin/login?email=${encodeURIComponent(customerEmail || "")}`)}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-foreground hover:bg-accent/50 active:bg-accent transition-colors"
                    data-testid="mobile-menu-admin"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Admin Portal
                  </button>
                )}
                <button
                  onClick={onLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-destructive hover:bg-accent/50 active:bg-accent transition-colors"
                  data-testid="mobile-menu-logout"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => onNavigate("/login")}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-base font-medium text-foreground hover:bg-accent/50 active:bg-accent transition-colors"
                data-testid="mobile-menu-login"
              >
                <User className="w-4 h-4" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
