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
import { Package, LogOut, Settings, ShoppingBag, Users, UserPlus, Link2, ArrowLeft, Save, Home, ChevronDown, Building2, Key, FileText, ChevronUp } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  ffEnabled: boolean;
  ffDiscountType: string;
  ffDiscountValue: number;
  ffCommissionType: string;
  ffCommissionValue: number;
  ffMaxUses: number;
  inviteDefaultMaxUses: number;
  inviteDefaultExpirationDays: number;
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
    ffEnabled: false,
    ffDiscountType: "PERCENT",
    ffDiscountValue: 20,
    ffCommissionType: "PERCENT",
    ffCommissionValue: 0,
    ffMaxUses: 0,
    inviteDefaultMaxUses: 1,
    inviteDefaultExpirationDays: 0,
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
        ffEnabled: settings.ffEnabled ?? false,
        ffDiscountType: settings.ffDiscountType || "PERCENT",
        ffDiscountValue: (settings.ffDiscountType === "FIXED"
          ? Math.round((settings.ffDiscountValue ?? 0) / 100 * 100) / 100
          : settings.ffDiscountValue ?? 20),
        ffCommissionType: settings.ffCommissionType || "PERCENT",
        ffCommissionValue: (settings.ffCommissionType === "FIXED"
          ? Math.round((settings.ffCommissionValue ?? 0) / 100 * 100) / 100
          : settings.ffCommissionValue ?? 0),
        ffMaxUses: settings.ffMaxUses ?? 0,
        inviteDefaultMaxUses: settings.inviteDefaultMaxUses ?? 1,
        inviteDefaultExpirationDays: settings.inviteDefaultExpirationDays ?? 0,
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
      ffDiscountValue: formData.ffDiscountType === "FIXED"
        ? Math.round((formData.ffDiscountValue || 0) * 100)
        : (formData.ffDiscountValue || 0),
      ffCommissionValue: formData.ffCommissionType === "FIXED"
        ? Math.round((formData.ffCommissionValue || 0) * 100)
        : (formData.ffCommissionValue || 0),
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
          <Collapsible defaultOpen className="border rounded-lg bg-card text-card-foreground shadow-sm">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors group">
                <div>
                  <h3 className="text-lg font-semibold leading-none tracking-tight">Program Status</h3>
                  <p className="text-sm text-muted-foreground mt-1">Enable or disable the affiliate program</p>
                </div>
                <div className="flex items-center gap-4">
                  <Switch
                    checked={formData.programActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, programActive: checked })}
                    onClick={(e) => e.stopPropagation()}
                    data-testid="switch-program-active"
                  />
                  <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-6 pb-6 pt-0 border-t">
              <div className="pt-6">
                <p className="text-sm text-muted-foreground">
                  When disabled, referral tracking and affiliate dashboard access will be restricted. 
                  Existing commissions and payouts will remain visible in the admin.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible defaultOpen className="border rounded-lg bg-card text-card-foreground shadow-sm">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors group">
                <div>
                  <h3 className="text-lg font-semibold leading-none tracking-tight">Program Configuration</h3>
                  <p className="text-sm text-muted-foreground mt-1">Configure commission rates and payout settings</p>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-6 pb-6 pt-0 border-t">
              <div className="space-y-6 pt-6">
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

                <div className="pt-4 border-t">
                  <h4 className="font-medium text-sm mb-4">Invite Link Defaults</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="inviteDefaultMaxUses">Default Max Uses Per Link</Label>
                      <Input
                        id="inviteDefaultMaxUses"
                        type="number"
                        min="1"
                        value={formData.inviteDefaultMaxUses}
                        onChange={(e) => setFormData({ ...formData, inviteDefaultMaxUses: parseInt(e.target.value) || 1 })}
                        data-testid="input-invite-default-max-uses"
                      />
                      <p className="text-xs text-muted-foreground">How many times a new invite link can be used before it expires</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="inviteDefaultExpirationDays">Default Expiration (days)</Label>
                      <Input
                        id="inviteDefaultExpirationDays"
                        type="number"
                        min="0"
                        value={formData.inviteDefaultExpirationDays}
                        onChange={(e) => setFormData({ ...formData, inviteDefaultExpirationDays: parseInt(e.target.value) || 0 })}
                        data-testid="input-invite-default-expiration-days"
                      />
                      <p className="text-xs text-muted-foreground">How many days until new invite links expire (0 = never expires)</p>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible defaultOpen className="border rounded-lg bg-card text-card-foreground shadow-sm">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors group">
                <div>
                  <h3 className="text-lg font-semibold leading-none tracking-tight">Friends & Family Code</h3>
                  <p className="text-sm text-muted-foreground mt-1">A second discount code for affiliates to share with friends and family</p>
                </div>
                <div className="flex items-center gap-4">
                  <Switch
                    checked={formData.ffEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, ffEnabled: checked })}
                    onClick={(e) => e.stopPropagation()}
                    data-testid="switch-ff-enabled"
                  />
                  <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-6 pb-6 pt-0 border-t">
              <div className="space-y-6 pt-6">
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-sm text-muted-foreground">
                    When enabled, each affiliate gets a second code with the prefix <code className="bg-background px-1 py-0.5 rounded font-mono">FF</code>. For example, if an affiliate's code is <code className="bg-background px-1 py-0.5 rounded font-mono">TOMMY</code>, their Friends & Family code will be <code className="bg-background px-1 py-0.5 rounded font-mono">FFTOMMY</code>.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm">F&F Customer Discount (applied at checkout)</h4>
                  <div className="space-y-2">
                    <Label>Discount Amount</Label>
                    <AmountTypeInput
                      value={formData.ffDiscountValue ?? 20}
                      onChange={(v) => setFormData({ ...formData, ffDiscountValue: v })}
                      type={formData.ffDiscountType === "FIXED" ? "fixed" : "percent"}
                      onTypeChange={(t) => setFormData({ ...formData, ffDiscountType: t === "fixed" ? "FIXED" : "PERCENT", ffDiscountValue: 0 })}
                      data-testid="input-ff-discount-value"
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.ffDiscountType === "FIXED"
                        ? "Flat discount in dollars for F&F code orders"
                        : "Percentage off for F&F code orders"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm">F&F Commission (paid to affiliates)</h4>
                  <div className="space-y-2">
                    <Label>Commission Amount</Label>
                    <AmountTypeInput
                      value={formData.ffCommissionValue ?? 0}
                      onChange={(v) => setFormData({ ...formData, ffCommissionValue: v })}
                      type={formData.ffCommissionType === "FIXED" ? "fixed" : "percent"}
                      onTypeChange={(t) => setFormData({ ...formData, ffCommissionType: t === "fixed" ? "FIXED" : "PERCENT", ffCommissionValue: 0 })}
                      data-testid="input-ff-commission-value"
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.ffCommissionType === "FIXED"
                        ? "Flat commission per eligible product in dollars for F&F orders"
                        : "Percentage commission for F&F orders (typically 0%)"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm">F&F Usage Limit (per affiliate)</h4>
                  <div className="space-y-2">
                    <Label htmlFor="ffMaxUses">Maximum Uses</Label>
                    <Input
                      id="ffMaxUses"
                      type="number"
                      min="0"
                      value={formData.ffMaxUses ?? 0}
                      onChange={(e) => setFormData({ ...formData, ffMaxUses: parseInt(e.target.value) || 0 })}
                      data-testid="input-ff-max-uses"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum number of times each affiliate's F&F code can be used. Set to 0 for unlimited.
                    </p>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible defaultOpen className="border rounded-lg bg-card text-card-foreground shadow-sm">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors group">
                <div>
                  <h3 className="text-lg font-semibold leading-none tracking-tight">Affiliate Agreement</h3>
                  <p className="text-sm text-muted-foreground mt-1">This agreement will be presented to customers when they sign up as affiliates.</p>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-6 pb-6 pt-0 border-t">
              <div className="space-y-2 pt-6">
                <Label htmlFor="agreementText">Agreement Text</Label>
                <Textarea
                  id="agreementText"
                  value={formData.agreementText}
                  onChange={(e) => setFormData({ ...formData, agreementText: e.target.value })}
                  className="min-h-[400px] text-sm"
                  placeholder="Enter the affiliate agreement text..."
                  data-testid="textarea-agreement"
                />
                <p className="text-xs text-muted-foreground">
                  This is a legal document. Make sure it complies with applicable laws and regulations.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

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
