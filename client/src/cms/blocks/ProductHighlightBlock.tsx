import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Section, Container } from "@/cms/layout";
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
  const [quantity, setQuantity] = useState(1);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const productId = data?.productId || "";
  const highlightBullets: string[] = data?.highlightBullets || [];
  const showGallery = data?.showGallery !== false;
  const showBuyButton = data?.showBuyButton !== false;

  useEffect(() => {
    if (!productId) {
      fetch("/api/products")
        .then((r) => r.json())
        .then((prods: Product[]) => {
          if (prods.length) setProduct(prods[0]);
          setLoading(false);
        })
        .catch(() => setLoading(false));
      return;
    }
    fetch("/api/products")
      .then((r) => r.json())
      .then((prods: Product[]) => {
        const found = prods.find((p) => p.id === productId);
        if (found) setProduct(found);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <Section className={settings?.className} data-testid="block-producthighlight">
        <Container>
          <div className="animate-pulse pp-surface-bg rounded-lg h-96" />
        </Container>
      </Section>
    );
  }

  if (!product) {
    return (
      <Section className={settings?.className} data-testid="block-producthighlight">
        <Container>
          <div className="text-center pp-text-muted py-12">
            {productId ? "Product not found" : "No product ID specified"}
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
      background="surface"
      divider
      className={settings?.className}
      data-testid="block-producthighlight"
    >
      <Container>
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {showGallery && gallery.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <div className="aspect-square bg-black/50 rounded-3xl overflow-hidden border pp-border-subtle p-4 relative">
                <img
                  src={gallery[activeImageIdx] || gallery[0]}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
                {isOnSale && (
                  <div className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-lg">
                    ON SALE
                  </div>
                )}
              </div>
              {gallery.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {gallery.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIdx(idx)}
                      className={cn(
                        "w-16 h-16 rounded-lg border overflow-hidden flex-shrink-0",
                        idx === activeImageIdx
                          ? "border-cyan-500"
                          : "pp-border-subtle"
                      )}
                    >
                      <img
                        src={img}
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
            className="space-y-6"
          >
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                {product.name}
              </h2>
              {product.tagline && (
                <p className="text-xl pp-text-muted mb-4">
                  {product.tagline}
                </p>
              )}
              {product.description && (
                <p className="pp-text-muted leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>

            {bullets.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-lg font-semibold">Highlights</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  {bullets.map((bullet, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="pp-text-muted">{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-4 border-t pp-border-subtle">
              <div>
                <p className="text-sm pp-text-muted mb-1">Price</p>
                {isOnSale && saleDisplayPrice != null ? (
                  <div className="flex items-baseline gap-3">
                    <span className="pp-text-muted line-through text-xl">
                      ${displayPrice.toLocaleString()}
                    </span>
                    <span className="text-4xl font-bold text-red-500">
                      ${saleDisplayPrice.toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <p className="text-4xl font-bold text-gradient-ice">
                    ${displayPrice.toLocaleString()}
                  </p>
                )}
              </div>
              {showBuyButton && onAddToCart && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-10 h-10"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="font-medium w-8 text-center text-lg">
                      {quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-10 h-10"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    size="lg"
                    className="glow-ice-sm text-lg px-8"
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
