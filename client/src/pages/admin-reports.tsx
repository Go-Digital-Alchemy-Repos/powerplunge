import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, TrendingUp, DollarSign, ShoppingCart, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminNav from "@/components/admin/AdminNav";
import { useAdmin } from "@/hooks/use-admin";

export default function AdminReports() {
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const { data: salesData, isLoading: salesLoading } = useQuery<{
    summary: { totalRevenue: number; totalOrders: number; averageOrderValue: number };
    dailyData: { date: string; revenue: number; orders: number }[];
  }>({
    queryKey: ["/api/admin/reports/sales", dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/reports/sales?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, { credentials: "include" });
      return res.json();
    },
  });

  const { data: productData, isLoading: productLoading } = useQuery<{
    topProducts: { productId: string; productName: string; totalSold: number; revenue: number }[];
  }>({
    queryKey: ["/api/admin/reports/products"],
  });

  const { data: customerData, isLoading: customerLoading } = useQuery<{
    customers: { id: string; name: string; email: string; orderCount: number; totalSpent: number; lastOrderDate: string | null }[];
  }>({
    queryKey: ["/api/admin/reports/customers"],
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  };

  const handleExport = async (type: string) => {
    window.open(`/api/admin/reports/export?type=${type}`, "_blank");
  };

  const maxRevenue = salesData?.dailyData ? Math.max(...salesData.dailyData.map(d => d.revenue), 1) : 1;

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access reports. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="reports" role={role} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1">View sales, products, and customer data</p>
          </div>
        </div>

        <Tabs defaultValue="sales" className="space-y-6">
          <TabsList className="bg-slate-800">
            <TabsTrigger value="sales" data-testid="tab-sales">Sales</TabsTrigger>
            <TabsTrigger value="products" data-testid="tab-products">Products</TabsTrigger>
            <TabsTrigger value="customers" data-testid="tab-customers">Customers</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Date Range
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleExport("orders")} data-testid="button-export-orders">
                    <Download className="w-4 h-4 mr-2" /> Export Orders
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                      className="bg-slate-700 border-slate-600"
                      data-testid="input-start-date"
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                      className="bg-slate-700 border-slate-600"
                      data-testid="input-end-date"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-slate-800 border-slate-700" data-testid="card-total-revenue">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">Total Revenue</CardTitle>
                  <DollarSign className="w-4 h-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {salesLoading ? "..." : formatCurrency(salesData?.summary?.totalRevenue || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700" data-testid="card-total-orders">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">Total Orders</CardTitle>
                  <ShoppingCart className="w-4 h-4 text-cyan-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {salesLoading ? "..." : salesData?.summary?.totalOrders || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700" data-testid="card-aov">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">Average Order Value</CardTitle>
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {salesLoading ? "..." : formatCurrency(salesData?.summary?.averageOrderValue || 0)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-800 border-slate-700" data-testid="card-chart">
              <CardHeader>
                <CardTitle className="text-white">Revenue Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                {salesLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
                  </div>
                ) : salesData?.dailyData && salesData.dailyData.length > 0 ? (
                  <div className="h-64 flex items-end gap-1">
                    {salesData.dailyData.map((day, index) => (
                      <div key={day.date} className="flex-1 flex flex-col items-center group relative" data-testid={`bar-${index}`}>
                        <div
                          className="w-full bg-cyan-500/80 hover:bg-cyan-400 transition-colors rounded-t min-h-[4px]"
                          style={{ height: `${(day.revenue / maxRevenue) * 100}%` }}
                        />
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-700 px-2 py-1 rounded text-xs whitespace-nowrap z-10">
                          {new Date(day.date).toLocaleDateString()}: {formatCurrency(day.revenue)} ({day.orders} orders)
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    No sales data for this period
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700" data-testid="card-top-products">
              <CardHeader>
                <CardTitle className="text-white">Top Selling Products</CardTitle>
              </CardHeader>
              <CardContent>
                {productLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
                  </div>
                ) : productData?.topProducts && productData.topProducts.length > 0 ? (
                  <div className="space-y-4">
                    {productData.topProducts.map((product, index) => (
                      <div key={product.productId} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg" data-testid={`product-${index}`}>
                        <div className="flex items-center gap-4">
                          <span className="w-8 h-8 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center font-bold">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium text-white">{product.productName}</p>
                            <p className="text-sm text-slate-400">{product.totalSold} units sold</p>
                          </div>
                        </div>
                        <p className="text-xl font-bold text-green-400">{formatCurrency(product.revenue)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-8">No product sales data yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700" data-testid="card-top-customers">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Top Customers by Spending
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleExport("customers")} data-testid="button-export-customers">
                    <Download className="w-4 h-4 mr-2" /> Export Customers
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {customerLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
                  </div>
                ) : customerData?.customers && customerData.customers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-4 text-slate-400 font-medium">Customer</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium">Email</th>
                          <th className="text-center py-3 px-4 text-slate-400 font-medium">Orders</th>
                          <th className="text-right py-3 px-4 text-slate-400 font-medium">Total Spent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerData.customers.slice(0, 20).map((customer, index) => (
                          <tr key={customer.id} className="border-b border-slate-700/50" data-testid={`customer-row-${index}`}>
                            <td className="py-3 px-4 text-white">{customer.name}</td>
                            <td className="py-3 px-4 text-slate-400">{customer.email}</td>
                            <td className="py-3 px-4 text-center text-slate-400">{customer.orderCount}</td>
                            <td className="py-3 px-4 text-right text-green-400 font-medium">{formatCurrency(customer.totalSpent)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-8">No customer data yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
