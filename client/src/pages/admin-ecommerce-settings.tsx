import React, { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { CreditCard, ShoppingBag, Instagram, Send, Star, ExternalLink, CheckCircle2, XCircle, Link2, Youtube, Ghost, Tag, ArrowRight, Loader2, TestTube, AlertCircle, Save, Copy, Key, Users, Zap, Shield, Eye, EyeOff, CircleDot } from "lucide-react";
import AdminNav from "@/components/admin/AdminNav";
import { TikTokShopConfigDialog, MetaMarketingConfigDialog } from "@/pages/admin-integrations";

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

interface IntegrationStatus {
  stripe: boolean;
  stripeMode?: string;
  stripeActiveMode?: string;
  stripeTestConfigured?: boolean;
  stripeLiveConfigured?: boolean;
  [key: string]: any;
}

function StatusBadge({ configured }: { configured?: boolean }) {
  if (configured) {
    return (
      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[11px] font-medium border border-green-500/20">
        <CheckCircle2 className="w-3 h-3" />
        Configured
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium border border-border">
      <XCircle className="w-3 h-3" />
      Not Configured
    </span>
  );
}

export default function AdminEcommerceSettings() {
  const { role } = useAdmin();
  const { toast } = useToast();
  const [showStripeDialog, setShowStripeDialog] = useState(false);
  const [showTikTokDialog, setShowTikTokDialog] = useState(false);
  const [showMetaDialog, setShowMetaDialog] = useState(false);
  
  const { data: integrations, refetch: refetchIntegrations } = useQuery<IntegrationStatus>({
    queryKey: ["/api/admin/integrations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/integrations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch integrations");
      return res.json();
    },
  });

  const { data: couponStats } = useQuery<any>({
    queryKey: ["/api/coupons/admin/analytics"],
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get("tiktok_oauth");
    if (!oauthStatus) return;

    const reason = params.get("reason");
    if (oauthStatus === "success") {
      toast({ title: "TikTok authorization completed" });
      setShowTikTokDialog(true);
      refetchIntegrations();
    } else {
      toast({
        title: reason ? `TikTok authorization failed: ${reason}` : "TikTok authorization failed",
        variant: "destructive",
      });
      setShowTikTokDialog(true);
    }

    params.delete("tiktok_oauth");
    params.delete("reason");
    const query = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [toast, refetchIntegrations]);

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="ecommerce-settings" role={role} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">E-Commerce Settings</h2>
          <p className="text-muted-foreground mt-2">
            Manage your store integrations and shopping channel connections.
          </p>
        </div>

        <div className="space-y-6">
          {/* Stripe Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="w-5 h-5 text-primary" />
                Stripe Payments
              </CardTitle>
              <CardDescription>Accept credit card payments, Apple Pay, and Google Pay</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <StatusBadge configured={integrations?.stripe} />
                <Button 
                  variant="outline" 
                  onClick={() => setShowStripeDialog(true)}
                  data-testid="button-configure-stripe"
                >
                  Configure
                </Button>
              </div>
              {integrations?.stripe && (
                <div className="mt-3 text-xs text-muted-foreground">
                  Mode: <span className="font-medium capitalize">{integrations.stripeActiveMode || integrations.stripeMode || "test"}</span>
                  {integrations.stripeTestConfigured && <span className="ml-2">· Test ✓</span>}
                  {integrations.stripeLiveConfigured && <span className="ml-2">· Live ✓</span>}
                </div>
              )}
              <div className="mt-4 text-xs text-muted-foreground">
                <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Get your API keys from Stripe Dashboard <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>

          {/* ShipStation API integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Send className="w-5 h-5 text-primary" />
                ShipStation
              </CardTitle>
              <CardDescription>Automate your shipping and fulfillment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input placeholder="Enter ShipStation API Key" type="password" />
                </div>
                <div className="space-y-2">
                  <Label>API Secret</Label>
                  <Input placeholder="Enter ShipStation API Secret" type="password" />
                </div>
              </div>
              <Button className="w-full">Save ShipStation Configuration</Button>
            </CardContent>
          </Card>

          {/* Shopping Integrations (Moved from main integrations) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingBag className="w-5 h-5 text-primary" />
                Shopping Channels
              </CardTitle>
              <CardDescription>Connect and sync your products across social platforms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Meta Catalog + CAPI */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-3">
                  <CircleDot className="w-5 h-5" />
                  <div>
                    <p className="font-medium text-sm">Meta Catalog + CAPI</p>
                    <StatusBadge configured={integrations?.metaMarketing} />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMetaDialog(true)}
                  data-testid="button-configure-meta-marketing-ecommerce"
                >
                  Configure
                </Button>
              </div>

              {/* TikTok Shop */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5" />
                  <div>
                    <p className="font-medium text-sm">TikTok Shop</p>
                    <StatusBadge configured={integrations?.tiktokShop} />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTikTokDialog(true)}
                  data-testid="button-configure-tiktok-ecommerce"
                >
                  Configure
                </Button>
              </div>

              {/* Instagram Shop */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-3">
                  <Instagram className="w-5 h-5" />
                  <div>
                    <p className="font-medium text-sm">Instagram Shop</p>
                    <StatusBadge configured={integrations?.instagramShop} />
                  </div>
                </div>
                <Button variant="ghost" size="sm">Configure</Button>
              </div>

              {/* YouTube Shopping */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-3">
                  <Youtube className="w-5 h-5" />
                  <div>
                    <p className="font-medium text-sm">YouTube Shopping</p>
                    <StatusBadge configured={integrations?.youtubeShopping} />
                  </div>
                </div>
                <Button variant="ghost" size="sm">Configure</Button>
              </div>

              {/* Snapchat Shopping */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-3">
                  <Ghost className="w-5 h-5" />
                  <div>
                    <p className="font-medium text-sm">Snapchat Shopping</p>
                    <StatusBadge configured={integrations?.snapchatShopping} />
                  </div>
                </div>
                <Button variant="ghost" size="sm">Configure</Button>
              </div>

              {/* X Shopping */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-3">
                  <Link2 className="w-5 h-5" />
                  <div>
                    <p className="font-medium text-sm">X Shopping</p>
                    <StatusBadge configured={integrations?.xShopping} />
                  </div>
                </div>
                <Button variant="ghost" size="sm">Configure</Button>
              </div>

              {/* Pinterest Shopping */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5" />
                  <div>
                    <p className="font-medium text-sm">Pinterest Shopping</p>
                    <StatusBadge configured={integrations?.pinterestShopping} />
                  </div>
                </div>
                <Button variant="ghost" size="sm">Configure</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <TikTokShopConfigDialog
        open={showTikTokDialog}
        onOpenChange={setShowTikTokDialog}
        onSuccess={() => refetchIntegrations()}
      />
      <MetaMarketingConfigDialog
        open={showMetaDialog}
        onOpenChange={setShowMetaDialog}
        onSuccess={() => refetchIntegrations()}
      />
      <StripeConfigDialog 
        open={showStripeDialog} 
        onOpenChange={setShowStripeDialog}
        onSuccess={() => refetchIntegrations()}
      />
    </div>
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

  const hasPublishableKey = envStatus?.configured;
  const hasSecretKey = envStatus?.configured;
  const hasWebhook = envStatus?.hasWebhookSecret;
  const allConfigured = hasPublishableKey && hasSecretKey && hasWebhook;
  const partiallyConfigured = hasPublishableKey || hasSecretKey || hasWebhook;

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

      {partiallyConfigured && (
        <div className={`p-4 rounded-lg border ${allConfigured ? "bg-green-500/10 border-green-500/20" : "bg-amber-500/5 border-amber-500/20"}`}>
          <div className={`flex items-center gap-2 text-sm font-semibold mb-3 ${allConfigured ? "text-green-500" : "text-amber-500"}`}>
            {allConfigured ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {allConfigured
              ? `${env === "live" ? "Live" : "Test"} — Fully Configured`
              : `${env === "live" ? "Live" : "Test"} — Partially Configured`}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-md border ${hasPublishableKey ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-muted/50 border-border text-muted-foreground"}`} data-testid={`status-pk-${env}`}>
              {hasPublishableKey ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <CircleDot className="w-3 h-3 shrink-0 opacity-40" />}
              <span className="truncate">Publishable Key</span>
            </div>
            <div className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-md border ${hasSecretKey ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-muted/50 border-border text-muted-foreground"}`} data-testid={`status-sk-${env}`}>
              {hasSecretKey ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <CircleDot className="w-3 h-3 shrink-0 opacity-40" />}
              <span className="truncate">Secret Key</span>
            </div>
            <div className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-md border ${hasWebhook ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-muted/50 border-border text-muted-foreground"}`} data-testid={`status-webhook-${env}`}>
              {hasWebhook ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <CircleDot className="w-3 h-3 shrink-0 opacity-40" />}
              <span className="truncate">Webhook</span>
            </div>
          </div>
          {envStatus?.publishableKeyMasked && (
            <p className="text-xs text-muted-foreground mt-2 font-mono">{envStatus.publishableKeyMasked}</p>
          )}
        </div>
      )}

      <div className={`space-y-2 p-3 rounded-lg border transition-colors ${hasPublishableKey ? "border-green-500/20 bg-green-500/[0.03]" : "border-transparent"}`}>
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            Publishable Key
          </Label>
          {hasPublishableKey && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20" data-testid={`badge-pk-saved-${env}`}>
              <CheckCircle2 className="w-3 h-3" />
              Saved
            </span>
          )}
        </div>
        <SecretInput
          value={publishableKey}
          onChange={(e) => { setPublishableKey(e.target.value); setValidation(null); }}
          hasSavedValue={envStatus?.configured}
          placeholder="Enter publishable key"
          data-testid={`input-stripe-pk-${env}`}
        />
        {pkError && <p className="text-xs text-red-500">{pkError}</p>}
      </div>

      <div className={`space-y-2 p-3 rounded-lg border transition-colors ${hasSecretKey ? "border-green-500/20 bg-green-500/[0.03]" : "border-transparent"}`}>
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            Secret Key
          </Label>
          {hasSecretKey && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20" data-testid={`badge-sk-saved-${env}`}>
              <CheckCircle2 className="w-3 h-3" />
              Saved
            </span>
          )}
        </div>
        <SecretInput
          value={secretKey}
          onChange={(e) => { setSecretKey(e.target.value); setValidation(null); }}
          hasSavedValue={envStatus?.configured}
          placeholder="Enter secret key"
          data-testid={`input-stripe-sk-${env}`}
        />
        {skError && <p className="text-xs text-red-500">{skError}</p>}
      </div>

      <div className={`space-y-2 p-3 rounded-lg border transition-colors ${hasWebhook ? "border-green-500/20 bg-green-500/[0.03]" : "border-transparent"}`}>
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            {env === "live" ? "Live" : "Test"} Payment Webhook Secret
          </Label>
          {hasWebhook && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20" data-testid={`badge-webhook-saved-${env}`}>
              <CheckCircle2 className="w-3 h-3" />
              Saved
            </span>
          )}
        </div>
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
          <code className="flex-1 text-xs bg-background px-2 py-1.5 rounded border break-all" data-testid={`text-webhook-url-${env}`}>
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
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
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
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
                    <code className="flex-1 text-xs bg-background px-2 py-1.5 rounded border break-all" data-testid="text-connect-webhook-url">
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
