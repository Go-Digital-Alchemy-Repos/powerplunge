import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { Package, Search, Mail, Phone, MapPin, DollarSign, Calendar, Plus } from "lucide-react";
import { format } from "date-fns";
import { CustomerProfileDrawer } from "@/components/admin/CustomerProfileDrawer";
import AdminNav from "@/components/admin/AdminNav";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  orderCount: number;
  totalSpent: number;
}

interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
  isManualOrder?: boolean;
  stripePaymentIntentId?: string | null;
}

interface CustomerDetail {
  customer: Customer;
  orders: Order[];
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-500",
  paid: "bg-green-500/20 text-green-500",
  shipped: "bg-blue-500/20 text-blue-500",
  delivered: "bg-emerald-500/20 text-emerald-500",
  cancelled: "bg-red-500/20 text-red-500",
};

interface Product {
  id: string;
  name: string;
  price: number;
  active?: boolean;
}

export default function AdminCustomers() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [profileDrawerCustomerId, setProfileDrawerCustomerId] = useState<string | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "", address: "", city: "", state: "", zipCode: "" });

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/admin/customers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/customers", { credentials: "include" });
      if (res.status === 401) {
        setLocation("/admin/login");
        return [];
      }
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  const { data: customerDetail, isLoading: isLoadingDetail } = useQuery<CustomerDetail>({
    queryKey: ["/api/admin/customers", selectedCustomerId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/customers/${selectedCustomerId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch customer");
      return res.json();
    },
    enabled: !!selectedCustomerId,
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
    queryFn: async () => {
      const res = await fetch("/api/admin/products", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: typeof newCustomer) => {
      const res = await fetch("/api/admin/customers", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create customer");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      setShowNewCustomer(false);
      setNewCustomer({ name: "", email: "", phone: "", address: "", city: "", state: "", zipCode: "" });
      toast({ title: "Customer created successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: { customerId: string; items: typeof orderItems }) => {
      const res = await fetch("/api/admin/orders", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      setShowNewOrder(false);
      setOrderCustomerId("");
      setOrderItems([]);
      toast({ title: "Order created successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const filteredCustomers = customers?.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-gray-950">
        <AdminNav role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h2>
              <p className="text-gray-400">You don't have permission to access customers. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="customers" role={role} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold">Customers</h2>
            <p className="text-muted-foreground">View all customers and their order history.</p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Button onClick={() => setShowNewCustomer(true)} className="gap-2 w-full md:w-auto" data-testid="button-new-customer">
              <Plus className="w-4 h-4" />
              New Customer
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Customer</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Contact</th>
                  <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">Orders</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">Total Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCustomers?.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => setProfileDrawerCustomerId(customer.id)}
                    data-testid={`row-customer-${customer.id}`}
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium">{customer.name}</p>
                      {customer.city && customer.state && (
                        <p className="text-sm text-muted-foreground">{customer.city}, {customer.state}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        {customer.email}
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {customer.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="secondary">{customer.orderCount}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      ${(customer.totalSpent / 100).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {filteredCustomers?.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      No customers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <Sheet open={!!selectedCustomerId} onOpenChange={() => setSelectedCustomerId(null)}>
        <SheetContent className="w-full max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Customer Details</SheetTitle>
          </SheetHeader>

          {isLoadingDetail ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : customerDetail ? (
            <div className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Client ID:</span>
                    <span className="text-xs font-semibold text-cyan-400" data-testid="text-quickview-client-id">
                      {customerDetail.customer.id.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{customerDetail.customer.email}</span>
                  </div>
                  {customerDetail.customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{customerDetail.customer.phone}</span>
                    </div>
                  )}
                  {customerDetail.customer.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p>{customerDetail.customer.address}</p>
                        <p>
                          {customerDetail.customer.city}, {customerDetail.customer.state} {customerDetail.customer.zipCode}
                        </p>
                        <p>{customerDetail.customer.country}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div>
                <h3 className="font-semibold mb-4">Order History ({customerDetail.orders.length})</h3>
                <div className="space-y-3">
                  {customerDetail.orders.map((order) => (
                    <Card key={order.id}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">
                              {format(new Date(order.createdAt), "MMM d, yyyy")}
                            </span>
                          </div>
                          <Badge className={statusColors[order.status]}>{order.status}</Badge>
                        </div>
                        <div className="space-y-1">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{item.productName} x{item.quantity}</span>
                              <span>${((item.unitPrice * item.quantity) / 100).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between mt-3 pt-3 border-t border-border font-medium">
                          <span>Total</span>
                          <span className="text-primary">{order.isManualOrder && !order.stripePaymentIntentId ? "FREE" : `$${(order.totalAmount / 100).toLocaleString()}`}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {customerDetail.orders.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No orders yet</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* New Customer Dialog */}
      <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createCustomerMutation.mutate(newCustomer);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  required
                  data-testid="input-new-customer-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  required
                  data-testid="input-new-customer-email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                data-testid="input-new-customer-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                data-testid="input-new-customer-address"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={newCustomer.city}
                  onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                  data-testid="input-new-customer-city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={newCustomer.state}
                  onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                  data-testid="input-new-customer-state"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP</Label>
                <Input
                  id="zipCode"
                  value={newCustomer.zipCode}
                  onChange={(e) => setNewCustomer({ ...newCustomer, zipCode: e.target.value })}
                  data-testid="input-new-customer-zip"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowNewCustomer(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCustomerMutation.isPending} data-testid="button-create-customer">
                {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <CustomerProfileDrawer
        customerId={profileDrawerCustomerId}
        open={!!profileDrawerCustomerId}
        onOpenChange={(open) => !open && setProfileDrawerCustomerId(null)}
      />
    </div>
  );
}
