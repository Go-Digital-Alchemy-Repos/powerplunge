const CONSENT_KEY = "pp_consent_v1";

export interface ConsentChoices {
  version: 1;
  decidedAt: string;
  categories: {
    necessary: boolean;
    analytics: boolean;
    marketing: boolean;
    functional: boolean;
  };
}

export function getStoredConsent(): ConsentChoices | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version === 1) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function storeConsent(categories: ConsentChoices["categories"]): void {
  const data: ConsentChoices = {
    version: 1,
    decidedAt: new Date().toISOString(),
    categories: { ...categories, necessary: true },
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(data));
}

export function clearConsent(): void {
  localStorage.removeItem(CONSENT_KEY);
}

export function shouldShowBanner(rePromptDays: number): boolean {
  const stored = getStoredConsent();
  if (!stored) return true;
  if (rePromptDays > 0) {
    const decidedAt = new Date(stored.decidedAt).getTime();
    const daysSince = (Date.now() - decidedAt) / (1000 * 60 * 60 * 24);
    if (daysSince >= rePromptDays) return true;
  }
  return false;
}

export function hasAnalyticsConsent(): boolean {
  const stored = getStoredConsent();
  return stored?.categories?.analytics === true;
}

export function hasMarketingConsent(): boolean {
  const stored = getStoredConsent();
  return stored?.categories?.marketing === true;
}
