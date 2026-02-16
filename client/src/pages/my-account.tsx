import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { MobileTabsList } from "@/components/ui/mobile-tabs-list";
import { Badge } from "@/components/ui/badge";
import { Package, ArrowLeft, LogOut, Link2, Settings, Headset, Crown } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import DynamicNav from "@/components/DynamicNav";
import { useBranding } from "@/hooks/use-branding";
import { useAccountVip } from "./account/hooks/useAccountVip";
import OrdersTab from "./account/components/OrdersTab";
import AccountTab from "./account/components/AccountTab";
import AffiliateTab from "./account/components/AffiliateTab";
import SupportTab from "./account/components/SupportTab";

export default function MyAccount() {
  const [, setLocation] = useLocation();
  const { logoSrc, companyName } = useBranding();
  const { customer: authCustomer, isLoading: authLoading, isAuthenticated, logout, getAuthHeader } = useCustomerAuth();
  const [activeTab, setActiveTab] = useState("orders");
  const { vipData } = useAccountVip();

  const { data: affiliateCheck } = useQuery<{ affiliate: any | null }>({
    queryKey: ["/api/customer/affiliate-portal"],
    queryFn: async () => {
      const res = await fetch("/api/customer/affiliate-portal", {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok && res.status !== 404) throw new Error("Failed to check affiliate status");
      if (res.status === 404) return { affiliate: null };
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const isAffiliate = !!affiliateCheck?.affiliate;

  const handleTabChange = (value: string) => {
    if (value === "affiliate") {
      setLocation('/affiliate-portal');
      return;
    }
    setActiveTab(value);
  };

  const accountTabs = [
    { value: "orders", label: "My Orders", icon: <Package className="w-4 h-4" />, "data-testid": "tab-orders" },
    { value: "account", label: "Account Details", icon: <Settings className="w-4 h-4" />, "data-testid": "tab-account" },
    ...(isAffiliate ? [{ value: "affiliate", label: "Affiliate Program", icon: <Link2 className="w-4 h-4" />, "data-testid": "tab-affiliate", onClick: (e: React.MouseEvent) => { e.preventDefault(); setLocation('/affiliate-portal'); } }] : []),
    { value: "support", label: "Support", icon: <Headset className="w-4 h-4" />, "data-testid": "tab-support" },
  ];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/login?redirect=/my-account";
    }
  }, [authLoading, isAuthenticated]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={logoSrc} alt={companyName} className="h-8" />
            <DynamicNav location="main" />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <UserAvatar name={authCustomer?.name} avatarUrl={authCustomer?.avatarUrl} size="sm" />
              <span>{authCustomer?.name || authCustomer?.email}</span>
              {vipData?.isVip && (
                <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-0 gap-1" data-testid="badge-vip">
                  <Crown className="w-3 h-3" />
                  VIP
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <MobileTabsList
            tabs={accountTabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            className="mb-8"
          />

          <TabsContent value="orders">
            <OrdersTab />
          </TabsContent>

          <TabsContent value="account">
            <AccountTab />
          </TabsContent>

          {isAffiliate && (
            <TabsContent value="affiliate">
              <AffiliateTab />
            </TabsContent>
          )}

          <TabsContent value="support">
            <SupportTab />
          </TabsContent>
        </Tabs>
      </main>

    </div>
  );
}
