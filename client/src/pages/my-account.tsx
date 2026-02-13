import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Package, ArrowLeft, LogOut, User, Link2, Settings, Headset, Crown } from "lucide-react";
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
  const { customer: authCustomer, isLoading: authLoading, isAuthenticated, logout } = useCustomerAuth();
  const [activeTab, setActiveTab] = useState("orders");
  const { vipData } = useAccountVip();

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
              <User className="w-4 h-4 text-muted-foreground" />
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
          <TabsList className="mb-8">
            <TabsTrigger value="orders" className="gap-2" data-testid="tab-orders">
              <Package className="w-4 h-4" />
              My Orders
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2" data-testid="tab-account">
              <Settings className="w-4 h-4" />
              Account Details
            </TabsTrigger>
            <TabsTrigger value="affiliate" className="gap-2" data-testid="tab-affiliate" onClick={(e) => { e.preventDefault(); setLocation('/affiliate-portal'); }}>
              <Link2 className="w-4 h-4" />
              Affiliate Program
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-2" data-testid="tab-support">
              <Headset className="w-4 h-4" />
              Support
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <OrdersTab />
          </TabsContent>

          <TabsContent value="account">
            <AccountTab />
          </TabsContent>

          <TabsContent value="affiliate">
            <AffiliateTab />
          </TabsContent>

          <TabsContent value="support">
            <SupportTab />
          </TabsContent>
        </Tabs>
      </main>

    </div>
  );
}
