import { useEffect } from "react";

const SITE_URL = "https://powerplunge.com";

interface SeoHeadProps {
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
  ogUrl?: string | null;
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
  const hadEl = !!el;
  const previousContent = el?.getAttribute("content");
  const previousManaged = el?.getAttribute("data-seo-head");

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

  return () => {
    const current = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
    if (!hadEl) {
      current?.remove();
      return;
    }
    if (!current) {
      const restored = document.createElement("meta");
      restored.setAttribute(attr, name);
      if (previousContent !== null && previousContent !== undefined) {
        restored.setAttribute("content", previousContent);
      }
      if (previousManaged) restored.setAttribute("data-seo-head", previousManaged);
      document.head.appendChild(restored);
      return;
    }
    if (previousContent !== null && previousContent !== undefined) {
      current.setAttribute("content", previousContent);
    } else {
      current.removeAttribute("content");
    }
    if (previousManaged) {
      current.setAttribute("data-seo-head", previousManaged);
    } else {
      current.removeAttribute("data-seo-head");
    }
  };
}

function setOrRemoveLink(rel: string, href: string | null | undefined) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  const hadEl = !!el;
  const previousHref = el?.getAttribute("href");
  const previousManaged = el?.getAttribute("data-seo-head");

  if (href) {
    if (!el) {
      el = document.createElement("link");
      el.rel = rel;
      el.setAttribute("data-seo-head", "true");
      document.head.appendChild(el);
    }
    el.href = href;
  } else if (el && el.getAttribute("data-seo-head") === "true") {
    el.remove();
  }

  return () => {
    const current = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!hadEl) {
      current?.remove();
      return;
    }
    if (!current) {
      const restored = document.createElement("link");
      restored.rel = rel;
      if (previousHref) restored.href = previousHref;
      if (previousManaged) restored.setAttribute("data-seo-head", previousManaged);
      document.head.appendChild(restored);
      return;
    }
    if (previousHref) current.href = previousHref;
    if (previousManaged) {
      current.setAttribute("data-seo-head", previousManaged);
    } else {
      current.removeAttribute("data-seo-head");
    }
  };
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

  return () => {
    document.querySelector('script[type="application/ld+json"][data-seo-head="true"]')?.remove();
  };
}

export default function SeoHead({
  metaTitle,
  metaDescription,
  canonicalUrl,
  robots,
  ogUrl,
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
    const restore: Array<() => void> = [];
    const defaultCanonicalUrl = new URL(window.location.pathname || "/", SITE_URL).toString();
    const effectiveCanonicalUrl = canonicalUrl || defaultCanonicalUrl;
    const effectiveOgUrl = ogUrl || effectiveCanonicalUrl;

    if (metaTitle || pageTitle) {
      document.title = metaTitle || pageTitle || "";
    }

    restore.push(setOrRemoveMeta("description", metaDescription));
    restore.push(setOrRemoveMeta("robots", robots));
    restore.push(setOrRemoveLink("canonical", effectiveCanonicalUrl));

    restore.push(setOrRemoveMeta("og:title", ogTitle || metaTitle || pageTitle, true));
    restore.push(setOrRemoveMeta("og:description", ogDescription || metaDescription, true));
    restore.push(setOrRemoveMeta("og:image", ogImage, true));
    restore.push(setOrRemoveMeta("og:type", "website", true));
    restore.push(setOrRemoveMeta("og:url", effectiveOgUrl, true));

    restore.push(setOrRemoveMeta("twitter:card", twitterCard || "summary_large_image"));
    restore.push(setOrRemoveMeta("twitter:title", twitterTitle || ogTitle || metaTitle || pageTitle));
    restore.push(setOrRemoveMeta("twitter:description", twitterDescription || ogDescription || metaDescription));
    restore.push(setOrRemoveMeta("twitter:image", twitterImage || ogImage));

    restore.push(setOrRemoveJsonLd(jsonLd));

    return () => {
      document.title = prevTitle;
      restore.reverse().forEach((fn) => fn());
    };
  }, [metaTitle, metaDescription, canonicalUrl, robots, ogUrl, ogTitle, ogDescription, ogImage, twitterCard, twitterTitle, twitterDescription, twitterImage, jsonLd, pageTitle]);

  return null;
}
