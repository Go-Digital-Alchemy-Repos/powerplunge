import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Crown, Truck, Gift, Zap, Sparkles, Mail, Phone, MapPin, Lock, AlertCircle, Save, Loader2, Upload, Trash2 } from "lucide-react";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useToast } from "@/hooks/use-toast";
import UserAvatar from "@/components/UserAvatar";
import { useAccountProfile } from "../hooks/useAccountProfile";
import { useAccountVip } from "../hooks/useAccountVip";
import type { VipData } from "../types";

export default function AccountTab() {
  const { customer: authCustomer } = useCustomerAuth();
  const { toast } = useToast();
  const {
    profileForm,
    setProfileForm,
    passwordForm,
    setPasswordForm,
    profileLoading,
    updateProfileMutation,
    changePasswordMutation,
    handleAvatarUpload,
    handleAvatarRemove,
  } = useAccountProfile();
  const { vipData } = useAccountVip();

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl font-bold" data-testid="text-account-title">Account Details</h1>
        {authCustomer?.id && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 border" data-testid="text-customer-client-id">
            <span className="text-sm text-muted-foreground">Client ID:</span>
            <span className="font-semibold text-primary">{authCustomer.id.slice(0, 8).toUpperCase()}</span>
          </div>
        )}
      </div>

      {profileLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {vipData?.isVip && (
            <VipBenefitsCard vipData={vipData} />
          )}

          {!vipData?.isVip && vipData?.eligibility && (
            <VipProgressCard vipData={vipData} />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
                <UserAvatar
                  name={authCustomer?.name}
                  avatarUrl={authCustomer?.avatarUrl}
                  size="lg"
                />
                <div className="flex flex-col gap-2">
                  <p className="font-medium">{authCustomer?.name || "Customer"}</p>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="customer-avatar-upload"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        await handleAvatarUpload(file);
                        e.target.value = "";
                      }}
                      data-testid="input-customer-avatar-upload"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("customer-avatar-upload")?.click()}
                      data-testid="button-upload-customer-avatar"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      Upload Photo
                    </Button>
                    {authCustomer?.avatarUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={handleAvatarRemove}
                        data-testid="button-remove-customer-avatar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); updateProfileMutation.mutate(profileForm); }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      placeholder="John"
                      data-testid="input-first-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      placeholder="Doe"
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    placeholder="john@example.com"
                    data-testid="input-email"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    data-testid="input-phone"
                  />
                </div>
                <Button type="submit" disabled={updateProfileMutation.isPending} className="gap-2" data-testid="button-save-profile">
                  {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Mailing Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); updateProfileMutation.mutate(profileForm); }} className="space-y-4">
                <div>
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    placeholder="123 Main Street"
                    data-testid="input-address"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={profileForm.city}
                      onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                      placeholder="Los Angeles"
                      data-testid="input-city"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={profileForm.state}
                      onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                      placeholder="CA"
                      data-testid="input-state"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      value={profileForm.zipCode}
                      onChange={(e) => setProfileForm({ ...profileForm, zipCode: e.target.value })}
                      placeholder="90001"
                      data-testid="input-zip"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={profileForm.country}
                    onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                    placeholder="USA"
                    data-testid="input-country"
                  />
                </div>
                <Button type="submit" disabled={updateProfileMutation.isPending} className="gap-2" data-testid="button-save-address">
                  {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Address
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    If you signed in with Google, Apple, or a magic link, you cannot change your password here. 
                    Please update your password through your identity provider's settings.
                  </p>
                </div>
              </div>
              <form onSubmit={(e) => { 
                e.preventDefault(); 
                if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                  toast({ title: "Passwords don't match", variant: "destructive" });
                  return;
                }
                changePasswordMutation.mutate({ 
                  currentPassword: passwordForm.currentPassword, 
                  newPassword: passwordForm.newPassword 
                }); 
              }} className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="••••••••"
                    data-testid="input-current-password"
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="••••••••"
                    data-testid="input-new-password"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    data-testid="input-confirm-password"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={changePasswordMutation.isPending || !passwordForm.newPassword} 
                  className="gap-2"
                  data-testid="button-change-password"
                >
                  {changePasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Change Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

function VipBenefitsCard({ vipData }: { vipData: VipData }) {
  return (
    <Card className="border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-yellow-500/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" />
          VIP Member Benefits
          <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-0 ml-2">
            {vipData.vipStatus?.tier || "Gold"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          You've been a VIP member since{" "}
          {vipData.vipStatus?.promotedAt
            ? new Date(vipData.vipStatus.promotedAt).toLocaleDateString()
            : "recently"}.
          Enjoy these exclusive benefits:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {vipData.benefits.freeShipping && (
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
              <Truck className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium text-sm">Free Shipping</p>
                <p className="text-xs text-muted-foreground">On all orders</p>
              </div>
            </div>
          )}
          {vipData.benefits.discountPercent > 0 && (
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
              <Gift className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-sm">{vipData.benefits.discountPercent}% VIP Discount</p>
                <p className="text-xs text-muted-foreground">Applied at checkout</p>
              </div>
            </div>
          )}
          {vipData.benefits.prioritySupport && (
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
              <Zap className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="font-medium text-sm">Priority Support</p>
                <p className="text-xs text-muted-foreground">Skip the queue</p>
              </div>
            </div>
          )}
          {vipData.benefits.earlyAccess && (
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <div>
                <p className="font-medium text-sm">Early Access</p>
                <p className="text-xs text-muted-foreground">New products first</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function VipProgressCard({ vipData }: { vipData: VipData }) {
  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Crown className="w-5 h-5 text-muted-foreground" />
          VIP Program
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Unlock exclusive VIP benefits! Here's your progress:
        </p>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Lifetime Spend</span>
              <span>
                ${(vipData.eligibility.lifetimeSpend / 100).toLocaleString()} /{" "}
                ${(vipData.eligibility.spendThreshold / 100).toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all"
                style={{
                  width: `${Math.min(100, (vipData.eligibility.lifetimeSpend / vipData.eligibility.spendThreshold) * 100)}%`,
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Order Count</span>
              <span>
                {vipData.eligibility.orderCount} / {vipData.eligibility.orderThreshold} orders
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all"
                style={{
                  width: `${Math.min(100, (vipData.eligibility.orderCount / vipData.eligibility.orderThreshold) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Reach either threshold to become a VIP member and unlock free shipping, exclusive discounts, and more!
        </p>
      </CardContent>
    </Card>
  );
}
