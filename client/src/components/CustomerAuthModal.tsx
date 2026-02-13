import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { Mail, Lock, Send, Loader2 } from "lucide-react";
import { useBranding } from "@/hooks/use-branding";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type AuthMode = "login" | "magic-link" | "magic-link-sent" | "register";

interface CustomerAuthFormProps {
  onSuccess?: () => void;
  initialMode?: AuthMode;
}

export function CustomerAuthForm({ onSuccess, initialMode = "login" }: CustomerAuthFormProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { logoSrc, companyName } = useBranding();
  const { login, register, requestMagicLink } = useCustomerAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      toast({ title: "Welcome back!", description: "You've signed in successfully." });
      onSuccess?.();
    } catch (error: any) {
      if (error.message?.includes("email link")) {
        toast({ title: "Use email link", description: "Your account uses email link login. We'll send you a login link." });
        setMode("magic-link");
      } else {
        toast({ title: "Sign in failed", description: error.message || "Invalid email or password", variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register(email, password, name);
      toast({ title: "Welcome!", description: "Your account has been created." });
      onSuccess?.();
    } catch (error: any) {
      toast({ title: "Registration failed", description: error.message || "Something went wrong", variant: "destructive" });
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
      toast({ title: "Check your email", description: "We've sent you a login link." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send login link", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === "magic-link-sent") {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Send className="w-8 h-8 text-primary" />
        </div>
        <p className="text-muted-foreground">
          Click the link in the email to sign in. The link will expire in 15 minutes.
        </p>
        <Button variant="outline" onClick={() => setMode("login")} className="w-full">
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      {mode === "register" ? (
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reg-name">Full Name</Label>
            <Input id="reg-name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-email">Email address</Label>
            <Input id="reg-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-password">Password</Label>
            <Input id="reg-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Create Account
          </Button>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <button type="button" onClick={() => setMode("login")} className="text-primary hover:underline font-medium">Sign in</button>
          </p>
        </form>
      ) : mode === "magic-link" ? (
        <form onSubmit={handleMagicLinkRequest} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ml-email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="ml-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send login link
          </Button>
          <div className="relative my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">or</span>
          </div>
          <Button type="button" variant="outline" onClick={() => setMode("login")} className="w-full">Sign in with password</Button>
        </form>
      ) : (
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="login-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="login-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Sign in
          </Button>
          <div className="relative my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">or</span>
          </div>
          <Button type="button" variant="outline" onClick={() => setMode("magic-link")} className="w-full">
            <Mail className="w-4 h-4 mr-2" />
            Sign in with email link
          </Button>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <button type="button" onClick={() => setMode("register")} className="text-primary hover:underline font-medium">Create one</button>
          </p>
        </form>
      )}
    </div>
  );
}

export function CustomerAuthModal({ 
  open, 
  onOpenChange,
  initialMode = "login"
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  initialMode?: AuthMode;
}) {
  const { logoSrc, companyName } = useBranding();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="flex justify-center pb-2">
            <img src={logoSrc} alt={companyName} className="h-10" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">
            Sign in to your account
          </DialogTitle>
          <DialogDescription className="text-center">
            Access your orders and account details
          </DialogDescription>
        </DialogHeader>
        <CustomerAuthForm onSuccess={() => onOpenChange(false)} initialMode={initialMode} />
      </DialogContent>
    </Dialog>
  );
}
