export interface CmsTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  blocks: CmsTemplateBlock[];
  thumbnail?: string;
  sidebarId?: string;
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
  {
    id: "product-story-v1",
    name: "Product Story v1",
    description: "Tell your product's story with rich media, features, and social proof",
    tags: ["product", "storytelling"],
    blocks: [
      {
        type: "hero",
        data: {
          headline: "Built for Performance. Designed for Recovery.",
          subheadline: "The cold plunge engineered to push your limits.",
          ctaText: "Explore",
          ctaHref: "#features",
          secondaryCtaText: "Shop Now",
          secondaryCtaHref: "/shop",
          backgroundImage: "",
          heroImage: "",
          align: "left",
          layout: "split",
          fullWidth: true,
          overlayOpacity: 50,
          minHeight: "default",
          themeVariant: "ice",
        },
      },
      {
        type: "richText",
        data: {
          body: "<h2>Our Story</h2><p>Every Power Plunge is crafted with a single mission: to deliver the most effective cold therapy experience possible. From the medical-grade stainless steel interior to the whisper-quiet chiller, every detail has been obsessed over so you can focus on what matters — your recovery.</p>",
          maxWidth: "prose",
          textAlign: "left",
        },
      },
      {
        type: "imageGrid",
        data: {
          title: "Crafted with Precision",
          images: [],
          columns: 3,
          aspectRatio: "landscape",
          gap: "md",
        },
      },
      {
        type: "featureList",
        data: {
          title: "Engineered for Excellence",
          items: [
            { icon: "Thermometer", title: "Precision Cooling", description: "Digital controller holds your target temperature within ±0.5°F." },
            { icon: "Shield", title: "Built to Last", description: "304 stainless steel interior with a 10-year structural warranty." },
            { icon: "Droplets", title: "Crystal-Clear Water", description: "Integrated UV-C and ozone sanitation keeps water pristine between sessions." },
          ],
          columns: 3,
        },
      },
      {
        type: "testimonials",
        data: {
          title: "Athletes Trust Power Plunge",
          items: [
            { quote: "This is the real deal. After two-a-days, nothing else comes close for recovery.", name: "Derek Lawson", title: "Pro Football Player", avatar: "" },
            { quote: "My clients see faster results and keep coming back. It practically sells itself.", name: "Priya Mehta", title: "Sports Physiotherapist", avatar: "" },
          ],
          layout: "cards",
        },
      },
      {
        type: "callToAction",
        data: {
          headline: "Ready to Transform Your Recovery?",
          subheadline: "See why thousands of athletes trust Power Plunge for peak performance.",
          primaryCtaText: "Shop Now",
          primaryCtaHref: "/shop",
          secondaryCtaText: "Learn More",
          secondaryCtaHref: "/about",
        },
      },
    ],
  },
  {
    id: "sales-funnel-v1",
    name: "Sales Funnel v1",
    description: "High-conversion sales funnel with comparison, social proof, objection handling, and dual CTAs",
    tags: ["funnel", "sales"],
    blocks: [
      {
        type: "hero",
        data: {
          headline: "The #1 Cold Plunge for Serious Recovery",
          subheadline: "Compare, explore, and buy with confidence.",
          ctaText: "See How We Compare",
          ctaHref: "#compare",
          secondaryCtaText: "",
          secondaryCtaHref: "",
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
        type: "comparisonTable",
        data: {
          title: "How Power Plunge Stacks Up",
          columns: ["Power Plunge", "Competitor A", "Competitor B"],
          rows: [
            { feature: "Temperature Range", values: ["37–60°F", "39–65°F", "42–60°F"] },
            { feature: "Cooling Time", values: ["< 2 hours", "3–4 hours", "4+ hours"] },
            { feature: "Sanitation", values: ["UV-C + Ozone", "Manual", "Ozone only"] },
            { feature: "Warranty", values: ["2 Years", "1 Year", "90 Days"] },
          ],
          highlightColumn: 0,
        },
      },
      {
        type: "trustBar",
        data: {
          items: [
            { icon: "Truck", label: "Free Shipping", sublabel: "Continental US" },
            { icon: "Shield", label: "2-Year Warranty", sublabel: "Full coverage" },
            { icon: "CreditCard", label: "Financing Available", sublabel: "As low as $99/mo" },
            { icon: "RotateCcw", label: "30-Day Guarantee", sublabel: "Risk-free trial" },
          ],
          layout: "row",
        },
      },
      {
        type: "testimonials",
        data: {
          title: "Don't Just Take Our Word For It",
          items: [
            { quote: "I compared every brand on the market. Power Plunge won on build quality, cooling speed, and customer support — it wasn't even close.", name: "Jordan Blake", title: "Verified Buyer", avatar: "" },
            { quote: "Switched from a competitor after 6 months. The difference in temperature consistency alone was worth the upgrade.", name: "Nina Castillo", title: "Verified Buyer", avatar: "" },
            { quote: "From unboxing to first plunge took 30 minutes. Setup was incredibly easy.", name: "Cody Reeves", title: "Verified Buyer", avatar: "" },
          ],
          layout: "cards",
        },
      },
      {
        type: "callToAction",
        data: {
          headline: "Limited-Time Offer",
          subheadline: "Order today and get free shipping plus an extended warranty.",
          primaryCtaText: "Claim Your Offer",
          primaryCtaHref: "/shop",
          secondaryCtaText: "",
          secondaryCtaHref: "",
        },
      },
      {
        type: "faq",
        data: {
          title: "Common Questions",
          items: [
            { q: "Do I need a dedicated electrical outlet?", a: "The Power Plunge runs on a standard 110V household outlet — no special wiring required." },
            { q: "How hard is it to maintain?", a: "Our UV-C and ozone sanitation system does the heavy lifting. Most owners spend less than 5 minutes per week on upkeep." },
            { q: "What if I don't like it?", a: "We offer a 30-day risk-free trial. Return it for a full refund, no questions asked." },
            { q: "Is financing available?", a: "Yes! We offer 0% APR financing for up to 12 months through our checkout partner." },
          ],
          allowMultipleOpen: false,
        },
      },
      {
        type: "callToAction",
        data: {
          headline: "Still Thinking It Over?",
          subheadline: "Join 5,000+ customers who made the switch. Your future self will thank you.",
          primaryCtaText: "Buy Now",
          primaryCtaHref: "/shop",
          secondaryCtaText: "Talk to Sales",
          secondaryCtaHref: "/contact",
        },
      },
    ],
  },
  {
    id: "blog-page-v1",
    name: "Blog Page v1",
    description: "Standard blog page with a featured post hero card at the top and a searchable post grid below",
    tags: ["blog", "content"],
    blocks: [
      {
        type: "hero",
        data: {
          headline: "The Power Plunge Blog",
          subheadline: "Cold therapy insights, recovery tips, and the latest from Power Plunge.",
          ctaText: "",
          ctaHref: "",
          secondaryCtaText: "",
          secondaryCtaHref: "",
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
        type: "blogFeaturedPost",
        data: {
          title: "",
        },
      },
      {
        type: "blogPostFeed",
        data: {
          title: "All Posts",
          description: "",
          layout: "grid",
          postsPerPage: "9",
          showSearch: "true",
          showCategoryFilter: "true",
          showTagFilter: "true",
          featuredOnly: "false",
          excludeFeatured: "true",
          categorySlug: "",
          tagSlug: "",
        },
      },
      {
        type: "callToAction",
        data: {
          headline: "Stay in the Loop",
          subheadline: "Follow us for the latest articles on cold therapy, recovery science, and product updates.",
          primaryCtaText: "Shop Products",
          primaryCtaHref: "/shop",
          secondaryCtaText: "Contact Us",
          secondaryCtaHref: "/contact",
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
