import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { MobileTabsList } from "@/components/ui/mobile-tabs-list";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Package, ArrowLeft, LogOut, Link2, Settings, Headset, Crown, Bell } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import DynamicNav from "@/components/DynamicNav";
import { useBranding } from "@/hooks/use-branding";
import { useAccountVip } from "./account/hooks/useAccountVip";
import { cn } from "@/lib/utils";
import OrdersTab from "./account/components/OrdersTab";
import AccountTab from "./account/components/AccountTab";
import AffiliateTab from "./account/components/AffiliateTab";
import SupportTab from "./account/components/SupportTab";

function CustomerNotificationBell({ getAuthHeader, onTabChange }: { getAuthHeader: () => Record<string, string>; onTabChange: (tab: string) => void }) {
  const queryClient = useQueryClient();

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/customer/notifications/unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/customer/notifications/unread-count", {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const { data: notificationsData } = useQuery<{ notifications: any[]; total: number }>({
    queryKey: ["/api/customer/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/customer/notifications?limit=10", {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return { notifications: [], total: 0 };
      return res.json();
    },
    staleTime: 15000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/customer/notifications/${id}/read`, {
        method: "PATCH",
        headers: { ...getAuthHeader() },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/customer/notifications/mark-all-read", {
        method: "PATCH",
        headers: { ...getAuthHeader() },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/notifications"] });
    },
  });

  const unreadCount = unreadData?.count ?? 0;
  const items = notificationsData?.notifications ?? [];

  const handleClick = (n: any) => {
    if (!n.isRead) markReadMutation.mutate(n.id);
    if (n.linkUrl) {
      const tabMatch = n.linkUrl.match(/[?&]tab=(\w+)/);
      if (tabMatch) {
        onTabChange(tabMatch[1]);
      }
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-customer-notifications">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground" data-testid="badge-customer-notification-count">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0 text-sm">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); markAllReadMutation.mutate(); }}
              className="text-xs text-primary hover:underline"
              data-testid="button-customer-mark-all-read"
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          items.map((n) => (
            <DropdownMenuItem
              key={n.id}
              onClick={() => handleClick(n)}
              className={cn(
                "flex flex-col items-start gap-1 py-2.5 px-3 cursor-pointer",
                !n.isRead && "bg-primary/5"
              )}
              data-testid={`customer-notification-item-${n.id}`}
            >
              <div className="flex items-start justify-between w-full gap-2">
                <span className={cn("text-xs font-medium line-clamp-1", !n.isRead && "text-foreground")}>{n.title}</span>
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
              </div>
              <span className="text-xs text-muted-foreground line-clamp-2">{n.body}</span>
              <span className="text-[10px] text-muted-foreground">{formatTime(n.createdAt)}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function MyAccount() {
  const [, setLocation] = useLocation();
  const { logoSrc, companyName } = useBranding();
  const { customer: authCustomer, isLoading: authLoading, isAuthenticated, logout, getAuthHeader, getToken } = useCustomerAuth();
  const initialTab = new URLSearchParams(window.location.search).get("tab") || "orders";
  const [activeTab, setActiveTab] = useState(initialTab);
  const { vipData } = useAccountVip();
  const customerToken = isAuthenticated ? getToken() || undefined : undefined;

  useRealtimeNotifications({ role: "customer", token: customerToken, enabled: isAuthenticated && !!customerToken });

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

  const [prefillOrderId, setPrefillOrderId] = useState<string | undefined>(undefined);

  const handleTabChange = (value: string) => {
    if (value === "affiliate") {
      setLocation('/affiliate-portal');
      return;
    }
    setActiveTab(value);
  };

  const handleContactSupport = (orderId?: string) => {
    setPrefillOrderId(orderId);
    setActiveTab("support");
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
            <CustomerNotificationBell getAuthHeader={getAuthHeader} onTabChange={setActiveTab} />
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
            <OrdersTab onContactSupport={handleContactSupport} />
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
            <SupportTab prefillOrderId={prefillOrderId} onPrefillConsumed={() => setPrefillOrderId(undefined)} />
          </TabsContent>
        </Tabs>
      </main>

    </div>
  );
}
