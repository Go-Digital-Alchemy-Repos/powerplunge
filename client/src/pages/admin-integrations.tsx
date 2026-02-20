import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, XCircle, ExternalLink, Key, Loader2, TestTube, AlertCircle, Save, HardDrive, Mail, Brain, Link2, Copy, ShoppingBag, Instagram, RefreshCw, Star, MapPin, Zap, Eye, EyeOff } from "lucide-react";
import AdminNav from "@/components/admin/AdminNav";

interface IntegrationStatus {
  mailgun: boolean;
  cloudflareR2?: boolean;
  openai?: boolean;
  tiktokShop?: boolean;
  instagramShop?: boolean;
  pinterestShopping?: boolean;
  youtubeShopping?: boolean;
  snapchatShopping?: boolean;
  xShopping?: boolean;
  metaMarketing?: boolean;
  mailchimp?: boolean;
  googlePlaces?: boolean;
  twilio?: boolean;
  twilioEnvConfigured?: boolean;
}

interface MailchimpSettings {
  configured: boolean;
  serverPrefix?: string;
  audienceId?: string;
  hasApiKey?: boolean;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  updatedAt?: string;
}

interface TikTokImportRun {
  id: string;
  startedAt?: string;
  finishedAt?: string;
  scope?: "page" | "bulk" | string;
  mode?: "dry_run" | "import" | string;
  status?: "success" | "failed" | string;
  created?: number;
  updated?: number;
  skipped?: number;
  failureCount?: number;
  failures?: Array<{ productId: string; reason: string }>;
  productsRequested?: number | null;
  productsFetched?: number | null;
  pagesFetched?: number | null;
  pageSize?: number | null;
  maxPages?: number | null;
  maxProducts?: number | null;
  nextPageToken?: string | null;
  truncated?: boolean | null;
  error?: string | null;
}

type TikTokImportRunFilterMode = "all" | "dry_run" | "import";
type TikTokImportRunFilterStatus = "all" | "success" | "failed";
type TikTokImportRunFilterScope = "all" | "page" | "bulk";

interface TikTokImportRunFilters {
  mode: TikTokImportRunFilterMode;
  status: TikTokImportRunFilterStatus;
  scope: TikTokImportRunFilterScope;
}

interface TikTokShopSettings {
  configured: boolean;
  shopId?: string;
  shopCipher?: string;
  sellerName?: string;
  sellerBaseRegion?: string;
  appKey?: string;
  hasAppSecret?: boolean;
  hasAccessToken?: boolean;
  hasRefreshToken?: boolean;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
  grantedScopes?: string[];
  importRuns?: TikTokImportRun[];
  mockMode?: boolean;
  updatedAt?: string;
}

interface InstagramShopSettings {
  configured: boolean;
  businessAccountId?: string;
  catalogId?: string;
  hasMetaAccessToken?: boolean;
  updatedAt?: string;
}

interface PinterestShoppingSettings {
  configured: boolean;
  merchantId?: string;
  catalogId?: string;
  clientId?: string;
  hasClientSecret?: boolean;
  hasAccessToken?: boolean;
  hasRefreshToken?: boolean;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  updatedAt?: string;
}

interface YouTubeShoppingSettings {
  configured: boolean;
  channelId?: string;
  merchantId?: string;
  clientId?: string;
  hasClientSecret?: boolean;
  hasAccessToken?: boolean;
  hasRefreshToken?: boolean;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  updatedAt?: string;
}

interface SnapchatShoppingSettings {
  configured: boolean;
  accountId?: string;
  catalogId?: string;
  clientId?: string;
  hasClientSecret?: boolean;
  hasAccessToken?: boolean;
  hasRefreshToken?: boolean;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  updatedAt?: string;
}

interface XShoppingSettings {
  configured: boolean;
  accountId?: string;
  catalogId?: string;
  clientId?: string;
  hasClientSecret?: boolean;
  hasAccessToken?: boolean;
  hasRefreshToken?: boolean;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  updatedAt?: string;
}

interface MetaMarketingSettings {
  configured: boolean;
  pixelId?: string | null;
  catalogId?: string | null;
  productFeedId?: string | null;
  hasAccessToken?: boolean;
  hasAppSecret?: boolean;
  hasTestEventCode?: boolean;
  hasCatalogFeedKey?: boolean;
  capiEnabled?: boolean;
  catalogFeedUrl?: string | null;
  lastSyncAt?: string | null;
  lastSyncStatus?: string | null;
  capiLastDispatchAt?: string | null;
  capiLastDispatchStatus?: string | null;
}

interface EmailSettings {
  provider: string;
  mailgunDomain?: string;
  mailgunFromEmail?: string;
  mailgunFromName?: string;
  mailgunReplyTo?: string;
  mailgunRegion?: string;
  hasApiKey?: boolean;
  hasWebhookSigningKey?: boolean;
  updatedAt?: string;
}

interface R2Settings {
  configured: boolean;
  bucketName?: string;
  publicUrl?: string;
  updatedAt?: string;
}

export default function AdminIntegrations() {
  const [, setLocation] = useLocation();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [showMailgunDialog, setShowMailgunDialog] = useState(false);
  const [showR2Dialog, setShowR2Dialog] = useState(false);
  const [showOpenAIDialog, setShowOpenAIDialog] = useState(false);
  const [showInstagramDialog, setShowInstagramDialog] = useState(false);
  const [showPinterestDialog, setShowPinterestDialog] = useState(false);
  const [showYouTubeDialog, setShowYouTubeDialog] = useState(false);
  const [showSnapchatDialog, setShowSnapchatDialog] = useState(false);
  const [showXDialog, setShowXDialog] = useState(false);
  const [showMailchimpDialog, setShowMailchimpDialog] = useState(false);
  const [showGooglePlacesDialog, setShowGooglePlacesDialog] = useState(false);
  const [showTwilioDialog, setShowTwilioDialog] = useState(false);

  const { data: integrations, refetch: refetchIntegrations } = useQuery<IntegrationStatus>({
    queryKey: ["/api/admin/integrations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/integrations", { credentials: "include" });
      if (res.status === 401) {
        setLocation("/admin/login");
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
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
                <Mail className="w-5 h-5 text-primary" />
                Mailchimp
              </CardTitle>
              <CardDescription>
                Manage email marketing campaigns and audience lists with Mailchimp
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <StatusBadge configured={integrations?.mailchimp} />
                <Button 
                  variant="outline" 
                  onClick={() => setShowMailchimpDialog(true)}
                  data-testid="button-configure-mailchimp"
                >
                  Configure
                </Button>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                <a href="https://mailchimp.com/developer/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Get your API key from Mailchimp Developer Portal <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                Google Reviews
              </CardTitle>
              <CardDescription>
                Auto-fetch 5-star Google reviews for your testimonials blocks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <StatusBadge configured={integrations?.googlePlaces} />
                <Button 
                  variant="outline" 
                  onClick={() => setShowGooglePlacesDialog(true)}
                  data-testid="button-configure-google-places"
                >
                  Configure
                </Button>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Get your API key from Google Cloud Console <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Twilio SMS
              </CardTitle>
              <CardDescription>
                SMS verification for affiliate invite phone verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <StatusBadge configured={integrations?.twilio || integrations?.twilioEnvConfigured} />
                <Button 
                  variant="outline" 
                  onClick={() => setShowTwilioDialog(true)}
                  data-testid="button-configure-twilio"
                >
                  Configure
                </Button>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                <a href="https://www.twilio.com/console" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Get your credentials from Twilio Console <ExternalLink className="w-3 h-3" />
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

      <InstagramShopConfigDialog
        open={showInstagramDialog}
        onOpenChange={setShowInstagramDialog}
        onSuccess={() => refetchIntegrations()}
      />

      <PinterestShoppingConfigDialog
        open={showPinterestDialog}
        onOpenChange={setShowPinterestDialog}
        onSuccess={() => refetchIntegrations()}
      />
      <YouTubeShoppingConfigDialog
        open={showYouTubeDialog}
        onOpenChange={setShowYouTubeDialog}
        onSuccess={() => refetchIntegrations()}
      />
      <SnapchatShoppingConfigDialog
        open={showSnapchatDialog}
        onOpenChange={setShowSnapchatDialog}
        onSuccess={() => refetchIntegrations()}
      />
      <XShoppingConfigDialog
        open={showXDialog}
        onOpenChange={setShowXDialog}
        onSuccess={() => refetchIntegrations()}
      />
      <MailchimpConfigDialog
        open={showMailchimpDialog}
        onOpenChange={setShowMailchimpDialog}
        onSuccess={() => refetchIntegrations()}
      />
      <GooglePlacesConfigDialog
        open={showGooglePlacesDialog}
        onOpenChange={setShowGooglePlacesDialog}
        onSuccess={() => refetchIntegrations()}
      />
      <TwilioConfigDialog
        open={showTwilioDialog}
        onOpenChange={setShowTwilioDialog}
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

function SecretInput({
  value,
  onChange,
  hasSavedValue,
  placeholder,
  id,
  "data-testid": dataTestId,
  className,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hasSavedValue?: boolean;
  placeholder?: string;
  id?: string;
  "data-testid"?: string;
  className?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showValue, setShowValue] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const maskedDisplay = "••••••••";
  const showingSavedMask = !!(hasSavedValue && !isEditing && !value);

  const handleMaskClick = () => {
    if (showingSavedMask) {
      setIsEditing(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <div className="relative">
      {showingSavedMask ? (
        <div
          role="button"
          tabIndex={0}
          className={`flex items-center h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-text pr-10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className || ""}`}
          onClick={handleMaskClick}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleMaskClick(); } }}
          aria-label="Saved credential - click to update"
          data-testid={dataTestId}
        >
          <span className="text-foreground tracking-wider">{maskedDisplay}</span>
        </div>
      ) : (
        <Input
          ref={inputRef}
          id={id}
          type={showValue ? "text" : "password"}
          value={value}
          onChange={onChange}
          onBlur={() => {
            if (!value && hasSavedValue) {
              setIsEditing(false);
              setShowValue(false);
            }
          }}
          placeholder={hasSavedValue ? "Leave blank to keep existing" : placeholder}
          className={`pr-10 ${className || ""}`}
          data-testid={dataTestId}
          autoFocus={hasSavedValue && isEditing}
        />
      )}
      {showingSavedMask ? (
        <Eye className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-50" />
      ) : value ? (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowValue(!showValue)}
          tabIndex={-1}
        >
          {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      ) : null}
    </div>
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
    mailgunWebhookSigningKey: "",
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const { data: emailSettings, isLoading } = useQuery<EmailSettings>({
    queryKey: ["/api/admin/settings/email"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/email", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch email settings");
      return res.json();
    },
  });

  // Populate form with existing settings when loaded
  useEffect(() => {
    if (emailSettings) {
      setFormData({
        provider: "mailgun",
        mailgunApiKey: "",
        mailgunDomain: emailSettings.mailgunDomain || "",
        mailgunFromEmail: emailSettings.mailgunFromEmail || "",
        mailgunFromName: emailSettings.mailgunFromName || "",
        mailgunReplyTo: emailSettings.mailgunReplyTo || "",
        mailgunRegion: emailSettings.mailgunRegion || "us",
        mailgunWebhookSigningKey: "",
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
        credentials: "include",
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
        credentials: "include",
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
              <SecretInput
                id="mailgunApiKey"
                value={formData.mailgunApiKey}
                onChange={(e) => setFormData({ ...formData, mailgunApiKey: e.target.value })}
                hasSavedValue={emailSettings?.hasApiKey}
                placeholder="Enter your Mailgun API key"
                data-testid="input-mailgun-api-key"
              />
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

            <div className="space-y-2">
              <Label htmlFor="mailgunWebhookSigningKey">Webhook Signing Key</Label>
              <SecretInput
                id="mailgunWebhookSigningKey"
                value={formData.mailgunWebhookSigningKey}
                onChange={(e) => setFormData({ ...formData, mailgunWebhookSigningKey: e.target.value })}
                hasSavedValue={emailSettings?.hasWebhookSigningKey}
                placeholder="Enter your Mailgun HTTP webhook signing key"
                data-testid="input-mailgun-webhook-signing-key"
              />
              <p className="text-xs text-muted-foreground">Required for inbound email replies. Found in Mailgun Dashboard &rarr; API Keys &rarr; HTTP Webhook Signing Key</p>
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
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSave} disabled={saving} data-testid="button-save-mailgun">
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

const TIKTOK_IMPORT_RUN_FILTERS_STORAGE_KEY = "admin_integrations_tiktok_import_run_filters_v1";
const DEFAULT_TIKTOK_IMPORT_RUN_FILTERS: TikTokImportRunFilters = {
  mode: "all",
  status: "all",
  scope: "all",
};

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
      const res = await fetch("/api/admin/settings/r2", { credentials: "include" });
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
        credentials: "include",
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
              <SecretInput
                id="r2AccessKeyId"
                value={formData.accessKeyId}
                onChange={(e) => setFormData({ ...formData, accessKeyId: e.target.value })}
                hasSavedValue={r2Settings?.hasAccessKey}
                placeholder="R2 Access Key ID"
                data-testid="input-r2-access-key-id"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="r2SecretAccessKey">Secret Access Key</Label>
              <SecretInput
                id="r2SecretAccessKey"
                value={formData.secretAccessKey}
                onChange={(e) => setFormData({ ...formData, secretAccessKey: e.target.value })}
                hasSavedValue={r2Settings?.hasSecretKey}
                placeholder="R2 Secret Access Key"
                data-testid="input-r2-secret-access-key"
              />
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
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSave} disabled={saving} data-testid="button-save-r2">
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
      const res = await fetch("/api/admin/settings/openai", { credentials: "include" });
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
        credentials: "include",
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
      const res = await fetch("/api/admin/settings/openai", { method: "DELETE", credentials: "include" });
      
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
              <SecretInput
                id="openaiApiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                hasSavedValue={openaiSettings?.configured}
                placeholder="sk-..."
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
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSave} disabled={saving || !apiKey} data-testid="button-save-openai">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TikTokAuthorizedShopOption {
  id: string;
  name?: string;
  shop_name?: string;
  code?: string;
  cipher?: string;
}

interface TikTokProductPreview {
  id: string;
  title: string;
  status: string;
  region?: string | null;
  currency?: string | null;
  price?: string | null;
  sellerSku?: string | null;
}

function getShopDisplayName(shop: TikTokAuthorizedShopOption): string {
  return shop.name || shop.shop_name || shop.code || shop.id;
}

export function TikTokShopConfigDialog({ open, onOpenChange, onSuccess }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    shopId: "",
    appKey: "",
    appSecret: "",
    accessToken: "",
    refreshToken: "",
  });
  const [authCode, setAuthCode] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [authorizeUrl, setAuthorizeUrl] = useState("");
  const [authorizedShops, setAuthorizedShops] = useState<TikTokAuthorizedShopOption[]>([]);
  const [productPreview, setProductPreview] = useState<TikTokProductPreview[]>([]);
  const [nextProductsPageToken, setNextProductsPageToken] = useState<string | null>(null);
  const [selectedShopCipher, setSelectedShopCipher] = useState("");
  const [loadingCallbackUrl, setLoadingCallbackUrl] = useState(false);
  const [loadingAuthorizeUrl, setLoadingAuthorizeUrl] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [refreshingToken, setRefreshingToken] = useState(false);
  const [syncingShops, setSyncingShops] = useState(false);
  const [syncingProducts, setSyncingProducts] = useState(false);
  const [importingProducts, setImportingProducts] = useState(false);
  const [importingAllProducts, setImportingAllProducts] = useState(false);
  const [dryRunImport, setDryRunImport] = useState(true);
  const [importAllLimits, setImportAllLimits] = useState({
    pageSize: "50",
    maxPages: "50",
    maxProducts: "2000",
  });
  const [selectingShop, setSelectingShop] = useState(false);
  const [exchangingCode, setExchangingCode] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [selectedImportRun, setSelectedImportRun] = useState<TikTokImportRun | null>(null);
  const [importRunFilters, setImportRunFilters] = useState<TikTokImportRunFilters>(DEFAULT_TIKTOK_IMPORT_RUN_FILTERS);

  const { data: tiktokSettings, isLoading } = useQuery<TikTokShopSettings>({
    queryKey: ["/api/admin/settings/tiktok-shop"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/tiktok-shop", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch TikTok Shop settings");
      return res.json();
    },
  });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const loadCallbackUrl = async () => {
      setLoadingCallbackUrl(true);
      try {
        const [callbackRes, webhookRes] = await Promise.all([
          fetch("/api/admin/settings/tiktok-shop/oauth/callback-url", { credentials: "include" }),
          fetch("/api/admin/settings/tiktok-shop/webhook-url", { credentials: "include" }),
        ]);
        if (!callbackRes.ok) throw new Error("Failed to fetch callback URL");
        const callbackData = await callbackRes.json();
        const webhookData = webhookRes.ok ? await webhookRes.json() : {};
        if (!cancelled) {
          setCallbackUrl(callbackData.callbackUrl || "");
          setWebhookUrl(webhookData.webhookUrl || "");
        }
      } catch {
        if (!cancelled) {
          setCallbackUrl("");
          setWebhookUrl("");
        }
      } finally {
        if (!cancelled) setLoadingCallbackUrl(false);
      }
    };

    loadCallbackUrl();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (tiktokSettings) {
      setFormData({
        shopId: tiktokSettings.shopId || "",
        appKey: tiktokSettings.appKey || "",
        appSecret: "",
        accessToken: "",
        refreshToken: "",
      });
      setSelectedShopCipher(tiktokSettings.shopCipher || "");
      setAuthorizeUrl("");
      setNextProductsPageToken(null);
    }
  }, [tiktokSettings]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TIKTOK_IMPORT_RUN_FILTERS_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<TikTokImportRunFilters> | null;
      const mode = parsed?.mode;
      const status = parsed?.status;
      const scope = parsed?.scope;

      if (!mode || !status || !scope) return;
      if (!["all", "dry_run", "import"].includes(mode)) return;
      if (!["all", "success", "failed"].includes(status)) return;
      if (!["all", "page", "bulk"].includes(scope)) return;

      setImportRunFilters({
        mode,
        status,
        scope,
      });
    } catch {
      // Ignore invalid localStorage payloads
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        TIKTOK_IMPORT_RUN_FILTERS_STORAGE_KEY,
        JSON.stringify(importRunFilters),
      );
    } catch {
      // Ignore storage write failures
    }
  }, [importRunFilters]);

  const shopOptions = authorizedShops.length > 0
    ? authorizedShops
    : (tiktokSettings?.shopCipher
      ? [{
        id: tiktokSettings.shopId || "selected-shop",
        name: tiktokSettings.sellerName || "Selected shop",
        cipher: tiktokSettings.shopCipher,
      }]
      : []);
  const importRuns = Array.isArray(tiktokSettings?.importRuns) ? tiktokSettings.importRuns : [];
  const filteredImportRuns = importRuns.filter((run) => {
    if (importRunFilters.mode !== "all" && run.mode !== importRunFilters.mode) {
      return false;
    }
    if (importRunFilters.status !== "all" && run.status !== importRunFilters.status) {
      return false;
    }
    if (importRunFilters.scope !== "all" && run.scope !== importRunFilters.scope) {
      return false;
    }
    return true;
  });
  const visibleImportRuns = filteredImportRuns.slice(0, 5);
  const hasActiveImportRunFilters =
    importRunFilters.mode !== "all" ||
    importRunFilters.status !== "all" ||
    importRunFilters.scope !== "all";
  const selectedRunPayload = selectedImportRun ? JSON.stringify(selectedImportRun, null, 2) : "";

  const handleCopyImportRunJson = async () => {
    if (!selectedRunPayload) return;
    try {
      await navigator.clipboard.writeText(selectedRunPayload);
      toast({ title: "Run JSON copied" });
    } catch {
      toast({ title: "Failed to copy run JSON", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    const appKey = formData.appKey.trim();
    const appSecret = formData.appSecret.trim();
    if (!tiktokSettings?.configured && !tiktokSettings?.mockMode && (!appKey || !appSecret)) {
      toast({ title: "App Key and App Secret are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        shopId: formData.shopId.trim(),
        appKey,
        appSecret,
        accessToken: formData.accessToken.trim(),
        refreshToken: formData.refreshToken.trim(),
      };

      const res = await fetch("/api/admin/settings/tiktok-shop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to save settings");
      }

      toast({ title: "TikTok Shop configuration saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/tiktok-shop"] });
      onSuccess();
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCallbackUrl = async () => {
    if (!callbackUrl) return;
    try {
      await navigator.clipboard.writeText(callbackUrl);
      toast({ title: "Callback URL copied" });
    } catch {
      toast({ title: "Failed to copy callback URL", variant: "destructive" });
    }
  };

  const handleGenerateAuthorizeUrl = async () => {
    setLoadingAuthorizeUrl(true);
    try {
      const res = await fetch("/api/admin/settings/tiktok-shop/oauth/authorize-url", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.authorizeUrl) {
        throw new Error(data.message || "Failed to generate authorize URL");
      }

      setAuthorizeUrl(data.authorizeUrl);
      window.open(data.authorizeUrl, "_blank", "noopener,noreferrer");
      toast({ title: "TikTok authorization page opened in a new tab" });
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setLoadingAuthorizeUrl(false);
    }
  };

  const handleCopyAuthorizeUrl = async () => {
    if (!authorizeUrl) {
      toast({ title: "Generate the authorize URL first", variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(authorizeUrl);
      toast({ title: "Authorize URL copied" });
    } catch {
      toast({ title: "Failed to copy authorize URL", variant: "destructive" });
    }
  };

  const handleExchangeCode = async () => {
    if (!authCode.trim()) {
      toast({ title: "Authorization code is required", variant: "destructive" });
      return;
    }

    setExchangingCode(true);
    try {
      const res = await fetch("/api/admin/settings/tiktok-shop/exchange-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authCode: authCode.trim() }),
        credentials: "include",
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        throw new Error(result.error || result.message || "Failed to exchange authorization code");
      }

      setAuthCode("");
      setAuthorizedShops(Array.isArray(result.shops) ? result.shops : []);
      if (result.selectedShop?.cipher) {
        setSelectedShopCipher(result.selectedShop.cipher);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/tiktok-shop"] });
      onSuccess();
      toast({
        title: result.selectedShop
          ? `Authorization complete: ${getShopDisplayName(result.selectedShop)}`
          : "Authorization code exchanged",
      });
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setExchangingCode(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/admin/settings/tiktok-shop/verify", { method: "POST", credentials: "include" });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Verification failed");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/tiktok-shop"] });
      onSuccess();
      toast({
        title: `Connection verified: ${result.shopName || "Connected"}`,
        description: result.shopCount ? `${result.shopCount} authorized shop(s) found` : undefined,
      });
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleRefreshToken = async () => {
    setRefreshingToken(true);
    try {
      const res = await fetch("/api/admin/settings/tiktok-shop/refresh-token", { method: "POST", credentials: "include" });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to refresh token");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/tiktok-shop"] });
      onSuccess();
      toast({ title: "TikTok access token refreshed" });
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setRefreshingToken(false);
    }
  };

  const handleSyncShops = async () => {
    setSyncingShops(true);
    try {
      const res = await fetch("/api/admin/settings/tiktok-shop/shops", { credentials: "include" });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to sync authorized shops");
      }

      const shops = Array.isArray(result.shops) ? result.shops : [];
      setAuthorizedShops(shops);
      if (result.selectedShop?.cipher) {
        setSelectedShopCipher(result.selectedShop.cipher);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/tiktok-shop"] });
      onSuccess();
      toast({ title: `Fetched ${shops.length} authorized TikTok shop(s)` });
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setSyncingShops(false);
    }
  };

  const handleSyncProducts = async () => {
    setSyncingProducts(true);
    try {
      const res = await fetch("/api/admin/settings/tiktok-shop/sync-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageSize: 20,
          pageToken: nextProductsPageToken || undefined,
        }),
        credentials: "include",
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to sync TikTok products");
      }

      const products = Array.isArray(result.products) ? result.products : [];
      setProductPreview(products);
      setNextProductsPageToken(result.nextPageToken || null);
      toast({
        title: `Synced ${result.count || products.length} TikTok product(s)`,
        description: result.totalCount ? `Total available: ${result.totalCount}` : undefined,
      });
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setSyncingProducts(false);
    }
  };

  const handleImportProducts = async () => {
    if (productPreview.length === 0) {
      toast({ title: "Sync TikTok products first", variant: "destructive" });
      return;
    }

    setImportingProducts(true);
    try {
      const res = await fetch("/api/admin/settings/tiktok-shop/import-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: productPreview,
          dryRun: dryRunImport,
        }),
        credentials: "include",
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to import TikTok products");
      }

      const created = Number(result.created || 0);
      const updated = Number(result.updated || 0);
      const skipped = Number(result.skipped || 0);
      const failureCount = Array.isArray(result.failures) ? result.failures.length : 0;

      toast({
        title: dryRunImport
          ? `Dry run complete (would create ${created}, would update ${updated})`
          : `Imported TikTok products (created ${created}, updated ${updated})`,
        description: skipped > 0 || failureCount > 0
          ? `${dryRunImport ? "Would skip" : "Skipped"} ${skipped}${failureCount > 0 ? `, ${failureCount} failures` : ""}`
          : undefined,
      });
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setImportingProducts(false);
    }
  };

  const handleImportAllProducts = async () => {
    if (!selectedShopCipher) {
      toast({ title: "Select a shop first", variant: "destructive" });
      return;
    }

    const toBoundedInt = (raw: string, fallback: number, min: number, max: number): number => {
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed)) return fallback;
      return Math.min(Math.max(parsed, min), max);
    };

    const pageSize = toBoundedInt(importAllLimits.pageSize, 50, 1, 100);
    const maxPages = toBoundedInt(importAllLimits.maxPages, 50, 1, 200);
    const maxProducts = toBoundedInt(importAllLimits.maxProducts, 2000, 1, 10000);

    setImportingAllProducts(true);
    try {
      const res = await fetch("/api/admin/settings/tiktok-shop/import-products-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageSize,
          maxPages,
          maxProducts,
          dryRun: dryRunImport,
        }),
        credentials: "include",
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to import all TikTok products");
      }

      const created = Number(result.created || 0);
      const updated = Number(result.updated || 0);
      const skipped = Number(result.skipped || 0);
      const pagesFetched = Number(result.pagesFetched || 0);
      const productsFetched = Number(result.productsFetched || 0);
      const truncated = Boolean(result.truncated);

      toast({
        title: dryRunImport
          ? `Dry run complete (${created} would create, ${updated} would update)`
          : `Imported TikTok catalog (${created} created, ${updated} updated)`,
        description: `${productsFetched} products across ${pagesFetched} page(s)${skipped ? `, ${dryRunImport ? "would skip" : "skipped"} ${skipped}` : ""}${truncated ? ", truncated by safety limits" : ""}`,
      });
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setImportingAllProducts(false);
    }
  };

  const handleSelectShop = async () => {
    if (!selectedShopCipher) {
      toast({ title: "Select a shop first", variant: "destructive" });
      return;
    }

    setSelectingShop(true);
    try {
      const res = await fetch("/api/admin/settings/tiktok-shop/select-shop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopCipher: selectedShopCipher }),
        credentials: "include",
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to select shop");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/tiktok-shop"] });
      onSuccess();
      toast({
        title: result.selectedShop
          ? `Selected shop: ${getShopDisplayName(result.selectedShop)}`
          : "Shop selected",
      });
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setSelectingShop(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/admin/settings/tiktok-shop", { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to remove configuration");
      }

      setFormData({
        shopId: "",
        appKey: "",
        appSecret: "",
        accessToken: "",
        refreshToken: "",
      });
      setAuthCode("");
      setAuthorizedShops([]);
      setSelectedShopCipher("");
      setAuthorizeUrl("");
      setProductPreview([]);
      setNextProductsPageToken(null);

      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/tiktok-shop"] });
      onSuccess();
      toast({ title: "TikTok Shop configuration removed" });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            TikTok Shop Configuration
          </DialogTitle>
          <DialogDescription>
            Save app credentials, set your OAuth callback URL, exchange the authorization code, and select an authorized shop.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-0">
            {tiktokSettings?.configured && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  TikTok Shop is configured
                </div>
                {(tiktokSettings.sellerName || tiktokSettings.shopId) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {tiktokSettings.sellerName || "Shop"} {tiktokSettings.shopId ? `(${tiktokSettings.shopId})` : ""}
                  </p>
                )}
              </div>
            )}

            {tiktokSettings?.mockMode && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-amber-600 text-sm font-medium">
                  <AlertCircle className="w-4 h-4" />
                  Mock mode enabled
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  OAuth, shop sync, and product sync use mock data from environment variables.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tiktokAppKey">App Key</Label>
                <Input
                  id="tiktokAppKey"
                  value={formData.appKey}
                  onChange={(e) => setFormData({ ...formData, appKey: e.target.value })}
                  placeholder="Your TikTok app key"
                  data-testid="input-tiktok-app-key"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tiktokShopId">Shop ID (optional)</Label>
                <Input
                  id="tiktokShopId"
                  value={formData.shopId}
                  onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                  placeholder="Current shop ID"
                  data-testid="input-tiktok-shop-id"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktokAppSecret">App Secret</Label>
              <SecretInput
                id="tiktokAppSecret"
                value={formData.appSecret}
                onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                hasSavedValue={tiktokSettings?.hasAppSecret}
                placeholder="Enter your TikTok app secret"
                data-testid="input-tiktok-app-secret"
              />
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">OAuth Callback URL</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyCallbackUrl}
                  disabled={!callbackUrl || loadingCallbackUrl}
                  data-testid="button-copy-tiktok-callback-url"
                >
                  {loadingCallbackUrl ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  Copy
                </Button>
              </div>
              <Input
                readOnly
                value={callbackUrl || (loadingCallbackUrl ? "Loading callback URL..." : "Unable to load callback URL")}
                data-testid="input-tiktok-callback-url"
              />
              <p className="text-xs text-muted-foreground">
                Add this callback URL in your TikTok Shop app settings before running OAuth authorization.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateAuthorizeUrl}
                  disabled={loadingAuthorizeUrl}
                  data-testid="button-generate-tiktok-authorize-url"
                >
                  {loadingAuthorizeUrl ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                  Authorize with TikTok
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyAuthorizeUrl}
                  disabled={!authorizeUrl}
                  data-testid="button-copy-tiktok-authorize-url"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Auth URL
                </Button>
              </div>
              {authorizeUrl && (
                <Input
                  readOnly
                  value={authorizeUrl}
                  data-testid="input-tiktok-authorize-url"
                />
              )}
              {webhookUrl && (
                <>
                  <p className="text-xs text-muted-foreground">Webhook URL</p>
                  <Input
                    readOnly
                    value={webhookUrl}
                    data-testid="input-tiktok-webhook-url"
                  />
                </>
              )}
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <Label htmlFor="tiktokAuthCode">Authorization Code</Label>
              <div className="flex gap-2">
                <Input
                  id="tiktokAuthCode"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="Paste code returned by TikTok Shop OAuth"
                  data-testid="input-tiktok-auth-code"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExchangeCode}
                  disabled={exchangingCode || !authCode.trim()}
                  data-testid="button-exchange-tiktok-auth-code"
                >
                  {exchangingCode ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}
                  Exchange
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Authorized Shops</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSyncShops}
                  disabled={syncingShops || !tiktokSettings?.hasAccessToken}
                  data-testid="button-sync-tiktok-shops"
                >
                  {syncingShops ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Sync Shops
                </Button>
              </div>

              {shopOptions.length > 0 ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={selectedShopCipher} onValueChange={setSelectedShopCipher}>
                    <SelectTrigger data-testid="select-tiktok-shop-cipher">
                      <SelectValue placeholder="Select authorized shop" />
                    </SelectTrigger>
                    <SelectContent>
                      {shopOptions
                        .filter((shop) => !!shop.cipher)
                        .map((shop) => (
                          <SelectItem key={shop.cipher} value={shop.cipher!}>
                            {getShopDisplayName(shop)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSelectShop}
                    disabled={selectingShop || !selectedShopCipher}
                    data-testid="button-select-tiktok-shop"
                  >
                    {selectingShop ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShoppingBag className="w-4 h-4 mr-2" />}
                    Use Shop
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No authorized shops loaded yet. Save credentials and exchange an authorization code, then sync shops.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktokAccessToken">Access Token (optional manual entry)</Label>
              <SecretInput
                id="tiktokAccessToken"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                hasSavedValue={tiktokSettings?.hasAccessToken}
                placeholder="Optional manual access token"
                data-testid="input-tiktok-access-token"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktokRefreshToken">Refresh Token (optional manual entry)</Label>
              <SecretInput
                id="tiktokRefreshToken"
                value={formData.refreshToken}
                onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })}
                hasSavedValue={tiktokSettings?.hasRefreshToken}
                placeholder="Optional manual refresh token"
                data-testid="input-tiktok-refresh-token"
              />
            </div>

            <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
              <p className="font-medium text-sm">Token Status</p>
              <p>Access token: {tiktokSettings?.hasAccessToken ? "Saved" : "Missing"}</p>
              <p>Refresh token: {tiktokSettings?.hasRefreshToken ? "Saved" : "Missing"}</p>
              <p>Access token expiry: {tiktokSettings?.accessTokenExpiresAt ? new Date(tiktokSettings.accessTokenExpiresAt).toLocaleString() : "n/a"}</p>
              <p>Refresh token expiry: {tiktokSettings?.refreshTokenExpiresAt ? new Date(tiktokSettings.refreshTokenExpiresAt).toLocaleString() : "n/a"}</p>
              <p>Scopes: {tiktokSettings?.grantedScopes?.length ? tiktokSettings.grantedScopes.join(", ") : "n/a"}</p>
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Product Sync Preview</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleImportAllProducts}
                    disabled={importingAllProducts || !selectedShopCipher}
                    data-testid="button-import-all-tiktok-products"
                  >
                    {importingAllProducts ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <HardDrive className="w-4 h-4 mr-2" />}
                    {dryRunImport ? "Dry Run All Pages" : "Import All Pages"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleImportProducts}
                    disabled={importingProducts || productPreview.length === 0}
                    data-testid="button-import-tiktok-products"
                  >
                    {importingProducts ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <HardDrive className="w-4 h-4 mr-2" />}
                    {dryRunImport ? "Dry Run Page Import" : "Import to Catalog"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSyncProducts}
                    disabled={syncingProducts || !selectedShopCipher}
                    data-testid="button-sync-tiktok-products"
                  >
                    {syncingProducts ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    {nextProductsPageToken ? "Load Next Page" : "Sync Products"}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border p-2">
                <div>
                  <p className="text-xs font-medium">Dry Run Mode</p>
                  <p className="text-xs text-muted-foreground">
                    Preview create/update counts without writing products.
                  </p>
                </div>
                <Switch
                  checked={dryRunImport}
                  onCheckedChange={setDryRunImport}
                  data-testid="switch-tiktok-import-dry-run"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="tiktokImportPageSize" className="text-xs">Page size</Label>
                  <Input
                    id="tiktokImportPageSize"
                    type="number"
                    min={1}
                    max={100}
                    value={importAllLimits.pageSize}
                    onChange={(e) => setImportAllLimits((prev) => ({ ...prev, pageSize: e.target.value }))}
                    data-testid="input-tiktok-import-page-size"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tiktokImportMaxPages" className="text-xs">Max pages</Label>
                  <Input
                    id="tiktokImportMaxPages"
                    type="number"
                    min={1}
                    max={200}
                    value={importAllLimits.maxPages}
                    onChange={(e) => setImportAllLimits((prev) => ({ ...prev, maxPages: e.target.value }))}
                    data-testid="input-tiktok-import-max-pages"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tiktokImportMaxProducts" className="text-xs">Max products</Label>
                  <Input
                    id="tiktokImportMaxProducts"
                    type="number"
                    min={1}
                    max={10000}
                    value={importAllLimits.maxProducts}
                    onChange={(e) => setImportAllLimits((prev) => ({ ...prev, maxProducts: e.target.value }))}
                    data-testid="input-tiktok-import-max-products"
                  />
                </div>
              </div>
              {!selectedShopCipher && (
                <p className="text-xs text-muted-foreground">
                  Select a shop before syncing products.
                </p>
              )}
              {productPreview.length > 0 && (
                <div className="rounded-md border divide-y">
                  {productPreview.slice(0, 10).map((product) => (
                    <div key={product.id} className="px-3 py-2 text-xs">
                      <p className="font-medium">{product.title}</p>
                      <p className="text-muted-foreground">
                        ID: {product.id} | Status: {product.status}
                        {product.price ? ` | Price: ${product.price}${product.currency ? ` ${product.currency}` : ""}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {importRuns.length > 0 && (
                <div className="rounded-md border divide-y">
                  <div className="px-3 py-2 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium">Recent Import Runs</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] text-muted-foreground">
                          Showing {visibleImportRuns.length} of {filteredImportRuns.length} filtered ({importRuns.length} total)
                        </p>
                        {hasActiveImportRunFilters && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => setImportRunFilters({ mode: "all", status: "all", scope: "all" })}
                            data-testid="button-tiktok-runs-filter-reset"
                          >
                            Reset Filters
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[11px] text-muted-foreground">Mode</span>
                        <Button
                          type="button"
                          size="sm"
                          variant={importRunFilters.mode === "all" ? "default" : "outline"}
                          className="h-7 px-2 text-[11px]"
                          onClick={() => setImportRunFilters((prev) => ({ ...prev, mode: "all" }))}
                          data-testid="button-tiktok-runs-filter-mode-all"
                        >
                          All
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={importRunFilters.mode === "dry_run" ? "default" : "outline"}
                          className="h-7 px-2 text-[11px]"
                          onClick={() => setImportRunFilters((prev) => ({ ...prev, mode: "dry_run" }))}
                          data-testid="button-tiktok-runs-filter-mode-dry-run"
                        >
                          Dry Run
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={importRunFilters.mode === "import" ? "default" : "outline"}
                          className="h-7 px-2 text-[11px]"
                          onClick={() => setImportRunFilters((prev) => ({ ...prev, mode: "import" }))}
                          data-testid="button-tiktok-runs-filter-mode-import"
                        >
                          Import
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[11px] text-muted-foreground">Status</span>
                        <Button
                          type="button"
                          size="sm"
                          variant={importRunFilters.status === "all" ? "default" : "outline"}
                          className="h-7 px-2 text-[11px]"
                          onClick={() => setImportRunFilters((prev) => ({ ...prev, status: "all" }))}
                          data-testid="button-tiktok-runs-filter-status-all"
                        >
                          All
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={importRunFilters.status === "success" ? "default" : "outline"}
                          className="h-7 px-2 text-[11px]"
                          onClick={() => setImportRunFilters((prev) => ({ ...prev, status: "success" }))}
                          data-testid="button-tiktok-runs-filter-status-success"
                        >
                          Success
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={importRunFilters.status === "failed" ? "default" : "outline"}
                          className="h-7 px-2 text-[11px]"
                          onClick={() => setImportRunFilters((prev) => ({ ...prev, status: "failed" }))}
                          data-testid="button-tiktok-runs-filter-status-failed"
                        >
                          Failed
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[11px] text-muted-foreground">Scope</span>
                        <Button
                          type="button"
                          size="sm"
                          variant={importRunFilters.scope === "all" ? "default" : "outline"}
                          className="h-7 px-2 text-[11px]"
                          onClick={() => setImportRunFilters((prev) => ({ ...prev, scope: "all" }))}
                          data-testid="button-tiktok-runs-filter-scope-all"
                        >
                          All
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={importRunFilters.scope === "page" ? "default" : "outline"}
                          className="h-7 px-2 text-[11px]"
                          onClick={() => setImportRunFilters((prev) => ({ ...prev, scope: "page" }))}
                          data-testid="button-tiktok-runs-filter-scope-page"
                        >
                          Page
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={importRunFilters.scope === "bulk" ? "default" : "outline"}
                          className="h-7 px-2 text-[11px]"
                          onClick={() => setImportRunFilters((prev) => ({ ...prev, scope: "bulk" }))}
                          data-testid="button-tiktok-runs-filter-scope-bulk"
                        >
                          Bulk
                        </Button>
                      </div>
                    </div>
                  </div>
                  {visibleImportRuns.map((run, index) => {
                    const completedAt = run.finishedAt || run.startedAt;
                    const timestamp = completedAt ? new Date(completedAt).toLocaleString() : "Unknown time";
                    const created = Number(run.created || 0);
                    const updated = Number(run.updated || 0);
                    const skipped = Number(run.skipped || 0);
                    const failures = Number(run.failureCount || 0);
                    const pagesFetched = run.pagesFetched !== null && run.pagesFetched !== undefined
                      ? `, pages ${Number(run.pagesFetched)}`
                      : "";
                    const productsFetched = run.productsFetched !== null && run.productsFetched !== undefined
                      ? `, products ${Number(run.productsFetched)}`
                      : "";
                    return (
                      <div key={run.id || `${run.startedAt || "run"}-${index}`} className="px-3 py-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">
                            {run.mode === "dry_run" ? "Dry Run" : "Import"} {run.scope === "bulk" ? "Bulk" : "Page"}{" "}
                            {run.status === "failed" ? "(failed)" : "(success)"}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedImportRun(run)}
                            data-testid="button-tiktok-import-run-details"
                          >
                            Details
                          </Button>
                        </div>
                        <p className="text-muted-foreground">
                          {timestamp} | created {created}, updated {updated}, skipped {skipped}, failures {failures}
                          {productsFetched}
                          {pagesFetched}
                          {run.truncated ? ", truncated" : ""}
                        </p>
                        {run.error && (
                          <p className="text-destructive mt-1">
                            {run.error}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {visibleImportRuns.length === 0 && (
                    <div className="px-3 py-3 text-xs text-muted-foreground">
                      No runs match the selected filters.
                    </div>
                  )}
                </div>
              )}
            </div>

            {tiktokSettings?.configured && (
              <div className="pt-2 border-t flex flex-wrap gap-2">
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRefreshToken}
                  disabled={refreshingToken || !tiktokSettings.hasRefreshToken}
                  data-testid="button-refresh-tiktok-token"
                >
                  {refreshingToken ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Refresh Token
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex gap-2 pt-3 border-t shrink-0">
          {tiktokSettings?.configured && (
            <Button variant="destructive" onClick={handleRemove} disabled={removing} data-testid="button-remove-tiktok">
              {removing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Remove
            </Button>
          )}
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSave} disabled={saving} data-testid="button-save-tiktok">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={!!selectedImportRun} onOpenChange={(next) => !next && setSelectedImportRun(null)}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>TikTok Import Run Details</DialogTitle>
          <DialogDescription>
            Full run metadata and failure details for troubleshooting.
          </DialogDescription>
        </DialogHeader>
        {selectedImportRun && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-md border p-3">
              <p><span className="font-medium">Completed:</span> {selectedImportRun.finishedAt ? new Date(selectedImportRun.finishedAt).toLocaleString() : "n/a"}</p>
              <p><span className="font-medium">Started:</span> {selectedImportRun.startedAt ? new Date(selectedImportRun.startedAt).toLocaleString() : "n/a"}</p>
              <p><span className="font-medium">Mode:</span> {selectedImportRun.mode || "n/a"}</p>
              <p><span className="font-medium">Scope:</span> {selectedImportRun.scope || "n/a"}</p>
              <p><span className="font-medium">Status:</span> {selectedImportRun.status || "n/a"}</p>
              <p><span className="font-medium">Created:</span> {Number(selectedImportRun.created || 0)}</p>
              <p><span className="font-medium">Updated:</span> {Number(selectedImportRun.updated || 0)}</p>
              <p><span className="font-medium">Skipped:</span> {Number(selectedImportRun.skipped || 0)}</p>
              <p><span className="font-medium">Failures:</span> {Number(selectedImportRun.failureCount || 0)}</p>
              <p><span className="font-medium">Products requested:</span> {selectedImportRun.productsRequested ?? "n/a"}</p>
              <p><span className="font-medium">Products fetched:</span> {selectedImportRun.productsFetched ?? "n/a"}</p>
              <p><span className="font-medium">Pages fetched:</span> {selectedImportRun.pagesFetched ?? "n/a"}</p>
              <p><span className="font-medium">Page size:</span> {selectedImportRun.pageSize ?? "n/a"}</p>
              <p><span className="font-medium">Max pages:</span> {selectedImportRun.maxPages ?? "n/a"}</p>
              <p><span className="font-medium">Max products:</span> {selectedImportRun.maxProducts ?? "n/a"}</p>
              <p><span className="font-medium">Truncated:</span> {selectedImportRun.truncated === null || selectedImportRun.truncated === undefined ? "n/a" : String(selectedImportRun.truncated)}</p>
              <p><span className="font-medium">Next page token:</span> {selectedImportRun.nextPageToken || "n/a"}</p>
            </div>
            {selectedImportRun.error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="font-medium text-destructive">Error</p>
                <p className="text-destructive/90 mt-1">{selectedImportRun.error}</p>
              </div>
            )}
            <div className="rounded-md border divide-y">
              <div className="px-3 py-2 font-medium">
                Failures
              </div>
              {Array.isArray(selectedImportRun.failures) && selectedImportRun.failures.length > 0 ? (
                selectedImportRun.failures.map((failure, index) => (
                  <div key={`${failure.productId}-${index}`} className="px-3 py-2">
                    <p className="font-medium">{failure.productId || "unknown"}</p>
                    <p className="text-muted-foreground mt-1">{failure.reason || "Unknown failure"}</p>
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-muted-foreground">
                  No failures recorded.
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">Raw JSON</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyImportRunJson}
                  data-testid="button-copy-tiktok-import-run-json"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy JSON
                </Button>
              </div>
              <pre className="rounded-md border bg-muted/40 p-3 overflow-x-auto whitespace-pre-wrap break-all">
                {selectedRunPayload}
              </pre>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setSelectedImportRun(null)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
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
  });
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [removing, setRemoving] = useState(false);

  const { data: instagramSettings, isLoading } = useQuery<InstagramShopSettings>({
    queryKey: ["/api/admin/settings/instagram-shop"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/instagram-shop", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch Instagram Shop settings");
      return res.json();
    },
  });

  useEffect(() => {
    if (instagramSettings) {
      setFormData({
        businessAccountId: instagramSettings.businessAccountId || "",
        catalogId: instagramSettings.catalogId || "",
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
        credentials: "include",
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
      const res = await fetch("/api/admin/settings/instagram-shop/verify", { method: "POST", credentials: "include" });
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
      const res = await fetch("/api/admin/settings/instagram-shop", { method: "DELETE", credentials: "include" });
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

            <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
              <p className="font-medium text-sm">Credential Source</p>
              <p>
                Instagram uses your Meta Marketing access token.
              </p>
              <p>
                Meta access token: {instagramSettings?.hasMetaAccessToken ? "Configured" : "Missing"}
              </p>
              {!instagramSettings?.hasMetaAccessToken && (
                <p className="text-amber-600">
                  Configure Meta Marketing first, then verify Instagram.
                </p>
              )}
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
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSave} disabled={saving} data-testid="button-save-instagram">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PinterestShoppingConfigDialog({ open, onOpenChange, onSuccess }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    merchantId: "",
    catalogId: "",
    clientId: "",
    clientSecret: "",
    accessToken: "",
    refreshToken: "",
  });
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [removing, setRemoving] = useState(false);

  const { data: pinterestSettings, isLoading } = useQuery<PinterestShoppingSettings>({
    queryKey: ["/api/admin/settings/pinterest-shopping"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/pinterest-shopping", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch Pinterest Shopping settings");
      return res.json();
    },
  });

  useEffect(() => {
    if (pinterestSettings) {
      setFormData({
        merchantId: pinterestSettings.merchantId || "",
        catalogId: pinterestSettings.catalogId || "",
        clientId: pinterestSettings.clientId || "",
        clientSecret: "",
        accessToken: "",
        refreshToken: "",
      });
    }
  }, [pinterestSettings]);

  const handleSave = async () => {
    if (!pinterestSettings?.configured && (!formData.merchantId || !formData.clientId)) {
      toast({ title: "Merchant ID and Client ID are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/pinterest-shopping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save settings");
      }

      toast({ title: "Pinterest Shopping configuration saved" });
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
      const res = await fetch("/api/admin/settings/pinterest-shopping/verify", { method: "POST", credentials: "include" });
      const result = await res.json();
      if (result.success) {
        toast({ title: `Connection verified! ${result.accountName || "Connected"}` });
      } else {
        toast({ title: result.error || "Verification failed", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/integrations/pinterest-shopping/sync", { method: "POST", credentials: "include" });
      const result = await res.json();
      if (result.success) {
        toast({ title: "Pinterest Shopping sync started" });
      } else {
        toast({ title: result.error || "Sync failed", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/admin/settings/pinterest-shopping", { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to remove configuration");
      }
      toast({ title: "Pinterest Shopping configuration removed" });
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
            Pinterest Shopping Configuration
          </DialogTitle>
          <DialogDescription>
            Connect your Pinterest Business account to sync your product catalog.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            {pinterestSettings?.configured && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Pinterest Shopping is configured
                </div>
                {pinterestSettings.lastSyncStatus && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last sync: {pinterestSettings.lastSyncStatus}{pinterestSettings.lastSyncAt ? ` at ${new Date(pinterestSettings.lastSyncAt).toLocaleString()}` : ""}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pinterestMerchantId">Merchant ID</Label>
                <Input
                  id="pinterestMerchantId"
                  value={formData.merchantId}
                  onChange={(e) => setFormData({ ...formData, merchantId: e.target.value })}
                  placeholder="Your Pinterest Merchant ID"
                  data-testid="input-pinterest-merchant-id"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pinterestCatalogId">Catalog ID</Label>
                <Input
                  id="pinterestCatalogId"
                  value={formData.catalogId}
                  onChange={(e) => setFormData({ ...formData, catalogId: e.target.value })}
                  placeholder="Your Catalog ID"
                  data-testid="input-pinterest-catalog-id"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pinterestClientId">Client ID</Label>
              <Input
                id="pinterestClientId"
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                placeholder="Your Client ID"
                data-testid="input-pinterest-client-id"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pinterestClientSecret">Client Secret</Label>
              <SecretInput
                id="pinterestClientSecret"
                value={formData.clientSecret}
                onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                hasSavedValue={pinterestSettings?.hasClientSecret}
                placeholder="Enter your Client Secret"
                data-testid="input-pinterest-client-secret"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pinterestAccessToken">Access Token</Label>
              <SecretInput
                id="pinterestAccessToken"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                hasSavedValue={pinterestSettings?.hasAccessToken}
                placeholder="Enter your Access Token"
                data-testid="input-pinterest-access-token"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pinterestRefreshToken">Refresh Token (optional)</Label>
              <SecretInput
                id="pinterestRefreshToken"
                value={formData.refreshToken}
                onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })}
                hasSavedValue={pinterestSettings?.hasRefreshToken}
                placeholder="Enter your Refresh Token"
                data-testid="input-pinterest-refresh-token"
              />
            </div>

            {pinterestSettings?.configured && (
              <div className="pt-4 border-t flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVerify}
                  disabled={verifying}
                  data-testid="button-verify-pinterest"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TestTube className="w-4 h-4 mr-2" />}
                  Test Connection
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSync}
                  disabled={syncing}
                  data-testid="button-sync-pinterest"
                >
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Sync Now
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {pinterestSettings?.configured && (
            <Button variant="destructive" onClick={handleRemove} disabled={removing} data-testid="button-remove-pinterest">
              {removing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Remove
            </Button>
          )}
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSave} disabled={saving} data-testid="button-save-pinterest">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function YouTubeShoppingConfigDialog({ open, onOpenChange, onSuccess }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    channelId: "",
    merchantId: "",
    clientId: "",
    clientSecret: "",
    accessToken: "",
    refreshToken: "",
  });
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [removing, setRemoving] = useState(false);

  const { data: youtubeSettings, isLoading } = useQuery<YouTubeShoppingSettings>({
    queryKey: ["/api/admin/settings/youtube-shopping"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/youtube-shopping", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch YouTube Shopping settings");
      return res.json();
    },
  });

  useEffect(() => {
    if (youtubeSettings) {
      setFormData({
        channelId: youtubeSettings.channelId || "",
        merchantId: youtubeSettings.merchantId || "",
        clientId: youtubeSettings.clientId || "",
        clientSecret: "",
        accessToken: "",
        refreshToken: "",
      });
    }
  }, [youtubeSettings]);

  const handleSave = async () => {
    if (!youtubeSettings?.configured && (!formData.channelId || !formData.clientId)) {
      toast({ title: "Channel ID and Client ID are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/youtube-shopping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save settings");
      }

      toast({ title: "YouTube Shopping configuration saved" });
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
      const res = await fetch("/api/admin/settings/youtube-shopping/verify", { method: "POST", credentials: "include" });
      const result = await res.json();
      if (result.success) {
        toast({ title: `Connection verified! ${result.channelName || "Connected"}` });
      } else {
        toast({ title: result.error || "Verification failed", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/integrations/youtube-shopping/sync", { method: "POST", credentials: "include" });
      const result = await res.json();
      if (result.success) {
        toast({ title: "YouTube Shopping sync started" });
      } else {
        toast({ title: result.error || "Sync failed", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/admin/settings/youtube-shopping", { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to remove configuration");
      }
      toast({ title: "YouTube Shopping configuration removed" });
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
            YouTube Shopping Configuration
          </DialogTitle>
          <DialogDescription>
            Connect your YouTube channel to showcase and sell products.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            {youtubeSettings?.configured && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  YouTube Shopping is configured
                </div>
                {youtubeSettings.lastSyncStatus && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last sync: {youtubeSettings.lastSyncStatus}{youtubeSettings.lastSyncAt ? ` at ${new Date(youtubeSettings.lastSyncAt).toLocaleString()}` : ""}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="youtubeChannelId">Channel ID</Label>
                <Input
                  id="youtubeChannelId"
                  value={formData.channelId}
                  onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
                  placeholder="Your YouTube Channel ID"
                  data-testid="input-youtube-channel-id"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtubeMerchantId">Merchant ID</Label>
                <Input
                  id="youtubeMerchantId"
                  value={formData.merchantId}
                  onChange={(e) => setFormData({ ...formData, merchantId: e.target.value })}
                  placeholder="Your Merchant ID"
                  data-testid="input-youtube-merchant-id"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtubeClientId">Client ID</Label>
              <Input
                id="youtubeClientId"
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                placeholder="Your Client ID"
                data-testid="input-youtube-client-id"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtubeClientSecret">Client Secret</Label>
              <SecretInput
                id="youtubeClientSecret"
                value={formData.clientSecret}
                onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                hasSavedValue={youtubeSettings?.hasClientSecret}
                placeholder="Enter your Client Secret"
                data-testid="input-youtube-client-secret"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtubeAccessToken">Access Token</Label>
              <SecretInput
                id="youtubeAccessToken"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                hasSavedValue={youtubeSettings?.hasAccessToken}
                placeholder="Enter your Access Token"
                data-testid="input-youtube-access-token"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtubeRefreshToken">Refresh Token (optional)</Label>
              <SecretInput
                id="youtubeRefreshToken"
                value={formData.refreshToken}
                onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })}
                hasSavedValue={youtubeSettings?.hasRefreshToken}
                placeholder="Enter your Refresh Token"
                data-testid="input-youtube-refresh-token"
              />
            </div>

            {youtubeSettings?.configured && (
              <div className="pt-4 border-t flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVerify}
                  disabled={verifying}
                  data-testid="button-verify-youtube"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TestTube className="w-4 h-4 mr-2" />}
                  Test Connection
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSync}
                  disabled={syncing}
                  data-testid="button-sync-youtube"
                >
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Sync Now
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {youtubeSettings?.configured && (
            <Button variant="destructive" onClick={handleRemove} disabled={removing} data-testid="button-remove-youtube">
              {removing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Remove
            </Button>
          )}
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSave} disabled={saving} data-testid="button-save-youtube">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SnapchatShoppingConfigDialog({ open, onOpenChange, onSuccess }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    accountId: "",
    catalogId: "",
    clientId: "",
    clientSecret: "",
    accessToken: "",
    refreshToken: "",
  });
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [removing, setRemoving] = useState(false);

  const { data: snapchatSettings, isLoading } = useQuery<SnapchatShoppingSettings>({
    queryKey: ["/api/admin/settings/snapchat-shopping"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/snapchat-shopping", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch Snapchat Shopping settings");
      return res.json();
    },
  });

  useEffect(() => {
    if (snapchatSettings) {
      setFormData({
        accountId: snapchatSettings.accountId || "",
        catalogId: snapchatSettings.catalogId || "",
        clientId: snapchatSettings.clientId || "",
        clientSecret: "",
        accessToken: "",
        refreshToken: "",
      });
    }
  }, [snapchatSettings]);

  const handleSave = async () => {
    if (!snapchatSettings?.configured && (!formData.accountId || !formData.clientId)) {
      toast({ title: "Account ID and Client ID are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/snapchat-shopping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save settings");
      }

      toast({ title: "Snapchat Shopping configuration saved" });
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
      const res = await fetch("/api/admin/settings/snapchat-shopping/verify", { method: "POST", credentials: "include" });
      const result = await res.json();
      if (result.success) {
        toast({ title: `Connection verified! ${result.accountName || "Connected"}` });
      } else {
        toast({ title: result.error || "Verification failed", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/integrations/snapchat-shopping/sync", { method: "POST", credentials: "include" });
      const result = await res.json();
      if (result.success) {
        toast({ title: "Snapchat Shopping sync started" });
      } else {
        toast({ title: result.error || "Sync failed", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/admin/settings/snapchat-shopping", { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to remove configuration");
      }
      toast({ title: "Snapchat Shopping configuration removed" });
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
            Snapchat Shopping Configuration
          </DialogTitle>
          <DialogDescription>
            Connect your Snapchat Business account to sync your product catalog.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            {snapchatSettings?.configured && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Snapchat Shopping is configured
                </div>
                {snapchatSettings.lastSyncStatus && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last sync: {snapchatSettings.lastSyncStatus}{snapchatSettings.lastSyncAt ? ` at ${new Date(snapchatSettings.lastSyncAt).toLocaleString()}` : ""}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="snapchatAccountId">Account ID</Label>
                <Input
                  id="snapchatAccountId"
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  placeholder="Your Snapchat Account ID"
                  data-testid="input-snapchat-account-id"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="snapchatCatalogId">Catalog ID</Label>
                <Input
                  id="snapchatCatalogId"
                  value={formData.catalogId}
                  onChange={(e) => setFormData({ ...formData, catalogId: e.target.value })}
                  placeholder="Your Catalog ID"
                  data-testid="input-snapchat-catalog-id"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="snapchatClientId">Client ID</Label>
              <Input
                id="snapchatClientId"
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                placeholder="Your Client ID"
                data-testid="input-snapchat-client-id"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="snapchatClientSecret">Client Secret</Label>
              <SecretInput
                id="snapchatClientSecret"
                value={formData.clientSecret}
                onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                hasSavedValue={snapchatSettings?.hasClientSecret}
                placeholder="Enter your Client Secret"
                data-testid="input-snapchat-client-secret"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="snapchatAccessToken">Access Token</Label>
              <SecretInput
                id="snapchatAccessToken"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                hasSavedValue={snapchatSettings?.hasAccessToken}
                placeholder="Enter your Access Token"
                data-testid="input-snapchat-access-token"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="snapchatRefreshToken">Refresh Token (optional)</Label>
              <SecretInput
                id="snapchatRefreshToken"
                value={formData.refreshToken}
                onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })}
                hasSavedValue={snapchatSettings?.hasRefreshToken}
                placeholder="Enter your Refresh Token"
                data-testid="input-snapchat-refresh-token"
              />
            </div>

            {snapchatSettings?.configured && (
              <div className="pt-4 border-t flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVerify}
                  disabled={verifying}
                  data-testid="button-verify-snapchat"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TestTube className="w-4 h-4 mr-2" />}
                  Test Connection
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSync}
                  disabled={syncing}
                  data-testid="button-sync-snapchat"
                >
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Sync Now
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {snapchatSettings?.configured && (
            <Button variant="destructive" onClick={handleRemove} disabled={removing} data-testid="button-remove-snapchat">
              {removing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Remove
            </Button>
          )}
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSave} disabled={saving} data-testid="button-save-snapchat">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function XShoppingConfigDialog({ open, onOpenChange, onSuccess }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    accountId: "",
    catalogId: "",
    clientId: "",
    clientSecret: "",
    accessToken: "",
    refreshToken: "",
  });
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [removing, setRemoving] = useState(false);

  const { data: xSettings, isLoading } = useQuery<XShoppingSettings>({
    queryKey: ["/api/admin/settings/x-shopping"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/x-shopping", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch X Shopping settings");
      return res.json();
    },
  });

  useEffect(() => {
    if (xSettings) {
      setFormData({
        accountId: xSettings.accountId || "",
        catalogId: xSettings.catalogId || "",
        clientId: xSettings.clientId || "",
        clientSecret: "",
        accessToken: "",
        refreshToken: "",
      });
    }
  }, [xSettings]);

  const handleSave = async () => {
    if (!xSettings?.configured && (!formData.accountId || !formData.clientId)) {
      toast({ title: "Account ID and Client ID are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/x-shopping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save settings");
      }

      toast({ title: "X Shopping configuration saved" });
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
      const res = await fetch("/api/admin/settings/x-shopping/verify", { method: "POST", credentials: "include" });
      const result = await res.json();
      if (result.success) {
        toast({ title: `Connection verified! ${result.accountName || "Connected"}` });
      } else {
        toast({ title: result.error || "Verification failed", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/integrations/x-shopping/sync", { method: "POST", credentials: "include" });
      const result = await res.json();
      if (result.success) {
        toast({ title: "X Shopping sync started" });
      } else {
        toast({ title: result.error || "Sync failed", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/admin/settings/x-shopping", { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to remove configuration");
      }
      toast({ title: "X Shopping configuration removed" });
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
            X Shopping Configuration
          </DialogTitle>
          <DialogDescription>
            Connect your X account to showcase and sell products.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            {xSettings?.configured && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  X Shopping is configured
                </div>
                {xSettings.lastSyncStatus && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last sync: {xSettings.lastSyncStatus}{xSettings.lastSyncAt ? ` at ${new Date(xSettings.lastSyncAt).toLocaleString()}` : ""}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="xAccountId">Account ID</Label>
                <Input
                  id="xAccountId"
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  placeholder="Your X Account ID"
                  data-testid="input-x-account-id"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="xCatalogId">Catalog ID</Label>
                <Input
                  id="xCatalogId"
                  value={formData.catalogId}
                  onChange={(e) => setFormData({ ...formData, catalogId: e.target.value })}
                  placeholder="Your Catalog ID"
                  data-testid="input-x-catalog-id"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="xClientId">Client ID</Label>
              <Input
                id="xClientId"
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                placeholder="Your Client ID"
                data-testid="input-x-client-id"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="xClientSecret">Client Secret</Label>
              <SecretInput
                id="xClientSecret"
                value={formData.clientSecret}
                onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                hasSavedValue={xSettings?.hasClientSecret}
                placeholder="Enter your Client Secret"
                data-testid="input-x-client-secret"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="xAccessToken">Access Token</Label>
              <SecretInput
                id="xAccessToken"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                hasSavedValue={xSettings?.hasAccessToken}
                placeholder="Enter your Access Token"
                data-testid="input-x-access-token"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="xRefreshToken">Refresh Token (optional)</Label>
              <SecretInput
                id="xRefreshToken"
                value={formData.refreshToken}
                onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })}
                hasSavedValue={xSettings?.hasRefreshToken}
                placeholder="Enter your Refresh Token"
                data-testid="input-x-refresh-token"
              />
            </div>

            {xSettings?.configured && (
              <div className="pt-4 border-t flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVerify}
                  disabled={verifying}
                  data-testid="button-verify-x"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TestTube className="w-4 h-4 mr-2" />}
                  Test Connection
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSync}
                  disabled={syncing}
                  data-testid="button-sync-x"
                >
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Sync Now
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {xSettings?.configured && (
            <Button variant="destructive" onClick={handleRemove} disabled={removing} data-testid="button-remove-x">
              {removing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Remove
            </Button>
          )}
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSave} disabled={saving} data-testid="button-save-x">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MetaMarketingConfigDialog({ open, onOpenChange, onSuccess }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    pixelId: "",
    catalogId: "",
    productFeedId: "",
    accessToken: "",
    appSecret: "",
    testEventCode: "",
    capiEnabled: false,
  });
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testingEvent, setTestingEvent] = useState(false);
  const [removing, setRemoving] = useState(false);

  const { data: metaSettings, isLoading, refetch: refetchSettings } = useQuery<MetaMarketingSettings>({
    queryKey: ["/api/admin/settings/meta-marketing"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/meta-marketing", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch Meta Marketing settings");
      return res.json();
    },
  });

  const { data: metaStats, refetch: refetchStats } = useQuery<{
    queue: {
      queued: number;
      retry: number;
      processing: number;
      failed: number;
      sent: number;
      oldestQueuedAt: string | null;
      oldestQueuedAgeSeconds: number | null;
      lastSentAt: string | null;
    };
    lastDispatchAt: string | null;
    lastDispatchStatus: string | null;
  }>({
    queryKey: ["/api/admin/integrations/meta-marketing/stats"],
    enabled: open && !!metaSettings?.configured,
    queryFn: async () => {
      const res = await fetch("/api/admin/integrations/meta-marketing/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch Meta Marketing stats");
      return res.json();
    },
  });

  useEffect(() => {
    if (metaSettings) {
      setFormData({
        pixelId: metaSettings.pixelId || "",
        catalogId: metaSettings.catalogId || "",
        productFeedId: metaSettings.productFeedId || "",
        accessToken: "",
        appSecret: "",
        testEventCode: "",
        capiEnabled: metaSettings.capiEnabled === true,
      });
    }
  }, [metaSettings]);

  const handleSave = async () => {
    if (!metaSettings?.configured && !formData.accessToken) {
      toast({ title: "Access Token is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/meta-marketing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save settings");
      }

      toast({ title: "Meta Marketing configuration saved" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: error.message || "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/admin/settings/meta-marketing/verify", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Meta assets verified" });
      } else {
        toast({ title: data.error || "Verification failed", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: error.message || "Verification failed", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/integrations/meta-marketing/sync", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Meta catalog sync triggered" });
      } else {
        toast({ title: data.error || "Sync failed", variant: "destructive" });
      }
      await refetchSettings();
    } catch (error: any) {
      toast({ title: error.message || "Sync failed", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleTestEvent = async () => {
    setTestingEvent(true);
    try {
      const res = await fetch("/api/admin/integrations/meta-marketing/test-event", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Meta test event sent" });
      } else {
        toast({ title: data.error || "Test event failed", variant: "destructive" });
      }
      await refetchSettings();
      await refetchStats();
    } catch (error: any) {
      toast({ title: error.message || "Test event failed", variant: "destructive" });
    } finally {
      setTestingEvent(false);
    }
  };

  const handleCopyFeedUrl = async () => {
    const value = metaSettings?.catalogFeedUrl || "";
    if (!value) {
      toast({ title: "Catalog feed URL is not available yet", variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: "Catalog feed URL copied" });
    } catch {
      toast({ title: "Failed to copy URL", variant: "destructive" });
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/admin/settings/meta-marketing", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to remove configuration");
      }
      toast({ title: "Meta Marketing configuration removed" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: error.message || "Failed to remove configuration", variant: "destructive" });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Meta Catalog + CAPI Configuration
          </DialogTitle>
          <DialogDescription>
            Configure feed-based catalog sync and server-side Conversions API events.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            {metaSettings?.configured && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Meta Marketing is configured
                </div>
                <div className="text-xs text-muted-foreground mt-1 space-y-1">
                  <p>
                    Catalog sync: {metaSettings.lastSyncStatus || "never"}
                    {metaSettings.lastSyncAt ? ` at ${new Date(metaSettings.lastSyncAt).toLocaleString()}` : ""}
                  </p>
                  <p>
                    CAPI dispatch: {metaSettings.capiLastDispatchStatus || "never"}
                    {metaSettings.capiLastDispatchAt ? ` at ${new Date(metaSettings.capiLastDispatchAt).toLocaleString()}` : ""}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="metaPixelId">Pixel ID</Label>
                <Input
                  id="metaPixelId"
                  value={formData.pixelId}
                  onChange={(e) => setFormData({ ...formData, pixelId: e.target.value })}
                  placeholder="Meta Pixel ID"
                  data-testid="input-meta-pixel-id"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="metaCatalogId">Catalog ID</Label>
                <Input
                  id="metaCatalogId"
                  value={formData.catalogId}
                  onChange={(e) => setFormData({ ...formData, catalogId: e.target.value })}
                  placeholder="Meta Catalog ID"
                  data-testid="input-meta-catalog-id"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaProductFeedId">Product Feed ID</Label>
              <Input
                id="metaProductFeedId"
                value={formData.productFeedId}
                onChange={(e) => setFormData({ ...formData, productFeedId: e.target.value })}
                placeholder="Meta Product Feed ID"
                data-testid="input-meta-product-feed-id"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaAccessToken">Access Token</Label>
              <SecretInput
                id="metaAccessToken"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                hasSavedValue={metaSettings?.hasAccessToken}
                placeholder="Enter Meta access token"
                data-testid="input-meta-access-token"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaAppSecret">App Secret (recommended for appsecret_proof)</Label>
              <SecretInput
                id="metaAppSecret"
                value={formData.appSecret}
                onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                hasSavedValue={metaSettings?.hasAppSecret}
                placeholder="Enter Meta app secret"
                data-testid="input-meta-app-secret"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaTestEventCode">Test Event Code (optional)</Label>
              <SecretInput
                id="metaTestEventCode"
                value={formData.testEventCode}
                onChange={(e) => setFormData({ ...formData, testEventCode: e.target.value })}
                hasSavedValue={metaSettings?.hasTestEventCode}
                placeholder="Enter Meta test event code"
                data-testid="input-meta-test-event-code"
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Enable CAPI dispatcher</p>
                <p className="text-xs text-muted-foreground">When enabled, queued server-side events are dispatched to Meta.</p>
              </div>
              <Switch
                checked={formData.capiEnabled}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, capiEnabled: checked }))}
                data-testid="switch-meta-capi-enabled"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaCatalogFeedUrl">Catalog Feed URL</Label>
              {metaSettings?.configured && metaSettings.catalogFeedUrl ? (
                <div className="flex gap-2">
                  <Input
                    id="metaCatalogFeedUrl"
                    value={metaSettings.catalogFeedUrl || ""}
                    readOnly
                    data-testid="input-meta-catalog-feed-url"
                  />
                  <Button type="button" variant="outline" onClick={handleCopyFeedUrl} data-testid="button-copy-meta-feed-url">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground" data-testid="text-meta-feed-url-hint">
                  Save your configuration to generate a catalog feed URL you can use in Meta Commerce Manager.
                </p>
              )}
            </div>

            {metaSettings?.configured && (
              <>
                <div className="pt-2 border-t flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={handleVerify} disabled={verifying} data-testid="button-verify-meta">
                    {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TestTube className="w-4 h-4 mr-2" />}
                    Verify
                  </Button>
                  <Button type="button" variant="outline" onClick={handleSync} disabled={syncing} data-testid="button-sync-meta">
                    {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    Sync Now
                  </Button>
                  <Button type="button" variant="outline" onClick={handleTestEvent} disabled={testingEvent} data-testid="button-test-event-meta">
                    {testingEvent ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                    Send Test Event
                  </Button>
                </div>

                {metaStats && (
                  <div className="rounded-md border p-3 text-xs space-y-1">
                    <p className="font-medium text-sm">Queue Stats</p>
                    <p>Queued: {metaStats.queue.queued}</p>
                    <p>Retry: {metaStats.queue.retry}</p>
                    <p>Processing: {metaStats.queue.processing}</p>
                    <p>Failed: {metaStats.queue.failed}</p>
                    <p>Sent: {metaStats.queue.sent}</p>
                    <p>
                      Oldest queued: {metaStats.queue.oldestQueuedAt ? new Date(metaStats.queue.oldestQueuedAt).toLocaleString() : "n/a"}
                    </p>
                    <p>Oldest queued age (sec): {metaStats.queue.oldestQueuedAgeSeconds ?? "n/a"}</p>
                    <p>
                      Last sent: {metaStats.queue.lastSentAt ? new Date(metaStats.queue.lastSentAt).toLocaleString() : "n/a"}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {metaSettings?.configured && (
            <Button variant="destructive" onClick={handleRemove} disabled={removing} data-testid="button-remove-meta">
              {removing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Remove
            </Button>
          )}
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleSave}
            disabled={saving}
            data-testid="button-save-meta"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MailchimpConfigDialog({ open, onOpenChange, onSuccess }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    apiKey: "",
    serverPrefix: "",
    audienceId: "",
  });
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [removing, setRemoving] = useState(false);

  const { data: mailchimpSettings, isLoading } = useQuery<MailchimpSettings>({
    queryKey: ["/api/admin/settings/mailchimp"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/mailchimp", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch Mailchimp settings");
      return res.json();
    },
  });

  useEffect(() => {
    if (mailchimpSettings) {
      setFormData({
        apiKey: "",
        serverPrefix: mailchimpSettings.serverPrefix || "",
        audienceId: mailchimpSettings.audienceId || "",
      });
    }
  }, [mailchimpSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/mailchimp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save configuration");
      }

      toast({ title: "Mailchimp configuration saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/mailchimp"] });
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
      const res = await fetch("/api/admin/settings/mailchimp/verify", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (data.success) {
        toast({ title: `Mailchimp connected: ${data.accountName}` });
      } else {
        toast({ title: data.error || "Verification failed", variant: "destructive" });
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
      const res = await fetch("/api/admin/settings/mailchimp", { method: "DELETE", credentials: "include" });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to remove configuration");
      }

      toast({ title: "Mailchimp configuration removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/mailchimp"] });
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
            <Mail className="w-5 h-5" />
            Mailchimp Configuration
          </DialogTitle>
          <DialogDescription>
            Configure Mailchimp for email marketing and audience management. Your API key is encrypted and stored securely.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            {mailchimpSettings?.configured && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Mailchimp is configured
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="mailchimpApiKey">API Key</Label>
              <SecretInput
                id="mailchimpApiKey"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                hasSavedValue={mailchimpSettings?.hasApiKey}
                placeholder="Enter your Mailchimp API key"
                data-testid="input-mailchimp-api-key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mailchimpServerPrefix">Server Prefix</Label>
              <Input
                id="mailchimpServerPrefix"
                value={formData.serverPrefix}
                onChange={(e) => setFormData({ ...formData, serverPrefix: e.target.value })}
                placeholder="e.g. us1"
                data-testid="input-mailchimp-server-prefix"
              />
              <p className="text-xs text-muted-foreground">
                The server prefix from your Mailchimp API key (the part after the dash, e.g. "us1")
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mailchimpAudienceId">Audience ID</Label>
              <Input
                id="mailchimpAudienceId"
                value={formData.audienceId}
                onChange={(e) => setFormData({ ...formData, audienceId: e.target.value })}
                placeholder="Enter your Audience/List ID"
                data-testid="input-mailchimp-audience-id"
              />
              <p className="text-xs text-muted-foreground">
                Found under Audience &gt; Settings &gt; Audience name and defaults
              </p>
            </div>

            {mailchimpSettings?.configured && (
              <div className="pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVerify}
                  disabled={verifying}
                  data-testid="button-verify-mailchimp"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TestTube className="w-4 h-4 mr-2" />}
                  Test Connection
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {mailchimpSettings?.configured && (
            <Button variant="destructive" onClick={handleRemove} disabled={removing} data-testid="button-remove-mailchimp">
              {removing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Remove
            </Button>
          )}
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSave} disabled={saving} data-testid="button-save-mailchimp">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GooglePlacesConfigDialog({ open, onOpenChange, onSuccess }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const { data: settings, isLoading } = useQuery<{ configured: boolean; apiKeyMasked: string | null; placeId: string }>({
    queryKey: ["/api/admin/integrations/settings/google-places"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/admin/integrations/settings/google-places", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch Google Places settings");
      return res.json();
    },
  });

  useEffect(() => {
    if (settings) {
      setPlaceId(settings.placeId || "");
      setApiKey("");
    }
  }, [settings]);

  const handleSave = async () => {
    if (!apiKey && !settings?.configured) {
      toast({ title: "API key is required", variant: "destructive" });
      return;
    }
    if (!placeId) {
      toast({ title: "Place ID is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const body: any = { placeId };
      if (apiKey) body.apiKey = apiKey;
      const res = await fetch("/api/admin/integrations/settings/google-places", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save");
      }
      toast({ title: "Google Places configuration saved" });
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
      const res = await fetch("/api/admin/integrations/settings/google-places", { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to remove");
      toast({ title: "Google Places configuration removed" });
      setApiKey("");
      setPlaceId("");
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            Google Reviews Configuration
          </DialogTitle>
          <DialogDescription>
            Connect your Google Business Profile to auto-fetch 5-star reviews for testimonials blocks.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {settings?.configured && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-500">Google Places is configured</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="google-api-key">Google API Key</Label>
              <SecretInput
                id="google-api-key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                hasSavedValue={settings?.configured}
                placeholder="AIzaSy..."
                data-testid="input-google-api-key"
              />
              <p className="text-xs text-muted-foreground">
                Enable the Places API in your Google Cloud project.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="google-place-id">Google Place ID</Label>
              <Input
                id="google-place-id"
                value={placeId}
                onChange={(e) => setPlaceId(e.target.value)}
                placeholder="ChIJ..."
                data-testid="input-google-place-id"
              />
              <p className="text-xs text-muted-foreground">
                Find your Place ID at{" "}
                <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Google Place ID Finder
                </a>
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {settings?.configured && (
            <Button variant="destructive" onClick={handleRemove} disabled={removing} data-testid="button-remove-google-places">
              {removing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Remove
            </Button>
          )}
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSave} disabled={saving} data-testid="button-save-google-places">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TwilioSettings {
  enabled: boolean;
  accountSid: string;
  phoneNumber: string;
  authTokenSet: boolean;
  envConfigured: boolean;
}

function TwilioConfigDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  const { data: settings, isLoading } = useQuery<TwilioSettings>({
    queryKey: ["/api/admin/settings/twilio"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/twilio", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch Twilio settings");
      return res.json();
    },
  });

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setAccountSid(settings.accountSid || "");
      setPhoneNumber(settings.phoneNumber || "");
      setAuthToken("");
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: any = { enabled, accountSid, phoneNumber };
      if (authToken.trim()) {
        body.authToken = authToken.trim();
      }
      const res = await fetch("/api/admin/settings/twilio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save");
      }
      toast({ title: "Twilio settings saved" });
      setAuthToken("");
      onSuccess();
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone.trim()) {
      toast({ title: "Enter a phone number to send a test SMS", variant: "destructive" });
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch("/api/admin/settings/twilio/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ toPhoneNumber: testPhone.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send test SMS");
      }
      toast({ title: "Test SMS sent successfully" });
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Twilio SMS Configuration
          </DialogTitle>
          <DialogDescription>
            Configure Twilio for SMS-based affiliate invite phone verification.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {settings?.envConfigured && !settings?.enabled && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-500">Using environment variable configuration</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="twilio-enabled">Enable SMS Verification</Label>
                <p className="text-xs text-muted-foreground">Enable DB-configured Twilio credentials</p>
              </div>
              <Switch
                id="twilio-enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
                data-testid="switch-twilio-enabled"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twilio-account-sid">Account SID</Label>
              <Input
                id="twilio-account-sid"
                value={accountSid}
                onChange={(e) => setAccountSid(e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                data-testid="input-twilio-account-sid"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twilio-auth-token">Auth Token</Label>
              <SecretInput
                id="twilio-auth-token"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                hasSavedValue={settings?.authTokenSet}
                placeholder="Enter auth token"
                data-testid="input-twilio-auth-token"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twilio-phone-number">From Phone Number</Label>
              <Input
                id="twilio-phone-number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+15551234567"
                data-testid="input-twilio-phone-number"
              />
              <p className="text-xs text-muted-foreground">E.164 format (e.g. +15551234567)</p>
            </div>

            <div className="border-t pt-4 space-y-2">
              <Label>Send Test SMS</Label>
              <div className="flex gap-2">
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+15559876543"
                  data-testid="input-twilio-test-phone"
                />
                <Button
                  variant="outline"
                  onClick={handleSendTest}
                  disabled={sendingTest}
                  data-testid="button-send-test-sms"
                >
                  {sendingTest ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TestTube className="w-4 h-4 mr-2" />}
                  Test
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSave} disabled={saving} data-testid="button-save-twilio">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
