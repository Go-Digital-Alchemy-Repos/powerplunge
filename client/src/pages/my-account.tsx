import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Package, Truck, CheckCircle, Clock, ArrowLeft, LogOut, User, Link2, DollarSign, Users, Copy, QrCode, ExternalLink, FileText, Loader2, Settings, Save, MapPin, Mail, Phone, Lock, AlertCircle, Crown, Gift, Zap, Sparkles, CreditCard, AlertTriangle, Calendar, MapPinned, PackageCheck, Headset, Send, MessageSquare } from "lucide-react";
import DynamicNav from "@/components/DynamicNav";
import { useBranding } from "@/hooks/use-branding";

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
  shippedAt: string;
  updatedAt?: string;
  estimatedDelivery?: string;
}

type ShipmentStatus = "pending" | "shipped" | "in_transit" | "delivered";

const shipmentSteps: { status: ShipmentStatus; label: string; icon: any }[] = [
  { status: "pending", label: "Pending", icon: Clock },
  { status: "shipped", label: "Shipped", icon: Package },
  { status: "in_transit", label: "In Transit", icon: Truck },
  { status: "delivered", label: "Delivered", icon: PackageCheck },
];

function getShipmentStepIndex(status: string): number {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, "_") as ShipmentStatus;
  const index = shipmentSteps.findIndex((s) => s.status === normalizedStatus);
  return index >= 0 ? index : 0;
}

function ShipmentTimeline({ status, updatedAt }: { status: string; updatedAt?: string }) {
  const currentStepIndex = getShipmentStepIndex(status);

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Progress Line Background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border z-0" />
        {/* Progress Line Filled */}
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary z-0 transition-all duration-500"
          style={{ width: `${(currentStepIndex / (shipmentSteps.length - 1)) * 100}%` }}
        />

        {shipmentSteps.map((step, index) => {
          const StepIcon = step.icon;
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <div key={step.status} className="flex flex-col items-center z-10">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? isCurrent
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/30"
                      : "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
                data-testid={`timeline-step-${step.status}`}
              >
                <StepIcon className="w-5 h-5" />
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  isCompleted ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {updatedAt && (
        <p className="text-center text-xs text-muted-foreground mt-4">
          Last updated: {new Date(updatedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
  shipments?: Shipment[];
  isManualOrder?: boolean;
  stripePaymentIntentId?: string | null;
}

interface CustomerData {
  customer?: {
    name: string;
    email: string;
  };
  orders: Order[];
}

interface VipData {
  isVip: boolean;
  vipStatus: {
    id: string;
    status: string;
    tier: string;
    lifetimeSpendAtPromotion: number;
    orderCountAtPromotion: number;
    promotedAt: string;
    promotionType: string;
  } | null;
  benefits: {
    isVip: boolean;
    freeShipping: boolean;
    freeShippingThreshold: number;
    discountPercent: number;
    prioritySupport: boolean;
    earlyAccess: boolean;
  };
  eligibility: {
    isEligible: boolean;
    isCurrentVip: boolean;
    lifetimeSpend: number;
    orderCount: number;
    spendThreshold: number;
    orderThreshold: number;
  };
}

interface AffiliateData {
  affiliate: {
    id: string;
    code: string;
    status: string;
    totalEarnings: number;
    pendingEarnings: number;
    approvedEarnings: number;
    paidEarnings: number;
    totalReferrals: number;
    totalConversions: number;
    totalRevenue: number;
    createdAt: string;
  } | null;
  referrals: Array<{
    id: string;
    orderTotal: number;
    commission: number;
    status: string;
    createdAt: string;
    approvedAt?: string;
    paidAt?: string;
  }>;
  payouts: Array<{
    id: string;
    amount: number;
    status: string;
    paymentMethod: string;
    requestedAt: string;
    processedAt?: string;
    notes?: string;
  }>;
  commissionRate: number;
  minimumPayout: number;
  approvalDays: number;
  agreementText: string;
}

interface ConnectStatus {
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  requirements?: {
    currently_due?: string[];
    eventually_due?: string[];
    past_due?: string[];
  };
  country?: string;
  currency?: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  type: string;
  status: string;
  priority: string;
  orderId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

const statusConfig: Record<string, { icon: any; label: string; color: string }> = {
  pending: { icon: Clock, label: "Pending", color: "text-yellow-500" },
  paid: { icon: CheckCircle, label: "Paid", color: "text-green-500" },
  shipped: { icon: Truck, label: "Shipped", color: "text-blue-500" },
  delivered: { icon: Package, label: "Delivered", color: "text-emerald-500" },
  cancelled: { icon: Clock, label: "Cancelled", color: "text-red-500" },
};

export default function MyAccount() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { logoSrc, companyName } = useBranding();
  const queryClient = useQueryClient();
  const { customer: authCustomer, isLoading: authLoading, isAuthenticated, logout, getAuthHeader } = useCustomerAuth();
  const [activeTab, setActiveTab] = useState("orders");
  const [showEsign, setShowEsign] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "USA",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [supportForm, setSupportForm] = useState({
    subject: "",
    message: "",
    orderId: "",
    type: "general" as string,
  });

  const { data, isLoading } = useQuery<CustomerData>({
    queryKey: ["/api/customer/orders/orders"],
    queryFn: async () => {
      const res = await fetch("/api/customer/orders/orders", { 
        headers: { ...getAuthHeader() }
      });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: affiliateData, isLoading: affiliateLoading } = useQuery<AffiliateData>({
    queryKey: ["/api/customer/affiliate-portal"],
    queryFn: async () => {
      const res = await fetch("/api/customer/affiliate-portal", { 
        headers: { ...getAuthHeader() }
      });
      if (!res.ok && res.status !== 404) throw new Error("Failed to fetch affiliate data");
      if (res.status === 404) return { affiliate: null, referrals: [], stats: null };
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: profileData, isLoading: profileLoading } = useQuery<{
    user: { id: string; email: string; firstName: string; lastName: string } | null;
    customer: { phone: string; address: string; city: string; state: string; zipCode: string; country: string } | null;
  }>({
    queryKey: ["/api/customer/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/customer/auth/me", { 
        headers: { ...getAuthHeader() }
      });
      if (!res.ok) throw new Error("Failed to fetch profile");
      const customer = await res.json();
      return { 
        user: { id: customer.id, email: customer.email, firstName: customer.name?.split(' ')[0] || '', lastName: customer.name?.split(' ').slice(1).join(' ') || '' },
        customer 
      };
    },
    enabled: isAuthenticated,
  });

  const { data: vipData } = useQuery<VipData>({
    queryKey: ["/api/vip/customer-status"],
    queryFn: async () => {
      const res = await fetch("/api/customer/orders/vip-status", { 
        headers: { ...getAuthHeader() }
      });
      if (!res.ok && res.status !== 404) throw new Error("Failed to fetch VIP status");
      if (res.status === 404) return { isVip: false };
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: connectStatus } = useQuery<ConnectStatus | null>({
    queryKey: ["/api/customer/affiliate/connect/status"],
    queryFn: async () => {
      const res = await fetch("/api/customer/affiliate-portal/connect/status", { 
        headers: { ...getAuthHeader() }
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch connect status");
      return res.json();
    },
    enabled: isAuthenticated && !!affiliateData?.affiliate,
  });

  const { data: supportTickets, isLoading: ticketsLoading } = useQuery<{ tickets: SupportTicket[] }>({
    queryKey: ["/api/customer/orders/support"],
    queryFn: async () => {
      const res = await fetch("/api/customer/orders/support", { 
        headers: { ...getAuthHeader() }
      });
      if (!res.ok && res.status !== 404) throw new Error("Failed to fetch support tickets");
      if (res.status === 404) return { tickets: [] };
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: { subject: string; message: string; orderId?: string; type: string }) => {
      const res = await fetch("/api/customer/orders/support", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(data.orderId ? data : { ...data, orderId: undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create support ticket");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/orders/support"] });
      setSupportForm({ subject: "", message: "", orderId: "", type: "general" });
      toast({ title: "Support request submitted successfully!" });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const startConnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/customer/affiliate-portal/connect/start", {
        method: "POST",
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to start Stripe Connect");
      }
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      window.open(data.url, "_blank");
      toast({ title: "Stripe onboarding opened in new tab" });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  // Calculate next Monday for payout
  const getNextPayoutDate = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    return nextMonday.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  };

  useEffect(() => {
    if (profileData) {
      setProfileForm({
        firstName: profileData.user?.firstName || "",
        lastName: profileData.user?.lastName || "",
        email: profileData.user?.email || "",
        phone: profileData.customer?.phone || "",
        address: profileData.customer?.address || "",
        city: profileData.customer?.city || "",
        state: profileData.customer?.state || "",
        zipCode: profileData.customer?.zipCode || "",
        country: profileData.customer?.country || "USA",
      });
    }
  }, [profileData]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      const res = await fetch("/api/customer/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/auth/me"] });
      toast({ title: "Profile updated successfully!" });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await fetch("/api/customer/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to change password");
      }
      return res.json();
    },
    onSuccess: () => {
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Password changed successfully!" });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const signAgreementMutation = useMutation({
    mutationFn: async (data: { signatureName: string }) => {
      const res = await fetch("/api/customer/affiliate-portal/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to sign agreement");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/affiliate-portal"] });
      setShowEsign(false);
      setSignatureName("");
      setAgreedToTerms(false);
      toast({ title: "Welcome to the affiliate program!" });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/login?redirect=/my-account";
    }
  }, [authLoading, isAuthenticated]);

  const copyReferralLink = () => {
    if (affiliateData?.affiliate?.code) {
      const link = `${window.location.origin}?ref=${affiliateData.affiliate.code}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Referral link copied!" });
    }
  };

  const generateQRCodeUrl = (code: string) => {
    const link = encodeURIComponent(`${window.location.origin}?ref=${code}`);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${link}&color=67e8f9&bgcolor=0a0a0a`;
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={logoSrc} alt={companyName} className="h-8" />
            <DynamicNav location="main" />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>{authCustomer?.name || authCustomer?.email}</span>
              {vipData?.isVip && (
                <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-0 gap-1" data-testid="badge-vip">
                  <Crown className="w-3 h-3" />
                  VIP
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="orders" className="gap-2" data-testid="tab-orders">
              <Package className="w-4 h-4" />
              My Orders
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2" data-testid="tab-account">
              <Settings className="w-4 h-4" />
              Account Details
            </TabsTrigger>
            <TabsTrigger value="affiliate" className="gap-2" data-testid="tab-affiliate" onClick={(e) => { e.preventDefault(); setLocation('/affiliate-portal'); }}>
              <Link2 className="w-4 h-4" />
              Affiliate Program
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-2" data-testid="tab-support">
              <Headset className="w-4 h-4" />
              Support
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <h1 className="font-display text-3xl font-bold mb-8" data-testid="text-page-title">My Orders</h1>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : !data?.orders || data.orders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
                  <p className="text-muted-foreground mb-6">When you place an order, it will appear here.</p>
                  <Button onClick={() => setLocation("/")} data-testid="button-shop">
                    Start Shopping
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {data.orders.map((order) => {
                  const status = statusConfig[order.status] || statusConfig.pending;
                  const StatusIcon = status.icon;

                  return (
                    <Card key={order.id} data-testid={`card-order-${order.id}`}>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <div className={`flex items-center gap-2 ${status.color}`}>
                          <StatusIcon className="w-5 h-5" />
                          <span className="font-medium">{status.label}</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between py-2 border-b border-border last:border-0">
                              <div>
                                <p className="font-medium">{item.productName}</p>
                                <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                              </div>
                              <p className="font-medium">${((item.unitPrice * item.quantity) / 100).toLocaleString()}</p>
                            </div>
                          ))}
                          <div className="flex justify-between pt-4 font-semibold">
                            <span>Total</span>
                            <span className="text-primary">{order.isManualOrder && !order.stripePaymentIntentId ? "FREE" : `$${(order.totalAmount / 100).toLocaleString()}`}</span>
                          </div>
                        </div>

                        {/* Shipment Tracking Section */}
                        {(order.status === "shipped" || order.status === "delivered" || order.shipments?.length) && (
                          <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border" data-testid={`shipment-section-${order.id}`}>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <MapPinned className="w-5 h-5 text-primary" />
                                <span className="font-medium">Shipment Tracking</span>
                              </div>
                              {order.shipments && order.shipments.length > 0 && order.shipments[0].trackingUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                  data-testid={`button-track-package-${order.id}`}
                                >
                                  <a
                                    href={order.shipments[0].trackingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Track Package
                                  </a>
                                </Button>
                              )}
                            </div>

                            {/* Timeline */}
                            <ShipmentTimeline 
                              status={order.shipments?.[0]?.status || order.status}
                              updatedAt={order.shipments?.[0]?.updatedAt || order.shipments?.[0]?.shippedAt}
                            />

                            {/* Shipment Details */}
                            {order.shipments && order.shipments.length > 0 && (
                              <div className="mt-4 space-y-2">
                                {order.shipments.map((shipment) => (
                                  <div 
                                    key={shipment.id} 
                                    className="flex items-center justify-between bg-background/50 rounded-lg p-3"
                                    data-testid={`shipment-details-${shipment.id}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Package className="w-5 h-5 text-primary" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm">{shipment.carrier}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {shipment.trackingNumber}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <Badge 
                                        variant="outline"
                                        className={
                                          shipment.status === "delivered" ? "border-emerald-500 text-emerald-500" :
                                          shipment.status === "in_transit" ? "border-blue-500 text-blue-500" :
                                          shipment.status === "shipped" ? "border-primary text-primary" :
                                          "border-yellow-500 text-yellow-500"
                                        }
                                        data-testid={`badge-shipment-status-${shipment.id}`}
                                      >
                                        {shipment.status === "in_transit" ? "In Transit" : 
                                         shipment.status.charAt(0).toUpperCase() + shipment.status.slice(1)}
                                      </Badge>
                                      {shipment.shippedAt && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {new Date(shipment.shippedAt).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* No shipment info yet */}
                            {(!order.shipments || order.shipments.length === 0) && order.status === "shipped" && (
                              <p className="text-sm text-muted-foreground text-center mt-2">
                                Tracking details will be available shortly.
                              </p>
                            )}

                            {/* Delivered message */}
                            {order.status === "delivered" && (
                              <div className="mt-4 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-center">
                                <div className="flex items-center justify-center gap-2 text-emerald-500">
                                  <CheckCircle className="w-5 h-5" />
                                  <span className="font-medium">Package delivered!</span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Thank you for your purchase. Enjoy your Power Plunge!
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Pending/Paid order - no shipment yet */}
                        {(order.status === "pending" || order.status === "paid") && !order.shipments?.length && (
                          <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border" data-testid={`pending-section-${order.id}`}>
                            <div className="flex items-center gap-2 mb-4">
                              <Clock className="w-5 h-5 text-yellow-500" />
                              <span className="font-medium">Order Processing</span>
                            </div>
                            <ShipmentTimeline status="pending" />
                            <p className="text-sm text-muted-foreground text-center">
                              Your order is being prepared. Tracking information will be available once shipped.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Account Details Tab */}
          <TabsContent value="account">
            <div className="flex items-center justify-between mb-8">
              <h1 className="font-display text-3xl font-bold" data-testid="text-account-title">Account Details</h1>
              {authCustomer?.id && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 border" data-testid="text-customer-client-id">
                  <span className="text-sm text-muted-foreground">Client ID:</span>
                  <span className="font-semibold text-primary">{authCustomer.id.slice(0, 8).toUpperCase()}</span>
                </div>
              )}
            </div>

            {profileLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* VIP Benefits Card */}
                {vipData?.isVip && (
                  <Card className="border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-yellow-500/5">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Crown className="w-5 h-5 text-amber-500" />
                        VIP Member Benefits
                        <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-0 ml-2">
                          {vipData.vipStatus?.tier || "Gold"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        You've been a VIP member since{" "}
                        {vipData.vipStatus?.promotedAt
                          ? new Date(vipData.vipStatus.promotedAt).toLocaleDateString()
                          : "recently"}.
                        Enjoy these exclusive benefits:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {vipData.benefits.freeShipping && (
                          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                            <Truck className="w-5 h-5 text-green-500" />
                            <div>
                              <p className="font-medium text-sm">Free Shipping</p>
                              <p className="text-xs text-muted-foreground">On all orders</p>
                            </div>
                          </div>
                        )}
                        {vipData.benefits.discountPercent > 0 && (
                          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                            <Gift className="w-5 h-5 text-primary" />
                            <div>
                              <p className="font-medium text-sm">{vipData.benefits.discountPercent}% VIP Discount</p>
                              <p className="text-xs text-muted-foreground">Applied at checkout</p>
                            </div>
                          </div>
                        )}
                        {vipData.benefits.prioritySupport && (
                          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                            <Zap className="w-5 h-5 text-yellow-500" />
                            <div>
                              <p className="font-medium text-sm">Priority Support</p>
                              <p className="text-xs text-muted-foreground">Skip the queue</p>
                            </div>
                          </div>
                        )}
                        {vipData.benefits.earlyAccess && (
                          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                            <Sparkles className="w-5 h-5 text-purple-500" />
                            <div>
                              <p className="font-medium text-sm">Early Access</p>
                              <p className="text-xs text-muted-foreground">New products first</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* VIP Eligibility Progress (for non-VIP customers) */}
                {!vipData?.isVip && vipData?.eligibility && (
                  <Card className="border-primary/30">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Crown className="w-5 h-5 text-muted-foreground" />
                        VIP Program
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Unlock exclusive VIP benefits! Here's your progress:
                      </p>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Lifetime Spend</span>
                            <span>
                              ${(vipData.eligibility.lifetimeSpend / 100).toLocaleString()} /{" "}
                              ${(vipData.eligibility.spendThreshold / 100).toLocaleString()}
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all"
                              style={{
                                width: `${Math.min(100, (vipData.eligibility.lifetimeSpend / vipData.eligibility.spendThreshold) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Order Count</span>
                            <span>
                              {vipData.eligibility.orderCount} / {vipData.eligibility.orderThreshold} orders
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all"
                              style={{
                                width: `${Math.min(100, (vipData.eligibility.orderCount / vipData.eligibility.orderThreshold) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-4">
                        Reach either threshold to become a VIP member and unlock free shipping, exclusive discounts, and more!
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={(e) => { e.preventDefault(); updateProfileMutation.mutate(profileForm); }} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            value={profileForm.firstName}
                            onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                            placeholder="John"
                            data-testid="input-first-name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            value={profileForm.lastName}
                            onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                            placeholder="Doe"
                            data-testid="input-last-name"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="email" className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                          placeholder="john@example.com"
                          data-testid="input-email"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone" className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          Phone Number
                        </Label>
                        <Input
                          id="phone"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          placeholder="(555) 123-4567"
                          data-testid="input-phone"
                        />
                      </div>
                      <Button type="submit" disabled={updateProfileMutation.isPending} className="gap-2" data-testid="button-save-profile">
                        {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Mailing Address */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Mailing Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={(e) => { e.preventDefault(); updateProfileMutation.mutate(profileForm); }} className="space-y-4">
                      <div>
                        <Label htmlFor="address">Street Address</Label>
                        <Input
                          id="address"
                          value={profileForm.address}
                          onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                          placeholder="123 Main Street"
                          data-testid="input-address"
                        />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={profileForm.city}
                            onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                            placeholder="Los Angeles"
                            data-testid="input-city"
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            value={profileForm.state}
                            onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                            placeholder="CA"
                            data-testid="input-state"
                          />
                        </div>
                        <div>
                          <Label htmlFor="zipCode">ZIP Code</Label>
                          <Input
                            id="zipCode"
                            value={profileForm.zipCode}
                            onChange={(e) => setProfileForm({ ...profileForm, zipCode: e.target.value })}
                            placeholder="90001"
                            data-testid="input-zip"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          value={profileForm.country}
                          onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                          placeholder="USA"
                          data-testid="input-country"
                        />
                      </div>
                      <Button type="submit" disabled={updateProfileMutation.isPending} className="gap-2" data-testid="button-save-address">
                        {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Address
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Password Change */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      Change Password
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20 mb-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">
                          If you signed in with Google, Apple, or a magic link, you cannot change your password here. 
                          Please update your password through your identity provider's settings.
                        </p>
                      </div>
                    </div>
                    <form onSubmit={(e) => { 
                      e.preventDefault(); 
                      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                        toast({ title: "Passwords don't match", variant: "destructive" });
                        return;
                      }
                      changePasswordMutation.mutate({ 
                        currentPassword: passwordForm.currentPassword, 
                        newPassword: passwordForm.newPassword 
                      }); 
                    }} className="space-y-4">
                      <div>
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                          placeholder="••••••••"
                          data-testid="input-current-password"
                        />
                      </div>
                      <div>
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          placeholder="••••••••"
                          data-testid="input-new-password"
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          placeholder="••••••••"
                          data-testid="input-confirm-password"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        disabled={changePasswordMutation.isPending || !passwordForm.newPassword} 
                        className="gap-2"
                        data-testid="button-change-password"
                      >
                        {changePasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                        Change Password
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Affiliate Tab */}
          <TabsContent value="affiliate">
            <h1 className="font-display text-3xl font-bold mb-8" data-testid="text-affiliate-title">Affiliate Program</h1>

            {affiliateLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : affiliateData?.affiliate ? (
              <div className="space-y-6">
                {/* Affiliate Status */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Your Affiliate Dashboard</CardTitle>
                      <Badge className={
                        affiliateData.affiliate.status === "active" 
                          ? "bg-green-500/20 text-green-500" 
                          : affiliateData.affiliate.status === "pending"
                          ? "bg-yellow-500/20 text-yellow-500"
                          : "bg-red-500/20 text-red-500"
                      }>
                        {affiliateData.affiliate.status.charAt(0).toUpperCase() + affiliateData.affiliate.status.slice(1)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="p-4 bg-muted rounded-lg text-center">
                        <DollarSign className="w-6 h-6 text-primary mx-auto mb-2" />
                        <p className="text-2xl font-bold">${(affiliateData.affiliate.totalEarnings / 100).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Total Earnings</p>
                      </div>
                      <div className="p-4 bg-yellow-500/10 rounded-lg text-center border border-yellow-500/20">
                        <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-yellow-600">${(affiliateData.affiliate.pendingEarnings / 100).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Pending</p>
                        <p className="text-xs text-muted-foreground mt-1">{affiliateData.approvalDays} day hold</p>
                      </div>
                      <div className="p-4 bg-blue-500/10 rounded-lg text-center border border-blue-500/20">
                        <CheckCircle className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-600">${((affiliateData.affiliate.approvedEarnings || 0) / 100).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Ready to Pay</p>
                      </div>
                      <div className="p-4 bg-green-500/10 rounded-lg text-center border border-green-500/20">
                        <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-600">${(affiliateData.affiliate.paidEarnings / 100).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Paid Out</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg text-center">
                        <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{affiliateData.affiliate.totalConversions}</p>
                        <p className="text-sm text-muted-foreground">Conversions</p>
                      </div>
                    </div>
                    
                    {/* Revenue Generated */}
                    <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
                      <p className="text-sm text-muted-foreground">Total Revenue Generated</p>
                      <p className="text-3xl font-bold text-primary">${((affiliateData.affiliate.totalRevenue || 0) / 100).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        From {affiliateData.affiliate.totalReferrals} referrals at {affiliateData.commissionRate}% commission
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Referral Link */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Your Referral Link</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-3">
                          Share this link with friends and earn {affiliateData.commissionRate}% commission on every sale!
                        </p>
                        <div className="flex gap-2">
                          <Input 
                            value={`${window.location.origin}?ref=${affiliateData.affiliate.code}`}
                            readOnly
                            className="text-sm"
                            data-testid="input-referral-link"
                          />
                          <Button onClick={copyReferralLink} className="gap-2" data-testid="button-copy-link">
                            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? "Copied!" : "Copy"}
                          </Button>
                        </div>
                        <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <p className="text-sm">
                            <span className="font-medium">Your affiliate code:</span>{" "}
                            <code className="bg-background px-2 py-1 rounded">{affiliateData.affiliate.code}</code>
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <p className="text-sm text-muted-foreground mb-2">QR Code</p>
                        <div className="p-4 bg-white rounded-lg">
                          <img 
                            src={generateQRCodeUrl(affiliateData.affiliate.code)} 
                            alt="Referral QR Code"
                            className="w-32 h-32"
                            data-testid="img-qr-code"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payout Setup & Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CreditCard className="w-5 h-5" />
                      Payout Setup & Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!connectStatus ? (
                      // No Stripe Connect - show CTA
                      <div className="text-center py-6">
                        <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h4 className="font-semibold text-lg mb-2">Set Up Payouts</h4>
                        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                          Connect your Stripe account to receive weekly payouts for your commissions.
                        </p>
                        <Button 
                          onClick={() => startConnectMutation.mutate()}
                          disabled={startConnectMutation.isPending}
                          className="gap-2"
                          data-testid="button-connect-stripe"
                        >
                          {startConnectMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ExternalLink className="w-4 h-4" />
                          )}
                          Connect with Stripe
                        </Button>
                        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>Next payout date: {getNextPayoutDate()}</span>
                        </div>
                      </div>
                    ) : (
                      // Stripe Connect exists
                      <div className="space-y-4">
                        {/* Warning if setup incomplete */}
                        {(!connectStatus.payoutsEnabled || !connectStatus.detailsSubmitted) && (
                          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm text-yellow-500 font-medium">Payout setup incomplete</span>
                          </div>
                        )}

                        {/* Status badges and info */}
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex gap-2">
                            <Badge className={connectStatus.detailsSubmitted 
                              ? "bg-green-500/20 text-green-500 border-green-500/30" 
                              : "bg-red-500/20 text-red-500 border-red-500/30"
                            }>
                              {connectStatus.detailsSubmitted ? "Details Submitted" : "Details Required"}
                            </Badge>
                            <Badge className={connectStatus.payoutsEnabled 
                              ? "bg-green-500/20 text-green-500 border-green-500/30" 
                              : "bg-red-500/20 text-red-500 border-red-500/30"
                            }>
                              {connectStatus.payoutsEnabled ? "Payouts Enabled" : "Payouts Disabled"}
                            </Badge>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span>
                              <span className="text-muted-foreground">Country: </span>
                              <span className="font-medium">{connectStatus.country || "US"}</span>
                            </span>
                            <span>
                              <span className="text-muted-foreground">Currency: </span>
                              <span className="font-medium">{connectStatus.currency?.toUpperCase() || "USD"}</span>
                            </span>
                          </div>
                        </div>

                        {/* Next payout date */}
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Next payout date:</span>
                          <span className="font-medium">{getNextPayoutDate()}</span>
                        </div>

                        {/* Required steps if any */}
                        {connectStatus.requirements?.currently_due && connectStatus.requirements.currently_due.length > 0 && (
                          <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-2 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-yellow-500" />
                              Required Steps
                            </p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {connectStatus.requirements.currently_due.map((step, i) => (
                                <li key={i}>• {step.replace(/_/g, " ").replace(/\./g, " - ")}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Complete onboarding button if details missing */}
                        {!connectStatus.detailsSubmitted && (
                          <Button 
                            onClick={() => startConnectMutation.mutate()}
                            disabled={startConnectMutation.isPending}
                            className="gap-2"
                            data-testid="button-complete-onboarding"
                          >
                            {startConnectMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ExternalLink className="w-4 h-4" />
                            )}
                            Complete Stripe Onboarding
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Commission Ledger */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Commission Ledger</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {affiliateData.referrals.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No referrals yet. Share your link to start earning!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {affiliateData.referrals.map((referral) => (
                          <div key={referral.id} className="flex items-center justify-between p-4 bg-muted rounded-lg" data-testid={`referral-${referral.id}`}>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                {new Date(referral.createdAt).toLocaleDateString()}
                              </p>
                              <p className="font-medium">Order total: ${(referral.orderTotal / 100).toFixed(2)}</p>
                              {referral.approvedAt && (
                                <p className="text-xs text-muted-foreground">
                                  Approved: {new Date(referral.approvedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <Badge className={
                                referral.status === "paid" 
                                  ? "bg-green-500/20 text-green-500" 
                                  : referral.status === "approved"
                                  ? "bg-blue-500/20 text-blue-500"
                                  : referral.status === "void"
                                  ? "bg-gray-500/20 text-gray-500"
                                  : "bg-yellow-500/20 text-yellow-500"
                              }>
                                {referral.status}
                              </Badge>
                              <p className="font-bold text-primary mt-1">+${(referral.commission / 100).toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Payout History */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Payout History</CardTitle>
                      {affiliateData.minimumPayout && (
                        <p className="text-sm text-muted-foreground">
                          Minimum payout: ${(affiliateData.minimumPayout / 100).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!affiliateData.payouts || affiliateData.payouts.length === 0 ? (
                      <div className="text-center py-8">
                        <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No payouts yet.</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Payouts are processed when your approved balance reaches the minimum threshold.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {affiliateData.payouts.map((payout) => (
                          <div key={payout.id} className="flex items-center justify-between p-4 bg-muted rounded-lg" data-testid={`payout-${payout.id}`}>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                {new Date(payout.requestedAt).toLocaleDateString()}
                              </p>
                              <p className="font-medium">{payout.paymentMethod === "stripe" || payout.paymentMethod === "connect" ? "Stripe Transfer" : payout.paymentMethod.charAt(0).toUpperCase() + payout.paymentMethod.slice(1)}</p>
                              {payout.processedAt && (
                                <p className="text-xs text-muted-foreground">
                                  Processed: {new Date(payout.processedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <Badge className={
                                payout.status === "paid" 
                                  ? "bg-green-500/20 text-green-500" 
                                  : payout.status === "approved"
                                  ? "bg-blue-500/20 text-blue-500"
                                  : payout.status === "rejected"
                                  ? "bg-red-500/20 text-red-500"
                                  : "bg-yellow-500/20 text-yellow-500"
                              }>
                                {payout.status}
                              </Badge>
                              <p className="font-bold text-green-500 mt-1">${(payout.amount / 100).toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Not an affiliate yet - show signup */
              <Card>
                <CardContent className="py-12">
                  <div className="text-center max-w-lg mx-auto">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <DollarSign className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Earn Money with Power Plunge</h2>
                    <p className="text-muted-foreground mb-6">
                      Join our affiliate program and earn {affiliateData?.commissionRate || 10}% commission on every sale you refer. 
                      Get your unique referral link and QR code, and start earning today!
                    </p>
                    <ul className="text-left space-y-3 mb-8">
                      <li className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span>Earn {affiliateData?.commissionRate || 10}% on every referred sale</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span>Get your unique referral link and QR code</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span>Track your referrals and earnings in real-time</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span>Weekly payouts via Stripe Connect</span>
                      </li>
                    </ul>
                    <Button size="lg" onClick={() => setShowEsign(true)} className="gap-2" data-testid="button-become-affiliate">
                      <FileText className="w-5 h-5" />
                      Become an Affiliate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support">
            <h1 className="font-display text-3xl font-bold mb-8" data-testid="text-support-title">Customer Support</h1>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Submit New Ticket */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-primary" />
                    Submit a Request
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!supportForm.subject.trim() || !supportForm.message.trim()) {
                        toast({ title: "Please fill in all required fields", variant: "destructive" });
                        return;
                      }
                      createTicketMutation.mutate({
                        subject: supportForm.subject,
                        message: supportForm.message,
                        orderId: supportForm.orderId || undefined,
                        type: supportForm.type,
                      });
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <Label htmlFor="ticket-type">Request Type</Label>
                      <Select
                        value={supportForm.type}
                        onValueChange={(value) => setSupportForm({ ...supportForm, type: value })}
                      >
                        <SelectTrigger id="ticket-type" data-testid="select-ticket-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Inquiry</SelectItem>
                          <SelectItem value="return">Return Request</SelectItem>
                          <SelectItem value="refund">Refund Request</SelectItem>
                          <SelectItem value="shipping">Shipping Issue</SelectItem>
                          <SelectItem value="technical">Technical Support</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="ticket-order">Related Order (Optional)</Label>
                      <Select
                        value={supportForm.orderId || "none"}
                        onValueChange={(value) => setSupportForm({ ...supportForm, orderId: value === "none" ? "" : value })}
                      >
                        <SelectTrigger id="ticket-order" data-testid="select-order">
                          <SelectValue placeholder="Select an order" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No specific order</SelectItem>
                          {data?.orders?.map((order) => (
                            <SelectItem key={order.id} value={order.id}>
                              Order #{order.id.slice(0, 8)} - ${(order.totalAmount / 100).toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="ticket-subject">Subject *</Label>
                      <Input
                        id="ticket-subject"
                        value={supportForm.subject}
                        onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                        placeholder="Brief description of your issue"
                        maxLength={200}
                        data-testid="input-ticket-subject"
                      />
                    </div>

                    <div>
                      <Label htmlFor="ticket-message">Message *</Label>
                      <Textarea
                        id="ticket-message"
                        value={supportForm.message}
                        onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                        placeholder="Please describe your issue in detail..."
                        rows={5}
                        maxLength={5000}
                        data-testid="input-ticket-message"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={createTicketMutation.isPending}
                      className="w-full"
                      data-testid="button-submit-ticket"
                    >
                      {createTicketMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Submit Request
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Previous Tickets */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Your Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ticketsLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  ) : !supportTickets?.tickets?.length ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No support requests yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {supportTickets.tickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="p-4 rounded-lg border bg-muted/30"
                          data-testid={`ticket-card-${ticket.id}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-medium text-sm line-clamp-1">{ticket.subject}</h4>
                            <Badge
                              variant="outline"
                              className={
                                ticket.status === "resolved" || ticket.status === "closed"
                                  ? "border-green-500 text-green-500"
                                  : ticket.status === "in_progress"
                                  ? "border-blue-500 text-blue-500"
                                  : "border-yellow-500 text-yellow-500"
                              }
                              data-testid={`ticket-status-${ticket.id}`}
                            >
                              {ticket.status === "in_progress" ? "In Progress" : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{ticket.message}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">
                              {ticket.type === "general" ? "General" :
                               ticket.type === "return" ? "Return" :
                               ticket.type === "refund" ? "Refund" :
                               ticket.type === "shipping" ? "Shipping" : "Technical"}
                            </Badge>
                            <span>•</span>
                            <span>
                              {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            {ticket.resolvedAt && (
                              <>
                                <span>•</span>
                                <span className="text-green-500">Resolved</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* E-Sign Agreement Dialog */}
      <Dialog open={showEsign} onOpenChange={setShowEsign}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Affiliate Program Agreement</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="p-4 bg-muted rounded-lg max-h-64 overflow-y-auto text-sm whitespace-pre-wrap">
              {affiliateData?.agreementText || "Loading agreement..."}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (agreedToTerms && signatureName.trim()) {
                  signAgreementMutation.mutate({ signatureName: signatureName.trim() });
                }
              }}
              className="space-y-4"
            >
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="agree" 
                  checked={agreedToTerms} 
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                  data-testid="checkbox-agree"
                />
                <Label htmlFor="agree" className="text-sm leading-relaxed">
                  I have read, understand, and agree to the terms and conditions of the Power Plunge Affiliate Program Agreement.
                </Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signature">E-Signature (Type your full legal name)</Label>
                <Input
                  id="signature"
                  placeholder="Your full legal name"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="font-signature text-lg"
                  data-testid="input-signature"
                />
                <p className="text-xs text-muted-foreground">
                  By typing your name above, you are providing your electronic signature and agreeing to the terms of this agreement.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowEsign(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={!agreedToTerms || !signatureName.trim() || signAgreementMutation.isPending}
                  data-testid="button-sign-agreement"
                >
                  {signAgreementMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing...
                    </>
                  ) : (
                    "Sign & Join Program"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
