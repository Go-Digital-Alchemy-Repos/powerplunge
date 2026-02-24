import { useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useBranding } from "@/hooks/use-branding";
import {
  Mail, UserPlus, FileText, CreditCard, Share2,
  ChevronDown, ArrowRight, CheckCircle2, DollarSign,
  Link2, Tag, BarChart3, Globe, Loader2,
} from "lucide-react";

interface ProgramInfo {
  programActive: boolean;
  commissionType: string;
  commissionValue: number;
  discountType: string;
  discountValue: number;
  cookieDuration: number;
}

function formatReward(type: string, value: number): string {
  if (type === "PERCENT") return `${value}%`;
  return `$${(value / 100).toFixed(value % 100 === 0 ? 0 : 2)}`;
}

const STEPS = [
  {
    icon: Mail,
    title: "Get Your Invite",
    description: "You'll receive a personal invite link from us. Just tap the link to get started.",
  },
  {
    icon: UserPlus,
    title: "Create Your Account",
    description: "Enter your name and email to set up your affiliate account. Quick and easy — takes about a minute.",
  },
  {
    icon: FileText,
    title: "Review & Accept Agreement",
    description: "Read through the affiliate terms and sign with your name. No surprises — just straightforward guidelines.",
  },
  {
    icon: CreditCard,
    title: "Set Up Payouts",
    description: "Connect your payment account through Stripe so you can receive your commissions. Secure and simple.",
  },
  {
    icon: Share2,
    title: "Start Sharing & Earning",
    description: "Get your unique referral link and code, then share with friends, family, or your audience. You earn when they buy!",
  },
];

export default function AffiliateInfoPage() {
  const { logoSrc, companyName } = useBranding();

  const { data: programInfo, isLoading } = useQuery<ProgramInfo>({
    queryKey: ["/api/affiliate-signup/program-info"],
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    document.title = `Become an Affiliate | ${companyName}`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        `Learn how to become a ${companyName} affiliate. Simple sign-up process explained step by step.`
      );
    }
  }, [companyName]);

  const commissionLabel = programInfo
    ? formatReward(programInfo.commissionType, programInfo.commissionValue)
    : null;
  const discountLabel = programInfo && programInfo.discountValue > 0
    ? formatReward(programInfo.discountType, programInfo.discountValue)
    : null;
  const cookieDays = programInfo?.cookieDuration ?? 30;

  return (
    <div className="min-h-screen bg-background" data-testid="page-affiliate-info">
      <div className="max-w-lg mx-auto px-5 py-8 pb-16">

        <div className="text-center mb-8" data-testid="section-header">
          <img
            src={logoSrc}
            alt={companyName}
            className="h-12 w-auto mx-auto mb-5 object-contain"
            data-testid="img-logo"
          />
          <h1
            className="text-2xl font-bold text-foreground mb-2 tracking-tight"
            data-testid="text-page-title"
          >
            Become an Affiliate
          </h1>
          <p
            className="text-muted-foreground text-sm leading-relaxed"
            data-testid="text-page-subtitle"
          >
            Earn money by sharing {companyName} with the people you know.
            Here's everything you need to know.
          </p>
        </div>

        <div
          className="rounded-xl border border-primary/30 bg-primary/5 p-5 mb-8"
          data-testid="section-benefits"
        >
          <h2 className="font-semibold text-foreground text-base mb-4" data-testid="text-benefits-title">
            Why Join?
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {commissionLabel && (
                <div className="flex items-start gap-3" data-testid="text-benefit-commission">
                  <DollarSign className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      Earn {commissionLabel} commission
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      On every sale you refer
                    </p>
                  </div>
                </div>
              )}
              {discountLabel && (
                <div className="flex items-start gap-3" data-testid="text-benefit-discount">
                  <Tag className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      Your referrals save {discountLabel}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Everyone you share with gets a discount
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3" data-testid="text-benefit-tracking">
                <BarChart3 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-sm font-medium text-foreground">
                    Track your earnings in real time
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your own dashboard to see clicks, sales, and payouts
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3" data-testid="text-benefit-payout">
                <CreditCard className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-sm font-medium text-foreground">
                    Get paid directly to your bank
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Secure payouts through Stripe
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3" data-testid="text-benefit-easy">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-sm font-medium text-foreground">
                    No inventory, no shipping
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Just share your link — we handle the rest
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          className="rounded-xl border border-primary/20 bg-card/50 p-5 mb-8"
          data-testid="section-sharing"
        >
          <h2 className="font-semibold text-foreground text-base mb-4" data-testid="text-sharing-title">
            How You Share
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3" data-testid="text-sharing-link">
              <Globe className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-medium text-foreground">
                  Your Personal Referral Link
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You get a unique URL you can share anywhere — text messages, social media, email, you name it. When someone visits through your link, they're tracked as your referral for {cookieDays} days.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3" data-testid="text-sharing-code">
              <Link2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-medium text-foreground">
                  Your Unique Referral Code
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You also get a short code (like "YOURNAME") that customers can enter at checkout.
                  Great for verbal referrals or anywhere a link isn't practical.
                </p>
              </div>
            </div>
          </div>
        </div>

        <h2
          className="font-semibold text-foreground text-base mb-4"
          data-testid="text-steps-title"
        >
          How to Sign Up
        </h2>

        <div className="space-y-0 mb-8" data-testid="section-steps">
          {STEPS.map((step, index) => (
            <div key={step.title} className="relative">
              <div
                className="relative flex items-start gap-4 py-4"
                data-testid={`card-step-${index + 1}`}
              >
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div
                    className="w-10 h-10 rounded-full border-2 border-primary/40 bg-primary/10 flex items-center justify-center"
                  >
                    <step.icon className="w-4 h-4 text-primary" />
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className="w-px h-full bg-primary/20 absolute top-14 left-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="font-semibold text-foreground text-sm mb-1">
                    <span className="text-primary mr-1.5">Step {index + 1}.</span>
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <div className="flex justify-center -mt-1 -mb-1 ml-3">
                  <ChevronDown className="w-4 h-4 text-primary/30" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div
          className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-center"
          data-testid="section-cta"
        >
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Ready to get started? If you've received an invite link, tap it to begin.
            If you haven't been invited yet, reach out and ask about joining!
          </p>
          <Link href="/become-affiliate">
            <span
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
              data-testid="link-signup"
            >
              Go to Sign Up
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>

        <p
          className="text-center text-xs text-muted-foreground/60 mt-8"
          data-testid="text-footer-note"
        >
          The affiliate program is invite-only. An invite link is required to complete sign-up.
        </p>
      </div>
    </div>
  );
}
