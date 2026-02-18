import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteLayout from "@/components/SiteLayout";

export default function AffiliateAgreementPage() {
  useEffect(() => {
    document.title = "Affiliate Program Agreement | Power Plunge";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", "Power Plunge Affiliate Program Agreement including SMS communications consent. This page is provided for agreement review and SMS consent transparency.");
    }
  }, []);

  return (
    <SiteLayout>
      <div className="max-w-4xl mx-auto px-6 py-16" data-testid="page-affiliate-agreement">
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

        <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 mb-10" data-testid="callout-sms-consent">
          <h3 className="text-lg font-semibold text-foreground mb-2">SMS Communications Consent</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            By registering as an affiliate and accepting the agreement during signup, you consent to receive SMS messages related to your affiliate account. Reply STOP to opt out. Msg &amp; data rates may apply.
          </p>
          <p className="text-muted-foreground text-xs mt-2 italic">
            Consent is collected during signup in the invite-only affiliate wizard; this page is informational only.
          </p>
        </div>

        <h1 className="text-4xl font-bold mb-8" data-testid="text-agreement-title">Affiliate Program Agreement</h1>

        <div
          className="prose prose-invert prose-lg max-w-none
            prose-headings:text-foreground prose-p:text-muted-foreground
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-strong:text-foreground prose-li:text-muted-foreground
            prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground"
          data-testid="text-agreement-content"
        >
          <p>
            This Affiliate Program Agreement (&ldquo;Agreement&rdquo;) is entered into between Power Plunge (&ldquo;Company&rdquo;) and the individual or entity accepting this Agreement (&ldquo;Affiliate&rdquo;).
          </p>
          <p>
            By registering for or participating in the Company&rsquo;s affiliate program, Affiliate agrees to be bound by the terms and conditions set forth below.
          </p>

          <h2>1. Appointment and Acceptance</h2>
          <p>Company appoints Affiliate as a non-exclusive affiliate authorized to promote Company&rsquo;s products using a unique referral link or code provided by Company.</p>
          <p>Affiliate accepts this appointment and agrees to comply with all terms of this Agreement and applicable laws and regulations.</p>
          <p>Participation in the affiliate program is by invitation only and subject to Company approval.</p>

          <h2>2. Affiliate Registration and Consent</h2>
          <p>Affiliate may receive an invitation to join the affiliate program via direct communication, including SMS text message, email, or other methods, following a prior business or personal relationship or direct interaction with Company or its representatives.</p>
          <p>By completing affiliate registration and accepting this Agreement, Affiliate expressly consents to receive communications from Company related to:</p>
          <ul>
            <li>Affiliate account notifications</li>
            <li>Affiliate program participation</li>
            <li>Affiliate invitations and onboarding</li>
            <li>Affiliate performance and commission notifications</li>
            <li>Affiliate support communications</li>
          </ul>
          <p>These communications may be sent via SMS text message, email, or other communication channels.</p>
          <p>Affiliate understands that consent to receive communications is part of affiliate account registration and may opt out of SMS communications at any time by replying STOP to any SMS message.</p>

          <h2>3. Affiliate Responsibilities</h2>
          <p>Affiliate agrees to:</p>
          <ol type="a">
            <li>Promote Company products using only authorized referral links or codes</li>
            <li>Provide accurate and truthful information during registration</li>
            <li>Conduct all promotional activities in a lawful, ethical, and professional manner</li>
            <li>Comply with all applicable laws, including FTC disclosure requirements</li>
            <li>Clearly disclose affiliate relationships where required</li>
          </ol>
          <p>Affiliate shall not engage in deceptive, misleading, unlawful, or unethical marketing practices.</p>

          <h2>4. Commission Structure</h2>
          <ol type="a">
            <li>Affiliate will earn commissions on qualifying sales generated through their referral link or code</li>
            <li>Commission rates are determined solely by Company and may be modified at any time</li>
            <li>Commissions are calculated based on net sales, excluding taxes, shipping, refunds, and chargebacks</li>
          </ol>
          <p>Company reserves sole discretion in determining commission eligibility.</p>

          <h2>5. Payment Terms</h2>
          <ol type="a">
            <li>Commissions will be paid according to Company&rsquo;s established payment schedule</li>
            <li>Affiliate must maintain accurate payment information</li>
            <li>Minimum payout thresholds may apply</li>
            <li>Company reserves the right to withhold or reverse commissions in cases of fraud, abuse, refunds, or violations of this Agreement</li>
          </ol>

          <h2>6. Prohibited Activities</h2>
          <p>Affiliate shall NOT:</p>
          <ol type="a">
            <li>Send unsolicited or unauthorized communications, including spam</li>
            <li>Use misleading, false, or deceptive marketing practices</li>
            <li>Misrepresent Company, its products, or affiliate relationship</li>
            <li>Create fake accounts, fraudulent traffic, or fake referrals</li>
            <li>Violate any applicable laws or regulations</li>
            <li>Engage in activities that harm Company&rsquo;s reputation</li>
          </ol>
          <p>Company reserves the right to terminate affiliates engaged in prohibited activities.</p>

          <h2>7. Intellectual Property</h2>
          <p>Company grants Affiliate a limited, non-exclusive, revocable license to use Company-provided marketing materials solely for affiliate promotion.</p>
          <p>Affiliate may not modify or misuse Company trademarks or materials without written permission.</p>
          <p>All intellectual property rights remain the exclusive property of Company.</p>

          <h2>8. Communications and SMS Consent</h2>
          <p>Affiliate acknowledges and agrees that Company may send communications related to Affiliate&rsquo;s account and program participation, including SMS text messages.</p>
          <p>By accepting this Agreement, Affiliate expressly consents to receive SMS communications from Company for:</p>
          <ul>
            <li>Affiliate invitations</li>
            <li>Account notifications</li>
            <li>Affiliate program updates</li>
            <li>Affiliate support communications</li>
          </ul>
          <p>Message frequency varies.</p>
          <p>Affiliate may opt out at any time by replying STOP to any SMS message.</p>
          <p>Affiliate may request assistance by replying HELP or contacting <a href="mailto:support@powerplunge.com">support@powerplunge.com</a>.</p>
          <p>Standard message and data rates may apply.</p>
          <p>Company does not send unsolicited bulk SMS messages or sell affiliate contact information.</p>

          <h2>9. Term and Termination</h2>
          <p>This Agreement becomes effective upon Affiliate acceptance and continues until terminated.</p>
          <p>Company may terminate Affiliate participation at any time for any reason, including violations of this Agreement.</p>
          <p>Affiliate may terminate participation at any time by notifying Company.</p>
          <p>Upon termination, Affiliate must cease use of affiliate links and Company marketing materials.</p>

          <h2>10. Confidentiality</h2>
          <p>Affiliate agrees to keep confidential any non-public Company information, including business operations, customer information, and affiliate program details.</p>

          <h2>11. Disclaimer and Limitation of Liability</h2>
          <p>Company makes no guarantees regarding affiliate earnings or performance.</p>
          <p>Company shall not be liable for indirect, incidental, or consequential damages.</p>
          <p>Company&rsquo;s total liability shall not exceed commissions earned by Affiliate.</p>

          <h2>12. Independent Contractor Relationship</h2>
          <p>Affiliate is an independent contractor and not an employee, partner, or agent of Company.</p>
          <p>Affiliate has no authority to bind Company.</p>

          <h2>13. Compliance with Laws and Communication Regulations</h2>
          <p>Affiliate agrees to comply with all applicable laws and regulations, including:</p>
          <ul>
            <li>FTC guidelines</li>
            <li>Anti-spam laws</li>
            <li>Consumer protection laws</li>
            <li>Telecommunications regulations</li>
          </ul>
          <p>Affiliate shall not send unsolicited communications on behalf of Company.</p>

          <h2>14. Modifications</h2>
          <p>Company may modify this Agreement at any time.</p>
          <p>Continued participation in the affiliate program constitutes acceptance of any modifications.</p>

          <h2>15. Governing Law</h2>
          <p>This Agreement shall be governed by the laws of the state in which Company is incorporated.</p>

          <h2>16. Acceptance</h2>
          <p>By registering as an affiliate and accepting this Agreement, Affiliate acknowledges that they have read, understood, and agreed to all terms and conditions.</p>
          <p>Affiliate further acknowledges and consents to receiving affiliate-related communications, including SMS communications, as described in this Agreement.</p>
        </div>

        <div className="mt-12 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground" data-testid="text-last-updated">Last updated: February 18, 2026</p>
        </div>
      </div>
    </SiteLayout>
  );
}
