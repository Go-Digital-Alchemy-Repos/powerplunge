import { useEffect } from "react";

interface SeoHeadProps {
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
  jsonLd?: any;
  pageTitle?: string;
}

function setOrRemoveMeta(name: string, content: string | null | undefined, isProperty = false) {
  const attr = isProperty ? "property" : "name";
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (content) {
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, name);
      el.setAttribute("data-seo-head", "true");
      document.head.appendChild(el);
    }
    el.content = content;
  } else if (el && el.getAttribute("data-seo-head") === "true") {
    el.remove();
  }
}

function setOrRemoveLink(rel: string, href: string | null | undefined) {
  let el = document.querySelector(`link[rel="${rel}"][data-seo-head="true"]`) as HTMLLinkElement | null;
  if (href) {
    if (!el) {
      el = document.createElement("link");
      el.rel = rel;
      el.setAttribute("data-seo-head", "true");
      document.head.appendChild(el);
    }
    el.href = href;
  } else if (el) {
    el.remove();
  }
}

function setOrRemoveJsonLd(data: any) {
  let el = document.querySelector('script[type="application/ld+json"][data-seo-head="true"]') as HTMLScriptElement | null;
  if (data) {
    const jsonStr = typeof data === "string" ? data : JSON.stringify(data);
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.setAttribute("data-seo-head", "true");
      document.head.appendChild(el);
    }
    el.textContent = jsonStr;
  } else if (el) {
    el.remove();
  }
}

export default function SeoHead({
  metaTitle,
  metaDescription,
  canonicalUrl,
  robots,
  ogTitle,
  ogDescription,
  ogImage,
  twitterCard,
  twitterTitle,
  twitterDescription,
  twitterImage,
  jsonLd,
  pageTitle,
}: SeoHeadProps) {
  useEffect(() => {
    const prevTitle = document.title;
    if (metaTitle || pageTitle) {
      document.title = metaTitle || pageTitle || "";
    }

    setOrRemoveMeta("description", metaDescription);
    setOrRemoveMeta("robots", robots);
    setOrRemoveLink("canonical", canonicalUrl);

    setOrRemoveMeta("og:title", ogTitle || metaTitle || pageTitle, true);
    setOrRemoveMeta("og:description", ogDescription || metaDescription, true);
    setOrRemoveMeta("og:image", ogImage, true);
    setOrRemoveMeta("og:type", "website", true);

    setOrRemoveMeta("twitter:card", twitterCard || "summary_large_image");
    setOrRemoveMeta("twitter:title", twitterTitle || ogTitle || metaTitle || pageTitle);
    setOrRemoveMeta("twitter:description", twitterDescription || ogDescription || metaDescription);
    setOrRemoveMeta("twitter:image", twitterImage || ogImage);

    setOrRemoveJsonLd(jsonLd);

    return () => {
      document.title = prevTitle;
      document.querySelectorAll("[data-seo-head='true']").forEach((el) => el.remove());
    };
  }, [metaTitle, metaDescription, canonicalUrl, robots, ogTitle, ogDescription, ogImage, twitterCard, twitterTitle, twitterDescription, twitterImage, jsonLd, pageTitle]);

  return null;
}
