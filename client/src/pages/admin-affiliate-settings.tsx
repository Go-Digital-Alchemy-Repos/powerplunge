import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Package, LogOut, Settings, ShoppingBag, Users, UserPlus, Link2, ArrowLeft, Save, Home, ChevronDown, Building2, Key, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AmountTypeInput } from "@/components/ui/amount-type-input";
import { useAdmin } from "@/hooks/use-admin";
import defaultAdminIcon from "@assets/powerplungeicon_1770929882628.png";
import AdminNav from "@/components/admin/AdminNav";

interface AffiliateSettings {
  id: string;
  commissionRate: number;
  customerDiscountPercent: number;
  defaultCommissionType: string;
  defaultCommissionValue: number;
  defaultDiscountType: string;
  defaultDiscountValue: number;
  minimumPayout: number;
  cookieDuration: number;
  agreementText: string;
  programActive: boolean;
  updatedAt: string;
}

export default function AdminAffiliateSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();

  const [formData, setFormData] = useState<Partial<AffiliateSettings>>({
    defaultCommissionType: "PERCENT",
    defaultCommissionValue: 10,
    defaultDiscountType: "PERCENT",
    defaultDiscountValue: 0,
    minimumPayout: 5000,
    cookieDuration: 30,
    agreementText: "",
    programActive: true,
  });

  const { data: settings, isLoading } = useQuery<AffiliateSettings>({
    queryKey: ["/api/admin/affiliate-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/affiliate-settings", { credentials: "include" });
      if (res.status === 401) {
        setLocation("/admin/login");
        return null;
      }
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        defaultCommissionType: settings.defaultCommissionType || "PERCENT",
        defaultCommissionValue: (settings.defaultCommissionType === "FIXED"
          ? Math.round((settings.defaultCommissionValue ?? 0) / 100 * 100) / 100
          : settings.defaultCommissionValue ?? settings.commissionRate ?? 10),
        defaultDiscountType: settings.defaultDiscountType || "PERCENT",
        defaultDiscountValue: (settings.defaultDiscountType === "FIXED"
          ? Math.round((settings.defaultDiscountValue ?? 0) / 100 * 100) / 100
          : settings.defaultDiscountValue ?? settings.customerDiscountPercent ?? 0),
        minimumPayout: settings.minimumPayout,
        cookieDuration: settings.cookieDuration,
        agreementText: settings.agreementText,
        programActive: settings.programActive,
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<AffiliateSettings>) => {
      const res = await fetch("/api/admin/affiliate-settings", {
        credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliate-settings"] });
      toast({ title: "Settings saved" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  const handleLogout = async () => {
    await fetch("/api/admin/logout", {
        credentials: "include", method: "POST" });
    setLocation("/admin/login");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      defaultCommissionValue: formData.defaultCommissionType === "FIXED"
        ? Math.round((formData.defaultCommissionValue || 0) * 100)
        : (formData.defaultCommissionValue || 0),
      defaultDiscountValue: formData.defaultDiscountType === "FIXED"
        ? Math.round((formData.defaultDiscountValue || 0) * 100)
        : (formData.defaultDiscountValue || 0),
    };
    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access affiliate settings. This area is restricted to administrators only.</p>
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
            <img src={defaultAdminIcon} alt="Admin" className="h-8 w-auto object-contain" />
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
              <Link href="/admin/affiliates">
                <Button variant="secondary" size="sm" className="gap-2" data-testid="link-affiliates">
                  <Link2 className="w-4 h-4" />
                  Affiliates
                </Button>
              </Link>
              <Link href="/admin/team">
                <Button variant="ghost" size="sm" className="gap-2" data-testid="link-team">
                  <UserPlus className="w-4 h-4" />
                  Team
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
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2" data-testid="button-logout">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/affiliates">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Back to Affiliates
            </Button>
          </Link>
          <h2 className="font-display text-2xl font-bold">Affiliate Program Settings</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Program Active</Label>
                  <p className="text-sm text-muted-foreground">Enable or disable the affiliate program</p>
                </div>
                <Switch
                  checked={formData.programActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, programActive: checked })}
                  data-testid="switch-program-active"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Program Configuration</CardTitle>
              <CardDescription>Configure commission rates and payout settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Default Commission (paid to affiliates)</h4>
                  <div className="space-y-2">
                    <Label htmlFor="defaultCommissionValue">Commission Amount</Label>
                    <AmountTypeInput
                      value={formData.defaultCommissionValue ?? 0}
                      onChange={(v) => setFormData({ ...formData, defaultCommissionValue: v })}
                      type={formData.defaultCommissionType === "FIXED" ? "fixed" : "percent"}
                      onTypeChange={(t) => setFormData({ ...formData, defaultCommissionType: t === "fixed" ? "FIXED" : "PERCENT", defaultCommissionValue: 0 })}
                      data-testid="input-commission-value"
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.defaultCommissionType === "FIXED"
                        ? "Flat commission per eligible product in dollars"
                        : "Percentage of the net sale amount per eligible product"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Default Customer Discount (applied at checkout)</h4>
                  <div className="space-y-2">
                    <Label htmlFor="defaultDiscountValue">Discount Amount</Label>
                    <AmountTypeInput
                      value={formData.defaultDiscountValue ?? 0}
                      onChange={(v) => setFormData({ ...formData, defaultDiscountValue: v })}
                      type={formData.defaultDiscountType === "FIXED" ? "fixed" : "percent"}
                      onTypeChange={(t) => setFormData({ ...formData, defaultDiscountType: t === "fixed" ? "FIXED" : "PERCENT", defaultDiscountValue: 0 })}
                      data-testid="input-discount-value"
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.defaultDiscountType === "FIXED"
                        ? "Flat discount per eligible product in dollars. Set to 0 to disable."
                        : "Percentage off per eligible product. Set to 0 to disable."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minimumPayout">Minimum Payout ($)</Label>
                    <Input
                      id="minimumPayout"
                      type="number"
                      min="0"
                      step="0.01"
                      value={(formData.minimumPayout || 0) / 100}
                      onChange={(e) => setFormData({ ...formData, minimumPayout: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                      data-testid="input-minimum-payout"
                    />
                    <p className="text-xs text-muted-foreground">Minimum balance required for payout</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cookieDuration">Cookie Duration (days)</Label>
                    <Input
                      id="cookieDuration"
                      type="number"
                      min="1"
                      max="365"
                      value={formData.cookieDuration}
                      onChange={(e) => setFormData({ ...formData, cookieDuration: parseInt(e.target.value) || 30 })}
                      data-testid="input-cookie-duration"
                    />
                    <p className="text-xs text-muted-foreground">How long referral tracking lasts</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Affiliate Agreement</CardTitle>
              <CardDescription>
                This agreement will be presented to customers when they sign up as affiliates. 
                They must e-sign this agreement before becoming an affiliate.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="agreementText">Agreement Text</Label>
                <Textarea
                  id="agreementText"
                  value={formData.agreementText}
                  onChange={(e) => setFormData({ ...formData, agreementText: e.target.value })}
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="Enter the affiliate agreement text..."
                  data-testid="textarea-agreement"
                />
                <p className="text-xs text-muted-foreground">
                  This is a legal document. Make sure it complies with applicable laws and regulations.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" data-testid="button-save">
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
