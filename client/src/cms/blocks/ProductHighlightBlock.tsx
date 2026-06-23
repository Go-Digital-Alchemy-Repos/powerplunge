import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Minus, Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Section, Container } from "@/cms/layout";
import { Heading, Text } from "@/cms/typography";
import { getResponsiveImageProps } from "@/lib/responsiveImage";
import type { BlockRenderProps } from "./types";

interface Product {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  price: number;
  salePrice?: number;
  primaryImage?: string;
  images?: string[];
  features?: string[];
}

export default function ProductHighlightBlock({
  data,
  settings,
  onAddToCart,
}: BlockRenderProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const productId = data?.productId || "";
  const highlightBullets: string[] = data?.highlightBullets || [];
  const showGallery = data?.showGallery !== false;
  const showBuyButton = data?.showBuyButton !== false;

  useEffect(() => {
    fetch("/api/products")
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((prods: Product[]) => {
        const found = productId
          ? prods.find((p) => p.id === productId)
          : prods[0];
        if (found) setProduct(found);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [productId]);

  if (loading) {
    return (
      <Section className={settings?.className} data-testid="block-producthighlight">
        <Container>
          <div className="grid lg:grid-cols-2 gap-12">
            <div
              className="animate-pulse aspect-square rounded-2xl"
              style={{ backgroundColor: "var(--pp-surface, #111827)" }}
            />
            <div className="space-y-4">
              <div className="animate-pulse h-8 w-3/4 rounded" style={{ backgroundColor: "var(--pp-surface, #111827)" }} />
              <div className="animate-pulse h-5 w-1/2 rounded" style={{ backgroundColor: "var(--pp-surface, #111827)" }} />
              <div className="animate-pulse h-24 w-full rounded" style={{ backgroundColor: "var(--pp-surface, #111827)" }} />
            </div>
          </div>
        </Container>
      </Section>
    );
  }

  if (error || !product) {
    return (
      <Section className={settings?.className} data-testid="block-producthighlight">
        <Container>
          <div
            className="text-center py-16 rounded-xl"
            style={{
              backgroundColor: "var(--pp-surface, #111827)",
              borderRadius: "var(--pp-card-radius, 0.75rem)",
              border: "1px solid color-mix(in srgb, var(--pp-primary, #67e8f9) 8%, transparent)",
            }}
          >
            <Package
              className="w-10 h-10 mx-auto mb-3 opacity-30"
              style={{ color: "var(--pp-primary, #67e8f9)" }}
            />
            <Text muted>
              {error
                ? "Product information is temporarily unavailable."
                : productId
                  ? "Product not found."
                  : "No product selected."}
            </Text>
          </div>
        </Container>
      </Section>
    );
  }

  const gallery = product.images?.length
    ? product.images
    : product.primaryImage
      ? [product.primaryImage]
      : [];
  const displayPrice = product.price / 100;
  const isOnSale =
    product.salePrice != null && product.salePrice < product.price;
  const saleDisplayPrice = product.salePrice
    ? product.salePrice / 100
    : null;

  const bullets =
    highlightBullets.length > 0 ? highlightBullets : product.features || [];

  return (
    <Section
      className={settings?.className}
      data-testid="block-producthighlight"
    >
      <Container>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {showGallery && gallery.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <div
                className="relative aspect-square overflow-hidden"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--pp-surface, #111827) 80%, black)",
                  borderRadius: "var(--pp-card-radius, 0.75rem)",
                  border: "1px solid color-mix(in srgb, var(--pp-primary, #67e8f9) 10%, transparent)",
                  padding: "1.5rem",
                }}
              >
                <img
                  {...getResponsiveImageProps(gallery[activeImageIdx] || gallery[0], { sizes: "(max-width: 1024px) 100vw, 50vw" })}
                  alt={product.name}
                  className="w-full h-full object-contain"
                  data-testid="img-product-main"
                />
                {isOnSale && (
                  <div
                    className="absolute top-4 left-4 text-sm font-bold px-4 py-1.5 rounded-full"
                    style={{ backgroundColor: "#ef4444", color: "#fff" }}
                  >
                    SALE
                  </div>
                )}
              </div>
              {gallery.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {gallery.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIdx(idx)}
                      className="flex-shrink-0 w-16 h-16 overflow-hidden cursor-pointer transition-all"
                      style={{
                        borderRadius: "calc(var(--pp-card-radius, 0.75rem) * 0.5)",
                        border: idx === activeImageIdx
                          ? "2px solid var(--pp-primary, #67e8f9)"
                          : "1px solid color-mix(in srgb, var(--pp-primary, #67e8f9) 12%, transparent)",
                        opacity: idx === activeImageIdx ? 1 : 0.6,
                      }}
                      data-testid={`thumb-product-${idx}`}
                    >
                      <img
                        {...getResponsiveImageProps(img, { sizes: "64px" })}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col gap-6"
          >
            <div>
              <Heading level={2} className="mb-3">
                {product.name}
              </Heading>
              {product.tagline && (
                <Text size="lg" muted className="mb-4">
                  {product.tagline}
                </Text>
              )}
              {product.description && (
                <Text muted prose className="leading-relaxed">
                  {product.description}
                </Text>
              )}
            </div>

            {bullets.length > 0 && (
              <div
                className="rounded-xl p-5"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--pp-surface, #111827) 60%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--pp-primary, #67e8f9) 8%, transparent)",
                  borderRadius: "var(--pp-card-radius, 0.75rem)",
                }}
              >
                <Heading level={3} className="mb-4">Highlights</Heading>
                <ul className="space-y-3">
                  {bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                        style={{
                          backgroundColor: "color-mix(in srgb, var(--pp-primary, #67e8f9) 15%, transparent)",
                        }}
                      >
                        <Check
                          className="w-3 h-3"
                          style={{ color: "var(--pp-primary, #67e8f9)" }}
                        />
                      </div>
                      <Text size="sm" muted className="!mb-0 leading-relaxed">{bullet}</Text>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div
              className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-6"
              style={{
                borderTop: "1px solid color-mix(in srgb, var(--pp-primary, #67e8f9) 10%, transparent)",
              }}
            >
              <div>
                <Text size="sm" muted className="mb-1 !text-xs uppercase tracking-wider">Price</Text>
                {isOnSale && saleDisplayPrice != null ? (
                  <div className="flex items-baseline gap-3">
                    <span className="pp-text-muted line-through text-xl">
                      ${displayPrice.toLocaleString()}
                    </span>
                    <span className="text-4xl font-bold" style={{ color: "#ef4444" }}>
                      ${saleDisplayPrice.toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <span
                    className="text-4xl font-bold"
                    style={{ color: "var(--pp-primary, #67e8f9)" }}
                  >
                    ${displayPrice.toLocaleString()}
                  </span>
                )}
              </div>
              {showBuyButton && onAddToCart && (
                <div className="flex items-center gap-4">
                  <div
                    className="flex items-center gap-1 rounded-xl p-1"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--pp-surface, #111827) 80%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--pp-primary, #67e8f9) 10%, transparent)",
                    }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-9 h-9"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      data-testid="btn-qty-minus"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span
                      className="font-semibold w-8 text-center text-lg"
                      style={{ color: "var(--pp-text, #f9fafb)" }}
                      data-testid="text-qty"
                    >
                      {quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-9 h-9"
                      onClick={() => setQuantity(quantity + 1)}
                      data-testid="btn-qty-plus"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    size="lg"
                    className="text-base px-8 font-semibold"
                    style={{
                      backgroundColor: "var(--pp-primary, #67e8f9)",
                      color: "var(--pp-primary-text, #030712)",
                      boxShadow: "0 0 20px color-mix(in srgb, var(--pp-primary, #67e8f9) 30%, transparent)",
                    }}
                    onClick={() => onAddToCart(product.id, quantity)}
                    data-testid="producthighlight-add-to-cart"
                  >
                    Add to Cart
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </Container>
    </Section>
  );
}
