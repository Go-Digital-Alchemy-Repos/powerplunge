import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { BarChart3, Save, DollarSign, ShoppingCart, Users, TrendingUp, CheckCircle2, Activity } from "lucide-react";
import AdminNav from "@/components/admin/AdminNav";

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  averageOrderValue: number;
  topProducts: { productId: string; productName: string; totalSold: number; revenue: number }[];
}

function AnalyticsOverview() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard"],
    staleTime: 60 * 1000,
  });

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-16 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statBoxes = [
    { label: "Total Revenue", value: formatCurrency(stats?.totalRevenue || 0), icon: DollarSign, color: "text-green-500" },
    { label: "Total Orders", value: String(stats?.totalOrders || 0), icon: ShoppingCart, color: "text-blue-500" },
    { label: "Customers", value: String(stats?.totalCustomers || 0), icon: Users, color: "text-purple-500" },
    { label: "Avg. Order Value", value: formatCurrency(stats?.averageOrderValue || 0), icon: TrendingUp, color: "text-cyan-500" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statBoxes.map((s) => (
          <Card key={s.label} data-testid={`stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="text-xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats?.topProducts && stats.topProducts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Top Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topProducts.slice(0, 5).map((p, i) => (
                <div key={p.productId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <span className="font-medium truncate max-w-[200px]">{p.productName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{p.totalSold} sold</span>
                    <span className="font-medium text-foreground">{formatCurrency(p.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GA4TrackingStatus({ measurementId }: { measurementId?: string }) {
  const ga4Events = [
    { name: "view_item_list", description: "Shop page product listing", location: "Shop page" },
    { name: "view_item", description: "Individual product view", location: "Product detail page" },
    { name: "add_to_cart", description: "Item added to cart", location: "Home, Shop, Product pages" },
    { name: "remove_from_cart", description: "Item removed from cart", location: "Checkout page" },
    { name: "begin_checkout", description: "Checkout started (deduplicated)", location: "Checkout page" },
    { name: "add_shipping_info", description: "Shipping details submitted", location: "Checkout page" },
    { name: "add_payment_info", description: "Payment step reached", location: "Checkout page" },
    { name: "purchase", description: "Order completed (deduplicated)", location: "Checkout & Order success" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          GA4 Ecommerce Event Tracking
        </CardTitle>
        <CardDescription>
          {measurementId
            ? `Events are being sent to ${measurementId}. All events respect the consent manager.`
            : "Set a GA4 Measurement ID above to start sending ecommerce events to Google Analytics."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {ga4Events.map((evt) => (
            <div key={evt.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 text-sm" data-testid={`ga4-event-${evt.name}`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${measurementId ? "text-green-500" : "text-muted-foreground"}`} />
                <div>
                  <span className="font-mono font-medium">{evt.name}</span>
                  <span className="text-muted-foreground ml-2 hidden sm:inline">— {evt.description}</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground hidden md:inline">{evt.location}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminAnalytics() {
  const { admin } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [gaMeasurementId, setGaMeasurementId] = useState("");

  const { data: settings, isLoading } = useQuery<{ gaMeasurementId?: string }>({
    queryKey: ["/api/admin/settings"],
  });

  useEffect(() => {
    if (settings) {
      setGaMeasurementId(settings.gaMeasurementId || "");
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ gaMeasurementId }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
      toast({ title: "Analytics settings saved" });
    },
    onError: () => {
      toast({ title: "Error saving settings", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  if (!admin) return null;

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="analytics" role={admin.role} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Ecommerce performance overview and Google Analytics configuration
          </p>
        </div>

        <div className="space-y-6">
          <AnalyticsOverview />

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Google Analytics
                </CardTitle>
                <CardDescription>
                  Connect your Google Analytics 4 property to track visitor behavior and e-commerce performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gaMeasurementId">GA4 Measurement ID</Label>
                  <Input
                    id="gaMeasurementId"
                    value={gaMeasurementId}
                    onChange={(e) => setGaMeasurementId(e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                    data-testid="input-ga-measurement-id"
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter your GA4 Measurement ID (starts with "G-"). Find it in your Google Analytics property settings under Data Streams.
                  </p>
                </div>
              </CardContent>
            </Card>

            <GA4TrackingStatus measurementId={gaMeasurementId} />

            <Button type="submit" className="w-full gap-2" disabled={updateMutation.isPending} data-testid="button-save-analytics-settings">
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? "Saving..." : "Save Analytics Settings"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
