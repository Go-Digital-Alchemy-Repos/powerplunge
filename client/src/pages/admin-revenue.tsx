import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const CHART_COLORS = ["#67e8f9", "#a78bfa", "#f472b6", "#34d399", "#fbbf24"];

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
  const [preset, setPreset] = useState<DatePreset>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [channel, setChannel] = useState("all");
  const [productId, setProductId] = useState("");

  const queryParams = getQueryParams(preset, customStart, customEnd, channel, productId);

  const { data: metrics, isLoading: metricsLoading } = useQuery<RevenueMetrics>({
    queryKey: ["/api/admin/revenue/metrics", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/admin/revenue/metrics?${queryParams}`);
      if (res.status === 401) {
        setLocation("/admin");
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error("Failed to fetch metrics");
      return res.json();
    },
  });

  const { data: revenueSeries } = useQuery<TimeSeriesPoint[]>({
    queryKey: ["/api/admin/revenue/timeseries/revenue", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/admin/revenue/timeseries/revenue?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch revenue series");
      return res.json();
    },
  });

  const { data: ordersSeries } = useQuery<TimeSeriesPoint[]>({
    queryKey: ["/api/admin/revenue/timeseries/orders", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/admin/revenue/timeseries/orders?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch orders series");
      return res.json();
    },
  });

  const { data: aovSeries } = useQuery<TimeSeriesPoint[]>({
    queryKey: ["/api/admin/revenue/timeseries/aov", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/admin/revenue/timeseries/aov?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch AOV series");
      return res.json();
    },
  });

  const { data: refundsSeries } = useQuery<TimeSeriesPoint[]>({
    queryKey: ["/api/admin/revenue/timeseries/refunds", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/admin/revenue/timeseries/refunds?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch refunds series");
      return res.json();
    },
  });

  const { data: affiliateVsDirect } = useQuery<{ affiliate: number; direct: number }>({
    queryKey: ["/api/admin/revenue/affiliate-vs-direct", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/admin/revenue/affiliate-vs-direct?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch affiliate vs direct");
      return res.json();
    },
  });

  const { data: topProducts } = useQuery<ProductRevenue[]>({
    queryKey: ["/api/admin/revenue/top-products", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/admin/revenue/top-products?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch top products");
      return res.json();
    },
  });

  const { data: topAffiliates } = useQuery<AffiliateRevenue[]>({
    queryKey: ["/api/admin/revenue/top-affiliates", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/admin/revenue/top-affiliates?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch top affiliates");
      return res.json();
    },
  });

  const { data: topCustomers } = useQuery<CustomerLTV[]>({
    queryKey: ["/api/admin/revenue/top-customers", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/admin/revenue/top-customers?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch top customers");
      return res.json();
    },
  });

  const { data: availableProducts } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/admin/revenue/products"],
    queryFn: async () => {
      const res = await fetch("/api/admin/revenue/products");
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

        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-white">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-gray-400 text-sm">Date Range</Label>
                <Select value={preset} onValueChange={(v) => setPreset(v as DatePreset)}>
                  <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white" data-testid="filter-preset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {Object.entries(PRESET_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key} className="text-white">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {preset === "custom" && (
                <>
                  <div className="flex flex-col gap-2">
                    <Label className="text-gray-400 text-sm">Start Date</Label>
                    <Input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-40 bg-gray-800 border-gray-700 text-white"
                      data-testid="filter-start-date"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-gray-400 text-sm">End Date</Label>
                    <Input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-40 bg-gray-800 border-gray-700 text-white"
                      data-testid="filter-end-date"
                    />
                  </div>
                </>
              )}

              <div className="flex flex-col gap-2">
                <Label className="text-gray-400 text-sm">Channel</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger className="w-36 bg-gray-800 border-gray-700 text-white" data-testid="filter-channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all" className="text-white">All Channels</SelectItem>
                    <SelectItem value="affiliate" className="text-white">Affiliate</SelectItem>
                    <SelectItem value="direct" className="text-white">Direct</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-gray-400 text-sm">Product</Label>
                <Select value={productId || "all"} onValueChange={(v) => setProductId(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white" data-testid="filter-product">
                    <SelectValue placeholder="All Products" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all" className="text-white">All Products</SelectItem>
                    {availableProducts?.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-white">
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
            <RefreshCcw className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="bg-gray-900 border-gray-800" data-testid="card-gross-revenue">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Gross Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(metrics?.grossRevenue || 0)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{PRESET_LABELS[preset]}</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800" data-testid="card-net-revenue">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Net Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">
                    {formatCurrency(metrics?.netRevenue || 0)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">After refunds</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800" data-testid="card-aov">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Average Order Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(metrics?.averageOrderValue || 0)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{formatNumber(metrics?.totalOrders || 0)} orders</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800" data-testid="card-refund-rate">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Refund Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-400">
                    {formatPercent(metrics?.refundRate || 0)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{formatCurrency(metrics?.refundTotal || 0)} refunded</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800" data-testid="card-affiliate-revenue">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Affiliate Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-400">
                    {formatCurrency(metrics?.affiliateRevenue || 0)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{formatPercent(metrics?.affiliateRevenuePercent || 0)} of total</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800" data-testid="card-total-orders">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Total Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {formatNumber(metrics?.totalOrders || 0)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Completed orders</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800 md:col-span-2" data-testid="card-top-product">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Top Product</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold text-white">
                        {metrics?.topProductName || "No data"}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Best seller by revenue</p>
                    </div>
                    <Badge className="bg-cyan-400/20 text-cyan-400 border-cyan-400/30">
                      {formatCurrency(metrics?.topProductRevenue || 0)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upsell & VIP Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="bg-gradient-to-br from-gray-900 to-purple-900/30 border-purple-800/30" data-testid="card-upsell-revenue">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-purple-400" />
                    Upsell Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-400">
                    {formatCurrency(upsellAnalytics?.upsellRevenue || 0)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    +{formatPercent((upsellAnalytics?.revenueUplift || 0) * 100)} uplift
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800" data-testid="card-upsell-conversion">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-400" />
                    Upsell Conversion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">
                    {formatPercent((upsellAnalytics?.conversionRate || 0) * 100)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatNumber(upsellAnalytics?.totalConversions || 0)} conversions
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-amber-900/30 border-amber-800/30" data-testid="card-vip-revenue">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    VIP Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-400">
                    {formatCurrency(vipAnalytics?.vipRevenue || 0)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatPercent((vipAnalytics?.vipRevenuePercent || 0) * 100)} of total
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800" data-testid="card-vip-aov">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    VIP AOV Uplift
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    +{formatPercent((vipAnalytics?.aovUplift || 0) * 100)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatCurrency(vipAnalytics?.vipAov || 0)} vs {formatCurrency(vipAnalytics?.nonVipAov || 0)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Revenue Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartRevenue}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                          labelStyle={{ color: "#fff" }}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                        />
                        <Line type="monotone" dataKey="revenue" stroke="#67e8f9" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Orders Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartOrders}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                          labelStyle={{ color: "#fff" }}
                        />
                        <Bar dataKey="orders" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Affiliate vs Direct Revenue</CardTitle>
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
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                            formatter={(value: number) => formatCurrency(value)}
                          />
                        </RePieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-gray-500">No revenue data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">AOV Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartAOV}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                          labelStyle={{ color: "#fff" }}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, "AOV"]}
                        />
                        <Line type="monotone" dataKey="aov" stroke="#34d399" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white">Refunds Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartRefunds}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                          labelStyle={{ color: "#fff" }}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, "Refunds"]}
                        />
                        <Bar dataKey="refunds" fill="#f87171" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="products" className="w-full">
              <TabsList className="bg-gray-800 border-gray-700">
                <TabsTrigger value="products" className="data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-400">
                  Top Products
                </TabsTrigger>
                <TabsTrigger value="affiliates" className="data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-400">
                  Top Affiliates
                </TabsTrigger>
                <TabsTrigger value="customers" className="data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-400">
                  Top Customers
                </TabsTrigger>
                <TabsTrigger value="upsells" className="data-[state=active]:bg-purple-400/20 data-[state=active]:text-purple-400">
                  <Link2 className="w-4 h-4 mr-1" />
                  Top Upsells
                </TabsTrigger>
                <TabsTrigger value="vip" className="data-[state=active]:bg-amber-400/20 data-[state=active]:text-amber-400">
                  <Crown className="w-4 h-4 mr-1" />
                  VIP Stats
                </TabsTrigger>
              </TabsList>

              <TabsContent value="products">
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">Top Products by Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-800">
                          <TableHead className="text-gray-400">Product</TableHead>
                          <TableHead className="text-gray-400 text-right">Revenue</TableHead>
                          <TableHead className="text-gray-400 text-right">Units Sold</TableHead>
                          <TableHead className="text-gray-400 text-right">Orders</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topProducts?.length ? (
                          topProducts.map((product) => (
                            <TableRow key={product.productId} className="border-gray-800" data-testid={`row-product-${product.productId}`}>
                              <TableCell className="text-white font-medium">{product.productName}</TableCell>
                              <TableCell className="text-right text-cyan-400">{formatCurrency(product.revenue)}</TableCell>
                              <TableCell className="text-right text-gray-300">{formatNumber(product.unitsSold)}</TableCell>
                              <TableCell className="text-right text-gray-300">{formatNumber(product.orderCount)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-gray-500 py-8">
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
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">Top Affiliates by Revenue Generated</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-800">
                          <TableHead className="text-gray-400">Affiliate</TableHead>
                          <TableHead className="text-gray-400">Code</TableHead>
                          <TableHead className="text-gray-400 text-right">Revenue</TableHead>
                          <TableHead className="text-gray-400 text-right">Commission</TableHead>
                          <TableHead className="text-gray-400 text-right">Orders</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topAffiliates?.length ? (
                          topAffiliates.map((affiliate) => (
                            <TableRow key={affiliate.affiliateId} className="border-gray-800" data-testid={`row-affiliate-${affiliate.affiliateId}`}>
                              <TableCell className="text-white font-medium">{affiliate.customerName}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="border-purple-400/30 text-purple-400">
                                  {affiliate.affiliateCode}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-cyan-400">{formatCurrency(affiliate.revenue)}</TableCell>
                              <TableCell className="text-right text-green-400">{formatCurrency(affiliate.commission)}</TableCell>
                              <TableCell className="text-right text-gray-300">{formatNumber(affiliate.orderCount)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-gray-500 py-8">
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
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">Top Customers by Lifetime Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-800">
                          <TableHead className="text-gray-400">Customer</TableHead>
                          <TableHead className="text-gray-400">Email</TableHead>
                          <TableHead className="text-gray-400 text-right">Total Spent</TableHead>
                          <TableHead className="text-gray-400 text-right">Orders</TableHead>
                          <TableHead className="text-gray-400">First Order</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topCustomers?.length ? (
                          topCustomers.map((customer) => (
                            <TableRow key={customer.customerId} className="border-gray-800" data-testid={`row-customer-${customer.customerId}`}>
                              <TableCell className="text-white font-medium">{customer.customerName}</TableCell>
                              <TableCell className="text-gray-400">{customer.email}</TableCell>
                              <TableCell className="text-right text-cyan-400">{formatCurrency(customer.totalSpent)}</TableCell>
                              <TableCell className="text-right text-gray-300">{formatNumber(customer.orderCount)}</TableCell>
                              <TableCell className="text-gray-400">
                                {customer.firstOrderDate ? format(new Date(customer.firstOrderDate), "MMM d, yyyy") : "-"}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-gray-500 py-8">
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
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Link2 className="w-5 h-5 text-purple-400" />
                      Top Performing Upsells
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <p className="text-gray-400 text-sm">Total Impressions</p>
                        <p className="text-2xl font-bold text-white">
                          {formatNumber(upsellAnalytics?.totalImpressions || 0)}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <p className="text-gray-400 text-sm">Click Rate</p>
                        <p className="text-2xl font-bold text-cyan-400">
                          {formatPercent((upsellAnalytics?.clickRate || 0) * 100)}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <p className="text-gray-400 text-sm">Attach Rate</p>
                        <p className="text-2xl font-bold text-green-400">
                          {formatPercent((upsellAnalytics?.conversionRate || 0) * 100)}
                        </p>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-800">
                          <TableHead className="text-gray-400">Product</TableHead>
                          <TableHead className="text-gray-400">Upsell</TableHead>
                          <TableHead className="text-gray-400 text-right">Conversions</TableHead>
                          <TableHead className="text-gray-400 text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upsellAnalytics?.topUpsells?.length ? (
                          upsellAnalytics.topUpsells.map((upsell, idx) => (
                            <TableRow key={idx} className="border-gray-800">
                              <TableCell className="text-white font-medium">{upsell.productName}</TableCell>
                              <TableCell className="text-purple-400">{upsell.relatedProductName}</TableCell>
                              <TableCell className="text-right text-gray-300">{formatNumber(upsell.conversions)}</TableCell>
                              <TableCell className="text-right text-cyan-400">{formatCurrency(upsell.revenue)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-gray-500 py-8">
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
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Crown className="w-5 h-5 text-amber-400" />
                      VIP Customer Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-amber-900/30 to-gray-800 rounded-lg p-4 border border-amber-800/30">
                        <p className="text-gray-400 text-sm flex items-center gap-1">
                          <Crown className="w-4 h-4 text-amber-400" />
                          Active VIPs
                        </p>
                        <p className="text-2xl font-bold text-amber-400">
                          {formatNumber(vipAnalytics?.activeVips || 0)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          of {formatNumber(vipAnalytics?.totalVips || 0)} total
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <p className="text-gray-400 text-sm">VIP Revenue Share</p>
                        <p className="text-2xl font-bold text-cyan-400">
                          {formatPercent((vipAnalytics?.vipRevenuePercent || 0) * 100)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatCurrency(vipAnalytics?.vipRevenue || 0)}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <p className="text-gray-400 text-sm">VIP Avg Order</p>
                        <p className="text-2xl font-bold text-white">
                          {formatCurrency(vipAnalytics?.vipAov || 0)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">per order</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <p className="text-gray-400 text-sm">Non-VIP Avg Order</p>
                        <p className="text-2xl font-bold text-white">
                          {formatCurrency(vipAnalytics?.nonVipAov || 0)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">per order</p>
                      </div>
                    </div>
                    <div className="mt-6 p-4 bg-gradient-to-r from-purple-900/20 to-amber-900/20 rounded-lg border border-purple-800/30">
                      <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        VIP Impact Summary
                      </h4>
                      <p className="text-gray-300 text-sm">
                        VIP customers spend <span className="text-amber-400 font-medium">
                          {formatPercent((vipAnalytics?.aovUplift || 0) * 100)} more
                        </span> per order than regular customers and contribute{" "}
                        <span className="text-cyan-400 font-medium">
                          {formatPercent((vipAnalytics?.vipRevenuePercent || 0) * 100)}
                        </span> of your total revenue.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
