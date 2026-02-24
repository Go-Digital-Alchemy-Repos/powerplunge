import { useEffect } from "react";
import { Link } from "wouter";
import { useBranding } from "@/hooks/use-branding";
import {
  Mail, UserPlus, FileText, CreditCard, Share2,
  ChevronRight, ArrowRight, CheckCircle2, Sparkles,
} from "lucide-react";

const STEPS = [
  {
    icon: Mail,
    title: "Get Your Invite",
    description: "You'll receive a personal invite link from us. Just tap the link to get started.",
    accent: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-400",
    borderColor: "border-blue-500/30",
  },
  {
    icon: UserPlus,
    title: "Create Your Account",
    description: "Enter your name and email to set up your affiliate account. Quick and easy — takes about a minute.",
    accent: "from-emerald-500/20 to-emerald-600/10",
    iconColor: "text-emerald-400",
    borderColor: "border-emerald-500/30",
  },
  {
    icon: FileText,
    title: "Review & Accept Agreement",
    description: "Read through the affiliate terms and sign with your name. No surprises — just straightforward guidelines.",
    accent: "from-violet-500/20 to-violet-600/10",
    iconColor: "text-violet-400",
    borderColor: "border-violet-500/30",
  },
  {
    icon: CreditCard,
    title: "Set Up Payouts",
    description: "Connect your payment account through Stripe so you can receive your commissions. Secure and simple.",
    accent: "from-amber-500/20 to-amber-600/10",
    iconColor: "text-amber-400",
    borderColor: "border-amber-500/30",
  },
  {
    icon: Share2,
    title: "Start Sharing & Earning",
    description: "Get your unique referral link and share it with friends, family, or your audience. You earn when they buy!",
    accent: "from-pink-500/20 to-pink-600/10",
    iconColor: "text-pink-400",
    borderColor: "border-pink-500/30",
  },
];

const BENEFITS = [
  "Earn commission on every sale you refer",
  "Your referrals get a discount too",
  "Track your earnings in real time",
  "Get paid directly to your bank account",
  "No inventory, no shipping — just share your link",
];

export default function AffiliateInfoPage() {
  const { logoSrc, companyName } = useBranding();

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

  return (
    <div className="min-h-screen bg-background" data-testid="page-affiliate-info">
      <div className="max-w-lg mx-auto px-5 py-8 pb-16">

        <div className="text-center mb-10" data-testid="section-header">
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
            Here's how the sign-up process works — it only takes a few minutes.
          </p>
        </div>

        <div className="space-y-4 mb-10" data-testid="section-steps">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className={`relative rounded-xl border ${step.borderColor} bg-gradient-to-br ${step.accent} p-5`}
              data-testid={`card-step-${index + 1}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div
                    className="w-10 h-10 rounded-full bg-background/80 border border-border flex items-center justify-center"
                  >
                    <span className="text-sm font-bold text-foreground">{index + 1}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <step.icon className={`w-4 h-4 ${step.iconColor} flex-shrink-0`} />
                    <h3 className="font-semibold text-foreground text-sm">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>

              {index < STEPS.length - 1 && (
                <div className="absolute -bottom-3 left-9 z-10">
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div
          className="rounded-xl border border-primary/20 bg-primary/5 p-5 mb-10"
          data-testid="section-benefits"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground text-base">
              Why Join?
            </h2>
          </div>
          <ul className="space-y-2.5">
            {BENEFITS.map((benefit, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5"
                data-testid={`text-benefit-${i + 1}`}
              >
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground leading-relaxed">
                  {benefit}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div
          className="rounded-xl border border-border bg-muted/30 p-5 text-center"
          data-testid="section-cta"
        >
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Ready to get started? If you've received an invite link, tap it to begin your sign-up.
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
