import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { Building2, Save, Mail } from "lucide-react";
import AdminNav from "@/components/admin/AdminNav";

interface SiteSettings {
  id: string;
  orderNotificationEmail?: string;
  companyName?: string;
  companyTagline?: string;
  companyAddress?: string;
  companyPhone?: string;
  supportEmail?: string;
}

export default function AdminSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [formData, setFormData] = useState<Partial<SiteSettings>>({});

  const { data: settings, isLoading } = useQuery<SiteSettings>({
    queryKey: ["/api/admin/settings"],
    enabled: hasFullAccess,
    queryFn: async () => {
      const res = await fetch("/api/admin/settings");
      if (res.status === 401) {
        setLocation("/admin");
        return null;
      }
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<SiteSettings>) => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Settings saved" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-gray-950">
        <AdminNav role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h2>
              <p className="text-gray-400">You don't have permission to access settings. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="settings" role={role} />

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Company Profile</h2>
          <p className="text-muted-foreground mt-2">
            Configure your company information and notification preferences.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading settings...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Company Information
                </CardTitle>
                <CardDescription>
                  Basic information about your business displayed to customers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName || ""}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Power Plunge"
                    data-testid="input-company-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyTagline">Company Tagline</Label>
                  <Input
                    id="companyTagline"
                    value={formData.companyTagline || ""}
                    onChange={(e) => setFormData({ ...formData, companyTagline: e.target.value })}
                    placeholder="Mind + Body + Spirit"
                    data-testid="input-company-tagline"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Business Address</Label>
                  <Input
                    id="companyAddress"
                    value={formData.companyAddress || ""}
                    onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                    placeholder="123 Main St, City, State 12345"
                    data-testid="input-company-address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Business Phone</Label>
                  <Input
                    id="companyPhone"
                    value={formData.companyPhone || ""}
                    onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                    placeholder="(555) 123-4567"
                    data-testid="input-company-phone"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email Notifications
                </CardTitle>
                <CardDescription>
                  Configure where notifications are sent and your support email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orderNotificationEmail">Order Notification Email</Label>
                  <Input
                    id="orderNotificationEmail"
                    type="email"
                    value={formData.orderNotificationEmail || ""}
                    onChange={(e) => setFormData({ ...formData, orderNotificationEmail: e.target.value })}
                    placeholder="orders@powerplunge.com"
                    data-testid="input-notification-email"
                  />
                  <p className="text-sm text-muted-foreground">
                    New order notifications will be sent to this email address.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Customer Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={formData.supportEmail || ""}
                    onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                    placeholder="support@powerplunge.com"
                    data-testid="input-support-email"
                  />
                  <p className="text-sm text-muted-foreground">
                    Displayed to customers as your support contact.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full gap-2" disabled={updateMutation.isPending} data-testid="button-save-settings">
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
