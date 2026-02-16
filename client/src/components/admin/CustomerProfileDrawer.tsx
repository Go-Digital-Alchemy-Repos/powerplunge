import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  User,
  ShoppingCart,
  Users,
  Truck,
  Shield,
  Tag,
  StickyNote,
  Clock,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  AlertTriangle,
  Check,
  X,
  RefreshCw,
  Ban,
  Lock,
  Unlock,
  Send,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Pencil,
  Save,
  Key,
  LogOut,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import { MobileTabsList } from "@/components/ui/mobile-tabs-list";
import { Label } from "@/components/ui/label";
import { ManualOrderWizard } from "./ManualOrderWizard";

interface CustomerProfile {
  customer: {
    id: string;
    userId: string | null;
    email: string;
    name: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    country: string | null;
    isDisabled: boolean | null;
    createdAt: string;
    updatedAt: string;
  };
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string | null;
  avgOrderValue: number;
  isAffiliate: boolean;
  affiliateEarnings: number;
  refundCount: number;
  tags: string[];
}

interface Order {
  id: string;
  customerId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  isManualOrder: boolean;
  stripePaymentIntentId?: string | null;
}

interface CustomerNote {
  id: string;
  customerId: string;
  note: string;
  createdBy: string | null;
  createdByAdminName: string | null;
  createdAt: string;
}

interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

interface CustomerProfileDrawerProps {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerProfileDrawer({
  customerId,
  open,
  onOpenChange,
}: CustomerProfileDrawerProps) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("");
  const [tagInput, setTagInput] = useState<string[]>([]);
  const [disableReason, setDisableReason] = useState("");
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  });
  const [editingShipping, setEditingShipping] = useState(false);
  const [shippingForm, setShippingForm] = useState({
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    phone: "",
  });
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showManualOrder, setShowManualOrder] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (open && customerId) {
      fetchCustomerData();
    }
  }, [open, customerId]);

  useEffect(() => {
    if (profile) {
      setTagInput(profile.tags);
      setContactForm({
        name: profile.customer.name || "",
        email: profile.customer.email || "",
        phone: profile.customer.phone || "",
        address: profile.customer.address || "",
        city: profile.customer.city || "",
        state: profile.customer.state || "",
        zipCode: profile.customer.zipCode || "",
        country: profile.customer.country || "",
      });
      setShippingForm({
        address: profile.customer.address || "",
        city: profile.customer.city || "",
        state: profile.customer.state || "",
        zipCode: profile.customer.zipCode || "",
        country: profile.customer.country || "",
        phone: profile.customer.phone || "",
      });
    }
  }, [profile]);

  const fetchCustomerData = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const [profileRes, ordersRes, notesRes, logsRes] = await Promise.all([
        fetch(`/api/admin/customers/${customerId}/profile`, { credentials: "include" }),
        fetch(`/api/admin/customers/${customerId}/orders`, { credentials: "include" }),
        fetch(`/api/admin/customers/${customerId}/notes`, { credentials: "include" }),
        fetch(`/api/admin/customers/${customerId}/audit-logs`, { credentials: "include" }),
      ]);

      if (profileRes.ok) setProfile(await profileRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (notesRes.ok) setNotes(await notesRes.json());
      if (logsRes.ok) setAuditLogs(await logsRes.json());
    } catch (error) {
      console.error("Failed to fetch customer data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleAddNote = async () => {
    if (!customerId || !newNote.trim()) return;
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ note: newNote }),
      });
      if (res.ok) {
        setNewNote("");
        const notesRes = await fetch(`/api/admin/customers/${customerId}/notes`, { credentials: "include" });
        if (notesRes.ok) setNotes(await notesRes.json());
      }
    } catch (error) {
      console.error("Failed to add note:", error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!customerId) return;
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/notes/${noteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setNotes(notes.filter((n) => n.id !== noteId));
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  const handleSaveContact = async () => {
    if (!customerId) return;
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(contactForm),
      });
      if (res.ok) {
        setEditingContact(false);
        fetchCustomerData();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Failed to update customer");
      }
    } catch (error) {
      console.error("Failed to update customer:", error);
      alert("Failed to update customer");
    }
  };

  const handleSaveShipping = async () => {
    if (!customerId) return;
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(shippingForm),
      });
      if (res.ok) {
        setEditingShipping(false);
        fetchCustomerData();
      }
    } catch (error) {
      console.error("Failed to update shipping:", error);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tagInput.includes(newTag.trim())) {
      setTagInput([...tagInput, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTagInput(tagInput.filter((t) => t !== tag));
  };

  const handleSaveTags = async () => {
    if (!customerId) return;
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tags: tagInput }),
      });
      if (res.ok) {
        fetchCustomerData();
      }
    } catch (error) {
      console.error("Failed to save tags:", error);
    }
  };

  const handleDisableAccount = async () => {
    if (!customerId) return;
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/disable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: disableReason }),
      });
      if (res.ok) {
        fetchCustomerData();
        setDisableReason("");
      }
    } catch (error) {
      console.error("Failed to disable account:", error);
    }
  };

  const handleEnableAccount = async () => {
    if (!customerId) return;
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/enable`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        fetchCustomerData();
      }
    } catch (error) {
      console.error("Failed to enable account:", error);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!customerId) return;
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/send-password-reset`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        alert("Password reset email sent successfully");
        fetchCustomerData();
      }
    } catch (error) {
      console.error("Failed to send password reset:", error);
    }
  };

  const handleDirectPasswordReset = async () => {
    if (!customerId) return;
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters");
      return;
    }
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        alert("Password reset successfully");
        setShowPasswordReset(false);
        setNewPassword("");
        setConfirmPassword("");
        fetchCustomerData();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to reset password");
      }
    } catch (error) {
      console.error("Failed to reset password:", error);
    }
  };

  const handleForceLogout = async () => {
    if (!customerId) return;
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/force-logout`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        alert("All customer sessions have been invalidated");
        fetchCustomerData();
      }
    } catch (error) {
      console.error("Failed to force logout:", error);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerId) return;
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        alert("Customer deleted successfully");
        onOpenChange(false);
        window.location.reload();
      } else {
        alert(data.message || "Failed to delete customer");
      }
    } catch (error) {
      console.error("Failed to delete customer:", error);
      alert("Failed to delete customer");
    }
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500";
      case "shipped":
        return "bg-blue-500";
      case "delivered":
        return "bg-purple-500";
      case "pending":
        return "bg-yellow-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-muted-foreground";
    }
  };

  if (!profile && !loading) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-[95vw] min-w-[80vw] sm:w-[85vw] lg:w-[80vw] overflow-hidden flex flex-col"
        data-testid="customer-profile-drawer"
      >
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-xl" data-testid="customer-name">
                  {profile?.customer.name || "Loading..."}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {profile?.customer.email}
                </SheetDescription>
                {profile?.customer.id && (
                  <p className="text-xs text-primary mt-1" data-testid="text-client-id">
                    Client ID: {profile.customer.id.slice(0, 8).toUpperCase()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {profile?.customer.isDisabled && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <Ban className="w-3 h-3" />
                  Disabled
                </Badge>
              )}
              {profile?.isAffiliate && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Affiliate
                </Badge>
              )}
            </div>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <MobileTabsList
            tabs={[
              { value: "overview", label: "Overview", icon: <User className="w-4 h-4" />, "data-testid": "tab-overview" },
              { value: "orders", label: "Orders", icon: <ShoppingCart className="w-4 h-4" />, "data-testid": "tab-orders" },
              { value: "affiliate", label: "Affiliate", icon: <Users className="w-4 h-4" />, "data-testid": "tab-affiliate" },
              { value: "shipping", label: "Shipping", icon: <Truck className="w-4 h-4" />, "data-testid": "tab-shipping" },
              { value: "security", label: "Security", icon: <Shield className="w-4 h-4" />, "data-testid": "tab-security" },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabsListClassName="grid w-full grid-cols-5 mt-4"
          />

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="overview" className="m-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" />
                      Total Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-order-count">
                      {profile?.orderCount || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Total Spent
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-total-spent">
                      {formatCurrency(profile?.totalSpent || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Last Order
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-last-order">
                      {profile?.lastOrderDate ? formatDate(profile.lastOrderDate) : "Never"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Contact Information
                      </div>
                      {!editingContact ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (profile) {
                              setContactForm({
                                name: profile.customer.name || "",
                                email: profile.customer.email || "",
                                phone: profile.customer.phone || "",
                                address: profile.customer.address || "",
                                city: profile.customer.city || "",
                                state: profile.customer.state || "",
                                zipCode: profile.customer.zipCode || "",
                                country: profile.customer.country || "",
                              });
                            }
                            setEditingContact(true);
                          }}
                          data-testid="button-edit-contact"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingContact(false);
                              if (profile) {
                                setContactForm({
                                  name: profile.customer.name || "",
                                  email: profile.customer.email || "",
                                  phone: profile.customer.phone || "",
                                  address: profile.customer.address || "",
                                  city: profile.customer.city || "",
                                  state: profile.customer.state || "",
                                  zipCode: profile.customer.zipCode || "",
                                  country: profile.customer.country || "",
                                });
                              }
                            }}
                            data-testid="button-cancel-edit"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleSaveContact}
                            className="text-green-500"
                            data-testid="button-save-contact"
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {editingContact ? (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="edit-name">Name</Label>
                          <Input
                            id="edit-name"
                            value={contactForm.name}
                            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                            data-testid="input-edit-name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-email">Email</Label>
                          <Input
                            id="edit-email"
                            type="email"
                            value={contactForm.email}
                            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                            data-testid="input-edit-email"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-phone">Phone</Label>
                          <Input
                            id="edit-phone"
                            value={contactForm.phone}
                            onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                            data-testid="input-edit-phone"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-address">Address</Label>
                          <Input
                            id="edit-address"
                            value={contactForm.address}
                            onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                            data-testid="input-edit-address"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="edit-city">City</Label>
                            <Input
                              id="edit-city"
                              value={contactForm.city}
                              onChange={(e) => setContactForm({ ...contactForm, city: e.target.value })}
                              data-testid="input-edit-city"
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-state">State</Label>
                            <Input
                              id="edit-state"
                              value={contactForm.state}
                              onChange={(e) => setContactForm({ ...contactForm, state: e.target.value })}
                              data-testid="input-edit-state"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="edit-zip">Zip Code</Label>
                            <Input
                              id="edit-zip"
                              value={contactForm.zipCode}
                              onChange={(e) => setContactForm({ ...contactForm, zipCode: e.target.value })}
                              data-testid="input-edit-zip"
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-country">Country</Label>
                            <Input
                              id="edit-country"
                              value={contactForm.country}
                              onChange={(e) => setContactForm({ ...contactForm, country: e.target.value })}
                              data-testid="input-edit-country"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span data-testid="customer-email">{profile?.customer.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span data-testid="customer-phone">{profile?.customer.phone || "Not provided"}</span>
                        </div>
                        <Separator />
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p data-testid="customer-address">{profile?.customer.address || "No address"}</p>
                              <p>
                                {[profile?.customer.city, profile?.customer.state, profile?.customer.zipCode]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                              <p>{profile?.customer.country}</p>
                            </div>
                            {profile?.customer.address && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                  [profile.customer.address, profile.customer.city, profile.customer.state, profile.customer.zipCode, profile.customer.country]
                                    .filter(Boolean)
                                    .join(", ")
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80 shrink-0 mt-0.5"
                                data-testid="link-google-maps"
                              >
                                <MapPin className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="w-5 h-5" />
                      Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {tagInput.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="flex items-center gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleRemoveTag(tag)}
                          data-testid={`tag-${tag}`}
                        >
                          {tag}
                          <X className="w-3 h-3" />
                        </Badge>
                      ))}
                      {tagInput.length === 0 && (
                        <span className="text-muted-foreground text-sm">No tags</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a tag..."
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                        data-testid="input-new-tag"
                      />
                      <Button onClick={handleAddTag} size="icon" variant="outline" data-testid="button-add-tag">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {JSON.stringify(tagInput) !== JSON.stringify(profile?.tags || []) && (
                      <Button onClick={handleSaveTags} className="w-full" data-testid="button-save-tags">
                        Save Tags
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <StickyNote className="w-5 h-5" />
                    Admin Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add a note about this customer..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="flex-1"
                      data-testid="input-new-note"
                    />
                    <Button onClick={handleAddNote} disabled={!newNote.trim()} data-testid="button-add-note">
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="bg-muted p-3 rounded-lg flex justify-between items-start"
                        data-testid={`note-${note.id}`}
                      >
                        <div className="flex-1">
                          <p className="text-sm">{note.note}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(note.createdAt)}
                            {note.createdByAdminName && (
                              <span className="ml-1 border-l pl-1.5 border-muted-foreground/30 italic">
                                — {note.createdByAdminName}
                              </span>
                            )}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteNote(note.id)}
                          data-testid={`delete-note-${note.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {notes.length === 0 && (
                      <p className="text-muted-foreground text-sm text-center py-4">No notes yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders" className="m-0 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Order History</h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setShowManualOrder(true)}
                    data-testid="button-manual-order-drawer"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Manual Order
                  </Button>
                  <Badge variant="outline">{orders.length} orders</Badge>
                </div>
              </div>
              {customerId && (
                <ManualOrderWizard
                  open={showManualOrder}
                  onOpenChange={setShowManualOrder}
                  preselectedCustomerId={customerId}
                />
              )}
              {orders.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No orders yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <Card key={order.id} data-testid={`order-${order.id}`}>
                      <CardContent className="p-4">
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleOrderExpansion(order.id)}
                        >
                          <div className="flex items-center gap-4">
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                            <span className="text-sm">
                              #{order.id.slice(0, 8)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-semibold">
                              {order.isManualOrder && !order.stripePaymentIntentId ? "$0.00" : formatCurrency(order.totalAmount)}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              {formatDate(order.createdAt)}
                            </span>
                            {expandedOrders.has(order.id) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                        {expandedOrders.has(order.id) && (
                          <div className="mt-4 pt-4 border-t space-y-2">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Order ID:</span>
                                <span className="ml-2">{order.id}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Manual Order:</span>
                                <span className="ml-2">{order.isManualOrder ? "Yes" : "No"}</span>
                              </div>
                              {order.notes && (
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">Notes:</span>
                                  <span className="ml-2">{order.notes}</span>
                                </div>
                              )}
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                onOpenChange(false);
                                window.location.href = `/admin/orders?highlight=${order.id}`;
                              }}
                              data-testid={`view-order-${order.id}`}
                            >
                              View Full Order
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="affiliate" className="m-0 space-y-6">
              {profile?.isAffiliate ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Total Earnings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-500" data-testid="affiliate-earnings">
                          {formatCurrency(profile.affiliateEarnings)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="secondary" className="text-lg">
                          Active Affiliate
                        </Badge>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Quick Actions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" asChild>
                          <a href="/admin/affiliates">View in Affiliate Dashboard</a>
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-2">This customer is not an affiliate</p>
                    <p className="text-sm">
                      Customers can sign up for the affiliate program from their My Account page.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="shipping" className="m-0 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Shipping Address
                    </div>
                    {!editingShipping ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingShipping(true)}
                        data-testid="button-edit-shipping"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingShipping(false);
                            if (profile) {
                              setShippingForm({
                                address: profile.customer.address || "",
                                city: profile.customer.city || "",
                                state: profile.customer.state || "",
                                zipCode: profile.customer.zipCode || "",
                                country: profile.customer.country || "",
                                phone: profile.customer.phone || "",
                              });
                            }
                          }}
                          data-testid="button-cancel-shipping"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleSaveShipping}
                          className="text-green-500"
                          data-testid="button-save-shipping"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {editingShipping ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="ship-address">Address</Label>
                        <Input
                          id="ship-address"
                          value={shippingForm.address}
                          onChange={(e) => setShippingForm({ ...shippingForm, address: e.target.value })}
                          data-testid="input-ship-address"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="ship-city">City</Label>
                          <Input
                            id="ship-city"
                            value={shippingForm.city}
                            onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })}
                            data-testid="input-ship-city"
                          />
                        </div>
                        <div>
                          <Label htmlFor="ship-state">State</Label>
                          <Input
                            id="ship-state"
                            value={shippingForm.state}
                            onChange={(e) => setShippingForm({ ...shippingForm, state: e.target.value })}
                            data-testid="input-ship-state"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="ship-zip">Zip Code</Label>
                          <Input
                            id="ship-zip"
                            value={shippingForm.zipCode}
                            onChange={(e) => setShippingForm({ ...shippingForm, zipCode: e.target.value })}
                            data-testid="input-ship-zip"
                          />
                        </div>
                        <div>
                          <Label htmlFor="ship-country">Country</Label>
                          <Input
                            id="ship-country"
                            value={shippingForm.country}
                            onChange={(e) => setShippingForm({ ...shippingForm, country: e.target.value })}
                            data-testid="input-ship-country"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="ship-phone">Phone</Label>
                        <Input
                          id="ship-phone"
                          value={shippingForm.phone}
                          onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })}
                          data-testid="input-ship-phone"
                        />
                      </div>
                    </div>
                  ) : profile?.customer.address ? (
                    <div className="space-y-1" data-testid="shipping-address">
                      <p className="font-medium">{profile.customer.name}</p>
                      <p>{profile.customer.address}</p>
                      <p>
                        {[profile.customer.city, profile.customer.state, profile.customer.zipCode]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      <p>{profile.customer.country}</p>
                      {profile.customer.phone && (
                        <p className="mt-2 flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {profile.customer.phone}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No shipping address on file</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Recent Shipments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Shipment history is available in individual order details.
                  </p>
                  <Button variant="link" className="p-0 mt-2" onClick={() => setActiveTab("orders")}>
                    View Orders
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="m-0 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Account Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">Account Status</p>
                      <p className="text-sm text-muted-foreground">
                        {profile?.customer.isDisabled
                          ? "This account is disabled and cannot log in"
                          : "This account is active"}
                      </p>
                    </div>
                    {profile?.customer.isDisabled ? (
                      <Badge variant="destructive" className="w-fit">Disabled</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-green-500/20 text-green-500 w-fit">
                        Active
                      </Badge>
                    )}
                  </div>
                  <Separator />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">Account Created</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(profile?.customer.createdAt || null)}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Last Updated</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(profile?.customer.updatedAt || null)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Login Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          <Key className="w-4 h-4" />
                          Set New Password
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Directly set a new password for this customer
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setShowPasswordReset(!showPasswordReset)}
                        data-testid="button-toggle-password-reset"
                      >
                        <Key className="w-4 h-4 mr-2" />
                        {showPasswordReset ? "Cancel" : "Set Password"}
                      </Button>
                    </div>
                    {showPasswordReset && (
                      <div className="space-y-3 pt-3 border-t">
                        <div>
                          <Label htmlFor="new-password">New Password</Label>
                          <Input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min. 8 characters"
                            data-testid="input-new-password"
                          />
                        </div>
                        <div>
                          <Label htmlFor="confirm-password">Confirm Password</Label>
                          <Input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            data-testid="input-confirm-password"
                          />
                        </div>
                        <Button
                          onClick={handleDirectPasswordReset}
                          disabled={!newPassword || !confirmPassword}
                          className="w-full"
                          data-testid="button-save-new-password"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save New Password
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Send Reset Link
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Email customer a password reset link
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" data-testid="button-send-password-reset">
                          <Mail className="w-4 h-4 mr-2" />
                          Send Email
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Send Password Reset Email?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will send a password reset email to {profile?.customer.email}. The
                            customer will be able to set a new password.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleSendPasswordReset}>
                            Send Email
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg">
                    <div>
                      <p className="font-medium flex items-center gap-2 text-destructive">
                        <LogOut className="w-4 h-4" />
                        Force Logout
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Invalidate all active sessions for this customer
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="border-destructive text-destructive" data-testid="button-force-logout">
                          <LogOut className="w-4 h-4 mr-2" />
                          Force Logout
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Force Logout Customer?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will immediately invalidate all active sessions for {profile?.customer.name}. They will need to log in again.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleForceLogout}>
                            Force Logout
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    Account Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profile?.customer.isDisabled ? (
                    <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg">
                      <div>
                        <p className="font-medium flex items-center gap-2 text-green-500">
                          <Unlock className="w-4 h-4" />
                          Enable Account
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Re-enable this customer's account
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="border-green-500 text-green-500" data-testid="button-enable-account">
                            Enable Account
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Enable Customer Account?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will re-enable {profile?.customer.name}'s account. They will be
                              able to log in again.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleEnableAccount}>
                              Enable Account
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg">
                      <div>
                        <p className="font-medium flex items-center gap-2 text-destructive">
                          <Ban className="w-4 h-4" />
                          Disable Account
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Prevent this customer from logging in
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" data-testid="button-disable-account">
                            Disable Account
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Disable Customer Account?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will disable {profile?.customer.name}'s account. They will not be
                              able to log in until re-enabled.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="py-4">
                            <Textarea
                              placeholder="Reason for disabling (optional)"
                              value={disableReason}
                              onChange={(e) => setDisableReason(e.target.value)}
                              data-testid="input-disable-reason"
                            />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDisableAccount}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Disable Account
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Activity Log
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {auditLogs.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No admin actions recorded
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 p-2 bg-muted rounded"
                          data-testid={`audit-log-${log.id}`}
                        >
                          <Clock className="w-4 h-4 mt-1 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{log.action.replace(/_/g, " ")}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(log.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <Trash2 className="w-5 h-5" />
                    Danger Zone
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg">
                    <div>
                      <p className="font-medium flex items-center gap-2 text-destructive">
                        <Trash2 className="w-4 h-4" />
                        Delete Customer
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Permanently remove this customer from the database
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" data-testid="button-delete-customer">
                          Delete Customer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Customer Permanently?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete{" "}
                            {profile?.customer.name}'s account and all associated data.
                            Customers with existing orders cannot be deleted.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteCustomer}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Delete Permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
