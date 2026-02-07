import type { InsertSitePresetInput } from "../schemas/cmsV2.sitePresets.schema";

export const SITE_PRESET_SEEDS: InsertSitePresetInput[] = [
  {
    name: "Performance Tech Starter",
    description: "Bold, high-contrast site with athletic performance feel. Ideal for fitness-focused cold plunge brands.",
    tags: ["starter", "performance", "athletic"],
    themePackId: "performance-tech",
    homepageTemplateId: "landing-page-v1",
    defaultKitsSectionIds: ["Cold Plunge Benefits Kit", "Safety + Protocol Kit", "Warranty + Support Kit"],
    defaultInsertMode: "sectionRef",
    navPreset: {
      styleVariant: "minimal",
      items: [
        { label: "Home", href: "/", type: "page" },
        { label: "Shop", href: "/shop", type: "page" },
        { label: "FAQ", href: "/faq", type: "page" },
        { label: "Support", href: "/support", type: "page" },
      ],
    },
    footerPreset: {
      columns: [
        {
          title: "Shop",
          links: [
            { label: "Cold Plunge Tanks", href: "/shop" },
            { label: "Accessories", href: "/shop#accessories" },
          ],
        },
        {
          title: "Support",
          links: [
            { label: "FAQ", href: "/faq" },
            { label: "Contact Us", href: "/support" },
            { label: "Warranty", href: "/warranty" },
          ],
        },
        {
          title: "Company",
          links: [
            { label: "About", href: "/about" },
            { label: "Blog", href: "/blog" },
          ],
        },
      ],
      showSocial: true,
    },
    seoDefaults: {
      siteName: "PowerPlunge",
      titleSuffix: " | PowerPlunge",
      defaultMetaDescription: "Professional-grade cold plunge tanks for peak recovery and performance.",
      robotsIndex: true,
      robotsFollow: true,
    },
    globalCtaDefaults: {
      primaryCtaText: "Shop Now",
      primaryCtaHref: "/shop",
      secondaryCtaText: "Learn More",
      secondaryCtaHref: "/about",
    },
    homePageSeedMode: "createFromTemplate",
    applyScope: "storefrontOnly",
  },

  {
    name: "Spa Minimal Starter",
    description: "Clean, calming aesthetic with warm neutrals. Perfect for wellness and spa-oriented positioning.",
    tags: ["starter", "spa", "wellness", "minimal"],
    themePackId: "spa-minimal",
    homepageTemplateId: "product-story-v1",
    defaultKitsSectionIds: ["Delivery + Setup Kit", "Financing Kit"],
    defaultInsertMode: "sectionRef",
    navPreset: {
      styleVariant: "centered",
      items: [
        { label: "Home", href: "/", type: "page" },
        { label: "Products", href: "/shop", type: "page" },
        { label: "Our Story", href: "/story", type: "page" },
        { label: "Contact", href: "/contact", type: "page" },
      ],
    },
    footerPreset: {
      columns: [
        {
          title: "Products",
          links: [
            { label: "Cold Plunge", href: "/shop" },
            { label: "Accessories", href: "/shop#accessories" },
            { label: "Financing", href: "/financing" },
          ],
        },
        {
          title: "About",
          links: [
            { label: "Our Story", href: "/story" },
            { label: "Contact", href: "/contact" },
          ],
        },
      ],
      showSocial: true,
    },
    seoDefaults: {
      siteName: "PowerPlunge",
      titleSuffix: " | PowerPlunge Wellness",
      defaultMetaDescription: "Transform your wellness routine with our premium cold plunge experience.",
      robotsIndex: true,
      robotsFollow: true,
    },
    globalCtaDefaults: {
      primaryCtaText: "Explore Products",
      primaryCtaHref: "/shop",
      secondaryCtaText: "Our Story",
      secondaryCtaHref: "/story",
    },
    homePageSeedMode: "createFromTemplate",
    applyScope: "storefrontOnly",
  },

  {
    name: "Clinical Clean Starter",
    description: "Professional, trust-forward design with clinical credibility. Ideal for health-focused messaging.",
    tags: ["starter", "clinical", "professional", "trust"],
    themePackId: "clinical-clean",
    homepageTemplateId: "landing-page-v1",
    defaultKitsSectionIds: ["Cold Plunge Benefits Kit", "Safety + Protocol Kit"],
    defaultInsertMode: "sectionRef",
    navPreset: {
      styleVariant: "minimal",
      items: [
        { label: "Home", href: "/", type: "page" },
        { label: "Products", href: "/shop", type: "page" },
        { label: "Science", href: "/science", type: "page" },
        { label: "Safety", href: "/safety", type: "page" },
        { label: "Contact", href: "/contact", type: "page" },
      ],
    },
    footerPreset: {
      columns: [
        {
          title: "Products",
          links: [
            { label: "Shop All", href: "/shop" },
            { label: "Compare Models", href: "/compare" },
          ],
        },
        {
          title: "Resources",
          links: [
            { label: "Science & Research", href: "/science" },
            { label: "Safety Guidelines", href: "/safety" },
            { label: "FAQ", href: "/faq" },
          ],
        },
        {
          title: "Company",
          links: [
            { label: "About Us", href: "/about" },
            { label: "Contact", href: "/contact" },
          ],
        },
      ],
      showSocial: false,
    },
    seoDefaults: {
      siteName: "PowerPlunge",
      titleSuffix: " | PowerPlunge",
      defaultMetaDescription: "Clinically informed cold plunge solutions backed by science and built for safety.",
      robotsIndex: true,
      robotsFollow: true,
    },
    globalCtaDefaults: {
      primaryCtaText: "View Products",
      primaryCtaHref: "/shop",
      secondaryCtaText: "Read the Science",
      secondaryCtaHref: "/science",
    },
    homePageSeedMode: "createFromTemplate",
    applyScope: "storefrontOnly",
  },

  {
    name: "Luxury Wellness Starter",
    description: "Premium, elevated brand feel with gold accents. For high-end positioning and luxury buyers.",
    tags: ["starter", "luxury", "premium", "wellness"],
    themePackId: "luxury-wellness",
    homepageTemplateId: "product-story-v1",
    defaultKitsSectionIds: ["Warranty + Support Kit"],
    defaultInsertMode: "sectionRef",
    navPreset: {
      styleVariant: "split",
      items: [
        { label: "Home", href: "/", type: "page" },
        { label: "Collection", href: "/shop", type: "page" },
        { label: "Experience", href: "/experience", type: "page" },
        { label: "Contact", href: "/contact", type: "page" },
      ],
    },
    footerPreset: {
      columns: [
        {
          title: "Collection",
          links: [
            { label: "Cold Plunge Tanks", href: "/shop" },
            { label: "Premium Accessories", href: "/shop#accessories" },
          ],
        },
        {
          title: "Experience",
          links: [
            { label: "The PowerPlunge Difference", href: "/experience" },
            { label: "Testimonials", href: "/testimonials" },
            { label: "Press", href: "/press" },
          ],
        },
        {
          title: "Support",
          links: [
            { label: "Warranty & Guarantee", href: "/warranty" },
            { label: "Contact", href: "/contact" },
          ],
        },
      ],
      showSocial: true,
    },
    seoDefaults: {
      siteName: "PowerPlunge",
      titleSuffix: " | PowerPlunge Premium",
      defaultMetaDescription: "Elevate your wellness with the finest cold plunge experience. Crafted for those who demand the best.",
      robotsIndex: true,
      robotsFollow: true,
    },
    globalCtaDefaults: {
      primaryCtaText: "Shop Collection",
      primaryCtaHref: "/shop",
      secondaryCtaText: "The Experience",
      secondaryCtaHref: "/experience",
    },
    homePageSeedMode: "createFromTemplate",
    applyScope: "storefrontOnly",
  },

  {
    name: "Dark Performance Starter",
    description: "Aggressive dark theme with high-conversion sales funnel layout. Built for direct response marketing.",
    tags: ["starter", "dark", "sales", "conversion"],
    themePackId: "dark-performance",
    homepageTemplateId: "sales-funnel-v1",
    defaultKitsSectionIds: ["Cold Plunge Benefits Kit"],
    defaultInsertMode: "sectionRef",
    navPreset: {
      styleVariant: "minimal",
      items: [
        { label: "Home", href: "/", type: "page" },
        { label: "Shop", href: "/shop", type: "page" },
        { label: "Reviews", href: "/reviews", type: "page" },
      ],
    },
    footerPreset: {
      columns: [
        {
          title: "Shop",
          links: [
            { label: "Cold Plunge Tanks", href: "/shop" },
            { label: "Compare Models", href: "/compare" },
          ],
        },
        {
          title: "Trust",
          links: [
            { label: "Reviews", href: "/reviews" },
            { label: "Warranty", href: "/warranty" },
            { label: "FAQ", href: "/faq" },
          ],
        },
      ],
      showSocial: true,
    },
    seoDefaults: {
      siteName: "PowerPlunge",
      titleSuffix: " | PowerPlunge",
      defaultMetaDescription: "The ultimate cold plunge for serious athletes and recovery enthusiasts.",
      robotsIndex: true,
      robotsFollow: true,
    },
    globalCtaDefaults: {
      primaryCtaText: "Buy Now",
      primaryCtaHref: "/shop",
      secondaryCtaText: "See Reviews",
      secondaryCtaHref: "/reviews",
    },
    homePageSeedMode: "createFromTemplate",
    applyScope: "storefrontOnly",
  },

  {
    name: "First Responder Support Starter",
    description: "Mission-driven site for first responder wellness programs. Focused messaging with recovery use cases.",
    tags: ["starter", "first-responder", "program", "recovery"],
    themePackId: "clinical-clean",
    homepageTemplateId: "sales-funnel-v1",
    defaultKitsSectionIds: ["Cold Plunge Benefits Kit", "Delivery + Setup Kit", "Warranty + Support Kit"],
    defaultInsertMode: "sectionRef",
    navPreset: {
      styleVariant: "minimal",
      items: [
        { label: "Home", href: "/", type: "page" },
        { label: "Program", href: "/program", type: "page" },
        { label: "Shop", href: "/shop", type: "page" },
        { label: "Support", href: "/support", type: "page" },
      ],
    },
    footerPreset: {
      columns: [
        {
          title: "Program",
          links: [
            { label: "First Responder Program", href: "/program" },
            { label: "Recovery Benefits", href: "/benefits" },
          ],
        },
        {
          title: "Shop",
          links: [
            { label: "Cold Plunge Tanks", href: "/shop" },
            { label: "Setup & Delivery", href: "/delivery" },
          ],
        },
        {
          title: "Support",
          links: [
            { label: "Contact", href: "/support" },
            { label: "Warranty", href: "/warranty" },
            { label: "FAQ", href: "/faq" },
          ],
        },
      ],
      showSocial: false,
    },
    seoDefaults: {
      siteName: "PowerPlunge",
      titleSuffix: " | PowerPlunge for First Responders",
      defaultMetaDescription: "Cold plunge recovery solutions designed for first responders. Built for those who serve.",
      robotsIndex: true,
      robotsFollow: true,
    },
    globalCtaDefaults: {
      primaryCtaText: "Learn About the Program",
      primaryCtaHref: "/program",
      secondaryCtaText: "Shop Now",
      secondaryCtaHref: "/shop",
    },
    homePageSeedMode: "createFromTemplate",
    applyScope: "storefrontOnly",
  },
];
