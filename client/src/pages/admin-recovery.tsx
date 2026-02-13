import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, CreditCard, TrendingUp, Mail, AlertTriangle, RefreshCw, DollarSign, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import AdminNav from "@/components/admin/AdminNav";

interface RecoveryAnalytics {
  abandonedCarts: {
    total: number;
    totalValue: number;
    emailsSent: number;
    recovered: number;
    recoveredValue: number;
    conversionRate: number;
  };
  failedPayments: {
    total: number;
    totalValue: number;
    emailsSent: number;
    recovered: number;
    recoveredValue: number;
    conversionRate: number;
  };
  totalLostRevenue: number;
  totalRecoveredRevenue: number;
  overallConversionRate: number;
}

interface AbandonedCart {
  id: string;
  sessionId: string;
  customerId: string | null;
  email: string | null;
  cartData: any;
  cartValue: number;
  couponCode: string | null;
  affiliateCode: string | null;
  lastActivityAt: string;
  abandonedAt: string | null;
  recoveryEmailSent: number;
  recoveryEmailSentAt: string | null;
  recoveredAt: string | null;
  createdAt: string;
  customerName?: string;
  customerEmail?: string;
}

interface FailedPayment {
  id: string;
  orderId: string;
  customerId: string | null;
  email: string;
  paymentIntentId: string | null;
  amount: number;
  failureReason: string | null;
  failureCode: string | null;
  recoveryEmailSent: number;
  recoveryEmailSentAt: string | null;
  recoveredAt: string | null;
  expiredAt: string | null;
  createdAt: string;
  customerName?: string;
  orderNumber?: string;
}

export default function AdminRecovery() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();

  const { data: analytics } = useQuery<RecoveryAnalytics>({
    queryKey: ["/api/recovery/admin/analytics"],
  });

  const { data: abandonedCarts = [] } = useQuery<AbandonedCart[]>({
    queryKey: ["/api/recovery/admin/abandoned-carts"],
  });

  const { data: failedPayments = [] } = useQuery<FailedPayment[]>({
    queryKey: ["/api/recovery/admin/failed-payments"],
  });

  const detectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/recovery/admin/detect-abandoned", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to detect abandoned carts");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/recovery/admin/abandoned-carts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recovery/admin/analytics"] });
    },
  });

  const expireMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/recovery/admin/expire-old", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to expire old recoveries");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Expired old recovery items" });
      queryClient.invalidateQueries({ queryKey: ["/api/recovery/admin/failed-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recovery/admin/analytics"] });
    },
  });

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (date: string) => new Date(date).toLocaleString();

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access recovery. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="recovery" role={role} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Revenue Recovery</h1>
            <p className="text-muted-foreground mt-1">Track abandoned carts and failed payments</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => detectMutation.mutate()}
              disabled={detectMutation.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${detectMutation.isPending ? "animate-spin" : ""}`} />
              Detect Abandoned
            </Button>
            <Button 
              variant="outline" 
              onClick={() => expireMutation.mutate()}
              disabled={expireMutation.isPending}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Expire Old
            </Button>
          </div>
        </div>

        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Lost Revenue</p>
                    <p className="text-2xl font-bold text-red-400">{formatCurrency(analytics.totalLostRevenue)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-red-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Recovered Revenue</p>
                    <p className="text-2xl font-bold text-green-400">{formatCurrency(analytics.totalRecoveredRevenue)}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Recovery Rate</p>
                    <p className="text-2xl font-bold text-cyan-400">{analytics.overallConversionRate.toFixed(1)}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-cyan-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Emails Sent</p>
                    <p className="text-2xl font-bold text-purple-400">
                      {analytics.abandonedCarts.emailsSent + analytics.failedPayments.emailsSent}
                    </p>
                  </div>
                  <Mail className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="abandoned" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="abandoned" className="data-[state=active]:bg-cyan-500">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Abandoned Carts ({abandonedCarts.filter(c => !c.recoveredAt).length})
            </TabsTrigger>
            <TabsTrigger value="failed" className="data-[state=active]:bg-cyan-500">
              <CreditCard className="w-4 h-4 mr-2" />
              Failed Payments ({failedPayments.filter(p => !p.recoveredAt && !p.expiredAt).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="abandoned">
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4 text-center">
                    <p className="text-slate-400 text-sm">Total Abandoned</p>
                    <p className="text-xl font-bold">{analytics.abandonedCarts.total}</p>
                    <p className="text-sm text-slate-400">{formatCurrency(analytics.abandonedCarts.totalValue)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4 text-center">
                    <p className="text-slate-400 text-sm">Recovered</p>
                    <p className="text-xl font-bold text-green-400">{analytics.abandonedCarts.recovered}</p>
                    <p className="text-sm text-green-400">{formatCurrency(analytics.abandonedCarts.recoveredValue)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4 text-center">
                    <p className="text-slate-400 text-sm">Conversion Rate</p>
                    <p className="text-xl font-bold text-cyan-400">{analytics.abandonedCarts.conversionRate.toFixed(1)}%</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {abandonedCarts.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-12 text-center">
                  <ShoppingCart className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No abandoned carts detected</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-slate-700">
                        <tr className="text-left text-slate-400 text-sm">
                          <th className="p-4">Customer</th>
                          <th className="p-4">Cart Value</th>
                          <th className="p-4">Abandoned</th>
                          <th className="p-4">Emails Sent</th>
                          <th className="p-4">Coupon</th>
                          <th className="p-4">Affiliate</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {abandonedCarts.map((cart) => (
                          <tr key={cart.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="p-4">
                              <div className="font-bold text-white">{cart.customerName || "Guest"}</div>
                              <div className="text-sm text-slate-400">{cart.customerEmail || cart.email}</div>
                            </td>
                            <td className="p-4 font-bold text-cyan-400">{formatCurrency(cart.cartValue)}</td>
                            <td className="p-4 text-sm text-slate-400">
                              {cart.abandonedAt ? formatDate(cart.abandonedAt) : "Active"}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded text-sm ${cart.recoveryEmailSent > 0 ? "bg-purple-500/20 text-purple-400" : "bg-slate-500/20 text-slate-400"}`}>
                                {cart.recoveryEmailSent} / 2
                              </span>
                            </td>
                            <td className="p-4">
                              {cart.couponCode && (
                                <span className="px-2 py-1 rounded text-xs bg-cyan-500/20 text-cyan-400">{cart.couponCode}</span>
                              )}
                            </td>
                            <td className="p-4">
                              {cart.affiliateCode && (
                                <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400">{cart.affiliateCode}</span>
                              )}
                            </td>
                            <td className="p-4">
                              {cart.recoveredAt ? (
                                <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">Recovered</span>
                              ) : cart.abandonedAt ? (
                                <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">Abandoned</span>
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

          <TabsContent value="failed">
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4 text-center">
                    <p className="text-slate-400 text-sm">Total Failed</p>
                    <p className="text-xl font-bold">{analytics.failedPayments.total}</p>
                    <p className="text-sm text-slate-400">{formatCurrency(analytics.failedPayments.totalValue)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4 text-center">
                    <p className="text-slate-400 text-sm">Recovered</p>
                    <p className="text-xl font-bold text-green-400">{analytics.failedPayments.recovered}</p>
                    <p className="text-sm text-green-400">{formatCurrency(analytics.failedPayments.recoveredValue)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4 text-center">
                    <p className="text-slate-400 text-sm">Conversion Rate</p>
                    <p className="text-xl font-bold text-cyan-400">{analytics.failedPayments.conversionRate.toFixed(1)}%</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {failedPayments.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-12 text-center">
                  <CreditCard className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No failed payments recorded</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-slate-700">
                        <tr className="text-left text-slate-400 text-sm">
                          <th className="p-4">Order</th>
                          <th className="p-4">Customer</th>
                          <th className="p-4">Amount</th>
                          <th className="p-4">Failure Reason</th>
                          <th className="p-4">Emails Sent</th>
                          <th className="p-4">Date</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {failedPayments.map((payment) => (
                          <tr key={payment.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="p-4">
                              <div className="text-sm text-white">{payment.orderNumber || payment.orderId.slice(0, 8)}</div>
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-white">{payment.customerName || "Guest"}</div>
                              <div className="text-sm text-slate-400">{payment.email}</div>
                            </td>
                            <td className="p-4 font-bold text-red-400">{formatCurrency(payment.amount)}</td>
                            <td className="p-4 text-sm">
                              <div className="text-slate-300">{payment.failureReason || "Unknown"}</div>
                              {payment.failureCode && (
                                <div className="text-xs text-slate-500">{payment.failureCode}</div>
                              )}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded text-sm ${payment.recoveryEmailSent > 0 ? "bg-purple-500/20 text-purple-400" : "bg-slate-500/20 text-slate-400"}`}>
                                {payment.recoveryEmailSent} / 2
                              </span>
                            </td>
                            <td className="p-4 text-sm text-slate-400">
                              {formatDate(payment.createdAt)}
                            </td>
                            <td className="p-4">
                              {payment.recoveredAt ? (
                                <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">Recovered</span>
                              ) : payment.expiredAt ? (
                                <span className="px-2 py-1 rounded text-xs bg-slate-500/20 text-slate-400">Expired</span>
                              ) : (
                                <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">Pending</span>
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
        </Tabs>
      </div>
    </div>
  );
}
