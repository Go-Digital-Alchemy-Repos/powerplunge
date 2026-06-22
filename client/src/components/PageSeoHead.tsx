import SeoHead from "@/components/SeoHead";

const SITE_URL = "https://powerplunge.com";
const DEFAULT_TITLE = "Power Plunge | Cold Plunge Tanks for Mind + Body + Spirit";
const DEFAULT_DESCRIPTION =
  "Power Plunge cold plunge tanks deliver reliable, ice-free cold therapy for recovery, performance, and wellness at home or in professional spaces.";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

export interface PageSeoData {
  title?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  twitterCard?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  twitterImage?: string | null;
  featuredImage?: string | null;
  jsonLd?: any;
}

interface PageSeoHeadProps {
  page?: PageSeoData | null;
  path: string;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

function absoluteUrl(url: string | null | undefined, fallback: string): string {
  if (!url) return fallback;
  try {
    return new URL(url, SITE_URL).toString();
  } catch {
    return fallback;
  }
}

export default function PageSeoHead({
  page,
  path,
  fallbackTitle = DEFAULT_TITLE,
  fallbackDescription = DEFAULT_DESCRIPTION,
}: PageSeoHeadProps) {
  const canonicalUrl = absoluteUrl(page?.canonicalUrl || path, `${SITE_URL}${path}`);
  const image = absoluteUrl(page?.ogImage || page?.twitterImage || page?.featuredImage, DEFAULT_IMAGE);
  const twitterImage = absoluteUrl(page?.twitterImage, image);
  const title = page?.metaTitle || page?.title || fallbackTitle;
  const description = page?.metaDescription || fallbackDescription;

  return (
    <SeoHead
      metaTitle={title}
      metaDescription={description}
      canonicalUrl={canonicalUrl}
      robots={page?.robots || "index, follow"}
      ogUrl={canonicalUrl}
      ogTitle={page?.ogTitle || title}
      ogDescription={page?.ogDescription || description}
      ogImage={image}
      twitterCard={page?.twitterCard || "summary_large_image"}
      twitterTitle={page?.twitterTitle || page?.ogTitle || title}
      twitterDescription={page?.twitterDescription || page?.ogDescription || description}
      twitterImage={twitterImage}
      jsonLd={page?.jsonLd}
    />
  );
}
