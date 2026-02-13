import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { X } from "lucide-react";
import { getStoredConsent, storeConsent, shouldShowBanner } from "@/lib/consent";
import { cn } from "@/lib/utils";

interface ConsentCategory {
  enabled: boolean;
  locked?: boolean;
  defaultOn: boolean;
  label: string;
  description: string;
}

interface ConsentConfig {
  enabled: boolean;
  mode: string;
  position: string;
  style: string;
  overlay: boolean;
  theme: string;
  showOnFirstVisit: boolean;
  rePromptDays: number;
  title: string;
  messageHtml: string;
  acceptAllText: string;
  rejectAllText: string;
  manageText: string;
  savePreferencesText: string;
  policyLinks: { privacyPolicyPath: string; termsPath?: string };
  categories: Record<string, ConsentCategory>;
}

let openPreferencesGlobal: (() => void) | null = null;

export function openConsentPreferences() {
  openPreferencesGlobal?.();
}

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [choices, setChoices] = useState<Record<string, boolean>>({});

  const { data: config } = useQuery<ConsentConfig>({
    queryKey: ["/api/site-settings/consent"],
    queryFn: async () => {
      const res = await fetch("/api/site-settings/consent");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 60000,
  });

  useEffect(() => {
    if (!config?.enabled) return;
    if (config.showOnFirstVisit && shouldShowBanner(config.rePromptDays)) {
      setVisible(true);
    }
    const stored = getStoredConsent();
    if (stored) {
      setChoices(stored.categories);
    } else {
      const defaults: Record<string, boolean> = { necessary: true };
      Object.entries(config.categories).forEach(([key, cat]) => {
        if (cat.enabled) {
          defaults[key] = key === "necessary" ? true : (config.mode === "opt_out" ? true : cat.defaultOn);
        }
      });
      setChoices(defaults);
    }
  }, [config]);

  const handleOpenPreferences = useCallback(() => {
    if (!config?.enabled) return;
    const stored = getStoredConsent();
    if (stored) {
      setChoices(stored.categories);
    }
    setShowPreferences(true);
    setVisible(true);
  }, [config]);

  useEffect(() => {
    openPreferencesGlobal = handleOpenPreferences;
    return () => { openPreferencesGlobal = null; };
  }, [handleOpenPreferences]);

  if (!config?.enabled || !visible) return null;

  const enabledCategories = Object.entries(config.categories).filter(([, cat]) => cat.enabled);

  const handleAcceptAll = () => {
    const all: Record<string, boolean> = {};
    enabledCategories.forEach(([key]) => { all[key] = true; });
    storeConsent(all as any);
    setVisible(false);
    setShowPreferences(false);
    window.dispatchEvent(new Event("consent-updated"));
  };

  const handleRejectAll = () => {
    const minimal: Record<string, boolean> = {};
    enabledCategories.forEach(([key, cat]) => {
      minimal[key] = cat.locked ? true : false;
    });
    storeConsent(minimal as any);
    setVisible(false);
    setShowPreferences(false);
    window.dispatchEvent(new Event("consent-updated"));
  };

  const handleSavePreferences = () => {
    storeConsent(choices as any);
    setVisible(false);
    setShowPreferences(false);
    window.dispatchEvent(new Event("consent-updated"));
  };

  const themeClasses = config.theme === "light"
    ? "bg-white text-gray-900 border-gray-200"
    : config.theme === "dark"
      ? "bg-gray-950 text-white border-gray-800"
      : "bg-card text-card-foreground border-border";

  const mutedText = config.theme === "light" ? "text-gray-600" : "text-muted-foreground";

  if (showPreferences) {
    return (
      <>
        {config.overlay && (
          <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm" onClick={() => { setShowPreferences(false); if (!shouldShowBanner(config.rePromptDays)) setVisible(false); }} />
        )}
        <div className={cn("fixed z-[9999] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-xl border shadow-2xl p-6", themeClasses)} data-testid="consent-preferences-modal">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{config.manageText}</h3>
            <button onClick={() => { setShowPreferences(false); if (!shouldShowBanner(config.rePromptDays)) setVisible(false); }} className="p-1 rounded hover:bg-muted" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {enabledCategories.map(([key, cat]) => (
              <div key={key} className={cn("flex items-start justify-between gap-4 p-3 rounded-lg border", config.theme === "light" ? "border-gray-200" : "border-border")}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{cat.label}{cat.locked && <span className={cn("text-xs ml-2", mutedText)}>(required)</span>}</p>
                  <p className={cn("text-xs mt-1", mutedText)}>{cat.description}</p>
                </div>
                <Switch
                  checked={choices[key] ?? false}
                  onCheckedChange={(v) => setChoices(prev => ({ ...prev, [key]: v }))}
                  disabled={cat.locked}
                  data-testid={`consent-toggle-${key}`}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <Button onClick={handleRejectAll} variant="outline" className="flex-1" data-testid="consent-reject-all">{config.rejectAllText}</Button>
            <Button onClick={handleSavePreferences} className="flex-1 bg-primary hover:bg-primary/80 text-primary-foreground" data-testid="consent-save-preferences">{config.savePreferencesText}</Button>
          </div>
          {config.policyLinks.privacyPolicyPath && (
            <div className={cn("text-center mt-3 text-xs", mutedText)}>
              <Link href={config.policyLinks.privacyPolicyPath} className="underline hover:no-underline">Privacy Policy</Link>
            </div>
          )}
        </div>
      </>
    );
  }

  const isModal = config.style === "modal";
  const positionClass = isModal
    ? "fixed z-[9999] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-xl"
    : config.position === "top"
      ? "fixed z-[9999] top-0 left-0 right-0"
      : "fixed z-[9999] bottom-0 left-0 right-0";

  return (
    <>
      {isModal && config.overlay && (
        <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm" />
      )}
      <div className={cn(positionClass, "border shadow-2xl p-6", !isModal && "border-t", isModal && "border", themeClasses)} data-testid="consent-banner">
        <div className={cn(isModal ? "" : "max-w-5xl mx-auto")}>
          <h3 className="text-lg font-semibold mb-2">{config.title}</h3>
          <p className={cn("text-sm mb-4", mutedText)}>{config.messageHtml}</p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleAcceptAll} className="bg-primary hover:bg-primary/80 text-primary-foreground" data-testid="consent-accept-all">{config.acceptAllText}</Button>
            <Button onClick={handleRejectAll} variant="outline" data-testid="consent-reject-all-banner">{config.rejectAllText}</Button>
            <Button onClick={() => setShowPreferences(true)} variant="ghost" data-testid="consent-manage">{config.manageText}</Button>
          </div>
          {config.policyLinks.privacyPolicyPath && (
            <div className={cn("mt-3 text-xs", mutedText)}>
              <Link href={config.policyLinks.privacyPolicyPath} className="underline hover:no-underline">Privacy Policy</Link>
              {config.policyLinks.termsPath && (
                <> · <Link href={config.policyLinks.termsPath} className="underline hover:no-underline">Terms</Link></>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
