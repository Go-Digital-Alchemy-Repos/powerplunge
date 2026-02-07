import { registerBlock } from "./blockRegistry";
import type { PuckFieldConfig } from "./blockRegistry";
import { blockComponents } from "@/components/PageRenderer";

const textField = (label: string): PuckFieldConfig => ({ type: "text", label });
const textareaField = (label: string): PuckFieldConfig => ({ type: "textarea", label });
const selectField = (label: string, options: { label: string; value: string }[]): PuckFieldConfig => ({
  type: "select", label, options,
});
const numberField = (label: string): PuckFieldConfig => ({ type: "number", label });

export function registerAllBlocks() {
  registerBlock({
    type: "hero",
    label: "Hero",
    category: "layout",
    version: 1,
    renderComponent: blockComponents.hero,
    defaultProps: {
      title: "Welcome",
      titleHighlight: "",
      subtitle: "",
      badge: "",
      primaryButtonText: "Get Started",
      primaryButtonLink: "#",
      primaryButtonAction: "link",
      secondaryButtonText: "",
      secondaryButtonLink: "",
      backgroundImage: "",
      image: "",
    },
    puckFields: {
      title: textField("Title"),
      titleHighlight: textField("Title Highlight"),
      subtitle: textareaField("Subtitle"),
      badge: textField("Badge Text"),
      primaryButtonText: textField("Primary Button Text"),
      primaryButtonLink: textField("Primary Button Link"),
      primaryButtonAction: selectField("Primary Button Action", [
        { label: "Link", value: "link" },
        { label: "Add to Cart", value: "addToCart" },
      ]),
      productId: textField("Product ID (for Add to Cart)"),
      secondaryButtonText: textField("Secondary Button Text"),
      secondaryButtonLink: textField("Secondary Button Link"),
      backgroundImage: textField("Background Image URL"),
      image: textField("Side Image URL"),
    },
  });

  registerBlock({
    type: "richText",
    label: "Rich Text",
    category: "utility",
    version: 1,
    renderComponent: blockComponents.richText,
    defaultProps: { content: "<p>Enter your content here...</p>" },
    puckFields: {
      content: textareaField("HTML Content"),
    },
  });

  registerBlock({
    type: "image",
    label: "Image",
    category: "media",
    version: 1,
    renderComponent: blockComponents.image,
    defaultProps: { src: "", alt: "", caption: "", fullWidth: false },
    puckFields: {
      src: textField("Image URL"),
      alt: textField("Alt Text"),
      caption: textField("Caption"),
      fullWidth: selectField("Full Width", [
        { label: "No", value: "false" },
        { label: "Yes", value: "true" },
      ]),
    },
  });

  registerBlock({
    type: "imageGrid",
    label: "Image Grid",
    category: "media",
    version: 1,
    renderComponent: blockComponents.imageGrid,
    defaultProps: { title: "", columns: 3, images: [] },
    puckFields: {
      title: textField("Title"),
      columns: numberField("Columns"),
    },
  });

  registerBlock({
    type: "productGrid",
    label: "Product Grid",
    category: "ecommerce",
    version: 1,
    renderComponent: blockComponents.productGrid,
    defaultProps: { title: "Our Products", mode: "all", columns: 3, limit: 4 },
    puckFields: {
      title: textField("Title"),
      mode: selectField("Mode", [
        { label: "All Products", value: "all" },
        { label: "Featured", value: "featured" },
        { label: "Specific", value: "specific" },
      ]),
      columns: numberField("Columns"),
      limit: numberField("Limit"),
    },
  });

  registerBlock({
    type: "testimonial",
    label: "Testimonials",
    category: "trust",
    version: 1,
    renderComponent: blockComponents.testimonial,
    defaultProps: { title: "What Our Customers Say", testimonials: [] },
    puckFields: {
      title: textField("Section Title"),
    },
  });

  registerBlock({
    type: "faq",
    label: "FAQ",
    category: "utility",
    version: 1,
    renderComponent: blockComponents.faq,
    defaultProps: { title: "Frequently Asked Questions", items: [] },
    puckFields: {
      title: textField("Section Title"),
    },
  });

  registerBlock({
    type: "cta",
    label: "Call to Action",
    category: "marketing",
    version: 1,
    renderComponent: blockComponents.cta,
    defaultProps: {
      title: "Ready to Get Started?",
      titleHighlight: "",
      subtitle: "",
      buttonText: "Shop Now",
      buttonLink: "/shop",
      buttonAction: "navigate",
    },
    puckFields: {
      title: textField("Title"),
      titleHighlight: textField("Title Highlight"),
      subtitle: textareaField("Subtitle"),
      buttonText: textField("Button Text"),
      buttonLink: textField("Button Link"),
      buttonAction: selectField("Button Action", [
        { label: "Navigate", value: "navigate" },
        { label: "Add to Cart", value: "addToCart" },
      ]),
      productId: textField("Product ID (for Add to Cart)"),
      secondaryButton: textField("Secondary Button"),
      secondaryLink: textField("Secondary Link"),
    },
  });

  registerBlock({
    type: "logoCloud",
    label: "Logo Cloud",
    category: "media",
    version: 1,
    renderComponent: blockComponents.logoCloud,
    defaultProps: { title: "Trusted By", logos: [] },
    puckFields: {
      title: textField("Title"),
    },
  });

  registerBlock({
    type: "featureList",
    label: "Feature List",
    category: "marketing",
    version: 1,
    renderComponent: blockComponents.featureList,
    defaultProps: { title: "Features", subtitle: "", columns: 3, features: [] },
    puckFields: {
      title: textField("Title"),
      subtitle: textField("Subtitle"),
      columns: numberField("Columns"),
    },
  });

  registerBlock({
    type: "featureGrid",
    label: "Feature Grid",
    category: "marketing",
    version: 1,
    renderComponent: blockComponents.featureGrid,
    defaultProps: { title: "Features", titleHighlight: "", columns: 3, items: [] },
    puckFields: {
      title: textField("Title"),
      titleHighlight: textField("Title Highlight"),
      columns: numberField("Columns"),
    },
  });

  registerBlock({
    type: "divider",
    label: "Divider",
    category: "utility",
    version: 1,
    renderComponent: blockComponents.divider,
    defaultProps: { style: "solid", color: "default" },
    puckFields: {
      style: selectField("Style", [
        { label: "Solid", value: "solid" },
        { label: "Dashed", value: "dashed" },
        { label: "Dotted", value: "dotted" },
        { label: "Thick", value: "thick" },
      ]),
      color: selectField("Color", [
        { label: "Default", value: "default" },
        { label: "Primary", value: "primary" },
      ]),
    },
  });

  registerBlock({
    type: "spacer",
    label: "Spacer",
    category: "utility",
    version: 1,
    renderComponent: blockComponents.spacer,
    defaultProps: { size: "md" },
    puckFields: {
      size: selectField("Size", [
        { label: "Extra Small", value: "xs" },
        { label: "Small", value: "sm" },
        { label: "Medium", value: "md" },
        { label: "Large", value: "lg" },
        { label: "Extra Large", value: "xl" },
      ]),
    },
  });

  registerBlock({
    type: "videoEmbed",
    label: "Video Embed",
    category: "media",
    version: 1,
    renderComponent: blockComponents.videoEmbed,
    defaultProps: { title: "", url: "", thumbnail: "", caption: "" },
    puckFields: {
      title: textField("Title"),
      url: textField("Video URL"),
      thumbnail: textField("Thumbnail URL"),
      caption: textField("Caption"),
    },
  });

  registerBlock({
    type: "guarantee",
    label: "Guarantee",
    category: "trust",
    version: 1,
    renderComponent: blockComponents.guarantee,
    defaultProps: { title: "Our Guarantee", description: "", icon: "" },
    puckFields: {
      title: textField("Title"),
      description: textareaField("Description"),
      icon: textField("Icon URL"),
    },
  });

  registerBlock({
    type: "comparisonTable",
    label: "Comparison Table",
    category: "ecommerce",
    version: 1,
    renderComponent: blockComponents.comparisonTable,
    defaultProps: { title: "Compare", featureColumnLabel: "Feature", columns: [], rows: [] },
    puckFields: {
      title: textField("Title"),
      featureColumnLabel: textField("Feature Column Label"),
    },
  });

  registerBlock({
    type: "slider",
    label: "Slider",
    category: "media",
    version: 1,
    renderComponent: blockComponents.slider,
    defaultProps: { title: "", slides: [] },
    puckFields: {
      title: textField("Title"),
    },
  });

  registerBlock({
    type: "statsBar",
    label: "Stats Bar",
    category: "utility",
    version: 1,
    renderComponent: blockComponents.statsBar,
    defaultProps: { stats: [] },
    puckFields: {},
  });

  registerBlock({
    type: "featuredProduct",
    label: "Featured Product",
    category: "ecommerce",
    version: 1,
    renderComponent: blockComponents.featuredProduct,
    defaultProps: {},
    puckFields: {},
  });

  registerBlock({
    type: "iconGrid",
    label: "Icon Grid",
    category: "utility",
    version: 1,
    renderComponent: blockComponents.iconGrid,
    defaultProps: { title: "", titleHighlight: "", columns: 4, items: [] },
    puckFields: {
      title: textField("Title"),
      titleHighlight: textField("Title Highlight"),
      columns: numberField("Columns"),
    },
  });

  registerBlock({
    type: "sectionRef",
    label: "Section Reference",
    category: "layout",
    version: 1,
    renderComponent: blockComponents.sectionRef,
    defaultProps: { sectionId: "", sectionName: "" },
    puckFields: {
      sectionId: textField("Section ID"),
      sectionName: textField("Section Name (display only)"),
    },
  });
}
