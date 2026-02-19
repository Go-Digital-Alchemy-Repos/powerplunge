import { Router } from "express";
import { storage } from "../../../storage";
import { decrypt } from "../../utils/encryption";
import { getBaseUrl } from "../../utils/base-url";
import type { Product } from "@shared/schema";
import { resolveMetaProductId } from "../../integrations/meta/meta-utils";

const router = Router();

function asAbsoluteUrl(baseUrl: string, value: string | null | undefined): string {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return `${baseUrl}${normalizedPath}`;
}

function sanitizeTsv(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\r?\n/g, " ").replace(/\t/g, " ").trim();
}

function isSalePriceActive(product: Product): boolean {
  if (!product.salePrice || product.salePrice <= 0) return false;
  const now = Date.now();
  if (product.saleStartAt && product.saleStartAt.getTime() > now) return false;
  if (product.saleEndAt && product.saleEndAt.getTime() < now) return false;
  return product.salePrice < product.price;
}

function formatUsd(cents: number): string {
  return `${(cents / 100).toFixed(2)} USD`;
}

router.get("/integrations/meta/catalog-feed.tsv", async (req, res) => {
  try {
    const requestedKey = (req.query.key as string | undefined)?.trim();
    if (!requestedKey) {
      return res.status(401).send("Missing key");
    }

    const settings = await storage.getIntegrationSettings();
    if (!settings?.metaCatalogFeedKeyEncrypted) {
      return res.status(404).send("Feed is not configured");
    }

    const expectedKey = decrypt(settings.metaCatalogFeedKeyEncrypted);
    if (!expectedKey || expectedKey !== requestedKey) {
      return res.status(403).send("Invalid key");
    }

    const baseUrl = getBaseUrl(req);
    const allProducts = await storage.getActiveProducts();
    const products = allProducts.filter((p) => p.status === "published");
    const inventories = await Promise.all(products.map((product) => storage.getInventory(product.id)));

    const header = [
      "id",
      "title",
      "description",
      "availability",
      "condition",
      "price",
      "link",
      "image_link",
      "brand",
      "additional_image_link",
      "sale_price",
    ].join("\t");

    const rows: string[] = [];
    for (const [index, product] of products.entries()) {
      const inv = inventories[index];
      const availability = !inv || !inv.trackInventory
        ? "in stock"
        : inv.quantity > 0
          ? "in stock"
          : inv.allowBackorders
            ? "available for order"
            : "out of stock";

      const priceCents = product.price;
      const hasSale = isSalePriceActive(product);
      const salePrice = hasSale ? formatUsd(product.salePrice!) : "";

      const imageLink = asAbsoluteUrl(baseUrl, product.primaryImage || product.images[0] || null);
      const secondaryImages = (product.secondaryImages || [])
        .map((image) => asAbsoluteUrl(baseUrl, image))
        .filter(Boolean)
        .join(",");

      const row = [
        sanitizeTsv(resolveMetaProductId(product.sku, product.id)),
        sanitizeTsv(product.name),
        sanitizeTsv(product.description || product.tagline || ""),
        availability,
        "new",
        formatUsd(priceCents),
        asAbsoluteUrl(baseUrl, `/products/${product.urlSlug || product.id}`),
        imageLink,
        "Power Plunge",
        secondaryImages,
        salePrice,
      ].join("\t");
      rows.push(row);
    }

    const body = `${header}\n${rows.join("\n")}`;
    res.setHeader("Content-Type", "text/tab-separated-values; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(body);
  } catch (error) {
    console.error("[META] Failed to generate catalog feed:", error);
    res.status(500).send("Failed to generate feed");
  }
});

export default router;
