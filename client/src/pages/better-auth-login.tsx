import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useBetterAuth } from "@/hooks/use-better-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, Lock, ArrowLeft } from "lucide-react";
import logoImage from "@assets/powerplungelogo_1767907611722.png";

export default function BetterAuthLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { signIn, isAuthenticated, isLoading: authLoading } = useBetterAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect") || "/";
      setLocation(redirect);
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn(email, password);
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect") || "/";
      setLocation(redirect);
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-auth" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <nav className="p-4">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground" data-testid="link-home">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to home
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md" data-testid="card-better-auth-login">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img src={logoImage} alt="Power Plunge" className="h-12" data-testid="img-logo" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold" data-testid="text-login-title">
                Sign in to your account
              </CardTitle>
              <CardDescription className="mt-2">
                Access your orders and account details
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-login">
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
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    data-testid="input-password"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-submit">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/auth/register" className="text-primary hover:underline" data-testid="link-register">
                Create one
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
