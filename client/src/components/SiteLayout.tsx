import { useState, useEffect, type ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { openConsentPreferences } from "@/components/ConsentBanner";
import { ShoppingCart, User, LogOut, Settings, Link2, Headphones, LayoutDashboard, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import DynamicNav from "@/components/DynamicNav";
import MobileNav from "@/components/MobileNav";
import UserAvatar from "@/components/UserAvatar";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBranding } from "@/hooks/use-branding";
import { CustomerAuthModal } from "@/components/CustomerAuthModal";


interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export default function SiteLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { customer, isAuthenticated, isLoading: authLoading, logout, getAuthHeader, refreshSession } = useCustomerAuth();
  const { logoSrc, companyName } = useBranding();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: adminEligibility } = useQuery<{ eligible: boolean }>({
    queryKey: ["/api/customer/auth/check-admin-eligible", customer?.id],
    queryFn: async () => {
      const res = await fetch("/api/customer/auth/check-admin-eligible", {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return { eligible: false };
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 0,
  });
  const isAdminEligible = adminEligibility?.eligible ?? false;

  useEffect(() => {
    if (isAuthenticated && customer?.id) {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/auth/check-admin-eligible"] });
    }
    if (!isAuthenticated) {
      queryClient.removeQueries({ queryKey: ["/api/customer/auth/check-admin-eligible"] });
    }
  }, [isAuthenticated, customer?.id, queryClient]);

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
    window.addEventListener("cartUpdated", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("cartUpdated", handleStorage);
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const isAffiliate = customer && (customer as any).affiliateId;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background relative">
      <nav className="sticky top-0 z-50 bg-card border-b border-border" data-testid="site-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] -ml-1 rounded-lg hover:bg-accent transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button onClick={() => setLocation("/")} className="flex-shrink-0" data-testid="nav-logo-link">
              <img src={logoSrc} alt={companyName} className="h-8 sm:h-10" data-testid="img-logo" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden md:flex">
              <DynamicNav location="main" />
            </div>
            {!isAuthenticated ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 h-10 min-w-[40px] px-2.5 sm:px-3" 
                onClick={() => setAuthModalOpen(true)}
                data-testid="button-my-account"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">My Account</span>
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 rounded-full border border-border hover:border-primary/50 p-0.5 pr-2 sm:pr-3 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
                    data-testid="button-my-account"
                  >
                    <UserAvatar name={customer?.name} avatarUrl={customer?.avatarUrl} size="sm" />
                    <span className="hidden sm:inline text-sm font-medium text-foreground truncate max-w-[100px]">
                      {customer?.name?.split(" ")[0] || "Account"}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {authLoading ? (
                    <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
                  ) : (
                    <>
                      <div className="px-3 py-2.5 flex items-center gap-3">
                        <UserAvatar name={customer?.name} avatarUrl={customer?.avatarUrl} size="md" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-foreground truncate">{customer?.name || "Customer"}</span>
                          <span className="text-xs text-muted-foreground truncate">{customer?.email}</span>
                        </div>
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
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="outline"
              size="sm"
              className="relative gap-2 h-10 min-w-[40px] px-2.5 sm:px-3"
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

      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        isAuthenticated={isAuthenticated}
        isAffiliate={!!isAffiliate}
        isAdminEligible={isAdminEligible}
        customerName={customer?.name}
        customerEmail={customer?.email}
        customerAvatarUrl={customer?.avatarUrl}
        onNavigate={(path) => { setLocation(path); setMobileMenuOpen(false); }}
        onLogout={() => { logout(); setMobileMenuOpen(false); }}
        onOpenAuth={() => { setAuthModalOpen(true); setMobileMenuOpen(false); }}
      />

      <CustomerAuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen}
        onLoginSuccess={refreshSession}
      />

      <main>
        {children}
      </main>

      <footer className="py-8 sm:py-12 border-t border-border bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
            <div className="flex items-center">
              <img src={logoSrc} alt={companyName} className="h-8" />
            </div>
            <div className="flex flex-col items-center gap-3 md:items-end">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <Link href="/contact" className="text-muted-foreground text-sm hover:text-foreground transition-colors py-1" data-testid="link-contact-us">
                  Contact Us
                </Link>
                <Link href="/privacy-policy" className="text-muted-foreground text-sm hover:text-foreground transition-colors py-1" data-testid="link-privacy-policy">
                  Privacy Policy
                </Link>
                <Link href="/terms-and-conditions" className="text-muted-foreground text-sm hover:text-foreground transition-colors py-1" data-testid="link-terms">
                  Terms & Conditions
                </Link>
                <Link href="/affiliate-agreement" className="text-muted-foreground text-sm hover:text-foreground transition-colors py-1" data-testid="link-affiliate-agreement">
                  Affiliate Agreement
                </Link>
                <button onClick={openConsentPreferences} className="text-muted-foreground text-sm hover:text-foreground transition-colors py-1" data-testid="link-cookie-preferences">
                  Cookie Preferences
                </button>
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm text-center">
                Mind + Body + Spirit | &copy; 2026 Power Plunge. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
