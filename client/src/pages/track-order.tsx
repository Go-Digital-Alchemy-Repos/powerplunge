import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Package, Mail, ArrowLeft, Truck, CheckCircle, Clock, XCircle, ChevronRight } from "lucide-react";
import { ORDER_STATUS_CONFIG, getOrderStatusLabel, getOrderStatusSubtext, getOrderStatusBgColor } from "@shared/orderStatus";

interface OrderItem {
  id: string;
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

interface CustomerSession {
  customerId: string;
  customerName: string;
  customerEmail: string;
  sessionToken: string;
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
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
      return <Clock className="w-5 h-5 text-yellow-500" />;
    case "check":
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case "truck":
      return <Truck className="w-5 h-5 text-blue-500" />;
    case "delivered":
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    case "cancelled":
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Package className="w-5 h-5 text-gray-500" />;
  }
}

export default function TrackOrder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [customerSession, setCustomerSession] = useState<CustomerSession | null>(null);
  const [verifyingToken, setVerifyingToken] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    
    if (token) {
      setVerifyingToken(true);
      verifyToken(token);
    }

    const savedSession = sessionStorage.getItem("customerSession");
    if (savedSession) {
      try {
        setCustomerSession(JSON.parse(savedSession));
      } catch (e) {
        sessionStorage.removeItem("customerSession");
      }
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch("/api/customer/orders/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        const session = {
          customerId: data.customerId,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          sessionToken: data.sessionToken,
        };
        setCustomerSession(session);
        sessionStorage.setItem("customerSession", JSON.stringify(session));
        
        window.history.replaceState({}, document.title, "/track-order");
        
        toast({
          title: "Welcome back!",
          description: "You can now view your orders.",
        });
      } else {
        toast({
          title: "Link expired",
          description: data.message || "Please request a new link.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Verification failed",
        description: "Please try again or request a new link.",
        variant: "destructive",
      });
    } finally {
      setVerifyingToken(false);
    }
  };

  const { data: ordersData, isLoading: ordersLoading, error: ordersError } = useQuery<{ orders: Order[] }>({
    queryKey: ["/api/customer/orders", customerSession?.customerId],
    queryFn: async () => {
      if (!customerSession?.sessionToken) return { orders: [] };
      const response = await fetch("/api/customer/orders", {
        headers: {
          Authorization: `Bearer ${customerSession.sessionToken}`,
        },
      });
      if (response.status === 401) {
        handleLogout();
        throw new Error("Session expired");
      }
      if (!response.ok) throw new Error("Failed to fetch orders");
      return response.json();
    },
    enabled: !!customerSession?.sessionToken,
  });
  const orders = ordersData?.orders || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/customer/orders/request-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setEmailSent(true);
        toast({
          title: "Check your email",
          description: "If you have orders with us, you'll receive a link to view them.",
        });
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.message || "Failed to send link. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setCustomerSession(null);
    sessionStorage.removeItem("customerSession");
    setEmailSent(false);
    setEmail("");
  };

  if (verifyingToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying your access...</p>
        </div>
      </div>
    );
  }

  if (customerSession) {
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
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{customerSession.customerEmail}</span>
              <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-logout">
                Sign Out
              </Button>
            </div>
          </div>
        </nav>

        <main className="max-w-4xl mx-auto px-6 py-12">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-welcome">
              Welcome, {customerSession.customerName}
            </h1>
            <p className="text-muted-foreground">Here's a summary of your orders with us.</p>
          </div>

          {ordersLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-1/3"></div>
                    <div className="h-4 bg-muted rounded w-1/4 mt-2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="hover:shadow-md transition-shadow" data-testid={`card-order-${order.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(order.status)}
                        <div>
                          <CardTitle className="text-lg">
                            Order #{order.id.slice(0, 8).toUpperCase()}
                          </CardTitle>
                          <CardDescription>{formatDate(order.createdAt)}</CardDescription>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getOrderStatusBgColor(order.status)}`}>
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {getOrderStatusSubtext(order.status)}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.productName} × {item.quantity}
                          </span>
                          <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t">
                      <span className="font-medium">Total</span>
                      <span className="font-bold text-lg">{formatCurrency(order.totalAmount)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                <p className="text-muted-foreground mb-6">
                  You haven't placed any orders with us yet.
                </p>
                <Link href="/">
                  <Button data-testid="button-shop-now">Start Shopping</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    );
  }

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

      <main className="max-w-md mx-auto px-6 py-16">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Track Your Order</CardTitle>
            <CardDescription>
              {emailSent
                ? "Check your email for a secure link to view your orders."
                : "Enter your email address to receive a secure link to view your orders."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emailSent ? (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Check your inbox</h3>
                  <p className="text-sm text-muted-foreground">
                    We've sent a login link to <strong>{email}</strong>. The link will expire in 15 minutes.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setEmailSent(false);
                    setEmail("");
                  }}
                  data-testid="button-try-different-email"
                >
                  Try a different email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-email"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="button-send-link">
                  {isSubmitting ? "Sending..." : "Send Login Link"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
