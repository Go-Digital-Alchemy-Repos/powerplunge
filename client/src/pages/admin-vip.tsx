import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { Crown, Users, DollarSign, TrendingUp, Loader2, Save, Ban, Truck, Gift, Zap, Eye, Settings, UserPlus, Sparkles } from "lucide-react";
import AdminNav from "@/components/admin/AdminNav";

interface VipCustomer {
  id: string;
  customerId: string;
  status: string;
  tier: string;
  lifetimeSpendAtPromotion: number;
  orderCountAtPromotion: number;
  promotedAt: string;
  promotionType: string;
  revokedAt?: string;
  revokedReason?: string;
  customer?: {
    id: string;
    name: string;
    email: string;
  };
  currentStats?: {
    lifetimeSpend: number;
    orderCount: number;
  };
}

interface VipSettings {
  autoPromoteEnabled: boolean;
  lifetimeSpendThreshold: number;
  orderCountThreshold: number;
  freeShippingEnabled: boolean;
  freeShippingThreshold: number;
  exclusiveDiscountPercent: number;
  prioritySupportEnabled: boolean;
  earlyAccessEnabled: boolean;
}

interface VipAnalytics {
  totalVips: number;
  activeVips: number;
  vipRevenuePercent: number;
  vipAov: number;
  nonVipAov: number;
  aovUplift: number;
}

export default function AdminVip() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: settings, isLoading: loadingSettings } = useQuery<VipSettings>({
    queryKey: ["/api/vip/admin/settings"],
    queryFn: async () => {
      const res = await fetch("/api/vip/admin/settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  const { data: vipCustomers = [], isLoading: loadingCustomers } = useQuery<VipCustomer[]>({
    queryKey: ["/api/vip/admin/customers"],
    queryFn: async () => {
      const res = await fetch("/api/vip/admin/customers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch VIP customers");
      return res.json();
    },
  });

  const { data: analytics, isLoading: loadingAnalytics } = useQuery<VipAnalytics>({
    queryKey: ["/api/vip/admin/analytics"],
    queryFn: async () => {
      const res = await fetch("/api/vip/admin/analytics", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  const [localSettings, setLocalSettings] = useState<VipSettings | null>(null);

  const updateSettings = useMutation({
    mutationFn: async (data: Partial<VipSettings>) => {
      const res = await fetch("/api/vip/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "VIP settings updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/vip/admin/settings"] });
    },
    onError: () => {
      toast({ title: "Failed to update settings", variant: "destructive" });
    },
  });

  const promoteCustomer = useMutation({
    mutationFn: async (customerId: string) => {
      const res = await fetch(`/api/vip/admin/promote/${customerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Manually promoted by admin" }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to promote customer");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Customer promoted to VIP" });
      queryClient.invalidateQueries({ queryKey: ["/api/vip/admin/customers"] });
    },
  });

  const revokeVip = useMutation({
    mutationFn: async ({ customerId, reason }: { customerId: string; reason: string }) => {
      const res = await fetch(`/api/vip/admin/revoke/${customerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to revoke VIP status");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "VIP status revoked" });
      queryClient.invalidateQueries({ queryKey: ["/api/vip/admin/customers"] });
    },
  });

  const currentSettings = localSettings || settings;
  const activeVips = vipCustomers.filter(v => v.status === "active");
  const filteredVips = activeVips.filter(v =>
    v.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access VIP program. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="vip" role={role} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold" data-testid="text-page-title">VIP Program</h1>
            <p className="text-muted-foreground">Manage VIP customers and configure benefits</p>
          </div>
        </div>

        <Tabs defaultValue="analytics">
              <TabsList className="mb-6">
                <TabsTrigger value="analytics" className="gap-2">
                  <TrendingUp className="w-4 h-4" /> Analytics
                </TabsTrigger>
                <TabsTrigger value="customers" className="gap-2">
                  <Users className="w-4 h-4" /> VIP Customers
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-2">
                  <Settings className="w-4 h-4" /> Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analytics">
                {loadingAnalytics ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : analytics ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Active VIPs</CardDescription>
                          <CardTitle className="text-2xl flex items-center gap-2">
                            <Crown className="w-5 h-5 text-amber-500" />
                            {analytics.activeVips}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">
                            of {analytics.totalVips} total VIPs
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>VIP Revenue %</CardDescription>
                          <CardTitle className="text-2xl text-green-500">
                            {(analytics.vipRevenuePercent * 100).toFixed(1)}%
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">of total revenue</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>VIP AOV</CardDescription>
                          <CardTitle className="text-2xl">
                            ${(analytics.vipAov / 100).toLocaleString()}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">
                            vs ${(analytics.nonVipAov / 100).toLocaleString()} non-VIP
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>AOV Uplift</CardDescription>
                          <CardTitle className="text-2xl text-primary">
                            +{(analytics.aovUplift * 100).toFixed(0)}%
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">VIP vs non-VIP</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Crown className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No VIP Data Yet</h3>
                      <p className="text-muted-foreground">VIP analytics will appear once you have VIP customers</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="customers">
                <Card className="mb-6">
                  <CardContent className="pt-6">
                    <Input
                      placeholder="Search VIP customers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-md"
                    />
                  </CardContent>
                </Card>

                {loadingCustomers ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : filteredVips.length > 0 ? (
                  <div className="space-y-3">
                    {filteredVips.map((vip) => (
                      <Card key={vip.id}>
                        <CardContent className="py-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-400 rounded-full flex items-center justify-center">
                              <Crown className="w-5 h-5 text-black" />
                            </div>
                            <div>
                              <p className="font-medium">{vip.customer?.name || "Unknown"}</p>
                              <p className="text-sm text-muted-foreground">{vip.customer?.email}</p>
                            </div>
                            <Badge className="ml-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-0">
                              {vip.tier}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Lifetime Spend</p>
                              <p className="font-semibold">
                                ${((vip.currentStats?.lifetimeSpend || vip.lifetimeSpendAtPromotion) / 100).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Orders</p>
                              <p className="font-semibold">
                                {vip.currentStats?.orderCount || vip.orderCountAtPromotion}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">VIP Since</p>
                              <p className="font-semibold">
                                {new Date(vip.promotedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => {
                                const reason = prompt("Reason for revoking VIP status:");
                                if (reason) {
                                  revokeVip.mutate({ customerId: vip.customerId, reason });
                                }
                              }}
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No VIP Customers</h3>
                      <p className="text-muted-foreground">
                        {searchTerm ? "No VIPs match your search" : "VIP customers will appear here once they qualify"}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="settings">
                {loadingSettings ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : currentSettings ? (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <UserPlus className="w-5 h-5" />
                          Auto-Promotion Settings
                        </CardTitle>
                        <CardDescription>Configure when customers automatically become VIPs</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Auto-promote eligible customers</Label>
                            <p className="text-sm text-muted-foreground">
                              Automatically promote customers who meet the thresholds
                            </p>
                          </div>
                          <Switch
                            checked={currentSettings.autoPromoteEnabled}
                            onCheckedChange={(v) => setLocalSettings({ ...currentSettings, autoPromoteEnabled: v })}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Lifetime Spend Threshold ($)</Label>
                            <Input
                              type="number"
                              value={(currentSettings.lifetimeSpendThreshold / 100)}
                              onChange={(e) => setLocalSettings({
                                ...currentSettings,
                                lifetimeSpendThreshold: parseFloat(e.target.value) * 100 || 0,
                              })}
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label>Order Count Threshold</Label>
                            <Input
                              type="number"
                              value={currentSettings.orderCountThreshold}
                              onChange={(e) => setLocalSettings({
                                ...currentSettings,
                                orderCountThreshold: parseInt(e.target.value) || 0,
                              })}
                              className="mt-2"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5" />
                          VIP Benefits
                        </CardTitle>
                        <CardDescription>Configure the perks VIP customers receive</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Truck className="w-5 h-5 text-green-500" />
                            <div>
                              <Label>Free Shipping</Label>
                              <p className="text-sm text-muted-foreground">VIPs get free shipping on all orders</p>
                            </div>
                          </div>
                          <Switch
                            checked={currentSettings.freeShippingEnabled}
                            onCheckedChange={(v) => setLocalSettings({ ...currentSettings, freeShippingEnabled: v })}
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Gift className="w-5 h-5 text-primary" />
                            <div>
                              <Label>Exclusive Discount (%)</Label>
                              <p className="text-sm text-muted-foreground">Discount applied at checkout</p>
                            </div>
                          </div>
                          <Input
                            type="number"
                            value={currentSettings.exclusiveDiscountPercent}
                            onChange={(e) => setLocalSettings({
                              ...currentSettings,
                              exclusiveDiscountPercent: parseInt(e.target.value) || 0,
                            })}
                            className="w-24"
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-yellow-500" />
                            <div>
                              <Label>Priority Support</Label>
                              <p className="text-sm text-muted-foreground">VIPs get priority customer support</p>
                            </div>
                          </div>
                          <Switch
                            checked={currentSettings.prioritySupportEnabled}
                            onCheckedChange={(v) => setLocalSettings({ ...currentSettings, prioritySupportEnabled: v })}
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Eye className="w-5 h-5 text-purple-500" />
                            <div>
                              <Label>Early Access</Label>
                              <p className="text-sm text-muted-foreground">VIPs see new products first</p>
                            </div>
                          </div>
                          <Switch
                            checked={currentSettings.earlyAccessEnabled}
                            onCheckedChange={(v) => setLocalSettings({ ...currentSettings, earlyAccessEnabled: v })}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Button
                      onClick={() => localSettings && updateSettings.mutate(localSettings)}
                      disabled={updateSettings.isPending || !localSettings}
                      className="gap-2"
                    >
                      {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Settings
                    </Button>
                  </div>
                ) : null}
              </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
