import { Router } from "express";
import { publicBlogService } from "../../services/public.blog.service";

const router = Router();

router.get("/posts", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 0));
    const tag = (req.query.tag as string) || undefined;
    const category = (req.query.category as string) || undefined;
    const q = (req.query.q as string) || undefined;

    const result = await publicBlogService.listPublished({
      page,
      pageSize: pageSize || undefined,
      tag,
      category,
      q,
    });

    res.json(result);
  } catch (err) {
    console.error("[PUBLIC-BLOG] Error listing posts:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/posts/:slug", async (req, res) => {
  try {
    const post = await publicBlogService.getPublishedBySlug(req.params.slug);
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err) {
    console.error("[PUBLIC-BLOG] Error getting post:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/tags", async (_req, res) => {
  try {
    const tags = await publicBlogService.listTags();
    res.json(tags);
  } catch (err) {
    console.error("[PUBLIC-BLOG] Error listing tags:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/categories", async (_req, res) => {
  try {
    const categories = await publicBlogService.listCategories();
    res.json(categories);
  } catch (err) {
    console.error("[PUBLIC-BLOG] Error listing categories:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/rss.xml", async (_req, res) => {
  try {
    const rssData = await publicBlogService.getRssItems();
    if (!rssData) {
      return res.status(404).send("RSS feed is disabled");
    }

    const baseUrl = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://powerplunge.com"}`;

    const itemsXml = rssData.items
      .map(
        (item: any) => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${baseUrl}/blog/${item.slug}</link>
      <description><![CDATA[${item.excerpt || ""}]]></description>
      <pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate>
      <guid>${baseUrl}/blog/${item.slug}</guid>
    </item>`
      )
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${rssData.title}</title>
    <link>${baseUrl}/blog</link>
    <description>${rssData.description}</description>
    <language>en-us</language>
    ${itemsXml}
  </channel>
</rss>`;

    res.set("Content-Type", "application/rss+xml");
    res.send(xml);
  } catch (err) {
    console.error("[PUBLIC-BLOG] Error generating RSS:", err);
    res.status(500).send("Internal server error");
  }
});

export default router;
