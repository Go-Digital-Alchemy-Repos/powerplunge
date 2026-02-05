import { useState, useEffect } from "react";
import { useLocation, Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { Mail, Lock, User, ArrowLeft, Loader2, Ticket, PenTool, DollarSign, Users, Share2, Gift } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import logoImage from "@assets/powerplungelogo_1767907611722.png";

interface SignupInfo {
  agreementText: string;
  programEnabled: boolean;
  invite: {
    code: string;
    valid: boolean;
    error: string | null;
    targetEmail: string | null;
    targetName: string | null;
  } | null;
}

export default function BecomeAffiliate() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, login } = useCustomerAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const inviteCode = new URLSearchParams(searchString).get("code") || "";
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    signatureName: "",
    inviteCode: inviteCode,
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const { data: signupInfo, isLoading: infoLoading } = useQuery<SignupInfo>({
    queryKey: ["/api/affiliate-signup", inviteCode],
    queryFn: async () => {
      const url = inviteCode 
        ? `/api/affiliate-signup?code=${encodeURIComponent(inviteCode)}`
        : "/api/affiliate-signup";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load signup information");
      return res.json();
    },
  });

  useEffect(() => {
    if (signupInfo?.invite) {
      if (signupInfo.invite.targetEmail) {
        setFormData(prev => ({ ...prev, email: signupInfo.invite!.targetEmail! }));
      }
      if (signupInfo.invite.targetName) {
        setFormData(prev => ({ ...prev, name: signupInfo.invite!.targetName!, signatureName: signupInfo.invite!.targetName! }));
      }
      setFormData(prev => ({ ...prev, inviteCode: signupInfo.invite!.code }));
    }
  }, [signupInfo]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      setLocation("/affiliate-portal");
    }
  }, [authLoading, isAuthenticated, setLocation]);

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
          inviteCode: data.inviteCode || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Signup failed");
      return result;
    },
    onSuccess: async (data) => {
      if (data.sessionToken) {
        localStorage.setItem("customerSessionToken", data.sessionToken);
      }
      toast({
        title: "Welcome to the Affiliate Program!",
        description: "Your account has been created and you're now an affiliate.",
      });
      await login(formData.email, formData.password);
      setLocation("/affiliate-portal");
    },
    onError: (error: any) => {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: "Agreement required",
        description: "Please agree to the affiliate program terms.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.signatureName.trim()) {
      toast({
        title: "Signature required",
        description: "Please type your full legal name as signature.",
        variant: "destructive",
      });
      return;
    }

    signupMutation.mutate(formData);
  };

  if (authLoading || infoLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (signupInfo?.invite && !signupInfo.invite.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
        <nav className="p-4">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to store</span>
          </Link>
        </nav>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-destructive/10 rounded-full">
                  <Ticket className="w-8 h-8 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-xl">Invalid Invite</CardTitle>
              <CardDescription className="mt-2">
                {signupInfo.invite.error || "This invite code is not valid."}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      <nav className="p-4">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to store</span>
        </Link>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {!showForm ? (
          <div className="w-full max-w-2xl space-y-8">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <img src={logoImage} alt="Power Plunge" className="h-16" data-testid="img-logo" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-title">
                Join Our Affiliate Program
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Earn 10% commission on every sale you refer. Share your unique link and get paid for promoting Power Plunge products.
              </p>
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
                onClick={() => setShowForm(true)}
                className="px-8"
                data-testid="button-start-signup"
              >
                Apply Now
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
        ) : (
          <Card className="w-full max-w-lg" data-testid="card-signup-form">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <img src={logoImage} alt="Power Plunge" className="h-12" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold" data-testid="text-form-title">
                  Become an Affiliate
                </CardTitle>
                <CardDescription className="mt-2">
                  Create your account and join our affiliate program
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                      disabled={!!signupInfo?.invite?.targetEmail}
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
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
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                      data-testid="input-confirm-password"
                    />
                  </div>
                </div>

                {!inviteCode && (
                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">Invite code (optional)</Label>
                    <div className="relative">
                      <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="inviteCode"
                        type="text"
                        placeholder="Enter invite code if you have one"
                        value={formData.inviteCode}
                        onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value })}
                        className="pl-10"
                        data-testid="input-invite-code"
                      />
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <PenTool className="w-4 h-4" />
                    Affiliate Agreement
                  </h3>
                  
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
                      By typing your name above, you are providing your electronic signature and agreeing to the terms of this agreement.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowForm(false)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={!agreedToTerms || !formData.signatureName.trim() || signupMutation.isPending}
                    className="flex-1"
                    data-testid="button-submit"
                  >
                    {signupMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account & Join"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
