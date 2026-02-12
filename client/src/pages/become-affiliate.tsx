import { useState, useEffect, useCallback } from "react";
import { useLocation, Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import {
  Mail, Lock, User, ArrowLeft, ArrowRight, Loader2, PenTool,
  DollarSign, Users, Share2, Gift, ShieldAlert, Check, CheckCircle,
  CreditCard, ExternalLink, SkipForward, RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBranding } from "@/hooks/use-branding";

type WizardStep = "welcome" | "account" | "agreement" | "payout" | "complete";

const STEPS: WizardStep[] = ["welcome", "account", "agreement", "payout", "complete"];

const STEP_LABELS: Record<WizardStep, string> = {
  welcome: "Welcome",
  account: "Account Details",
  agreement: "Agreement",
  payout: "Payout Setup",
  complete: "Complete",
};

interface SignupInfo {
  agreementText: string;
  programEnabled: boolean;
  inviteRequired: boolean;
  inviteError: string | null;
  invite: {
    code: string;
    valid: boolean;
    error: string | null;
    emailMasked: string | null;
    hasTargetName: boolean;
    isEmailLocked: boolean;
    requiresPhoneVerification: boolean;
    phoneLastFour: string | null;
    sessionEmailMatch: boolean | null;
  } | null;
}

interface OnboardingMeta {
  requiresStripeSetup: boolean;
  hasPayoutAccount: boolean;
  canCustomizeCode: boolean;
  nextRecommendedStep: string;
}

interface ConnectStatus {
  stripeConnectId: string | null;
  stripeConnectStatus: string | null;
  isConnected: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  requirements?: {
    currently_due?: string[];
    eventually_due?: string[];
  };
}

function trackEvent(event: string, data?: Record<string, any>) {
  try {
    console.info(`[affiliate-onboarding] ${event}`, data || {});
    if (typeof window !== "undefined" && (window as any).__analytics?.track) {
      (window as any).__analytics.track(event, data);
    }
  } catch {}
}

export default function BecomeAffiliate() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const { logoSrc, companyName } = useBranding();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading, login, logout, customer: authCustomer, getAuthHeader, refreshSession } = useCustomerAuth();

  const params = new URLSearchParams(searchString);
  const inviteCode = params.get("code") || "";
  const connectReturn = params.get("connect");

  const [currentStep, setCurrentStep] = useState<WizardStep>("welcome");
  const [accountCreated, setAccountCreated] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [affiliateCode, setAffiliateCode] = useState("");
  const [affiliateId, setAffiliateId] = useState("");
  const [onboardingMeta, setOnboardingMeta] = useState<OnboardingMeta | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    signatureName: "",
    inviteCode: inviteCode,
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);


  const [existingAccountError, setExistingAccountError] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);

  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [phoneVerifyError, setPhoneVerifyError] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [sessionNonce] = useState(() => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36));

  const { data: signupInfo, isLoading: infoLoading } = useQuery<SignupInfo>({
    queryKey: ["/api/affiliate-signup", inviteCode, isAuthenticated],
    queryFn: async () => {
      const url = inviteCode
        ? `/api/affiliate-signup?code=${encodeURIComponent(inviteCode)}`
        : "/api/affiliate-signup";
      const headers: Record<string, string> = getAuthHeader();
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Failed to load signup information");
      return res.json();
    },
  });

  const { data: connectStatus, refetch: refetchConnectStatus } = useQuery<ConnectStatus>({
    queryKey: ["/api/customer/affiliate-portal/connect/status"],
    queryFn: async () => {
      const res = await fetch("/api/customer/affiliate-portal/connect/status", {
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error("Failed to fetch connect status");
      return res.json();
    },
    enabled: accountCreated && (currentStep === "payout" || currentStep === "complete"),
    refetchInterval: currentStep === "payout" ? 5000 : false,
  });

  useEffect(() => {
    if (signupInfo?.invite) {
      setFormData(prev => ({ ...prev, inviteCode: signupInfo.invite!.code }));
    }
  }, [signupInfo]);

  const [sessionMismatch, setSessionMismatch] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated && authCustomer && !accountCreated && !connectReturn && signupInfo) {
      if (signupInfo.invite?.isEmailLocked) {
        if (signupInfo.invite.sessionEmailMatch !== true) {
          setSessionMismatch(true);
          setCurrentStep("account");
          return;
        }
      }
      setFormData(prev => ({
        ...prev,
        name: prev.name || authCustomer.name || "",
        email: prev.email || authCustomer.email || "",
      }));
      setCurrentStep("agreement");
    }
  }, [authLoading, isAuthenticated, authCustomer, accountCreated, connectReturn, signupInfo]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && connectReturn) {
      setAccountCreated(true);
      setCurrentStep("payout");
      refetchConnectStatus();
      const newUrl = window.location.pathname + (inviteCode ? `?code=${inviteCode}` : "");
      window.history.replaceState({}, "", newUrl);
      if (connectReturn === "complete") {
        toast({ title: "Stripe Connect completed!", description: "Your payout account has been set up." });
        trackEvent("stripe_connect_returned", { status: "complete" });
      } else if (connectReturn === "refresh") {
        toast({ title: "Stripe onboarding paused", description: "You can continue or complete it later." });
        trackEvent("stripe_connect_returned", { status: "refresh" });
      }
    }
  }, [authLoading, isAuthenticated, accountCreated, connectReturn, setLocation]);

  const signupMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/affiliate-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
          signatureName: data.signatureName,
          inviteCode: data.inviteCode,
          ...(verificationToken ? { verificationToken } : {}),
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        const err: any = new Error(result.message || "Signup failed");
        err.existingCustomer = result.existingCustomer || false;
        throw err;
      }
      return result;
    },
    onSuccess: async (data) => {
      setExistingAccountError(false);
      if (data.sessionToken) {
        localStorage.setItem("customerSessionToken", data.sessionToken);
        setSessionToken(data.sessionToken);
      }
      setAffiliateCode(data.affiliate.code);
      setAffiliateId(data.affiliate.id);
      if (data.onboarding) {
        setOnboardingMeta(data.onboarding);
      }
      if (data.passwordUpgraded) {
        toast({
          title: "Account upgraded!",
          description: "Your password has been set. You can now log in with your email and password going forward.",
        });
      }
      await refreshSession();
      setAccountCreated(true);
      trackEvent("step_completed", { step: "agreement", affiliateId: data.affiliate.id });
      setCurrentStep("payout");
      trackEvent("step_viewed", { step: "payout" });
    },
    onError: (error: any) => {
      if (error.existingCustomer) {
        setExistingAccountError(true);
        setCurrentStep("account");
      }
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (data: { signatureName: string; inviteCode: string }) => {
      const token = localStorage.getItem("customerSessionToken");
      const res = await fetch("/api/affiliate-signup/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          signatureName: data.signatureName,
          inviteCode: data.inviteCode,
          ...(verificationToken ? { verificationToken } : {}),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to join");
      return result;
    },
    onSuccess: (data) => {
      setAffiliateCode(data.affiliate.code);
      setAffiliateId(data.affiliate.id);
      if (data.onboarding) {
        setOnboardingMeta(data.onboarding);
      }
      setAccountCreated(true);
      trackEvent("step_completed", { step: "agreement", affiliateId: data.affiliate.id });
      setCurrentStep("payout");
      trackEvent("step_viewed", { step: "payout" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to join",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startConnectMutation = useMutation({
    mutationFn: async () => {
      const returnPath = `/become-affiliate${inviteCode ? `?code=${inviteCode}` : ""}`;
      const res = await fetch("/api/customer/affiliate-portal/connect/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({ returnPath }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to start Stripe Connect");
      }
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      trackEvent("stripe_connect_initiated", { affiliateId });
      window.open(data.url, "_blank");
      toast({
        title: "Stripe onboarding opened",
        description: "Complete the steps in the new tab. This page will update automatically.",
      });
    },
    onError: (error: any) => {
      toast({ title: "Stripe setup error", description: error.message, variant: "destructive" });
    },
  });


  const goToStep = (step: WizardStep) => {
    setCurrentStep(step);
    trackEvent("step_viewed", { step });
  };

  const handleNext = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) {
      const nextStep = STEPS[idx + 1];
      trackEvent("step_completed", { step: currentStep });
      if (nextStep === "complete") {
        trackEvent("onboarding_completed", { affiliateId, stripeConnected: connectStatus?.payoutsEnabled || false });
      }
      goToStep(nextStep);
    }
  };

  const handleBack = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx > 0) {
      if (accountCreated && STEPS[idx - 1] === "agreement") return;
      if (accountCreated && STEPS[idx - 1] === "account") return;
      if (accountCreated && STEPS[idx - 1] === "welcome") return;
      if (isAuthenticated && (STEPS[idx - 1] === "account" || STEPS[idx - 1] === "welcome")) return;
      goToStep(STEPS[idx - 1]);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (sessionMismatch) {
      toast({ title: "Account mismatch", description: "Please log out and sign up with the correct email address.", variant: "destructive" });
      return;
    }

    if (!agreedToTerms) {
      toast({ title: "Agreement required", description: "Please agree to the affiliate program terms.", variant: "destructive" });
      return;
    }
    if (!formData.signatureName.trim()) {
      toast({ title: "Signature required", description: "Please type your full legal name as signature.", variant: "destructive" });
      return;
    }

    if (isAuthenticated) {
      joinMutation.mutate({
        signatureName: formData.signatureName,
        inviteCode: formData.inviteCode,
      });
    } else {
      if (formData.password !== formData.confirmPassword) {
        toast({ title: "Passwords don't match", description: "Please make sure your passwords match.", variant: "destructive" });
        return;
      }
      if (formData.password.length < 8) {
        toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
        return;
      }
      signupMutation.mutate(formData);
    }
  };

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case "welcome":
        return true;
      case "account":
        if (sessionMismatch) return false;
        return !!(formData.name && formData.email && formData.password && formData.confirmPassword && formData.password === formData.confirmPassword && formData.password.length >= 8);
      case "agreement":
        return agreedToTerms && !!formData.signatureName.trim();
      case "payout":
        return true;
      case "complete":
        return false;
      default:
        return false;
    }
  };

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progressPercent = Math.round((currentStepIndex / (STEPS.length - 1)) * 100);

  if (authLoading || infoLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasValidInvite = signupInfo?.invite?.valid === true;
  const inviteErrorMessage = signupInfo?.invite?.error || signupInfo?.inviteError || null;
  const isReturningFromStripe = connectReturn === "complete" || connectReturn === "refresh";

  if (!hasValidInvite && !isReturningFromStripe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
        <nav className="p-4">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to store</span>
          </Link>
        </nav>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center" data-testid="card-invite-required">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-amber-500/10 rounded-full">
                  <ShieldAlert className="w-8 h-8 text-amber-500" />
                </div>
              </div>
              <CardTitle className="text-xl" data-testid="text-invite-title">
                {inviteCode ? "Invalid Invite" : "Invite Required"}
              </CardTitle>
              <CardDescription className="mt-2" data-testid="text-invite-message">
                {inviteErrorMessage || "Our affiliate program is invite-only. You need a valid invite link from an administrator to sign up."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                If you believe you should have access, please contact us and we'll send you an invite.
              </p>
              <Link href="/">
                <Button className="w-full" data-testid="button-return-store">Return to Store</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const needsPhoneVerification = signupInfo?.invite?.requiresPhoneVerification && !phoneVerified;

  const handleSendVerificationCode = async () => {
    setSendingCode(true);
    setPhoneVerifyError(null);
    try {
      const res = await fetch("/api/affiliate-signup/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode, sessionNonce }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send code");
      if (data.alreadyVerified) {
        setPhoneVerified(true);
        return;
      }
      setCodeSent(true);
      toast({ title: "Code Sent!", description: `Verification code sent to phone ending in ${signupInfo?.invite?.phoneLastFour}` });
    } catch (err: any) {
      setPhoneVerifyError(err.message);
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyPhone = async () => {
    setVerifyingCode(true);
    setPhoneVerifyError(null);
    try {
      const res = await fetch("/api/affiliate-signup/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode, code: verificationCode, sessionNonce }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Verification failed");
      if (data.verificationToken) {
        setVerificationToken(data.verificationToken);
      }
      setPhoneVerified(true);
      toast({ title: "Verified!", description: "Phone number verified successfully." });
    } catch (err: any) {
      setPhoneVerifyError(err.message);
    } finally {
      setVerifyingCode(false);
    }
  };

  if (needsPhoneVerification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
        <nav className="p-4">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to store</span>
          </Link>
        </nav>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md" data-testid="card-phone-verification">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-xl" data-testid="text-phone-verify-title">
                Phone Verification Required
              </CardTitle>
              <CardDescription className="mt-2">
                This invite is secured to a specific phone number ending in <strong>****{signupInfo?.invite?.phoneLastFour}</strong>. 
                Please verify your phone to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!codeSent ? (
                <Button
                  className="w-full h-12 text-base"
                  onClick={handleSendVerificationCode}
                  disabled={sendingCode}
                  data-testid="button-send-code"
                >
                  {sendingCode ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Verification Code"
                  )}
                </Button>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="verificationCode">Enter the 6-digit code</Label>
                    <Input
                      id="verificationCode"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="h-14 text-center text-2xl tracking-[0.5em] font-mono"
                      autoFocus
                      data-testid="input-verification-code"
                    />
                  </div>
                  <Button
                    className="w-full h-12 text-base"
                    onClick={handleVerifyPhone}
                    disabled={verifyingCode || verificationCode.length !== 6}
                    data-testid="button-verify-code"
                  >
                    {verifyingCode ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify & Continue"
                    )}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                    onClick={handleSendVerificationCode}
                    disabled={sendingCode}
                    data-testid="button-resend-code"
                  >
                    {sendingCode ? "Sending..." : "Resend code"}
                  </button>
                </>
              )}

              {phoneVerifyError && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg" data-testid="text-phone-verify-error">
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-destructive">{phoneVerifyError}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (signupInfo && !signupInfo.programEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="text-center">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-muted rounded-full">
                  <Gift className="w-8 h-8 text-muted-foreground" />
                </div>
              </div>
              <CardTitle className="text-xl">Program Unavailable</CardTitle>
              <CardDescription className="mt-2">
                The affiliate program is not currently accepting new members. Please check back later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/">
                <Button className="w-full">Return to Store</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getStripeStatus = (): { label: string; color: string; icon: React.ReactNode } => {
    if (!connectStatus || !connectStatus.isConnected) {
      return { label: "Not Started", color: "bg-gray-500/20 text-gray-500 border-gray-500/30", icon: <CreditCard className="w-4 h-4" /> };
    }
    if (connectStatus.payoutsEnabled) {
      return { label: "Connected", color: "bg-green-500/20 text-green-500 border-green-500/30", icon: <CheckCircle className="w-4 h-4" /> };
    }
    if (connectStatus.detailsSubmitted) {
      return { label: "In Progress", color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30", icon: <RefreshCw className="w-4 h-4" /> };
    }
    if (connectStatus.requirements?.currently_due?.length) {
      return { label: "Needs Action", color: "bg-orange-500/20 text-orange-500 border-orange-500/30", icon: <AlertCircle className="w-4 h-4" /> };
    }
    return { label: "In Progress", color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30", icon: <RefreshCw className="w-4 h-4" /> };
  };

  const renderChecklist = () => {
    const items = [
      { label: "Account created", done: accountCreated },
      { label: "Agreement signed", done: accountCreated },
      { label: "Payout setup", done: connectStatus?.payoutsEnabled || false, partial: connectStatus?.isConnected && !connectStatus?.payoutsEnabled },
    ];

    return (
      <div className="space-y-2" data-testid="checklist-progress">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            {item.done ? (
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            ) : item.partial ? (
              <RefreshCw className="w-4 h-4 text-yellow-500 shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
            )}
            <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderStepIndicator = () => (
    <div className="w-full max-w-2xl mx-auto mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">
          Step {currentStepIndex + 1} of {STEPS.length}
        </span>
        <span className="text-sm font-medium text-primary">{STEP_LABELS[currentStep]}</span>
      </div>
      <Progress value={progressPercent} className="h-2" data-testid="progress-wizard" />
      <div className="flex justify-between mt-2">
        {STEPS.map((step, i) => {
          const isActive = i === currentStepIndex;
          const isCompleted = i < currentStepIndex;
          const isPostSignup = i >= STEPS.indexOf("payout");
          const isPreSignup = i < STEPS.indexOf("payout");
          const isClickable = (isCompleted && isPreSignup && !accountCreated) || (accountCreated && isPostSignup && isCompleted);
          return (
            <button
              key={step}
              onClick={() => isClickable && goToStep(step)}
              disabled={!isClickable}
              className={`text-xs px-1 transition-colors ${
                isActive ? "text-primary font-semibold" :
                isCompleted ? "text-green-500 cursor-pointer hover:text-green-600" :
                "text-muted-foreground/50"
              } ${isClickable && !isActive ? "cursor-pointer hover:text-primary" : ""}`}
              data-testid={`step-indicator-${step}`}
            >
              {isCompleted ? <Check className="w-3 h-3 inline mr-0.5" /> : null}
              <span className="hidden sm:inline">{STEP_LABELS[step]}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderWelcomeStep = () => (
    <div className="w-full max-w-2xl space-y-8">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <img src={logoSrc} alt={companyName} className="h-16" data-testid="img-logo" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-title">
          Join Our Affiliate Program
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Earn 10% commission on every sale you refer. Share your unique link and get paid for promoting Power Plunge products.
        </p>
        {signupInfo?.invite?.hasTargetName && (
          <p className="text-primary font-medium" data-testid="text-welcome-name">
            Welcome! You've been personally invited.
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-primary/10 rounded-full">
                <Share2 className="w-6 h-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-lg">Share Your Link</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Get a unique affiliate link and QR code to share with your audience
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-lg">Refer Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              When people click your link and make a purchase, you earn a commission
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-primary/10 rounded-full">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-lg">Get Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Request payouts via Stripe Connect once you reach the minimum threshold
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleNext}
          className="px-8 gap-2"
          data-testid="button-start-signup"
        >
          Get Started
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>{" "}
        and join from your account dashboard.
      </p>
    </div>
  );

  const renderAccountStep = () => (
    <Card className="w-full max-w-lg" data-testid="card-account-step">
      <CardHeader className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="p-3 bg-primary/10 rounded-full">
            <User className="w-6 h-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Create Your Account</CardTitle>
        <CardDescription>Enter your details to get started</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessionMismatch && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-3" data-testid="session-mismatch-warning">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-500">Different account detected</p>
                <p className="text-xs text-muted-foreground">
                  You're currently logged in as <strong>{authCustomer?.email}</strong>, but this invite was sent to <strong>{signupInfo?.invite?.emailMasked}</strong>. Please log out and sign up with the correct email address.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
              onClick={() => {
                logout();
                setSessionMismatch(false);
                setFormData(prev => ({ ...prev, name: "", email: "", password: "", confirmPassword: "" }));
                setCurrentStep("welcome");
                queryClient.invalidateQueries({ queryKey: ["/api/affiliate-signup"] });
              }}
              data-testid="button-logout-switch"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Log out and start fresh
            </Button>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="pl-10"
              required
              data-testid="input-name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="pl-10"
              required
              disabled={false}
              data-testid="input-email"
            />
          </div>
          {signupInfo?.invite?.isEmailLocked && signupInfo.invite.emailMasked && (
            <p className="text-xs text-muted-foreground" data-testid="text-email-locked-hint">This invite is for {signupInfo.invite.emailMasked}. Please enter the matching email address.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Min 8 chars"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-10"
                required
                data-testid="input-password"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              data-testid="input-confirm-password"
            />
          </div>
        </div>

        {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
          <p className="text-sm text-destructive" data-testid="text-password-mismatch">Passwords don't match</p>
        )}
        {formData.password && formData.password.length > 0 && formData.password.length < 8 && (
          <p className="text-sm text-destructive">Password must be at least 8 characters</p>
        )}

        {existingAccountError && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-3" data-testid="existing-account-notice">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-600">An account with this email already exists</p>
                <p className="text-xs text-muted-foreground">
                  Please enter your existing account password above. If you've forgotten your password, you can reset it or use a login link instead.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-primary/30 text-primary hover:bg-primary/10 gap-2"
                disabled={sendingMagicLink || magicLinkSent || !formData.email}
                onClick={async () => {
                  if (!formData.email) {
                    toast({ title: "Email required", description: "Please enter your email address above first.", variant: "destructive" });
                    return;
                  }
                  setSendingMagicLink(true);
                  try {
                    const res = await fetch("/api/customer/auth/magic-link", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: formData.email }),
                    });
                    if (res.ok) {
                      setMagicLinkSent(true);
                      toast({
                        title: "Login link sent!",
                        description: "Check your email for a login link. Once logged in, return to this page to continue your affiliate signup.",
                      });
                    } else {
                      toast({ title: "Failed to send", description: "Could not send login link. Please try again.", variant: "destructive" });
                    }
                  } catch {
                    toast({ title: "Failed to send", description: "Could not send login link. Please try again.", variant: "destructive" });
                  } finally {
                    setSendingMagicLink(false);
                  }
                }}
                data-testid="button-send-magic-link"
              >
                {sendingMagicLink ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                ) : magicLinkSent ? (
                  <><CheckCircle className="w-4 h-4" /> Login link sent — check your email</>
                ) : (
                  <><Mail className="w-4 h-4" /> Send me a login link instead</>
                )}
              </Button>
              <Link href={`/reset-password?returnTo=${encodeURIComponent(`/become-affiliate${inviteCode ? `?code=${inviteCode}` : ""}`)}`}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-amber-500/30 text-amber-600 hover:bg-amber-500/10 gap-2"
                  data-testid="button-forgot-password"
                >
                  <Lock className="w-4 h-4" />
                  Reset My Password
                </Button>
              </Link>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={handleBack} className="flex-1 gap-2" data-testid="button-back-account">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canGoNext()}
            className="flex-1 gap-2"
            data-testid="button-next-account"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderAgreementStep = () => (
    <Card className="w-full max-w-lg" data-testid="card-agreement-step">
      <CardHeader className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="p-3 bg-primary/10 rounded-full">
            <PenTool className="w-6 h-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Affiliate Agreement</CardTitle>
        <CardDescription>Review and sign the affiliate program terms</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="p-4 bg-muted rounded-lg max-h-48 overflow-y-auto text-sm whitespace-pre-wrap" data-testid="text-agreement">
            {signupInfo?.agreementText || "Loading agreement..."}
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="agree"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              data-testid="checkbox-agree"
            />
            <label htmlFor="agree" className="text-sm cursor-pointer">
              I have read and agree to the affiliate program terms and conditions above.
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signature">E-Signature (Type your full legal name)</Label>
            <Input
              id="signature"
              placeholder="Your full legal name"
              value={formData.signatureName}
              onChange={(e) => setFormData({ ...formData, signatureName: e.target.value })}
              className="font-signature text-lg"
              data-testid="input-signature"
            />
            <p className="text-xs text-muted-foreground">
              By typing your name above, you are providing your electronic signature and agreeing to the terms.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            {!isAuthenticated && (
              <Button type="button" variant="outline" onClick={handleBack} className="flex-1 gap-2" data-testid="button-back-agreement">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            <Button
              type="submit"
              disabled={!canGoNext() || signupMutation.isPending || joinMutation.isPending}
              className="flex-1 gap-2"
              data-testid="button-submit-agreement"
            >
              {(signupMutation.isPending || joinMutation.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isAuthenticated ? "Joining..." : "Creating Account..."}
                </>
              ) : (
                <>
                  {isAuthenticated ? "Join Program" : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderPayoutStep = () => {
    const stripeStatus = getStripeStatus();

    return (
      <Card className="w-full max-w-lg" data-testid="card-payout-step">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-full">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Set Up Payouts</CardTitle>
          <CardDescription>
            Connect your Stripe account to receive commission payouts directly to your bank
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg border space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Stripe Connect</span>
              <Badge className={stripeStatus.color} data-testid="badge-stripe-status">
                {stripeStatus.icon}
                <span className="ml-1">{stripeStatus.label}</span>
              </Badge>
            </div>

            {connectStatus?.payoutsEnabled ? (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-500/10 p-3 rounded-lg" data-testid="text-payouts-enabled">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <span>Your payout account is fully set up and ready to receive commissions!</span>
              </div>
            ) : connectStatus?.isConnected && !connectStatus?.payoutsEnabled ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-500/10 p-3 rounded-lg">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>Your Stripe account is connected but needs additional information before payouts can be enabled.</span>
                </div>
                {connectStatus.requirements?.currently_due && connectStatus.requirements.currently_due.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Requirements due:</p>
                    <ul className="list-disc list-inside">
                      {connectStatus.requirements.currently_due.map((req, i) => (
                        <li key={i}>{req.replace(/_/g, " ")}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button
                  onClick={() => startConnectMutation.mutate()}
                  disabled={startConnectMutation.isPending}
                  variant="outline"
                  className="w-full gap-2"
                  data-testid="button-continue-stripe"
                >
                  {startConnectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  Continue Stripe Setup
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Stripe Connect lets you receive payouts directly to your bank account. Setup takes about 5 minutes.
                </p>
                <Button
                  onClick={() => startConnectMutation.mutate()}
                  disabled={startConnectMutation.isPending}
                  className="w-full gap-2"
                  data-testid="button-start-stripe"
                >
                  {startConnectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  Connect with Stripe
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                trackEvent("stripe_skipped", { affiliateId });
                handleNext();
              }}
              className="flex-1 gap-2"
              data-testid="button-skip-stripe"
            >
              <SkipForward className="w-4 h-4" />
              Skip for Now
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 gap-2"
              data-testid="button-next-payout"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            You can always set up or update Stripe Connect later from your affiliate portal.
          </p>
        </CardContent>
      </Card>
    );
  };

  const renderCompleteStep = () => {
    return (
      <Card className="w-full max-w-lg" data-testid="card-complete-step">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-green-500/10 rounded-full">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold" data-testid="text-complete-title">You're All Set!</CardTitle>
          <CardDescription>
            Your affiliate account is ready. Start sharing your link and earning commissions!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderChecklist()}

          {!connectStatus?.payoutsEnabled && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg border border-yellow-200 dark:border-yellow-500/20">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Don't forget to set up Stripe Connect in your portal to receive payouts!
              </p>
            </div>
          )}

          <Button
            onClick={() => setLocation("/affiliate-portal")}
            className="w-full gap-2"
            size="lg"
            data-testid="button-go-to-portal"
          >
            Go to Affiliate Portal
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case "welcome": return renderWelcomeStep();
      case "account": return renderAccountStep();
      case "agreement": return renderAgreementStep();
      case "payout": return renderPayoutStep();
      case "complete": return renderCompleteStep();
      default: return renderWelcomeStep();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      <nav className="p-4 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to store</span>
        </Link>
        {accountCreated && currentStep !== "complete" && (
          <div className="hidden md:block">{renderChecklist()}</div>
        )}
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {currentStep !== "welcome" && renderStepIndicator()}
        {renderCurrentStep()}
      </div>
    </div>
  );
}
