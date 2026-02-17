import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import AdminNav from "@/components/admin/AdminNav";
import {
  Loader2, UserPlus, Share2, MessageSquare, Mail, Copy, X, Link2,
} from "lucide-react";

interface InviteResponse {
  invite: {
    id: string;
    inviteCode: string;
    targetEmail: string | null;
    targetPhone: string | null;
    targetName: string | null;
    expiresAt: string | null;
    maxUses: number;
  };
  inviteUrl: string;
  emailSent: boolean;
  emailError: string | null;
  smsSent: boolean;
  smsError: string | null;
  sentVia: string[];
}

type DeliveryMethod = "contacts" | "text" | "email";

export default function AdminAffiliateInviteSender() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { admin, isLoading: adminLoading, isAuthenticated, role, hasFullAccess } = useAdmin();

  const [sharedOptions, setSharedOptions] = useState({
    maxUses: "1",
    expiresInDays: "7",
  });

  const [textForm, setTextForm] = useState({ targetPhone: "", targetName: "" });
  const [emailForm, setEmailForm] = useState({ targetEmail: "", targetName: "" });

  const [copied, setCopied] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    toast({ title: "Copied!", description: "Invite link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const sendInvite = async (payload: Record<string, any>): Promise<InviteResponse> => {
    const res = await fetch("/api/admin/affiliate-invites/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Failed to create invite");
    return result as InviteResponse;
  };

  const shareWithContacts = useMutation({
    mutationFn: async () => {
      return sendInvite({
        deliveryMethod: "contacts" as DeliveryMethod,
        maxUses: parseInt(sharedOptions.maxUses) || 1,
        expiresInDays: parseInt(sharedOptions.expiresInDays) || 7,
      });
    },
    onSuccess: async (data) => {
      const shareText = `Here's your private Power Plunge affiliate signup link: ${data.inviteUrl}`;

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: "Power Plunge Affiliate Invite",
            text: shareText,
          });
          toast({ title: "Invite Shared!", description: "Your invite link was shared successfully." });
        } catch (err: any) {
          if (err.name === "AbortError") return;
          await copyToClipboard(data.inviteUrl);
        }
      } else {
        await copyToClipboard(data.inviteUrl);
      }
    },
    onError: (error: any) => {
      toast({ title: "Failed to create invite", description: error.message, variant: "destructive" });
    },
  });

  const sendViaSms = useMutation({
    mutationFn: async () => {
      if (!textForm.targetPhone.trim()) {
        throw new Error("Phone number is required");
      }
      return sendInvite({
        deliveryMethod: "text" as DeliveryMethod,
        targetPhone: textForm.targetPhone.trim(),
        targetName: textForm.targetName.trim() || undefined,
        maxUses: parseInt(sharedOptions.maxUses) || 1,
        expiresInDays: parseInt(sharedOptions.expiresInDays) || 7,
      });
    },
    onSuccess: (data) => {
      if (data.smsSent) {
        toast({ title: "Text Sent!", description: `Invite SMS sent to ${data.invite.targetPhone}` });
      } else {
        toast({
          title: "Invite Created",
          description: data.smsError || "SMS could not be sent. You can copy the invite link instead.",
          variant: "destructive",
        });
        setFallbackUrl(data.inviteUrl);
      }
      setTextForm({ targetPhone: "", targetName: "" });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const sendViaEmail = useMutation({
    mutationFn: async () => {
      if (!emailForm.targetEmail.trim()) {
        throw new Error("Email address is required");
      }
      return sendInvite({
        deliveryMethod: "email" as DeliveryMethod,
        targetEmail: emailForm.targetEmail.trim(),
        targetName: emailForm.targetName.trim() || undefined,
        maxUses: parseInt(sharedOptions.maxUses) || 1,
        expiresInDays: parseInt(sharedOptions.expiresInDays) || 7,
      });
    },
    onSuccess: (data) => {
      if (data.emailSent) {
        toast({ title: "Email Sent!", description: `Invite email sent to ${data.invite.targetEmail}` });
      } else {
        toast({
          title: "Invite Created",
          description: "Email could not be sent, but the invite link is ready to copy.",
          variant: "destructive",
        });
        setFallbackUrl(data.inviteUrl);
      }
      setEmailForm({ targetEmail: "", targetName: "" });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleSmsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendViaSms.mutate();
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendViaEmail.mutate();
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !hasFullAccess) {
    setLocation("/admin/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="affiliates" role={role} />

      <div className="max-w-lg mx-auto px-4 py-6 sm:py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
            <UserPlus className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Invite Affiliate</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Choose how you'd like to send an invite.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="space-y-2">
            <Label htmlFor="maxUses" className="text-xs text-muted-foreground">Max Uses</Label>
            <Input
              id="maxUses"
              type="number"
              min="1"
              value={sharedOptions.maxUses}
              onChange={(e) => setSharedOptions(prev => ({ ...prev, maxUses: e.target.value }))}
              className="h-10"
              data-testid="input-max-uses"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiresInDays" className="text-xs text-muted-foreground">Expires In (days)</Label>
            <Input
              id="expiresInDays"
              type="number"
              min="1"
              value={sharedOptions.expiresInDays}
              onChange={(e) => setSharedOptions(prev => ({ ...prev, expiresInDays: e.target.value }))}
              className="h-10"
              data-testid="input-expires-in-days"
            />
          </div>
        </div>

        <Card className="mb-4" data-testid="card-share-contacts">
          <CardContent className="pt-5 pb-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2" data-testid="text-contacts-heading">
              <Share2 className="w-4 h-4" />
              Share from Contacts
            </h2>
            <p className="text-xs text-muted-foreground mb-3">
              Creates an invite link and opens your device's share sheet. On desktop, the link is copied to your clipboard.
            </p>
            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={() => shareWithContacts.mutate()}
              disabled={shareWithContacts.isPending}
              data-testid="button-share-contacts"
            >
              {shareWithContacts.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Invite...
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5 mr-2" />
                  Share with Contacts
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-4" data-testid="card-share-text">
          <CardContent className="pt-5 pb-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2" data-testid="text-sms-heading">
              <MessageSquare className="w-4 h-4" />
              Share via Text
            </h2>
            <form onSubmit={handleSmsSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="smsPhone">Phone Number *</Label>
                <Input
                  id="smsPhone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={textForm.targetPhone}
                  onChange={(e) => setTextForm(prev => ({ ...prev, targetPhone: e.target.value }))}
                  className="h-11"
                  data-testid="input-sms-phone"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smsName">Name (optional)</Label>
                <Input
                  id="smsName"
                  type="text"
                  placeholder="Jane Smith"
                  value={textForm.targetName}
                  onChange={(e) => setTextForm(prev => ({ ...prev, targetName: e.target.value }))}
                  className="h-11"
                  data-testid="input-sms-name"
                />
              </div>
              <Button
                type="submit"
                disabled={sendViaSms.isPending}
                className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-send-sms"
              >
                {sendViaSms.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending Text...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Send Text Invite
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mb-4" data-testid="card-share-email">
          <CardContent className="pt-5 pb-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2" data-testid="text-email-heading">
              <Mail className="w-4 h-4" />
              Share via Email
            </h2>
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="emailAddress">Email Address *</Label>
                <Input
                  id="emailAddress"
                  type="email"
                  placeholder="affiliate@example.com"
                  value={emailForm.targetEmail}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, targetEmail: e.target.value }))}
                  className="h-11"
                  autoComplete="email"
                  data-testid="input-email-address"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emailName">Name (optional)</Label>
                <Input
                  id="emailName"
                  type="text"
                  placeholder="Jane Smith"
                  value={emailForm.targetName}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, targetName: e.target.value }))}
                  className="h-11"
                  data-testid="input-email-name"
                />
              </div>
              <Button
                type="submit"
                disabled={sendViaEmail.isPending}
                className="w-full h-12 text-base font-semibold bg-cyan-500 hover:bg-cyan-600 text-black"
                data-testid="button-send-email"
              >
                {sendViaEmail.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending Email...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5 mr-2" />
                    Send Email Invite
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {fallbackUrl && (
          <Card className="mb-4 border-yellow-500/30 bg-yellow-500/5" data-testid="card-fallback-url">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <Link2 className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-1">Invite link ready</p>
                  <p className="text-xs text-muted-foreground break-all mb-2" data-testid="text-fallback-url">{fallbackUrl}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(fallbackUrl)}
                    data-testid="button-copy-fallback"
                  >
                    <Copy className="w-4 h-4 mr-1.5" />
                    {copied ? "Copied!" : "Copy Link"}
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => setFallbackUrl(null)}
                  className="text-muted-foreground hover:text-foreground"
                  data-testid="button-dismiss-fallback"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {!tipDismissed && (
          <div className="mt-6 p-4 bg-muted/50 rounded-xl relative" data-testid="card-tip">
            <button
              type="button"
              onClick={() => setTipDismissed(true)}
              className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-dismiss-tip"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3 pr-4">
              <Share2 className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>iPhone Tip:</strong> Tap the Share button in Safari and choose
                "Add to Home Screen" to create a quick-access shortcut to this page.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
