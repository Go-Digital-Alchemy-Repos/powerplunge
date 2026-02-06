import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, ExternalLink, Key, CreditCard, Loader2, TestTube, AlertCircle, Save, HardDrive, Mail, Brain, Link2, Copy, ShoppingBag, Instagram } from "lucide-react";
import AdminNav from "@/components/admin/AdminNav";

interface IntegrationStatus {
  stripe: boolean;
  stripeMode?: string;
  stripeWebhook: boolean;
  mailgun: boolean;
  cloudflareR2?: boolean;
  openai?: boolean;
  tiktokShop?: boolean;
  instagramShop?: boolean;
}

interface TikTokShopSettings {
  configured: boolean;
  shopId?: string;
  appKey?: string;
  hasAppSecret?: boolean;
  hasAccessToken?: boolean;
  hasRefreshToken?: boolean;
  updatedAt?: string;
}

interface InstagramShopSettings {
  configured: boolean;
  businessAccountId?: string;
  catalogId?: string;
  hasAccessToken?: boolean;
  updatedAt?: string;
}

interface EmailSettings {
  provider: string;
  mailgunDomain?: string;
  mailgunFromEmail?: string;
  mailgunFromName?: string;
  mailgunReplyTo?: string;
  mailgunRegion?: string;
  hasApiKey?: boolean;
  updatedAt?: string;
}

interface StripeSettings {
  configured: boolean;
  mode?: string;
  hasWebhookSecret?: boolean;
  publishableKeyMasked?: string;
  accountName?: string;
  updatedAt?: string;
  source?: string;
}

interface R2Settings {
  configured: boolean;
  bucketName?: string;
  publicUrl?: string;
  updatedAt?: string;
}

export default function AdminIntegrations() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [showMailgunDialog, setShowMailgunDialog] = useState(false);
  const [showStripeDialog, setShowStripeDialog] = useState(false);
  const [showR2Dialog, setShowR2Dialog] = useState(false);
  const [showOpenAIDialog, setShowOpenAIDialog] = useState(false);
  const [showTikTokDialog, setShowTikTokDialog] = useState(false);
  const [showInstagramDialog, setShowInstagramDialog] = useState(false);

  const { data: integrations, refetch: refetchIntegrations } = useQuery<IntegrationStatus>({
    queryKey: ["/api/admin/integrations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/integrations");
      if (res.status === 401) {
        setLocation("/admin");
        return null;
      }
      if (!res.ok) throw new Error("Failed to fetch integrations");
      return res.json();
    },
  });

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access integrations. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="integrations" role={role} />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Integrations</h2>
          <p className="text-muted-foreground mt-2">
            Configure third-party services for payments, email, and storage.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Stripe Payments
              </CardTitle>
              <CardDescription>
                Accept credit card payments securely with Stripe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge configured={integrations?.stripe} />
                  {integrations?.stripe && (
                    <span className="text-sm text-muted-foreground">
                      {integrations.stripeMode === "live" ? "Live mode" : "Test mode"}
                    </span>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowStripeDialog(true)}
                  data-testid="button-configure-stripe"
                >
                  Configure
                </Button>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Get your API keys from Stripe Dashboard <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Mailgun Email
              </CardTitle>
              <CardDescription>
                Send transactional emails for order confirmations and shipping updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <StatusBadge configured={integrations?.mailgun} />
                <Button 
                  variant="outline" 
                  onClick={() => setShowMailgunDialog(true)}
                  data-testid="button-configure-mailgun"
                >
                  Configure
                </Button>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                <a href="https://app.mailgun.com/app/account/security/api_keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Get your API keys from Mailgun <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-primary" />
                Cloudflare R2 Storage
              </CardTitle>
              <CardDescription>
                Store product images, app assets, and user avatars in the cloud
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <StatusBadge configured={integrations?.cloudflareR2} />
                <Button 
                  variant="outline" 
                  onClick={() => setShowR2Dialog(true)}
                  data-testid="button-configure-r2"
                >
                  Configure
                </Button>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                <a href="https://dash.cloudflare.com/?to=/:account/r2/overview" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Get your credentials from Cloudflare Dashboard <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                OpenAI (AI Features)
              </CardTitle>
              <CardDescription>
                Enable AI-powered SEO recommendations for the Media Library
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <StatusBadge configured={integrations?.openai} />
                <Button 
                  variant="outline" 
                  onClick={() => setShowOpenAIDialog(true)}
                  data-testid="button-configure-openai"
                >
                  Configure
                </Button>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Get your API key from OpenAI Platform <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                TikTok Shop
              </CardTitle>
              <CardDescription>
                Sync products and manage orders from your TikTok Shop
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <StatusBadge configured={integrations?.tiktokShop} />
                <Button 
                  variant="outline" 
                  onClick={() => setShowTikTokDialog(true)}
                  data-testid="button-configure-tiktok"
                >
                  Configure
                </Button>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                <a href="https://partner.tiktokshop.com/account/login" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Get your credentials from TikTok Shop Seller Center <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Instagram className="w-5 h-5 text-primary" />
                Instagram Shop
              </CardTitle>
              <CardDescription>
                Connect your Instagram Business account to manage your shop catalog
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <StatusBadge configured={integrations?.instagramShop} />
                <Button 
                  variant="outline" 
                  onClick={() => setShowInstagramDialog(true)}
                  data-testid="button-configure-instagram"
                >
                  Configure
                </Button>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Get your credentials from Meta for Developers <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <MailgunConfigDialog 
        open={showMailgunDialog} 
        onOpenChange={setShowMailgunDialog}
        onSuccess={() => refetchIntegrations()}
      />
      
      <StripeConfigDialog 
        open={showStripeDialog} 
        onOpenChange={setShowStripeDialog}
        onSuccess={() => refetchIntegrations()}
      />

      <R2ConfigDialog
        open={showR2Dialog}
        onOpenChange={setShowR2Dialog}
        onSuccess={() => refetchIntegrations()}
      />

      <OpenAIConfigDialog
        open={showOpenAIDialog}
        onOpenChange={setShowOpenAIDialog}
        onSuccess={() => refetchIntegrations()}
      />

      <TikTokShopConfigDialog
        open={showTikTokDialog}
        onOpenChange={setShowTikTokDialog}
        onSuccess={() => refetchIntegrations()}
      />

      <InstagramShopConfigDialog
        open={showInstagramDialog}
        onOpenChange={setShowInstagramDialog}
        onSuccess={() => refetchIntegrations()}
      />
    </div>
  );
}

function StatusBadge({ configured }: { configured?: boolean }) {
  if (configured === undefined) {
    return (
      <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
        Checking...
      </span>
    );
  }
  
  return configured ? (
    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-500/20 text-green-500">
      <CheckCircle2 className="w-3 h-3" />
      Configured
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-500">
      <XCircle className="w-3 h-3" />
      Not Configured
    </span>
  );
}

function MailgunConfigDialog({ open, onOpenChange, onSuccess }: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    provider: "mailgun",
    mailgunApiKey: "",
    mailgunDomain: "",
    mailgunFromEmail: "",
    mailgunFromName: "",
    mailgunReplyTo: "",
    mailgunRegion: "us",
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const { data: emailSettings, isLoading } = useQuery<EmailSettings>({
    queryKey: ["/api/admin/settings/email"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/email");
      if (!res.ok) throw new Error("Failed to fetch email settings");
      return res.json();
    },
  });

  // Populate form with existing settings when loaded
  useEffect(() => {
    if (emailSettings) {
      setFormData({
        provider: "mailgun",
        mailgunApiKey: "", // Never show the actual API key
        mailgunDomain: emailSettings.mailgunDomain || "",
        mailgunFromEmail: emailSettings.mailgunFromEmail || "",
        mailgunFromName: emailSettings.mailgunFromName || "",
        mailgunReplyTo: emailSettings.mailgunReplyTo || "",
        mailgunRegion: emailSettings.mailgunRegion || "us",
      });
    }
  }, [emailSettings]);

  const handleSave = async () => {
    if (!formData.mailgunDomain || !formData.mailgunFromEmail) {
      toast({ title: "Domain and From Email are required", variant: "destructive" });
      return;
    }
    if (!emailSettings?.hasApiKey && !formData.mailgunApiKey) {
      toast({ title: "API Key is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save settings");
      }

      toast({ title: "Email settings saved" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast({ title: "Enter an email address", variant: "destructive" });
      return;
    }

    setTesting(true);
    try {
      const res = await fetch("/api/admin/settings/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });

      const result = await res.json();
      if (result.success) {
        toast({ title: "Test email sent successfully!" });
      } else {
        toast({ title: result.message || "Failed to send test email", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Mailgun Configuration
          </DialogTitle>
          <DialogDescription>
            Configure Mailgun to send transactional emails like order confirmations and shipping updates.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mailgunApiKey">API Key</Label>
              <Input
                id="mailgunApiKey"
                type="password"
                value={formData.mailgunApiKey}
                onChange={(e) => setFormData({ ...formData, mailgunApiKey: e.target.value })}
                placeholder={emailSettings?.hasApiKey ? "••••••••••••••••" : "Enter your Mailgun API key"}
                data-testid="input-mailgun-api-key"
              />
              {emailSettings?.hasApiKey && (
                <p className="text-xs text-muted-foreground">Leave blank to keep the existing key</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mailgunDomain">Domain</Label>
              <Input
                id="mailgunDomain"
                value={formData.mailgunDomain}
                onChange={(e) => setFormData({ ...formData, mailgunDomain: e.target.value })}
                placeholder="mail.yourdomain.com"
                data-testid="input-mailgun-domain"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mailgunFromEmail">From Email</Label>
                <Input
                  id="mailgunFromEmail"
                  type="email"
                  value={formData.mailgunFromEmail}
                  onChange={(e) => setFormData({ ...formData, mailgunFromEmail: e.target.value })}
                  placeholder="orders@yourdomain.com"
                  data-testid="input-mailgun-from-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mailgunFromName">From Name</Label>
                <Input
                  id="mailgunFromName"
                  value={formData.mailgunFromName}
                  onChange={(e) => setFormData({ ...formData, mailgunFromName: e.target.value })}
                  placeholder="Power Plunge"
                  data-testid="input-mailgun-from-name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mailgunReplyTo">Reply-To Email</Label>
                <Input
                  id="mailgunReplyTo"
                  type="email"
                  value={formData.mailgunReplyTo}
                  onChange={(e) => setFormData({ ...formData, mailgunReplyTo: e.target.value })}
                  placeholder="support@yourdomain.com"
                  data-testid="input-mailgun-reply-to"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mailgunRegion">Region</Label>
                <Select value={formData.mailgunRegion} onValueChange={(v) => setFormData({ ...formData, mailgunRegion: v })}>
                  <SelectTrigger id="mailgunRegion" data-testid="select-mailgun-region">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us">US</SelectItem>
                    <SelectItem value="eu">EU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {emailSettings?.hasApiKey && (
              <div className="pt-4 border-t">
                <Label className="text-sm font-medium">Send Test Email</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                    data-testid="input-test-email"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleTestEmail}
                    disabled={testing}
                    data-testid="button-send-test"
                  >
                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-mailgun">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StripeConfigDialog({ open, onOpenChange, onSuccess }: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    publishableKey: "",
    secretKey: "",
    webhookSecret: "",
  });
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<{ valid?: boolean; error?: string; accountName?: string } | null>(null);

  const { data: stripeSettings, isLoading } = useQuery<StripeSettings>({
    queryKey: ["/api/admin/settings/stripe"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/stripe");
      if (!res.ok) throw new Error("Failed to fetch Stripe settings");
      return res.json();
    },
  });

  const handleValidate = async () => {
    if (!formData.publishableKey || !formData.secretKey) {
      toast({ title: "Both keys are required", variant: "destructive" });
      return;
    }

    setValidating(true);
    try {
      const res = await fetch("/api/admin/settings/stripe/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publishableKey: formData.publishableKey, secretKey: formData.secretKey }),
      });

      const result = await res.json();
      setValidation(result);
      
      if (result.valid) {
        toast({ title: `Keys valid! Account: ${result.accountName}` });
      } else {
        toast({ title: result.error || "Invalid keys", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    if (!formData.publishableKey || !formData.secretKey) {
      toast({ title: "Both keys are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/stripe", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save settings");
      }

      toast({ title: "Stripe settings saved" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const mode = formData.secretKey?.startsWith("sk_live_") ? "live" : "test";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Stripe Configuration
          </DialogTitle>
          <DialogDescription>
            Configure Stripe for payment processing. Your keys are encrypted and stored securely.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            {stripeSettings?.configured && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Stripe is configured ({stripeSettings.mode} mode)
                </div>
                {stripeSettings.publishableKeyMasked && (
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {stripeSettings.publishableKeyMasked}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Source: {stripeSettings.source === "database" ? "Admin Configuration" : "Environment Variables"}
                </p>
              </div>
            )}

            {formData.secretKey && (
              <div className={`p-3 rounded-lg border ${mode === "live" ? "bg-red-500/10 border-red-500/20" : "bg-blue-500/10 border-blue-500/20"}`}>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AlertCircle className={`w-4 h-4 ${mode === "live" ? "text-red-500" : "text-blue-500"}`} />
                  <span className={mode === "live" ? "text-red-500" : "text-blue-500"}>
                    {mode === "live" ? "LIVE MODE - Real charges will be made" : "Test mode - No real charges"}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="stripePublishableKey">Publishable Key</Label>
              <Input
                id="stripePublishableKey"
                value={formData.publishableKey}
                onChange={(e) => {
                  setFormData({ ...formData, publishableKey: e.target.value });
                  setValidation(null);
                }}
                placeholder="pk_test_..."
                data-testid="input-stripe-publishable-key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stripeSecretKey">Secret Key</Label>
              <Input
                id="stripeSecretKey"
                type="password"
                value={formData.secretKey}
                onChange={(e) => {
                  setFormData({ ...formData, secretKey: e.target.value });
                  setValidation(null);
                }}
                placeholder="sk_test_..."
                data-testid="input-stripe-secret-key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stripeWebhookSecret">Webhook Secret (Optional)</Label>
              <Input
                id="stripeWebhookSecret"
                type="password"
                value={formData.webhookSecret}
                onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
                placeholder="whsec_..."
                data-testid="input-stripe-webhook-secret"
              />
              <p className="text-xs text-muted-foreground">
                For webhook signature verification. Get this from your Stripe webhook endpoint settings.
              </p>
            </div>

            <div className="p-3 bg-muted/50 border rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Link2 className="w-4 h-4" />
                Your Webhook Endpoint URL
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-background px-2 py-1.5 rounded border font-mono break-all" data-testid="text-webhook-url">
                  {window.location.origin}/api/webhook/stripe
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/api/webhook/stripe`);
                    toast({ title: "Webhook URL copied to clipboard" });
                  }}
                  data-testid="button-copy-webhook-url"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Add this URL as a webhook endpoint in your Stripe Dashboard → Developers → Webhooks
              </p>
            </div>

            {validation && (
              <div className={`p-3 rounded-lg border ${validation.valid ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                <div className="flex items-center gap-2 text-sm">
                  {validation.valid ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-green-500">Keys valid! Account: {validation.accountName}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-red-500">{validation.error}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={handleValidate}
              disabled={validating || !formData.publishableKey || !formData.secretKey}
              data-testid="button-validate-stripe"
            >
              {validating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Validate Keys
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !formData.publishableKey || !formData.secretKey} data-testid="button-save-stripe">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface R2SettingsResponse {
  configured: boolean;
  accountId?: string | null;
  bucketName?: string | null;
  publicUrl?: string | null;
  hasAccessKey?: boolean;
  hasSecretKey?: boolean;
  updatedAt?: string | null;
}

function R2ConfigDialog({ open, onOpenChange, onSuccess }: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    accountId: "",
    accessKeyId: "",
    secretAccessKey: "",
    bucketName: "",
    publicUrl: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: r2Settings, isLoading } = useQuery<R2SettingsResponse>({
    queryKey: ["/api/admin/settings/r2"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/r2");
      if (!res.ok) return { configured: false };
      return res.json();
    },
  });

  // Populate form with existing settings when loaded
  useEffect(() => {
    if (r2Settings) {
      setFormData({
        accountId: r2Settings.accountId || "",
        accessKeyId: "", // Never show the actual key
        secretAccessKey: "", // Never show the actual key
        bucketName: r2Settings.bucketName || "",
        publicUrl: r2Settings.publicUrl || "",
      });
    }
  }, [r2Settings]);

  const handleSave = async () => {
    if (!formData.accountId || !formData.bucketName) {
      toast({ title: "Account ID and Bucket Name are required", variant: "destructive" });
      return;
    }
    // Require keys for new configuration, but allow keeping existing ones
    if (!r2Settings?.hasAccessKey && !formData.accessKeyId) {
      toast({ title: "Access Key ID is required", variant: "destructive" });
      return;
    }
    if (!r2Settings?.hasSecretKey && !formData.secretAccessKey) {
      toast({ title: "Secret Access Key is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/r2", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save settings");
      }

      toast({ title: "Cloudflare R2 settings saved" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Cloudflare R2 Configuration
          </DialogTitle>
          <DialogDescription>
            Configure Cloudflare R2 for storing product images, assets, and user uploads.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            {r2Settings?.configured && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  R2 Storage is configured
                </div>
                {r2Settings.bucketName && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Bucket: {r2Settings.bucketName}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="r2AccountId">Account ID</Label>
              <Input
                id="r2AccountId"
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                placeholder="Your Cloudflare Account ID"
                data-testid="input-r2-account-id"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="r2AccessKeyId">Access Key ID</Label>
              <Input
                id="r2AccessKeyId"
                value={formData.accessKeyId}
                onChange={(e) => setFormData({ ...formData, accessKeyId: e.target.value })}
                placeholder={r2Settings?.hasAccessKey ? "••••••••••••••••" : "R2 Access Key ID"}
                data-testid="input-r2-access-key-id"
              />
              {r2Settings?.hasAccessKey && (
                <p className="text-xs text-muted-foreground">Leave blank to keep the existing key</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="r2SecretAccessKey">Secret Access Key</Label>
              <Input
                id="r2SecretAccessKey"
                type="password"
                value={formData.secretAccessKey}
                onChange={(e) => setFormData({ ...formData, secretAccessKey: e.target.value })}
                placeholder={r2Settings?.hasSecretKey ? "••••••••••••••••" : "R2 Secret Access Key"}
                data-testid="input-r2-secret-access-key"
              />
              {r2Settings?.hasSecretKey && (
                <p className="text-xs text-muted-foreground">Leave blank to keep the existing key</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="r2BucketName">Bucket Name</Label>
              <Input
                id="r2BucketName"
                value={formData.bucketName}
                onChange={(e) => setFormData({ ...formData, bucketName: e.target.value })}
                placeholder="your-bucket-name"
                data-testid="input-r2-bucket-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="r2PublicUrl">Public URL (Optional)</Label>
              <Input
                id="r2PublicUrl"
                value={formData.publicUrl}
                onChange={(e) => setFormData({ ...formData, publicUrl: e.target.value })}
                placeholder="https://assets.yourdomain.com"
                data-testid="input-r2-public-url"
              />
              <p className="text-xs text-muted-foreground">
                Custom domain for public access to stored files. Leave blank to use default R2 URL.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-r2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface OpenAISettings {
  configured: boolean;
  apiKeyMasked?: string;
  updatedAt?: string;
}

function OpenAIConfigDialog({ open, onOpenChange, onSuccess }: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const { data: openaiSettings, isLoading } = useQuery<OpenAISettings>({
    queryKey: ["/api/admin/settings/openai"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/openai");
      if (!res.ok) throw new Error("Failed to fetch OpenAI settings");
      return res.json();
    },
  });

  const handleSave = async () => {
    if (!apiKey) {
      toast({ title: "API key is required", variant: "destructive" });
      return;
    }

    if (!apiKey.startsWith("sk-")) {
      toast({ title: "Invalid API key format", description: "API key must start with 'sk-'", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/openai", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save settings");
      }
      
      toast({ title: "OpenAI configuration saved" });
      setApiKey("");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/admin/settings/openai", { method: "DELETE" });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to remove configuration");
      }
      
      toast({ title: "OpenAI configuration removed" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            OpenAI Configuration
          </DialogTitle>
          <DialogDescription>
            Configure OpenAI for AI-powered SEO recommendations in the Media Library.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            {openaiSettings?.configured && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  OpenAI is configured
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  AI-powered SEO recommendations are enabled
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="openaiApiKey">API Key</Label>
              <Input
                id="openaiApiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={openaiSettings?.configured ? "Enter new key to update" : "sk-..."}
                data-testid="input-openai-api-key"
              />
              <p className="text-xs text-muted-foreground">
                Your API key is encrypted and stored securely
              </p>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <h4 className="font-medium mb-1">Used for:</h4>
              <ul className="text-muted-foreground text-xs space-y-1">
                <li>• Auto-generating alt text for images</li>
                <li>• SEO-optimized titles and descriptions</li>
                <li>• Smart tag suggestions for media assets</li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {openaiSettings?.configured && (
            <Button variant="destructive" onClick={handleRemove} disabled={removing} data-testid="button-remove-openai">
              {removing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Remove
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || !apiKey} data-testid="button-save-openai">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TikTokShopConfigDialog({ open, onOpenChange, onSuccess }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    shopId: "",
    appKey: "",
    appSecret: "",
    accessToken: "",
    refreshToken: "",
  });
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [removing, setRemoving] = useState(false);

  const { data: tiktokSettings, isLoading } = useQuery<TikTokShopSettings>({
    queryKey: ["/api/admin/settings/tiktok-shop"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/tiktok-shop");
      if (!res.ok) throw new Error("Failed to fetch TikTok Shop settings");
      return res.json();
    },
  });

  useEffect(() => {
    if (tiktokSettings) {
      setFormData({
        shopId: tiktokSettings.shopId || "",
        appKey: tiktokSettings.appKey || "",
        appSecret: "",
        accessToken: "",
        refreshToken: "",
      });
    }
  }, [tiktokSettings]);

  const handleSave = async () => {
    if (!tiktokSettings?.configured && (!formData.shopId || !formData.appKey)) {
      toast({ title: "Shop ID and App Key are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/tiktok-shop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save settings");
      }

      toast({ title: "TikTok Shop configuration saved" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/admin/settings/tiktok-shop/verify", { method: "POST" });
      const result = await res.json();
      if (result.success) {
        toast({ title: `Connection verified! Shop: ${result.shopName || "Connected"}` });
      } else {
        toast({ title: result.error || "Verification failed", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/admin/settings/tiktok-shop", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to remove configuration");
      }
      toast({ title: "TikTok Shop configuration removed" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            TikTok Shop Configuration
          </DialogTitle>
          <DialogDescription>
            Connect your TikTok Shop to sync products and manage orders.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            {tiktokSettings?.configured && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  TikTok Shop is configured
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tiktokShopId">Shop ID</Label>
                <Input
                  id="tiktokShopId"
                  value={formData.shopId}
                  onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                  placeholder="Your TikTok Shop ID"
                  data-testid="input-tiktok-shop-id"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tiktokAppKey">App Key</Label>
                <Input
                  id="tiktokAppKey"
                  value={formData.appKey}
                  onChange={(e) => setFormData({ ...formData, appKey: e.target.value })}
                  placeholder="Your App Key"
                  data-testid="input-tiktok-app-key"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktokAppSecret">App Secret</Label>
              <Input
                id="tiktokAppSecret"
                type="password"
                value={formData.appSecret}
                onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                placeholder={tiktokSettings?.hasAppSecret ? "••••••••••••••••" : "Enter your App Secret"}
                data-testid="input-tiktok-app-secret"
              />
              {tiktokSettings?.hasAppSecret && (
                <p className="text-xs text-muted-foreground">Leave blank to keep the existing secret</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktokAccessToken">Access Token</Label>
              <Input
                id="tiktokAccessToken"
                type="password"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                placeholder={tiktokSettings?.hasAccessToken ? "••••••••••••••••" : "Enter your Access Token"}
                data-testid="input-tiktok-access-token"
              />
              {tiktokSettings?.hasAccessToken && (
                <p className="text-xs text-muted-foreground">Leave blank to keep the existing token</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktokRefreshToken">Refresh Token (optional)</Label>
              <Input
                id="tiktokRefreshToken"
                type="password"
                value={formData.refreshToken}
                onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })}
                placeholder={tiktokSettings?.hasRefreshToken ? "••••••••••••••••" : "Enter your Refresh Token"}
                data-testid="input-tiktok-refresh-token"
              />
              {tiktokSettings?.hasRefreshToken && (
                <p className="text-xs text-muted-foreground">Leave blank to keep the existing token</p>
              )}
            </div>

            {tiktokSettings?.configured && (
              <div className="pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVerify}
                  disabled={verifying}
                  data-testid="button-verify-tiktok"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TestTube className="w-4 h-4 mr-2" />}
                  Test Connection
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {tiktokSettings?.configured && (
            <Button variant="destructive" onClick={handleRemove} disabled={removing} data-testid="button-remove-tiktok">
              {removing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Remove
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-tiktok">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InstagramShopConfigDialog({ open, onOpenChange, onSuccess }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    businessAccountId: "",
    catalogId: "",
    accessToken: "",
  });
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [removing, setRemoving] = useState(false);

  const { data: instagramSettings, isLoading } = useQuery<InstagramShopSettings>({
    queryKey: ["/api/admin/settings/instagram-shop"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/instagram-shop");
      if (!res.ok) throw new Error("Failed to fetch Instagram Shop settings");
      return res.json();
    },
  });

  useEffect(() => {
    if (instagramSettings) {
      setFormData({
        businessAccountId: instagramSettings.businessAccountId || "",
        catalogId: instagramSettings.catalogId || "",
        accessToken: "",
      });
    }
  }, [instagramSettings]);

  const handleSave = async () => {
    if (!instagramSettings?.configured && !formData.businessAccountId) {
      toast({ title: "Business Account ID is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/instagram-shop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save settings");
      }

      toast({ title: "Instagram Shop configuration saved" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/admin/settings/instagram-shop/verify", { method: "POST" });
      const result = await res.json();
      if (result.success) {
        toast({ title: `Connection verified! Account: ${result.accountName || "Connected"}` });
      } else {
        toast({ title: result.error || "Verification failed", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/admin/settings/instagram-shop", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to remove configuration");
      }
      toast({ title: "Instagram Shop configuration removed" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="w-5 h-5" />
            Instagram Shop Configuration
          </DialogTitle>
          <DialogDescription>
            Connect your Instagram Business account to manage your product catalog.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            {instagramSettings?.configured && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Instagram Shop is configured
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="instagramBusinessAccountId">Business Account ID</Label>
              <Input
                id="instagramBusinessAccountId"
                value={formData.businessAccountId}
                onChange={(e) => setFormData({ ...formData, businessAccountId: e.target.value })}
                placeholder="Your Instagram Business Account ID"
                data-testid="input-instagram-business-account-id"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagramCatalogId">Catalog ID (optional)</Label>
              <Input
                id="instagramCatalogId"
                value={formData.catalogId}
                onChange={(e) => setFormData({ ...formData, catalogId: e.target.value })}
                placeholder="Your Facebook Catalog ID"
                data-testid="input-instagram-catalog-id"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagramAccessToken">Access Token</Label>
              <Input
                id="instagramAccessToken"
                type="password"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                placeholder={instagramSettings?.hasAccessToken ? "••••••••••••••••" : "Enter your Access Token"}
                data-testid="input-instagram-access-token"
              />
              {instagramSettings?.hasAccessToken && (
                <p className="text-xs text-muted-foreground">Leave blank to keep the existing token</p>
              )}
              <p className="text-xs text-muted-foreground">
                Requires a long-lived token with Instagram Shopping permissions
              </p>
            </div>

            {instagramSettings?.configured && (
              <div className="pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVerify}
                  disabled={verifying}
                  data-testid="button-verify-instagram"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TestTube className="w-4 h-4 mr-2" />}
                  Test Connection
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {instagramSettings?.configured && (
            <Button variant="destructive" onClick={handleRemove} disabled={removing} data-testid="button-remove-instagram">
              {removing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Remove
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-instagram">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
