export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  contentJson: {
    version: number;
    blocks: Array<{
      id: string;
      type: string;
      data: Record<string, any>;
      settings?: Record<string, any>;
    }>;
  };
}

export const pageTemplates: PageTemplate[] = [
  {
    id: "default",
    name: "Default",
    description: "A balanced template with hero, features, and CTA sections",
    contentJson: {
      version: 1,
      blocks: [
        {
          id: "hero-1",
          type: "hero",
          data: {
            headline: "Your Headline Here",
            subheadline: "Add a compelling subheadline that describes your value proposition",
            ctaText: "Get Started",
            ctaLink: "#",
            backgroundImage: "",
            alignment: "center"
          },
          settings: { padding: "large" }
        },
        {
          id: "features-1",
          type: "featureList",
          data: {
            headline: "Key Features",
            features: [
              { icon: "zap", title: "Fast & Efficient", description: "Experience lightning-fast performance" },
              { icon: "shield", title: "Secure & Reliable", description: "Built with security in mind" },
              { icon: "heart", title: "Customer Focused", description: "Designed with you in mind" }
            ]
          },
          settings: { background: "muted", padding: "large" }
        },
        {
          id: "cta-1",
          type: "cta",
          data: {
            headline: "Ready to Get Started?",
            subheadline: "Join thousands of satisfied customers today",
            buttonText: "Start Now",
            buttonLink: "#"
          },
          settings: { padding: "large" }
        }
      ]
    }
  },
  {
    id: "product-focus",
    name: "Product Focus",
    description: "Showcase your product with hero, product grid, features, and guarantee",
    contentJson: {
      version: 1,
      blocks: [
        {
          id: "hero-1",
          type: "hero",
          data: {
            headline: "Introducing Our Product",
            subheadline: "The solution you've been waiting for",
            ctaText: "Shop Now",
            ctaLink: "/shop",
            backgroundImage: "",
            alignment: "center"
          },
          settings: { padding: "large" }
        },
        {
          id: "product-grid-1",
          type: "productGrid",
          data: {
            headline: "Our Products",
            mode: "featured",
            productIds: [],
            columns: 3
          },
          settings: { padding: "large" }
        },
        {
          id: "features-1",
          type: "featureList",
          data: {
            headline: "Why Choose Us",
            features: [
              { icon: "award", title: "Premium Quality", description: "Built to last with the finest materials" },
              { icon: "truck", title: "Fast Shipping", description: "Free shipping on all orders" },
              { icon: "refresh-cw", title: "Easy Returns", description: "30-day money back guarantee" }
            ]
          },
          settings: { background: "muted", padding: "large" }
        },
        {
          id: "guarantee-1",
          type: "guarantee",
          data: {
            headline: "Our Promise",
            guarantees: [
              { icon: "shield", title: "Quality Guarantee", description: "We stand behind every product" },
              { icon: "clock", title: "Lifetime Support", description: "We're here when you need us" }
            ]
          },
          settings: { padding: "large" }
        },
        {
          id: "cta-1",
          type: "cta",
          data: {
            headline: "Ready to Transform Your Experience?",
            subheadline: "Order now and see the difference",
            buttonText: "Order Now",
            buttonLink: "/shop"
          },
          settings: { padding: "large" }
        }
      ]
    }
  },
  {
    id: "testimonial-heavy",
    name: "Testimonial Heavy",
    description: "Build trust with multiple testimonials and social proof",
    contentJson: {
      version: 1,
      blocks: [
        {
          id: "hero-1",
          type: "hero",
          data: {
            headline: "Loved by Thousands",
            subheadline: "See what our customers are saying",
            ctaText: "Read Reviews",
            ctaLink: "#testimonials",
            backgroundImage: "",
            alignment: "center"
          },
          settings: { padding: "large" }
        },
        {
          id: "testimonial-1",
          type: "testimonial",
          data: {
            quote: "This product changed my life! I can't imagine going back to the old way.",
            author: "Sarah J.",
            role: "Verified Customer",
            rating: 5,
            image: ""
          },
          settings: { padding: "medium" }
        },
        {
          id: "logo-cloud-1",
          type: "logoCloud",
          data: {
            headline: "Featured In",
            logos: []
          },
          settings: { background: "muted", padding: "medium" }
        },
        {
          id: "testimonial-2",
          type: "testimonial",
          data: {
            quote: "Outstanding quality and customer service. Highly recommend to everyone!",
            author: "Mike T.",
            role: "Verified Customer",
            rating: 5,
            image: ""
          },
          settings: { padding: "medium" }
        },
        {
          id: "testimonial-3",
          type: "testimonial",
          data: {
            quote: "Best purchase I've made this year. Worth every penny!",
            author: "Emily R.",
            role: "Verified Customer",
            rating: 5,
            image: ""
          },
          settings: { padding: "medium" }
        },
        {
          id: "cta-1",
          type: "cta",
          data: {
            headline: "Join Our Happy Customers",
            subheadline: "Experience the difference for yourself",
            buttonText: "Get Started",
            buttonLink: "#"
          },
          settings: { padding: "large" }
        }
      ]
    }
  },
  {
    id: "minimal-landing",
    name: "Minimal Landing",
    description: "Clean, focused layout with hero and single CTA",
    contentJson: {
      version: 1,
      blocks: [
        {
          id: "spacer-1",
          type: "spacer",
          data: { height: "medium" },
          settings: {}
        },
        {
          id: "hero-1",
          type: "hero",
          data: {
            headline: "Simple. Elegant. Effective.",
            subheadline: "One product. One purpose. Zero compromises.",
            ctaText: "Learn More",
            ctaLink: "#",
            backgroundImage: "",
            alignment: "center"
          },
          settings: { padding: "large" }
        },
        {
          id: "divider-1",
          type: "divider",
          data: { style: "line" },
          settings: { padding: "small" }
        },
        {
          id: "richtext-1",
          type: "richText",
          data: {
            content: "<p class='text-center text-lg text-muted-foreground max-w-2xl mx-auto'>We believe in doing one thing exceptionally well. Our focus on quality over quantity means you get the best possible experience.</p>"
          },
          settings: { padding: "large" }
        },
        {
          id: "cta-1",
          type: "cta",
          data: {
            headline: "Ready?",
            subheadline: "",
            buttonText: "Get Started",
            buttonLink: "#"
          },
          settings: { padding: "large" }
        }
      ]
    }
  },
  {
    id: "long-form",
    name: "Long-Form",
    description: "Comprehensive layout for detailed content and storytelling",
    contentJson: {
      version: 1,
      blocks: [
        {
          id: "hero-1",
          type: "hero",
          data: {
            headline: "The Complete Guide",
            subheadline: "Everything you need to know about our solution",
            ctaText: "Start Reading",
            ctaLink: "#content",
            backgroundImage: "",
            alignment: "center"
          },
          settings: { padding: "large" }
        },
        {
          id: "richtext-1",
          type: "richText",
          data: {
            content: "<h2 class='text-3xl font-bold mb-4'>Chapter 1: The Problem</h2><p class='text-lg text-muted-foreground mb-6'>Describe the problem your audience faces. Paint a picture of their current situation and the challenges they encounter daily.</p>"
          },
          settings: { padding: "large" }
        },
        {
          id: "image-1",
          type: "image",
          data: {
            src: "",
            alt: "Illustration of the problem",
            caption: "Add an image that illustrates the problem"
          },
          settings: { padding: "medium" }
        },
        {
          id: "richtext-2",
          type: "richText",
          data: {
            content: "<h2 class='text-3xl font-bold mb-4'>Chapter 2: The Solution</h2><p class='text-lg text-muted-foreground mb-6'>Introduce your solution and explain how it addresses the problems outlined above. Be specific about the benefits.</p>"
          },
          settings: { padding: "large" }
        },
        {
          id: "features-1",
          type: "featureList",
          data: {
            headline: "Key Benefits",
            features: [
              { icon: "check", title: "Benefit One", description: "Detailed explanation of the first benefit" },
              { icon: "check", title: "Benefit Two", description: "Detailed explanation of the second benefit" },
              { icon: "check", title: "Benefit Three", description: "Detailed explanation of the third benefit" }
            ]
          },
          settings: { background: "muted", padding: "large" }
        },
        {
          id: "richtext-3",
          type: "richText",
          data: {
            content: "<h2 class='text-3xl font-bold mb-4'>Chapter 3: How It Works</h2><p class='text-lg text-muted-foreground mb-6'>Walk through the process step by step. Make it easy for readers to understand exactly what they need to do.</p>"
          },
          settings: { padding: "large" }
        },
        {
          id: "comparison-1",
          type: "comparisonTable",
          data: {
            headline: "Before vs After",
            columns: ["Before", "After"],
            rows: [
              { feature: "Time Spent", values: ["Hours", "Minutes"] },
              { feature: "Results", values: ["Inconsistent", "Reliable"] },
              { feature: "Stress Level", values: ["High", "Low"] }
            ]
          },
          settings: { padding: "large" }
        },
        {
          id: "faq-1",
          type: "faq",
          data: {
            headline: "Frequently Asked Questions",
            items: [
              { question: "How do I get started?", answer: "Getting started is easy. Simply click the button below and follow the guided setup process." },
              { question: "Is there a money-back guarantee?", answer: "Yes! We offer a 30-day money-back guarantee. If you're not satisfied, we'll refund your purchase." },
              { question: "Do you offer support?", answer: "Absolutely. Our support team is available 24/7 to help you with any questions." }
            ]
          },
          settings: { background: "muted", padding: "large" }
        },
        {
          id: "cta-1",
          type: "cta",
          data: {
            headline: "Ready to Transform Your Experience?",
            subheadline: "Join thousands who have already made the switch",
            buttonText: "Get Started Today",
            buttonLink: "#"
          },
          settings: { padding: "large" }
        }
      ]
    }
  },
  {
    id: "blog-page-v1",
    name: "Blog Page v1",
    description: "Blog index page with optional hero, post feed block, and CTA",
    contentJson: {
      version: 1,
      blocks: [
        {
          id: "hero-1",
          type: "hero",
          data: {
            headline: "Our Blog",
            subheadline: "Cold plunge tips, recovery guides, and the latest from Power Plunge",
            ctaText: "",
            ctaLink: "",
            backgroundImage: "",
            alignment: "center"
          },
          settings: { padding: "lg" }
        },
        {
          id: "blog-feed-1",
          type: "blogPostFeed",
          data: {
            title: "",
            description: "",
            layout: "grid",
            postsPerPage: "12",
            showSearch: "true",
            showCategoryFilter: "true",
            showTagFilter: "true",
            featuredOnly: "false",
            categorySlug: "",
            tagSlug: ""
          },
          settings: { padding: "lg" }
        },
        {
          id: "cta-1",
          type: "cta",
          data: {
            headline: "Ready to Start Your Cold Plunge Journey?",
            subheadline: "Browse our collection and find the perfect cold plunge for your needs",
            buttonText: "Shop Now",
            buttonLink: "/shop"
          },
          settings: { padding: "lg" }
        }
      ]
    }
  }
];

export function getTemplateById(id: string): PageTemplate | undefined {
  return pageTemplates.find(t => t.id === id);
}

export function getTemplateBlocks(templateId: string): PageTemplate['contentJson']['blocks'] {
  const template = getTemplateById(templateId);
  return template?.contentJson.blocks || [];
}
