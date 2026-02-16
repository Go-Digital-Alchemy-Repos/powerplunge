import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Package, ArrowRight, Loader2, User, Gift, History } from "lucide-react";
import PostPurchaseOffer from "@/components/PostPurchaseOffer";
import { useBranding } from "@/hooks/use-branding";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { trackPurchase } from "@/lib/analytics";

interface OrderData {
  order: {
    id: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    isManualOrder?: boolean;
    stripePaymentIntentId?: string | null;
  };
  customer: {
    id: string;
    name: string;
    email: string;
    userId: string | null;
  };
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export default function OrderSuccess() {
  const search = useSearch();
  const { logoSrc, companyName } = useBranding();
  const params = new URLSearchParams(search);
  const sessionId = params.get("session_id");
  const orderId = params.get("order_id");
  const linkCustomerId = params.get("link_customer");
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accountLinked, setAccountLinked] = useState(false);
  const { customer, isLoading: authLoading } = useCustomerAuth();

  const isGuestOrder = orderData?.customer && !orderData.customer.userId && !accountLinked;
  const showAccountPrompt = !authLoading && !customer && isGuestOrder;

  useEffect(() => {
    localStorage.removeItem("cart");

    const fetchOrder = async () => {
      try {
        let data = null;
        if (sessionId) {
          const res = await fetch(`/api/orders/by-session/${sessionId}`);
          data = await res.json();
          if (data?.order) {
            localStorage.setItem("pendingOrderLink", JSON.stringify({
              orderId: data.order.id,
              customerId: data.customer?.id,
              sessionId,
            }));

            trackPurchase({
              transactionId: data.order.id,
              value: data.order.totalAmount / 100,
              items: (data.items || []).map((item: any) => ({
                id: item.productId || item.productName,
                name: item.productName,
                price: item.unitPrice / 100,
                quantity: item.quantity,
              })),
            });
          }
        }
        if (data?.order) {
          setOrderData(data);
        }
      } catch (e) {
        console.error("Failed to fetch order:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [sessionId]);

  useEffect(() => {
    if (customer && !accountLinked) {
      const pendingLink = localStorage.getItem("pendingOrderLink");
      if (pendingLink) {
        try {
          const { customerId, sessionId: storedSessionId } = JSON.parse(pendingLink);
          if (customerId) {
            fetch("/api/customer/link", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ customerId, sessionId: storedSessionId }),
            })
              .then((res) => {
                if (res.ok) {
                  setAccountLinked(true);
                  localStorage.removeItem("pendingOrderLink");
                }
              })
              .catch(console.error);
          }
        } catch (e) {
          console.error("Failed to parse pending link:", e);
        }
      }
    }
  }, [customer, accountLinked]);

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-center">
          <Link href="/">
            <img src={logoSrc} alt={companyName} className="h-8" />
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="font-display text-4xl font-bold mb-4" data-testid="text-success-title">
            Order Confirmed!
          </h1>
          <p className="text-muted-foreground text-lg">
            Thank you for your purchase. Your order has been received and is being processed.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : orderData ? (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order ID</p>
                  <p className="text-sm" data-testid="text-order-id">
                    {orderData.order.id.slice(0, 8)}...
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium capitalize text-green-500" data-testid="text-order-status">
                    {orderData.order.status}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Confirmation sent to</p>
                <p className="font-medium" data-testid="text-customer-email">
                  {orderData.customer?.email}
                </p>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground mb-3">Items</p>
                {orderData.items.map((item, i) => (
                  <div key={i} className="flex justify-between py-2">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium">
                      ${((item.unitPrice * item.quantity) / 100).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <p className="font-semibold">Total</p>
                <p className="font-display font-bold text-2xl text-primary" data-testid="text-order-total">
                  {`$${(orderData.order.totalAmount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : orderId ? (
          <Card className="mb-8">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-2">Order ID</p>
              <p className="text-lg" data-testid="text-order-id">{orderId.slice(0, 8)}...</p>
              <p className="text-sm text-muted-foreground mt-4">
                We'll send you an email confirmation shortly.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {orderData?.order.id && (
          <PostPurchaseOffer orderId={orderData.order.id} />
        )}

        {showAccountPrompt && (
          <Card className="mb-8 border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5 text-primary" />
                Save Your Info for Next Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Create an account to track your orders, speed up future checkouts, and unlock exclusive benefits.
              </p>
              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  <span>Order History</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span>Track Shipments</span>
                </div>
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-primary" />
                  <span>VIP Rewards</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a 
                  href="/api/login"
                  className="flex-1"
                >
                  <Button className="w-full gap-2" data-testid="button-create-account">
                    <User className="w-4 h-4" />
                    Create Account
                  </Button>
                </a>
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full" data-testid="button-skip-account">
                    Maybe Later
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            You'll receive an email confirmation with your order details and tracking information once your order ships.
          </p>
          <Link href="/">
            <Button className="gap-2" data-testid="button-continue-shopping">
              Continue Shopping
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
