import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import PageRenderer from "@/components/PageRenderer";
import SiteLayout from "@/components/SiteLayout";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { trackAddToCart, trackViewItemList } from "@/lib/analytics";

interface Product {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  price: number;
  salePrice?: number;
  primaryImage?: string;
  features?: string[];
  urlSlug?: string;
}

interface PageContentJson {
  version: number;
  blocks: Array<{
    id: string;
    type: string;
    data: Record<string, any>;
    settings?: Record<string, any>;
  }>;
}

interface ShopPage {
  id: string;
  title: string;
  contentJson: PageContentJson | null;
  content: string | null;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export default function Shop() {
  const { customer } = useCustomerAuth();
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      const savedCart = localStorage.getItem("cart");
      return savedCart ? JSON.parse(savedCart) : [];
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const { data: shopPage, isLoading: pageLoading } = useQuery<ShopPage>({
    queryKey: ["/api/pages/shop"],
    retry: false,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: siteSettings } = useQuery<{ featuredProductId?: string }>({
    queryKey: ["/api/site-settings"],
  });

  useEffect(() => {
    if (products.length > 0) {
      trackViewItemList(
        "Shop Page",
        products.map((p) => ({ id: p.id, name: p.name, price: p.price / 100 })),
      );
    }
  }, [products]);

  const handleAddToCart = (productId: string, quantity: number = 1) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    trackAddToCart({
      id: product.id,
      name: product.name,
      price: (product.salePrice || product.price) / 100,
      quantity,
    });

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === productId);
      if (existingItem) {
        return prevCart.map(item => 
          item.id === productId 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevCart, {
        id: product.id,
        name: product.name,
        price: product.salePrice || product.price,
        quantity,
        image: product.primaryImage || '',
      }];
    });
  };

  if (pageLoading || productsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const hasPageContent = shopPage?.contentJson?.blocks && shopPage.contentJson.blocks.length > 0;

  return (
    <SiteLayout>
      {hasPageContent ? (
        <PageRenderer
          contentJson={shopPage?.contentJson}
          legacyContent={shopPage?.content}
          onAddToCart={handleAddToCart}
        />
      ) : (
        <FallbackShopContent 
          products={products} 
          featuredProductId={siteSettings?.featuredProductId}
          onAddToCart={handleAddToCart}
        />
      )}
    </SiteLayout>
  );
}

function FallbackShopContent({ 
  products, 
  featuredProductId,
  onAddToCart 
}: { 
  products: Product[]; 
  featuredProductId?: string;
  onAddToCart: (productId: string, quantity: number) => void;
}) {
  const featuredProduct = featuredProductId 
    ? products.find(p => p.id === featuredProductId) 
    : products[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <section className="mb-12 sm:mb-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 sm:mb-8 text-center">Our Products</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {products.map((product) => {
            const productUrl = product.urlSlug ? `/products/${product.urlSlug}` : null;
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card/50 backdrop-blur border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors group"
                data-testid={`product-card-${product.id}`}
              >
                {productUrl ? (
                  <Link href={productUrl} className="block cursor-pointer">
                    {product.primaryImage && (
                      <img 
                        src={product.primaryImage} 
                        alt={product.name}
                        className="w-full h-48 sm:h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    <div className="p-4 sm:p-6 pb-2 sm:pb-3">
                      <h3 className="text-lg sm:text-xl font-semibold text-white mb-1 sm:mb-2 group-hover:text-primary transition-colors">{product.name}</h3>
                      {product.tagline && (
                        <p className="text-muted-foreground text-sm mb-1 sm:mb-2 line-clamp-2">{product.tagline}</p>
                      )}
                    </div>
                  </Link>
                ) : (
                  <>
                    {product.primaryImage && (
                      <img 
                        src={product.primaryImage} 
                        alt={product.name}
                        className="w-full h-48 sm:h-64 object-cover"
                      />
                    )}
                    <div className="p-4 sm:p-6 pb-2 sm:pb-3">
                      <h3 className="text-lg sm:text-xl font-semibold text-white mb-1 sm:mb-2 group-hover:text-primary transition-colors">{product.name}</h3>
                      {product.tagline && (
                        <p className="text-muted-foreground text-sm mb-1 sm:mb-2 line-clamp-2">{product.tagline}</p>
                      )}
                    </div>
                  </>
                )}
                <div className="p-4 sm:px-6 sm:pb-6 pt-0">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      {product.salePrice ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xl sm:text-2xl font-bold text-primary">
                            ${(product.salePrice / 100).toLocaleString()}
                          </span>
                          <span className="text-sm text-muted-foreground line-through">
                            ${(product.price / 100).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xl sm:text-2xl font-bold text-primary">
                          ${(product.price / 100).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <Button 
                      className="bg-primary hover:bg-primary/80 text-primary-foreground w-full sm:w-auto h-11"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAddToCart(product.id, 1);
                      }}
                      data-testid={`add-to-cart-${product.id}`}
                    >
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {products.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">No products available yet.</p>
        </div>
      )}
    </div>
  );
}
