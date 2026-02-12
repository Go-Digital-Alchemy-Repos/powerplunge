import { useState, useEffect, useMemo } from "react";
import { useLocation, Link, useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { Package, Calendar, User, ChevronRight, Truck, Mail, RefreshCw, ExternalLink, Search, Download, Filter } from "lucide-react";
import { format } from "date-fns";
import AdminNav from "@/components/admin/AdminNav";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { useSavedFilters } from "@/hooks/use-saved-filters";
import { BulkActionsBar } from "@/components/admin/BulkActionsBar";
import { SavedFiltersPanel } from "@/components/admin/SavedFiltersPanel";
import { getOrderStatusLabel } from "@shared/orderStatus";

interface Shipment {
  id: string;
  orderId: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: string;
  shippedAt: string | null;
  shippedEmailSentAt: string | null;
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  shipments?: Shipment[];
}

interface OrderFilters {
  status: string;
  search: string;
  dateFrom: string;
  dateTo: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  paid: "bg-green-500/20 text-green-500 border-green-500/30",
  shipped: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  delivered: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
  cancelled: "bg-red-500/20 text-red-500 border-red-500/30",
};

const defaultFilters: OrderFilters = {
  status: "all",
  search: "",
  dateFrom: "",
  dateTo: "",
};

export default function AdminOrders() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role } = useAdmin();
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [filters, setFilters] = useState<OrderFilters>(defaultFilters);
  const [bulkShipDialogOpen, setBulkShipDialogOpen] = useState(false);
  const [bulkShipData, setBulkShipData] = useState({
    carrier: "",
    trackingNumber: "",
    trackingUrl: "",
    sendEmail: true,
  });

  // Saved filters
  const {
    savedFilters,
    filterName,
    setFilterName,
    saveFilter,
    deleteFilter,
  } = useSavedFilters<OrderFilters>("admin-orders-filters");

  // Auto-select order from URL query param
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const highlightId = params.get("highlight");
    if (highlightId) {
      setSelectedOrder(highlightId);
      setTimeout(() => {
        const orderElement = document.querySelector(`[data-order-id="${highlightId}"]`);
        if (orderElement) {
          orderElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
    }
  }, [searchString]);

  const { data: orders, isLoading, error } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
    queryFn: async () => {
      const res = await fetch("/api/admin/orders", { credentials: "include" });
      if (res.status === 401) {
        setLocation("/admin/login");
        return [];
      }
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
  });

  // Filter orders
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((order) => {
      if (filters.status !== "all" && order.status !== filters.status) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(search);
        const matchesName = order.customer?.name?.toLowerCase().includes(search);
        const matchesEmail = order.customer?.email?.toLowerCase().includes(search);
        if (!matchesId && !matchesName && !matchesEmail) return false;
      }
      if (filters.dateFrom) {
        const orderDate = new Date(order.createdAt);
        const fromDate = new Date(filters.dateFrom);
        if (orderDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const orderDate = new Date(order.createdAt);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (orderDate > toDate) return false;
      }
      return true;
    });
  }, [orders, filters]);

  // Bulk selection
  const {
    selectedIds,
    selectedItems,
    selectedCount,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isPartiallySelected,
  } = useBulkSelection(filteredOrders);

  const hasActiveFilters = filters.status !== "all" || !!filters.search || !!filters.dateFrom || !!filters.dateTo;

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/orders/${id}`, {
        credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Order updated" });
    },
  });

  // Bulk update orders mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/orders/${id}`, {
        credentials: "include",
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
        )
      );
      const failed = results.filter((r) => !r.ok).length;
      return { total: ids.length, failed };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      clearSelection();
      if (data.failed > 0) {
        toast({ 
          title: "Partial success", 
          description: `Updated ${data.total - data.failed} orders, ${data.failed} failed`,
          variant: "destructive" 
        });
      } else {
        toast({ title: `Updated ${data.total} orders` });
      }
    },
  });

  // Bulk ship orders mutation
  const bulkShipMutation = useMutation({
    mutationFn: async ({ ids, data }: { ids: string[]; data: typeof bulkShipData }) => {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/orders/${id}/shipments`, {
        credentials: "include",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          })
        )
      );
      const failed = results.filter((r) => !r.ok).length;
      return { total: ids.length, failed };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      clearSelection();
      setBulkShipDialogOpen(false);
      setBulkShipData({ carrier: "", trackingNumber: "", trackingUrl: "", sendEmail: true });
      if (data.failed > 0) {
        toast({ 
          title: "Partial success", 
          description: `Shipped ${data.total - data.failed} orders, ${data.failed} failed`,
          variant: "destructive" 
        });
      } else {
        toast({ title: `Shipped ${data.total} orders` });
      }
    },
  });

  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [shipFormData, setShipFormData] = useState({
    carrier: "",
    trackingNumber: "",
    trackingUrl: "",
    sendEmail: true,
  });

  const shipOrderMutation = useMutation({
    mutationFn: async ({ orderId, ...data }: { orderId: string; carrier: string; trackingNumber: string; trackingUrl: string; sendEmail: boolean }) => {
      const res = await fetch(`/api/admin/orders/${orderId}/shipments`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create shipment");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      setShipDialogOpen(false);
      setShipFormData({ carrier: "", trackingNumber: "", trackingUrl: "", sendEmail: true });
      if (data.emailSent) {
        toast({ title: "Order shipped", description: "Shipping notification email sent to customer" });
      } else {
        toast({ title: "Order shipped", description: data.emailError || "Email not sent" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to ship order", variant: "destructive" });
    },
  });

  const resendEmailMutation = useMutation({
    mutationFn: async (shipmentId: string) => {
      const res = await fetch(`/api/admin/shipments/${shipmentId}/resend-email`, {
        credentials: "include",
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to resend email");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Email sent", description: "Shipping notification resent to customer" });
      } else {
        toast({ title: "Email failed", description: data.error, variant: "destructive" });
      }
    },
  });

  // Export CSV function
  const exportCSV = () => {
    const ordersToExport = selectedCount > 0 ? selectedItems : filteredOrders;
    const headers = ["Order ID", "Status", "Customer Name", "Customer Email", "Total Amount", "Created At", "Items"];
    const rows = ordersToExport.map((order) => [
      order.id,
      order.status,
      order.customer?.name || "",
      order.customer?.email || "",
      (order.totalAmount / 100).toFixed(2),
      format(new Date(order.createdAt), "yyyy-MM-dd HH:mm:ss"),
      order.items.map((i) => `${i.productName} x${i.quantity}`).join("; "),
    ]);
    
    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${ordersToExport.length} orders` });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">Failed to load orders</p>
      </div>
    );
  }

  const currentOrder = orders?.find(o => o.id === selectedOrder);

  const bulkActions = [
    {
      label: "Mark Shipped",
      icon: <Truck className="w-4 h-4 mr-1" />,
      onClick: () => setBulkShipDialogOpen(true),
    },
    {
      label: "Export CSV",
      icon: <Download className="w-4 h-4 mr-1" />,
      onClick: exportCSV,
      variant: "outline" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="orders" role={role} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-3xl font-bold">Orders</h2>
          <div className="flex flex-wrap items-center gap-2">
            <SavedFiltersPanel
              savedFilters={savedFilters}
              filterName={filterName}
              setFilterName={setFilterName}
              onSave={saveFilter}
              onLoad={(filter) => setFilters(filter.filters)}
              onDelete={deleteFilter}
              currentFilters={filters}
              hasActiveFilters={hasActiveFilters}
            />
            <Button variant="outline" size="sm" onClick={exportCSV} data-testid="button-export-all">
              <Download className="w-4 h-4 mr-2" />
              Export All
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs text-muted-foreground mb-1 block">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by ID, name, or email..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-9"
                    data-testid="input-search"
                  />
                </div>
              </div>
              <div className="w-40">
                <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(v) => setFilters({ ...filters, status: v })}
                >
                  <SelectTrigger data-testid="select-filter-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Label className="text-xs text-muted-foreground mb-1 block">From Date</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  data-testid="input-date-from"
                />
              </div>
              <div className="w-40">
                <Label className="text-xs text-muted-foreground mb-1 block">To Date</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  data-testid="input-date-to"
                />
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters(defaultFilters)}
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading orders...</div>
        ) : !filteredOrders?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {orders?.length ? "No orders match your filters" : "No orders yet"}
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Select All */}
              <div className="flex items-center gap-3 px-2">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={toggleAll}
                  data-testid="checkbox-select-all"
                />
                <span className="text-sm text-muted-foreground">
                  {isAllSelected ? "Deselect all" : `Select all (${filteredOrders.length})`}
                </span>
              </div>

              {filteredOrders.map((order) => (
                <Card
                  key={order.id}
                  className={`transition-all hover:border-primary/50 ${selectedOrder === order.id ? "border-primary ring-2 ring-primary" : ""} ${isSelected(order.id) ? "bg-primary/5" : ""}`}
                  data-testid={`order-card-${order.id}`}
                  data-order-id={order.id}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={isSelected(order.id)}
                        onCheckedChange={() => toggleItem(order.id)}
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`checkbox-order-${order.id}`}
                      />
                      <div 
                        className="flex-1 flex items-start justify-between gap-4 cursor-pointer"
                        onClick={() => setSelectedOrder(order.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className={statusColors[order.status] || statusColors.pending}>
                              {getOrderStatusLabel(order.status)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              #{order.id.slice(0, 8)}
                            </span>
                          </div>
                          <p className="font-medium truncate">{order.customer?.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{order.customer?.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-display font-bold text-lg">
                            ${(order.totalAmount / 100).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.createdAt), "MMM d, yyyy")}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-1">
              {currentOrder ? (
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle className="text-lg">Order Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Order ID</p>
                      <p className="font-mono text-sm">{currentOrder.id}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Status</p>
                      <Select
                        value={currentOrder.status}
                        onValueChange={(status) => {
                          if (status === "shipped" && currentOrder.status !== "shipped") {
                            setShipDialogOpen(true);
                          } else {
                            updateOrderMutation.mutate({ id: currentOrder.id, status });
                          }
                        }}
                      >
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <User className="w-4 h-4" /> Customer
                      </p>
                      <p className="font-medium">{currentOrder.customer?.name}</p>
                      <p className="text-sm text-muted-foreground">{currentOrder.customer?.email}</p>
                      {currentOrder.customer?.phone && (
                        <p className="text-sm text-muted-foreground">{currentOrder.customer.phone}</p>
                      )}
                      {currentOrder.customer?.address && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {currentOrder.customer.address}<br />
                          {currentOrder.customer.city}, {currentOrder.customer.state} {currentOrder.customer.zipCode}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Items</p>
                      {currentOrder.items.map((item, i) => (
                        <div key={i} className="flex justify-between py-2 border-b border-border last:border-0">
                          <div>
                            <p className="font-medium text-sm">{item.productName}</p>
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-medium">
                            ${((item.unitPrice * item.quantity) / 100).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between pt-4 border-t border-border">
                      <p className="font-semibold">Total</p>
                      <p className="font-display font-bold text-xl text-primary">
                        ${(currentOrder.totalAmount / 100).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(currentOrder.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                    </div>

                    {/* Shipping Section */}
                    <div className="pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                        <Truck className="w-4 h-4" /> Shipping
                      </p>
                      
                      {currentOrder.shipments && currentOrder.shipments.length > 0 ? (
                        <div className="space-y-3">
                          {currentOrder.shipments.map((shipment) => (
                            <div key={shipment.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <Badge className={statusColors[shipment.status] || statusColors.shipped}>
                                  {shipment.status}
                                </Badge>
                                {shipment.shippedAt && (
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(shipment.shippedAt), "MMM d, yyyy")}
                                  </span>
                                )}
                              </div>
                              {shipment.carrier && (
                                <p className="text-sm">
                                  <span className="text-muted-foreground">Carrier:</span> {shipment.carrier}
                                </p>
                              )}
                              {shipment.trackingNumber && (
                                <p className="text-sm font-mono">
                                  <span className="text-muted-foreground">Tracking:</span> {shipment.trackingNumber}
                                </p>
                              )}
                              {shipment.trackingUrl && (
                                <a 
                                  href={shipment.trackingUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline flex items-center gap-1"
                                >
                                  Track Package <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              <div className="flex items-center gap-2 pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => resendEmailMutation.mutate(shipment.id)}
                                  disabled={resendEmailMutation.isPending}
                                  data-testid="button-resend-email"
                                >
                                  <Mail className="w-3 h-3 mr-1" />
                                  {shipment.shippedEmailSentAt ? "Resend Email" : "Send Email"}
                                </Button>
                                {shipment.shippedEmailSentAt && (
                                  <span className="text-xs text-muted-foreground">
                                    Sent {format(new Date(shipment.shippedEmailSentAt), "MMM d")}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mb-3">No shipments yet</p>
                      )}

                      {(currentOrder.status === "paid" || currentOrder.status === "processing" || currentOrder.status === "pending") && (
                        <Button 
                          className="w-full mt-3 gap-2" 
                          onClick={() => setShipDialogOpen(true)}
                          data-testid="button-ship-order"
                        >
                          <Truck className="w-4 h-4" />
                          Ship Order
                        </Button>
                      )}

                      <Dialog open={shipDialogOpen} onOpenChange={setShipDialogOpen}>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Ship Order #{currentOrder.id.slice(0, 8)}</DialogTitle>
                            <p className="text-sm text-muted-foreground">
                              Enter shipping details and tracking information
                            </p>
                          </DialogHeader>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              shipOrderMutation.mutate({
                                orderId: currentOrder.id,
                                ...shipFormData,
                              });
                            }}
                            className="space-y-4"
                          >
                            <div className="space-y-2">
                              <Label htmlFor="carrier">Carrier</Label>
                              <Select
                                value={shipFormData.carrier}
                                onValueChange={(v) => setShipFormData({ ...shipFormData, carrier: v })}
                              >
                                <SelectTrigger data-testid="select-carrier">
                                  <SelectValue placeholder="Select carrier..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="UPS">UPS</SelectItem>
                                  <SelectItem value="FedEx">FedEx</SelectItem>
                                  <SelectItem value="USPS">USPS</SelectItem>
                                  <SelectItem value="DHL">DHL</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="trackingNumber">Tracking Number</Label>
                              <Input
                                id="trackingNumber"
                                value={shipFormData.trackingNumber}
                                onChange={(e) => setShipFormData({ ...shipFormData, trackingNumber: e.target.value })}
                                placeholder="Enter tracking number..."
                                data-testid="input-tracking-number"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="trackingUrl">Tracking URL (optional)</Label>
                              <Input
                                id="trackingUrl"
                                value={shipFormData.trackingUrl}
                                onChange={(e) => setShipFormData({ ...shipFormData, trackingUrl: e.target.value })}
                                placeholder="https://..."
                                data-testid="input-tracking-url"
                              />
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="sendEmail"
                                checked={shipFormData.sendEmail}
                                onCheckedChange={(checked) => setShipFormData({ ...shipFormData, sendEmail: !!checked })}
                                data-testid="checkbox-send-email"
                              />
                              <Label htmlFor="sendEmail" className="text-sm cursor-pointer">
                                Send shipping notification email to customer
                              </Label>
                            </div>
                            
                            <Button
                              type="submit"
                              className="w-full"
                              disabled={shipOrderMutation.isPending || !shipFormData.carrier}
                              data-testid="button-confirm-ship"
                            >
                              {shipOrderMutation.isPending ? (
                                <>
                                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                  Shipping...
                                </>
                              ) : (
                                <>
                                  <Truck className="w-4 h-4 mr-2" />
                                  Confirm Shipment
                                </>
                              )}
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Select an order to view details
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedCount}
        actions={bulkActions}
        onClear={clearSelection}
      />

      {/* Bulk Ship Dialog */}
      <Dialog open={bulkShipDialogOpen} onOpenChange={setBulkShipDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ship {selectedCount} Orders</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Enter shipping details for bulk shipment
            </p>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              bulkShipMutation.mutate({
                ids: Array.from(selectedIds),
                data: bulkShipData,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="bulk-carrier">Carrier</Label>
              <Select
                value={bulkShipData.carrier}
                onValueChange={(v) => setBulkShipData({ ...bulkShipData, carrier: v })}
              >
                <SelectTrigger data-testid="select-bulk-carrier">
                  <SelectValue placeholder="Select carrier..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPS">UPS</SelectItem>
                  <SelectItem value="FedEx">FedEx</SelectItem>
                  <SelectItem value="USPS">USPS</SelectItem>
                  <SelectItem value="DHL">DHL</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="bulk-sendEmail"
                checked={bulkShipData.sendEmail}
                onCheckedChange={(checked) => setBulkShipData({ ...bulkShipData, sendEmail: !!checked })}
                data-testid="checkbox-bulk-send-email"
              />
              <Label htmlFor="bulk-sendEmail" className="text-sm cursor-pointer">
                Send shipping notification emails to customers
              </Label>
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={bulkShipMutation.isPending || !bulkShipData.carrier}
              data-testid="button-confirm-bulk-ship"
            >
              {bulkShipMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Shipping...
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4 mr-2" />
                  Ship {selectedCount} Orders
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
