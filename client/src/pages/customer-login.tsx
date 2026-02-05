import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { Mail, Lock, ArrowLeft, Send, Loader2 } from "lucide-react";
import logoImage from "@assets/powerplungelogo_1767907611722.png";

type AuthMode = "login" | "magic-link" | "magic-link-sent";

export default function CustomerLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, requestMagicLink, verifyMagicLink, isAuthenticated, isLoading: authLoading } = useCustomerAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      handleMagicLinkVerification(token);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect") || "/";
      setLocation(redirect);
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const handleMagicLinkVerification = async (token: string) => {
    setIsLoading(true);
    try {
      await verifyMagicLink(token);
      toast({
        title: "Welcome!",
        description: "You've been signed in successfully.",
      });
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect") || "/";
      setLocation(redirect);
    } catch (error: any) {
      toast({
        title: "Link expired",
        description: error.message || "This login link is invalid or has expired. Please request a new one.",
        variant: "destructive",
      });
      setMode("magic-link");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast({
        title: "Welcome back!",
        description: "You've signed in successfully.",
      });
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect") || "/";
      setLocation(redirect);
    } catch (error: any) {
      if (error.message?.includes("email link")) {
        toast({
          title: "Use email link",
          description: "Your account uses email link login. We'll send you a login link.",
        });
        setMode("magic-link");
      } else {
        toast({
          title: "Sign in failed",
          description: error.message || "Invalid email or password",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);

    try {
      await requestMagicLink(email);
      setMode("magic-link-sent");
      toast({
        title: "Check your email",
        description: "We've sent you a login link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send login link",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md" data-testid="card-login">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img src={logoImage} alt="Power Plunge" className="h-12" data-testid="img-logo" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold" data-testid="text-login-title">
                {mode === "magic-link-sent" ? "Check your email" : "Sign in to your account"}
              </CardTitle>
              <CardDescription className="mt-2">
                {mode === "magic-link-sent" 
                  ? `We've sent a login link to ${email}`
                  : "Access your orders and account details"}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {mode === "magic-link-sent" ? (
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Send className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground">
                  Click the link in the email to sign in. The link will expire in 15 minutes.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setMode("login")}
                  className="w-full"
                  data-testid="button-back-to-login"
                >
                  Back to sign in
                </Button>
              </div>
            ) : mode === "magic-link" ? (
              <form onSubmit={handleMagicLinkRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-send-link"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send login link
                    </>
                  )}
                </Button>

                <div className="relative my-6">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    or
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMode("login")}
                  className="w-full"
                  data-testid="button-use-password"
                >
                  Sign in with password
                </Button>
              </form>
            ) : (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-sign-in"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>

                <div className="relative my-6">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    or
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMode("magic-link")}
                  className="w-full"
                  data-testid="button-use-magic-link"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Sign in with email link
                </Button>
              </form>
            )}

            {mode !== "magic-link-sent" && (
              <p className="text-center text-sm text-muted-foreground mt-6">
                Don't have an account?{" "}
                <Link href="/register" className="text-primary hover:underline" data-testid="link-register">
                  Create one
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
