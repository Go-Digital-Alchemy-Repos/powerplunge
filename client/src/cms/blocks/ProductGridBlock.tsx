import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Section, Container } from "@/cms/layout";
import { Heading, Text } from "@/cms/typography";
import type { BlockRenderProps } from "./types";

interface Product {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  price: number;
  salePrice?: number;
  primaryImage?: string;
  tags?: string[];
}

const gridColsMap: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

function ProductCard({
  product,
  showPrice,
  onAddToCart,
}: {
  product: Product;
  showPrice: boolean;
  onAddToCart?: (id: string, qty: number) => void;
}) {
  const isOnSale = product.salePrice != null && product.salePrice < product.price;
  const displayPrice = ((isOnSale ? product.salePrice! : product.price) / 100).toLocaleString();
  const originalPrice = (product.price / 100).toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex flex-col h-full overflow-hidden"
      style={{
        backgroundColor: "var(--pp-surface, #111827)",
        borderRadius: "var(--pp-card-radius, 0.75rem)",
        border: "1px solid color-mix(in srgb, var(--pp-primary, #67e8f9) 10%, transparent)",
        transition: "transform 300ms ease, box-shadow 300ms ease, border-color 200ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.2), 0 0 24px color-mix(in srgb, var(--pp-primary, #67e8f9) 8%, transparent)";
        e.currentTarget.style.borderColor = "color-mix(in srgb, var(--pp-primary, #67e8f9) 25%, transparent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "color-mix(in srgb, var(--pp-primary, #67e8f9) 10%, transparent)";
      }}
      data-testid={`card-product-${product.id}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {product.primaryImage ? (
          <img
            src={product.primaryImage}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              backgroundColor: "color-mix(in srgb, var(--pp-primary, #67e8f9) 5%, transparent)",
            }}
          >
            <ShoppingCart className="w-10 h-10 opacity-20" style={{ color: "var(--pp-primary, #67e8f9)" }} />
          </div>
        )}
        {isOnSale && (
          <div
            className="absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full"
            style={{
              backgroundColor: "#ef4444",
              color: "#fff",
            }}
          >
            SALE
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-5">
        <Heading level={3} className="mb-1">
          {product.name}
        </Heading>
        {product.tagline && (
          <Text size="sm" muted className="mb-4 line-clamp-2">{product.tagline}</Text>
        )}

        {showPrice && (
          <div className="mt-auto pt-4 flex items-end justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span
                className="text-2xl font-bold"
                style={{ color: "var(--pp-primary, #67e8f9)" }}
              >
                ${displayPrice}
              </span>
              {isOnSale && (
                <span className="text-sm line-through pp-text-muted">
                  ${originalPrice}
                </span>
              )}
            </div>
            {onAddToCart && (
              <Button
                size="sm"
                className="flex-shrink-0"
                style={{
                  backgroundColor: "var(--pp-primary, #67e8f9)",
                  color: "var(--pp-primary-text, #030712)",
                }}
                onClick={() => onAddToCart(product.id, 1)}
                data-testid={`button-add-cart-${product.id}`}
              >
                <ShoppingCart className="w-4 h-4 mr-1" />
                Add
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ProductGridBlock({ data, settings, onAddToCart }: BlockRenderProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const title = data?.title || "";
  const queryMode = data?.queryMode || data?.mode || "all";
  const productIds = data?.productIds || [];
  const collectionTag = data?.collectionTag || "";
  const columns = data?.columns || 3;
  const showPrice = data?.showPrice !== false;

  useEffect(() => {
    fetch("/api/products")
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json();
      })
      .then((prods) => {
        setProducts(prods);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const getDisplayProducts = (): Product[] => {
    if (queryMode === "ids" && productIds.length > 0) {
      return products.filter((p) => productIds.includes(p.id));
    }
    if (queryMode === "tag" && collectionTag) {
      return products.filter(
        (p) => p.tags && p.tags.includes(collectionTag)
      );
    }
    return products.slice(0, data?.limit || 12);
  };

  const displayProducts = getDisplayProducts();

  if (loading) {
    return (
      <Section className={settings?.className} data-testid="block-productgrid">
        <Container>
          {title && <Heading level={2} align="center" className="mb-12">{title}</Heading>}
          <div className={cn("grid grid-cols-1 gap-6", gridColsMap[columns])}>
            {Array.from({ length: columns }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl"
                style={{
                  backgroundColor: "var(--pp-surface, #111827)",
                  height: "20rem",
                  borderRadius: "var(--pp-card-radius, 0.75rem)",
                }}
              />
            ))}
          </div>
        </Container>
      </Section>
    );
  }

  if (error || displayProducts.length === 0) {
    return (
      <Section className={settings?.className} data-testid="block-productgrid">
        <Container>
          {title && <Heading level={2} align="center" className="mb-12">{title}</Heading>}
          <div
            className="text-center py-16 rounded-xl"
            style={{
              backgroundColor: "var(--pp-surface, #111827)",
              borderRadius: "var(--pp-card-radius, 0.75rem)",
              border: "1px solid color-mix(in srgb, var(--pp-primary, #67e8f9) 8%, transparent)",
            }}
          >
            <ShoppingCart
              className="w-10 h-10 mx-auto mb-3 opacity-30"
              style={{ color: "var(--pp-primary, #67e8f9)" }}
            />
            <Text muted>
              {error ? "Products are temporarily unavailable." : "No products to display."}
            </Text>
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section className={settings?.className} data-testid="block-productgrid">
      <Container>
        {title && (
          <Heading level={2} align="center" className="mb-12">
            {title}
          </Heading>
        )}
        <div
          className={cn(
            "grid grid-cols-1 gap-6",
            gridColsMap[columns] || "md:grid-cols-3"
          )}
        >
          {displayProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              showPrice={showPrice}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      </Container>
    </Section>
  );
}
