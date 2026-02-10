import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, ChevronUp, ChevronDown, Zap } from "lucide-react";
import { getIconWithFallback } from "@/lib/iconUtils";
import { Button } from "@/components/ui/button";
import type { BlockRenderProps } from "./types";

interface Product {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  price: number;
  salePrice?: number;
  primaryImage?: string;
  features?: string[];
}

interface SiteSettings {
  featuredProductId?: string;
}

export default function FeaturedProductBlock({ data, settings, onAddToCart }: BlockRenderProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, settingsRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/site-settings"),
        ]);
        const productsData = await productsRes.json();
        const settingsData = await settingsRes.json();
        setProducts(productsData);
        setSiteSettings(settingsData);
      } catch (error) {
        console.error("Failed to fetch product data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const featuredProduct =
    products.find((p) => p.id === siteSettings?.featuredProductId) || products[0];
  const title = data?.title || "The Complete System";
  const subtitle =
    data?.subtitle || "Everything you need for professional-grade cold therapy at home.";
  const titleHighlight = data?.titleHighlight || "System";
  const sectionId = data?.sectionId || "";
  const productLabel = data?.productLabel || "Complete Cold Plunge System";
  const keyFeatures = data?.keyFeatures || [];
  const whatsIncluded = data?.whatsIncluded || [];
  const showKeyFeatures = data?.showKeyFeatures !== false && data?.showKeyFeatures !== "false";
  const showWhatsIncluded = data?.showWhatsIncluded !== false && data?.showWhatsIncluded !== "false";

  if (loading) {
    return (
      <section
        className={cn("bg-card/30 border-y border-border py-24", settings?.className)}
        id={sectionId}
        data-testid="block-featuredproduct"
      >
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="animate-pulse">Loading product...</div>
        </div>
      </section>
    );
  }

  if (!featuredProduct) {
    return (
      <section
        className={cn("bg-card/30 border-y border-border py-24", settings?.className)}
        id={sectionId}
        data-testid="block-featuredproduct"
      >
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-muted-foreground">No featured product available</p>
        </div>
      </section>
    );
  }

  const displayPrice = featuredProduct.price / 100;
  const isOnSale =
    featuredProduct.salePrice && featuredProduct.salePrice < featuredProduct.price;
  const saleDisplayPrice = featuredProduct.salePrice
    ? featuredProduct.salePrice / 100
    : null;

  return (
    <section
      className={cn("bg-card/30 border-y border-border py-24", settings?.className)}
      id={sectionId}
      data-testid="block-featuredproduct"
    >
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {title.replace(titleHighlight, "")}{" "}
            <span className="text-gradient-ice">{titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{subtitle}</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <div className="aspect-square bg-black/50 rounded-3xl overflow-hidden border border-border p-8 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              {isOnSale && (
                <div className="absolute top-4 left-4 z-20 bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-lg">
                  ON SALE
                </div>
              )}
              {featuredProduct.primaryImage && (
                <img
                  src={featuredProduct.primaryImage}
                  alt={featuredProduct.name}
                  className="w-full h-full object-contain relative z-10"
                />
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div>
              <p className="text-primary font-medium tracking-wider uppercase mb-2">
                {productLabel}
              </p>
              <h3 className="text-3xl md:text-4xl font-bold mb-3">{featuredProduct.name}</h3>
              {featuredProduct.tagline && (
                <p className="text-xl text-muted-foreground mb-4">{featuredProduct.tagline}</p>
              )}
              {featuredProduct.description && (
                <p className="text-muted-foreground leading-relaxed">
                  {featuredProduct.description}
                </p>
              )}
            </div>

            {showKeyFeatures && keyFeatures.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-4">Key Features</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  {keyFeatures.map((kf: { icon?: string; text: string }, i: number) => {
                    const Icon = getIconWithFallback(kf.icon, Check);
                    return (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground">{kf.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {showWhatsIncluded && whatsIncluded.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-4">What's Included</h4>
                <ul className="space-y-2">
                  {whatsIncluded.map((item: any, i: number) => {
                    const text = typeof item === "string" ? item : item?.text || "";
                    return (
                      <li key={i} className="flex items-center gap-3 text-sm">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground">{text}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {featuredProduct.features &&
              featuredProduct.features.length > 0 &&
              !showKeyFeatures && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">Key Features</h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {featuredProduct.features.slice(0, 6).map((feature, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <Check className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-4 border-t border-border">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Complete System Price</p>
                {isOnSale && saleDisplayPrice ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-3">
                      <span className="text-muted-foreground line-through text-xl">
                        ${displayPrice.toLocaleString()}
                      </span>
                      <span className="text-4xl font-bold text-red-500">
                        ${saleDisplayPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-4xl font-bold text-gradient-ice">
                    ${displayPrice.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <span className="font-medium w-8 text-center text-lg">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  size="lg"
                  className="glow-ice-sm text-lg px-8"
                  onClick={() => onAddToCart?.(featuredProduct.id, quantity)}
                >
                  Add to Cart
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
