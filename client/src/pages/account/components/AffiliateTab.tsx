import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DollarSign, Users, Clock, CheckCircle, Copy, ExternalLink, FileText, Loader2, CreditCard, AlertTriangle, Calendar, AlertCircle } from "lucide-react";
import { useAccountAffiliate } from "../hooks/useAccountAffiliate";

export default function AffiliateTab() {
  const {
    affiliateData,
    affiliateLoading,
    connectStatus,
    startConnectMutation,
    signAgreementMutation,
    showEsign,
    setShowEsign,
    signatureName,
    setSignatureName,
    agreedToTerms,
    setAgreedToTerms,
    copied,
    copyReferralLink,
    generateQRCodeUrl,
    getNextPayoutDate,
  } = useAccountAffiliate();

  return (
    <>
      <h1 className="font-display text-3xl font-bold mb-8" data-testid="text-affiliate-title">Affiliate Program</h1>

      {affiliateLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : affiliateData?.affiliate ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Your Affiliate Dashboard</CardTitle>
                <Badge className={
                  affiliateData.affiliate.status === "active" 
                    ? "bg-green-500/20 text-green-500" 
                    : affiliateData.affiliate.status === "pending"
                    ? "bg-yellow-500/20 text-yellow-500"
                    : "bg-red-500/20 text-red-500"
                }>
                  {affiliateData.affiliate.status.charAt(0).toUpperCase() + affiliateData.affiliate.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <DollarSign className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">${(affiliateData.affiliate.totalEarnings / 100).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                </div>
                <div className="p-4 bg-yellow-500/10 rounded-lg text-center border border-yellow-500/20">
                  <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-yellow-600">${(affiliateData.affiliate.pendingEarnings / 100).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-xs text-muted-foreground mt-1">{affiliateData.approvalDays} day hold</p>
                </div>
                <div className="p-4 bg-blue-500/10 rounded-lg text-center border border-blue-500/20">
                  <CheckCircle className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">${((affiliateData.affiliate.approvedEarnings || 0) / 100).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Ready to Pay</p>
                </div>
                <div className="p-4 bg-green-500/10 rounded-lg text-center border border-green-500/20">
                  <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">${(affiliateData.affiliate.paidEarnings / 100).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Paid Out</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{affiliateData.affiliate.totalConversions}</p>
                  <p className="text-sm text-muted-foreground">Conversions</p>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
                <p className="text-sm text-muted-foreground">Total Revenue Generated</p>
                <p className="text-3xl font-bold text-primary">${((affiliateData.affiliate.totalRevenue || 0) / 100).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  From {affiliateData.affiliate.totalReferrals} referrals at {affiliateData.commissionRate}% commission
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Referral Link</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-3">
                    Share this link with friends and earn {affiliateData.commissionRate}% commission on every sale!
                  </p>
                  <div className="flex gap-2">
                    <Input 
                      value={`${window.location.origin}?ref=${affiliateData.affiliate.code}`}
                      readOnly
                      className="text-sm"
                      data-testid="input-referral-link"
                    />
                    <Button onClick={copyReferralLink} className="gap-2" data-testid="button-copy-link">
                      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                  <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm">
                      <span className="font-medium">Your affiliate code:</span>{" "}
                      <code className="bg-background px-2 py-1 rounded">{affiliateData.affiliate.code}</code>
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-sm text-muted-foreground mb-2">QR Code</p>
                  <div className="p-4 bg-white rounded-lg">
                    <img 
                      src={generateQRCodeUrl(affiliateData.affiliate.code)} 
                      alt="Referral QR Code"
                      className="w-32 h-32"
                      data-testid="img-qr-code"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="w-5 h-5" />
                Payout Setup & Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!connectStatus ? (
                <div className="text-center py-6">
                  <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="font-semibold text-lg mb-2">Set Up Payouts</h4>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    Connect your Stripe account to receive weekly payouts for your commissions.
                  </p>
                  <Button 
                    onClick={() => startConnectMutation.mutate()}
                    disabled={startConnectMutation.isPending}
                    className="gap-2"
                    data-testid="button-connect-stripe"
                  >
                    {startConnectMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                    Connect with Stripe
                  </Button>
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Next payout date: {getNextPayoutDate()}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {(!connectStatus.payoutsEnabled || !connectStatus.detailsSubmitted) && (
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-yellow-500 font-medium">Payout setup incomplete</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex gap-2">
                      <Badge className={connectStatus.detailsSubmitted 
                        ? "bg-green-500/20 text-green-500 border-green-500/30" 
                        : "bg-red-500/20 text-red-500 border-red-500/30"
                      }>
                        {connectStatus.detailsSubmitted ? "Details Submitted" : "Details Required"}
                      </Badge>
                      <Badge className={connectStatus.payoutsEnabled 
                        ? "bg-green-500/20 text-green-500 border-green-500/30" 
                        : "bg-red-500/20 text-red-500 border-red-500/30"
                      }>
                        {connectStatus.payoutsEnabled ? "Payouts Enabled" : "Payouts Disabled"}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span>
                        <span className="text-muted-foreground">Country: </span>
                        <span className="font-medium">{connectStatus.country || "US"}</span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Currency: </span>
                        <span className="font-medium">{connectStatus.currency?.toUpperCase() || "USD"}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Next payout date:</span>
                    <span className="font-medium">{getNextPayoutDate()}</span>
                  </div>

                  {connectStatus.requirements?.currently_due && connectStatus.requirements.currently_due.length > 0 && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                        Required Steps
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {connectStatus.requirements.currently_due.map((step, i) => (
                          <li key={i}>• {step.replace(/_/g, " ").replace(/\./g, " - ")}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!connectStatus.detailsSubmitted && (
                    <Button 
                      onClick={() => startConnectMutation.mutate()}
                      disabled={startConnectMutation.isPending}
                      className="gap-2"
                      data-testid="button-complete-onboarding"
                    >
                      {startConnectMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                      Complete Stripe Onboarding
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Commission Ledger</CardTitle>
            </CardHeader>
            <CardContent>
              {affiliateData.referrals.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No referrals yet. Share your link to start earning!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {affiliateData.referrals.map((referral) => (
                    <div key={referral.id} className="flex items-center justify-between p-4 bg-muted rounded-lg" data-testid={`referral-${referral.id}`}>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(referral.createdAt).toLocaleDateString()}
                        </p>
                        <p className="font-medium">Order total: ${(referral.orderTotal / 100).toFixed(2)}</p>
                        {referral.approvedAt && (
                          <p className="text-xs text-muted-foreground">
                            Approved: {new Date(referral.approvedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge className={
                          referral.status === "paid" 
                            ? "bg-green-500/20 text-green-500" 
                            : referral.status === "approved"
                            ? "bg-blue-500/20 text-blue-500"
                            : referral.status === "void"
                            ? "bg-gray-500/20 text-gray-500"
                            : "bg-yellow-500/20 text-yellow-500"
                        }>
                          {referral.status}
                        </Badge>
                        <p className="font-bold text-primary mt-1">+${(referral.commission / 100).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Payout History</CardTitle>
                {affiliateData.minimumPayout && (
                  <p className="text-sm text-muted-foreground">
                    Minimum payout: ${(affiliateData.minimumPayout / 100).toFixed(2)}
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!affiliateData.payouts || affiliateData.payouts.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No payouts yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Payouts are processed when your approved balance reaches the minimum threshold.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {affiliateData.payouts.map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between p-4 bg-muted rounded-lg" data-testid={`payout-${payout.id}`}>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payout.requestedAt).toLocaleDateString()}
                        </p>
                        <p className="font-medium">{payout.paymentMethod === "stripe" || payout.paymentMethod === "connect" ? "Stripe Transfer" : payout.paymentMethod.charAt(0).toUpperCase() + payout.paymentMethod.slice(1)}</p>
                        {payout.processedAt && (
                          <p className="text-xs text-muted-foreground">
                            Processed: {new Date(payout.processedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge className={
                          payout.status === "paid" 
                            ? "bg-green-500/20 text-green-500" 
                            : payout.status === "approved"
                            ? "bg-blue-500/20 text-blue-500"
                            : payout.status === "rejected"
                            ? "bg-red-500/20 text-red-500"
                            : "bg-yellow-500/20 text-yellow-500"
                        }>
                          {payout.status}
                        </Badge>
                        <p className="font-bold text-green-500 mt-1">${(payout.amount / 100).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center max-w-lg mx-auto">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Earn Money with Power Plunge</h2>
              <p className="text-muted-foreground mb-6">
                Join our affiliate program and earn {affiliateData?.commissionRate || 10}% commission on every sale you refer. 
                Get your unique referral link and QR code, and start earning today!
              </p>
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Earn {affiliateData?.commissionRate || 10}% on every referred sale</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Get your unique referral link and QR code</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Track your referrals and earnings in real-time</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Weekly payouts via Stripe Connect</span>
                </li>
              </ul>
              <Button size="lg" onClick={() => setShowEsign(true)} className="gap-2" data-testid="button-become-affiliate">
                <FileText className="w-5 h-5" />
                Become an Affiliate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showEsign} onOpenChange={setShowEsign}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Affiliate Program Agreement</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="p-4 bg-muted rounded-lg max-h-64 overflow-y-auto text-sm whitespace-pre-wrap">
              {affiliateData?.agreementText || "Loading agreement..."}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (agreedToTerms && signatureName.trim()) {
                  signAgreementMutation.mutate({ signatureName: signatureName.trim() });
                }
              }}
              className="space-y-4"
            >
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="agree" 
                  checked={agreedToTerms} 
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                  data-testid="checkbox-agree"
                />
                <Label htmlFor="agree" className="text-sm leading-relaxed">
                  I have read, understand, and agree to the terms and conditions of the Power Plunge Affiliate Program Agreement.
                </Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signature">E-Signature (Type your full legal name)</Label>
                <Input
                  id="signature"
                  placeholder="Your full legal name"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="font-signature text-lg"
                  data-testid="input-signature"
                />
                <p className="text-xs text-muted-foreground">
                  By typing your name above, you are providing your electronic signature and agreeing to the terms of this agreement.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowEsign(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={!agreedToTerms || !signatureName.trim() || signAgreementMutation.isPending}
                  data-testid="button-sign-agreement"
                >
                  {signAgreementMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing...
                    </>
                  ) : (
                    "Sign & Join Program"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
