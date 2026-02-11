import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SlideOutPanel, PanelFooter } from "@/components/ui/slide-out-panel";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, UserPlus, Trash2, Mail, User, Key, Shield, ShoppingCart, 
  Search, Edit, Plus, Package, ShoppingBag, Settings, LogOut, Home, ChevronDown, Building2, FileText
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdmin } from "@/hooks/use-admin";
import AdminNav from "@/components/admin/AdminNav";

interface Customer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

export default function AdminUserManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [activeTab, setActiveTab] = useState("customers");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isCustomerPanelOpen, setIsCustomerPanelOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isOrderPanelOpen, setIsOrderPanelOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  
  const [customerForm, setCustomerForm] = useState({ name: "", email: "", phone: "", address: "", city: "", state: "", zipCode: "" });
  const [adminForm, setAdminForm] = useState({ name: "", email: "", password: "", role: "store_manager" });
  const [newPassword, setNewPassword] = useState("");
  const [orderForm, setOrderForm] = useState({ customerId: "", productId: "", quantity: 1, notes: "" });
  const [deleteCustomerConfirm, setDeleteCustomerConfirm] = useState<Customer | null>(null);
  const [deleteAdminConfirm, setDeleteAdminConfirm] = useState<AdminUser | null>(null);

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/admin/customers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/customers");
      if (res.status === 401) { setLocation("/admin/login"); return []; }
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  const { data: admins = [], isLoading: adminsLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/team"],
    queryFn: async () => {
      const res = await fetch("/api/admin/team");
      if (res.status === 401) { setLocation("/admin/login"); return []; }
      if (!res.ok) throw new Error("Failed to fetch admins");
      return res.json();
    },
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
    queryFn: async () => {
      const res = await fetch("/api/admin/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: typeof customerForm) => {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to create customer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      toast({ title: "Customer created" });
      setIsCustomerPanelOpen(false);
      resetCustomerForm();
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof customerForm }) => {
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to update customer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      toast({ title: "Customer updated" });
      setIsCustomerPanelOpen(false);
      resetCustomerForm();
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/customers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to delete customer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      toast({ title: "Customer deleted" });
      setDeleteCustomerConfirm(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setDeleteCustomerConfirm(null);
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: async (data: typeof adminForm) => {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to create admin");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      toast({ title: "Admin user created" });
      setIsAdminPanelOpen(false);
      resetAdminForm();
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const updateAdminMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof adminForm> }) => {
      const res = await fetch(`/api/admin/team/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to update admin");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      toast({ title: "Admin updated" });
      setIsAdminPanelOpen(false);
      setIsResetPasswordOpen(false);
      resetAdminForm();
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const deleteAdminMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/team/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to delete admin");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      toast({ title: "Admin removed" });
      setDeleteAdminConfirm(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setDeleteAdminConfirm(null);
    },
  });

  const createManualOrderMutation = useMutation({
    mutationFn: async (data: typeof orderForm) => {
      const res = await fetch("/api/admin/manual-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to create order");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Order created", description: `Order #${data.orderId} created successfully` });
      setIsOrderPanelOpen(false);
      resetOrderForm();
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setLocation("/admin/login");
  };

  const resetCustomerForm = () => {
    setCustomerForm({ name: "", email: "", phone: "", address: "", city: "", state: "", zipCode: "" });
    setSelectedCustomer(null);
  };

  const resetAdminForm = () => {
    setAdminForm({ name: "", email: "", password: "", role: "store_manager" });
    setSelectedAdmin(null);
    setNewPassword("");
  };

  const resetOrderForm = () => {
    setOrderForm({ customerId: "", productId: "", quantity: 1, notes: "" });
  };

  const openEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      zipCode: customer.zipCode || "",
    });
    setIsCustomerPanelOpen(true);
  };

  const openEditAdmin = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setAdminForm({
      name: admin.name,
      email: admin.email,
      password: "",
      role: admin.role,
    });
    setIsAdminPanelOpen(true);
  };

  const openCreateOrderForCustomer = (customer: Customer) => {
    setOrderForm({ ...orderForm, customerId: customer.id });
    setIsOrderPanelOpen(true);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAdmins = admins.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access user management. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold">Power Plunge Admin</h1>
            <div className="flex gap-2">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="sm" className="gap-2" data-testid="link-home">
                  <Home className="w-4 h-4" />
                  Home
                </Button>
              </Link>
              <Link href="/admin/orders">
                <Button variant="ghost" size="sm" className="gap-2" data-testid="link-orders">
                  <Package className="w-4 h-4" />
                  Orders
                </Button>
              </Link>
              <Link href="/admin/products">
                <Button variant="ghost" size="sm" className="gap-2" data-testid="link-products">
                  <ShoppingBag className="w-4 h-4" />
                  Products
                </Button>
              </Link>
              <Link href="/admin/customers">
                <Button variant="ghost" size="sm" className="gap-2" data-testid="link-customers">
                  <Users className="w-4 h-4" />
                  Customers
                </Button>
              </Link>
              <Link href="/admin/user-management">
                <Button variant="secondary" size="sm" className="gap-2" data-testid="link-user-management">
                  <Shield className="w-4 h-4" />
                  User Management
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2" data-testid="dropdown-settings">
                    <Settings className="w-4 h-4" />
                    Settings
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/admin/settings" className="flex items-center gap-2 cursor-pointer">
                      <Building2 className="w-4 h-4" />
                      Company Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/email-templates" className="flex items-center gap-2 cursor-pointer">
                      <FileText className="w-4 h-4" />
                      Email Templates
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/integrations" className="flex items-center gap-2 cursor-pointer">
                      <Key className="w-4 h-4" />
                      Integrations
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/docs" className="flex items-center gap-2 cursor-pointer">
                      <FileText className="w-4 h-4" />
                      Docs Library
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold">User Management</h2>
            <p className="text-muted-foreground">Manage customers, admins, and create manual orders.</p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="customers" className="gap-2">
              <User className="w-4 h-4" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="admins" className="gap-2">
              <Shield className="w-4 h-4" />
              Admins & Managers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={() => { resetCustomerForm(); setIsCustomerPanelOpen(true); }} data-testid="button-add-customer">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customersLoading ? (
                      <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Loading...</td></tr>
                    ) : filteredCustomers.length === 0 ? (
                      <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No customers found</td></tr>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <tr key={customer.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="p-4 font-medium">{customer.name}</td>
                          <td className="p-4 text-muted-foreground">{customer.email}</td>
                          <td className="p-4 text-muted-foreground">{customer.phone || "-"}</td>
                          <td className="p-4 text-muted-foreground">
                            {customer.city && customer.state ? `${customer.city}, ${customer.state}` : "-"}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => openEditCustomer(customer)} data-testid={`button-edit-customer-${customer.id}`}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => openCreateOrderForCustomer(customer)} data-testid={`button-order-customer-${customer.id}`}>
                                <ShoppingCart className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteCustomerConfirm(customer)}
                                data-testid={`button-delete-customer-${customer.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admins" className="space-y-4">
            <Button onClick={() => { resetAdminForm(); setIsAdminPanelOpen(true); }} data-testid="button-add-admin">
              <Plus className="w-4 h-4 mr-2" />
              Add Admin/Manager
            </Button>

            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminsLoading ? (
                      <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Loading...</td></tr>
                    ) : filteredAdmins.length === 0 ? (
                      <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No admins found</td></tr>
                    ) : (
                      filteredAdmins.map((admin) => (
                        <tr key={admin.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="p-4 font-medium">{admin.name}</td>
                          <td className="p-4 text-muted-foreground">{admin.email}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              admin.role === "super_admin" ? "bg-amber-500/20 text-amber-400" : admin.role === "admin" ? "bg-primary/20 text-primary" : "bg-blue-500/20 text-blue-400"
                            }`}>
                              {admin.role === "super_admin" ? "Super Admin" : admin.role === "admin" ? "Admin" : admin.role === "store_manager" ? "Store Manager" : "Fulfillment"}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => openEditAdmin(admin)} data-testid={`button-edit-admin-${admin.id}`}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => { setSelectedAdmin(admin); setIsResetPasswordOpen(true); }}
                                data-testid={`button-reset-password-${admin.id}`}
                              >
                                <Key className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteAdminConfirm(admin)}
                                data-testid={`button-delete-admin-${admin.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Customer Panel */}
      <SlideOutPanel
        open={isCustomerPanelOpen}
        onClose={() => { setIsCustomerPanelOpen(false); resetCustomerForm(); }}
        title={selectedCustomer ? "Edit Customer" : "Add Customer"}
        isDirty={true}
        footer={
          <PanelFooter
            onCancel={() => { setIsCustomerPanelOpen(false); resetCustomerForm(); }}
            onSave={() => selectedCustomer 
              ? updateCustomerMutation.mutate({ id: selectedCustomer.id, data: customerForm })
              : createCustomerMutation.mutate(customerForm)
            }
            isSaving={createCustomerMutation.isPending || updateCustomerMutation.isPending}
            saveLabel={selectedCustomer ? "Update Customer" : "Create Customer"}
          />
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} data-testid="input-customer-name" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} data-testid="input-customer-email" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} data-testid="input-customer-phone" />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} data-testid="input-customer-address" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={customerForm.city} onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })} data-testid="input-customer-city" />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={customerForm.state} onChange={(e) => setCustomerForm({ ...customerForm, state: e.target.value })} data-testid="input-customer-state" />
            </div>
            <div className="space-y-2">
              <Label>ZIP</Label>
              <Input value={customerForm.zipCode} onChange={(e) => setCustomerForm({ ...customerForm, zipCode: e.target.value })} data-testid="input-customer-zip" />
            </div>
          </div>
        </div>
      </SlideOutPanel>

      {/* Admin Panel */}
      <SlideOutPanel
        open={isAdminPanelOpen}
        onClose={() => { setIsAdminPanelOpen(false); resetAdminForm(); }}
        title={selectedAdmin ? "Edit Admin" : "Add Admin/Manager"}
        isDirty={true}
        footer={
          <PanelFooter
            onCancel={() => { setIsAdminPanelOpen(false); resetAdminForm(); }}
            onSave={() => selectedAdmin 
              ? updateAdminMutation.mutate({ id: selectedAdmin.id, data: { name: adminForm.name, email: adminForm.email, role: adminForm.role } })
              : createAdminMutation.mutate(adminForm)
            }
            isSaving={createAdminMutation.isPending || updateAdminMutation.isPending}
            saveLabel={selectedAdmin ? "Update Admin" : "Create Admin"}
          />
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={adminForm.name} onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })} data-testid="input-admin-name" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} data-testid="input-admin-email" />
          </div>
          {!selectedAdmin && (
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} data-testid="input-admin-password" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={adminForm.role} onValueChange={(v) => setAdminForm({ ...adminForm, role: v })}>
              <SelectTrigger data-testid="select-admin-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin (Full Access)</SelectItem>
                <SelectItem value="store_manager">Store Manager (Limited Access)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SlideOutPanel>

      {/* Manual Order Panel */}
      <SlideOutPanel
        open={isOrderPanelOpen}
        onClose={() => { setIsOrderPanelOpen(false); resetOrderForm(); }}
        title="Create Manual Order"
        isDirty={true}
        footer={
          <PanelFooter
            onCancel={() => { setIsOrderPanelOpen(false); resetOrderForm(); }}
            onSave={() => createManualOrderMutation.mutate(orderForm)}
            isSaving={createManualOrderMutation.isPending}
            saveLabel="Create Order"
          />
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Customer</Label>
            <Select value={orderForm.customerId} onValueChange={(v) => setOrderForm({ ...orderForm, customerId: v })}>
              <SelectTrigger data-testid="select-order-customer">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} ({c.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={orderForm.productId} onValueChange={(v) => setOrderForm({ ...orderForm, productId: v })}>
              <SelectTrigger data-testid="select-order-product">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} (${(p.price / 100).toFixed(2)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input 
              type="number" 
              min="1" 
              value={orderForm.quantity} 
              onChange={(e) => setOrderForm({ ...orderForm, quantity: parseInt(e.target.value) || 1 })} 
              data-testid="input-order-quantity"
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input 
              value={orderForm.notes} 
              onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} 
              placeholder="Order notes..."
              data-testid="input-order-notes"
            />
          </div>
        </div>
      </SlideOutPanel>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedAdmin?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                data-testid="input-new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsResetPasswordOpen(false); setNewPassword(""); }}>Cancel</Button>
            <Button 
              onClick={() => selectedAdmin && updateAdminMutation.mutate({ id: selectedAdmin.id, data: { password: newPassword } })}
              disabled={!newPassword || updateAdminMutation.isPending}
              data-testid="button-confirm-reset"
            >
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCustomerConfirm} onOpenChange={(open) => !open && setDeleteCustomerConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteCustomerConfirm?.name}</strong> ({deleteCustomerConfirm?.email})? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCustomerConfirm(null)} data-testid="button-cancel-delete-customer">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteCustomerConfirm && deleteCustomerMutation.mutate(deleteCustomerConfirm.id)}
              disabled={deleteCustomerMutation.isPending}
              data-testid="button-confirm-delete-customer"
            >
              {deleteCustomerMutation.isPending ? "Deleting..." : "Delete Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteAdminConfirm} onOpenChange={(open) => !open && setDeleteAdminConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Admin</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{deleteAdminConfirm?.name}</strong> ({deleteAdminConfirm?.email})? This will revoke all their admin access. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAdminConfirm(null)} data-testid="button-cancel-delete-admin">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteAdminConfirm && deleteAdminMutation.mutate(deleteAdminConfirm.id)}
              disabled={deleteAdminMutation.isPending}
              data-testid="button-confirm-delete-admin"
            >
              {deleteAdminMutation.isPending ? "Removing..." : "Remove Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
