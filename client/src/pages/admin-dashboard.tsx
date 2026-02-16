import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { DollarSign, ShoppingCart, Users, Package, UserCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminNav from "@/components/admin/AdminNav";
import { useAdmin } from "@/hooks/use-admin";

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  averageOrderValue: number;
  totalAffiliates: number;
  activeAffiliates: number;
  pendingPayouts: number;
  pendingPayoutAmount: number;
  recentOrders: any[];
  topProducts: { productId: string; productName: string; totalSold: number; revenue: number }[];
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { role, hasFullAccess, isLoading: isAdminLoading } = useAdmin();

  useEffect(() => {
    if (!isAdminLoading && role === "fulfillment") {
      navigate("/admin/orders", { replace: true });
    }
  }, [isAdminLoading, role, navigate]);

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard"],
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "bg-green-500/20 text-green-400";
      case "shipped": return "bg-blue-500/20 text-blue-400";
      case "paid": return "bg-cyan-500/20 text-cyan-400";
      case "pending": return "bg-yellow-500/20 text-yellow-400";
      case "cancelled": return "bg-red-500/20 text-red-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <AdminNav currentPage="home" role={role} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h2 className="text-3xl font-bold mb-8 font-sans">Dashboard</h2>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              <Card data-testid="card-revenue">
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Revenue</CardTitle>
                  <DollarSign className="w-3.5 h-3.5 text-green-500" />
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="text-xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">From paid orders</p>
                </CardContent>
              </Card>

              <Card data-testid="card-orders">
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Orders</CardTitle>
                  <ShoppingCart className="w-3.5 h-3.5 text-cyan-500" />
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="text-xl font-bold">{stats?.totalOrders || 0}</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Completed</p>
                </CardContent>
              </Card>

              <Card data-testid="card-customers">
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Customers</CardTitle>
                  <Users className="w-3.5 h-3.5 text-purple-500" />
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="text-xl font-bold">{stats?.totalCustomers || 0}</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Registered</p>
                </CardContent>
              </Card>

              <Card data-testid="card-affiliates">
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Affiliates</CardTitle>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="text-xl font-bold">{stats?.activeAffiliates || 0}</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">of {stats?.totalAffiliates || 0} total</p>
                </CardContent>
              </Card>

              <Card data-testid="card-pending-payouts">
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Payouts</CardTitle>
                  <Clock className="w-3.5 h-3.5 text-orange-500" />
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="text-xl font-bold">{stats?.pendingPayouts || 0}</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{formatCurrency(stats?.pendingPayoutAmount || 0)}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card data-testid="card-recent-orders">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Recent Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                    <div className="space-y-4">
                      {stats.recentOrders.slice(0, 5).map((order: any) => (
                        <div 
                          key={order.id} 
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => navigate(`/admin/orders?highlight=${order.id}`)}
                          data-testid={`order-row-${order.id}`}
                        >
                          <div>
                            <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                            <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {formatCurrency(order.totalAmount)}
                            </p>
                            <span className={`text-xs px-2 py-1 rounded ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No orders yet</p>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full mt-4 text-primary"
                    onClick={() => navigate("/admin/orders")}
                    data-testid="button-view-orders"
                  >
                    View All Orders
                  </Button>
                </CardContent>
              </Card>

              <Card data-testid="card-top-products">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Top Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.topProducts && stats.topProducts.length > 0 ? (
                    <div className="space-y-4">
                      {stats.topProducts.map((product, index) => (
                        <div key={product.productId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-medium">{product.productName}</p>
                              <p className="text-sm text-muted-foreground">{product.totalSold} sold</p>
                            </div>
                          </div>
                          <p className="font-medium text-green-500">{formatCurrency(product.revenue)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No sales data yet</p>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full mt-4 text-primary"
                    onClick={() => navigate("/admin/products")}
                    data-testid="button-view-products"
                  >
                    View All Products
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
