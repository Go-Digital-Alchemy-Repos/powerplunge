import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail, ArrowLeft, Bug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [formData, setFormData] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      email: params.get("email") || "",
      password: "",
    };
  });

  useEffect(() => {
    fetch("/api/admin/check-setup", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.needsSetup) {
          setLocation("/admin/setup", { replace: true });
        }
      })
      .catch(() => {})
      .finally(() => setIsCheckingSetup(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      queryClient.setQueryData(["/api/admin/me"], data.admin);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/me"] });

      toast({
        title: "Welcome back",
        description: `Logged in as ${data.admin.name}`,
      });

      setLocation("/admin/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSetup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">Account Login</CardTitle>
          <CardDescription>Sign in to manage your store</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10"
                  required
                  data-testid="input-password"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-submit">
              {isLoading ? "Loading..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Link href="/admin/forgot-password">
              <Button variant="link" size="sm" className="text-muted-foreground" data-testid="link-forgot-password">
                Forgot your password?
              </Button>
            </Link>
          </div>
          <div className="mt-6 text-center">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="link-back-home">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Store
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {import.meta.env.DEV && (
        <Card className="w-full max-w-md mt-4 border-dashed border-yellow-500/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-yellow-500" />
              <CardTitle className="text-sm text-yellow-500">Dev Test Accounts</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { email: "admin@test.com", password: "testpass123", role: "admin" },
              { email: "manager@test.com", password: "testpass123", role: "store_manager" },
              { email: "fulfillment@test.com", password: "testpass123", role: "fulfillment" },
            ].map((user) => (
              <div
                key={user.email}
                className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-sm"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-xs">{user.email}</span>
                  <span className="text-muted-foreground text-xs">pw: {user.password}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">
                    {user.role.replace("_", " ")}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    data-testid={`dev-login-${user.role}`}
                    onClick={() =>
                      setFormData({ ...formData, email: user.email, password: user.password })
                    }
                  >
                    Use
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
