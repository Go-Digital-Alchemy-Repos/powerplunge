import { Router } from "express";
import { and, eq, lte } from "drizzle-orm";
import { db } from "../../db";
import { pages, products, posts } from "@shared/schema";
import { getBaseUrl } from "../../utils/base-url";

const router = Router();

interface SitemapUrl {
  loc: string;
  lastmod?: Date | string | null;
  changefreq?: string;
  priority?: string;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function joinUrl(baseUrl: string, path: string): string {
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

function formatLastmod(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function allowsIndex(robotsValue: string | null | undefined): boolean {
  return !robotsValue?.toLowerCase().split(",").map((part) => part.trim()).includes("noindex");
}

function isSameOriginUrl(url: string, baseUrl: string): boolean {
  try {
    return new URL(url).origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
}

function serializeSitemap(urls: SitemapUrl[]): string {
  const entries = urls
    .map((url) => {
      const lastmod = formatLastmod(url.lastmod);
      return [
        "  <url>",
        `    <loc>${xmlEscape(url.loc)}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
        url.changefreq ? `    <changefreq>${url.changefreq}</changefreq>` : "",
        url.priority ? `    <priority>${url.priority}</priority>` : "",
        "  </url>",
      ].filter(Boolean).join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

router.get("/robots.txt", (req, res) => {
  const baseUrl = getBaseUrl(req);

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send([
    "User-agent: *",
    "Disallow: /admin",
    "Disallow: /api/",
    "Disallow: /checkout",
    "Disallow: /my-account",
    "Disallow: /order-status/",
    "Disallow: /track-order",
    "Disallow: /reset-password",
    "Disallow: /auth/",
    "",
    `Sitemap: ${joinUrl(baseUrl, "/sitemap.xml")}`,
    "",
  ].join("\n"));
});

router.get("/sitemap.xml", async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);

    const [publishedPages, activeProducts, publishedPosts] = await Promise.all([
      db.select({
        slug: pages.slug,
        isHome: pages.isHome,
        isShop: pages.isShop,
        canonicalUrl: pages.canonicalUrl,
        robots: pages.robots,
        updatedAt: pages.updatedAt,
      }).from(pages).where(eq(pages.status, "published")),
      db.select({
        urlSlug: products.urlSlug,
        id: products.id,
        canonicalUrl: products.canonicalUrl,
        robotsIndex: products.robotsIndex,
      }).from(products).where(and(eq(products.active, true), eq(products.status, "published"))),
      db.select({
        slug: posts.slug,
        canonicalUrl: posts.canonicalUrl,
        allowIndex: posts.allowIndex,
        updatedAt: posts.updatedAt,
        publishedAt: posts.publishedAt,
      }).from(posts).where(and(eq(posts.status, "published"), lte(posts.publishedAt, new Date()))),
    ]);

    const seen = new Set<string>();
    const urls: SitemapUrl[] = [];
    const addUrl = (pathOrUrl: string, options: Omit<SitemapUrl, "loc"> = {}) => {
      const loc = pathOrUrl.startsWith("http") ? pathOrUrl : joinUrl(baseUrl, pathOrUrl);
      if (!isSameOriginUrl(loc, baseUrl) || seen.has(loc)) return;
      seen.add(loc);
      urls.push({ loc, ...options });
    };

    const homePage = publishedPages.find((page) => page.isHome);
    const shopPage = publishedPages.find((page) => page.isShop);
    if (!homePage || allowsIndex(homePage.robots)) {
      addUrl("/", { lastmod: homePage?.updatedAt, changefreq: "weekly", priority: "1.0" });
    }
    if (!shopPage || allowsIndex(shopPage.robots)) {
      addUrl("/shop", { lastmod: shopPage?.updatedAt, changefreq: "weekly", priority: "0.9" });
    }
    addUrl("/blog", { changefreq: "weekly", priority: "0.7" });
    addUrl("/contact", { changefreq: "monthly", priority: "0.5" });

    for (const page of publishedPages) {
      if (!allowsIndex(page.robots)) continue;
      const path = page.isHome ? "/" : page.isShop ? "/shop" : `/page/${page.slug}`;
      addUrl(page.canonicalUrl || path, {
        lastmod: page.updatedAt,
        changefreq: page.isHome || page.isShop ? "weekly" : "monthly",
        priority: page.isHome ? "1.0" : page.isShop ? "0.9" : "0.6",
      });
    }

    for (const product of activeProducts) {
      if (!product.robotsIndex) continue;
      const slug = product.urlSlug || product.id;
      addUrl(product.canonicalUrl || `/products/${slug}`, {
        changefreq: "weekly",
        priority: "0.8",
      });
    }

    for (const post of publishedPosts) {
      if (!post.allowIndex) continue;
      addUrl(post.canonicalUrl || `/blog/${post.slug}`, {
        lastmod: post.updatedAt || post.publishedAt,
        changefreq: "monthly",
        priority: "0.6",
      });
    }

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600");
    res.send(serializeSitemap(urls));
  } catch (error) {
    console.error("[SEO] Failed to generate sitemap:", error);
    res.status(500).type("text/plain").send("Failed to generate sitemap");
  }
});

export default router;
