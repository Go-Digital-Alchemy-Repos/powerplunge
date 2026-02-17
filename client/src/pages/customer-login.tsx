import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useBranding } from "@/hooks/use-branding";
import { CustomerAuthForm } from "@/components/CustomerAuthModal";

export default function CustomerLogin() {
  const [, setLocation] = useLocation();
  const { logoSrc } = useBranding();
  const { verifyMagicLink, login, isAuthenticated, isLoading: authLoading } = useCustomerAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      handleMagicLinkVerification(token);
    }
    if (import.meta.env.DEV && params.get("dev") === "affiliate") {
      handleDevLogin("affiliate@test.com", "testpass123", "/affiliate-portal");
    }
    if (import.meta.env.DEV && params.get("dev") === "customer") {
      handleDevLogin("customer@test.com", "testpass123", "/dashboard");
    }
  }, []);

  const handleDevLogin = async (email: string, password: string, redirect?: string) => {
    setIsLoading(true);
    try {
      await login(email, password);
      toast({ title: "Dev login", description: `Signed in as ${email}` });
      setLocation(redirect || "/");
    } catch (error: any) {
      toast({ title: "Dev login failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

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
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect") || "/";
      setLocation(redirect);
    } catch (error: any) {
      // Logic for error handled by toast in component
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
        <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-lg p-6">
          <div className="flex justify-center mb-6">
            <img src={logoSrc} alt="Logo" className="h-12" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-2">Sign in to your account</h1>
          <p className="text-muted-foreground text-center mb-6">Access your orders and account details</p>
          <CustomerAuthForm onSuccess={() => {
            const params = new URLSearchParams(window.location.search);
            const redirect = params.get("redirect") || "/";
            setLocation(redirect);
          }} />
        </div>
      </div>
    </div>
  );
}
