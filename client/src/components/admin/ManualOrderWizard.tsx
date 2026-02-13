import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { AddressForm, emptyAddress, type AddressFormData } from "@/components/checkout/AddressForm";
import { Search, Plus, ArrowRight, ArrowLeft, CreditCard, Ban, Loader2, CheckCircle, MapPin } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  active?: boolean;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface ManualOrderWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WizardStep = "choice" | "select" | "create" | "products" | "shipping" | "payment" | "success";

function PaymentForm({
  clientSecret,
  orderId,
  total,
  onSuccess,
  onError,
}: {
  clientSecret: string;
  orderId: string;
  total: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/admin/orders`,
        },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message || "Payment failed");
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        const confirmResponse = await fetch("/api/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, paymentIntentId: paymentIntent.id }),
        });

        if (!confirmResponse.ok) {
          const data = await confirmResponse.json();
          onError(data.message || "Failed to confirm payment");
          setIsProcessing(false);
          return;
        }

        onSuccess();
      } else if (paymentIntent) {
        onError(`Payment status: ${paymentIntent.status}. Please try again.`);
      }
    } catch (err: any) {
      onError(err.message || "An error occurred during payment");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
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
        }}
      />
      <form onSubmit={handleSubmit}>
        <Button
          type="submit"
          className="w-full gap-2"
          size="lg"
          disabled={!stripe || isProcessing}
          data-testid="button-process-payment"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing Payment...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              Charge ${(total / 100).toLocaleString()}
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

export function ManualOrderWizard({ open, onOpenChange }: ManualOrderWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [orderStep, setOrderStep] = useState<WizardStep>("choice");
  const [orderCustomerId, setOrderCustomerId] = useState("");
  const [orderItems, setOrderItems] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "", address: "", city: "", state: "", zipCode: "" });

  const [shippingAddress, setShippingAddress] = useState<AddressFormData>(emptyAddress);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingAddress, setBillingAddress] = useState<AddressFormData>(emptyAddress);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [taxInfo, setTaxInfo] = useState<{ subtotal: number; taxAmount: number; total: number } | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/admin/customers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/customers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
    queryFn: async () => {
      const res = await fetch("/api/admin/products", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  useEffect(() => {
    fetch("/api/stripe/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.publishableKey) {
          setStripePromise(loadStripe(data.publishableKey));
        }
      });
  }, []);

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
      onOpenChange(false);
      resetWizard();
      toast({ title: "Order created successfully (payment bypassed)" });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const resetWizard = () => {
    setOrderStep("choice");
    setOrderCustomerId("");
    setOrderItems([]);
    setNewCustomer({ name: "", email: "", phone: "", address: "", city: "", state: "", zipCode: "" });
    setShippingAddress(emptyAddress);
    setBillingAddress(emptyAddress);
    setBillingSameAsShipping(true);
    setFieldErrors({});
    setClientSecret(null);
    setOrderId(null);
    setTaxInfo(null);
  };

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) resetWizard();
  };

  const prefillShippingFromCustomer = useCallback((customerId: string) => {
    const customer = customers?.find(c => c.id === customerId);
    if (customer) {
      setShippingAddress({
        name: customer.name || "",
        company: "",
        line1: customer.address || "",
        line2: "",
        city: customer.city || "",
        state: customer.state || "",
        postalCode: customer.zipCode || "",
        country: "US",
      });
    }
  }, [customers]);

  const handleProceedToCheckout = () => {
    if (!orderCustomerId || orderItems.length === 0) return;
    prefillShippingFromCustomer(orderCustomerId);
    setOrderStep("shipping");
  };

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCheckoutLoading(true);

    const errors: Record<string, string> = {};
    if (!shippingAddress.name.trim()) errors.name = "Full name is required";
    if (!shippingAddress.line1.trim() || shippingAddress.line1.trim().length < 3) errors.line1 = "Street address is required";
    if (!shippingAddress.city.trim()) errors.city = "City is required";
    if (!shippingAddress.state.trim()) errors.state = "Please select a state";
    if (!shippingAddress.postalCode.trim()) errors.postalCode = "ZIP code is required";

    if (!billingSameAsShipping) {
      if (!billingAddress.name.trim()) errors.billingName = "Full name is required";
      if (!billingAddress.line1.trim()) errors.billingLine1 = "Street address is required";
      if (!billingAddress.city.trim()) errors.billingCity = "City is required";
      if (!billingAddress.state.trim()) errors.billingState = "Please select a state";
      if (!billingAddress.postalCode.trim()) errors.billingPostalCode = "ZIP code is required";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setIsCheckoutLoading(false);
      return;
    }

    setFieldErrors({});

    try {
      const response = await fetch("/api/admin/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customerId: orderCustomerId,
          items: orderItems,
          shipping: shippingAddress,
          billing: billingSameAsShipping ? null : billingAddress,
          billingSameAsShipping,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          const newErrors: Record<string, string> = {};
          for (const err of data.errors) {
            newErrors[err.field] = err.message;
          }
          setFieldErrors(newErrors);
        } else {
          toast({ title: data.message || "Failed to create checkout", variant: "destructive" });
        }
        setIsCheckoutLoading(false);
        return;
      }

      setClientSecret(data.clientSecret);
      setOrderId(data.orderId);
      setTaxInfo({
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        total: data.total,
      });
      setOrderStep("payment");
    } catch (error: any) {
      toast({ title: error.message || "Error creating checkout", variant: "destructive" });
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const clearError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleBlurValidate = useCallback((field: string, value: string) => {
    if (!value.trim()) {
      setFieldErrors(prev => ({ ...prev, [field]: `${field} is required` }));
    } else {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }, []);

  const selectedCustomer = customers?.find(c => c.id === orderCustomerId);
  const cartTotal = orderItems.reduce((sum, item) => {
    const product = products?.find(p => p.id === item.productId);
    return sum + (product?.price || 0) * item.quantity;
  }, 0);

  const stripeAppearance = {
    theme: "night" as const,
    variables: {
      colorPrimary: "#22d3ee",
      colorBackground: "#1e293b",
      colorText: "#f1f5f9",
      colorDanger: "#ef4444",
      fontFamily: "system-ui, sans-serif",
      borderRadius: "8px",
    },
  };

  const stepTitles: Record<WizardStep, string> = {
    choice: "Manual Order: Customer Selection",
    select: "Select Existing Customer",
    create: "Create New Customer",
    products: "Add Products to Order",
    shipping: "Shipping & Billing",
    payment: "Payment",
    success: "Order Complete",
  };

  const stepNumber = (step: WizardStep) => {
    const steps: WizardStep[] = ["choice", "products", "shipping", "payment"];
    const idx = steps.indexOf(step);
    return idx >= 0 ? idx + 1 : 0;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{stepTitles[orderStep]}</DialogTitle>
          {["products", "shipping", "payment"].includes(orderStep) && (
            <div className="flex items-center gap-2 mt-3">
              {[
                { step: "products" as WizardStep, label: "Products" },
                { step: "shipping" as WizardStep, label: "Shipping" },
                { step: "payment" as WizardStep, label: "Payment" },
              ].map((s, i) => (
                <div key={s.step} className="flex items-center gap-2">
                  {i > 0 && <div className="w-6 h-0.5 bg-muted" />}
                  <div className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      orderStep === s.step ? "bg-primary text-primary-foreground" :
                      stepNumber(orderStep) > stepNumber(s.step) ? "bg-primary/20 text-primary" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {stepNumber(orderStep) > stepNumber(s.step) ? <CheckCircle className="w-3.5 h-3.5" /> : stepNumber(s.step)}
                    </div>
                    <span className={`text-xs ${orderStep === s.step ? "text-primary font-medium" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2">
          {orderStep === "choice" && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <Button
                variant="outline"
                className="h-32 flex flex-col gap-2"
                onClick={() => setOrderStep("select")}
                data-testid="button-select-existing-customer"
              >
                <Search className="w-8 h-8" />
                Select Existing Customer
              </Button>
              <Button
                variant="outline"
                className="h-32 flex flex-col gap-2"
                onClick={() => {
                  setNewCustomer({ name: "", email: "", phone: "", address: "", city: "", state: "", zipCode: "" });
                  setOrderStep("create");
                }}
                data-testid="button-create-new-customer-order"
              >
                <Plus className="w-8 h-8" />
                Create New Customer
              </Button>
            </div>
          )}

          {orderStep === "select" && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Search & Select Customer *</Label>
                <Select value={orderCustomerId} onValueChange={(val) => {
                  setOrderCustomerId(val);
                  setOrderStep("products");
                  if (orderItems.length === 0) setOrderItems([{ productId: "", quantity: 1 }]);
                }}>
                  <SelectTrigger data-testid="select-order-customer">
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} ({customer.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" onClick={() => setOrderStep("choice")}>Back</Button>
            </div>
          )}

          {orderStep === "create" && (
            <form
              id="create-customer-form"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const customer = await createCustomerMutation.mutateAsync(newCustomer);
                  setOrderCustomerId(customer.id);
                  setOrderStep("products");
                  if (orderItems.length === 0) setOrderItems([{ productId: "", quantity: 1 }]);
                } catch (err) {}
              }}
              className="space-y-6 py-4"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="order-cust-name">Name *</Label>
                  <Input
                    id="order-cust-name"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order-cust-email">Email *</Label>
                  <Input
                    id="order-cust-email"
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    required
                  />
                </div>
              </div>
            </form>
          )}

          {orderStep === "products" && (
            <form
              id="manual-order-form"
              onSubmit={(e) => {
                e.preventDefault();
              }}
              className="space-y-4 py-4"
            >
              {selectedCustomer && (
                <div className="p-3 bg-muted/30 rounded-lg text-sm flex items-center gap-2">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium">{selectedCustomer.name}</span>
                  <span className="text-muted-foreground">({selectedCustomer.email})</span>
                </div>
              )}
              <div className="space-y-2">
                <Label>Products *</Label>
                {orderItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Select
                      value={item.productId}
                      onValueChange={(value) => {
                        const newItems = [...orderItems];
                        newItems[index].productId = value;
                        setOrderItems(newItems);
                      }}
                    >
                      <SelectTrigger className="flex-1" data-testid={`select-product-${index}`}>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.filter(p => p.active !== false).map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - ${(product.price / 100).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...orderItems];
                        newItems[index].quantity = parseInt(e.target.value) || 1;
                        setOrderItems(newItems);
                      }}
                      className="w-20"
                      data-testid={`input-quantity-${index}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setOrderItems(orderItems.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOrderItems([...orderItems, { productId: "", quantity: 1 }])}
                  className="w-full mt-2"
                  data-testid="button-add-product"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>
            </form>
          )}

          {orderStep === "shipping" && (
            <form
              id="shipping-form"
              onSubmit={handleShippingSubmit}
              className="space-y-6 py-4"
            >
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Shipping Address
                </h3>
                <AddressForm
                  data={shippingAddress}
                  onChange={setShippingAddress}
                  errors={fieldErrors}
                  onClearError={clearError}
                  onBlurValidate={handleBlurValidate}
                  testIdPrefix="shipping"
                  autoCompletePrefix="shipping"
                />
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="billing-same"
                    checked={billingSameAsShipping}
                    onCheckedChange={(checked) => {
                      setBillingSameAsShipping(checked === true);
                      if (checked !== true && billingAddress.name === "" && shippingAddress.name) {
                        setBillingAddress({ ...shippingAddress });
                      }
                    }}
                    data-testid="checkbox-billing-same"
                  />
                  <Label htmlFor="billing-same" className="text-sm">
                    Billing address same as shipping
                  </Label>
                </div>

                {!billingSameAsShipping && (
                  <div>
                    <h3 className="text-sm font-medium mb-3">Billing Address</h3>
                    <AddressForm
                      data={billingAddress}
                      onChange={setBillingAddress}
                      errors={fieldErrors}
                      onClearError={clearError}
                      onBlurValidate={handleBlurValidate}
                      fieldPrefix="billing"
                      testIdPrefix="billing"
                      autoCompletePrefix="billing"
                    />
                  </div>
                )}
              </div>
            </form>
          )}

          {orderStep === "payment" && clientSecret && stripePromise && (
            <div className="space-y-4 py-4">
              {taxInfo && (
                <div className="p-4 bg-muted/30 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${(taxInfo.subtotal / 100).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>${(taxInfo.taxAmount / 100).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-2">
                    <span>Total</span>
                    <span className="text-primary">${(taxInfo.total / 100).toLocaleString()}</span>
                  </div>
                </div>
              )}

              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: stripeAppearance,
                }}
              >
                <PaymentForm
                  clientSecret={clientSecret}
                  orderId={orderId!}
                  total={taxInfo?.total || 0}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
                    setOrderStep("success");
                  }}
                  onError={(msg) => {
                    toast({ title: "Payment Failed", description: msg, variant: "destructive" });
                  }}
                />
              </Elements>
            </div>
          )}

          {orderStep === "success" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-bold">Payment Successful</h3>
              <p className="text-sm text-muted-foreground text-center">
                Order <span className="font-medium text-foreground">{orderId}</span> has been created and paid.
              </p>
              {selectedCustomer && (
                <p className="text-sm text-muted-foreground">
                  Customer: {selectedCustomer.name} ({selectedCustomer.email})
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-6 pt-2 border-t bg-background">
          {orderStep === "create" && (
            <div className="grid grid-cols-2 gap-4">
              <Button type="button" variant="outline" className="w-full" onClick={() => setOrderStep("choice")}>
                Back
              </Button>
              <Button form="create-customer-form" type="submit" className="w-full" disabled={createCustomerMutation.isPending}>
                {createCustomerMutation.isPending ? "Creating..." : "Continue to Products"}
              </Button>
            </div>
          )}

          {orderStep === "products" && (
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-muted/50 rounded-lg flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Order Total</span>
                <span className="text-xl font-bold text-primary">
                  ${(cartTotal / 100).toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <Button type="button" variant="outline" onClick={() => setOrderStep("choice")}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="secondary"
                    className="gap-2"
                    onClick={() => {
                      if (!orderCustomerId || orderItems.length === 0) return;
                      createOrderMutation.mutate({ customerId: orderCustomerId, items: orderItems });
                    }}
                    disabled={createOrderMutation.isPending || orderItems.length === 0 || !orderItems.every(i => i.productId)}
                    data-testid="button-bypass-payment"
                  >
                    <Ban className="w-4 h-4" />
                    Bypass Payment
                  </Button>
                  <Button
                    className="gap-2"
                    onClick={handleProceedToCheckout}
                    disabled={orderItems.length === 0 || !orderItems.every(i => i.productId)}
                    data-testid="button-proceed-to-checkout"
                  >
                    Proceed to Checkout
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {orderStep === "shipping" && (
            <div className="flex justify-between gap-4">
              <Button type="button" variant="outline" onClick={() => setOrderStep("products")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Products
              </Button>
              <Button
                form="shipping-form"
                type="submit"
                className="gap-2"
                disabled={isCheckoutLoading}
                data-testid="button-continue-to-payment"
              >
                {isCheckoutLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Continue to Payment
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {orderStep === "payment" && (
            <div className="flex justify-start">
              <Button type="button" variant="outline" onClick={() => setOrderStep("shipping")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Shipping
              </Button>
            </div>
          )}

          {orderStep === "success" && (
            <Button
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                resetWizard();
              }}
              data-testid="button-close-success"
            >
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
