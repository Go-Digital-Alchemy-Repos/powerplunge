import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, ArrowRight, CreditCard, Ban } from "lucide-react";

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

export function ManualOrderWizard({ open, onOpenChange }: ManualOrderWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [orderStep, setOrderStep] = useState<"choice" | "select" | "create" | "products">("choice");
  const [orderCustomerId, setOrderCustomerId] = useState("");
  const [orderItems, setOrderItems] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "", address: "", city: "", state: "", zipCode: "" });

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      
      // If the user clicked "Proceed to Checkout", we'd ideally redirect to a checkout session
      // For now, we'll create the order and inform them. 
      // If we had a specific checkout URL from the backend, we could redirect here.
      
      onOpenChange(false);
      resetWizard();
      toast({ title: "Order created successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const resetWizard = () => {
    setOrderStep("choice");
    setOrderCustomerId("");
    setOrderItems([]);
    setNewCustomer({ name: "", email: "", phone: "", address: "", city: "", state: "", zipCode: "" });
  };

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) resetWizard();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>
            {orderStep === "choice" && "Manual Order: Customer Selection"}
            {orderStep === "select" && "Select Existing Customer"}
            {orderStep === "create" && "Create New Customer"}
            {orderStep === "products" && "Add Products to Order"}
          </DialogTitle>
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
                } catch (err) {
                  // Error handled by mutation
                }
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
                if (!orderCustomerId || orderItems.length === 0) return;
                createOrderMutation.mutate({ customerId: orderCustomerId, items: orderItems });
              }}
              className="space-y-4 py-4"
            >
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
                  $
                  {(
                    orderItems.reduce((sum, item) => {
                      const product = products?.find((p) => p.id === item.productId);
                      return sum + (product?.price || 0) * item.quantity;
                    }, 0) / 100
                  ).toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <Button type="button" variant="outline" onClick={() => setOrderStep("choice")}>
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
                    form="manual-order-form"
                    type="submit"
                    className="gap-2"
                    disabled={createOrderMutation.isPending || orderItems.length === 0 || !orderItems.every(i => i.productId)}
                    data-testid="button-proceed-to-checkout"
                  >
                    Proceed to Checkout
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
