export interface CampaignPageDef {
  title: string;
  slug: string;
  primaryMessage: string;
  recommendedKits: string[];
  defaultSeoTitle: string;
  defaultSeoDescription: string;
}

export interface CampaignPack {
  id: string;
  name: string;
  description: string;
  recommendedThemePreset: string;
  templateId: string;
  defaultKits: string[];
  pages: CampaignPageDef[];
}

export const CAMPAIGN_PACKS: CampaignPack[] = [
  {
    id: "new-year-recovery-reset",
    name: "New Year Recovery Reset",
    description: "Kick off the new year with a recovery-focused campaign. Three pages target resolution-minded buyers looking to invest in their health and build better habits.",
    recommendedThemePreset: "arctic",
    templateId: "landing-page-v1",
    defaultKits: ["Cold Plunge Benefits Kit", "Safety + Protocol Kit"],
    pages: [
      {
        title: "Start the Year Strong",
        slug: "new-year-start-strong",
        primaryMessage: "Make this the year you commit to recovery. A cold plunge routine helps you reset, refocus, and perform at your best — starting day one.",
        recommendedKits: ["Cold Plunge Benefits Kit", "Financing Kit"],
        defaultSeoTitle: "Start the Year Strong | Cold Plunge Recovery | Power Plunge",
        defaultSeoDescription: "Begin the new year with a cold plunge recovery routine. Reduce soreness, boost energy, and build lasting wellness habits with Power Plunge.",
      },
      {
        title: "Recovery Reset Routine",
        slug: "new-year-recovery-reset-routine",
        primaryMessage: "Your body works hard — give it the reset it deserves. Build a daily recovery routine around cold water immersion and feel the difference in weeks.",
        recommendedKits: ["Safety + Protocol Kit", "Cold Plunge Benefits Kit"],
        defaultSeoTitle: "Recovery Reset Routine | Daily Cold Plunge Protocol | Power Plunge",
        defaultSeoDescription: "Build a daily recovery routine with cold water immersion. Science-backed protocols for every experience level. Start your reset today.",
      },
      {
        title: "Cold Therapy Habits",
        slug: "new-year-cold-therapy-habits",
        primaryMessage: "Small habits create big results. Cold therapy fits into any morning routine and delivers compounding benefits for energy, sleep, and recovery.",
        recommendedKits: ["Cold Plunge Benefits Kit", "Delivery + Setup Kit"],
        defaultSeoTitle: "Cold Therapy Habits | Build Your Wellness Routine | Power Plunge",
        defaultSeoDescription: "Discover how cold therapy habits improve energy, sleep, and recovery. Easy-to-follow routines designed for lasting results.",
      },
    ],
  },
  {
    id: "spring-training-recovery",
    name: "Spring Training Recovery",
    description: "Target athletes and fitness enthusiasts ramping up their training for spring. Two pages focused on performance recovery and training volume support.",
    recommendedThemePreset: "midnight",
    templateId: "sales-funnel-v1",
    defaultKits: ["Cold Plunge Benefits Kit", "Safety + Protocol Kit"],
    pages: [
      {
        title: "Train Hard Recover Faster",
        slug: "spring-train-hard-recover-faster",
        primaryMessage: "Pushing your limits in the gym? Cold plunging helps reduce post-workout soreness and gets you ready for your next session faster.",
        recommendedKits: ["Cold Plunge Benefits Kit", "Warranty + Support Kit"],
        defaultSeoTitle: "Train Hard, Recover Faster | Athlete Recovery | Power Plunge",
        defaultSeoDescription: "Reduce post-workout soreness and recover faster with cold plunging. Trusted by athletes for performance recovery. Shop Power Plunge.",
      },
      {
        title: "Athlete Recovery Routine",
        slug: "spring-athlete-recovery-routine",
        primaryMessage: "Recovery is where gains happen. Build an athlete-grade cold plunge protocol to support your training volume and keep your body performing at its peak.",
        recommendedKits: ["Safety + Protocol Kit", "Financing Kit"],
        defaultSeoTitle: "Athlete Recovery Routine | Cold Plunge Protocol | Power Plunge",
        defaultSeoDescription: "Athlete-grade cold plunge protocols for serious training recovery. Science-backed routines to support performance and reduce soreness.",
      },
    ],
  },
  {
    id: "fathers-day-performance-gift",
    name: "Father's Day Performance Gift",
    description: "Position cold plunge units as a premium Father's Day gift. Two pages designed for gift buyers emphasizing performance, wellness, and thoughtful gifting.",
    recommendedThemePreset: "slate",
    templateId: "product-story-v1",
    defaultKits: ["Delivery + Setup Kit", "Warranty + Support Kit"],
    pages: [
      {
        title: "The Gift of Recovery",
        slug: "fathers-day-gift-of-recovery",
        primaryMessage: "Give dad something he'll actually use every day. A Power Plunge is the ultimate gift for recovery, energy, and long-term wellness.",
        recommendedKits: ["Delivery + Setup Kit", "Financing Kit"],
        defaultSeoTitle: "The Gift of Recovery | Father's Day Cold Plunge | Power Plunge",
        defaultSeoDescription: "Give the gift of recovery this Father's Day. Premium cold plunge units with free delivery and professional setup. Shop Power Plunge.",
      },
      {
        title: "Performance Gift Guide",
        slug: "fathers-day-performance-gift-guide",
        primaryMessage: "Looking for a gift that stands out? Our performance gift guide helps you choose the right cold plunge setup for the dad who has everything.",
        recommendedKits: ["Warranty + Support Kit", "Cold Plunge Benefits Kit"],
        defaultSeoTitle: "Performance Gift Guide | Father's Day | Power Plunge",
        defaultSeoDescription: "Find the perfect performance gift for Father's Day. Cold plunge units for recovery, wellness, and daily energy. Free shipping included.",
      },
    ],
  },
  {
    id: "summer-energy-reset",
    name: "Summer Energy Reset",
    description: "Summer-themed campaign highlighting cold plunging as a way to beat the heat and build energizing morning routines. Two pages targeting warm-weather buyers.",
    recommendedThemePreset: "arctic",
    templateId: "landing-page-v1",
    defaultKits: ["Cold Plunge Benefits Kit", "Delivery + Setup Kit"],
    pages: [
      {
        title: "Beat the Heat Reset",
        slug: "summer-beat-the-heat",
        primaryMessage: "When temperatures rise, a cold plunge is the ultimate reset. Cool down, recharge, and turn summer heat into your competitive advantage.",
        recommendedKits: ["Cold Plunge Benefits Kit", "Safety + Protocol Kit"],
        defaultSeoTitle: "Beat the Heat Reset | Summer Cold Plunge | Power Plunge",
        defaultSeoDescription: "Cool down and recharge with a cold plunge this summer. The ultimate heat reset for energy, recovery, and wellness. Shop Power Plunge.",
      },
      {
        title: "Morning Cold Routine",
        slug: "summer-morning-cold-routine",
        primaryMessage: "Start every summer morning with clarity and energy. A quick cold plunge session sets the tone for a focused, productive day — no caffeine required.",
        recommendedKits: ["Safety + Protocol Kit", "Delivery + Setup Kit"],
        defaultSeoTitle: "Morning Cold Routine | Summer Wellness | Power Plunge",
        defaultSeoDescription: "Build a morning cold plunge routine for energy and focus. Start your summer days refreshed with Power Plunge. Free shipping on all orders.",
      },
    ],
  },
  {
    id: "black-friday-cold-plunge-event",
    name: "Black Friday Cold Plunge Event",
    description: "High-urgency sales event campaign for Black Friday. Two pages built for conversion with strong calls-to-action, financing options, and social proof.",
    recommendedThemePreset: "midnight",
    templateId: "sales-funnel-v1",
    defaultKits: ["Financing Kit", "Warranty + Support Kit"],
    pages: [
      {
        title: "Cold Plunge Sale",
        slug: "black-friday-cold-plunge-sale",
        primaryMessage: "Our biggest sale of the year is here. Get a premium cold plunge unit at the best price — limited quantities available while the event lasts.",
        recommendedKits: ["Financing Kit", "Delivery + Setup Kit"],
        defaultSeoTitle: "Black Friday Cold Plunge Sale | Limited Time | Power Plunge",
        defaultSeoDescription: "Shop the Black Friday cold plunge sale at Power Plunge. Premium units at the best prices of the year. Free shipping and financing available.",
      },
      {
        title: "Recovery Upgrade Event",
        slug: "black-friday-recovery-upgrade",
        primaryMessage: "Upgrade your recovery setup this Black Friday. Premium cold plunge units with financing options and free professional setup included.",
        recommendedKits: ["Warranty + Support Kit", "Financing Kit"],
        defaultSeoTitle: "Recovery Upgrade Event | Black Friday | Power Plunge",
        defaultSeoDescription: "Upgrade your recovery this Black Friday with a premium cold plunge. Financing available, free delivery, and professional setup included.",
      },
    ],
  },
  {
    id: "first-responder-recovery",
    name: "First Responder Recovery",
    description: "Targeted campaign for first responders — firefighters, EMTs, law enforcement — who need effective recovery tools for physically and mentally demanding careers.",
    recommendedThemePreset: "slate",
    templateId: "product-story-v1",
    defaultKits: ["Cold Plunge Benefits Kit", "Safety + Protocol Kit", "Warranty + Support Kit"],
    pages: [
      {
        title: "Recovery for First Responders",
        slug: "first-responder-recovery",
        primaryMessage: "You put your body on the line every shift. Cold plunging helps manage the physical strain and mental demands of first responder work — so you can show up ready every day.",
        recommendedKits: ["Cold Plunge Benefits Kit", "Safety + Protocol Kit", "Financing Kit"],
        defaultSeoTitle: "Recovery for First Responders | Cold Plunge Therapy | Power Plunge",
        defaultSeoDescription: "Cold plunge recovery designed for first responders. Manage physical strain and support mental resilience with Power Plunge. Special programs available.",
      },
    ],
  },
  {
    id: "athlete-performance-recovery",
    name: "Athlete Performance Recovery",
    description: "Comprehensive performance recovery campaign targeting serious athletes, coaches, and training facilities. Single high-impact page with full benefit and protocol coverage.",
    recommendedThemePreset: "midnight",
    templateId: "sales-funnel-v1",
    defaultKits: ["Cold Plunge Benefits Kit", "Safety + Protocol Kit", "Financing Kit"],
    pages: [
      {
        title: "Performance Recovery System",
        slug: "athlete-performance-recovery-system",
        primaryMessage: "Recovery is the missing piece of your training program. A Power Plunge gives you a professional-grade cold therapy system built for serious athletes who demand results.",
        recommendedKits: ["Cold Plunge Benefits Kit", "Safety + Protocol Kit", "Warranty + Support Kit"],
        defaultSeoTitle: "Performance Recovery System | Athlete Cold Plunge | Power Plunge",
        defaultSeoDescription: "Professional-grade cold plunge recovery for serious athletes. Reduce soreness, accelerate recovery, and perform at your peak. Shop Power Plunge.",
      },
    ],
  },
];
