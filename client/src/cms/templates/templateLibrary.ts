export interface CmsTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  blocks: CmsTemplateBlock[];
  thumbnail?: string;
}

export interface CmsTemplateBlock {
  type: string;
  data: Record<string, any>;
}

function uid(): string {
  return crypto.randomUUID();
}

export const CMS_TEMPLATES: CmsTemplate[] = [
  {
    id: "blank",
    name: "Blank Page",
    description: "Start from scratch with an empty canvas",
    tags: ["basic"],
    blocks: [],
  },
  {
    id: "landing-page-v1",
    name: "Landing Page v1",
    description: "High-converting landing page with hero, features, product spotlight, social proof, and CTA",
    tags: ["marketing", "landing", "conversion"],
    blocks: [
      {
        type: "hero",
        data: {
          headline: "Experience the Power of Cold Plunge",
          subheadline: "Professional-grade cold therapy at home.",
          ctaText: "Shop Now",
          ctaHref: "/shop",
          secondaryCtaText: "Learn More",
          secondaryCtaHref: "#features",
          backgroundImage: "",
          heroImage: "",
          align: "center",
          layout: "stacked",
          fullWidth: true,
          overlayOpacity: 60,
          minHeight: "default",
          themeVariant: "ice",
        },
      },
      {
        type: "featureList",
        data: {
          title: "Why Choose Power Plunge?",
          items: [
            { icon: "Snowflake", title: "Precise Temperature", description: "Maintain exact water temperature from 37°F to 60°F with our digital controller." },
            { icon: "Shield", title: "Medical-Grade Build", description: "304 stainless steel interior with UV sanitation keeps your water crystal clear." },
            { icon: "Zap", title: "Rapid Cooling", description: "Powerful chiller reaches target temperature in under 2 hours from room temp." },
          ],
          columns: 3,
        },
      },
      {
        type: "productHighlight",
        data: {
          productId: "",
          highlightBullets: [
            "Medical-grade 304 stainless steel interior",
            "Digital temperature controller (37-60°F)",
            "Built-in UV sanitation system",
            "Energy-efficient insulated design",
          ],
          showGallery: true,
          showBuyButton: true,
        },
      },
      {
        type: "testimonials",
        data: {
          title: "What Our Customers Say",
          items: [
            { quote: "The Power Plunge has been a game-changer for my recovery routine. I feel more energized and recover faster after every session.", name: "Alex Johnson", title: "Professional Athlete", avatar: "" },
            { quote: "Best investment I've made for my wellness studio. My clients absolutely love it and it's incredibly low maintenance.", name: "Sarah Chen", title: "Wellness Studio Owner", avatar: "" },
            { quote: "The build quality is outstanding. It's been running perfectly for over a year with minimal upkeep. Highly recommend.", name: "Marcus Williams", title: "Fitness Coach", avatar: "" },
          ],
          layout: "cards",
        },
      },
      {
        type: "trustBar",
        data: {
          items: [
            { icon: "Truck", label: "Free Shipping", sublabel: "On all orders" },
            { icon: "Shield", label: "2-Year Warranty", sublabel: "Full coverage" },
            { icon: "Headphones", label: "24/7 Support", sublabel: "Always here to help" },
            { icon: "RotateCcw", label: "30-Day Returns", sublabel: "No questions asked" },
          ],
          layout: "row",
        },
      },
      {
        type: "callToAction",
        data: {
          headline: "Ready to Upgrade Your Recovery?",
          subheadline: "Join thousands of athletes and wellness enthusiasts who have elevated their recovery with Power Plunge.",
          primaryCtaText: "View Products",
          primaryCtaHref: "/shop",
          secondaryCtaText: "Contact Us",
          secondaryCtaHref: "/contact",
        },
      },
      {
        type: "faq",
        data: {
          title: "Frequently Asked Questions",
          items: [
            { q: "What temperature does the cold plunge maintain?", a: "Our cold plunge tanks can maintain precise temperatures between 37°F and 60°F, with digital controls for exact adjustments." },
            { q: "How long does it take to cool down?", a: "From room temperature, our chiller system reaches the target temperature in approximately 2 hours. Once cooled, the insulated design maintains the temperature efficiently." },
            { q: "Is a cold plunge safe for everyone?", a: "Cold plunging is generally safe for healthy adults. We recommend consulting your physician if you have heart conditions, high blood pressure, or are pregnant. Always start with shorter sessions and warmer temperatures." },
          ],
          allowMultipleOpen: false,
        },
      },
    ],
  },
];

export function getTemplate(id: string): CmsTemplate | undefined {
  return CMS_TEMPLATES.find((t) => t.id === id);
}

export function templateToContentJson(template: CmsTemplate): { version: number; blocks: any[] } {
  return {
    version: 1,
    blocks: template.blocks.map((block) => ({
      id: uid(),
      type: block.type,
      data: { ...block.data },
      settings: {},
    })),
  };
}
