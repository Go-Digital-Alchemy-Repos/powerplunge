import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { MobileTabsList } from "@/components/ui/mobile-tabs-list";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { Building2, Save, Mail, ImageIcon, Upload, Trash2, Scale, Shield } from "lucide-react";
import AdminNav from "@/components/admin/AdminNav";
import RichTextEditor from "@/components/admin/RichTextEditor";
import GdprSettingsTab from "@/components/admin/GdprSettingsTab";

interface SiteSettings {
  id: string;
  orderNotificationEmail?: string;
  companyName?: string;
  companyTagline?: string;
  companyAddress?: string;
  companyPhone?: string;
  supportEmail?: string;
  gaMeasurementId?: string;
  logoUrl?: string;
  adminIconUrl?: string;
  faviconUrl?: string;
  privacyPolicy?: string;
  termsAndConditions?: string;
}

export default function AdminSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [activeTab, setActiveTab] = useState("company");
  const [formData, setFormData] = useState<Partial<SiteSettings>>({});
  const [logoUploading, setLogoUploading] = useState(false);
  const [adminIconUploading, setAdminIconUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const adminIconInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const { data: settings, isLoading } = useQuery<SiteSettings>({
    queryKey: ["/api/admin/settings"],
    enabled: hasFullAccess,
    queryFn: async () => {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
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
      setFormData(settings);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<SiteSettings>) => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Settings saved" });
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file (PNG, JPG, SVG, or WebP).", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 5MB.", variant: "destructive" });
      return;
    }

    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "branding");
      let uploadRes = await fetch("/api/r2/upload", { method: "POST", body: fd, credentials: "include" });
      const contentType = uploadRes.headers.get("content-type") || "";
      if (!uploadRes.ok || !contentType.includes("application/json")) {
        uploadRes = await fetch("/api/uploads/upload", { method: "POST", body: fd, credentials: "include" });
      }
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { objectPath } = await uploadRes.json();

      const saveRes = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: objectPath }),
        credentials: "include",
      });
      if (!saveRes.ok) throw new Error("Failed to save logo");
      const updated = await saveRes.json();
      setFormData((prev) => ({ ...prev, logoUrl: updated.logoUrl }));
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
      toast({ title: "Logo uploaded", description: "Your website logo has been updated." });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload logo. Please try again.", variant: "destructive" });
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: null }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove logo");
      setFormData((prev) => ({ ...prev, logoUrl: undefined }));
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
      toast({ title: "Logo removed", description: "The default logo will be used." });
    } catch {
      toast({ title: "Error", description: "Could not remove logo.", variant: "destructive" });
    }
  };

  const handleAdminIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file (PNG, JPG, SVG, or WebP).", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Icon must be under 5MB.", variant: "destructive" });
      return;
    }

    setAdminIconUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "branding");
      let uploadRes = await fetch("/api/r2/upload", { method: "POST", body: fd, credentials: "include" });
      const contentType = uploadRes.headers.get("content-type") || "";
      if (!uploadRes.ok || !contentType.includes("application/json")) {
        uploadRes = await fetch("/api/uploads/upload", { method: "POST", body: fd, credentials: "include" });
      }
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { objectPath } = await uploadRes.json();

      const saveRes = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminIconUrl: objectPath }),
        credentials: "include",
      });
      if (!saveRes.ok) throw new Error("Failed to save admin icon");
      const updated = await saveRes.json();
      setFormData((prev) => ({ ...prev, adminIconUrl: updated.adminIconUrl }));
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
      toast({ title: "Admin icon uploaded", description: "Your admin navigation icon has been updated." });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload icon. Please try again.", variant: "destructive" });
    } finally {
      setAdminIconUploading(false);
      if (adminIconInputRef.current) adminIconInputRef.current.value = "";
    }
  };

  const handleRemoveAdminIcon = async () => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminIconUrl: null }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove admin icon");
      setFormData((prev) => ({ ...prev, adminIconUrl: undefined }));
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
      toast({ title: "Admin icon removed", description: "The default icon will be used." });
    } catch {
      toast({ title: "Error", description: "Could not remove admin icon.", variant: "destructive" });
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file (PNG, JPG, SVG, or WebP).", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Favicon must be under 5MB.", variant: "destructive" });
      return;
    }

    setFaviconUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "branding");
      let uploadRes = await fetch("/api/r2/upload", { method: "POST", body: fd, credentials: "include" });
      const contentType = uploadRes.headers.get("content-type") || "";
      if (!uploadRes.ok || !contentType.includes("application/json")) {
        uploadRes = await fetch("/api/uploads/upload", { method: "POST", body: fd, credentials: "include" });
      }
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { objectPath } = await uploadRes.json();

      const saveRes = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faviconUrl: objectPath }),
        credentials: "include",
      });
      if (!saveRes.ok) throw new Error("Failed to save favicon");
      const updated = await saveRes.json();
      setFormData((prev) => ({ ...prev, faviconUrl: updated.faviconUrl }));
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
      toast({ title: "Favicon uploaded", description: "Your website favicon has been updated." });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload favicon. Please try again.", variant: "destructive" });
    } finally {
      setFaviconUploading(false);
      if (faviconInputRef.current) faviconInputRef.current.value = "";
    }
  };

  const handleRemoveFavicon = async () => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faviconUrl: null }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove favicon");
      setFormData((prev) => ({ ...prev, faviconUrl: undefined }));
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
      toast({ title: "Favicon removed", description: "The default favicon will be used." });
    } catch {
      toast({ title: "Error", description: "Could not remove favicon.", variant: "destructive" });
    }
  };

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Site Settings</h2>
            <p className="text-muted-foreground mt-2">Configure your website, branding, notifications, and integrations.</p>
          </div>
          <Button type="submit" form="settings-form" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 flex-shrink-0" disabled={updateMutation.isPending} data-testid="button-save-settings">
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading settings...</div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" data-testid="settings-tabs">
            <MobileTabsList
              tabs={[
                { value: "company", label: "Company", icon: <Building2 className="w-4 h-4" />, "data-testid": "tab-company" },
                { value: "branding", label: "Branding", icon: <ImageIcon className="w-4 h-4" />, "data-testid": "tab-branding" },
                { value: "email", label: "Email", icon: <Mail className="w-4 h-4" />, "data-testid": "tab-email" },
                { value: "legal", label: "Legal", icon: <Scale className="w-4 h-4" />, "data-testid": "tab-legal" },
                { value: "gdpr", label: "GDPR", icon: <Shield className="w-4 h-4" />, "data-testid": "tab-gdpr" },
              ]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            <form id="settings-form" onSubmit={handleSubmit}>
              <TabsContent value="company" className="space-y-6">
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

              </TabsContent>

              <TabsContent value="branding" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5" />
                      Branding
                    </CardTitle>
                    <CardDescription>
                      Upload your website logo. It will appear in the navigation bar and footer.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Website Logo</Label>
                      <div className="flex items-center gap-4">
                        <div className="w-32 h-16 rounded-lg border border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30" data-testid="logo-preview">
                          {formData.logoUrl ? (
                            <img
                              src={formData.logoUrl}
                              alt="Current logo"
                              className="max-w-full max-h-full object-contain"
                              data-testid="img-current-logo"
                            />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                            className="hidden"
                            onChange={handleLogoUpload}
                            data-testid="input-logo-file"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => logoInputRef.current?.click()}
                            disabled={logoUploading}
                            data-testid="button-upload-logo"
                          >
                            <Upload className="w-4 h-4" />
                            {logoUploading ? "Uploading..." : "Upload Logo"}
                          </Button>
                          {formData.logoUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="gap-2 text-destructive hover:text-destructive"
                              onClick={handleRemoveLogo}
                              data-testid="button-remove-logo"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Recommended: PNG or SVG with transparent background. Max 5MB.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5" />
                      Admin Icon Settings
                    </CardTitle>
                    <CardDescription>
                      Upload an icon to display in the admin navigation bar. Replaces the default text header.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Admin Navigation Icon</Label>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg border border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30" data-testid="admin-icon-preview">
                          {formData.adminIconUrl ? (
                            <img
                              src={formData.adminIconUrl}
                              alt="Current admin icon"
                              className="max-w-full max-h-full object-contain"
                              data-testid="img-current-admin-icon"
                            />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <input
                            ref={adminIconInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                            className="hidden"
                            onChange={handleAdminIconUpload}
                            data-testid="input-admin-icon-file"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => adminIconInputRef.current?.click()}
                            disabled={adminIconUploading}
                            data-testid="button-upload-admin-icon"
                          >
                            <Upload className="w-4 h-4" />
                            {adminIconUploading ? "Uploading..." : "Upload Icon"}
                          </Button>
                          {formData.adminIconUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="gap-2 text-destructive hover:text-destructive"
                              onClick={handleRemoveAdminIcon}
                              data-testid="button-remove-admin-icon"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Recommended: Square PNG or SVG, 32-64px. Appears in the admin header navigation.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5" />
                      Favicon Settings
                    </CardTitle>
                    <CardDescription>
                      Upload a favicon for your website. It appears in browser tabs and bookmarks.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Favicon</Label>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg border border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30" data-testid="favicon-preview">
                          {formData.faviconUrl ? (
                            <img
                              src={formData.faviconUrl}
                              alt="Current favicon"
                              className="max-w-full max-h-full object-contain"
                              data-testid="img-current-favicon"
                            />
                          ) : (
                            <img
                              src="/favicon.png"
                              alt="Default favicon"
                              className="max-w-full max-h-full object-contain"
                            />
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <input
                            ref={faviconInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon"
                            className="hidden"
                            onChange={handleFaviconUpload}
                            data-testid="input-favicon-file"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => faviconInputRef.current?.click()}
                            disabled={faviconUploading}
                            data-testid="button-upload-favicon"
                          >
                            <Upload className="w-4 h-4" />
                            {faviconUploading ? "Uploading..." : "Upload Favicon"}
                          </Button>
                          {formData.faviconUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="gap-2 text-destructive hover:text-destructive"
                              onClick={handleRemoveFavicon}
                              data-testid="button-remove-favicon"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Recommended: Square PNG or ICO, 32x32 or 64x64 pixels. Appears in browser tabs.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="email" className="space-y-6">
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

              </TabsContent>


              <TabsContent value="legal" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scale className="w-5 h-5" />
                      Privacy Policy
                    </CardTitle>
                    <CardDescription>
                      Your website's privacy policy displayed at /privacy-policy
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RichTextEditor
                      value={formData.privacyPolicy || ""}
                      onChange={(html) => setFormData({ ...formData, privacyPolicy: html })}
                      placeholder="Enter your privacy policy content..."
                      data-testid="editor-privacy-policy"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scale className="w-5 h-5" />
                      Terms & Conditions
                    </CardTitle>
                    <CardDescription>
                      Your website's terms and conditions displayed at /terms-and-conditions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RichTextEditor
                      value={formData.termsAndConditions || ""}
                      onChange={(html) => setFormData({ ...formData, termsAndConditions: html })}
                      placeholder="Enter your terms and conditions content..."
                      data-testid="editor-terms-conditions"
                    />
                  </CardContent>
                </Card>

              </TabsContent>
            </form>

            <TabsContent value="gdpr">
              <GdprSettingsTab />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
