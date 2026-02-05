import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, AlertTriangle, CheckCircle, TrendingDown, Percent, CreditCard, RefreshCw, Settings, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { useState } from "react";
import AdminNav from "@/components/admin/AdminNav";

interface AlertStats {
  activeCount: number;
  criticalCount: number;
  todayCount: number;
  resolvedToday: number;
}

interface RevenueAlert {
  id: string;
  alertType: string;
  severity: string;
  title: string;
  message: string;
  currentValue: number;
  thresholdValue: number;
  metadata: any;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

interface AlertThreshold {
  id: string;
  alertType: string;
  thresholdValue: number;
  comparisonPeriod: string;
  enabled: boolean;
  emailAlertEnabled: boolean;
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  refund_rate: "Refund Rate",
  affiliate_commission: "Affiliate Commission",
  aov_drop: "AOV Drop",
  webhook_failure: "Webhook Failures",
};

const ALERT_TYPE_ICONS: Record<string, React.ReactNode> = {
  refund_rate: <TrendingDown className="w-5 h-5" />,
  affiliate_commission: <Percent className="w-5 h-5" />,
  aov_drop: <TrendingDown className="w-5 h-5" />,
  webhook_failure: <CreditCard className="w-5 h-5" />,
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  critical: "bg-red-500/20 text-red-400 border-red-500/50",
};

export default function AdminAlerts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();

  const { data: stats } = useQuery<AlertStats>({
    queryKey: ["/api/alerts/admin/stats"],
  });

  const { data: activeAlerts = [] } = useQuery<RevenueAlert[]>({
    queryKey: ["/api/alerts/admin/active"],
  });

  const { data: allAlerts = [] } = useQuery<RevenueAlert[]>({
    queryKey: ["/api/alerts/admin/all"],
  });

  const { data: thresholds = [] } = useQuery<AlertThreshold[]>({
    queryKey: ["/api/alerts/admin/thresholds"],
  });

  const runChecksMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/alerts/admin/run-checks", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to run checks");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/admin/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/admin/all"] });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const res = await fetch(`/api/alerts/admin/${alertId}/acknowledge`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to acknowledge alert");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Alert acknowledged" });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/admin/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/admin/all"] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const res = await fetch(`/api/alerts/admin/${alertId}/resolve`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to resolve alert");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Alert resolved" });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/admin/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/admin/all"] });
    },
  });

  const updateThresholdMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AlertThreshold> }) => {
      const res = await fetch(`/api/alerts/admin/thresholds/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update threshold");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Threshold updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/admin/thresholds"] });
    },
  });

  const formatDate = (date: string) => new Date(date).toLocaleString();

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access alerts. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="alerts" role={role} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Revenue Guardrails</h1>
            <p className="text-muted-foreground mt-1">Monitor critical metrics and alerts</p>
          </div>
          <Button 
            onClick={() => runChecksMutation.mutate()}
            disabled={runChecksMutation.isPending}
            data-testid="button-run-checks"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${runChecksMutation.isPending ? "animate-spin" : ""}`} />
            Run All Checks
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Active Alerts</p>
                    <p className="text-2xl font-bold text-yellow-400">{stats.activeCount}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Critical</p>
                    <p className="text-2xl font-bold text-red-400">{stats.criticalCount}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Today's Alerts</p>
                    <p className="text-2xl font-bold text-cyan-400">{stats.todayCount}</p>
                  </div>
                  <Bell className="w-8 h-8 text-cyan-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Resolved Today</p>
                    <p className="text-2xl font-bold text-green-400">{stats.resolvedToday}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="active" className="data-[state=active]:bg-cyan-500" data-testid="tab-active-alerts">
              Active Alerts ({activeAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-cyan-500" data-testid="tab-alert-history">
              History
            </TabsTrigger>
            <TabsTrigger value="thresholds" className="data-[state=active]:bg-cyan-500" data-testid="tab-thresholds">
              <Settings className="w-4 h-4 mr-2" />
              Thresholds
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {activeAlerts.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-12 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">No active alerts</p>
                  <p className="text-slate-500 text-sm mt-2">All systems operating within normal parameters</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeAlerts.map((alert) => (
                  <Card key={alert.id} className={`border ${SEVERITY_COLORS[alert.severity]} bg-slate-800/50`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${SEVERITY_COLORS[alert.severity]}`}>
                            {ALERT_TYPE_ICONS[alert.alertType] || <AlertTriangle className="w-5 h-5" />}
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">{alert.title}</h3>
                            <p className="text-slate-400 mt-1">{alert.message}</p>
                            <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                              <span>{ALERT_TYPE_LABELS[alert.alertType]}</span>
                              <span>•</span>
                              <span>{formatDate(alert.createdAt)}</span>
                              <span>•</span>
                              <span className={`px-2 py-0.5 rounded text-xs ${SEVERITY_COLORS[alert.severity]}`}>
                                {alert.severity.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => acknowledgeMutation.mutate(alert.id)}
                            className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
                            data-testid={`button-acknowledge-${alert.id}`}
                          >
                            Acknowledge
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveMutation.mutate(alert.id)}
                            className="border-green-500 text-green-400 hover:bg-green-500/10"
                            data-testid={`button-resolve-${alert.id}`}
                          >
                            Resolve
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            {allAlerts.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-12 text-center">
                  <Bell className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No alert history</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-slate-700">
                        <tr className="text-left text-slate-400 text-sm">
                          <th className="p-4">Type</th>
                          <th className="p-4">Title</th>
                          <th className="p-4">Severity</th>
                          <th className="p-4">Value</th>
                          <th className="p-4">Created</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allAlerts.map((alert) => (
                          <tr key={alert.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                {ALERT_TYPE_ICONS[alert.alertType]}
                                <span>{ALERT_TYPE_LABELS[alert.alertType]}</span>
                              </div>
                            </td>
                            <td className="p-4 font-medium">{alert.title}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded text-xs ${SEVERITY_COLORS[alert.severity]}`}>
                                {alert.severity}
                              </span>
                            </td>
                            <td className="p-4 font-mono">
                              {alert.currentValue.toFixed(1)} / {alert.thresholdValue}
                            </td>
                            <td className="p-4 text-sm text-slate-400">{formatDate(alert.createdAt)}</td>
                            <td className="p-4">
                              {alert.resolvedAt ? (
                                <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">Resolved</span>
                              ) : alert.acknowledgedAt ? (
                                <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">Acknowledged</span>
                              ) : (
                                <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400">Active</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="thresholds">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle>Alert Thresholds</CardTitle>
                <p className="text-slate-400 text-sm">Configure when alerts should be triggered</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {thresholds.map((threshold) => (
                  <ThresholdCard
                    key={threshold.id}
                    threshold={threshold}
                    onUpdate={(updates) => updateThresholdMutation.mutate({ id: threshold.id, updates })}
                  />
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ThresholdCard({ 
  threshold, 
  onUpdate 
}: { 
  threshold: AlertThreshold; 
  onUpdate: (updates: Partial<AlertThreshold>) => void;
}) {
  const [value, setValue] = useState(threshold.thresholdValue.toString());
  const [period, setPeriod] = useState(threshold.comparisonPeriod);

  const getUnit = () => {
    switch (threshold.alertType) {
      case "refund_rate":
      case "affiliate_commission":
      case "aov_drop":
        return "%";
      case "webhook_failure":
        return " failures";
      default:
        return "";
    }
  };

  const getDescription = () => {
    switch (threshold.alertType) {
      case "refund_rate":
        return "Alert when refund rate exceeds this percentage";
      case "affiliate_commission":
        return "Alert when affiliate commissions exceed this percentage of revenue";
      case "aov_drop":
        return "Alert when average order value drops by this percentage";
      case "webhook_failure":
        return "Alert when this many webhook failures occur";
      default:
        return "";
    }
  };

  return (
    <div className="p-4 border border-slate-700 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-slate-700">
            {ALERT_TYPE_ICONS[threshold.alertType]}
          </div>
          <div>
            <h4 className="font-bold">{ALERT_TYPE_LABELS[threshold.alertType]}</h4>
            <p className="text-sm text-slate-400">{getDescription()}</p>
          </div>
        </div>
        <Switch
          checked={threshold.enabled}
          onCheckedChange={(enabled) => onUpdate({ enabled })}
          data-testid={`switch-${threshold.alertType}-enabled`}
        />
      </div>
      
      {threshold.enabled && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-700">
          <div>
            <Label className="text-slate-400 text-sm">Threshold</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={() => {
                  const num = parseFloat(value);
                  if (!isNaN(num) && num !== threshold.thresholdValue) {
                    onUpdate({ thresholdValue: num });
                  }
                }}
                className="w-24 bg-slate-700 border-slate-600"
                data-testid={`input-${threshold.alertType}-threshold`}
              />
              <span className="text-slate-400">{getUnit()}</span>
            </div>
          </div>
          <div>
            <Label className="text-slate-400 text-sm">Comparison Period</Label>
            <Select
              value={period}
              onValueChange={(val) => {
                setPeriod(val);
                onUpdate({ comparisonPeriod: val });
              }}
            >
              <SelectTrigger className="mt-1 bg-slate-700 border-slate-600" data-testid={`select-${threshold.alertType}-period`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-slate-400 text-sm">Email Alerts</Label>
            <div className="flex items-center gap-2 mt-2">
              <Switch
                checked={threshold.emailAlertEnabled}
                onCheckedChange={(emailAlertEnabled) => onUpdate({ emailAlertEnabled })}
                data-testid={`switch-${threshold.alertType}-email`}
              />
              <span className="text-sm text-slate-400">
                {threshold.emailAlertEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
