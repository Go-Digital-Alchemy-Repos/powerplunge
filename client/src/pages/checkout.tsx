import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { US_STATE_OPTIONS } from "@shared/us-states";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CreditCard, Loader2, ShoppingBag, Lock, Shield, CheckCircle, XCircle, Users } from "lucide-react";
import logoImage from "@assets/powerplungelogo_1767907611722.png";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CheckoutFormProps {
  clientSecret: string;
  orderId: string;
  cartTotal: number;
  totalWithTax: number;
  billingDetails: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

function CheckoutForm({ clientSecret, orderId, cartTotal, totalWithTax, billingDetails }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order-success?order_id=${orderId}`,
          payment_method_data: {
            billing_details: {
              name: billingDetails.name,
              email: billingDetails.email,
              phone: billingDetails.phone,
              address: {
                line1: billingDetails.address,
                city: billingDetails.city,
                state: billingDetails.state,
                postal_code: billingDetails.zipCode,
                country: "US",
              },
            },
          },
        },
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      if (paymentIntent) {
        console.log("Payment intent status:", paymentIntent.status);
        
        if (paymentIntent.status === "succeeded") {
          // Confirm payment on backend
          const confirmResponse = await fetch("/api/confirm-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId,
              paymentIntentId: paymentIntent.id,
            }),
          });

          const confirmData = await confirmResponse.json();

          if (!confirmResponse.ok) {
            toast({
              title: "Confirmation Error",
              description: confirmData.message || "Failed to confirm payment. Please contact support.",
              variant: "destructive",
            });
            setIsProcessing(false);
            return;
          }

          // Mark cart as recovered for abandonment tracking
          const checkoutSessionId = localStorage.getItem("checkoutSessionId");
          if (checkoutSessionId) {
            fetch("/api/recovery/mark-cart-recovered", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId: checkoutSessionId, orderId }),
            }).catch(() => {});
          }

          localStorage.removeItem("cart");
          localStorage.removeItem("checkoutSessionId");
          setLocation(`/order-success?order_id=${orderId}`);
        } else if (paymentIntent.status === "requires_action" || paymentIntent.status === "requires_confirmation") {
          // Payment requires additional action - Stripe should handle redirect
          toast({
            title: "Additional Verification Required",
            description: "Please complete the verification process.",
          });
        } else if (paymentIntent.status === "processing") {
          toast({
            title: "Payment Processing",
            description: "Your payment is being processed. Please wait...",
          });
        } else {
          toast({
            title: "Payment Status",
            description: `Payment status: ${paymentIntent.status}. Please try again or contact support.`,
            variant: "destructive",
          });
        }
      } else if (!error) {
        // No paymentIntent and no error - might have redirected
        console.log("No payment intent returned - likely redirected for authentication");
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "An error occurred during payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-muted/50 rounded-lg p-4">
        <PaymentElement
          options={{
            layout: "tabs",
            fields: {
              billingDetails: {
                address: {
                  postalCode: "never",
                  country: "never",
                },
              },
            },
            defaultValues: {
              billingDetails: {
                address: {
                  postal_code: billingDetails.zipCode,
                  country: "US",
                },
              },
            },
          }}
        />
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lock className="w-4 h-4" />
        <span>Your payment is secured with 256-bit SSL encryption</span>
      </div>

      <Button
        type="submit"
        className="w-full glow-ice-sm"
        size="lg"
        disabled={!stripe || isProcessing}
        data-testid="button-pay-now"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Pay ${(totalWithTax / 100).toLocaleString()}
          </>
        )}
      </Button>
    </form>
  );
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"shipping" | "payment">("shipping");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [taxInfo, setTaxInfo] = useState<{ subtotal: number; taxAmount: number; total: number } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingData, setBillingData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (formData.name.trim().length < 2) errors.name = "Full name is required (min 2 characters)";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) errors.email = "Valid email is required";
    if (formData.address.trim().length < 3) errors.address = "Street address is required";
    if (formData.city.trim().length < 2) errors.city = "City is required";
    if (!formData.state) errors.state = "Please select a state";
    if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode.trim())) errors.zipCode = "Valid ZIP code required (e.g. 12345)";

    if (!billingSameAsShipping) {
      if (billingData.name.trim().length < 2) errors.billingName = "Full name is required (min 2 characters)";
      if (billingData.address.trim().length < 3) errors.billingAddress = "Street address is required";
      if (billingData.city.trim().length < 2) errors.billingCity = "City is required";
      if (!billingData.state) errors.billingState = "Please select a state";
      if (!/^\d{5}(-\d{4})?$/.test(billingData.zipCode.trim())) errors.billingZip = "Valid ZIP code required (e.g. 12345)";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const [referralCode, setReferralCode] = useState("");
  const [referralStatus, setReferralStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");

  // Initialize referral code from localStorage
  useEffect(() => {
    const storedCode = localStorage.getItem("affiliateCode");
    const codeExpiry = localStorage.getItem("affiliateCodeExpiry");
    if (storedCode && codeExpiry && Date.now() < parseInt(codeExpiry)) {
      setReferralCode(storedCode);
      setReferralStatus("valid");
    }
  }, []);

  // Validate referral code
  const validateReferralCode = async (code: string) => {
    if (!code || code.length < 3) {
      setReferralStatus("idle");
      return;
    }
    setReferralStatus("checking");
    try {
      const res = await fetch(`/api/validate-referral-code/${encodeURIComponent(code.toUpperCase())}`);
      const data = await res.json();
      if (data.valid) {
        setReferralCode(data.code);
        setReferralStatus("valid");
        // Save to localStorage for future use
        localStorage.setItem("affiliateCode", data.code);
        localStorage.setItem("affiliateCodeExpiry", String(Date.now() + 30 * 24 * 60 * 60 * 1000));
      } else {
        setReferralStatus("invalid");
      }
    } catch {
      setReferralStatus("invalid");
    }
  };

  const cartString = typeof window !== "undefined" ? localStorage.getItem("cart") : null;
  const cart: CartItem[] = cartString ? JSON.parse(cartString) : [];
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  useEffect(() => {
    // Load Stripe publishable key
    fetch("/api/stripe/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.publishableKey) {
          setStripePromise(loadStripe(data.publishableKey));
        }
      });
  }, []);

  // Track cart activity for abandonment recovery
  useEffect(() => {
    if (cart.length === 0) return;

    const sessionId = localStorage.getItem("checkoutSessionId") || crypto.randomUUID();
    if (!localStorage.getItem("checkoutSessionId")) {
      localStorage.setItem("checkoutSessionId", sessionId);
    }

    let affiliateCode: string | null = null;
    const storedCode = localStorage.getItem("affiliateCode");
    const codeExpiry = localStorage.getItem("affiliateCodeExpiry");
    if (storedCode && codeExpiry && Date.now() < parseInt(codeExpiry)) {
      affiliateCode = storedCode;
    }

    const trackCart = () => {
      fetch("/api/recovery/track-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          cartData: { items: cart, subtotal: cartTotal },
          cartValue: cartTotal,
          email: formData.email || undefined,
          affiliateCode,
        }),
      }).catch(() => {});
    };

    trackCart();
    
    const interval = setInterval(trackCart, 60000);
    return () => clearInterval(interval);
  }, [cart.length, cartTotal, formData.email]);

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setFormData(prev => ({
      ...prev,
      name: prev.name.trim(),
      email: prev.email.trim(),
      phone: prev.phone.trim(),
      address: prev.address.trim(),
      city: prev.city.trim(),
      zipCode: prev.zipCode.trim(),
    }));
    setBillingData(prev => ({
      ...prev,
      name: prev.name.trim(),
      address: prev.address.trim(),
      city: prev.city.trim(),
      zipCode: prev.zipCode.trim(),
    }));

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    // Use the manually validated referral code, or fall back to localStorage (from referral link)
    let affiliateCode: string | null = null;
    if (referralStatus === "valid" && referralCode) {
      affiliateCode = referralCode;
    } else {
      // Fallback to localStorage for cookie-based tracking
      const storedCode = localStorage.getItem("affiliateCode");
      const codeExpiry = localStorage.getItem("affiliateCodeExpiry");
      if (storedCode && codeExpiry && Date.now() < parseInt(codeExpiry)) {
        affiliateCode = storedCode;
      }
    }

    try {
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
          customer: formData,
          billingAddress: billingSameAsShipping ? null : billingData,
          billingSameAsShipping,
          affiliateCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to initialize payment");
      }

      setClientSecret(data.clientSecret);
      setOrderId(data.orderId);
      setTaxInfo({
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        total: data.total,
      });
      setStep("payment");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!cart.length) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <ShoppingBag className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground mb-6">Add some products before checking out.</p>
        <Link href="/">
          <Button data-testid="button-continue-shopping">Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <img src={logoImage} alt="Power Plunge" className="h-8" />
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-green-500" />
            Secure Checkout
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6 gap-2" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
            Back to Store
          </Button>
        </Link>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step === "shipping" ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === "shipping" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              1
            </div>
            <span className="hidden sm:inline font-medium">Shipping</span>
          </div>
          <div className="w-12 h-0.5 bg-muted" />
          <div className={`flex items-center gap-2 ${step === "payment" ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === "payment" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              2
            </div>
            <span className="hidden sm:inline font-medium">Payment</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {step === "shipping" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleShippingSubmit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setFieldErrors(prev => { const next = {...prev}; delete next['name']; return next; }); }}
                          autoComplete="shipping name"
                          required
                          data-testid="input-name"
                        />
                        {fieldErrors.name && (
                          <p className="text-xs text-red-500 mt-1" data-testid="error-name">{fieldErrors.name}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setFieldErrors(prev => { const next = {...prev}; delete next['email']; return next; }); }}
                          autoComplete="email"
                          required
                          data-testid="input-email"
                        />
                        {fieldErrors.email && (
                          <p className="text-xs text-red-500 mt-1" data-testid="error-email">{fieldErrors.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); setFieldErrors(prev => { const next = {...prev}; delete next['phone']; return next; }); }}
                        autoComplete="tel"
                        data-testid="input-phone"
                      />
                      {fieldErrors.phone && (
                        <p className="text-xs text-red-500 mt-1" data-testid="error-phone">{fieldErrors.phone}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Street Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => { setFormData({ ...formData, address: e.target.value }); setFieldErrors(prev => { const next = {...prev}; delete next['address']; return next; }); }}
                        autoComplete="shipping address-line1"
                        required
                        data-testid="input-address"
                      />
                      {fieldErrors.address && (
                        <p className="text-xs text-red-500 mt-1" data-testid="error-address">{fieldErrors.address}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded px-3 py-2">
                      <span>🇺🇸</span>
                      <span>Shipping to United States only</span>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => { setFormData({ ...formData, city: e.target.value }); setFieldErrors(prev => { const next = {...prev}; delete next['city']; return next; }); }}
                          autoComplete="shipping address-level2"
                          required
                          data-testid="input-city"
                        />
                        {fieldErrors.city && (
                          <p className="text-xs text-red-500 mt-1" data-testid="error-city">{fieldErrors.city}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Select
                          value={formData.state}
                          onValueChange={(value) => { setFormData({ ...formData, state: value }); setFieldErrors(prev => { const next = {...prev}; delete next['state']; return next; }); }}
                          required
                        >
                          <SelectTrigger id="state" data-testid="select-state">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {US_STATE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fieldErrors.state && (
                          <p className="text-xs text-red-500 mt-1" data-testid="error-state">{fieldErrors.state}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zipCode">ZIP Code</Label>
                        <Input
                          id="zipCode"
                          value={formData.zipCode}
                          onChange={(e) => { setFormData({ ...formData, zipCode: e.target.value }); setFieldErrors(prev => { const next = {...prev}; delete next['zipCode']; return next; }); }}
                          autoComplete="shipping postal-code"
                          inputMode="numeric"
                          placeholder="12345"
                          maxLength={10}
                          required
                          data-testid="input-zip"
                        />
                        {fieldErrors.zipCode && (
                          <p className="text-xs text-red-500 mt-1" data-testid="error-zipCode">{fieldErrors.zipCode}</p>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <div className="flex items-center space-x-2 mb-4">
                        <Checkbox
                          id="billingSame"
                          checked={billingSameAsShipping}
                          onCheckedChange={(checked) => setBillingSameAsShipping(checked === true)}
                          data-testid="checkbox-billing-same"
                        />
                        <Label htmlFor="billingSame" className="text-sm font-normal cursor-pointer">
                          Billing address same as shipping address
                        </Label>
                      </div>

                      {!billingSameAsShipping && (
                        <div className="space-y-4 mb-4 p-4 bg-muted/30 rounded-lg">
                          <h4 className="font-medium text-sm">Billing Address</h4>
                          <div className="space-y-2">
                            <Label htmlFor="billingName">Full Name</Label>
                            <Input
                              id="billingName"
                              value={billingData.name}
                              onChange={(e) => { setBillingData({ ...billingData, name: e.target.value }); setFieldErrors(prev => { const next = {...prev}; delete next['billingName']; return next; }); }}
                              autoComplete="billing name"
                              required={!billingSameAsShipping}
                              data-testid="input-billing-name"
                            />
                            {fieldErrors.billingName && (
                              <p className="text-xs text-red-500 mt-1" data-testid="error-billingName">{fieldErrors.billingName}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="billingAddress">Street Address</Label>
                            <Input
                              id="billingAddress"
                              value={billingData.address}
                              onChange={(e) => { setBillingData({ ...billingData, address: e.target.value }); setFieldErrors(prev => { const next = {...prev}; delete next['billingAddress']; return next; }); }}
                              autoComplete="billing address-line1"
                              required={!billingSameAsShipping}
                              data-testid="input-billing-address"
                            />
                            {fieldErrors.billingAddress && (
                              <p className="text-xs text-red-500 mt-1" data-testid="error-billingAddress">{fieldErrors.billingAddress}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded px-3 py-2">
                            <span>🇺🇸</span>
                            <span>Shipping to United States only</span>
                          </div>
                          <div className="grid sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="billingCity">City</Label>
                              <Input
                                id="billingCity"
                                value={billingData.city}
                                onChange={(e) => { setBillingData({ ...billingData, city: e.target.value }); setFieldErrors(prev => { const next = {...prev}; delete next['billingCity']; return next; }); }}
                                autoComplete="billing address-level2"
                                required={!billingSameAsShipping}
                                data-testid="input-billing-city"
                              />
                              {fieldErrors.billingCity && (
                                <p className="text-xs text-red-500 mt-1" data-testid="error-billingCity">{fieldErrors.billingCity}</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="billingState">State</Label>
                              <Select
                                value={billingData.state}
                                onValueChange={(value) => { setBillingData({ ...billingData, state: value }); setFieldErrors(prev => { const next = {...prev}; delete next['billingState']; return next; }); }}
                                required={!billingSameAsShipping}
                              >
                                <SelectTrigger id="billingState" data-testid="select-billing-state">
                                  <SelectValue placeholder="Select state" />
                                </SelectTrigger>
                                <SelectContent>
                                  {US_STATE_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {fieldErrors.billingState && (
                                <p className="text-xs text-red-500 mt-1" data-testid="error-billingState">{fieldErrors.billingState}</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="billingZip">ZIP Code</Label>
                              <Input
                                id="billingZip"
                                value={billingData.zipCode}
                                onChange={(e) => { setBillingData({ ...billingData, zipCode: e.target.value }); setFieldErrors(prev => { const next = {...prev}; delete next['billingZip']; return next; }); }}
                                autoComplete="billing postal-code"
                                inputMode="numeric"
                                placeholder="12345"
                                maxLength={10}
                                required={!billingSameAsShipping}
                                data-testid="input-billing-zip"
                              />
                              {fieldErrors.billingZip && (
                                <p className="text-xs text-red-500 mt-1" data-testid="error-billingZip">{fieldErrors.billingZip}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-border">
                      <div className="space-y-2">
                        <Label htmlFor="referralCode" className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          Referral Code (optional)
                        </Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              id="referralCode"
                              value={referralCode}
                              onChange={(e) => {
                                setReferralCode(e.target.value.toUpperCase());
                                setReferralStatus("idle");
                              }}
                              onBlur={(e) => validateReferralCode(e.target.value)}
                              placeholder=""
                              className="uppercase"
                              data-testid="input-referral-code"
                            />
                            {referralStatus === "checking" && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                            )}
                            {referralStatus === "valid" && (
                              <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                            )}
                            {referralStatus === "invalid" && (
                              <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => validateReferralCode(referralCode)}
                            disabled={!referralCode || referralCode.length < 3 || referralStatus === "checking"}
                            data-testid="button-apply-referral"
                          >
                            Apply
                          </Button>
                        </div>
                        {referralStatus === "valid" && (
                          <p className="text-sm text-green-600">Referral code applied!</p>
                        )}
                        {referralStatus === "invalid" && (
                          <p className="text-sm text-red-500">Invalid referral code</p>
                        )}
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full mt-6 glow-ice-sm"
                      size="lg"
                      disabled={isLoading}
                      data-testid="button-continue-to-payment"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Continue to Payment
                          <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Payment Details
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep("shipping")}
                      data-testid="button-edit-shipping"
                    >
                      Edit Shipping
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Shipping Summary */}
                  <div className="bg-muted/30 rounded-lg p-4 mb-6">
                    <p className="text-sm text-muted-foreground mb-1">Shipping to:</p>
                    <p className="font-medium">{formData.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formData.address}, {formData.city}, {formData.state} {formData.zipCode}
                    </p>
                    <p className="text-sm text-muted-foreground">{formData.email}</p>
                  </div>

                  {/* Billing Summary - only shown if different from shipping */}
                  {!billingSameAsShipping && (
                    <div className="bg-muted/30 rounded-lg p-4 mb-6">
                      <p className="text-sm text-muted-foreground mb-1">Billing to:</p>
                      <p className="font-medium">{billingData.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {billingData.address}, {billingData.city}, {billingData.state} {billingData.zipCode}
                      </p>
                    </div>
                  )}

                  {stripePromise && clientSecret ? (
                    <Elements
                      stripe={stripePromise}
                      options={{
                        clientSecret,
                        appearance: {
                          theme: "night",
                          variables: {
                            colorPrimary: "#22d3ee",
                            colorBackground: "#1e293b",
                            colorText: "#f1f5f9",
                            colorDanger: "#ef4444",
                            fontFamily: "system-ui, sans-serif",
                            borderRadius: "8px",
                          },
                        },
                      }}
                    >
                      <CheckoutForm
                        clientSecret={clientSecret}
                        orderId={orderId!}
                        cartTotal={cartTotal}
                        totalWithTax={taxInfo?.total ?? cartTotal}
                        billingDetails={billingSameAsShipping ? formData : {
                          name: billingData.name,
                          email: formData.email,
                          phone: formData.phone,
                          address: billingData.address,
                          city: billingData.city,
                          state: billingData.state,
                          zipCode: billingData.zipCode,
                        }}
                      />
                    </Elements>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between py-2 border-b border-border">
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium">${((item.price * item.quantity) / 100).toLocaleString()}</p>
                  </div>
                ))}
                <div className="space-y-2 pt-4 border-t border-border">
                  <div className="flex justify-between">
                    <p className="text-muted-foreground">Subtotal</p>
                    <p>${((taxInfo?.subtotal ?? cartTotal) / 100).toLocaleString()}</p>
                  </div>
                  {taxInfo && taxInfo.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <p className="text-muted-foreground">Sales Tax</p>
                      <p>${(taxInfo.taxAmount / 100).toFixed(2)}</p>
                    </div>
                  )}
                  <div className="flex justify-between pt-2">
                    <p className="font-semibold">Total</p>
                    <p className="font-display font-bold text-xl text-primary">
                      ${((taxInfo?.total ?? cartTotal) / 100).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="w-4 h-4 text-green-500" />
                    Secure SSL Encryption
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Lock className="w-4 h-4 text-green-500" />
                    Powered by Stripe
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
