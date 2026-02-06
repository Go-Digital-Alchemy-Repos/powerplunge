import { registerBlock } from "./registry";
import {
  textField,
  textareaField,
  numberField,
  selectField,
  checkboxField,
  arrayField,
} from "./helpers";

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

export function registerCmsV1Blocks() {
  registerBlock({
    type: "hero",
    label: "Hero",
    category: "layout",
    version: 1,
    description: "Full-width hero section with headline, subheadline, and CTA",
    renderComponent: HeroBlock,
    defaultProps: {
      headline: "Welcome to Power Plunge",
      subheadline: "Experience the ultimate cold therapy for peak recovery and performance.",
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
    puckFields: {
      headline: textField("Headline"),
      subheadline: textareaField("Subheadline"),
      ctaText: textField("Primary CTA Text"),
      ctaHref: textField("Primary CTA Link"),
      secondaryCtaText: textField("Secondary CTA Text"),
      secondaryCtaHref: textField("Secondary CTA Link"),
      backgroundImage: textField("Background Image URL"),
      heroImage: textField("Split Image URL (for split layouts)"),
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
    category: "content",
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
      src: textField("Image URL"),
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
        src: textField("Image URL"),
        alt: textField("Alt Text"),
        caption: textField("Caption"),
        linkHref: textField("Link URL"),
      }),
    },
  });

  registerBlock({
    type: "featureList",
    label: "Feature List",
    category: "content",
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
    category: "social",
    version: 1,
    description: "Customer testimonials in cards or slider layout",
    renderComponent: TestimonialsBlock,
    defaultProps: {
      title: "What Our Customers Say",
      items: [
        { quote: "The Power Plunge has been a game-changer for my recovery routine. I feel more energized and recover faster after every session.", name: "Alex Johnson", title: "Professional Athlete", avatar: "" },
        { quote: "Best investment I've made for my wellness studio. My clients absolutely love it and it's incredibly low maintenance.", name: "Sarah Chen", title: "Wellness Studio Owner", avatar: "" },
        { quote: "The build quality is outstanding. It's been running perfectly for over a year with minimal upkeep. Highly recommend.", name: "Marcus Williams", title: "Fitness Coach", avatar: "" },
      ],
      layout: "cards",
    },
    puckFields: {
      title: textField("Section Title"),
      layout: selectField("Layout", [
        { label: "Cards Grid", value: "cards" },
        { label: "Slider", value: "slider" },
      ]),
      items: arrayField("Testimonials", {
        quote: textareaField("Quote"),
        name: textField("Name"),
        title: textField("Title / Role"),
        avatar: textField("Avatar URL"),
      }),
    },
  });

  registerBlock({
    type: "faq",
    label: "FAQ",
    category: "content",
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
    category: "layout",
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
    category: "commerce",
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
    category: "commerce",
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
    category: "social",
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
    category: "commerce",
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
}
