import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import AdminNav from "@/components/admin/AdminNav";
import { Mail, Copy, Check, Loader2, Link2, UserPlus, Share2, MessageSquare } from "lucide-react";

interface InviteResponse {
  invite: {
    id: string;
    inviteCode: string;
    targetEmail: string;
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
    notes: "",
  });

  const [lastResult, setLastResult] = useState<InviteResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const sendInviteMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/admin/affiliate-invites/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetEmail: data.targetEmail.trim(),
          targetName: data.targetName.trim() || undefined,
          maxUses: parseInt(data.maxUses) || 1,
          expiresInDays: parseInt(data.expiresInDays) || undefined,
          notes: data.notes.trim() || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to send invite");
      return result as InviteResponse;
    },
    onSuccess: async (data) => {
      setLastResult(data);

      if (data.emailSent) {
        toast({
          title: "Invite Sent!",
          description: `Invite email sent to ${formData.targetEmail}`,
        });
      } else {
        toast({
          title: "Invite Created",
          description: data.emailError
            ? `Invite created but email failed: ${data.emailError}. You can share the link manually.`
            : "Invite created. Share the link below.",
          variant: data.emailError ? "destructive" : "default",
        });
      }

      setFormData(prev => ({ ...prev, targetEmail: "", targetName: "", notes: "" }));

      await triggerNativeShare(data);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invite",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const triggerNativeShare = async (data: InviteResponse) => {
    const shareText = data.invite.targetName
      ? `Hi ${data.invite.targetName}, here's your private affiliate signup link for Power Plunge: ${data.inviteUrl}`
      : `Here's your private affiliate signup link for Power Plunge: ${data.inviteUrl}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Power Plunge Affiliate Invite",
          text: shareText,
          url: data.inviteUrl,
        });
        toast({
          title: "Shared!",
          description: "Invite link shared successfully.",
        });
      } catch (err: any) {
        if (err.name !== "AbortError") {
          toast({
            title: "Share cancelled",
            description: "You can still copy or share the link below.",
          });
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.targetEmail.trim()) return;
    sendInviteMutation.mutate(formData);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copied!", description: "Invite link copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      toast({ title: "Copied!", description: "Invite link copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareAgain = async () => {
    if (!lastResult) return;
    await triggerNativeShare(lastResult);
  };

  const handleSmsShare = () => {
    if (!lastResult) return;
    const body = lastResult.invite.targetName
      ? `Hi ${lastResult.invite.targetName}, here's your Power Plunge affiliate signup link: ${lastResult.inviteUrl}`
      : `Here's your Power Plunge affiliate signup link: ${lastResult.inviteUrl}`;
    window.open(`sms:?body=${encodeURIComponent(body)}`, "_self");
  };

  const handleEmailShare = () => {
    if (!lastResult) return;
    const subject = "You're Invited to the Power Plunge Affiliate Program";
    const body = lastResult.invite.targetName
      ? `Hi ${lastResult.invite.targetName},\n\nYou've been invited to join the Power Plunge affiliate program! Use the link below to sign up:\n\n${lastResult.inviteUrl}\n\nBest regards`
      : `You've been invited to join the Power Plunge affiliate program! Use the link below to sign up:\n\n${lastResult.inviteUrl}\n\nBest regards`;
    const mailto = `mailto:${lastResult.invite.targetEmail || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_self");
  };

  const supportsNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !hasFullAccess) {
    setLocation("/admin");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="affiliates" role={role} />
      
      <div className="max-w-lg mx-auto px-4 py-6 sm:py-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
            <UserPlus className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Invite Affiliate</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Send a private invite to join the affiliate program
          </p>
        </div>

        <Card data-testid="card-invite-form">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="targetEmail">Email address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="targetEmail"
                    type="email"
                    placeholder="affiliate@example.com"
                    value={formData.targetEmail}
                    onChange={(e) => setFormData({ ...formData, targetEmail: e.target.value })}
                    className="pl-11 h-12 text-base"
                    required
                    autoComplete="email"
                    data-testid="input-target-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetName">Name (optional)</Label>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxUses">Max uses</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    className="h-12 text-base"
                    data-testid="input-max-uses"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiresInDays">Expires in (days)</Label>
                  <Input
                    id="expiresInDays"
                    type="number"
                    min="1"
                    max="365"
                    value={formData.expiresInDays}
                    onChange={(e) => setFormData({ ...formData, expiresInDays: e.target.value })}
                    className="h-12 text-base"
                    data-testid="input-expires-days"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Internal notes about this invite..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="text-base"
                  data-testid="input-notes"
                />
              </div>

              <Button
                type="submit"
                disabled={sendInviteMutation.isPending || !formData.targetEmail.trim()}
                className="w-full h-14 text-base font-semibold"
                data-testid="button-send-invite"
              >
                {sendInviteMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Share2 className="w-5 h-5 mr-2" />
                    Create & Share Invite
                  </>
                )}
              </Button>

              {supportsNativeShare && (
                <p className="text-xs text-center text-muted-foreground">
                  Tap Share to send via Messages, Mail, WhatsApp, etc.
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {lastResult && (
          <Card className="mt-6 border-primary/30" data-testid="card-invite-result">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                Invite Created
              </CardTitle>
              <CardDescription>
                {lastResult.emailSent
                  ? `Email sent to ${lastResult.invite.targetEmail}`
                  : "Share the link below manually"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={lastResult.inviteUrl}
                  readOnly
                  className="text-sm font-mono flex-1"
                  data-testid="input-invite-url"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-10 w-10"
                  onClick={() => copyToClipboard(lastResult.inviteUrl)}
                  data-testid="button-copy-url"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {supportsNativeShare && (
                  <Button
                    variant="default"
                    className="w-full h-12 text-base font-semibold"
                    onClick={handleShareAgain}
                    data-testid="button-share-again"
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    Share Again
                  </Button>
                )}

                {!supportsNativeShare && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-12 text-base"
                      onClick={handleSmsShare}
                      data-testid="button-share-sms"
                    >
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Text / SMS
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12 text-base"
                      onClick={handleEmailShare}
                      data-testid="button-share-email"
                    >
                      <Mail className="w-5 h-5 mr-2" />
                      Email
                    </Button>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full h-12 text-base"
                  onClick={() => copyToClipboard(lastResult.inviteUrl)}
                  data-testid="button-copy-link"
                >
                  {copied ? <Check className="w-5 h-5 mr-2 text-green-500" /> : <Copy className="w-5 h-5 mr-2" />}
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
              </div>

              {!lastResult.emailSent && lastResult.emailError && (
                <p className="text-sm text-amber-600" data-testid="text-email-warning">
                  Email not sent: {lastResult.emailError}
                </p>
              )}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Code: {lastResult.invite.inviteCode}</p>
                {lastResult.invite.expiresAt && (
                  <p>Expires: {new Date(lastResult.invite.expiresAt).toLocaleDateString()}</p>
                )}
                <p>Max uses: {lastResult.invite.maxUses}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 p-4 bg-muted/50 rounded-xl text-center">
          <Share2 className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Tip:</strong> On iPhone, tap the Share button in Safari and choose "Add to Home Screen" to create a quick-access shortcut to this page.
          </p>
        </div>
      </div>
    </div>
  );
}
