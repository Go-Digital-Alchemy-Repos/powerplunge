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
import { ArrowLeft, Save } from "lucide-react";
import { useAdmin } from "@/hooks/use-admin";
import defaultAdminIcon from "@assets/powerplungeicon_1770929882628.png";
import AdminNav from "@/components/admin/AdminNav";

interface SupportSettings {
  supportNotifyEmails: string;
  supportNotifyOnNew: boolean;
  supportNotifyOnReply: boolean;
  supportAutoReplyEnabled: boolean;
  supportAutoReplyMessage: string;
  supportSlaHours: number;
  supportBusinessHours: string;
  supportEmail: string;
  supportPhone: string;
}

export default function AdminSupportSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();

  const [formData, setFormData] = useState<SupportSettings>({
    supportNotifyEmails: "",
    supportNotifyOnNew: true,
    supportNotifyOnReply: true,
    supportAutoReplyEnabled: true,
    supportAutoReplyMessage: "",
    supportSlaHours: 24,
    supportBusinessHours: "",
    supportEmail: "",
    supportPhone: "",
  });

  const { data: settings, isLoading } = useQuery<SupportSettings>({
    queryKey: ["/api/admin/support/settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/support/settings", { credentials: "include" });
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
        supportNotifyEmails: settings.supportNotifyEmails ?? "",
        supportNotifyOnNew: settings.supportNotifyOnNew ?? true,
        supportNotifyOnReply: settings.supportNotifyOnReply ?? true,
        supportAutoReplyEnabled: settings.supportAutoReplyEnabled ?? true,
        supportAutoReplyMessage: settings.supportAutoReplyMessage ?? "",
        supportSlaHours: settings.supportSlaHours ?? 24,
        supportBusinessHours: settings.supportBusinessHours ?? "",
        supportEmail: settings.supportEmail ?? "",
        supportPhone: settings.supportPhone ?? "",
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: SupportSettings) => {
      const res = await fetch("/api/admin/support/settings", {
        credentials: "include",
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/settings"] });
      toast({ title: "Settings saved" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-gray-950">
        <AdminNav currentPage="support" role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card className="bg-gray-900/50 border-gray-800/60">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access support settings. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <AdminNav currentPage="support" role={role} />

      <main className="max-w-4xl mx-auto px-6 py-8 pt-24">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/support">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Back to Support
            </Button>
          </Link>
          <h2 className="font-display text-2xl font-bold text-white">Support Settings</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-gray-900/50 border-gray-800/60">
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Configure how and when support notifications are sent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="supportNotifyEmails">Notification Email Addresses</Label>
                <Input
                  id="supportNotifyEmails"
                  type="text"
                  value={formData.supportNotifyEmails}
                  onChange={(e) => setFormData({ ...formData, supportNotifyEmails: e.target.value })}
                  data-testid="input-supportNotifyEmails"
                />
                <p className="text-xs text-muted-foreground">Comma-separated email addresses to receive support notifications</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notify on New Tickets</Label>
                  <p className="text-sm text-muted-foreground">Send email when a new support ticket is submitted</p>
                </div>
                <Switch
                  checked={formData.supportNotifyOnNew}
                  onCheckedChange={(checked) => setFormData({ ...formData, supportNotifyOnNew: checked })}
                  data-testid="switch-supportNotifyOnNew"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notify on Customer Reply</Label>
                  <p className="text-sm text-muted-foreground">Send email when a customer replies to a ticket</p>
                </div>
                <Switch
                  checked={formData.supportNotifyOnReply}
                  onCheckedChange={(checked) => setFormData({ ...formData, supportNotifyOnReply: checked })}
                  data-testid="switch-supportNotifyOnReply"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800/60">
            <CardHeader>
              <CardTitle>Auto-Reply</CardTitle>
              <CardDescription>Configure automatic responses for new support tickets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Reply Enabled</Label>
                  <p className="text-sm text-muted-foreground">Automatically send a confirmation email to customers when they submit a ticket</p>
                </div>
                <Switch
                  checked={formData.supportAutoReplyEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, supportAutoReplyEnabled: checked })}
                  data-testid="switch-supportAutoReplyEnabled"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportAutoReplyMessage">Auto-Reply Message</Label>
                <Textarea
                  id="supportAutoReplyMessage"
                  value={formData.supportAutoReplyMessage}
                  onChange={(e) => setFormData({ ...formData, supportAutoReplyMessage: e.target.value })}
                  placeholder="Thank you for contacting us. We've received your message and will respond within {{sla_hours}} hours."
                  rows={4}
                  data-testid="input-supportAutoReplyMessage"
                />
                <p className="text-xs text-muted-foreground">Use &#123;&#123;sla_hours&#125;&#125; to insert your SLA response time</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800/60">
            <CardHeader>
              <CardTitle>Response Time & Availability</CardTitle>
              <CardDescription>Set expectations for response times and availability</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="supportSlaHours">Target Response Time (hours)</Label>
                <Input
                  id="supportSlaHours"
                  type="number"
                  min={1}
                  max={168}
                  value={formData.supportSlaHours}
                  onChange={(e) => setFormData({ ...formData, supportSlaHours: parseInt(e.target.value) || 24 })}
                  data-testid="input-supportSlaHours"
                />
                <p className="text-xs text-muted-foreground">Target response time displayed to customers</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportBusinessHours">Business Hours</Label>
                <Input
                  id="supportBusinessHours"
                  type="text"
                  value={formData.supportBusinessHours}
                  onChange={(e) => setFormData({ ...formData, supportBusinessHours: e.target.value })}
                  placeholder="Mon-Fri 9am-5pm EST"
                  data-testid="input-supportBusinessHours"
                />
                <p className="text-xs text-muted-foreground">Displayed on the contact page</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800/60">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Public-facing contact details displayed on your site</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={formData.supportEmail}
                  onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                  data-testid="input-supportEmail"
                />
                <p className="text-xs text-muted-foreground">Public-facing support email displayed on the contact page</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportPhone">Support Phone</Label>
                <Input
                  id="supportPhone"
                  type="tel"
                  value={formData.supportPhone}
                  onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                  data-testid="input-supportPhone"
                />
                <p className="text-xs text-muted-foreground">Public-facing support phone number</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="gap-2"
              data-testid="button-save-support-settings"
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
