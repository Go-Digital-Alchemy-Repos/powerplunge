import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, LogOut, User, Link2, DollarSign, Users, Copy, CheckCircle, ExternalLink, Loader2, CreditCard, AlertCircle, Crown, Calendar, AlertTriangle, Clock, Download, Edit3, X, Save } from "lucide-react";
import DynamicNav from "@/components/DynamicNav";
import { useBranding } from "@/hooks/use-branding";

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

interface VipData {
  isVip: boolean;
}

export default function AffiliatePortal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { logoSrc, companyName } = useBranding();
  const queryClient = useQueryClient();
  const { customer: authCustomer, isLoading: authLoading, isAuthenticated, logout, getAuthHeader } = useCustomerAuth();
  const [copied, setCopied] = useState(false);
  const [editingCode, setEditingCode] = useState(false);
  const [customCode, setCustomCode] = useState("");

  const { data: affiliateData, isLoading: affiliateLoading } = useQuery<AffiliateData>({
    queryKey: ["/api/customer/affiliate-portal"],
    queryFn: async () => {
      const res = await fetch("/api/customer/affiliate-portal", { 
        headers: { ...getAuthHeader() }
      });
      if (!res.ok && res.status !== 404) throw new Error("Failed to fetch affiliate data");
      if (res.status === 404) return { affiliate: null, referrals: [], payouts: [], commissionRate: 10, minimumPayout: 5000, approvalDays: 14, agreementText: "" };
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: vipData } = useQuery<VipData>({
    queryKey: ["/api/customer/orders/vip-status"],
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

  const startConnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/customer/affiliate-portal/connect/start", {
        method: "POST",
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) {
        const err = await res.json();
        if (res.status === 503) {
          throw new Error("Stripe is not currently available. Please try again later or contact support.");
        }
        throw new Error(err.message || "Failed to start Stripe Connect");
      }
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      window.open(data.url, "_blank");
      toast({ 
        title: "Stripe onboarding opened", 
        description: "Complete the steps in the new tab to set up your payout account." 
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Something went wrong";
      const isNetworkError = errorMessage.toLowerCase().includes("network") || errorMessage.toLowerCase().includes("fetch");
      toast({ 
        title: isNetworkError ? "Connection error" : "Setup failed", 
        description: isNetworkError 
          ? "Please check your internet connection and try again."
          : errorMessage,
        variant: "destructive" 
      });
    },
  });

  const updateCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/customer/affiliate-portal/code", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeader() 
        },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to update code");
      }
      return res.json();
    },
    onSuccess: (data: { code: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/affiliate-portal"] });
      setEditingCode(false);
      setCustomCode("");
      toast({ title: "Affiliate code updated!", description: `Your new code is ${data.code}` });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const requestPayoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/customer/affiliate-portal/payout-request", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeader() 
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || err.message || "Failed to request payout");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/affiliate-portal"] });
      toast({ 
        title: "Payout requested!", 
        description: `Payout of $${(data.amount / 100).toFixed(2)} has been submitted for processing.` 
      });
    },
    onError: (error: any) => {
      toast({ title: "Payout request failed", description: error.message, variant: "destructive" });
    },
  });

  const getApprovalDaysRemaining = (createdAt: string, approvalDays: number) => {
    const created = new Date(createdAt);
    const approvalDate = new Date(created);
    approvalDate.setDate(approvalDate.getDate() + approvalDays);
    const now = new Date();
    const daysRemaining = Math.ceil((approvalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysRemaining);
  };

  const canRequestPayout = () => {
    if (!affiliateData?.affiliate || !connectStatus?.payoutsEnabled) return false;
    const approvedBalance = affiliateData.affiliate.approvedEarnings || 0;
    const minimumPayout = affiliateData.minimumPayout || 5000;
    return approvedBalance >= minimumPayout;
  };

  const getNextPayoutDate = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    return nextMonday.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/login?redirect=/affiliate-portal";
    }
  }, [authLoading, isAuthenticated]);

  // Handle return from Stripe Connect onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectStatus = params.get("connect");
    
    if (connectStatus === "complete" || connectStatus === "refresh") {
      // Remove the query param from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
      
      // Refresh connect status
      queryClient.invalidateQueries({ queryKey: ["/api/customer/affiliate/connect/status"] });
      
      if (connectStatus === "complete") {
        toast({ 
          title: "Stripe onboarding complete!",
          description: "Your payout account is now being verified by Stripe."
        });
      }
    }
  }, [queryClient, toast]);

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

  const downloadQRCode = async (code: string) => {
    try {
      const qrUrl = generateQRCodeUrl(code);
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `powerplunge-referral-${code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({
        title: "QR Code Downloaded",
        description: "The QR code has been saved to your device.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to download QR code. Please try again.",
        variant: "destructive",
      });
    }
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

  if (affiliateLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading affiliate data...</p>
        </div>
      </div>
    );
  }

  if (!affiliateData?.affiliate) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <img src={logoSrc} alt={companyName} className="h-8" />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{authCustomer?.name || authCustomer?.email}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => logout()} data-testid="button-logout">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </nav>

        <main className="max-w-4xl mx-auto px-6 py-12">
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Link2 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Join Our Affiliate Program</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                You're not currently enrolled in our affiliate program. Join now to earn commissions on every sale you refer!
              </p>
              <Button onClick={() => setLocation("/become-affiliate")} data-testid="button-join-affiliate">
                Become an Affiliate
              </Button>
            </CardContent>
          </Card>
        </main>
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
            <div className="hidden sm:flex items-center gap-2 ml-4">
              <Link2 className="w-5 h-5 text-primary" />
              <span className="font-semibold">Affiliate Portal</span>
            </div>
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
            <Button variant="outline" size="sm" onClick={() => setLocation("/my-account")} data-testid="button-my-account">
              My Account
            </Button>
            <Button variant="outline" size="sm" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="font-display text-3xl font-bold mb-8" data-testid="text-affiliate-title">Affiliate Dashboard</h1>

        <div className="space-y-6">
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
                    {editingCode ? (
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Set a custom code (3-20 characters, letters and numbers only):</p>
                        <div className="flex gap-2">
                          <Input
                            value={customCode}
                            onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                            placeholder="e.g. TOMMY"
                            className="uppercase"
                            maxLength={20}
                            data-testid="input-custom-code"
                          />
                          <Button 
                            size="sm"
                            onClick={() => updateCodeMutation.mutate(customCode)}
                            disabled={customCode.length < 3 || updateCodeMutation.isPending}
                            className="gap-1"
                            data-testid="button-save-code"
                          >
                            {updateCodeMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            Save
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => { setEditingCode(false); setCustomCode(""); }}
                            data-testid="button-cancel-code"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-sm">
                          <span className="font-medium">Your affiliate code:</span>{" "}
                          <code className="bg-background px-2 py-1 rounded">{affiliateData.affiliate.code}</code>
                        </p>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="gap-1 text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditingCode(true); setCustomCode(affiliateData.affiliate!.code); }}
                          data-testid="button-edit-code"
                        >
                          <Edit3 className="w-4 h-4" />
                          Customize
                        </Button>
                      </div>
                    )}
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 gap-2"
                    onClick={() => downloadQRCode(affiliateData.affiliate!.code)}
                    data-testid="button-download-qr"
                  >
                    <Download className="w-4 h-4" />
                    Save to Photos
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="w-5 h-5" />
                Payout Setup & Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!connectStatus ? (
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
                <div className="space-y-4">
                  {(!connectStatus.payoutsEnabled || !connectStatus.detailsSubmitted) && (
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-yellow-500 font-medium">Payout setup incomplete</span>
                    </div>
                  )}

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

                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Next payout date:</span>
                    <span className="font-medium">{getNextPayoutDate()}</span>
                  </div>

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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                <div className="p-3 md:p-4 bg-muted rounded-lg text-center">
                  <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-primary mx-auto mb-2" />
                  <p className="text-xl md:text-2xl font-bold">${(affiliateData.affiliate.totalEarnings / 100).toLocaleString()}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Total Earnings</p>
                </div>
                <div className="p-3 md:p-4 bg-yellow-500/10 rounded-lg text-center border border-yellow-500/20">
                  <Clock className="w-5 h-5 md:w-6 md:h-6 text-yellow-500 mx-auto mb-2" />
                  <p className="text-xl md:text-2xl font-bold text-yellow-600">${(affiliateData.affiliate.pendingEarnings / 100).toLocaleString()}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Pending</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1">{affiliateData.approvalDays} day hold</p>
                </div>
                <div className="p-3 md:p-4 bg-blue-500/10 rounded-lg text-center border border-blue-500/20">
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-xl md:text-2xl font-bold text-blue-600">${((affiliateData.affiliate.approvedEarnings || 0) / 100).toLocaleString()}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Ready to Pay</p>
                </div>
                <div className="p-3 md:p-4 bg-green-500/10 rounded-lg text-center border border-green-500/20">
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-500 mx-auto mb-2" />
                  <p className="text-xl md:text-2xl font-bold text-green-600">${(affiliateData.affiliate.paidEarnings / 100).toLocaleString()}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Paid Out</p>
                </div>
                <div className="p-3 md:p-4 bg-muted rounded-lg text-center col-span-2 sm:col-span-1">
                  <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-xl md:text-2xl font-bold">{affiliateData.affiliate.totalConversions}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Conversions</p>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
                <p className="text-sm text-muted-foreground">Total Revenue Generated</p>
                <p className="text-3xl font-bold text-primary">${((affiliateData.affiliate.totalRevenue || 0) / 100).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  From {affiliateData.affiliate.totalReferrals} referrals at {affiliateData.commissionRate}% commission
                </p>
              </div>
            </CardContent>
          </Card>

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
                  <p className="text-xs text-muted-foreground mb-2">
                    Commissions are held for {affiliateData.approvalDays} days before they become available for payout.
                  </p>
                  {affiliateData.referrals.map((referral) => {
                    const daysRemaining = referral.status === "pending" 
                      ? getApprovalDaysRemaining(referral.createdAt, affiliateData.approvalDays) 
                      : 0;
                    return (
                      <div key={referral.id} className="flex items-center justify-between p-4 bg-muted rounded-lg" data-testid={`referral-${referral.id}`}>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(referral.createdAt).toLocaleDateString()}
                          </p>
                          <p className="font-medium">Order total: ${(referral.orderTotal / 100).toFixed(2)}</p>
                          {referral.status === "pending" && daysRemaining > 0 && (
                            <p className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              Approves in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}
                            </p>
                          )}
                          {referral.status === "pending" && daysRemaining === 0 && (
                            <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              Approving soon...
                            </p>
                          )}
                          {referral.approvedAt && (
                            <p className="text-xs text-muted-foreground">
                              Approved: {new Date(referral.approvedAt).toLocaleDateString()}
                            </p>
                          )}
                          {referral.paidAt && (
                            <p className="text-xs text-green-600">
                              Paid: {new Date(referral.paidAt).toLocaleDateString()}
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
                              : referral.status === "flagged"
                              ? "bg-orange-500/20 text-orange-500"
                              : "bg-yellow-500/20 text-yellow-500"
                          }>
                            {referral.status === "flagged" ? "Under Review" : referral.status}
                          </Badge>
                          <p className="font-bold text-primary mt-1">+${(referral.commission / 100).toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-lg">Payout History</CardTitle>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  {affiliateData.minimumPayout && (
                    <p className="text-sm text-muted-foreground">
                      Minimum: ${(affiliateData.minimumPayout / 100).toFixed(2)}
                    </p>
                  )}
                  {canRequestPayout() && (
                    <Button 
                      onClick={() => requestPayoutMutation.mutate()}
                      disabled={requestPayoutMutation.isPending}
                      className="gap-2"
                      data-testid="button-request-payout"
                    >
                      {requestPayoutMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <DollarSign className="w-4 h-4" />
                      )}
                      Request Payout (${((affiliateData.affiliate.approvedEarnings || 0) / 100).toFixed(2)})
                    </Button>
                  )}
                  {!canRequestPayout() && connectStatus?.payoutsEnabled && (affiliateData.affiliate.approvedEarnings || 0) < (affiliateData.minimumPayout || 5000) && (
                    <p className="text-xs text-muted-foreground">
                      Need ${(((affiliateData.minimumPayout || 5000) - (affiliateData.affiliate.approvedEarnings || 0)) / 100).toFixed(2)} more to request payout
                    </p>
                  )}
                  {!connectStatus?.payoutsEnabled && (affiliateData.affiliate.approvedEarnings || 0) >= (affiliateData.minimumPayout || 5000) && (
                    <p className="text-xs text-yellow-600">
                      Complete Stripe setup to request payout
                    </p>
                  )}
                </div>
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
      </main>
    </div>
  );
}
