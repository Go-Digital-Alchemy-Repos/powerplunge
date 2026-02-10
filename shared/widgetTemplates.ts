export interface WidgetTemplateField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "checkbox";
  options?: { label: string; value: string }[];
  defaultValue?: string | number | boolean;
  placeholder?: string;
}

export interface WidgetTemplate {
  type: string;
  label: string;
  description: string;
  icon: string;
  category: "content" | "engagement" | "navigation";
  settingsFields: WidgetTemplateField[];
  defaultSettings: Record<string, any>;
}

export const WIDGET_TEMPLATES: WidgetTemplate[] = [
  {
    type: "newsletter_signup",
    label: "Newsletter Signup",
    description: "Email subscription form to grow your mailing list",
    icon: "Mail",
    category: "engagement",
    settingsFields: [
      { key: "heading", label: "Heading", type: "text", defaultValue: "Subscribe to Our Newsletter" },
      { key: "description", label: "Description", type: "textarea", defaultValue: "Get the latest cold therapy tips and product updates delivered to your inbox." },
      { key: "buttonText", label: "Button Text", type: "text", defaultValue: "Subscribe" },
      { key: "placeholderText", label: "Input Placeholder", type: "text", defaultValue: "Enter your email" },
      { key: "successMessage", label: "Success Message", type: "text", defaultValue: "Thanks for subscribing!" },
    ],
    defaultSettings: {
      heading: "Subscribe to Our Newsletter",
      description: "Get the latest cold therapy tips and product updates delivered to your inbox.",
      buttonText: "Subscribe",
      placeholderText: "Enter your email",
      successMessage: "Thanks for subscribing!",
    },
  },
  {
    type: "recent_posts",
    label: "Recent Blog Posts",
    description: "Displays a list of the most recent published blog posts",
    icon: "FileText",
    category: "content",
    settingsFields: [
      { key: "heading", label: "Heading", type: "text", defaultValue: "Recent Posts" },
      { key: "postCount", label: "Number of Posts", type: "number", defaultValue: 5 },
      { key: "showDate", label: "Show Date", type: "checkbox", defaultValue: true },
      { key: "showThumbnail", label: "Show Thumbnail", type: "checkbox", defaultValue: true },
    ],
    defaultSettings: {
      heading: "Recent Posts",
      postCount: 5,
      showDate: true,
      showThumbnail: true,
    },
  },
  {
    type: "search",
    label: "Search Bar",
    description: "Search box for finding blog posts and content",
    icon: "Search",
    category: "navigation",
    settingsFields: [
      { key: "heading", label: "Heading", type: "text", defaultValue: "Search" },
      { key: "placeholderText", label: "Placeholder Text", type: "text", defaultValue: "Search posts..." },
      { key: "searchScope", label: "Search Scope", type: "select", defaultValue: "blog", options: [
        { label: "Blog Posts", value: "blog" },
        { label: "All Content", value: "all" },
      ]},
    ],
    defaultSettings: {
      heading: "Search",
      placeholderText: "Search posts...",
      searchScope: "blog",
    },
  },
];

export function getWidgetTemplate(type: string): WidgetTemplate | undefined {
  return WIDGET_TEMPLATES.find((t) => t.type === type);
}
