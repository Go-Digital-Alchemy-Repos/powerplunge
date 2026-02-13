import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Package, ArrowLeft, Truck, CheckCircle, Clock, XCircle, ExternalLink, Loader2 } from "lucide-react";
import { ORDER_STATUS_CONFIG, getOrderStatusLabel, getOrderStatusSubtext, getOrderStatusBgColor } from "@shared/orderStatus";

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface Shipment {
  id: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string | null;
  status: string;
  createdAt: string;
}

interface Customer {
  name: string;
  email: string;
  address: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
}

interface OrderData {
  id: string;
  status: string;
  totalAmount: number;
  subtotalAmount: number | null;
  taxAmount: number | null;
  affiliateDiscountAmount: number | null;
  couponDiscountAmount: number | null;
  couponCode: string | null;
  createdAt: string;
  items: OrderItem[];
  customer: Customer;
  shipments: Shipment[];
  isManualOrder?: boolean;
  stripePaymentIntentId?: string | null;
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getStatusIcon(status: string) {
  const iconType = ORDER_STATUS_CONFIG[status]?.icon || "clock";
  switch (iconType) {
    case "clock":
      return <Clock className="w-6 h-6 text-yellow-500" />;
    case "check":
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    case "truck":
      return <Truck className="w-6 h-6 text-blue-500" />;
    case "delivered":
      return <CheckCircle className="w-6 h-6 text-green-600" />;
    case "cancelled":
      return <XCircle className="w-6 h-6 text-red-500" />;
    default:
      return <Package className="w-6 h-6 text-gray-500" />;
  }
}

export default function OrderStatus() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const { data: order, isLoading, error } = useQuery<OrderData>({
    queryKey: ["/api/orders", orderId, "status"],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}/status`);
      if (res.status === 404) throw new Error("Order not found");
      if (!res.ok) throw new Error("Failed to load order");
      return res.json();
    },
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="loading-container">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground" data-testid="text-loading">Loading your order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 bg-card border-b border-border">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="link-home">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Store
              </Button>
            </Link>
          </div>
        </nav>
        <main className="max-w-md mx-auto px-6 py-16 text-center">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2" data-testid="text-error-title">Order Not Found</h1>
          <p className="text-muted-foreground mb-6" data-testid="text-error-description">
            We couldn't find this order. The link may be incorrect or the order may no longer exist.
          </p>
          <Link href="/track-order">
            <Button data-testid="button-track-order">Look Up Your Orders</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="link-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Store
            </Button>
          </Link>
          <Link href="/track-order">
            <Button variant="outline" size="sm" data-testid="link-all-orders">
              View All Orders
            </Button>
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            {getStatusIcon(order.status)}
            <h1 className="font-display text-3xl font-bold" data-testid="text-order-title">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </h1>
          </div>
          <p className="text-muted-foreground ml-9" data-testid="text-order-date">{formatDate(order.createdAt)}</p>
        </div>

        <div className="mb-6">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${getOrderStatusBgColor(order.status)}`} data-testid="badge-order-status">
            {getOrderStatusLabel(order.status)}
          </div>
          <p className="mt-2 text-muted-foreground" data-testid="text-status-description">
            {getOrderStatusSubtext(order.status)}
          </p>
        </div>

        {order.shipments && order.shipments.length > 0 && (
          <Card className="mb-6" data-testid="card-shipments">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Truck className="w-5 h-5" />
                Shipping & Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.shipments.map((shipment) => (
                <div key={shipment.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg" data-testid={`shipment-${shipment.id}`}>
                  <div>
                    <p className="font-medium" data-testid={`text-carrier-${shipment.id}`}>{shipment.carrier}</p>
                    <p className="text-sm text-muted-foreground" data-testid={`text-tracking-${shipment.id}`}>{shipment.trackingNumber}</p>
                    <p className="text-xs text-muted-foreground mt-1" data-testid={`text-ship-date-${shipment.id}`}>
                      Shipped {formatDate(shipment.createdAt)}
                    </p>
                  </div>
                  {shipment.trackingUrl && (
                    <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" data-testid={`button-track-${shipment.id}`}>
                        Track Package
                        <ExternalLink className="w-3 h-3 ml-2" />
                      </Button>
                    </a>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="mb-6" data-testid="card-items">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="w-5 h-5" />
              Order Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-2" data-testid={`item-${item.id}`}>
                  <div>
                    <p className="font-medium" data-testid={`text-product-name-${item.id}`}>{item.productName}</p>
                    <p className="text-sm text-muted-foreground" data-testid={`text-product-qty-${item.id}`}>Qty: {item.quantity}</p>
                  </div>
                  <p className="font-medium" data-testid={`text-product-price-${item.id}`}>{formatCurrency(item.unitPrice * item.quantity)}</p>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              {order.subtotalAmount != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span data-testid="text-subtotal">{formatCurrency(order.subtotalAmount)}</span>
                </div>
              )}
              {(order.affiliateDiscountAmount ?? 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Affiliate Discount</span>
                  <span className="text-green-500" data-testid="text-affiliate-discount">-{formatCurrency(order.affiliateDiscountAmount!)}</span>
                </div>
              )}
              {(order.couponDiscountAmount ?? 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Coupon{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                  <span className="text-green-500" data-testid="text-coupon-discount">-{formatCurrency(order.couponDiscountAmount!)}</span>
                </div>
              )}
              {(order.taxAmount ?? 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span data-testid="text-tax">{formatCurrency(order.taxAmount!)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-xl text-primary" data-testid="text-order-total">
                  {order.isManualOrder && !order.stripePaymentIntentId ? "FREE" : formatCurrency(order.totalAmount)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {order.customer && (
          <Card className="mb-6" data-testid="card-customer">
            <CardHeader>
              <CardTitle className="text-lg">Shipping Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium" data-testid="text-customer-name">{order.customer.name}</p>
              <p className="text-sm text-muted-foreground" data-testid="text-customer-email">{order.customer.email}</p>
              <div className="mt-2 text-sm text-muted-foreground">
                {order.customer.address && (
                  <p data-testid="text-customer-address">{order.customer.address}</p>
                )}
                {order.customer.addressLine2 && (
                  <p data-testid="text-customer-address2">{order.customer.addressLine2}</p>
                )}
                {(order.customer.city || order.customer.state || order.customer.zipCode) && (
                  <p data-testid="text-customer-location">
                    {[order.customer.city, order.customer.state].filter(Boolean).join(", ")}
                    {order.customer.zipCode ? ` ${order.customer.zipCode}` : ""}
                  </p>
                )}
                {order.customer.country && <p data-testid="text-customer-country">{order.customer.country}</p>}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-sm text-muted-foreground" data-testid="text-help-footer">
          <p>Need help with your order? <Link href="/track-order" className="text-primary hover:underline" data-testid="link-sign-in-orders">Sign in to view all orders</Link> or contact our support team.</p>
        </div>
      </main>
    </div>
  );
}
