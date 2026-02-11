import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useBranding } from "@/hooks/use-branding";
import {
  Crown,
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Check,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type Step = "welcome" | "account" | "success";

interface PasswordCheck {
  label: string;
  met: boolean;
}

function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
    { label: "Contains a number", met: /\d/.test(password) },
  ];
}

export default function AdminSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { logoSrc, companyName } = useBranding();

  const [step, setStep] = useState<Step>("welcome");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [adminName, setAdminName] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetch("/api/admin/check-setup", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (!data.needsSetup) {
          setLocation("/admin/login", { replace: true });
        }
      })
      .catch(() => {
        setLocation("/admin/login", { replace: true });
      })
      .finally(() => setIsCheckingSetup(false));
  }, []);

  const passwordChecks = getPasswordChecks(formData.password);
  const allChecksPassed = passwordChecks.every((c) => c.met);
  const passwordsMatch =
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword;

  const canSubmit =
    formData.name.trim().length > 0 &&
    formData.email.trim().length > 0 &&
    allChecksPassed &&
    passwordsMatch;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Setup failed");
      }

      if (data.sessionToken) {
        localStorage.setItem("customerSessionToken", data.sessionToken);
      }

      setAdminName(formData.name);
      setStep("success");
    } catch (error: any) {
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSetup) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <img
            src={logoSrc}
            alt={companyName}
            className="h-10 mx-auto mb-4 object-contain"
            data-testid="img-setup-logo"
          />
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {(["welcome", "account", "success"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step === s
                    ? "bg-amber-500 text-gray-950"
                    : (["welcome", "account", "success"] as Step[]).indexOf(step) > i
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                    : "bg-gray-800 text-gray-500"
                }`}
                data-testid={`step-indicator-${s}`}
              >
                {(["welcome", "account", "success"] as Step[]).indexOf(step) > i ? (
                  <Check className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && (
                <div
                  className={`w-12 h-0.5 ${
                    (["welcome", "account", "success"] as Step[]).indexOf(step) > i
                      ? "bg-amber-500/50"
                      : "bg-gray-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {step === "welcome" && (
          <div
            className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-8 text-center"
            data-testid="step-welcome"
          >
            <div className="mx-auto mb-6 w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center">
              <Crown className="w-8 h-8 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Welcome to {companyName}
            </h1>
            <p className="text-gray-400 mb-2">
              Let's get your admin panel set up. You'll create a{" "}
              <span className="text-amber-400 font-medium">Super Admin</span>{" "}
              account with full control over your store.
            </p>
            <div className="bg-gray-800/50 rounded-lg p-4 my-6 text-left space-y-3">
              <h3 className="text-sm font-medium text-gray-300 mb-3">
                Your Super Admin account will have:
              </h3>
              {[
                "Full access to all store management features",
                "Ability to create and manage team members",
                "Protected status — cannot be deleted or demoted",
                "Complete control over store settings and configuration",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-400">{item}</span>
                </div>
              ))}
            </div>
            <Button
              onClick={() => setStep("account")}
              className="w-full bg-amber-500 hover:bg-amber-600 text-gray-950 font-medium gap-2"
              data-testid="button-get-started"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {step === "account" && (
          <div
            className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-8"
            data-testid="step-account"
          >
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-white mb-1">
                Create Your Account
              </h1>
              <p className="text-sm text-gray-400">
                Enter your details to create the Super Admin account
              </p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-gray-300">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your full name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                    required
                    data-testid="input-setup-name"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-gray-300">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@yourstore.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                    required
                    data-testid="input-setup-email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-gray-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="pl-10 pr-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                    required
                    data-testid="input-setup-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {formData.password.length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                    {passwordChecks.map((check) => (
                      <div
                        key={check.label}
                        className="flex items-center gap-1.5"
                      >
                        {check.met ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        )}
                        <span
                          className={`text-xs ${
                            check.met ? "text-emerald-400" : "text-gray-500"
                          }`}
                        >
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-gray-300">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="pl-10 pr-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                    required
                    data-testid="input-setup-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    data-testid="button-toggle-confirm"
                  >
                    {showConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {formData.confirmPassword.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1">
                    {passwordsMatch ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs text-emerald-400">
                          Passwords match
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-xs text-red-400">
                          Passwords do not match
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("welcome")}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 gap-2"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-gray-950 font-medium gap-2"
                  disabled={isLoading || !canSubmit}
                  data-testid="button-create-account"
                >
                  <Crown className="w-4 h-4" />
                  {isLoading ? "Creating Account..." : "Create Super Admin"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {step === "success" && (
          <div
            className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-8 text-center"
            data-testid="step-success"
          >
            <div className="mx-auto mb-6 w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              You're All Set!
            </h1>
            <p className="text-gray-400 mb-6">
              Welcome, <span className="text-white font-medium">{adminName}</span>.
              Your Super Admin account has been created successfully. You now
              have full control over your store.
            </p>
            <div className="bg-gray-800/50 rounded-lg p-4 mb-6 text-left space-y-2">
              <h3 className="text-sm font-medium text-gray-300 mb-2">
                Recommended next steps:
              </h3>
              {[
                "Configure your store settings and branding",
                "Add your products to the catalog",
                "Set up payment and shipping options",
                "Invite team members if needed",
              ].map((item, i) => (
                <div key={item} className="flex items-start gap-2">
                  <span className="text-xs font-mono text-amber-400 mt-0.5 shrink-0">
                    {i + 1}.
                  </span>
                  <span className="text-sm text-gray-400">{item}</span>
                </div>
              ))}
            </div>
            <Button
              onClick={() => setLocation("/admin/dashboard")}
              className="w-full bg-amber-500 hover:bg-amber-600 text-gray-950 font-medium gap-2"
              data-testid="button-go-to-dashboard"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        <p className="text-center text-xs text-gray-600 mt-6">
          This setup wizard is only available when no admin accounts exist.
        </p>
      </div>
    </div>
  );
}
