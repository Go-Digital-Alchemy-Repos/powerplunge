import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteLayout from "@/components/SiteLayout";

export default function SmsConsentPage() {
  useEffect(() => {
    document.title = "SMS Consent | Power Plunge";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", "Power Plunge SMS communications consent information for the affiliate program.");
    }
  }, []);

  return (
    <SiteLayout>
      <div className="max-w-4xl mx-auto px-6 py-16" data-testid="page-sms-consent">
        <Button
          variant="ghost"
          onClick={() => window.history.back()}
          className="text-primary hover:text-primary/80 hover:bg-primary/10 mb-6 -ml-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <p className="text-sm text-muted-foreground italic mb-6" data-testid="text-invite-only-notice">
          Affiliate signup is invite-only. This page is provided for agreement review and SMS consent transparency.
        </p>

        <h1 className="text-4xl font-bold mb-8" data-testid="text-sms-consent-title">SMS Communications Consent</h1>

        <div
          className="prose prose-invert prose-lg max-w-none
            prose-headings:text-foreground prose-p:text-muted-foreground
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-strong:text-foreground prose-li:text-muted-foreground"
          data-testid="text-sms-consent-content"
        >
          <p>
            By registering as an affiliate with Power Plunge and accepting the Affiliate Program Agreement during signup, you consent to receive SMS text messages related to your affiliate account.
          </p>
          <p>
            Invitations are sent only to individuals who have a prior relationship with Power Plunge or its owner (e.g., personal contacts, networking, or prior customers).
          </p>

          <h2>What messages will you receive?</h2>
          <ul>
            <li>Affiliate invitations and onboarding</li>
            <li>Account notifications</li>
            <li>Affiliate program updates</li>
            <li>Performance and commission notifications</li>
            <li>Support communications</li>
          </ul>

          <h2>How to opt out</h2>
          <p>You may opt out at any time by replying <strong>STOP</strong> to any SMS message from Power Plunge.</p>

          <h2>Need help?</h2>
          <p>Reply <strong>HELP</strong> to any message or contact <a href="mailto:support@powerplunge.com">support@powerplunge.com</a>.</p>

          <p>Message frequency varies. Standard message and data rates may apply. Power Plunge does not send unsolicited bulk SMS messages or sell affiliate contact information.</p>

          <p>
            For the full terms, please review our{" "}
            <Link href="/affiliate-agreement" className="text-primary hover:underline" data-testid="link-full-agreement">
              Affiliate Program Agreement
            </Link>.
          </p>
        </div>

        <div className="mt-8">
          <Link href="/affiliate-agreement">
            <Button variant="outline" className="gap-2" data-testid="button-view-agreement">
              View Full Affiliate Agreement
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-12 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground" data-testid="text-last-updated">Last updated: February 18, 2026</p>
        </div>
      </div>
    </SiteLayout>
  );
}
