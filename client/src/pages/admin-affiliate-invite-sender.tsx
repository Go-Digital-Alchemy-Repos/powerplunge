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
  Copy, Check, Loader2, UserPlus, Share2, X, Link2,
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
}

export default function AdminAffiliateInviteSender() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { admin, isLoading: adminLoading, isAuthenticated, role, hasFullAccess } = useAdmin();

  const [formData, setFormData] = useState({
    targetEmail: "",
    targetName: "",
    maxUses: "1",
    expiresInDays: "7",
  });

  const [quickShareUrl, setQuickShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);

  const supportsNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  const quickSharePlaceholder = `${window.location.origin}/become-affiliate?ref=...`;

  const createQuickLink = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/affiliate-invites/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ maxUses: 1, expiresInDays: 7 }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to create invite");
      return result as InviteResponse;
    },
    onSuccess: (data) => {
      setQuickShareUrl(data.inviteUrl);
      toast({ title: "Link Ready", description: "Copy or share the invite link below." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create link", description: error.message, variant: "destructive" });
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/admin/affiliate-invites/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetEmail: data.targetEmail.trim() || undefined,
          targetName: data.targetName.trim() || undefined,
          maxUses: parseInt(data.maxUses) || 1,
          expiresInDays: parseInt(data.expiresInDays) || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to create invite");
      return result as InviteResponse;
    },
    onSuccess: (data) => {
      if (data.emailSent) {
        toast({ title: "Invite Sent!", description: `Invite email sent to ${data.invite.targetEmail}` });
      } else {
        toast({ title: "Invite Created", description: "The affiliate invite has been created successfully." });
      }
      setFormData(prev => ({ ...prev, targetEmail: "", targetName: "" }));
    },
    onError: (error: any) => {
      toast({ title: "Failed to create invite", description: error.message, variant: "destructive" });
    },
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.targetName.trim() || !formData.targetEmail.trim()) {
      toast({ title: "Missing fields", description: "Please enter both a name and email address.", variant: "destructive" });
      return;
    }
    sendInviteMutation.mutate(formData);
  };

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

  const handleNativeShare = async () => {
    if (!quickShareUrl) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Power Plunge Affiliate Invite",
          text: `Here's your private Power Plunge affiliate signup link: ${quickShareUrl}`,
          url: quickShareUrl,
        });
      } catch (err: any) {
        if (err.name !== "AbortError") {
          toast({ title: "Share cancelled", description: "You can still copy the link above." });
        }
      }
    }
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
            Choose the fastest way to grow your network.
          </p>
        </div>

        <Card className="mb-6" data-testid="card-quick-share">
          <CardContent className="pt-5 pb-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3" data-testid="text-quick-share-heading">
              Quick Share
            </h2>
            {quickShareUrl ? (
              <div className="flex gap-2">
                <Input
                  value={quickShareUrl}
                  readOnly
                  className="text-sm font-mono flex-1 bg-muted/40"
                  data-testid="input-share-link"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-10 w-10"
                  onClick={() => copyToClipboard(quickShareUrl)}
                  data-testid="button-copy-link"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
                {supportsNativeShare && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 h-10 w-10"
                    onClick={handleNativeShare}
                    data-testid="button-share-native"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={quickSharePlaceholder}
                    readOnly
                    className="text-sm font-mono flex-1 bg-muted/40 text-muted-foreground"
                    data-testid="input-share-link-placeholder"
                  />
                </div>
                <Button
                  className="w-full h-11 text-sm font-medium"
                  variant="outline"
                  onClick={() => createQuickLink.mutate()}
                  disabled={createQuickLink.isPending}
                  data-testid="button-generate-link"
                >
                  {createQuickLink.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 mr-2" />
                      Generate Invite Link
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-4 my-6" data-testid="divider-or">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Card data-testid="card-manual-entry">
          <CardContent className="pt-5 pb-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4" data-testid="text-manual-entry-heading">
              Manual Entry
            </h2>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetName">Full Name</Label>
                <Input
                  id="targetName"
                  type="text"
                  placeholder="Jane Smith"
                  value={formData.targetName}
                  onChange={(e) => setFormData({ ...formData, targetName: e.target.value })}
                  className="h-12 text-base"
                  data-testid="input-target-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetEmail">Email Address</Label>
                <Input
                  id="targetEmail"
                  type="email"
                  placeholder="affiliate@example.com"
                  value={formData.targetEmail}
                  onChange={(e) => setFormData({ ...formData, targetEmail: e.target.value })}
                  className="h-12 text-base"
                  autoComplete="email"
                  data-testid="input-target-email"
                />
              </div>

              <Button
                type="submit"
                disabled={sendInviteMutation.isPending}
                className="w-full h-14 text-base font-semibold bg-cyan-500 hover:bg-cyan-600 text-black"
                data-testid="button-send-invite"
              >
                {sendInviteMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Invite"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {!tipDismissed && (
          <div className="mt-8 p-4 bg-muted/50 rounded-xl relative" data-testid="card-tip">
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
