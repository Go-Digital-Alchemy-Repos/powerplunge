import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { CreditCard, ShoppingBag, Instagram, Send, Star, ExternalLink, CheckCircle2, XCircle, Link2, Youtube, Ghost, Tag, ArrowRight } from "lucide-react";
import AdminNav from "@/components/admin/AdminNav";

function StatusBadge({ configured }: { configured?: boolean }) {
  if (configured) {
    return (
      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[11px] font-medium border border-green-500/20">
        <CheckCircle2 className="w-3 h-3" />
        Configured
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium border border-border">
      <XCircle className="w-3 h-3" />
      Not Configured
    </span>
  );
}

export default function AdminEcommerceSettings() {
  const { role, hasFullAccess } = useAdmin();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const { data: integrations } = useQuery<any>({
    queryKey: ["/api/admin/integrations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/integrations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch integrations");
      return res.json();
    },
  });

  const { data: couponStats } = useQuery<any>({
    queryKey: ["/api/coupons/admin/analytics"],
  });

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="ecommerce-settings" role={role} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">E-Commerce Settings</h2>
          <p className="text-muted-foreground mt-2">
            Manage your store integrations and shopping channel connections.
          </p>
        </div>

        <div className="space-y-6">
          {/* Stripe Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="w-5 h-5 text-primary" />
                Stripe Payments
              </CardTitle>
              <CardDescription>Accept payments and manage payouts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <StatusBadge configured={integrations?.stripe} />
                <Button variant="outline" onClick={() => toast({ title: "Please use main Integrations page to reconfigure Stripe" })}>
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ShipStation API integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Send className="w-5 h-5 text-primary" />
                ShipStation
              </CardTitle>
              <CardDescription>Automate your shipping and fulfillment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input placeholder="Enter ShipStation API Key" type="password" />
                </div>
                <div className="space-y-2">
                  <Label>API Secret</Label>
                  <Input placeholder="Enter ShipStation API Secret" type="password" />
                </div>
              </div>
              <Button className="w-full">Save ShipStation Configuration</Button>
            </CardContent>
          </Card>

          {/* Shopping Integrations (Moved from main integrations) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingBag className="w-5 h-5 text-primary" />
                Shopping Channels
              </CardTitle>
              <CardDescription>Connect and sync your products across social platforms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* TikTok Shop */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5" />
                  <div>
                    <p className="font-medium text-sm">TikTok Shop</p>
                    <StatusBadge configured={integrations?.tiktokShop} />
                  </div>
                </div>
                <Button variant="ghost" size="sm">Configure</Button>
              </div>

              {/* Instagram Shop */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-3">
                  <Instagram className="w-5 h-5" />
                  <div>
                    <p className="font-medium text-sm">Instagram Shop</p>
                    <StatusBadge configured={integrations?.instagramShop} />
                  </div>
                </div>
                <Button variant="ghost" size="sm">Configure</Button>
              </div>

              {/* YouTube Shopping */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-3">
                  <Youtube className="w-5 h-5" />
                  <div>
                    <p className="font-medium text-sm">YouTube Shopping</p>
                    <StatusBadge configured={integrations?.youtubeShopping} />
                  </div>
                </div>
                <Button variant="ghost" size="sm">Configure</Button>
              </div>

              {/* Snapchat Shopping */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-3">
                  <Ghost className="w-5 h-5" />
                  <div>
                    <p className="font-medium text-sm">Snapchat Shopping</p>
                    <StatusBadge configured={integrations?.snapchatShopping} />
                  </div>
                </div>
                <Button variant="ghost" size="sm">Configure</Button>
              </div>

              {/* X Shopping */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-3">
                  <Link2 className="w-5 h-5" />
                  <div>
                    <p className="font-medium text-sm">X Shopping</p>
                    <StatusBadge configured={integrations?.xShopping} />
                  </div>
                </div>
                <Button variant="ghost" size="sm">Configure</Button>
              </div>

              {/* Pinterest Shopping */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5" />
                  <div>
                    <p className="font-medium text-sm">Pinterest Shopping</p>
                    <StatusBadge configured={integrations?.pinterestShopping} />
                  </div>
                </div>
                <Button variant="ghost" size="sm">Configure</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
