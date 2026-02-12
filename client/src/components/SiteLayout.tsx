import { useState, useEffect, type ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { openConsentPreferences } from "@/components/ConsentBanner";
import { ShoppingCart, User, LogOut, Settings, Link2, Headphones, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import DynamicNav from "@/components/DynamicNav";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useQuery } from "@tanstack/react-query";
import { useBranding } from "@/hooks/use-branding";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export default function SiteLayout({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { customer, isAuthenticated, isLoading: authLoading, logout, getAuthHeader } = useCustomerAuth();
  const { logoSrc, companyName } = useBranding();

  // Check if this customer email has a corresponding admin account (without granting admin access)
  const { data: adminEligibility } = useQuery<{ eligible: boolean }>({
    queryKey: ["/api/customer/auth/check-admin-eligible"],
    queryFn: async () => {
      const res = await fetch("/api/customer/auth/check-admin-eligible", {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return { eligible: false };
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });
  const isAdminEligible = adminEligibility?.eligible ?? false;

  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      const savedCart = localStorage.getItem("cart");
      return savedCart ? JSON.parse(savedCart) : [];
    }
    return [];
  });

  useEffect(() => {
    const handleStorage = () => {
      const savedCart = localStorage.getItem("cart");
      setCart(savedCart ? JSON.parse(savedCart) : []);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const isAffiliate = customer && (customer as any).affiliateId;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background relative">
      <nav className="sticky top-0 z-50 bg-card border-b border-border" data-testid="site-nav">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => setLocation("/")} className="flex-shrink-0" data-testid="nav-logo-link">
              <img src={logoSrc} alt={companyName} className="h-10" data-testid="img-logo" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <DynamicNav location="main" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-my-account">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">My Account</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {authLoading ? (
                  <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
                ) : isAuthenticated ? (
                  <>
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {customer?.email}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setLocation("/my-account")} data-testid="menu-my-orders">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      My Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation("/my-account")} data-testid="menu-account-details">
                      <Settings className="w-4 h-4 mr-2" />
                      Account Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation("/my-account")} data-testid="menu-support">
                      <Headphones className="w-4 h-4 mr-2" />
                      Support
                    </DropdownMenuItem>
                    {isAffiliate && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setLocation("/affiliate-portal")} data-testid="menu-affiliate-dashboard">
                          <Link2 className="w-4 h-4 mr-2 text-primary" />
                          Affiliate Portal
                        </DropdownMenuItem>
                      </>
                    )}
                    {isAdminEligible && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setLocation(`/admin/login?email=${encodeURIComponent(customer?.email || "")}`)}
                          data-testid="menu-admin-portal"
                        >
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          Go to Admin Portal
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => logout()} data-testid="menu-logout">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={() => setLocation("/login")} data-testid="menu-login">
                    <User className="w-4 h-4 mr-2" />
                    Sign In
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              className="relative gap-2"
              onClick={() => setLocation("/checkout")}
              data-testid="button-cart"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-semibold">
                  {cartCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </nav>

      <div>
        {children}
      </div>

      <footer className="py-12 border-t border-border bg-card/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center">
              <img src={logoSrc} alt={companyName} className="h-8" />
            </div>
            <div className="flex flex-col items-center gap-3 md:items-end">
              <div className="flex items-center gap-4">
                <Link href="/privacy-policy" className="text-muted-foreground text-sm hover:text-foreground transition-colors" data-testid="link-privacy-policy">
                  Privacy Policy
                </Link>
                <Link href="/terms-and-conditions" className="text-muted-foreground text-sm hover:text-foreground transition-colors" data-testid="link-terms">
                  Terms & Conditions
                </Link>
                <button onClick={openConsentPreferences} className="text-muted-foreground text-sm hover:text-foreground transition-colors" data-testid="link-cookie-preferences">
                  Cookie Preferences
                </button>
              </div>
              <p className="text-muted-foreground text-sm">
                Mind + Body + Spirit | &copy; 2026 Power Plunge. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
