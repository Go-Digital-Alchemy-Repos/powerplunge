import { registerBlock } from "./registry";
import {
  textField,
  textareaField,
  numberField,
  selectField,
  checkboxField,
  arrayField,
  imageField,
} from "./helpers";

import BlogPostFeedBlock from "./BlogPostFeedBlock";
import BlogFeaturedPostBlock from "./BlogFeaturedPostBlock";
import HeroBlock from "./HeroBlock";
import RichTextBlock from "./RichTextBlock";
import ImageBlock from "./ImageBlock";
import ImageGridBlock from "./ImageGridBlock";
import FeatureListBlock from "./FeatureListBlock";
import TestimonialsBlock from "./TestimonialsBlock";
import FAQBlock from "./FAQBlock";
import CallToActionBlock from "./CallToActionBlock";
import ProductGridBlock from "./ProductGridBlock";
import ProductHighlightBlock from "./ProductHighlightBlock";
import TrustBarBlock from "./TrustBarBlock";
import ComparisonTableBlock from "./ComparisonTableBlock";
import BenefitStackBlock from "./BenefitStackBlock";
import ScienceExplainerBlock from "./ScienceExplainerBlock";
import ProtocolBuilderBlock from "./ProtocolBuilderBlock";
import RecoveryUseCasesBlock from "./RecoveryUseCasesBlock";
import SafetyChecklistBlock from "./SafetyChecklistBlock";
import GuaranteeAndWarrantyBlock from "./GuaranteeAndWarrantyBlock";
import DeliveryAndSetupBlock from "./DeliveryAndSetupBlock";
import FinancingAndPaymentBlock from "./FinancingAndPaymentBlock";
import ObjectionBustersBlock from "./ObjectionBustersBlock";
import BeforeAfterExpectationsBlock from "./BeforeAfterExpectationsBlock";
import PressMentionsBlock from "./PressMentionsBlock";
import SocialProofStatsBlock from "./SocialProofStatsBlock";
import StatsBarBlock from "./StatsBarBlock";
import FeatureGridBlock from "./FeatureGridBlock";
import FeaturedProductBlock from "./FeaturedProductBlock";
import IconGridBlock from "./IconGridBlock";
import CTABlock from "./CTABlock";

export function registerCmsV1Blocks() {
  registerBlock({
    type: "hero",
    label: "Hero",
    category: "layout",
    version: 1,
    description: "Full-width hero section with headline, subheadline, and CTA",
    renderComponent: HeroBlock,
    defaultProps: {
      badge: "",
      title: "Welcome to Power Plunge",
      titleHighlight: "",
      subtitle: "Experience the ultimate cold therapy for peak recovery and performance.",
      headline: "",
      subheadline: "",
      primaryButtonText: "Shop Now",
      primaryButtonLink: "/shop",
      primaryButtonIcon: "",
      primaryButtonAction: "link",
      ctaText: "",
      ctaHref: "",
      secondaryButtonText: "Learn More",
      secondaryButtonLink: "#features",
      secondaryCtaText: "",
      secondaryCtaHref: "",
      productId: "",
      backgroundImage: "",
      heroImage: "",
      align: "center",
      layout: "stacked",
      fullWidth: true,
      overlayOpacity: 60,
      minHeight: "default",
      themeVariant: "ice",
    },
    puckFields: {
      badge: textField("Badge Text"),
      title: textField("Title"),
      titleHighlight: textField("Title Highlight (gradient text)"),
      subtitle: textareaField("Subtitle"),
      primaryButtonText: textField("Primary Button Text"),
      primaryButtonLink: textField("Primary Button Link"),
      primaryButtonIcon: textField("Primary Button Icon (Lucide name)"),
      primaryButtonAction: selectField("Primary Button Action", [
        { label: "Navigate to Link", value: "link" },
        { label: "Add to Cart", value: "addToCart" },
      ]),
      secondaryButtonText: textField("Secondary Button Text"),
      secondaryButtonLink: textField("Secondary Button Link"),
      productId: textField("Product ID (for Add to Cart action)"),
      heroImage: imageField("Split Image (for split layouts)"),
      layout: selectField("Layout", [
        { label: "Stacked (centered)", value: "stacked" },
        { label: "Split \u2014 Image Right", value: "split-left" },
        { label: "Split \u2014 Image Left", value: "split-right" },
      ]),
      align: selectField("Text Alignment", [
        { label: "Center", value: "center" },
        { label: "Left", value: "left" },
      ]),
      fullWidth: checkboxField("Full-Width Section"),
      overlayOpacity: numberField("Overlay Opacity (%)", 0, 100),
      minHeight: selectField("Minimum Height", [
        { label: "Default (70vh)", value: "default" },
        { label: "Tall (85vh)", value: "tall" },
        { label: "Full Screen", value: "full" },
      ]),
      themeVariant: selectField("Theme Variant", [
        { label: "Default", value: "" },
        { label: "Ice Gradient", value: "ice" },
      ]),
    },
  });

  registerBlock({
    type: "richText",
    label: "Rich Text",
    category: "utility",
    version: 1,
    description: "Text content block with optional title and HTML body",
    renderComponent: RichTextBlock,
    defaultProps: {
      title: "About Our Products",
      bodyRichText: "<p>Our cold plunge tanks are engineered for durability, performance, and ease of use. Whether you're a professional athlete or a wellness enthusiast, Power Plunge delivers consistent cold therapy at the touch of a button.</p><p>Every unit is built with medical-grade stainless steel and advanced cooling technology to maintain precise temperatures.</p>",
      align: "left",
    },
    puckFields: {
      title: textField("Title"),
      bodyRichText: textareaField("Body (HTML)"),
      align: selectField("Alignment", [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ]),
    },
  });

  registerBlock({
    type: "image",
    label: "Image",
    category: "media",
    version: 1,
    description: "Single image with optional caption and link",
    renderComponent: ImageBlock,
    defaultProps: {
      src: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=450&fit=crop",
      alt: "Cold plunge tank in a modern wellness studio",
      caption: "The Power Plunge Pro in action",
      aspectRatio: "16:9",
      rounded: true,
      linkHref: "",
    },
    puckFields: {
      src: imageField("Image"),
      alt: textField("Alt Text"),
      caption: textField("Caption"),
      aspectRatio: selectField("Aspect Ratio", [
        { label: "Auto", value: "" },
        { label: "16:9", value: "16:9" },
        { label: "4:3", value: "4:3" },
        { label: "1:1", value: "1:1" },
      ]),
      rounded: checkboxField("Rounded Corners"),
      linkHref: textField("Link URL"),
    },
  });

  registerBlock({
    type: "imageGrid",
    label: "Image Grid",
    category: "media",
    version: 1,
    description: "Grid of images with optional captions and links",
    renderComponent: ImageGridBlock,
    defaultProps: {
      items: [
        { src: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop", alt: "Recovery session", caption: "Recovery Session", linkHref: "" },
        { src: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&h=300&fit=crop", alt: "Athlete training", caption: "Peak Performance", linkHref: "" },
        { src: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop", alt: "Wellness center", caption: "Wellness Center", linkHref: "" },
      ],
      columns: 3,
      spacing: "normal",
    },
    puckFields: {
      columns: numberField("Columns", 2, 4),
      spacing: selectField("Spacing", [
        { label: "Tight", value: "tight" },
        { label: "Normal", value: "normal" },
        { label: "Loose", value: "loose" },
      ]),
      items: arrayField("Images", {
        src: imageField("Image"),
        alt: textField("Alt Text"),
        caption: textField("Caption"),
        linkHref: textField("Link URL"),
      }),
    },
  });

  registerBlock({
    type: "featureList",
    label: "Feature List",
    category: "marketing",
    version: 1,
    description: "List of features with icons, titles, and descriptions",
    renderComponent: FeatureListBlock,
    defaultProps: {
      title: "Why Choose Power Plunge?",
      items: [
        { icon: "Snowflake", title: "Precise Temperature", description: "Maintain exact water temperature from 37\u00b0F to 60\u00b0F with our digital controller." },
        { icon: "Shield", title: "Medical-Grade Build", description: "304 stainless steel interior with UV sanitation keeps your water crystal clear." },
        { icon: "Zap", title: "Rapid Cooling", description: "Powerful chiller reaches target temperature in under 2 hours from room temp." },
      ],
      columns: 3,
    },
    puckFields: {
      title: textField("Section Title"),
      columns: numberField("Columns", 1, 3),
      items: arrayField("Features", {
        icon: textField("Icon (Lucide name)"),
        title: textField("Title"),
        description: textareaField("Description"),
      }),
    },
  });

  registerBlock({
    type: "testimonials",
    label: "Testimonials",
    category: "trust",
    version: 1,
    description: "Customer testimonials — manual or auto-fetched from Google Reviews",
    renderComponent: TestimonialsBlock,
    defaultProps: {
      title: "What Our Customers Say",
      source: "manual",
      minRating: 4,
      showGoogleBadge: true,
      items: [
        { quote: "The Power Plunge has been a game-changer for my recovery routine. I feel more energized and recover faster after every session.", name: "Alex Johnson", title: "Professional Athlete", avatar: "" },
        { quote: "Best investment I've made for my wellness studio. My clients absolutely love it and it's incredibly low maintenance.", name: "Sarah Chen", title: "Wellness Studio Owner", avatar: "" },
        { quote: "The build quality is outstanding. It's been running perfectly for over a year with minimal upkeep. Highly recommend.", name: "Marcus Williams", title: "Fitness Coach", avatar: "" },
      ],
      layout: "cards",
    },
    puckFields: {
      title: textField("Section Title"),
      source: selectField("Review Source", [
        { label: "Manual (enter below)", value: "manual" },
        { label: "Google Reviews (auto-fetch)", value: "google" },
      ]),
      layout: selectField("Layout", [
        { label: "Cards Grid", value: "cards" },
        { label: "Slider", value: "slider" },
      ]),
      minRating: numberField("Minimum Star Rating (Google)", 1, 5),
      showGoogleBadge: checkboxField("Show Google Rating Badge"),
      items: arrayField("Testimonials (manual mode)", {
        quote: textareaField("Quote"),
        name: textField("Name"),
        title: textField("Title / Role"),
        avatar: imageField("Avatar"),
      }),
    },
  });

  registerBlock({
    type: "faq",
    label: "FAQ",
    category: "utility",
    version: 1,
    description: "Accordion-style frequently asked questions",
    renderComponent: FAQBlock,
    defaultProps: {
      title: "Frequently Asked Questions",
      items: [
        { q: "What temperature does the cold plunge maintain?", a: "Our cold plunge tanks can maintain precise temperatures between 37\u00b0F and 60\u00b0F, with digital controls for exact adjustments." },
        { q: "How long does it take to cool down?", a: "From room temperature, our chiller system reaches the target temperature in approximately 2 hours. Once cooled, the insulated design maintains the temperature efficiently." },
        { q: "Is a cold plunge safe for everyone?", a: "Cold plunging is generally safe for healthy adults. We recommend consulting your physician if you have heart conditions, high blood pressure, or are pregnant. Always start with shorter sessions and warmer temperatures." },
      ],
      allowMultipleOpen: false,
    },
    puckFields: {
      title: textField("Section Title"),
      allowMultipleOpen: checkboxField("Allow Multiple Open"),
      items: arrayField("Questions", {
        q: textField("Question"),
        a: textareaField("Answer"),
      }),
    },
  });

  registerBlock({
    type: "callToAction",
    label: "Call to Action",
    category: "marketing",
    version: 1,
    description: "Conversion-focused CTA section with primary and secondary buttons",
    renderComponent: CallToActionBlock,
    defaultProps: {
      headline: "Ready to Transform Your Recovery?",
      subheadline: "Join thousands of athletes and wellness enthusiasts who have elevated their recovery with Power Plunge.",
      primaryCtaText: "Shop Now",
      primaryCtaHref: "/shop",
      secondaryCtaText: "Learn More",
      secondaryCtaHref: "#features",
    },
    puckFields: {
      headline: textField("Headline"),
      subheadline: textareaField("Subheadline"),
      primaryCtaText: textField("Primary CTA Text"),
      primaryCtaHref: textField("Primary CTA Link"),
      secondaryCtaText: textField("Secondary CTA Text"),
      secondaryCtaHref: textField("Secondary CTA Link"),
    },
  });

  registerBlock({
    type: "productGrid",
    label: "Product Grid",
    category: "ecommerce",
    version: 1,
    description: "Display products in a grid with optional filtering by IDs or tags",
    renderComponent: ProductGridBlock,
    defaultProps: {
      title: "Our Products",
      productIds: [],
      collectionTag: "",
      queryMode: "all",
      columns: 3,
      showPrice: true,
    },
    puckFields: {
      title: textField("Section Title"),
      queryMode: selectField("Query Mode", [
        { label: "All Products", value: "all" },
        { label: "By IDs", value: "ids" },
        { label: "By Tag", value: "tag" },
      ]),
      collectionTag: textField("Collection Tag (for tag mode)"),
      columns: numberField("Columns", 2, 4),
      showPrice: checkboxField("Show Price"),
    },
  });

  registerBlock({
    type: "productHighlight",
    label: "Product Highlight",
    category: "ecommerce",
    version: 1,
    description: "Detailed single product showcase with gallery, bullets, and buy button",
    renderComponent: ProductHighlightBlock,
    defaultProps: {
      productId: "",
      highlightBullets: [
        "Medical-grade 304 stainless steel interior",
        "Digital temperature controller (37-60\u00b0F)",
        "Built-in UV sanitation system",
        "Energy-efficient insulated design",
      ],
      showGallery: true,
      showBuyButton: true,
    },
    puckFields: {
      productId: textField("Product ID"),
      showGallery: checkboxField("Show Image Gallery"),
      showBuyButton: checkboxField("Show Buy Button"),
    },
  });

  registerBlock({
    type: "trustBar",
    label: "Trust Bar",
    category: "trust",
    version: 1,
    description: "Row of trust signals with icons, labels, and sublabels",
    renderComponent: TrustBarBlock,
    defaultProps: {
      items: [
        { icon: "Truck", label: "Free Shipping", sublabel: "On all orders" },
        { icon: "Shield", label: "2-Year Warranty", sublabel: "Full coverage" },
        { icon: "Headphones", label: "24/7 Support", sublabel: "Always here to help" },
        { icon: "RotateCcw", label: "30-Day Returns", sublabel: "No questions asked" },
      ],
      layout: "row",
    },
    puckFields: {
      layout: selectField("Layout", [
        { label: "Row", value: "row" },
        { label: "Wrap Grid", value: "wrap" },
      ]),
      items: arrayField("Trust Items", {
        icon: textField("Icon (Lucide name)"),
        label: textField("Label"),
        sublabel: textField("Sublabel"),
      }),
    },
  });

  registerBlock({
    type: "comparisonTable",
    label: "Comparison Table",
    category: "ecommerce",
    version: 1,
    description: "Feature comparison table with highlight column support",
    renderComponent: ComparisonTableBlock,
    defaultProps: {
      title: "Compare Models",
      columns: [
        { key: "feature", label: "Feature" },
        { key: "standard", label: "Standard" },
        { key: "pro", label: "Pro" },
      ],
      rows: [
        { label: "Temperature Range", feature: "", standard: "45-60\u00b0F", pro: "37-60\u00b0F" },
        { label: "Material", feature: "", standard: "ABS Plastic", pro: "304 Stainless Steel" },
        { label: "UV Sanitation", feature: "", standard: "No", pro: "Yes" },
        { label: "WiFi Control", feature: "", standard: "No", pro: "Yes" },
      ],
      highlightColumnKey: "pro",
    },
    puckFields: {
      title: textField("Table Title"),
      highlightColumnKey: textField("Highlight Column Key"),
      columns: arrayField("Columns", {
        key: textField("Key"),
        label: textField("Label"),
      }),
      rows: arrayField("Rows", {
        label: textField("Feature Label"),
      }),
    },
  });

  registerBlock({
    type: "benefitStack",
    label: "Benefit Stack",
    category: "powerplunge",
    version: 1,
    description: "Scannable benefits list in stack or timeline layout",
    renderComponent: BenefitStackBlock,
    defaultProps: {
      title: "Why Cold Plunging Works",
      items: [
        { headline: "Reduced Inflammation", description: "Cold exposure constricts blood vessels, helping reduce swelling and muscle soreness after intense activity.", icon: "Snowflake", emphasis: true },
        { headline: "Improved Circulation", description: "Alternating cold exposure stimulates blood flow, delivering oxygen and nutrients to recovering tissues.", icon: "Activity" },
        { headline: "Mental Clarity", description: "Cold immersion activates the sympathetic nervous system, boosting focus and alertness throughout the day.", icon: "Brain" },
        { headline: "Better Sleep", description: "Regular cold plunging helps regulate your body's core temperature cycle, promoting deeper, more restorative sleep.", icon: "Moon" },
      ],
      layout: "stack",
    },
    puckFields: {
      title: textField("Section Title"),
      layout: selectField("Layout", [
        { label: "Stack (cards)", value: "stack" },
        { label: "Timeline", value: "timeline" },
      ]),
      items: arrayField("Benefits", {
        headline: textField("Headline"),
        description: textareaField("Description"),
        icon: textField("Icon (Lucide name)"),
        emphasis: checkboxField("Emphasize"),
      }),
    },
  });

  registerBlock({
    type: "scienceExplainer",
    label: "Science Explainer",
    category: "powerplunge",
    version: 1,
    description: "Evidence-based content sections with citations and disclaimer",
    renderComponent: ScienceExplainerBlock,
    defaultProps: {
      title: "The Science Behind Cold Exposure",
      sections: [
        { heading: "Hormetic Stress Response", body: "Brief cold exposure triggers a hormetic stress response — a beneficial adaptation where the body becomes more resilient. This process activates cold-shock proteins and increases norepinephrine levels, which can support mood and attention.", citationLabel: "Shevchuk, 2008", citationUrl: "" },
        { heading: "Inflammation & Recovery", body: "Cold water immersion has been widely studied for its effects on delayed-onset muscle soreness (DOMS). Research suggests that cold exposure may help modulate the inflammatory response following exercise.", citationLabel: "Bleakley et al., 2012", citationUrl: "" },
        { heading: "Metabolic Activation", body: "Cold exposure activates brown adipose tissue (BAT), which generates heat by burning calories. Regular cold plunging may support metabolic health over time.", citationLabel: "van Marken Lichtenbelt et al., 2009", citationUrl: "" },
      ],
      disclaimerText: "This content is for informational purposes only and is not intended as medical advice. Consult a qualified healthcare professional before beginning any cold exposure practice.",
    },
    puckFields: {
      title: textField("Section Title"),
      disclaimerText: textareaField("Disclaimer Text"),
      sections: arrayField("Sections", {
        heading: textField("Heading"),
        body: textareaField("Body"),
        citationLabel: textField("Citation Label"),
        citationUrl: textField("Citation URL"),
      }),
    },
  });

  registerBlock({
    type: "protocolBuilder",
    label: "Protocol Builder",
    category: "powerplunge",
    version: 1,
    description: "Cold plunge protocols by experience level with safety disclaimer",
    renderComponent: ProtocolBuilderBlock,
    defaultProps: {
      title: "Cold Plunge Protocols",
      protocols: [
        { level: "beginner", tempRange: "58–60°F (14–16°C)", duration: "1–2 minutes", frequency: "2–3× per week", notes: "Focus on controlled breathing. Exit if you feel dizzy or numb." },
        { level: "intermediate", tempRange: "50–57°F (10–14°C)", duration: "2–5 minutes", frequency: "3–5× per week", notes: "Pair with breathwork. Gradually extend session length over weeks." },
        { level: "advanced", tempRange: "37–49°F (3–9°C)", duration: "5–10 minutes", frequency: "Daily or as tolerated", notes: "Monitor body response closely. Never plunge alone at extreme temperatures." },
      ],
      disclaimerText: "Consult a healthcare professional before starting any cold exposure protocol. Individual tolerance varies — start conservatively and progress gradually.",
    },
    puckFields: {
      title: textField("Section Title"),
      disclaimerText: textareaField("Disclaimer Text"),
      protocols: arrayField("Protocols", {
        level: selectField("Level", [
          { label: "Beginner", value: "beginner" },
          { label: "Intermediate", value: "intermediate" },
          { label: "Advanced", value: "advanced" },
        ]),
        tempRange: textField("Temperature Range"),
        duration: textField("Duration"),
        frequency: textField("Frequency"),
        notes: textareaField("Notes"),
      }),
    },
  });

  registerBlock({
    type: "recoveryUseCases",
    label: "Recovery Use Cases",
    category: "powerplunge",
    version: 1,
    description: "Persona-based messaging showing cold plunge benefits for different audiences",
    renderComponent: RecoveryUseCasesBlock,
    defaultProps: {
      title: "Cold Plunging for Every Lifestyle",
      cases: [
        { audience: "athletes", headline: "Train Harder, Recover Faster", bullets: ["Reduce post-workout soreness", "Accelerate muscle recovery between sessions", "Support joint health under heavy training loads"] },
        { audience: "busy professionals", headline: "Sharpen Your Edge", bullets: ["Boost morning alertness without extra caffeine", "Manage daily stress with a reset ritual", "Improve focus and mental resilience"] },
        { audience: "active aging", headline: "Move Better, Feel Younger", bullets: ["Support circulation and joint mobility", "Promote deeper, more restorative sleep", "Build a daily wellness habit with measurable impact"] },
        { audience: "first responders", headline: "Built for Those Who Serve", bullets: ["Manage physical strain from demanding shifts", "Support mental health through cold-water therapy", "Recover faster between back-to-back duties"] },
      ],
    },
    puckFields: {
      title: textField("Section Title"),
      cases: arrayField("Use Cases", {
        audience: selectField("Audience", [
          { label: "Athletes", value: "athletes" },
          { label: "Busy Professionals", value: "busy professionals" },
          { label: "Active Aging", value: "active aging" },
          { label: "First Responders", value: "first responders" },
        ]),
        headline: textField("Headline"),
        bullets: arrayField("Bullet Points", {
          value: textField("Bullet Text"),
        }),
      }),
    },
  });

  registerBlock({
    type: "safetyChecklist",
    label: "Safety Checklist",
    category: "powerplunge",
    version: 1,
    description: "Safety guidelines checklist with required/optional items and disclaimer",
    renderComponent: SafetyChecklistBlock,
    defaultProps: {
      title: "Safety Guidelines",
      items: [
        { text: "Consult your physician before starting cold water immersion", required: true },
        { text: "Never plunge alone — always have someone nearby", required: true },
        { text: "Start with warmer temperatures (58–60°F) and shorter sessions", required: true },
        { text: "Exit immediately if you feel dizzy, numb, or short of breath", required: true },
        { text: "Avoid cold plunging after consuming alcohol", required: true },
        { text: "Wait at least 30 minutes after a heavy meal", required: false },
        { text: "Keep a warm towel and dry clothes within arm's reach", required: false },
        { text: "Track your sessions to monitor progress and tolerance", required: false },
      ],
      disclaimerText: "Cold water immersion carries inherent risks. Individuals with cardiovascular conditions, Raynaud's disease, or pregnancy should avoid cold plunging. Always consult a qualified healthcare provider.",
    },
    puckFields: {
      title: textField("Section Title"),
      disclaimerText: textareaField("Disclaimer Text"),
      items: arrayField("Checklist Items", {
        text: textField("Item Text"),
        required: checkboxField("Required"),
      }),
    },
  });

  registerBlock({
    type: "guaranteeAndWarranty",
    label: "Guarantee & Warranty",
    category: "powerplunge",
    version: 1,
    description: "Trust-building section with guarantee bullets, warranty summary, and support CTA",
    renderComponent: GuaranteeAndWarrantyBlock,
    defaultProps: {
      title: "Our Promise to You",
      guaranteeBullets: [
        "30-day money-back guarantee — no questions asked",
        "Free return shipping on all guarantee claims",
        "Full refund or exchange at your choice",
        "Hassle-free process with dedicated support",
      ],
      warrantySummary: "Every Power Plunge unit comes with a comprehensive 2-year manufacturer warranty covering the chiller system, tub construction, and electronic controls. Extended warranty options are available at checkout for up to 5 years of total coverage.",
      supportCtaText: "Contact Our Support Team",
      supportCtaHref: "/contact",
    },
    puckFields: {
      title: textField("Section Title"),
      warrantySummary: textareaField("Warranty Summary"),
      supportCtaText: textField("Support CTA Text"),
      supportCtaHref: textField("Support CTA Link"),
      guaranteeBullets: arrayField("Guarantee Bullets", {
        value: textField("Bullet Text"),
      }),
    },
  });

  registerBlock({
    type: "deliveryAndSetup",
    label: "Delivery & Setup",
    category: "powerplunge",
    version: 1,
    description: "Step-by-step delivery and setup process with included items and shipping info",
    renderComponent: DeliveryAndSetupBlock,
    defaultProps: {
      title: "Delivery & Setup",
      steps: [
        { title: "Order Confirmation", description: "Receive your order confirmation and estimated delivery window within 24 hours." },
        { title: "White-Glove Delivery", description: "Our team delivers your unit to the room of your choice — no heavy lifting on your end." },
        { title: "Professional Setup", description: "We handle full assembly, water fill, and initial system calibration on-site." },
        { title: "Walkthrough & Training", description: "A technician walks you through operation, maintenance, and your first plunge session." },
      ],
      includesBullets: [
        "Cold plunge tub and chiller unit",
        "Insulated cover and filtration system",
        "Digital temperature controller",
        "Starter water treatment kit",
        "Quick-start guide and owner's manual",
      ],
      shippingEstimateText: "Free shipping on all orders. Typical delivery within 7–14 business days to most US locations.",
    },
    puckFields: {
      title: textField("Section Title"),
      shippingEstimateText: textField("Shipping Estimate Text"),
      steps: arrayField("Setup Steps", {
        title: textField("Step Title"),
        description: textareaField("Step Description"),
      }),
      includesBullets: arrayField("What's Included", {
        value: textField("Item"),
      }),
    },
  });

  registerBlock({
    type: "financingAndPayment",
    label: "Financing & Payment",
    category: "powerplunge",
    version: 1,
    description: "Payment options and financing information to reduce price objections",
    renderComponent: FinancingAndPaymentBlock,
    defaultProps: {
      title: "Flexible Payment Options",
      bullets: [
        "All major credit and debit cards accepted",
        "Split your purchase into 3–12 monthly installments",
        "0% APR financing available on qualifying orders",
        "Apple Pay and Google Pay supported at checkout",
        "Business purchase orders and net-30 terms available",
      ],
      financingProviderName: "Affirm",
      financingDisclaimer: "Financing is subject to credit approval. Terms and rates may vary based on creditworthiness. 0% APR available on select terms for qualified buyers.",
    },
    puckFields: {
      title: textField("Section Title"),
      financingProviderName: textField("Financing Provider Name"),
      financingDisclaimer: textareaField("Financing Disclaimer"),
      bullets: arrayField("Payment Options", {
        value: textField("Option"),
      }),
    },
  });

  registerBlock({
    type: "objectionBusters",
    label: "Objection Busters",
    category: "marketing",
    version: 1,
    description: "Address common concerns with clear, reassuring responses",
    renderComponent: ObjectionBustersBlock,
    defaultProps: {
      title: "Common Questions & Concerns",
      items: [
        { objection: "Isn't cold plunging dangerous?", response: "When used responsibly and following our safety guidelines, cold plunging is practiced safely by millions of people worldwide. We include comprehensive safety documentation and recommend consulting your physician before starting." },
        { objection: "I can't handle cold water.", response: "Most people start at warmer temperatures (58–60°F) for just 1–2 minutes and gradually build tolerance. Our digital controller lets you set the exact temperature that's right for you." },
        { objection: "It seems too expensive.", response: "A Power Plunge pays for itself compared to ongoing cryotherapy sessions, spa memberships, or ice deliveries. We also offer flexible financing options to fit your budget." },
        { objection: "I don't have room for it.", response: "Our units have a compact footprint similar to a standard bathtub and can be placed indoors or outdoors. Many customers set up in garages, patios, or spare bathrooms." },
      ],
    },
    puckFields: {
      title: textField("Section Title"),
      items: arrayField("Objections", {
        objection: textField("Objection / Concern"),
        response: textareaField("Response"),
      }),
    },
  });

  registerBlock({
    type: "beforeAfterExpectations",
    label: "Before & After Expectations",
    category: "marketing",
    version: 1,
    description: "Set realistic expectations with compliant 'what to expect' messaging",
    renderComponent: BeforeAfterExpectationsBlock,
    defaultProps: {
      title: "What to Expect",
      expectations: [
        { label: "First Session", description: "Your first plunge may feel intense — that's normal. Many users report an invigorating rush followed by a sense of calm and alertness." },
        { label: "First Week", description: "With consistent use, most people begin to notice improved tolerance to the cold and may experience better sleep quality and reduced muscle soreness." },
        { label: "First Month", description: "Regular cold plungers often report sustained improvements in energy, mood, and recovery times. Individual results vary based on frequency and protocol." },
        { label: "Ongoing Practice", description: "Cold plunging can become a cornerstone of your wellness routine. Many long-term users describe it as one of their most valued daily habits." },
      ],
    },
    puckFields: {
      title: textField("Section Title"),
      expectations: arrayField("Expectations", {
        label: textField("Label / Milestone"),
        description: textareaField("Description"),
      }),
    },
  });

  registerBlock({
    type: "pressMentions",
    label: "Press Mentions",
    category: "trust",
    version: 1,
    description: "Display press and media logos for credibility",
    renderComponent: PressMentionsBlock,
    defaultProps: {
      title: "As Seen In",
      logos: [
        { src: "https://placehold.co/160x40/111827/9ca3af?text=Forbes", alt: "Forbes", href: "" },
        { src: "https://placehold.co/160x40/111827/9ca3af?text=Men's+Health", alt: "Men's Health", href: "" },
        { src: "https://placehold.co/160x40/111827/9ca3af?text=ESPN", alt: "ESPN", href: "" },
        { src: "https://placehold.co/160x40/111827/9ca3af?text=GQ", alt: "GQ", href: "" },
        { src: "https://placehold.co/160x40/111827/9ca3af?text=Wired", alt: "Wired", href: "" },
      ],
      noteText: "Replace placeholder logos with your actual press mention images.",
    },
    puckFields: {
      title: textField("Section Title"),
      noteText: textField("Note Text"),
      logos: arrayField("Logos", {
        src: imageField("Logo Image"),
        alt: textField("Alt Text"),
        href: textField("Link URL (optional)"),
      }),
    },
  });

  registerBlock({
    type: "socialProofStats",
    label: "Social Proof Stats",
    category: "trust",
    version: 1,
    description: "Key statistics that demonstrate social proof and credibility",
    renderComponent: SocialProofStatsBlock,
    defaultProps: {
      title: "By the Numbers",
      stats: [
        { value: "10,000+", label: "Units Sold" },
        { value: "4.9/5", label: "Customer Rating" },
        { value: "50+", label: "Pro Teams" },
        { value: "2 Year", label: "Warranty" },
      ],
      disclaimer: "Statistics reflect cumulative data as of the most recent reporting period.",
    },
    puckFields: {
      title: textField("Section Title"),
      disclaimer: textField("Disclaimer Text"),
      stats: arrayField("Stats", {
        value: textField("Value"),
        label: textField("Label"),
      }),
    },
  });

  registerBlock({
    type: "blogPostFeed",
    label: "Blog Post Feed",
    category: "utility",
    version: 1,
    description: "Displays a feed of published blog posts with search, filters, and pagination",
    renderComponent: BlogPostFeedBlock,
    defaultProps: {
      title: "Latest Posts",
      description: "",
      layout: "grid",
      postsPerPage: "12",
      showSearch: "true",
      showCategoryFilter: "true",
      showTagFilter: "true",
      featuredOnly: "false",
      excludeFeatured: "false",
      categorySlug: "",
      tagSlug: "",
    },
    puckFields: {
      title: textField("Section Title"),
      description: textareaField("Description"),
      layout: selectField("Layout", [
        { label: "Grid (cards)", value: "grid" },
        { label: "List", value: "list" },
      ]),
      postsPerPage: selectField("Posts Per Page", [
        { label: "6", value: "6" },
        { label: "9", value: "9" },
        { label: "12", value: "12" },
        { label: "24", value: "24" },
      ]),
      showSearch: checkboxField("Show Search"),
      showCategoryFilter: checkboxField("Show Category Filter"),
      showTagFilter: checkboxField("Show Tag Filter"),
      featuredOnly: checkboxField("Featured Posts Only"),
      excludeFeatured: checkboxField("Exclude Featured Post (use with Featured Post block)"),
      categorySlug: textField("Filter by Category Slug (optional)"),
      tagSlug: textField("Filter by Tag Slug (optional)"),
    },
  });

  registerBlock({
    type: "blogFeaturedPost",
    label: "Blog Featured Post",
    category: "utility",
    version: 1,
    description: "Displays the latest featured blog post in a large, prominent card layout",
    renderComponent: BlogFeaturedPostBlock,
    defaultProps: {
      title: "",
    },
    puckFields: {
      title: textField("Section Title (optional)"),
    },
  });

  registerBlock({
    type: "statsBar",
    label: "Stats Bar",
    category: "powerplunge",
    version: 1,
    description: "A row of key statistics with icons, values, and labels",
    renderComponent: StatsBarBlock,
    defaultProps: {
      stats: [
        { icon: "Award", label: "Units Sold", value: "10,000+" },
        { icon: "Thermometer", label: "Temp Range", value: "39°F" },
        { icon: "Star", label: "Customer Rating", value: "4.9/5" },
        { icon: "Shield", label: "Warranty", value: "2 Year" },
      ],
    },
    puckFields: {
      stats: arrayField("Stats", {
        icon: textField("Icon (Lucide name)"),
        value: textField("Value"),
        label: textField("Label"),
      }),
    },
  });

  registerBlock({
    type: "featureGrid",
    label: "Feature Grid",
    category: "powerplunge",
    version: 1,
    description: "Grid of feature cards with icons, titles, and descriptions",
    renderComponent: FeatureGridBlock,
    defaultProps: {
      title: "Why Choose",
      titleHighlight: "Power Plunge",
      titleSuffix: "?",
      subtitle: "Built with premium materials and cutting-edge technology.",
      sectionId: "features",
      columns: 3,
      features: [
        { icon: "Thermometer", title: "Rapid Cooling", description: "Reaches 39°F in minutes with our advanced chilling system." },
        { icon: "Shield", title: "Built to Last", description: "Premium insulation and medical-grade stainless steel construction." },
        { icon: "Zap", title: "Easy Setup", description: "Self-contained system. No plumbing required, plug and plunge." },
      ],
    },
    puckFields: {
      title: textField("Title"),
      titleHighlight: textField("Title Highlight (gradient text)"),
      titleSuffix: textField("Title Suffix"),
      subtitle: textareaField("Subtitle"),
      sectionId: textField("Section ID (for anchor links)"),
      columns: selectField("Columns", [
        { label: "2 Columns", value: "2" },
        { label: "3 Columns", value: "3" },
        { label: "4 Columns", value: "4" },
      ]),
      features: arrayField("Features", {
        icon: textField("Icon (Lucide name)"),
        title: textField("Title"),
        description: textareaField("Description"),
      }),
    },
  });

  registerBlock({
    type: "featuredProduct",
    label: "Featured Product",
    category: "powerplunge",
    version: 1,
    description: "Showcase the featured product with pricing, features, and add-to-cart functionality",
    renderComponent: FeaturedProductBlock,
    defaultProps: {
      title: "The Complete System",
      titleHighlight: "System",
      subtitle: "Everything you need for professional-grade cold therapy at home.",
      sectionId: "product",
      productLabel: "Complete Cold Plunge System",
      showKeyFeatures: true,
      showWhatsIncluded: true,
      keyFeatures: [
        { icon: "Thermometer", text: "Reaches 39°F in under 1 hour" },
        { icon: "Shield", text: "Full-body 304 stainless steel tub" },
        { icon: "Wifi", text: "WiFi-enabled smart controls" },
        { icon: "Zap", text: "Energy-efficient operation" },
      ],
      whatsIncluded: [
        "Cold Plunge Tub",
        "Chilling Unit",
        "Insulated Cover",
        "Filtration System",
        "Quick-Start Guide",
      ],
    },
    puckFields: {
      title: textField("Title"),
      titleHighlight: textField("Title Highlight (gradient text)"),
      subtitle: textareaField("Subtitle"),
      sectionId: textField("Section ID (for anchor links)"),
      productLabel: textField("Product Label"),
      showKeyFeatures: checkboxField("Show Key Features"),
      showWhatsIncluded: checkboxField("Show What's Included"),
      keyFeatures: arrayField("Key Features", {
        icon: textField("Icon (Lucide name)"),
        text: textField("Feature Text"),
      }),
      whatsIncluded: arrayField("What's Included", {
        text: textField("Item"),
      }),
    },
  });

  registerBlock({
    type: "iconGrid",
    label: "Icon Grid",
    category: "powerplunge",
    version: 1,
    description: "Grid of icon cards with titles for quick feature highlights",
    renderComponent: IconGridBlock,
    defaultProps: {
      title: "Why",
      titleHighlight: "Athletes",
      items: [
        { icon: "Zap", title: "Faster Recovery" },
        { icon: "Brain", title: "Mental Clarity" },
        { icon: "Heart", title: "Better Sleep" },
        { icon: "Shield", title: "Immune Boost" },
        { icon: "Flame", title: "Fat Burning" },
      ],
      columns: 5,
      sectionId: "",
    },
    puckFields: {
      title: textField("Title"),
      titleHighlight: textField("Title Highlight (gradient text)"),
      sectionId: textField("Section ID (for anchor links)"),
      columns: selectField("Columns", [
        { label: "2 Columns", value: "2" },
        { label: "3 Columns", value: "3" },
        { label: "4 Columns", value: "4" },
        { label: "5 Columns", value: "5" },
      ]),
      items: arrayField("Items", {
        icon: textField("Icon (Lucide name)"),
        title: textField("Title"),
      }),
    },
  });

  registerBlock({
    type: "cta",
    label: "Call to Action",
    category: "powerplunge",
    version: 1,
    description: "Call-to-action section with title, subtitle, and action button",
    renderComponent: CTABlock,
    defaultProps: {
      title: "Ready to Transform Your Recovery?",
      titleHighlight: "Recovery",
      subtitle: "Join thousands of athletes who have upgraded their recovery routine.",
      buttonText: "Order Now",
      buttonLink: "/shop",
      buttonIcon: "Zap",
      buttonAction: "navigate",
      productId: "",
      secondaryButton: "",
      secondaryLink: "",
    },
    puckFields: {
      title: textField("Title"),
      titleHighlight: textField("Title Highlight (gradient text)"),
      subtitle: textareaField("Subtitle"),
      buttonText: textField("Button Text"),
      buttonLink: textField("Button Link"),
      buttonIcon: textField("Button Icon (Lucide name)"),
      buttonAction: selectField("Button Action", [
        { label: "Navigate to Link", value: "navigate" },
        { label: "Add to Cart", value: "addToCart" },
      ]),
      productId: textField("Product ID (for Add to Cart action)"),
      secondaryButton: textField("Secondary Button Text"),
      secondaryLink: textField("Secondary Button Link"),
    },
  });
}
