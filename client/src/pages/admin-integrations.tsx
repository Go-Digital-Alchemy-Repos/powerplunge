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
import { CheckCircle2, XCircle, ExternalLink, Key, CreditCard, Loader2, TestTube, AlertCircle, Save, HardDrive, Mail, Brain, Link2, Copy, ShoppingBag, Instagram, RefreshCw, Users, Star, MapPin, Shield, Zap, Eye, EyeOff } from "lucide-react";
import AdminNav from "@/components/admin/AdminNav";

interface IntegrationStatus {
  stripe: boolean;
  stripeMode?: string;
  stripeActiveMode?: string;
  stripeTestConfigured?: boolean;
  stripeLiveConfigured?: boolean;
  stripeWebhook: boolean;
  mailgun: boolean;
  cloudflareR2?: boolean;
  openai?: boolean;
  tiktokShop?: boolean;
  instagramShop?: boolean;
  pinterestShopping?: boolean;
  youtubeShopping?: boolean;
  snapchatShopping?: boolean;
  xShopping?: boolean;
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

interface StripeEnvStatus {
  configured: boolean;
  publishableKeyMasked?: string | null;
  hasWebhookSecret: boolean;
}

interface StripeSettings {
  configured: boolean;
  activeMode: string;
  test: StripeEnvStatus;
  live: StripeEnvStatus;
  hasConnectWebhookSecret?: boolean;
  connectWebhookSecretSource?: string;
  legacy?: {
    mode: string;
    publishableKeyMasked?: string | null;
    hasWebhookSecret: boolean;
  } | null;
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
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${integrations.stripeActiveMode === "live" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"}`} data-testid="badge-stripe-active-mode">
                      Active: {integrations.stripeActiveMode === "live" ? "Live" : "Test"}
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
              {integrations?.stripe && (
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1" data-testid="status-stripe-test">
                    {integrations.stripeTestConfigured ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-muted-foreground" />}
                    Test {integrations.stripeTestConfigured ? "configured" : "not set"}
                  </span>
                  <span className="flex items-center gap-1" data-testid="status-stripe-live">
                    {integrations.stripeLiveConfigured ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-muted-foreground" />}
                    Live {integrations.stripeLiveConfigured ? "configured" : "not set"}
                  </span>
                </div>
              )}
              <div className="mt-3 text-xs text-muted-foreground">
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                Pinterest Shopping
              </CardTitle>
              <CardDescription>
                Sync your product catalog to Pinterest for shopping ads and pins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <StatusBadge configured={integrations?.pinterestShopping} />
                <Button 
                  variant="outline" 
                  onClick={() => setShowPinterestDialog(true)}
                  data-testid="button-configure-pinterest"
                >
                  Configure
                </Button>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                <a href="https://developers.pinterest.com/docs/shopping/overview/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Get your credentials from Pinterest for Developers <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                YouTube Shopping
              </CardTitle>
              <CardDescription>
                Connect your YouTube channel to showcase products in videos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <StatusBadge configured={integrations?.youtubeShopping} />
                <Button 
                  variant="outline" 
                  onClick={() => setShowYouTubeDialog(true)}
                  data-testid="button-configure-youtube"
                >
                  Configure
                </Button>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                <a href="https://developers.google.com/youtube/v3" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Get your credentials from Google for Developers <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                Snapchat Shopping
              </CardTitle>
              <CardDescription>
                Sync your product catalog to Snapchat for shopping ads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <StatusBadge configured={integrations?.snapchatShopping} />
                <Button 
                  variant="outline" 
                  onClick={() => setShowSnapchatDialog(true)}
                  data-testid="button-configure-snapchat"
                >
                  Configure
                </Button>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                <a href="https://developers.snap.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Get your credentials from Snap for Developers <ExternalLink className="w-3 h-3" />
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
                <ShoppingBag className="w-5 h-5 text-primary" />
                X Shopping
              </CardTitle>
              <CardDescription>
                Connect your X account to showcase products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <StatusBadge configured={integrations?.xShopping} />
                <Button 
                  variant="outline" 
                  onClick={() => setShowXDialog(true)}
                  data-testid="button-configure-x"
                >
                  Configure
                </Button>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                <a href="https://developer.x.com/en/docs" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Get your credentials from X Developer Portal <ExternalLink className="w-3 h-3" />
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

function StripeEnvPanel({ env, stripeSettings, onSaved }: {
  env: "test" | "live";
  stripeSettings: StripeSettings | undefined;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [publishableKey, setPublishableKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<{ valid?: boolean; error?: string; accountName?: string } | null>(null);

  const envStatus = env === "test" ? stripeSettings?.test : stripeSettings?.live;
  const prefix = env === "test" ? "pk_test_" : "pk_live_";
  const skPrefix = env === "test" ? "sk_test_" : "sk_live_";
  const isLive = env === "live";

  const pkError = publishableKey && !publishableKey.startsWith(prefix) ? `Must start with ${prefix}` : null;
  const skError = secretKey && !secretKey.startsWith(skPrefix) ? `Must start with ${skPrefix}` : null;
  const hasErrors = !!pkError || !!skError;

  const handleValidate = async () => {
    if (!publishableKey || !secretKey) {
      toast({ title: "Both keys are required to validate", variant: "destructive" });
      return;
    }
    setValidating(true);
    try {
      const res = await fetch("/api/admin/settings/stripe/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publishableKey, secretKey }),
        credentials: "include",
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
    if (!publishableKey && !secretKey && !webhookSecret) {
      toast({ title: "No changes to save", variant: "destructive" });
      return;
    }
    if ((publishableKey || secretKey) && (!publishableKey || !secretKey)) {
      toast({ title: "Both Publishable Key and Secret Key are required", variant: "destructive" });
      return;
    }
    if (hasErrors) {
      toast({ title: "Fix key prefix errors before saving", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const body: any = { environment: env };
      if (publishableKey) body.publishableKey = publishableKey;
      if (secretKey) body.secretKey = secretKey;
      if (webhookSecret) body.webhookSecret = webhookSecret;

      const res = await fetch("/api/admin/settings/stripe", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save settings");
      }
      toast({ title: `${env === "live" ? "Live" : "Test"} Stripe settings saved` });
      setPublishableKey("");
      setSecretKey("");
      setWebhookSecret("");
      setValidation(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/stripe"] });
      onSaved();
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {isLive && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg" data-testid="warning-live-mode">
          <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            Live mode processes real charges. Double-check your keys before saving.
          </div>
        </div>
      )}

      {envStatus?.configured && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            {env === "live" ? "Live" : "Test"} keys configured
          </div>
          {envStatus.publishableKeyMasked && (
            <p className="text-xs text-muted-foreground mt-1 font-mono">{envStatus.publishableKeyMasked}</p>
          )}
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>Webhook: {envStatus.hasWebhookSecret ? "configured" : "not set"}</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Publishable Key</Label>
        <SecretInput
          value={publishableKey}
          onChange={(e) => { setPublishableKey(e.target.value); setValidation(null); }}
          hasSavedValue={envStatus?.configured}
          placeholder="Enter publishable key"
          data-testid={`input-stripe-pk-${env}`}
        />
        {pkError && <p className="text-xs text-red-500">{pkError}</p>}
      </div>

      <div className="space-y-2">
        <Label>Secret Key</Label>
        <SecretInput
          value={secretKey}
          onChange={(e) => { setSecretKey(e.target.value); setValidation(null); }}
          hasSavedValue={envStatus?.configured}
          placeholder="Enter secret key"
          data-testid={`input-stripe-sk-${env}`}
        />
        {skError && <p className="text-xs text-red-500">{skError}</p>}
      </div>

      <div className="space-y-2">
        <Label>{env === "live" ? "Live" : "Test"} Payment Webhook Secret</Label>
        <SecretInput
          value={webhookSecret}
          onChange={(e) => setWebhookSecret(e.target.value)}
          hasSavedValue={envStatus?.hasWebhookSecret}
          placeholder="whsec_..."
          data-testid={`input-stripe-webhook-${env}`}
        />
        <p className="text-xs text-muted-foreground">
          Verifies webhook signatures for {env} mode payment events.
        </p>
      </div>

      <div className="p-3 bg-muted/50 border rounded-lg space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Link2 className="w-4 h-4" />
          Payment Webhook URL
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-background px-2 py-1.5 rounded border font-mono break-all" data-testid={`text-webhook-url-${env}`}>
            {window.location.origin}/api/webhook/stripe
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/api/webhook/stripe`);
              toast({ title: "Payment webhook URL copied" });
            }}
            data-testid={`button-copy-webhook-url-${env}`}
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Add this URL in your Stripe Dashboard under Developers &rarr; Webhooks for {env} mode.
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

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={handleValidate}
          disabled={validating || !publishableKey || !secretKey || hasErrors}
          data-testid={`button-validate-stripe-${env}`}
        >
          {validating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          Validate
        </Button>
        <Button
          className="flex-1"
          onClick={handleSave}
          disabled={saving || hasErrors || (!publishableKey && !secretKey && !webhookSecret)}
          data-testid={`button-save-stripe-${env}`}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save {env === "live" ? "Live" : "Test"} Config
        </Button>
      </div>
    </div>
  );
}

function StripeConfigDialog({ open, onOpenChange, onSuccess }: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connectWebhookSecret, setConnectWebhookSecret] = useState("");
  const [savingConnect, setSavingConnect] = useState(false);
  const [togglingMode, setTogglingMode] = useState(false);

  const { data: stripeSettings, isLoading, refetch } = useQuery<StripeSettings>({
    queryKey: ["/api/admin/settings/stripe"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/stripe", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch Stripe settings");
      return res.json();
    },
  });

  const activeMode = stripeSettings?.activeMode || "test";
  const isLiveActive = activeMode === "live";

  const handleToggleMode = async (newMode: "test" | "live") => {
    if (newMode === activeMode) return;
    setTogglingMode(true);
    try {
      const res = await fetch("/api/admin/settings/stripe", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeMode: newMode }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update mode");
      }
      toast({ title: `Switched to ${newMode === "live" ? "Live" : "Test"} mode` });
      refetch();
      onSuccess();
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setTogglingMode(false);
    }
  };

  const handleSaveConnect = async () => {
    if (!connectWebhookSecret) return;
    setSavingConnect(true);
    try {
      const res = await fetch("/api/admin/settings/stripe", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectWebhookSecret }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save settings");
      }
      toast({ title: "Connect webhook secret saved" });
      setConnectWebhookSecret("");
      refetch();
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setSavingConnect(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Stripe Configuration
            </DialogTitle>
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${isLiveActive ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"}`} data-testid="badge-dialog-active-mode">
              {isLiveActive ? "Live Mode Active" : "Test Mode Active"}
            </span>
          </div>
          <DialogDescription>
            Configure test and live Stripe credentials independently. All keys are encrypted and stored securely.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className={`p-4 rounded-lg border ${isLiveActive ? "bg-red-500/5 border-red-500/20" : "bg-blue-500/5 border-blue-500/20"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Active Processing Mode
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isLiveActive ? "Real charges are being processed." : "Using test keys. No real charges."}
                  </p>
                </div>
                <div className="flex items-center gap-3" data-testid="stripe-mode-toggle">
                  <span className={`text-xs font-medium ${!isLiveActive ? "text-blue-400" : "text-muted-foreground"}`}>Test</span>
                  <Switch
                    checked={isLiveActive}
                    onCheckedChange={(checked) => handleToggleMode(checked ? "live" : "test")}
                    disabled={togglingMode}
                    data-testid="switch-stripe-mode"
                  />
                  <span className={`text-xs font-medium ${isLiveActive ? "text-red-400" : "text-muted-foreground"}`}>Live</span>
                </div>
              </div>
              {isLiveActive && (
                <div className="mt-2 p-2 bg-red-500/10 rounded border border-red-500/20">
                  <p className="text-xs text-red-400 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Live mode processes real charges. Make sure your live keys are correct.
                  </p>
                </div>
              )}
            </div>

            <Tabs defaultValue="test" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="test" className="flex items-center gap-2" data-testid="tab-stripe-test">
                  <TestTube className="w-3.5 h-3.5" />
                  Test Configuration
                  {stripeSettings?.test?.configured && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                </TabsTrigger>
                <TabsTrigger value="live" className="flex items-center gap-2" data-testid="tab-stripe-live">
                  <Shield className="w-3.5 h-3.5" />
                  Live Configuration
                  {stripeSettings?.live?.configured && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="test" className="mt-4" data-testid="panel-stripe-test">
                <StripeEnvPanel env="test" stripeSettings={stripeSettings} onSaved={() => { refetch(); onSuccess(); }} />
              </TabsContent>
              <TabsContent value="live" className="mt-4" data-testid="panel-stripe-live">
                <StripeEnvPanel env="live" stripeSettings={stripeSettings} onSaved={() => { refetch(); onSuccess(); }} />
              </TabsContent>
            </Tabs>

            <div className="border-t pt-4 space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-500" />
                  Stripe Connect Webhook (shared across modes)
                </h3>
                <p className="text-xs text-muted-foreground">
                  For affiliate bank account updates. This webhook is shared across test and live modes.
                </p>
              </div>

              <div className="space-y-4 pl-1 border-l-2 border-orange-500/20 ml-1">
                {stripeSettings?.hasConnectWebhookSecret && !connectWebhookSecret && (
                  <div className="p-2 ml-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center gap-2 text-green-500 text-xs font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      Connect webhook secret is configured
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-5">
                      Source: {stripeSettings.connectWebhookSecretSource === "database" ? "Admin Configuration" : "Environment Variable"}
                    </p>
                  </div>
                )}
                {!stripeSettings?.hasConnectWebhookSecret && !connectWebhookSecret && (
                  <div className="p-2 ml-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-500 text-xs font-medium">
                      <AlertCircle className="w-3 h-3" />
                      Connect webhook secret not configured
                    </div>
                  </div>
                )}

                <div className="space-y-2 pl-3">
                  <Label>Connect Webhook Secret</Label>
                  <div className="flex gap-2">
                    <SecretInput
                      value={connectWebhookSecret}
                      onChange={(e) => setConnectWebhookSecret(e.target.value)}
                      hasSavedValue={stripeSettings?.hasConnectWebhookSecret}
                      placeholder="whsec_..."
                      data-testid="input-stripe-connect-webhook-secret"
                    />
                    <Button
                      onClick={handleSaveConnect}
                      disabled={savingConnect || !connectWebhookSecret}
                      data-testid="button-save-connect-webhook"
                    >
                      {savingConnect ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="p-3 ml-3 bg-orange-500/5 border border-orange-500/20 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Link2 className="w-4 h-4 text-orange-500" />
                    Connect Webhook URL
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-background px-2 py-1.5 rounded border font-mono break-all" data-testid="text-connect-webhook-url">
                      {window.location.origin}/api/webhook/stripe-connect
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/webhook/stripe-connect`);
                        toast({ title: "Connect webhook URL copied" });
                      }}
                      data-testid="button-copy-connect-webhook-url"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add as a <strong>separate</strong> webhook in Stripe Dashboard. Listen for: <code className="text-xs">account.updated</code>, <code className="text-xs">capability.updated</code>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-stripe-dialog">Close</Button>
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
      const res = await fetch("/api/admin/settings/tiktok-shop", { credentials: "include" });
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
        credentials: "include",
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
      const res = await fetch("/api/admin/settings/tiktok-shop/verify", { method: "POST", credentials: "include" });
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
      const res = await fetch("/api/admin/settings/tiktok-shop", { method: "DELETE", credentials: "include" });
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
              <SecretInput
                id="tiktokAppSecret"
                value={formData.appSecret}
                onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                hasSavedValue={tiktokSettings?.hasAppSecret}
                placeholder="Enter your App Secret"
                data-testid="input-tiktok-app-secret"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktokAccessToken">Access Token</Label>
              <SecretInput
                id="tiktokAccessToken"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                hasSavedValue={tiktokSettings?.hasAccessToken}
                placeholder="Enter your Access Token"
                data-testid="input-tiktok-access-token"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktokRefreshToken">Refresh Token (optional)</Label>
              <SecretInput
                id="tiktokRefreshToken"
                value={formData.refreshToken}
                onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })}
                hasSavedValue={tiktokSettings?.hasRefreshToken}
                placeholder="Enter your Refresh Token"
                data-testid="input-tiktok-refresh-token"
              />
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

            <div className="space-y-2">
              <Label htmlFor="instagramAccessToken">Access Token</Label>
              <SecretInput
                id="instagramAccessToken"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                hasSavedValue={instagramSettings?.hasAccessToken}
                placeholder="Enter your Access Token"
                data-testid="input-instagram-access-token"
              />
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
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-pinterest">
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
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-youtube">
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
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-snapchat">
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
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-x">
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
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-mailchimp">
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
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-google-places">
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
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-twilio">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
