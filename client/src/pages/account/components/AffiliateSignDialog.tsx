import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useAccountAffiliate } from "../hooks/useAccountAffiliate";

export default function AffiliateSignDialog() {
  const {
    affiliateData,
    showEsign,
    setShowEsign,
    signatureName,
    setSignatureName,
    agreedToTerms,
    setAgreedToTerms,
    signAgreementMutation,
  } = useAccountAffiliate();

  return (
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
  );
}
