import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { MobileTabsList } from "@/components/ui/mobile-tabs-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCcw,
  BarChart3,
  PieChart,
  Crown,
  Link2,
  Sparkles,
  MousePointer,
  Target,
} from "lucide-react";
import AdminNav from "@/components/admin/AdminNav";
import { useAdmin } from "@/hooks/use-admin";
import { Card as AccessCard, CardContent as AccessCardContent } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";
import { format, subDays, startOfMonth, startOfYear } from "date-fns";
import { useThemeChartColors } from "@/hooks/use-theme-colors";

interface RevenueMetrics {
  grossRevenue: number;
  netRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  refundTotal: number;
  refundRate: number;
  affiliateRevenue: number;
  affiliateRevenuePercent: number;
  topProductId: string | null;
  topProductName: string | null;
  topProductRevenue: number;
}

interface TimeSeriesPoint {
  date: string;
  value: number;
}

interface ProductRevenue {
  productId: string;
  productName: string;
  revenue: number;
  unitsSold: number;
  orderCount: number;
}

interface AffiliateRevenue {
  affiliateId: string;
  affiliateCode: string;
  customerName: string;
  revenue: number;
  orderCount: number;
  commission: number;
}

interface CustomerLTV {
  customerId: string;
  customerName: string;
  email: string;
  totalSpent: number;
  orderCount: number;
  firstOrderDate: string;
  lastOrderDate: string;
}

interface UpsellAnalytics {
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  clickRate: number;
  conversionRate: number;
  upsellRevenue: number;
  revenueUplift: number;
  topUpsells: Array<{
    productName: string;
    relatedProductName: string;
    conversions: number;
    revenue: number;
  }>;
}

interface VipAnalytics {
  totalVips: number;
  activeVips: number;
  vipRevenue: number;
  vipRevenuePercent: number;
  vipAov: number;
  nonVipAov: number;
  aovUplift: number;
}

type DatePreset = "today" | "7d" | "30d" | "mtd" | "ytd" | "custom";

const PRESET_LABELS: Record<DatePreset, string> = {
  today: "Today",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  mtd: "Month to Date",
  ytd: "Year to Date",
  custom: "Custom Range",
};


function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getQueryParams(
  preset: DatePreset,
  customStart: string,
  customEnd: string,
  channel: string,
  productId: string
): string {
  const params = new URLSearchParams();
  
  if (preset === "custom" && customStart && customEnd) {
    params.set("startDate", customStart);
    params.set("endDate", customEnd);
  } else {
    params.set("preset", preset);
  }
  
  if (channel && channel !== "all") {
    params.set("channel", channel);
  }
  
  if (productId) {
    params.set("productId", productId);
  }
  
  return params.toString();
}

export default function AdminRevenue() {
  const [, setLocation] = useLocation();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  const tc = useThemeChartColors();
  const [preset, setPreset] = useState<DatePreset>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [channel, setChannel] = useState("all");
  const [productId, setProductId] = useState("");
  const [activeTab, setActiveTab] = useState("products");

  const queryParams = getQueryParams(preset, customStart, customEnd, channel, productId);

  const { data: metrics, isLoading: metricsLoading } = useQuery<RevenueMetrics>({
    queryKey: ["/api/admin/revenue/metrics", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/admin/revenue/metrics?${queryParams}`, { credentials: "include" });
      if (res.status === 401) {
        setLocation("/admin/login");
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error("Failed to fetch metrics");
      return res.json();
    },
  });

  const { data: revenueSeries } = useQuery<TimeSeriesPoint[]>({
    queryKey: ["/api/admin/revenue/timeseries/revenue", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/admin/revenue/timeseries/revenue?${queryParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch revenue series");
      return res.json();
    },
  });

  const { data: ordersSeries } = useQuery<TimeSeriesPoint[]>({
    queryKey: ["/api/admin/revenue/timeseries/orders", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/admin/revenue/timeseries/orders?${queryParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch orders series");
      return res.json();
    },
  });

  const { data: aovSeries } = useQuery<TimeSeriesPoint[]>({
    queryKey: ["/api/admin/revenue/timeseries/aov", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/admin/revenue/timeseries/aov?${queryParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch AOV series");
      return res.json();
    },
  });

  const { data: refundsSeries } = useQuery<TimeSeriesPoint[]>({
    queryKey: ["/api/admin/revenue/timeseries/refunds", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/admin/revenue/timeseries/refunds?${queryParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch refunds series");
      return res.json();
    },
  });

  const { data: affiliateVsDirect } = useQuery<{ affiliate: number; direct: number }>({
    queryKey: ["/api/admin/revenue/affiliate-vs-direct", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/admin/revenue/affiliate-vs-direct?${queryParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch affiliate vs direct");
      return res.json();
    },
  });

  const { data: topProducts } = useQuery<ProductRevenue[]>({
    queryKey: ["/api/admin/revenue/top-products", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/admin/revenue/top-products?${queryParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch top products");
      return res.json();
    },
  });

  const { data: topAffiliates } = useQuery<AffiliateRevenue[]>({
    queryKey: ["/api/admin/revenue/top-affiliates", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/admin/revenue/top-affiliates?${queryParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch top affiliates");
      return res.json();
    },
  });

  const { data: topCustomers } = useQuery<CustomerLTV[]>({
    queryKey: ["/api/admin/revenue/top-customers", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/admin/revenue/top-customers?${queryParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch top customers");
      return res.json();
    },
  });

  const { data: availableProducts } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/admin/revenue/products"],
    queryFn: async () => {
      const res = await fetch("/api/admin/revenue/products", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const { data: upsellAnalytics } = useQuery<UpsellAnalytics>({
    queryKey: ["/api/upsells/analytics", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/upsells/analytics?${queryParams}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: vipAnalytics } = useQuery<VipAnalytics>({
    queryKey: ["/api/vip/admin/analytics", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/vip/admin/analytics?${queryParams}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const pieData = affiliateVsDirect
    ? [
        { name: "Affiliate", value: affiliateVsDirect.affiliate },
        { name: "Direct", value: affiliateVsDirect.direct },
      ]
    : [];

  const chartRevenue = revenueSeries?.map((p) => ({
    date: format(new Date(p.date), "MMM d"),
    revenue: p.value / 100,
  })) || [];

  const chartOrders = ordersSeries?.map((p) => ({
    date: format(new Date(p.date), "MMM d"),
    orders: p.value,
  })) || [];

  const chartAOV = aovSeries?.map((p) => ({
    date: format(new Date(p.date), "MMM d"),
    aov: p.value / 100,
  })) || [];

  const chartRefunds = refundsSeries?.map((p) => ({
    date: format(new Date(p.date), "MMM d"),
    refunds: p.value / 100,
  })) || [];

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access insights. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="insights" role={role} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold">Insights</h2>
            <p className="text-muted-foreground mt-1">Track performance, identify trends, and optimize growth</p>
          </div>
        </div>

        {!metricsLoading && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-8">
            <MobileTabsList
              tabs={[
                { value: "products", label: "Top Products" },
                { value: "affiliates", label: "Top Affiliates" },
                { value: "customers", label: "Top Customers" },
                { value: "upsells", label: "Top Upsells", icon: <Link2 className="w-4 h-4" /> },
                { value: "vip", label: "VIP Stats", icon: <Crown className="w-4 h-4" /> },
              ]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <CardTitle>Top Products by Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Units Sold</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topProducts?.length ? (
                        topProducts.map((product) => (
                          <TableRow key={product.productId} data-testid={`row-product-${product.productId}`}>
                            <TableCell className="font-medium">{product.productName}</TableCell>
                            <TableCell className="text-right text-primary">{formatCurrency(product.revenue)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatNumber(product.unitsSold)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatNumber(product.orderCount)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            No product data available for this period
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="affiliates">
              <Card>
                <CardHeader>
                  <CardTitle>Top Affiliates by Revenue Generated</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Affiliate</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topAffiliates?.length ? (
                        topAffiliates.map((affiliate) => (
                          <TableRow key={affiliate.affiliateId} data-testid={`row-affiliate-${affiliate.affiliateId}`}>
                            <TableCell className="font-medium">{affiliate.customerName}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-primary/30 text-primary">
                                {affiliate.affiliateCode}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-primary">{formatCurrency(affiliate.revenue)}</TableCell>
                            <TableCell className="text-right" style={{ color: tc.success }}>{formatCurrency(affiliate.commission)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatNumber(affiliate.orderCount)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No affiliate data available for this period
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customers">
              <Card>
                <CardHeader>
                  <CardTitle>Top Customers by Lifetime Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Total Spent</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead>First Order</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topCustomers?.length ? (
                        topCustomers.map((customer) => (
                          <TableRow key={customer.customerId} data-testid={`row-customer-${customer.customerId}`}>
                            <TableCell className="font-medium">{customer.customerName}</TableCell>
                            <TableCell className="text-muted-foreground">{customer.email}</TableCell>
                            <TableCell className="text-right text-primary">{formatCurrency(customer.totalSpent)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatNumber(customer.orderCount)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {customer.firstOrderDate ? format(new Date(customer.firstOrderDate), "MMM d, yyyy") : "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No customer data available for this period
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upsells">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="w-5 h-5" style={{ color: tc.accent }} />
                    Top Performing Upsells
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-muted-foreground text-sm">Total Impressions</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatNumber(upsellAnalytics?.totalImpressions || 0)}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-muted-foreground text-sm">Click Rate</p>
                      <p className="text-2xl font-bold text-primary">
                        {formatPercent((upsellAnalytics?.clickRate || 0) * 100)}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-muted-foreground text-sm">Attach Rate</p>
                      <p className="text-2xl font-bold" style={{ color: tc.success }}>
                        {formatPercent((upsellAnalytics?.conversionRate || 0) * 100)}
                      </p>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Upsell</TableHead>
                        <TableHead className="text-right">Conversions</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upsellAnalytics?.topUpsells?.length ? (
                        upsellAnalytics.topUpsells.map((upsell, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{upsell.productName}</TableCell>
                            <TableCell style={{ color: tc.accent }}>{upsell.relatedProductName}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatNumber(upsell.conversions)}</TableCell>
                            <TableCell className="text-right text-primary">{formatCurrency(upsell.revenue)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            No upsell data available for this period
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vip">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5" style={{ color: tc.warning }} />
                    VIP Customer Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4 border border-border">
                      <p className="text-muted-foreground text-sm flex items-center gap-1">
                        <Crown className="w-4 h-4" style={{ color: tc.warning }} />
                        Active VIPs
                      </p>
                      <p className="text-2xl font-bold" style={{ color: tc.warning }}>
                        {formatNumber(vipAnalytics?.activeVips || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        of {formatNumber(vipAnalytics?.totalVips || 0)} total
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-muted-foreground text-sm">VIP Revenue Share</p>
                      <p className="text-2xl font-bold text-primary">
                        {formatPercent((vipAnalytics?.vipRevenuePercent || 0) * 100)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatCurrency(vipAnalytics?.vipRevenue || 0)}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-muted-foreground text-sm">VIP Avg Order</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(vipAnalytics?.vipAov || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">per order</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-muted-foreground text-sm">Non-VIP Avg Order</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(vipAnalytics?.nonVipAov || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">per order</p>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
                    <h4 className="text-foreground font-medium mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" style={{ color: tc.warning }} />
                      VIP Impact Summary
                    </h4>
                    <p className="text-muted-foreground text-sm">
                      VIP customers spend <span className="font-medium" style={{ color: tc.warning }}>
                        {formatPercent((vipAnalytics?.aovUplift || 0) * 100)} more
                      </span> per order than regular customers and contribute{" "}
                      <span className="text-primary font-medium">
                        {formatPercent((vipAnalytics?.vipRevenuePercent || 0) * 100)}
                      </span> of your total revenue.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground text-sm">Date Range</Label>
                <Select value={preset} onValueChange={(v) => setPreset(v as DatePreset)}>
                  <SelectTrigger className="w-40" data-testid="filter-preset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRESET_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {preset === "custom" && (
                <>
                  <div className="flex flex-col gap-2">
                    <Label className="text-muted-foreground text-sm">Start Date</Label>
                    <Input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-40"
                      data-testid="filter-start-date"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-muted-foreground text-sm">End Date</Label>
                    <Input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-40"
                      data-testid="filter-end-date"
                    />
                  </div>
                </>
              )}

              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground text-sm">Channel</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger className="w-36" data-testid="filter-channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    <SelectItem value="affiliate">Affiliate</SelectItem>
                    <SelectItem value="direct">Direct</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground text-sm">Product</Label>
                <Select value={productId || "all"} onValueChange={(v) => setProductId(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-48" data-testid="filter-product">
                    <SelectValue placeholder="All Products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {availableProducts?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {metricsLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCcw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card data-testid="card-gross-revenue">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Gross Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {formatCurrency(metrics?.grossRevenue || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{PRESET_LABELS[preset]}</p>
                </CardContent>
              </Card>

              <Card data-testid="card-net-revenue">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Net Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" style={{ color: tc.success }}>
                    {formatCurrency(metrics?.netRevenue || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">After refunds</p>
                </CardContent>
              </Card>

              <Card data-testid="card-aov">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Average Order Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {formatCurrency(metrics?.averageOrderValue || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{formatNumber(metrics?.totalOrders || 0)} orders</p>
                </CardContent>
              </Card>

              <Card data-testid="card-refund-rate">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Refund Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" style={{ color: tc.warning }}>
                    {formatPercent(metrics?.refundRate || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{formatCurrency(metrics?.refundTotal || 0)} refunded</p>
                </CardContent>
              </Card>

              <Card data-testid="card-affiliate-revenue">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Affiliate Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" style={{ color: tc.accent }}>
                    {formatCurrency(metrics?.affiliateRevenue || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{formatPercent(metrics?.affiliateRevenuePercent || 0)} of total</p>
                </CardContent>
              </Card>

              <Card data-testid="card-total-orders">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {formatNumber(metrics?.totalOrders || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Completed orders</p>
                </CardContent>
              </Card>

              <Card className="md:col-span-2" data-testid="card-top-product">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Top Product</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold text-foreground">
                        {metrics?.topProductName || "No data"}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Best seller by revenue</p>
                    </div>
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      {formatCurrency(metrics?.topProductRevenue || 0)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card data-testid="card-upsell-revenue">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Link2 className="w-4 h-4" style={{ color: tc.accent }} />
                    Upsell Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" style={{ color: tc.accent }}>
                    {formatCurrency(upsellAnalytics?.upsellRevenue || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    +{formatPercent((upsellAnalytics?.revenueUplift || 0) * 100)} uplift
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-upsell-conversion">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Target className="w-4 h-4" style={{ color: tc.success }} />
                    Upsell Conversion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" style={{ color: tc.success }}>
                    {formatPercent((upsellAnalytics?.conversionRate || 0) * 100)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatNumber(upsellAnalytics?.totalConversions || 0)} conversions
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-vip-revenue">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Crown className="w-4 h-4" style={{ color: tc.warning }} />
                    VIP Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" style={{ color: tc.warning }}>
                    {formatCurrency(vipAnalytics?.vipRevenue || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatPercent((vipAnalytics?.vipRevenuePercent || 0) * 100)} of total
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-vip-aov">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: tc.warning }} />
                    VIP AOV Uplift
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    +{formatPercent((vipAnalytics?.aovUplift || 0) * 100)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(vipAnalytics?.vipAov || 0)} vs {formatCurrency(vipAnalytics?.nonVipAov || 0)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartRevenue}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                        />
                        <Line type="monotone" dataKey="revenue" stroke={tc.primary} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Orders Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartOrders}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <Bar dataKey="orders" fill={tc.info} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Affiliate vs Direct Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center">
                    {pieData.some((d) => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={tc.pieColors[index % tc.pieColors.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
                            formatter={(value: number) => formatCurrency(value)}
                          />
                        </RePieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-muted-foreground">No revenue data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>AOV Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartAOV}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, "AOV"]}
                        />
                        <Line type="monotone" dataKey="aov" stroke={tc.success} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Refunds Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartRefunds}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, "Refunds"]}
                        />
                        <Bar dataKey="refunds" fill={tc.error} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
