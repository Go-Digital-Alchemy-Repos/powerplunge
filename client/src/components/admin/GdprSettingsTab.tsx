import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save, Shield, Eye, Type, ToggleLeft } from "lucide-react";

interface ConsentCategory {
  enabled: boolean;
  locked?: boolean;
  defaultOn: boolean;
  label: string;
  description: string;
}

interface ConsentSettings {
  enabled: boolean;
  mode: "opt_in" | "opt_out";
  position: "bottom" | "top" | "center";
  style: "banner" | "modal";
  overlay: boolean;
  theme: "site" | "light" | "dark";
  showOnFirstVisit: boolean;
  rePromptDays: number;
  title: string;
  messageHtml: string;
  acceptAllText: string;
  rejectAllText: string;
  manageText: string;
  savePreferencesText: string;
  policyLinks: {
    privacyPolicyPath: string;
    termsPath: string;
    cookiePolicyPath: string | null;
  };
  categories: {
    necessary: ConsentCategory;
    analytics: ConsentCategory;
    marketing: ConsentCategory;
    functional: ConsentCategory;
  };
}

const defaultSettings: ConsentSettings = {
  enabled: false,
  mode: "opt_in",
  position: "bottom",
  style: "banner",
  overlay: false,
  theme: "site",
  showOnFirstVisit: true,
  rePromptDays: 0,
  title: "Your Privacy Choices",
  messageHtml: "We use cookies and similar technologies to operate our store, improve your experience, and (with your permission) measure traffic and marketing performance. You can accept all, reject non-essential, or manage your preferences at any time.",
  acceptAllText: "Accept All",
  rejectAllText: "Reject Non-Essential",
  manageText: "Manage Preferences",
  savePreferencesText: "Save Preferences",
  policyLinks: {
    privacyPolicyPath: "/privacy-policy",
    termsPath: "/terms-and-conditions",
    cookiePolicyPath: null,
  },
  categories: {
    necessary: { enabled: true, locked: true, defaultOn: true, label: "Necessary", description: "Required for the website to function, including secure checkout and fraud prevention." },
    analytics: { enabled: true, locked: false, defaultOn: false, label: "Analytics", description: "Helps us understand site usage to improve performance and shopping experience." },
    marketing: { enabled: false, locked: false, defaultOn: false, label: "Marketing", description: "Used to personalize offers and measure ad performance across platforms." },
    functional: { enabled: false, locked: false, defaultOn: false, label: "Functional", description: "Remembers preferences to enhance features and personalization." },
  },
};

export default function GdprSettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ConsentSettings>(defaultSettings);

  const { data: settings } = useQuery<any>({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  useEffect(() => {
    if (settings?.consentSettings) {
      setForm({ ...defaultSettings, ...settings.consentSettings });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: ConsentSettings) => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentSettings: data }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "GDPR settings saved" });
    },
    onError: () => {
      toast({ title: "Failed to save", variant: "destructive" });
    },
  });

  const updateCategory = (key: keyof ConsentSettings["categories"], field: string, value: any) => {
    setForm(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [key]: { ...prev.categories[key], [field]: value },
      },
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Consent Banner
          </CardTitle>
          <CardDescription>
            Control the cookie/privacy consent banner shown to visitors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable consent banner on storefront</Label>
              <p className="text-sm text-muted-foreground">When disabled, no banner is shown and all scripts load normally</p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => setForm(prev => ({ ...prev, enabled: v }))}
              data-testid="toggle-consent-enabled"
            />
          </div>

          {form.enabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Consent Mode</Label>
                  <Select value={form.mode} onValueChange={(v: any) => setForm(prev => ({ ...prev, mode: v }))}>
                    <SelectTrigger data-testid="select-consent-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opt_in">Opt-in (GDPR strict)</SelectItem>
                      <SelectItem value="opt_out">Opt-out (implied consent)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Opt-in: scripts blocked until accepted. Opt-out: scripts load unless rejected.</p>
                </div>
                <div className="space-y-2">
                  <Label>Re-prompt after (days)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={365}
                    value={form.rePromptDays}
                    onChange={(e) => setForm(prev => ({ ...prev, rePromptDays: Math.min(365, Math.max(0, parseInt(e.target.value) || 0)) }))}
                    data-testid="input-reprompt-days"
                  />
                  <p className="text-xs text-muted-foreground">0 = never re-ask</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show on first visit</Label>
                  <p className="text-sm text-muted-foreground">Display the banner immediately when a new visitor arrives</p>
                </div>
                <Switch
                  checked={form.showOnFirstVisit}
                  onCheckedChange={(v) => setForm(prev => ({ ...prev, showOnFirstVisit: v }))}
                  data-testid="toggle-show-first-visit"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {form.enabled && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Appearance
              </CardTitle>
              <CardDescription>Banner layout and visual style</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.style} onValueChange={(v: any) => setForm(prev => ({ ...prev, style: v, position: v === "modal" ? "center" : prev.position === "center" ? "bottom" : prev.position }))}>
                    <SelectTrigger data-testid="select-style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banner">Banner</SelectItem>
                      <SelectItem value="modal">Modal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Select value={form.position} onValueChange={(v: any) => setForm(prev => ({ ...prev, position: v }))}>
                    <SelectTrigger data-testid="select-position">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {form.style === "banner" ? (
                        <>
                          <SelectItem value="bottom">Bottom</SelectItem>
                          <SelectItem value="top">Top</SelectItem>
                        </>
                      ) : (
                        <SelectItem value="center">Center</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select value={form.theme} onValueChange={(v: any) => setForm(prev => ({ ...prev, theme: v }))}>
                    <SelectTrigger data-testid="select-theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="site">Match Site</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.style === "modal" && (
                <div className="flex items-center justify-between">
                  <Label>Show background overlay</Label>
                  <Switch
                    checked={form.overlay}
                    onCheckedChange={(v) => setForm(prev => ({ ...prev, overlay: v }))}
                    data-testid="toggle-overlay"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="w-5 h-5" />
                Content & Labels
              </CardTitle>
              <CardDescription>Customize the text displayed in the consent banner</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  data-testid="input-consent-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={form.messageHtml}
                  onChange={(e) => setForm(prev => ({ ...prev, messageHtml: e.target.value }))}
                  rows={3}
                  data-testid="input-consent-message"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Accept All button text</Label>
                  <Input value={form.acceptAllText} onChange={(e) => setForm(prev => ({ ...prev, acceptAllText: e.target.value }))} data-testid="input-accept-text" />
                </div>
                <div className="space-y-2">
                  <Label>Reject All button text</Label>
                  <Input value={form.rejectAllText} onChange={(e) => setForm(prev => ({ ...prev, rejectAllText: e.target.value }))} data-testid="input-reject-text" />
                </div>
                <div className="space-y-2">
                  <Label>Manage Preferences button text</Label>
                  <Input value={form.manageText} onChange={(e) => setForm(prev => ({ ...prev, manageText: e.target.value }))} data-testid="input-manage-text" />
                </div>
                <div className="space-y-2">
                  <Label>Save Preferences button text</Label>
                  <Input value={form.savePreferencesText} onChange={(e) => setForm(prev => ({ ...prev, savePreferencesText: e.target.value }))} data-testid="input-save-text" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Privacy Policy path</Label>
                  <Input
                    value={form.policyLinks.privacyPolicyPath}
                    onChange={(e) => setForm(prev => ({ ...prev, policyLinks: { ...prev.policyLinks, privacyPolicyPath: e.target.value } }))}
                    data-testid="input-privacy-path"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Terms path</Label>
                  <Input
                    value={form.policyLinks.termsPath}
                    onChange={(e) => setForm(prev => ({ ...prev, policyLinks: { ...prev.policyLinks, termsPath: e.target.value } }))}
                    data-testid="input-terms-path"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ToggleLeft className="w-5 h-5" />
                Consent Categories
              </CardTitle>
              <CardDescription>Configure which cookie categories are shown to visitors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(["necessary", "analytics", "marketing", "functional"] as const).map((key) => {
                const cat = form.categories[key];
                const isLocked = key === "necessary";
                return (
                  <div key={key} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={cat.enabled}
                          onCheckedChange={(v) => updateCategory(key, "enabled", v)}
                          disabled={isLocked}
                          data-testid={`toggle-cat-${key}`}
                        />
                        <div>
                          <p className="font-medium">{cat.label}{isLocked && <span className="text-xs text-muted-foreground ml-2">(always on)</span>}</p>
                        </div>
                      </div>
                      {!isLocked && cat.enabled && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Default on</Label>
                          <Switch
                            checked={cat.defaultOn}
                            onCheckedChange={(v) => updateCategory(key, "defaultOn", v)}
                            data-testid={`toggle-default-${key}`}
                          />
                        </div>
                      )}
                    </div>
                    {cat.enabled && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Label</Label>
                          <Input
                            value={cat.label}
                            onChange={(e) => updateCategory(key, "label", e.target.value)}
                            disabled={isLocked}
                            data-testid={`input-label-${key}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={cat.description}
                            onChange={(e) => updateCategory(key, "description", e.target.value)}
                            data-testid={`input-desc-${key}`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}

      <Button type="submit" className="w-full gap-2" disabled={saveMutation.isPending} data-testid="button-save-gdpr">
        <Save className="w-4 h-4" />
        {saveMutation.isPending ? "Saving..." : "Save GDPR Settings"}
      </Button>
    </form>
  );
}
