import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import {
  BarChart3, Save, DollarSign, Users, TrendingUp, Activity,
  Eye, Clock, MousePointerClick, ArrowUpRight, Globe, Monitor, Smartphone, Tablet, AlertCircle, Settings, Loader2
} from "lucide-react";
import AdminNav from "@/components/admin/AdminNav";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart,
} from "recharts";

const CHART_COLORS = ["#67e8f9", "#22d3ee", "#06b6d4", "#0891b2", "#0e7490", "#155e75", "#164e63", "#083344"];
const PIE_COLORS = ["#67e8f9", "#a78bfa", "#34d399", "#fbbf24", "#f87171", "#818cf8"];

const DATE_RANGES = [
  { value: "7d", label: "Last 7 days", startDate: "7daysAgo" },
  { value: "14d", label: "Last 14 days", startDate: "14daysAgo" },
  { value: "30d", label: "Last 30 days", startDate: "30daysAgo" },
  { value: "90d", label: "Last 90 days", startDate: "90daysAgo" },
];

function formatDate(dateStr: string) {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  return `${m}/${d}`;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function formatPercent(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function getDeviceIcon(device: string) {
  switch (device.toLowerCase()) {
    case "desktop": return <Monitor className="w-4 h-4" />;
    case "mobile": return <Smartphone className="w-4 h-4" />;
    case "tablet": return <Tablet className="w-4 h-4" />;
    default: return <Globe className="w-4 h-4" />;
  }
}

function ChartLoadingSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function ChartError({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-12">
      <AlertCircle className="w-4 h-4" />
      <span>{message}</span>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.name}: {formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function AdminAnalytics() {
  const { admin } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [gaMeasurementId, setGaMeasurementId] = useState("");
  const [dateRange, setDateRange] = useState("30d");
  const [showSettings, setShowSettings] = useState(false);

  const selectedRange = DATE_RANGES.find((r) => r.value === dateRange) || DATE_RANGES[2];

  const { data: settings } = useQuery<{ gaMeasurementId?: string }>({
    queryKey: ["/api/admin/settings"],
  });

  const { data: gaStatus } = useQuery<{ configured: boolean; hasCredentials: boolean; hasPropertyId: boolean }>({
    queryKey: ["/api/admin/analytics/status"],
  });

  useEffect(() => {
    if (settings) setGaMeasurementId(settings.gaMeasurementId || "");
  }, [settings]);

  const queryParams = `?startDate=${selectedRange.startDate}&endDate=today`;

  const { data: overview, isLoading: overviewLoading, error: overviewError } = useQuery<any>({
    queryKey: ["/api/admin/analytics/overview" + queryParams],
    enabled: !!gaStatus?.configured,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: trafficData, isLoading: trafficLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/traffic-over-time" + queryParams],
    enabled: !!gaStatus?.configured,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: topPages, isLoading: pagesLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/top-pages" + queryParams],
    enabled: !!gaStatus?.configured,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: devices, isLoading: devicesLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/devices" + queryParams],
    enabled: !!gaStatus?.configured,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: trafficSources, isLoading: sourcesLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/traffic-sources" + queryParams],
    enabled: !!gaStatus?.configured,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: ecommerceData, isLoading: ecomLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/ecommerce" + queryParams],
    enabled: !!gaStatus?.configured,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

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

  if (!admin) return null;

  const isConfigured = gaStatus?.configured;

  const formattedTraffic = (trafficData || []).map((d: any) => ({
    ...d,
    dateLabel: formatDate(d.date),
  }));

  const formattedEcommerce = (ecommerceData || []).map((d: any) => ({
    ...d,
    dateLabel: formatDate(d.date),
  }));

  const totalDeviceUsers = (devices || []).reduce((sum: number, d: any) => sum + d.users, 0);

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="analytics" role={admin.role} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Live traffic and ecommerce data from Google Analytics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[160px]" data-testid="select-date-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="gap-2"
              data-testid="button-toggle-settings"
            >
              <Settings className="w-4 h-4" />
              Configure
            </Button>
          </div>
        </div>

        {showSettings && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="w-5 h-5" />
                Google Analytics Configuration
              </CardTitle>
              <CardDescription>
                Connect your GA4 property. You need a service account with access to your GA4 property.
                Set GA_SERVICE_ACCOUNT_EMAIL, GA_SERVICE_ACCOUNT_PRIVATE_KEY, and GA4_PROPERTY_ID in your secrets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gaMeasurementId">GA4 Measurement ID (for frontend tracking)</Label>
                  <Input
                    id="gaMeasurementId"
                    value={gaMeasurementId}
                    onChange={(e) => setGaMeasurementId(e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                    data-testid="input-ga-measurement-id"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Button type="submit" size="sm" className="gap-2" disabled={updateMutation.isPending} data-testid="button-save-analytics-settings">
                    <Save className="w-4 h-4" />
                    {updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${isConfigured ? "bg-green-500" : "bg-yellow-500"}`} />
                    <span className="text-muted-foreground">
                      {isConfigured ? "GA4 Data API connected" : "GA4 Data API not configured"}
                    </span>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {!isConfigured && !showSettings && (
          <Card className="mb-6 border-yellow-500/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Google Analytics not connected</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    To see live traffic data, charts, and ecommerce analytics, you need to connect your GA4 property.
                    Click "Configure" above to get started.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} data-testid="button-setup-ga">
                    Set up Google Analytics
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isConfigured && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {overviewLoading ? (
                [...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <div className="h-16 animate-pulse bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))
              ) : overviewError ? (
                <Card className="col-span-full">
                  <CardContent className="pt-6">
                    <ChartError message="Failed to load overview metrics" />
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card data-testid="stat-active-users">
                    <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                      <CardTitle className="text-xs font-medium text-muted-foreground">Active Users</CardTitle>
                      <Users className="w-4 h-4 text-cyan-500" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0">
                      <div className="text-2xl font-bold">{formatNumber(overview?.activeUsers || 0)}</div>
                      <p className="text-xs text-muted-foreground mt-1">{formatNumber(overview?.newUsers || 0)} new</p>
                    </CardContent>
                  </Card>
                  <Card data-testid="stat-sessions">
                    <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                      <CardTitle className="text-xs font-medium text-muted-foreground">Sessions</CardTitle>
                      <MousePointerClick className="w-4 h-4 text-blue-500" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0">
                      <div className="text-2xl font-bold">{formatNumber(overview?.sessions || 0)}</div>
                      <p className="text-xs text-muted-foreground mt-1">Avg. {formatDuration(overview?.avgSessionDuration || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card data-testid="stat-page-views">
                    <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                      <CardTitle className="text-xs font-medium text-muted-foreground">Page Views</CardTitle>
                      <Eye className="w-4 h-4 text-purple-500" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0">
                      <div className="text-2xl font-bold">{formatNumber(overview?.pageViews || 0)}</div>
                      <p className="text-xs text-muted-foreground mt-1">{formatPercent(overview?.bounceRate || 0)} bounce</p>
                    </CardContent>
                  </Card>
                  <Card data-testid="stat-revenue">
                    <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                      <CardTitle className="text-xs font-medium text-muted-foreground">Revenue (GA4)</CardTitle>
                      <DollarSign className="w-4 h-4 text-green-500" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0">
                      <div className="text-2xl font-bold">{formatCurrency(overview?.totalRevenue || 0)}</div>
                      <p className="text-xs text-muted-foreground mt-1">{formatNumber(overview?.purchases || 0)} purchases</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Traffic Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trafficLoading ? (
                  <ChartLoadingSkeleton />
                ) : !formattedTraffic.length ? (
                  <ChartError message="No traffic data available" />
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={formattedTraffic} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#67e8f9" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#67e8f9" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area type="monotone" dataKey="activeUsers" name="Users" stroke="#67e8f9" fill="url(#colorUsers)" strokeWidth={2} />
                      <Area type="monotone" dataKey="sessions" name="Sessions" stroke="#a78bfa" fill="url(#colorSessions)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Traffic Sources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sourcesLoading ? (
                    <ChartLoadingSkeleton height={280} />
                  ) : !trafficSources?.length ? (
                    <ChartError message="No traffic source data" />
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={trafficSources} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis type="category" dataKey="channel" width={120} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="sessions" name="Sessions" fill="#67e8f9" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Monitor className="w-5 h-5" />
                    Devices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {devicesLoading ? (
                    <ChartLoadingSkeleton height={280} />
                  ) : !devices?.length ? (
                    <ChartError message="No device data" />
                  ) : (
                    <div className="flex items-center gap-6">
                      <ResponsiveContainer width="55%" height={220}>
                        <PieChart>
                          <Pie
                            data={devices}
                            dataKey="users"
                            nameKey="device"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            stroke="none"
                          >
                            {(devices || []).map((_: any, i: number) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatNumber(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-3">
                        {(devices || []).map((d: any, i: number) => (
                          <div key={d.device} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                              <span className="flex items-center gap-1.5">
                                {getDeviceIcon(d.device)}
                                <span className="capitalize">{d.device}</span>
                              </span>
                            </div>
                            <div className="text-muted-foreground">
                              {formatNumber(d.users)} ({totalDeviceUsers > 0 ? ((d.users / totalDeviceUsers) * 100).toFixed(0) : 0}%)
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Ecommerce Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ecomLoading ? (
                  <ChartLoadingSkeleton />
                ) : !formattedEcommerce.length ? (
                  <ChartError message="No ecommerce data available" />
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={formattedEcommerce} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#34d399" fill="url(#colorRevenue)" strokeWidth={2} />
                      <Line type="monotone" dataKey="purchases" name="Purchases" stroke="#fbbf24" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="addToCarts" name="Add to Carts" stroke="#67e8f9" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Top Pages
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pagesLoading ? (
                  <ChartLoadingSkeleton height={200} />
                ) : !topPages?.length ? (
                  <ChartError message="No page data available" />
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground pb-2 border-b border-border px-2">
                      <span className="col-span-6">Page</span>
                      <span className="col-span-2 text-right">Views</span>
                      <span className="col-span-2 text-right">Users</span>
                      <span className="col-span-2 text-right">Avg. Time</span>
                    </div>
                    {topPages.map((page: any, i: number) => {
                      const maxViews = topPages[0]?.pageViews || 1;
                      const barWidth = (page.pageViews / maxViews) * 100;
                      return (
                        <div key={i} className="grid grid-cols-12 items-center text-sm py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors relative" data-testid={`top-page-${i}`}>
                          <div className="col-span-6 relative z-10">
                            <div className="absolute inset-y-0 left-0 bg-primary/10 rounded" style={{ width: `${barWidth}%` }} />
                            <span className="relative font-mono text-xs truncate block">{page.page}</span>
                          </div>
                          <span className="col-span-2 text-right font-medium">{formatNumber(page.pageViews)}</span>
                          <span className="col-span-2 text-right text-muted-foreground">{formatNumber(page.users)}</span>
                          <span className="col-span-2 text-right text-muted-foreground">{formatDuration(page.avgDuration)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
